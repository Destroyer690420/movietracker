import { useState, useEffect, useRef } from 'react';
import { searchMovies, getImageUrl } from '../services/tmdb';
import { makeMovieKey } from '../lib/movies';

/**
 * The search bar that sits at the top of the home page.
 * Everything else lives in the sidebar.
 */
export default function SearchBar({ onMovieSelect, watchedMovies = [] }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [resultsFor, setResultsFor] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef(null);
    const debounceRef = useRef(null);

    // Handle search with debounce. The results are tagged with the query they
    // came from, so stale results never show while a new search is in flight.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim().length < 2) {
            return undefined;
        }
        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            const movies = await searchMovies(query);
            setResults(movies);
            setResultsFor(query);
            setIsLoading(false);
            setShowResults(true);
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMovieClick = (movie) => {
        onMovieSelect(movie);
        setQuery('');
        setShowResults(false);
        setResults([]);
        setResultsFor('');
    };

    return (
        <header className="w-full flex flex-col items-center pt-6 pb-10 px-4 sm:px-6">
            <div className="w-full max-w-2xl relative" ref={searchRef}>
                <div
                    className={`
                        relative group transition-all duration-300 ease-out
                        ${isFocused ? 'scale-[1.02] shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)]' : 'shadow-lg'}
                    `}
                >
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Search for a cinematic masterpiece..."
                        className="
                            w-full px-8 py-4 sm:py-5 pl-12 sm:pl-14
                            bg-[#0f0f0f] border border-[#222]
                            text-white text-base sm:text-lg font-light tracking-wide
                            placeholder-[#444]
                            focus:outline-none focus:border-[#333] focus:bg-[#141414]
                            transition-all duration-300
                            rounded-none
                        "
                        style={{ borderRadius: '0' }}
                    />

                    {/* Minimal Search Icon */}
                    <svg
                        className={`absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-white' : 'text-[#333]'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>

                    {/* Loader */}
                    {isLoading && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border border-t-transparent border-white/40 rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* Dropdown Results */}
                {showResults && resultsFor === query && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-[#222] shadow-2xl z-40 animate-enter max-h-[60vh] overflow-y-auto">
                        {results.map((movie) => (
                            <button
                                key={`${movie.mediaType}_${movie.id}`}
                                onClick={() => handleMovieClick(movie)}
                                className="w-full flex items-center gap-4 sm:gap-6 p-3 sm:p-4 hover:bg-[#151515] transition-colors border-b border-[#1a1a1a] last:border-none group text-left"
                            >
                                <img
                                    src={getImageUrl(movie.poster_path, 'w92')}
                                    alt={movie.title}
                                    className="w-9 h-12 sm:w-10 sm:h-14 object-cover transition-all duration-300 shadow-sm"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-gray-200 font-medium text-sm sm:text-base tracking-wide group-hover:text-white transition-colors truncate">
                                        {movie.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[#444] text-xs font-mono">
                                            {movie.release_date ? movie.release_date.split('-')[0] : 'Unknown'}
                                        </span>
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${movie.media_type === 'tv' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {movie.media_type === 'tv' ? 'TV' : 'Movie'}
                                        </span>
                                        {movie.vote_average > 0 && (
                                            <span className="text-[#444] text-xs font-mono flex items-center gap-1">
                                                ★ {movie.vote_average.toFixed(1)}
                                            </span>
                                        )}
                                        {watchedMovies.some(m => m.key === makeMovieKey(movie.mediaType, movie.id)) && (
                                            <span className="ml-auto text-green-500/80 text-xs font-medium flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Added
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Empty State Dropdown */}
                {showResults && resultsFor === query && results.length === 0 && !isLoading && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-[#222] p-6 text-center animate-enter">
                        <p className="text-[#444] text-sm font-light tracking-wide">No films found.</p>
                    </div>
                )}
            </div>
        </header>
    );
}
