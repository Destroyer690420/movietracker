import { useState, useEffect } from 'react';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for syncing watched movies with Firestore
 * Falls back to localStorage when user is not authenticated
 * @returns {[array, function, function, boolean]} - Movies array, add function, remove function, loading state
 */
export function useFirestore() {
    const { user } = useAuth();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load from localStorage for unauthenticated users
    useEffect(() => {
        if (!user) {
            try {
                const stored = localStorage.getItem('movielog-watched');
                setMovies(stored ? JSON.parse(stored) : []);
            } catch (error) {
                console.error('Error reading localStorage:', error);
                setMovies([]);
            }
            setLoading(false);
            return;
        }

        // Subscribe to Firestore for authenticated users
        const moviesRef = collection(db, 'users', user.uid, 'movies');
        const q = query(moviesRef, orderBy('addedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const movieData = snapshot.docs.map((doc) => ({
                ...doc.data(),
                firestoreId: doc.id,
            }));
            setMovies(movieData);
            setLoading(false);
        }, (err) => {
            console.error('Firestore error:', err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Save to localStorage for unauthenticated users
    useEffect(() => {
        if (!user && !loading) {
            try {
                localStorage.setItem('movielog-watched', JSON.stringify(movies));
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
        }
    }, [movies, user, loading]);

    const addMovie = async (movie) => {
        const movieWithTimestamp = {
            ...movie,
            addedAt: Date.now(),
        };

        if (!user) {
            // Local storage fallback
            setMovies((prev) => [movieWithTimestamp, ...prev]);
            return;
        }

        try {
            const movieRef = doc(db, 'users', user.uid, 'movies', String(movie.id));
            await setDoc(movieRef, movieWithTimestamp);
        } catch (err) {
            console.error('Error adding movie to Firestore:', err);
            setError(err);
            throw err;
        }
    };

    const removeMovie = async (movieId) => {
        if (!user) {
            // Local storage fallback
            setMovies((prev) => prev.filter((m) => m.id !== movieId));
            return;
        }

        try {
            const movieRef = doc(db, 'users', user.uid, 'movies', String(movieId));
            await deleteDoc(movieRef);
        } catch (err) {
            console.error('Error removing movie from Firestore:', err);
            setError(err);
            throw err;
        }
    };

    return [movies, addMovie, removeMovie, loading, error];
}
