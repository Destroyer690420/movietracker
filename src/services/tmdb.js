const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Search movies from TMDB API
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of movie results
 */
export async function searchMovies(query) {
    if (!query || query.trim().length < 2) {
        return [];
    }

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
            {
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_TMDB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch movies');
        }

        const data = await response.json();
        return data.results || [];
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
 * Get movie details by ID
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<Object>} - Movie details
 */
export async function getMovieDetails(movieId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}?language=en-US`,
            {
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_TMDB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch movie details');
        }

        return await response.json();
    } catch (error) {
        console.error('TMDB Details Error:', error);
        return null;
    }
}
