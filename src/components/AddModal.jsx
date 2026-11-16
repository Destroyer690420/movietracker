import { useState } from 'react';
import { getImageUrl } from '../services/tmdb';

/**
 * Modal used when adding a title from search, and when moving a watchlist
 * title into the watched collection.
 *
 * mode="new"     -> choose a rating and add as watched, or add to the watchlist
 * mode="watched" -> choose a rating and mark an existing title as watched
 */
export default function AddModal({ movie, mode = 'new', onClose, onAddWatched, onAddWatchlist }) {
    const [rating, setRating] = useState(movie.rating || 0);
    const [hoveredRating, setHoveredRating] = useState(0);

    if (!movie) {
        return null;
    }

    const displayRating = hoveredRating || rating;
    const isWatchlistMode = mode === 'watched';

    const handleWatched = () => {
        if (rating > 0) {
            onAddWatched({ ...movie, rating });
        }
    };

    const handleWatchlist = () => {
        onAddWatchlist?.(movie);
    };

    const posterPath = movie.posterPath ?? movie.poster_path ?? null;
    const year = movie.releaseDate ?? movie.release_date ?? null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm bg-[#0a0a0a] border border-[#222] shadow-2xl p-8 animate-zoom"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#333] hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Top: Poster & Title */}
                <div className="flex flex-col items-center text-center mb-7">
                    <div className="relative w-24 aspect-[2/3] mb-5 shadow-2xl">
                        <img
                            src={getImageUrl(posterPath, 'w185')}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 ring-1 ring-white/10" />
                    </div>

                    <h2 className="text-xl font-light text-white tracking-wide mb-1">
                        {movie.title}
                    </h2>
                    <p className="text-[#444] text-xs font-mono uppercase tracking-widest">
                        {year ? String(year).split('-')[0] : 'Unknown'}
                    </p>
                </div>

                {/* Rating Stars */}
                <div className="flex justify-center gap-1.5 mb-7">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            onClick={() => setRating(star)}
                            className="relative p-1 group transition-transform duration-200 hover:scale-110 focus:outline-none"
                            aria-label={`${star} star${star === 1 ? '' : 's'}`}
                        >
                            <span className={`text-2xl transition-colors duration-200 ${displayRating >= star ? 'text-white' : 'text-[#222]'}`}>
                                ★
                            </span>
                        </button>
                    ))}
                </div>

                {/* Primary action: add as watched */}
                <button
                    onClick={handleWatched}
                    disabled={rating === 0}
                    className={`
                        w-full py-3.5 text-xs font-bold uppercase tracking-widest transition-all duration-300
                        ${rating > 0
                            ? 'bg-white text-black hover:bg-gray-200'
                            : 'bg-[#111] text-[#333] cursor-not-allowed'}
                    `}
                >
                    {isWatchlistMode ? 'Mark as watched' : 'Add as watched'}
                </button>

                {/* Secondary action */}
                {isWatchlistMode ? (
                    <button
                        onClick={onClose}
                        className="w-full mt-3 py-2 text-[11px] font-light tracking-wide text-[#555] hover:text-white transition-colors"
                    >
                        Keep in watchlist
                    </button>
                ) : (
                    <button
                        onClick={handleWatchlist}
                        className="w-full mt-3 py-2 text-[11px] font-light tracking-wide text-[#777] hover:text-white border border-[#222] hover:border-[#444] transition-colors"
                    >
                        Just add to my watchlist
                    </button>
                )}

                {rating === 0 && (
                    <p className="mt-3 text-center text-[10px] text-[#333] font-light">
                        Pick a star rating to add it as watched
                    </p>
                )}
            </div>
        </div>
    );
}
