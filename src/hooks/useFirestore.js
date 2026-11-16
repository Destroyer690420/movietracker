import { useCallback, useEffect, useState } from 'react';
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/auth';
import { makeMovieKey, normalizeMovie, stripUndefined } from '../lib/movies';
import { importLocalLibrary, migrateLegacyDocuments } from '../services/migration';

const LOCAL_LIBRARY_KEY = 'movielog-watched';
const LOCAL_LIBRARY_BACKUP_KEY = 'movielog-watched-backup';

/**
 * Read the local library.
 * The original blob is copied to a backup key before it is normalised, so the
 * raw data is never lost.
 * @returns {Array} - Normalised titles
 */
function readLocalLibrary() {
    let raw = null;

    try {
        raw = localStorage.getItem(LOCAL_LIBRARY_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        const normalized = (Array.isArray(parsed) ? parsed : [])
            .map(normalizeMovie)
            .filter(Boolean);

        try {
            if (!localStorage.getItem(LOCAL_LIBRARY_BACKUP_KEY)) {
                localStorage.setItem(LOCAL_LIBRARY_BACKUP_KEY, raw);
            }
        } catch {
            // A full localStorage is not worth failing over.
        }

        return normalized;
    } catch (error) {
        console.error('Error reading localStorage:', error);
        return [];
    }
}

/**
 * Custom hook for syncing watched movies.
 *
 * Signed in  -> Firestore at `users/{uid}/movies/{mediaType}_{tmdbId}`, synced
 *               live with onSnapshot.
 * Signed out -> localStorage, so the collection still works without an account.
 *
 * @returns {{
 *   movies: Array,
 *   addMovie: Function,
 *   removeMovie: Function,
 *   updateMovie: Function,
 *   loading: boolean,
 *   error: Error|null,
 *   notice: string|null,
 *   clearNotice: Function
 * }}
 */
export function useFirestore() {
    const { user } = useAuth();
    const [localMovies, setLocalMovies] = useState(readLocalLibrary);
    const [remoteMovies, setRemoteMovies] = useState([]);
    const [syncedUid, setSyncedUid] = useState(null);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);

    const movies = user ? remoteMovies : localMovies;
    const loading = Boolean(user) && syncedUid !== user.uid;

    // Migrate, then subscribe to Firestore for authenticated users
    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let cancelled = false;
        let unsubscribe = null;

        const subscribe = () => {
            const moviesRef = collection(db, 'users', user.uid, 'movies');
            const q = query(moviesRef, orderBy('addedAt', 'desc'));

            unsubscribe = onSnapshot(q, (snapshot) => {
                const seen = new Set();
                const movieData = [];

                for (const docSnap of snapshot.docs) {
                    const movie = normalizeMovie(docSnap.data());
                    if (!movie || seen.has(movie.key)) {
                        continue;
                    }
                    seen.add(movie.key);
                    movieData.push(movie);
                }

                setRemoteMovies(movieData);
                setSyncedUid(user.uid);
            }, (snapshotError) => {
                console.error('Firestore error:', snapshotError);
                setError(snapshotError);
                setSyncedUid(user.uid);
            });
        };

        migrateLegacyDocuments(user)
            .then((migration) => {
                if (cancelled) {
                    return null;
                }
                return importLocalLibrary(user).then((imported) => ({ migration, imported }));
            })
            .then((result) => {
                if (cancelled || !result) {
                    return;
                }
                if (result.migration?.migratedCount > 0) {
                    setNotice(`Migrated ${result.migration.migratedCount} title${result.migration.migratedCount === 1 ? '' : 's'} to the new format. A backup was kept.`);
                } else if (result.imported?.imported > 0) {
                    setNotice(`Imported ${result.imported.imported} title${result.imported.imported === 1 ? '' : 's'} from this browser.`);
                }
            })
            .catch((migrationError) => {
                console.error('Error preparing the collection:', migrationError);
            })
            .finally(() => {
                if (!cancelled) {
                    subscribe();
                }
            });

        return () => {
            cancelled = true;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [user]);

    // Save to localStorage for unauthenticated users
    useEffect(() => {
        if (user) {
            return;
        }
        try {
            localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(localMovies));
        } catch (saveError) {
            console.error('Error saving to localStorage:', saveError);
        }
    }, [localMovies, user]);

    const addMovie = useCallback(async (movie) => {
        const normalized = normalizeMovie({
            ...movie,
            addedAt: Date.now(),
            rating: movie.rating ?? 0,
        });

        if (!normalized) {
            return null;
        }

        if (!user) {
            // Local storage fallback
            setLocalMovies((prev) => [
                normalized,
                ...prev.filter(movie => movie.key !== normalized.key),
            ]);
            return normalized;
        }

        try {
            const movieRef = doc(db, 'users', user.uid, 'movies', normalized.key);
            // Don't clobber a rating or favourite that is already stored.
            const payload = { ...normalized };
            if (!payload.rating) {
                delete payload.rating;
            }
            if (!payload.isFavorite) {
                delete payload.isFavorite;
            }
            await setDoc(movieRef, stripUndefined(payload), { merge: true });
            return normalized;
        } catch (err) {
            console.error('Error adding movie to Firestore:', err);
            setError(err);
            throw err;
        }
    }, [user]);

    const removeMovie = useCallback(async (movieKey) => {
        if (!user) {
            // Local storage fallback
            setLocalMovies((prev) => prev.filter(movie => movie.key !== movieKey));
            return;
        }

        try {
            const movieRef = doc(db, 'users', user.uid, 'movies', movieKey);
            await deleteDoc(movieRef);
        } catch (err) {
            console.error('Error removing movie from Firestore:', err);
            setError(err);
            throw err;
        }
    }, [user]);

    const updateMovie = useCallback(async (movieKey, changes) => {
        if (!movieKey) {
            return;
        }

        if (!user) {
            // Local storage fallback
            setLocalMovies((prev) => prev.map(movie => (
                movie.key === movieKey ? { ...movie, ...stripUndefined(changes) } : movie
            )));
            return;
        }

        try {
            const movieRef = doc(db, 'users', user.uid, 'movies', movieKey);
            // Firestore rejects undefined values, so strip them first.
            await setDoc(movieRef, stripUndefined(changes), { merge: true });
        } catch (err) {
            console.error('Error updating movie in Firestore:', err);
            setError(err);
            throw err;
        }
    }, [user]);

    const clearNotice = useCallback(() => setNotice(null), []);

    return [movies, addMovie, removeMovie, updateMovie, loading, error, notice, clearNotice];
}

/**
 * Helper exported for components that need the same key format.
 */
export { makeMovieKey };
