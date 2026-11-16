/**
 * Shared helpers for the watched collection.
 *
 * TMDB keeps separate id namespaces for movies and TV (`movie/550` is Fight
 * Club, `tv/550` is a completely different title), so every document key has
 * to carry the media type. These helpers also normalise legacy documents into
 * the current shape and provide the sorting / filtering / export utilities.
 */

/** How many films can be pinned as a favourite (Letterboxd allows four). */
export const MAX_FAVORITES = 4;

/** The buckets a title can live in. */
export const STATUS_OPTIONS = [
    { id: 'watched', label: 'Watched' },
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'dropped', label: 'Dropped' },
];

export const DEFAULT_STATUS = 'watched';

export function normalizeStatus(value) {
    return STATUS_OPTIONS.some(option => option.id === value) ? value : DEFAULT_STATUS;
}

export const SORT_OPTIONS = [
    { id: 'recent', label: 'Recently added' },
    { id: 'rating-desc', label: 'Highest rated' },
    { id: 'rating-asc', label: 'Lowest rated' },
    { id: 'year-desc', label: 'Newest films' },
    { id: 'year-asc', label: 'Oldest films' },
    { id: 'title-asc', label: 'Title A-Z' },
    { id: 'title-desc', label: 'Title Z-A' },
];

export const MEDIA_FILTERS = [
    { id: 'all', label: 'Everything' },
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'TV' },
];

export const RATING_FILTERS = [
    { id: 'all', label: 'Any rating' },
    { id: 'unrated', label: 'Unrated' },
    { id: '4', label: '4 stars & up' },
    { id: '5', label: '5 stars only' },
];

/**
 * Build a collision-free document key for a title.
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {number|string} id - TMDB id
 * @returns {string} - e.g. 'movie_550'
 */
export function makeMovieKey(mediaType, id) {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    return `${type}_${id}`;
}

/**
 * Parse a value into a finite number, without letting null become zero.
 * @param {*} value
 * @param {number|null} fallback
 * @returns {number|null}
 */
function toFiniteNumber(value, fallback = null) {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Normalise a title into the current document shape.
 * Accepts both the current schema and the legacy schema (raw TMDB search
 * results plus `rating` / `addedAt`), so old data survives every migration.
 * @param {object} input
 * @returns {object|null} - Normalised title, or null when unusable
 */
export function normalizeMovie(input) {
    if (!input || typeof input !== 'object') {
        return null;
    }

    const mediaType = input.mediaType === 'tv' || input.media_type === 'tv' ? 'tv' : 'movie';
    const id = Number(input.id);
    if (!Number.isFinite(id)) {
        return null;
    }

    const releaseDate = input.releaseDate || input.release_date || input.first_air_date || null;

    let year = null;
    if (input.year !== null && input.year !== undefined && input.year !== '') {
        const parsed = Number(input.year);
        if (Number.isFinite(parsed)) {
            year = parsed;
        }
    } else if (releaseDate) {
        const parsed = Number(String(releaseDate).slice(0, 4));
        if (Number.isFinite(parsed)) {
            year = parsed;
        }
    }

    const rating = toFiniteNumber(input.rating, 0);

    return {
        key: makeMovieKey(mediaType, id),
        id,
        mediaType,
        title: input.title || input.name || input.original_title || input.original_name || 'Untitled',
        posterPath: input.posterPath ?? input.poster_path ?? null,
        backdropPath: input.backdropPath ?? input.backdrop_path ?? null,
        year,
        releaseDate,
        rating: Math.min(5, Math.max(0, rating)),
        voteAverage: input.voteAverage ?? input.vote_average ?? null,
        isFavorite: Boolean(input.isFavorite),
        // Old documents have no status, so they are all treated as watched.
        status: normalizeStatus(input.status),
        watchedAt: toFiniteNumber(input.watchedAt, null),
        addedAt: toFiniteNumber(input.addedAt, Date.now()),
        // Enrichment, filled in lazily when a title's details are opened.
        runtime: input.runtime ?? null,
        genres: Array.isArray(input.genres) ? input.genres : [],
        director: input.director ?? null,
        overview: input.overview ?? null,
        tagline: input.tagline ?? null,
        providers: Array.isArray(input.providers) ? input.providers : [],
        topCast: Array.isArray(input.topCast) ? input.topCast : [],
        enrichedAt: toFiniteNumber(input.enrichedAt, null),
    };
}

/**
 * Sort a list of titles.
 * @param {Array} movies
 * @param {string} sortId - One of SORT_OPTIONS
 * @returns {Array} - A new, sorted array
 */
export function sortMovies(movies, sortId = 'recent') {
    const copy = [...movies];
    const byTitle = (a, b) =>
        String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });

    switch (sortId) {
        case 'rating-desc':
            copy.sort((a, b) => (b.rating - a.rating) || (b.addedAt - a.addedAt));
            break;
        case 'rating-asc':
            copy.sort((a, b) => {
                // Unrated titles sink to the bottom rather than leading the list.
                const ra = a.rating > 0 ? a.rating : Infinity;
                const rb = b.rating > 0 ? b.rating : Infinity;
                return (ra - rb) || (b.addedAt - a.addedAt);
            });
            break;
        case 'year-desc':
            copy.sort((a, b) => ((b.year ?? -1) - (a.year ?? -1)) || (b.addedAt - a.addedAt));
            break;
        case 'year-asc':
            copy.sort((a, b) => ((a.year ?? Infinity) - (b.year ?? Infinity)) || (b.addedAt - a.addedAt));
            break;
        case 'title-asc':
            copy.sort((a, b) => byTitle(a, b) || (b.addedAt - a.addedAt));
            break;
        case 'title-desc':
            copy.sort((a, b) => byTitle(b, a) || (b.addedAt - a.addedAt));
            break;
        default:
            copy.sort((a, b) => b.addedAt - a.addedAt);
    }

    return copy;
}

