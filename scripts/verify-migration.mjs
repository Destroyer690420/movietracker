import { store } from './mock-firestore.mjs';

const migration = await import('../src/services/migration.js');

let pass = 0;
let fail = 0;

function check(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
        pass += 1;
        console.log(`  PASS  ${name}`);
    } else {
        fail += 1;
        console.log(`  FAIL  ${name}\n        expected ${e}\n        actual   ${a}`);
    }
}

const user = { uid: 'user-1' };
const MOVIES = 'users/user-1/movies';
const BACKUPS = 'users/user-1/backups';

// A realistic legacy collection: three titles written under the bare TMDB id.
store.set(`${MOVIES}/550`, {
    adult: false, backdrop_path: '/backdrop.jpg', genre_ids: [18, 53], id: 550,
    original_language: 'en', original_title: 'Fight Club',
    overview: 'A ticking-time-bomb insomniac...', popularity: 61.4,
    poster_path: '/poster.jpg', release_date: '1999-10-15', title: 'Fight Club',
    video: false, vote_average: 8.4, vote_count: 26000, media_type: 'movie',
    rating: 4, addedAt: 1700000000000,
});
store.set(`${MOVIES}/1396`, {
    id: 1396, title: 'Breaking Bad', media_type: 'tv', first_air_date: '2008-01-20',
    poster_path: '/bb.jpg', vote_average: 8.9, rating: 5, addedAt: 1700000000001,
});
store.set(`${MOVIES}/680`, {
    id: 680, title: 'Pulp Fiction', media_type: 'movie', release_date: '1994-09-10',
    poster_path: '/pf.jpg', vote_average: 8.5, rating: 3, addedAt: 1700000000002,
});

console.log('\nBefore migration');
check('three legacy documents', store.size, 3);

console.log('\nRunning the migration');
const result = await migration.migrateLegacyDocuments(user);
check('migrated three documents', result.migratedCount, 3);
check('no failures', result.failedCount, 0);

console.log('\nAfter migration');
check('movie moved to a namespaced key', store.get(`${MOVIES}/movie_550`)?.title, 'Fight Club');
check('tv moved to a namespaced key', store.get(`${MOVIES}/tv_1396`)?.title, 'Breaking Bad');
check('second movie moved', store.get(`${MOVIES}/movie_680`)?.title, 'Pulp Fiction');
check('legacy key removed', store.has(`${MOVIES}/550`), false);
check('legacy key removed 2', store.has(`${MOVIES}/1396`), false);
check('legacy key removed 3', store.has(`${MOVIES}/680`), false);

console.log('\nNothing was lost');
check('rating preserved', store.get(`${MOVIES}/movie_550`)?.rating, 4);
check('addedAt preserved', store.get(`${MOVIES}/movie_550`)?.addedAt, 1700000000000);
check('tv rating preserved', store.get(`${MOVIES}/tv_1396`)?.rating, 5);
check('tv date preserved', store.get(`${MOVIES}/tv_1396`)?.releaseDate, '2008-01-20');
check('third rating preserved', store.get(`${MOVIES}/movie_680`)?.rating, 3);
check('poster preserved', store.get(`${MOVIES}/movie_680`)?.posterPath, '/pf.jpg');
check('year derived', store.get(`${MOVIES}/movie_550`)?.year, 1999);
check('media type preserved', store.get(`${MOVIES}/tv_1396`)?.mediaType, 'tv');

console.log('\nA backup exists');
check('backup written', [...store.keys()].some(k => k.startsWith(`${BACKUPS}/`)), true);
check('manifest written', store.has(`${BACKUPS}/legacyMovies_manifest`), true);
check('manifest counts three', store.get(`${BACKUPS}/legacyMovies_manifest`)?.count, 3);
const chunk = store.get(`${BACKUPS}/legacyMovies_0`)?.docs || [];
check('backup holds the raw legacy data', chunk[0]?.data?.title, 'Fight Club');
check('backup records the legacy id', chunk[0]?.legacyDocId, '550');

console.log('\nThe backup can be restored');
const restored = await migration.restoreLegacyBackup(user);
check('restored three documents', restored.restored, 3);
check('legacy document back under the current key', store.get(`${MOVIES}/movie_550`)?.title, 'Fight Club');
check('legacy tv document back under the current key', store.get(`${MOVIES}/tv_1396`)?.title, 'Breaking Bad');
check('rating survived the round trip', store.get(`${MOVIES}/movie_550`)?.rating, 4);
check('no leftover legacy keys', [...store.keys()].some(k => /^users\/user-1\/movies\/\d+$/.test(k)), false);

console.log('\nThe migration is idempotent');
check('second run does nothing', (await migration.migrateLegacyDocuments(user)).reason, 'already-migrated');

console.log('\nA document that already exists on the new key is not clobbered');
store.set(`${MOVIES}/movie_550`, { ...store.get(`${MOVIES}/movie_550`), rating: 5, isFavorite: true });
store.set(`${MOVIES}/777`, { id: 777, title: 'Legacy Seven', media_type: 'movie', rating: 2, addedAt: 1 });
store.delete('users/user-1/meta/migration');
const third = await migration.migrateLegacyDocuments(user);
check('migrated the new legacy doc', third.migratedCount, 1);
check('existing rating kept', store.get(`${MOVIES}/movie_550`)?.rating, 5);
check('existing favourite kept', store.get(`${MOVIES}/movie_550`)?.isFavorite, true);
check('new legacy doc moved', store.get(`${MOVIES}/movie_777`)?.title, 'Legacy Seven');

console.log('\nThe backup accumulates across a partial migration');
// Simulate a migration that only half finished: one title moved, one did not.
store.set(`${MOVIES}/movie_550`, { id: 550, mediaType: 'movie', title: 'Fight Club', rating: 4, addedAt: 1 });
store.set(`${MOVIES}/1396`, { id: 1396, media_type: 'tv', title: 'Breaking Bad', rating: 5, addedAt: 2 });
store.delete('users/user-1/meta/migration');
const partial = await migration.migrateLegacyDocuments(user);
check('only the remaining legacy doc moved', partial.migratedCount, 1);
const manifest = store.get(`${BACKUPS}/legacyMovies_manifest`);
check('backup holds every title ever seen', manifest?.count, 4);
const backupTitles = (store.get(`${BACKUPS}/legacyMovies_0`)?.docs || []).map(d => d.data?.title);
check('Fight Club still in the backup', backupTitles.includes('Fight Club'), true);
check('Pulp Fiction still in the backup', backupTitles.includes('Pulp Fiction'), true);
check('Breaking Bad still in the backup', backupTitles.includes('Breaking Bad'), true);
check('Legacy Seven still in the backup', backupTitles.includes('Legacy Seven'), true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
