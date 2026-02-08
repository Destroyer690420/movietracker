import { getImageUrl } from '../services/tmdb';

export default function MovieCard({ movie, onRemove }) {
    const { id, title, poster_path, rating } = movie;

    return (
        <div className="group relative cursor-pointer">
            <div className="relative aspect-[2/3] overflow-hidden bg-[#111]">
                <img
                    src={getImageUrl(poster_path)}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-in-out"
                    loading="lazy"
                />

                {/* Subtle Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Minimal Rating Badge (Top Right) */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
                    <div className="flex gap-0.5 bg-black/60 backdrop-blur-md px-2 py-1">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-[10px] ${i < rating ? 'text-white' : 'text-gray-600'}`}>
                                ★
                            </span>
                        ))}
                    </div>
                </div>

                {/* Remove Button (Bottom Right) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(id);
                    }}
                    className="absolute bottom-3 right-3 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                    title="Remove from list"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Minimal Title Below */}
            <h3 className="mt-3 text-sm font-medium text-[#888] group-hover:text-white transition-colors truncate">
                {title}
            </h3>
        </div>
    );
}
