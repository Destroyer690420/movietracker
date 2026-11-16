import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { makeMovieKey, normalizeMovie } from '../lib/movies';

/**
 * One-off data migrations.
 *
 * Two things need fixing without ever losing data:
 *
 *  1. Legacy documents were stored under the bare TMDB id (`550`). Movies and
 *     TV share id namespaces, so a TV title and a movie title with the same
 *     id collided. They now live under `movie_550` / `tv_550`.
 *
 *  2. Titles logged while signed out lived in localStorage and vanished the
 *     moment you signed in. They are now imported into Firestore.
 *
 * The migration always writes a full backup of the old documents to Firestore
 * (and localStorage) *before* it touches anything, and it only removes a
 * legacy document once its replacement has been confirmed written.
 */

const MIGRATION_STATE_DOC = 'migration';
const BACKUP_COLLECTION = 'backups';
const BACKUP_PREFIX = 'legacyMovies';
const BACKUP_MANIFEST_DOC = `${BACKUP_PREFIX}_manifest`;
const BACKUP_CHUNK_SIZE = 50;
const LOCAL_LIBRARY_KEY = 'movielog-watched';
const LOCAL_BACKUP_KEY = 'movielog-legacy-backup';

function usersPath(user, ...segments) {
    return ['users', user.uid, ...segments];
}

function stateRef(user) {
    return doc(db, ...usersPath(user, 'meta', MIGRATION_STATE_DOC));
}

/**
 * Read the migration state for a user.
 * @param {object} user
 * @returns {Promise<{legacyMigrated: boolean, localImported: boolean, migratedAt: number|null}>}
 */
export async function getMigrationState(user) {
    try {
        const snap = await getDoc(stateRef(user));
        const data = snap.exists() ? snap.data() : {};
        return {
            legacyMigrated: Boolean(data.legacyMigrated),
            localImported: Boolean(data.localImported),
            migratedAt: data.migratedAt ?? null,
        };
    } catch (error) {
        console.error('Error reading migration state:', error);
        return { legacyMigrated: false, localImported: false, migratedAt: null };
    }
}

/**
 * Write the backup of every legacy document before migrating anything.
 * @param {object} user
 * @param {Array} legacyDocs - Array of { legacyDocId, data }
 * @returns {Promise<string|null>} - Backup id, or null if there was nothing to back up
 */
/**
 * Read the backup that is already stored for a user.
 * @param {object} user
 * @returns {Promise<Array>} - Array of { legacyDocId, data }
 */
async function readBackup(user) {
    const manifestRef = doc(db, ...usersPath(user, BACKUP_COLLECTION, BACKUP_MANIFEST_DOC));
    const manifestSnap = await getDoc(manifestRef);

    if (!manifestSnap.exists()) {
        return [];
    }

    const chunkCount = manifestSnap.data()?.chunkCount || 0;
    const legacyDocs = [];

    for (let index = 0; index < chunkCount; index += 1) {
        const chunkRef = doc(db, ...usersPath(user, BACKUP_COLLECTION, `${BACKUP_PREFIX}_${index}`));
        const chunkSnap = await getDoc(chunkRef);
        if (chunkSnap.exists()) {
            legacyDocs.push(...(chunkSnap.data()?.docs || []));
        }
    }

    return legacyDocs;
}

/**
 * Write the backup of every legacy document before migrating anything.
 *
 * The backup accumulates rather than being replaced. A migration that only
 * half finished leaves the already-migrated titles out of the legacy set, and
 * a fresh backup would then miss them.
 *
 * @param {object} user
 * @param {Array} legacyDocs - Array of { legacyDocId, data }
 * @returns {Promise<string|null>} - Backup id, or null if there was nothing to back up
 */
