import { getImageUrl } from '../services/tmdb';

export default function MovieCard({ movie, onRemove, onSelect, onToggleFavorite, onMarkWatched }) {
    const { key, title, posterPath, rating, isFavorite, status } = movie;
    const isWatched = status === 'watched';

    return (
        <div className="group relative">
            <div className="relative aspect-[2/3] overflow-hidden bg-[#111]">
                <img
                    src={getImageUrl(posterPath)}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-in-out"
                    loading="lazy"
                />

                {/* Subtle Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Status Marker (Top Left) */}
                {!isWatched && (
                    <div className={`absolute top-3 left-3 z-10 pointer-events-none text-[9px] font-medium uppercase tracking-[0.15em] px-2 py-1 backdrop-blur-md ${
                        status === 'watchlist'
                            ? 'bg-amber-400/15 text-amber-300/90 border border-amber-400/25'
                            : 'bg-white/10 text-white/60 border border-white/15'
                    }`}>
                        {status === 'watchlist' ? 'Planned' : 'Dropped'}
                    </div>
                )}

                {/* Pinned Marker (Top Left, watched only) */}
                {isWatched && isFavorite && (
                    <div className="absolute top-3 left-3 text-white/90 z-10 pointer-events-none">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.5l2.31 4.68 5.17.75-3.74 3.64.88 5.15-4.62-2.43-4.62 2.43.88-5.15L3.99 8.93l5.17-.75L11.48 3.5z" />
                        </svg>
                    </div>
                )}

                {/* Rating Badge (Top Right, watched only) */}
                {isWatched && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-[-10px] group-hover:translate-y-0 z-10 pointer-events-none">
                        <div className="flex gap-0.5 bg-black/60 backdrop-blur-md px-2 py-1">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className={`text-[10px] ${i < rating ? 'text-white' : 'text-gray-600'}`}>
                                    ★
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mark as watched (Bottom Left, non-watched only) */}
                {!isWatched && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkWatched?.(movie);
                        }}
                        className="absolute bottom-3 left-3 p-2 bg-emerald-400/15 hover:bg-emerald-400/30 backdrop-blur-md text-emerald-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 z-20"
                        title="Mark as watched"
                        aria-label={`Mark ${title} as watched`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                )}

                {/* Pin Button (Bottom Left, watched only) */}
                {isWatched && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite?.(movie);
                        }}
                        className="absolute bottom-3 left-3 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 z-20"
                        title={isFavorite ? 'Unpin from favourites' : 'Pin as favourite'}
                        aria-label={isFavorite ? `Unpin ${title}` : `Pin ${title} as a favourite`}
                    >
                        <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.5l2.31 4.68 5.17.75-3.74 3.64.88 5.15-4.62-2.43-4.62 2.43.88-5.15L3.99 8.93l5.17-.75L11.48 3.5z" />
                        </svg>
                    </button>
                )}

                {/* Remove Button (Bottom Right) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.(key);
                    }}
                    className="absolute bottom-3 right-3 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 z-20"
                    title="Remove from list"
                    aria-label={`Remove ${title} from the collection`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Open the detail view. Sits under the action buttons. */}
                <button
                    onClick={() => onSelect?.(movie)}
                    className="absolute inset-0 z-10 cursor-pointer"
                    aria-label={`Open details for ${title}`}
                />
            </div>

            {/* Minimal Title Below */}
            <h3 className="mt-3 text-sm font-medium text-[#888] group-hover:text-white transition-colors truncate">
                {title}
            </h3>
        </div>
    );
}
