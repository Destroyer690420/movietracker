import MovieCard from './MovieCard';

export default function MovieGrid({ movies, onRemoveMovie }) {
    if (movies.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center -mt-20 px-6">
                <div className="text-center max-w-sm">
                    <p className="text-[#333] text-sm font-light tracking-widest uppercase mb-4">
                        Emptiness
                    </p>
                    <div className="w-8 h-[1px] bg-[#222] mx-auto mb-4" />
                    <p className="text-[#444] text-xs font-light">
                        Your collection awaits its first masterpiece.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-6 pb-20">
            <div className="max-w-[1600px] mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-4 gap-y-12">
                    {movies.map((movie) => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            onRemove={onRemoveMovie}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