async function writeBackup(user, legacyDocs) {
    if (legacyDocs.length === 0) {
        return null;
    }

    const merged = new Map();
    for (const legacy of await readBackup(user)) {
        merged.set(legacy.legacyDocId, legacy);
    }
    for (const legacy of legacyDocs) {
        merged.set(legacy.legacyDocId, legacy);
    }
    const allDocs = [...merged.values()];

    const createdAt = Date.now();
    const chunkCount = Math.ceil(allDocs.length / BACKUP_CHUNK_SIZE);

    for (let index = 0; index < chunkCount; index += 1) {
        const chunk = allDocs.slice(index * BACKUP_CHUNK_SIZE, (index + 1) * BACKUP_CHUNK_SIZE);
        await setDoc(doc(db, ...usersPath(user, BACKUP_COLLECTION, `${BACKUP_PREFIX}_${index}`)), {
            createdAt,
            index,
            docs: chunk,
        });
    }

    await setDoc(doc(db, ...usersPath(user, BACKUP_COLLECTION, BACKUP_MANIFEST_DOC)), {
        createdAt,
        chunkCount,
        count: allDocs.length,
    });

    // Drop chunks left over from a larger earlier backup.
    try {
        const backupSnapshot = await getDocs(collection(db, ...usersPath(user, BACKUP_COLLECTION)));
        for (const backupDoc of backupSnapshot.docs) {
            const index = Number(backupDoc.id.replace(`${BACKUP_PREFIX}_`, ''));
            if (Number.isFinite(index) && index >= chunkCount) {
                await deleteDoc(backupDoc.ref);
            }
        }
    } catch (error) {
        console.warn('Could not tidy up old backup chunks:', error);
    }

    // A local copy too, so the data survives even if the Firestore project is
    // unreachable. Wrapped in try/catch because localStorage can be full.
    try {
        localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(allDocs));
    } catch (error) {
        console.warn('Could not write local backup:', error);
    }

    return `${BACKUP_PREFIX}_${createdAt}`;
}

/**
 * Move legacy documents onto their new composite keys.
 * Nothing is deleted until its replacement exists, and a full backup is kept.
 * @param {object} user
 * @returns {Promise<{migrated: boolean, migratedCount: number, failedCount: number, reason?: string}>}
 */
export async function migrateLegacyDocuments(user) {
    const state = await getMigrationState(user);
    if (state.legacyMigrated) {
        return { migrated: false, migratedCount: 0, failedCount: 0, reason: 'already-migrated' };
    }

    let snapshot;
    try {
        snapshot = await getDocs(collection(db, ...usersPath(user, 'movies')));
    } catch (error) {
        console.error('Error reading legacy documents:', error);
        return { migrated: false, migratedCount: 0, failedCount: 0, reason: 'read-failed' };
    }

    // Legacy ids were the bare TMDB id, new ones always contain an underscore.
    const legacyDocs = snapshot.docs
        .filter(docSnap => !docSnap.id.includes('_'))
        .map(docSnap => ({ legacyDocId: docSnap.id, data: docSnap.data() }));

    if (legacyDocs.length === 0) {
        await setDoc(stateRef(user), {
            legacyMigrated: true,
            legacyMigratedAt: Date.now(),
            migratedCount: 0,
        });
        return { migrated: false, migratedCount: 0, failedCount: 0, reason: 'nothing-to-migrate' };
    }

    // Back up first. Nothing below this line can lose data.
    try {
        await writeBackup(user, legacyDocs);
    } catch (error) {
        console.error('Backup failed, aborting migration:', error);
        return { migrated: false, migratedCount: 0, failedCount: 0, reason: 'backup-failed' };
    }

    let migratedCount = 0;
    let failedCount = 0;

    for (const legacy of legacyDocs) {
        try {
            const normalized = normalizeMovie(legacy.data);
            if (!normalized) {
                failedCount += 1;
                continue;
            }

            const targetRef = doc(db, ...usersPath(user, 'movies', makeMovieKey(normalized.mediaType, normalized.id)));
            const existingSnap = await getDoc(targetRef);

            if (existingSnap.exists()) {
                // Keep whatever is already on the new key and fill any gaps.
                const existing = normalizeMovie(existingSnap.data()) || {};
                const merged = {
                    ...existing,
                    rating: existing.rating || normalized.rating,
                    isFavorite: existing.isFavorite || normalized.isFavorite,
                    addedAt: Math.min(existing.addedAt || Infinity, normalized.addedAt),
                };
                await setDoc(targetRef, merged, { merge: true });
            } else {
                await setDoc(targetRef, normalized);
            }

            // The replacement is safely written; the legacy copy can go.
            await deleteDoc(doc(db, ...usersPath(user, 'movies', legacy.legacyDocId)));
            migratedCount += 1;
        } catch (error) {
            console.error(`Error migrating ${legacy.legacyDocId}:`, error);
            failedCount += 1;
        }
    }

    await setDoc(stateRef(user), {
        legacyMigrated: failedCount === 0,
        legacyMigratedAt: Date.now(),
        migratedCount,
        failedCount,
    });

    return { migrated: migratedCount > 0, migratedCount, failedCount };
}

