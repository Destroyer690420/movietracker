import { useState, useEffect, useRef } from 'react';
import { searchMovies, getImageUrl } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';

export default function Header({ onMovieSelect }) {
    const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef(null);
    const debounceRef = useRef(null);

    // Handle search with debounce (same logic)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim().length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            const movies = await searchMovies(query);
            setResults(movies.slice(0, 6)); // Limit to 6 for cleaner list
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
    };

    const handleSignIn = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Sign in failed:', error);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    return (
        <header className="w-full flex flex-col items-center pt-8 pb-12 px-6">
            {/* Auth Section */}
            <div className="w-full max-w-2xl flex justify-end mb-8">
                {authLoading ? (
                    <div className="w-8 h-8 border border-t-transparent border-white/20 rounded-full animate-spin" />
                ) : user ? (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            {user.photoURL && (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName}
                                    className="w-8 h-8 rounded-full border border-[#333]"
                                />
                            )}
                            <span className="text-[#888] text-sm font-light hidden sm:block">
                                {user.displayName || user.email}
                            </span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="px-4 py-2 text-[#666] hover:text-white text-sm font-light tracking-wide transition-colors border border-[#222] hover:border-[#444] bg-transparent"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleSignIn}
                        className="flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-gray-100 text-black text-sm font-medium tracking-wide transition-all shadow-lg hover:shadow-xl"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Sign in with Google
                    </button>
                )}
            </div>

            {/* Search Section */}
            <div className="w-full max-w-2xl relative" ref={searchRef}>
                {/* Search Input Container */}
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
                            w-full px-8 py-5 pl-14 
                            bg-[#0f0f0f] border border-[#222] 
                            text-white text-lg font-light tracking-wide
                            placeholder-[#444]
                            focus:outline-none focus:border-[#333] focus:bg-[#141414]
                            transition-all duration-300
                            rounded-none
                        "
                        style={{ borderRadius: '0' }}
                    />

                    {/* Minimal Search Icon */}
                    <svg
                        className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-white' : 'text-[#333]'}`}
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
                {showResults && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-[#222] shadow-2xl z-50 animate-enter">
                        {results.map((movie) => (
                            <button
                                key={movie.id}
                                onClick={() => handleMovieClick(movie)}
                                className="w-full flex items-center gap-6 p-4 hover:bg-[#151515] transition-colors border-b border-[#1a1a1a] last:border-none group text-left"
                            >
                                <img
                                    src={getImageUrl(movie.poster_path, 'w92')}
                                    alt={movie.title}
                                    className="w-10 h-14 object-cover transition-all duration-300 shadow-sm"
                                />
                                <div className="flex-1">
                                    <h3 className="text-gray-200 font-medium text-base tracking-wide group-hover:text-white transition-colors">
                                        {movie.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[#444] text-xs font-mono">
                                            {movie.release_date ? movie.release_date.split('-')[0] : 'Unknown'}
                                        </span>
                                        {movie.vote_average > 0 && (
                                            <span className="text-[#444] text-xs font-mono flex items-center gap-1">
                                                ★ {movie.vote_average.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Empty State Dropdown */}
                {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-[#222] p-6 text-center animate-enter">
                        <p className="text-[#444] text-sm font-light tracking-wide">No films found.</p>
                    </div>
                )}
            </div>
        </header>
    );
}
