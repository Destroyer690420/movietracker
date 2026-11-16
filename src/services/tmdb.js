const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Common region fallbacks for the streaming providers lookup.
 * The browser locale wins, then the timezone, then the US.
 */
const TIMEZONE_REGION = {
    'Asia/Kolkata': 'IN',
    'Asia/Calcutta': 'IN',
    'Asia/Colombo': 'LK',
    'Asia/Dhaka': 'BD',
    'Asia/Karachi': 'PK',
    'Asia/Dubai': 'AE',
    'Asia/Singapore': 'SG',
    'Asia/Jakarta': 'ID',
    'Asia/Manila': 'PH',
    'Asia/Bangkok': 'TH',
    'Asia/Ho_Chi_Minh': 'VN',
    'Asia/Tokyo': 'JP',
    'Asia/Seoul': 'KR',
    'Asia/Hong_Kong': 'HK',
    'Europe/London': 'GB',
    'Europe/Dublin': 'IE',
    'Europe/Lisbon': 'PT',
    'Europe/Madrid': 'ES',
    'Europe/Paris': 'FR',
    'Europe/Rome': 'IT',
    'Europe/Berlin': 'DE',
    'Europe/Vienna': 'AT',
    'Europe/Amsterdam': 'NL',
    'Europe/Brussels': 'BE',
    'Europe/Zurich': 'CH',
    'Europe/Stockholm': 'SE',
    'Europe/Oslo': 'NO',
    'Europe/Copenhagen': 'DK',
    'Europe/Warsaw': 'PL',
    'Europe/Prague': 'CZ',
    'Europe/Budapest': 'HU',
    'Europe/Kyiv': 'UA',
    'Europe/Moscow': 'RU',
    'Europe/Istanbul': 'TR',
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Phoenix': 'US',
    'America/Los_Angeles': 'US',
    'America/Anchorage': 'US',
    'America/Toronto': 'CA',
    'America/Vancouver': 'CA',
    'America/Mexico_City': 'MX',
    'America/Bogota': 'CO',
    'America/Sao_Paulo': 'BR',
    'America/Buenos_Aires': 'AR',
    'America/Santiago': 'CL',
    'Australia/Sydney': 'AU',
    'Australia/Melbourne': 'AU',
    'Australia/Brisbane': 'AU',
    'Pacific/Auckland': 'NZ',
    'Africa/Cairo': 'EG',
    'Africa/Johannesburg': 'ZA',
    'Africa/Lagos': 'NG',
    'Africa/Nairobi': 'KE',
};

function authHeaders() {
    return {
        'Authorization': `Bearer ${import.meta.env.VITE_TMDB_TOKEN}`,
        'Content-Type': 'application/json',
    };
}

/**
 * Work out which country the streaming providers should be resolved for.
 * @returns {string} - Two letter country code
 */
export function detectRegion() {
    try {
        const locale = navigator.language || '';
        const fromLocale = locale.split('-')[1];
        if (fromLocale && fromLocale.length === 2) {
            return fromLocale.toUpperCase();
        }
    } catch {
        // Fall through to the timezone lookup.
    }

    try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (zone && TIMEZONE_REGION[zone]) {
            return TIMEZONE_REGION[zone];
        }
    } catch {
        // Fall through to the default.
    }

    return 'US';
}

/**
 * Search movies and TV shows from TMDB API
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of results (movies and TV shows)
 */
export async function searchMovies(query) {
    if (!query || query.trim().length < 2) {
        return [];
    }

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
            {
                headers: authHeaders(),
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch results');
        }

        const data = await response.json();

        // Filter to only movies and TV shows, normalize the data
        return (data.results || [])
            .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
            .map(item => ({
                ...item,
                // Normalize title (movies use 'title', TV shows use 'name')
                title: item.title || item.name,
                // Normalize release date
                release_date: item.release_date || item.first_air_date,
                // Keep media type for display
                media_type: item.media_type,
                mediaType: item.media_type,
            }));
    } catch (error) {
        console.error('TMDB Search Error:', error);
        return [];
    }
}

/**
 * Get full poster URL from TMDB path
 * @param {string} posterPath - Poster path from API
 * @param {string} size - Image size (w185, w342, w500, w780, original)
 * @returns {string} - Full image URL or placeholder
 */