/**
 * Import titles that were logged while signed out into Firestore.
 *
 * This runs on every sign in rather than once. It is idempotent because a
 * title that is already in Firestore is skipped, so titles logged while
 * signed out later on always make it across. The local copy is left
 * untouched, nothing is deleted.
 *
 * @param {object} user
 * @returns {Promise<{imported: number, skipped: number}>}
 */
export async function importLocalLibrary(user) {
    let stored = null;
    try {
        stored = localStorage.getItem(LOCAL_LIBRARY_KEY);
    } catch {
        return { imported: 0, skipped: 0 };
    }

    if (!stored) {
        return { imported: 0, skipped: 0 };
    }

    let parsed = null;
    try {
        parsed = JSON.parse(stored);
    } catch (error) {
        console.error('Could not parse the local library:', error);
        return { imported: 0, skipped: 0 };
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        return { imported: 0, skipped: 0 };
    }

    let imported = 0;
    let skipped = 0;

    for (const item of parsed) {
        try {
            const normalized = normalizeMovie(item);
            if (!normalized) {
                skipped += 1;
                continue;
            }

            const targetRef = doc(db, ...usersPath(user, 'movies', normalized.key));
            const existingSnap = await getDoc(targetRef);

            if (existingSnap.exists()) {
                skipped += 1;
                continue;
            }

            await setDoc(targetRef, normalized);
            imported += 1;
        } catch (error) {
            console.error('Error importing a local title:', error);
            skipped += 1;
        }
    }

    if (imported > 0) {
        try {
            await setDoc(stateRef(user), {
                localImported: true,
                localImportedAt: Date.now(),
                locallyImportedCount: imported,
            }, { merge: true });
        } catch (error) {
            console.warn('Could not record the local import:', error);
        }
    }

    return { imported, skipped };
}

/**
 * Restore the legacy backup.
 *
 * The backed up documents are put back under their current (namespaced) keys
 * so nothing ends up duplicated, and so the migration does not have to run
 * again. Any title added after the migration was made is left alone.
 *
 * @param {object} user
 * @returns {Promise<{restored: number}>}
 */
export async function restoreLegacyBackup(user) {
    const legacyDocs = await readBackup(user);

    if (legacyDocs.length === 0) {
        return { restored: 0 };
    }

    let restored = 0;

    for (const legacy of legacyDocs) {
        try {
            const normalized = normalizeMovie(legacy.data);
            if (!normalized) {
                continue;
            }

            const targetRef = doc(db, ...usersPath(user, 'movies', normalized.key));
            await setDoc(targetRef, normalized);
            restored += 1;

            // Clear out any leftover copy still sitting on the old key.
            if (legacy.legacyDocId !== normalized.key) {
                await deleteDoc(doc(db, ...usersPath(user, 'movies', legacy.legacyDocId)));
            }
        } catch (error) {
            console.error(`Error restoring ${legacy.legacyDocId}:`, error);
        }
    }

    return { restored };
}

/**
 * Check whether a legacy backup exists for a user.
 * @param {object} user
 * @returns {Promise<boolean>}
 */
export async function hasLegacyBackup(user) {
    try {
        const snap = await getDoc(doc(db, ...usersPath(user, BACKUP_COLLECTION, BACKUP_MANIFEST_DOC)));
        return snap.exists();
    } catch {
        return false;
    }
}
