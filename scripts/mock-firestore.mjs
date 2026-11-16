/**
 * In-memory stand-in for the Firestore SDK, used to exercise the migration
 * logic without touching a real database.
 */

export const store = new Map();   // 'collection/docId' -> data
export const calls = [];

function pathOf(...segments) {
    return segments.join('/');
}

export function collection(db, ...segments) {
    return { type: 'collection', path: pathOf(...segments) };
}

export function doc(db, ...segments) {
    return { type: 'doc', path: pathOf(...segments) };
}

export function getDoc(ref) {
    calls.push(['getDoc', ref.path]);
    const data = store.get(ref.path);
    return Promise.resolve({
        exists: () => data !== undefined,
        data: () => data,
        id: ref.path.split('/').pop(),
    });
}

export function getDocs(collRef) {
    calls.push(['getDocs', collRef.path]);
    const prefix = `${collRef.path}/`;
    const docs = [];
    for (const [key, value] of store.entries()) {
        if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) {
            docs.push({ id: key.slice(prefix.length), data: () => value, ref: { path: key } });
        }
    }
    return Promise.resolve({ docs });
}

export function setDoc(ref, data, options = {}) {
    calls.push(['setDoc', ref.path, options.merge ? 'merge' : 'set']);
    const existing = store.get(ref.path);
    store.set(ref.path, options.merge ? { ...(existing || {}), ...data } : { ...data });
    return Promise.resolve();
}

export function deleteDoc(ref) {
    calls.push(['deleteDoc', ref.path]);
    store.delete(ref.path);
    return Promise.resolve();
}

// Only used by src/firebase.js, which the migration imports transitively.
export const db = {};
export function getFirestore() { return db; }
export function initializeFirestore() { return db; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
