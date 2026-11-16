import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useFirestore } from './hooks/useFirestore';
import SearchBar from './components/SearchBar';
import Sidebar from './components/Sidebar';
import MovieGrid from './components/MovieGrid';
import AddModal from './components/AddModal';
import DetailModal from './components/DetailModal';
import FavoritesStrip from './components/FavoritesStrip';
import Toast from './components/Toast';
import { MAX_FAVORITES, filterMovies, makeMovieKey, sortMovies } from './lib/movies';

function AppContent() {
    const [movies, addMovie, removeMovie, updateMovie, loading, error, notice, clearNotice] = useFirestore();
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [addMode, setAddMode] = useState('new');
    const [detailMovie, setDetailMovie] = useState(null);
    const [statusFilter, setStatusFilter] = useState('watched');
    const [filters, setFilters] = useState({ search: '', rating: 'all', media: 'all' });
    const [sort, setSort] = useState('recent');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarClosing, setSidebarClosing] = useState(false);
    const sidebarTimer = useRef(null);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    // The drawer slides out before it is hidden, so the panel is never left
    // half open if the animation cannot run.
    const openSidebar = useCallback(() => {
        clearTimeout(sidebarTimer.current);
        setSidebarClosing(false);
        setSidebarOpen(true);
    }, []);

    const closeSidebar = useCallback(() => {
        clearTimeout(sidebarTimer.current);
        setSidebarClosing(true);
        sidebarTimer.current = setTimeout(() => {
            setSidebarOpen(false);
            setSidebarClosing(false);
        }, 300);
    }, []);

    useEffect(() => () => {
        clearTimeout(sidebarTimer.current);
        clearTimeout(toastTimer.current);
    }, []);

    const showToast = useCallback((message) => {
        setToast(message);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 5000);
    }, []);

    const statusCounts = useMemo(() => ({
        watched: movies.filter(movie => movie.status === 'watched').length,
        watchlist: movies.filter(movie => movie.status === 'watchlist').length,
        dropped: movies.filter(movie => movie.status === 'dropped').length,
    }), [movies]);

    const visibleMovies = useMemo(
        () => sortMovies(filterMovies(movies, { ...filters, status: statusFilter }), sort),
        [movies, filters, statusFilter, sort]
    );

    const viewMovies = useMemo(
        () => movies.filter(movie => movie.status === statusFilter),
        [movies, statusFilter]
    );

    const favorites = useMemo(
        () => movies.filter(movie => movie.status === 'watched' && movie.isFavorite).slice(0, MAX_FAVORITES),
        [movies]
    );

    const summary = useMemo(() => {
        if (viewMovies.length === 0) {
            return null;
        }
        const rated = viewMovies.filter(movie => movie.rating > 0);
        const average = rated.length
            ? (rated.reduce((total, movie) => total + movie.rating, 0) / rated.length).toFixed(1)
            : null;
        const fiveStars = viewMovies.filter(movie => movie.rating === 5).length;
        const parts = [];
        if (average) {
            parts.push(`avg ${average}★`);
        }
        if (fiveStars > 0) {
            parts.push(`${fiveStars} five-star`);
        }
        return parts.join(' · ');
    }, [viewMovies]);

    const handleMovieSelect = (movie) => {
        const key = makeMovieKey(movie.mediaType, movie.id);
        const existing = movies.find(item => item.key === key);
        if (existing) {
            showToast(existing.status === 'watchlist'
                ? 'Already in your watchlist. Open it there to mark it as watched.'
                : 'Already in your collection.');
            return;
        }
        setAddMode('new');
        setSelectedMovie(movie);
    };

    const handleAddWatched = async (movieWithRating) => {
        try {
            await addMovie({
                ...movieWithRating,
                status: 'watched',
                watchedAt: Date.now(),
            });
            setSelectedMovie(null);
            showToast(`Added "${movieWithRating.title}" to your watched collection.`);
        } catch {
            showToast('Could not add that title. Check your connection.');
        }
    };

    const handleAddWatchlist = async (movie) => {
        try {
            await addMovie({ ...movie, status: 'watchlist', rating: 0 });
            setSelectedMovie(null);
            showToast(`Added "${movie.title}" to your watchlist.`);
        } catch {
            showToast('Could not add that title. Check your connection.');
        }
    };

    const handleRemoveMovie = async (movieKey) => {
        try {
            await removeMovie(movieKey);
            setDetailMovie(null);
            showToast('Removed from your collection.');
        } catch {
            showToast('Could not remove that title.');
        }
    };

    const handleUpdate = async (movieKey, changes) => {
        try {
            await updateMovie(movieKey, changes);
        } catch {
            showToast('Could not save that change.');
        }
    };

    const handleMarkWatched = (movie) => {
        setAddMode('watched');
        setSelectedMovie(movie);
    };

    const handleConfirmWatched = async (movieWithRating) => {
        try {
            await updateMovie(movieWithRating.key, {
                status: 'watched',
                rating: movieWithRating.rating,
                watchedAt: Date.now(),
                addedAt: Date.now(),
                isFavorite: false,
            });
            setSelectedMovie(null);
            setDetailMovie(null);
            showToast(`Marked "${movieWithRating.title}" as watched.`);
        } catch {
            showToast('Could not save that change.');
        }
    };

    const handleMoveToWatchlist = async (movie) => {
        try {
            await updateMovie(movie.key, { status: 'watchlist', isFavorite: false });
            setDetailMovie(null);
            showToast(`Moved "${movie.title}" to your watchlist.`);
        } catch {
            showToast('Could not save that change.');
        }
    };

    const handleMoveToDropped = async (movie) => {
        try {
            await updateMovie(movie.key, { status: 'dropped', isFavorite: false });
            setDetailMovie(null);
            showToast(`Dropped "${movie.title}".`);
        } catch {
            showToast('Could not save that change.');
        }
    };

    const handleToggleFavorite = async (movie) => {
        const pinning = !movie.isFavorite;
        if (pinning && favorites.length >= MAX_FAVORITES) {
            showToast(`You can pin up to ${MAX_FAVORITES} films. Unpin one first.`);
            return;
        }
        await handleUpdate(movie.key, { isFavorite: pinning });
    };

    // Always show the freshest version of the title in the detail modal.
    const activeDetailMovie = detailMovie
        ? movies.find(movie => movie.key === detailMovie.key) || detailMovie
        : null;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-t-transparent border-white/30 rounded-full animate-spin" />
                    <p className="text-[#444] text-sm font-light tracking-wide">Loading your collection...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Sidebar
                open={sidebarOpen}
                closing={sidebarClosing}
                onClose={closeSidebar}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                statusCounts={statusCounts}
                filters={filters}
                onFiltersChange={setFilters}
                sort={sort}
                onSortChange={setSort}
                summary={summary}
                total={viewMovies.length}
                movies={movies}
                onNotice={showToast}
            />

            <div className="lg:pl-[288px]">
                {/* Mobile top bar */}
                <div className="lg:hidden sticky top-0 z-30 bg-[#050505]/92 backdrop-blur border-b border-[#161616] px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={openSidebar}
                        className="text-[#777] hover:text-white transition-colors p-1 -ml-1"
                        aria-label="Open menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                    </button>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#555]">Watchlist</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#2f2f2f]">/</span>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#aaa]">
                        {statusFilter === 'watched' ? 'Watched' : statusFilter === 'watchlist' ? 'To watch' : 'Dropped'}
                    </span>
                </div>

                {error && (
                    <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4">
                        <div className="max-w-7xl mx-auto flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-red-400 text-sm font-medium">
                                Sync Error: {error.code === 'permission-denied'
                                    ? 'Permission denied. Please check your Firestore Security Rules.'
                                    : 'Unable to sync with database. Please checking your connection.'}
                            </p>
                        </div>
                    </div>
                )}

                <SearchBar
                    onMovieSelect={handleMovieSelect}
                    watchedMovies={movies}
                />

                {statusFilter === 'watched' && (
                    <FavoritesStrip
                        favorites={favorites}
                        onSelect={setDetailMovie}
                    />
                )}

                <MovieGrid
                    movies={visibleMovies}
                    onRemoveMovie={handleRemoveMovie}
                    onSelectMovie={setDetailMovie}
                    onToggleFavorite={handleToggleFavorite}
                    onMarkWatched={handleMarkWatched}
                    isFiltered={viewMovies.length > 0 && visibleMovies.length === 0}
                    emptyMessage={statusFilter === 'watchlist'
                        ? 'Nothing planned yet. Search for a film and choose "Just add to my watchlist".'
                        : statusFilter === 'dropped'
                            ? 'Nothing dropped. Good.'
                            : undefined}
                />
            </div>

            {selectedMovie && (
                <AddModal
                    movie={selectedMovie}
                    mode={addMode}
                    onClose={() => setSelectedMovie(null)}
                    onAddWatched={addMode === 'watched' ? handleConfirmWatched : handleAddWatched}
                    onAddWatchlist={handleAddWatchlist}
                />
            )}

            {activeDetailMovie && (
                <DetailModal
                    movie={activeDetailMovie}
                    onClose={() => setDetailMovie(null)}
                    onUpdate={handleUpdate}
                    onRemove={handleRemoveMovie}
                    onToggleFavorite={handleToggleFavorite}
                    onMarkWatched={handleMarkWatched}
                    onMoveToWatchlist={handleMoveToWatchlist}
                    onMoveToDropped={handleMoveToDropped}
                />
            )}

            <Toast
                message={toast || notice}
                onDismiss={() => {
                    setToast(null);
                    clearNotice();
                }}
            />
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
