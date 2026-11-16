import { getImageUrl } from '../services/tmdb';

/**
 * The pinned films, shown as a small strip above the collection.
 * Up to four can be pinned, like Letterboxd's profile favourites.
 */
export default function FavoritesStrip({ favorites, onSelect }) {
    if (!favorites.length) {
        return null;
    }

    return (
        <div className="w-full px-6 pb-8">
            <div className="max-w-[1600px] mx-auto">
                <div className="flex items-center gap-4 mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-[#444]">Pinned</p>
                    <div className="w-8 h-px bg-[#1c1c1c]" />
                </div>

                <div className="flex gap-4">
                    {favorites.map(movie => (
                        <button
                            key={movie.key}
                            onClick={() => onSelect(movie)}
                            className="group w-20 sm:w-24 shrink-0 text-left"
                            title={movie.title}
                        >
                            <div className="relative aspect-[2/3] overflow-hidden bg-[#111]">
                                <img
                                    src={getImageUrl(movie.posterPath, 'w342')}
                                    alt={movie.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 ring-1 ring-white/10 group-hover:ring-white/25 transition-all" />
                            </div>
                            <p className="mt-2 text-[10px] text-[#666] group-hover:text-white transition-colors truncate">
                                {movie.title}
                            </p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