export function getImageUrl(posterPath, size = 'w500') {
    if (!posterPath) {
        return 'https://via.placeholder.com/500x750/1a1a2e/f59e0b?text=No+Poster';
    }
    return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

/**
 * Get the details of a movie or TV show, including cast, crew and the
 * streaming providers for a region.
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {number} id - TMDB id
 * @param {string} region - Two letter country code
 * @returns {Promise<Object>} - Normalised details
 */
export async function getDetails(mediaType, id, region = 'US') {
    const type = mediaType === 'tv' ? 'tv' : 'movie';

    try {
        const [response, directory] = await Promise.all([
            fetch(
                `${TMDB_BASE_URL}/${type}/${id}?language=en-US&append_to_response=credits,watch/providers`,
                { headers: authHeaders() }
            ),
            getProviderDirectory(type, region),
        ]);

        if (!response.ok) {
            throw new Error('Failed to fetch details');
        }

        const data = await response.json();
        const cast = data.credits?.cast || [];
        const crew = data.credits?.crew || [];

        return {
            title: data.title || data.name || null,
            overview: data.overview || null,
            tagline: data.tagline || null,
            runtime: type === 'movie'
                ? (data.runtime ?? null)
                : (data.episode_run_time?.[0] ?? null),
            genres: (data.genres || []).map(genre => genre.name),
            director: type === 'movie'
                ? (crew.find(person => person.job === 'Director')?.name || null)
                : (data.created_by?.[0]?.name || null),
            topCast: cast.slice(0, 8).map(person => ({
                name: person.name,
                character: person.character,
                profilePath: person.profile_path || null,
            })),
            providers: extractProviders(data['watch/providers'], region, directory),
            backdropPath: data.backdrop_path || null,
            posterPath: data.poster_path || null,
            releaseDate: data.release_date || data.first_air_date || null,
            voteAverage: data.vote_average ?? null,
            status: data.status || null,
            numberOfSeasons: data.number_of_seasons ?? null,
            numberOfEpisodes: data.number_of_episodes ?? null,
        };
    } catch (error) {
        console.error('TMDB Details Error:', error);
        return null;
    }
}

/**
 * Get details of a movie by ID.
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<Object>} - Movie details
 */
export async function getMovieDetails(movieId) {
    return getDetails('movie', movieId);
}

/**
 * Cache of provider id -> provider info, keyed by media type and region.
 */
const providerDirectoryCache = new Map();
const DIRECTORY_CACHE_KEY = 'movielog-provider-directory';

/**
 * Human readable labels for the TMDB availability categories.
 */
const PROVIDER_TYPE_LABELS = {
    flatrate: 'Stream',
    ads: 'Free with ads',
    rent: 'Rent',
    buy: 'Buy',
};

/**
 * Read a cached provider directory out of localStorage.
 * @param {string} cacheKey
 * @returns {Map<string, Object>|null}
 */
function readCachedDirectory(cacheKey) {
    try {
        const raw = localStorage.getItem(DIRECTORY_CACHE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (parsed?.key !== cacheKey || !Array.isArray(parsed.entries)) {
            return null;
        }
        return new Map(parsed.entries);
    } catch {
        return null;
    }
}

/**
 * Store the provider directory in localStorage so it is fetched once.
 * @param {string} cacheKey
 * @param {Map<string, Object>} directory
 */
function writeCachedDirectory(cacheKey, directory) {
    try {
        localStorage.setItem(DIRECTORY_CACHE_KEY, JSON.stringify({
            key: cacheKey,
            entries: [...directory.entries()],
        }));
    } catch {
        // A full localStorage is not worth failing over.
    }
}

/**
 * Fetch the full provider directory (id -> name + logo) for a region.
 * The per-title availability data only returns ids, so the logos have to come
 * from the directory. Cached in memory and in localStorage.
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {string} region - Two letter country code
 * @returns {Promise<Map<string, Object>>}
 */
export async function getProviderDirectory(mediaType = 'movie', region = 'US') {
    const cacheKey = `${mediaType}:${region}`;
    if (providerDirectoryCache.has(cacheKey)) {
        return providerDirectoryCache.get(cacheKey);
    }

    const cached = readCachedDirectory(cacheKey);
    if (cached) {
        providerDirectoryCache.set(cacheKey, cached);
        return cached;
    }

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/watch/providers/${mediaType}?region=${region}`,
            { headers: authHeaders() }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch streaming providers');
        }

        const data = await response.json();
        const directory = new Map();

        for (const provider of data.results || []) {
            directory.set(provider.provider_id, {
                id: provider.provider_id,
                name: provider.provider_name,
                logoPath: provider.logo_path || null,
            });
        }

        providerDirectoryCache.set(cacheKey, directory);
        writeCachedDirectory(cacheKey, directory);
        return directory;
    } catch (error) {
        console.error('TMDB Providers Error:', error);
        return new Map();
    }
}

/**
 * Pull the availability list for a region out of a `watch/providers` payload
 * and attach the provider logos from the directory.
 * @param {object} watchProviders - The `watch/providers` part of a details response
 * @param {string} region - Two letter country code
 * @param {Map<string, Object>} directory - Provider id -> provider info
 * @returns {Array} - Array of { id, name, logoPath, type, label }
 */
function extractProviders(watchProviders, region, directory) {
    const regional = watchProviders?.results?.[region];
    if (!regional) {
        return [];
    }

    const providers = [];
    const seen = new Set();

    for (const [category, list] of Object.entries(regional)) {
        // Each region also carries a `link` entry, which is a URL rather than
        // a list of providers.
        if (!Array.isArray(list)) {
            continue;
        }

        for (const provider of list) {
            if (!provider || seen.has(provider.provider_id)) {
                continue;
            }
            seen.add(provider.provider_id);
            providers.push({
                id: provider.provider_id ?? null,
                name: provider.provider_name ?? 'Unknown',
                logoPath: directory.get(provider.provider_id)?.logoPath || null,
                type: category,
                label: PROVIDER_TYPE_LABELS[category] || category,
            });
        }
    }

    return providers;
}