/**
 * Filter titles by status, search term, media type and rating threshold.
 * @param {Array} movies
 * @param {{status?: string, search?: string, rating?: string, media?: string}} filters
 * @returns {Array}
 */
export function filterMovies(movies, { status = 'watched', search = '', rating = 'all', media = 'all' } = {}) {
    const term = search.trim().toLowerCase();

    return movies.filter((movie) => {
        if (status !== 'all' && movie.status !== status) {
            return false;
        }
        if (media !== 'all' && movie.mediaType !== media) {
            return false;
        }
        if (rating === 'unrated' && movie.rating > 0) {
            return false;
        }
        if (rating === '5' && movie.rating < 5) {
            return false;
        }
        if (rating === '4' && movie.rating < 4) {
            return false;
        }
        if (term) {
            const haystack = [
                movie.title,
                movie.year ?? '',
                (movie.genres || []).join(' '),
                movie.director ?? '',
            ].join(' ').toLowerCase();
            if (!haystack.includes(term)) {
                return false;
            }
        }
        return true;
    });
}

/**
 * Remove undefined values from a value.
 *
 * Firestore rejects a write that contains `undefined` anywhere in the tree,
 * so anything on its way to the database goes through here first.
 * @param {*} value
 * @returns {*}
 */
export function stripUndefined(value) {
    if (Array.isArray(value)) {
        return value
            .map(stripUndefined)
            .filter(item => item !== undefined);
    }

    if (value && typeof value === 'object') {
        const cleaned = {};
        for (const [key, entry] of Object.entries(value)) {
            const result = stripUndefined(entry);
            if (result !== undefined) {
                cleaned[key] = result;
            }
        }
        return cleaned;
    }

    return value;
}

/**
 * Render the collection as CSV (comma separated, RFC 4180 escaped).
 * @param {Array} movies
 * @returns {string}
 */
export function toCsv(movies) {
    const headers = [
        'Title',
        'Media Type',
        'Status',
        'Year',
        'Your Rating',
        'TMDB Rating',
        'Release Date',
        'Genres',
        'Director',
        'Runtime (min)',
        'Favourite',
        'Added At',
        'Watched At',
        'TMDB ID',
        'TMDB URL',
    ];

    const escapeCell = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        const str = String(value);
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = movies.map((movie) => [
        movie.title,
        movie.mediaType,
        movie.status,
        movie.year ?? '',
        movie.rating > 0 ? movie.rating : '',
        movie.voteAverage ?? '',
        movie.releaseDate ?? '',
        (movie.genres || []).join('; '),
        movie.director ?? '',
        movie.runtime ?? '',
        movie.isFavorite ? 'yes' : 'no',
        movie.addedAt ? new Date(movie.addedAt).toISOString() : '',
        movie.watchedAt ? new Date(movie.watchedAt).toISOString() : '',
        movie.id,
        `https://www.themoviedb.org/${movie.mediaType}/${movie.id}`,
    ].map(escapeCell).join(','));

    return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Trigger a client-side file download.
 * @param {string} filename
 * @param {string} contents
 * @param {string} mime
 */
export function downloadFile(filename, contents, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Build a timestamped filename such as `watchlist-2026-11-16.csv`.
 * @param {string} extension
 * @returns {string}
 */
export function exportFilename(extension) {
    const now = new Date();
    const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');
    return `watchlist-${stamp}.${extension}`;
}
