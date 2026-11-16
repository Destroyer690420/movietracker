import {
    makeMovieKey,
    normalizeMovie,
    sortMovies,
    filterMovies,
    toCsv,
} from '../src/lib/movies.js';

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

// A document exactly as the OLD code wrote it: the whole TMDB search result
// plus a rating and addedAt.
const legacyDoc = {
    adult: false,
    backdrop_path: '/c6OLXfKAk5BKeR6broC8pYiCquX.jpg',
    genre_ids: [18, 53],
    id: 550,
    original_language: 'en',
    original_name: 'Fight Club',
    original_title: 'Fight Club',
    overview: 'A ticking-time-bomb insomniac...',
    popularity: 61.416,
    poster_path: '/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg',
    release_date: '1999-10-15',
    title: 'Fight Club',
    video: false,
    vote_average: 8.4,
    vote_count: 26000,
    media_type: 'movie',
    rating: 4,
    addedAt: 1700000000000,
};

console.log('\nMigration: legacy document -> new schema');
const migrated = normalizeMovie(legacyDoc);
check('key is namespaced', migrated.key, 'movie_550');
check('title preserved', migrated.title, 'Fight Club');
check('rating preserved', migrated.rating, 4);
check('addedAt preserved', migrated.addedAt, 1700000000000);
check('poster preserved', migrated.posterPath, '/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg');
check('backdrop preserved', migrated.backdropPath, '/c6OLXfKAk5BKeR6broC8pYiCquX.jpg');
check('release date preserved', migrated.releaseDate, '1999-10-15');
check('year derived', migrated.year, 1999);
check('vote average preserved', migrated.voteAverage, 8.4);
check('media type preserved', migrated.mediaType, 'movie');
check('overview preserved', migrated.overview, 'A ticking-time-bomb insomniac...');

console.log('\nMigration: normalising twice must not change anything');
check('idempotent', normalizeMovie(migrated), migrated);

console.log('\nMigration: legacy TV document');
const legacyTv = {
    ...legacyDoc,
    id: 550,
    media_type: 'tv',
    title: 'Till Death Us Do Part',
    first_air_date: '1966-06-06',
    release_date: undefined,
};
const migratedTv = normalizeMovie(legacyTv);
check('tv gets its own key', migratedTv.key, 'tv_550');
check('movie and tv do not collide', makeMovieKey('movie', 550) !== makeMovieKey('tv', 550), true);
check('tv release date from first_air_date', migratedTv.releaseDate, '1966-06-06');

console.log('\nMigration: an already-migrated document is left alone');
const already = {
    key: 'movie_550', id: 550, mediaType: 'movie', title: 'Fight Club', posterPath: '/p.jpg',
    year: 1999, releaseDate: '1999-10-15', rating: 5, voteAverage: 8.4, isFavorite: true,
    addedAt: 1700000000000, runtime: 139, genres: ['Drama'], director: 'David Fincher',
    overview: 'x', tagline: 'y', providers: ['Netflix'], topCast: [], enrichedAt: 1700000000001,
};
const roundTrip = normalizeMovie(already);
check('favourite preserved', roundTrip.isFavorite, true);
check('runtime preserved', roundTrip.runtime, 139);
check('genres preserved', roundTrip.genres, ['Drama']);
check('director preserved', roundTrip.director, 'David Fincher');
check('providers preserved', roundTrip.providers, ['Netflix']);
check('enrichedAt preserved', roundTrip.enrichedAt, 1700000000001);

console.log('\nSorting and filtering');
const list = [
    { key: 'movie_1', id: 1, mediaType: 'movie', title: 'B Movie', year: 2001, rating: 2, addedAt: 3, genres: ['Drama'], director: 'X' },
    { key: 'movie_2', id: 2, mediaType: 'movie', title: 'A Movie', year: 1999, rating: 5, addedAt: 2, genres: ['Horror'], director: 'Y' },
    { key: 'tv_3', id: 3, mediaType: 'tv', title: 'C Show', year: 2020, rating: 0, addedAt: 1, genres: [], director: null },
];
check('recent sorts by addedAt desc', sortMovies(list, 'recent').map(m => m.title), ['B Movie', 'A Movie', 'C Show']);
check('rating desc puts unrated last', sortMovies(list, 'rating-desc').map(m => m.title), ['A Movie', 'B Movie', 'C Show']);
check('rating asc puts unrated last', sortMovies(list, 'rating-asc').map(m => m.title), ['B Movie', 'A Movie', 'C Show']);
check('title asc', sortMovies(list, 'title-asc').map(m => m.title), ['A Movie', 'B Movie', 'C Show']);
check('year desc', sortMovies(list, 'year-desc').map(m => m.title), ['C Show', 'B Movie', 'A Movie']);
check('filter by type', filterMovies(list, { media: 'tv' }).map(m => m.title), ['C Show']);
check('filter unrated', filterMovies(list, { rating: 'unrated' }).map(m => m.title), ['C Show']);
check('filter 5 stars', filterMovies(list, { rating: '5' }).map(m => m.title), ['A Movie']);
check('filter by title', filterMovies(list, { search: 'b mov' }).map(m => m.title), ['B Movie']);
check('filter by director', filterMovies(list, { search: 'y' }).map(m => m.title), ['A Movie']);

console.log('\nCSV escaping');
const csv = toCsv([{
    title: 'Snakes, "Planes" & Trains', mediaType: 'movie', year: 2020, rating: 3,
    id: 9, addedAt: 0, genres: ['Comedy'], director: 'A, B',
}]);
check('commas and quotes escaped', csv.split('\r\n')[1].startsWith('"Snakes, ""Planes"" & Trains"'), true);
check('director with comma escaped', csv.includes('"A, B"'), true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
