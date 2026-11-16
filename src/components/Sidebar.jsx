import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth';
import { MEDIA_FILTERS, RATING_FILTERS, SORT_OPTIONS } from '../lib/movies';
import DataActions from './DataActions';

/**
 * The sidebar holds everything that is not the search bar: the profile and
 * sign out button, the collection filters and sorting, and the export tools.
 *
 * On mobile it is a drawer that slides in from the left. On larger screens it
 * is a permanent panel.
 */
export default function Sidebar({
    open,
    closing,
    onClose,
    filters,
    onFiltersChange,
    sort,
    onSortChange,
    summary,
    total,
    movies,
    onNotice,
}) {
    const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
    const [signingIn, setSigningIn] = useState(false);

    // Close the drawer when the viewport grows past the mobile breakpoint.
    useEffect(() => {
        const media = window.matchMedia('(min-width: 1024px)');
        const handleChange = (event) => {
            if (event.matches) {
                onClose();
            }
        };
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, [onClose]);

    const handleSignIn = async () => {
        setSigningIn(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Sign in failed:', error);
        } finally {
            setSigningIn(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    const hasFilters =
        filters.search.trim() !== '' || filters.media !== 'all' || filters.rating !== 'all';

    const handleReset = () => {
        onFiltersChange({ search: '', media: 'all', rating: 'all' });
    };

    const selectClass = `
        w-full appearance-none bg-[#0f0f0f] border border-[#222] text-[#999] text-xs
        font-light tracking-wide px-3 py-2.5 cursor-pointer
        hover:border-[#333] hover:text-white transition-colors
        focus:outline-none focus:border-[#444]
    `;

    return (
        <>
            {/* Backdrop for the mobile drawer */}
            {open && !closing && (
                <div
                    className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-enter"
                    onClick={onClose}
                />
            )}

            <aside
                className={`
                    sidebar-panel fixed top-0 left-0 h-full w-[288px] max-w-[85vw] z-50
                    bg-[#080808] border-r border-[#1a1a1a]
                    flex flex-col overflow-y-auto
                    ${open ? 'is-open' : 'no-transition'}
                    ${closing ? 'is-closing' : ''}
                `}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 pt-7 pb-5 border-b border-[#161616] shrink-0">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#555]">Watchlist</span>
                    <button
                        onClick={onClose}
                        className="lg:hidden text-[#444] hover:text-white transition-colors"
                        aria-label="Close menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 px-6 py-6">
                    {/* Profile */}
                    <section>
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#3d3d3d] mb-4">Profile</p>

                        {authLoading ? (
                            <div className="w-6 h-6 border border-t-transparent border-white/20 rounded-full animate-spin" />
                        ) : user ? (
                            <div>
                                <div className="flex items-center gap-3">
                                    {user.photoURL && (
                                        <img
                                            src={user.photoURL}
                                            alt={user.displayName}
                                            className="w-9 h-9 rounded-full border border-[#2a2a2a]"
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm text-[#ddd] font-light truncate">
                                            {user.displayName || 'Signed in'}
                                        </p>
                                        {user.email && (
                                            <p className="text-[11px] text-[#555] truncate">{user.email}</p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSignOut}
                                    className="mt-4 w-full px-4 py-2.5 text-xs font-light tracking-wide text-[#666] hover:text-white border border-[#222] hover:border-[#444] transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleSignIn}
                                disabled={signingIn}
                                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-100 text-black text-xs font-medium tracking-wide transition-all disabled:opacity-60"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                                {signingIn ? 'Signing in...' : 'Sign in with Google'}
                            </button>
                        )}
                    </section>

                    {/* Filters */}
                    {total > 0 && (
                        <section className="mt-9">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-[#3d3d3d] mb-4">Collection</p>

                            {/* Search within the collection */}
                            <div className="relative mb-3">
                                <svg
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2f2f2f] pointer-events-none"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                                    placeholder="Filter your collection..."
                                    className="
                                        w-full pl-9 pr-3 py-2.5
                                        bg-[#0f0f0f] border border-[#222]
                                        text-white text-xs font-light tracking-wide
                                        placeholder-[#3a3a3a]
                                        focus:outline-none focus:border-[#333]
                                        transition-colors duration-200
                                    "
                                />
                            </div>

                            {/* Media type */}
                            <div className="flex mb-3">
                                {MEDIA_FILTERS.map(option => {
                                    const active = filters.media === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => onFiltersChange({ ...filters, media: option.id })}
                                            className={`flex-1 px-2 py-2 text-[11px] font-light tracking-wide transition-colors border border-r-0 last:border-r ${
                                                active
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-transparent text-[#666] hover:text-white border-[#1e1e1e] hover:border-[#333]'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Rating */}
                            <select
                                value={filters.rating}
                                onChange={(e) => onFiltersChange({ ...filters, rating: e.target.value })}
                                className={selectClass}
                                aria-label="Filter by rating"
                            >
                                {RATING_FILTERS.map(option => (
                                    <option key={option.id} value={option.id}>{option.label}</option>
                                ))}
                            </select>

                            {/* Sort */}
                            <select
                                value={sort}
                                onChange={(e) => onSortChange(e.target.value)}
                                className={`${selectClass} mt-3`}
                                aria-label="Sort the collection"
                            >
                                {SORT_OPTIONS.map(option => (
                                    <option key={option.id} value={option.id}>{option.label}</option>
                                ))}
                            </select>

                            {hasFilters && (
                                <button
                                    onClick={handleReset}
                                    className="mt-3 text-[11px] font-light tracking-wide text-[#555] hover:text-white transition-colors"
                                >
                                    Clear filters
                                </button>
                            )}

                            {summary && (
                                <p className="mt-5 text-[11px] text-[#3f3f3f] font-mono tracking-wide">
                                    {total} title{total === 1 ? '' : 's'}
                                    {summary ? ` · ${summary}` : ''}
                                </p>
                            )}
                        </section>
                    )}

                    {/* Data */}
                    <section className="mt-9">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#3d3d3d] mb-4">Data</p>
                        <DataActions movies={movies} user={user} onNotice={onNotice} />
                    </section>
                </div>
            </aside>
        </>
    );
}
