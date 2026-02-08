import { useState } from 'react';
import { getImageUrl } from '../services/tmdb';

export default function RatingModal({ movie, onClose, onConfirm }) {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);

    if (!movie) return null;

    const handleConfirm = () => {
        if (rating > 0) {
            onConfirm({ ...movie, rating });
        }
    };

    const displayRating = hoveredRating || rating;

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
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Top: Poster & Title */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="relative w-24 aspect-[2/3] mb-5 shadow-2xl">
                        <img
                            src={getImageUrl(movie.poster_path, 'w185')}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 ring-1 ring-white/10" />
                    </div>

                    <h2 className="text-xl font-light text-white tracking-wide mb-1">
                        {movie.title}
                    </h2>
                    <p className="text-[#444] text-xs font-mono uppercase tracking-widest">
                        {movie.release_date ? movie.release_date.split('-')[0] : 'Unknown'}
                    </p>
                </div>

                {/* Rating Stars */}
                <div className="flex justify-center gap-1.5 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            onClick={() => setRating(star)}
                            className="relative p-1 group transition-transform duration-200 hover:scale-110 focus:outline-none"
                        >
                            <span className={`text-2xl transition-colors duration-200 ${displayRating >= star ? 'text-white' : 'text-[#222]'}`}>
                                ★
                            </span>
                        </button>
                    ))}
                </div>

                {/* Action Button */}
                <button
                    onClick={handleConfirm}
                    disabled={rating === 0}
                    className={`
            w-full py-3.5 text-xs font-bold uppercase tracking-widest transition-all duration-300
            ${rating > 0
                            ? 'bg-white text-black hover:bg-gray-200'
                            : 'bg-[#111] text-[#333] cursor-not-allowed'}
          `}
                >
                    Add to Collection
                </button>
            </div>
        </div>
    );
}
