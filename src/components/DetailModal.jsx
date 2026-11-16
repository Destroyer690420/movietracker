import { useEffect, useRef, useState } from 'react';
import { detectRegion, getDetails, getImageUrl } from '../services/tmdb';

/**
 * Full detail view for a title in the collection.
 * Shows metadata from TMDB, where it can be streamed, the cast, and lets you
 * change the rating, pin it as a favourite or remove it.
 */
export default function DetailModal({ movie, onClose, onUpdate, onRemove, onToggleFavorite }) {
    const [details, setDetails] = useState(null);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [draftRating, setDraftRating] = useState(movie.rating || 0);
    const [hoveredRating, setHoveredRating] = useState(0);

    // Keep the latest callback without making it an effect dependency.
    const onUpdateRef = useRef(onUpdate);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    });

    // Keep the latest movie around so the effect below can read it without
    // re-running whenever a snapshot replaces the object.
    const movieRef = useRef(movie);
    useEffect(() => {
        movieRef.current = movie;
    });

    useEffect(() => {
        setDraftRating(movie.rating || 0);
    }, [movie.rating]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        async function load() {
            const region = detectRegion();

            try {
                const detailResults = await getDetails(movie.mediaType, movie.id, region);

                if (cancelled) {
                    return;
                }

                setDetails(detailResults);
                setProviders(detailResults?.providers || []);

                // Cache the enrichment on the document so stats and search work
                // later without another round trip.
                if (detailResults && !movieRef.current.enrichedAt) {
                    onUpdateRef.current?.(movieRef.current.key, {
                        runtime: detailResults.runtime ?? null,
                        genres: detailResults.genres ?? [],
                        director: detailResults.director ?? null,
                        overview: detailResults.overview ?? null,
                        tagline: detailResults.tagline ?? null,
                        providers: (detailResults.providers || []).map(provider => provider.name),
                        topCast: detailResults.topCast ?? [],
                        voteAverage: detailResults.voteAverage ?? null,
                        backdropPath: detailResults.backdropPath ?? null,
                        releaseDate: detailResults.releaseDate ?? null,
                        enrichedAt: Date.now(),
                    });
                }
            } catch (loadError) {
                console.error('Error loading details:', loadError);
                if (!cancelled) {
                    setError(loadError);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [movie.mediaType, movie.id, movie.key]);

    const displayRating = hoveredRating || draftRating;
    const ratingChanged = draftRating !== (movie.rating || 0);

    const handleSaveRating = async () => {
        await onUpdate?.(movie.key, { rating: draftRating });
    };

    const facts = [
        details?.runtime ? { label: 'Runtime', value: `${details.runtime} min` } : null,
        details?.status ? { label: 'Status', value: details.status } : null,
        details?.numberOfSeasons
            ? { label: 'Seasons', value: `${details.numberOfSeasons}` }
            : null,
        details?.director ? { label: 'Director', value: details.director } : null,
    ].filter(Boolean);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#0a0a0a] border border-[#222] shadow-2xl animate-zoom"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Backdrop */}
                <div className="relative h-40 sm:h-56 overflow-hidden">
                    {details?.backdropPath ? (
                        <img
                            src={getImageUrl(details.backdropPath, 'w780')}
                            alt=""
                            className="w-full h-full object-cover opacity-60"
                        />
                    ) : (
                        <div className="w-full h-full bg-[#111]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/70 backdrop-blur-md text-white/70 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 sm:px-8 pb-8 -mt-20 sm:-mt-28 relative">
                    {/* Poster + headline */}
                    <div className="flex gap-6">
                        <div className="relative w-28 sm:w-40 shrink-0 aspect-[2/3] shadow-2xl">
                            <img
                                src={getImageUrl(movie.posterPath, 'w342')}
                                alt={movie.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 ring-1 ring-white/10" />
                        </div>

                        <div className="flex-1 pt-20 sm:pt-24 min-w-0">
                            <h2 className="text-xl sm:text-2xl font-light text-white tracking-wide mb-2">
                                {details?.title || movie.title}
                            </h2>

                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                <span className="text-[#444] font-mono">
                                    {movie.year || 'Unknown'}
                                </span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${movie.mediaType === 'tv' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {movie.mediaType === 'tv' ? 'TV' : 'Movie'}
                                </span>
                                {details?.voteAverage > 0 && (
                                    <span className="text-[#444] font-mono flex items-center gap-1">
                                        ★ {details.voteAverage.toFixed(1)}
                                        <span className="text-[#333] normal-case">on TMDB</span>
                                    </span>
                                )}
                            </div>

                            {details?.genres?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {details.genres.map(genre => (
                                        <span key={genre} className="text-[10px] text-[#666] border border-[#1e1e1e] px-2 py-0.5">
                                            {genre}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Your rating */}
                    <div className="mt-8 pt-6 border-t border-[#161616]">
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="text-[10px] uppercase tracking-widest text-[#555]">Your rating</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onMouseEnter={() => setHoveredRating(star)}
                                        onMouseLeave={() => setHoveredRating(0)}
                                        onClick={() => setDraftRating(star)}
                                        className="p-0.5 transition-transform duration-150 hover:scale-110 focus:outline-none"
                                        aria-label={`${star} star${star === 1 ? '' : 's'}`}
                                    >
                                        <span className={`text-xl transition-colors duration-150 ${displayRating >= star ? 'text-white' : 'text-[#222]'}`}>
                                            ★
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-[#555] font-mono">
                                {draftRating > 0 ? `${draftRating}/5` : 'unrated'}
                            </span>
                            {ratingChanged && (
                                <button
                                    onClick={handleSaveRating}
                                    className="px-4 py-1.5 bg-white hover:bg-gray-200 text-black text-[10px] font-bold uppercase tracking-widest transition-colors"
                                >
                                    Save
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Overview */}
                    {loading && (
                        <div className="mt-8 flex items-center gap-3">
                            <div className="w-4 h-4 border border-t-transparent border-white/30 rounded-full animate-spin" />
                            <span className="text-xs text-[#444] font-light">Loading details...</span>
                        </div>
                    )}

                    {error && !loading && (
                        <p className="mt-8 text-xs text-red-400/80 font-light">
                            Could not load details from TMDB.
                        </p>
                    )}

                    {!loading && details?.overview && (
                        <p className="mt-8 text-sm text-[#888] font-light leading-relaxed">
                            {details.tagline && (
                                <span className="block text-[#555] italic mb-3">{details.tagline}</span>
                            )}
                            {details.overview}
                        </p>
                    )}

                    {/* Facts */}
                    {facts.length > 0 && (
                        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#161616] border border-[#161616]">
                            {facts.map(fact => (
                                <div key={fact.label} className="bg-[#0a0a0a] p-4">
                                    <p className="text-[9px] uppercase tracking-widest text-[#444] mb-1.5">{fact.label}</p>
                                    <p className="text-xs text-[#888] font-light truncate">{fact.value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Where to watch */}
                    {providers.length > 0 && (
                        <div className="mt-8">
                            <p className="text-[10px] uppercase tracking-widest text-[#444] mb-4">Where to watch</p>
                            <div className="flex flex-wrap gap-2">
                                {providers.map(provider => (
                                    <div
                                        key={`${provider.id}-${provider.type}`}
                                        className="flex items-center gap-2.5 border border-[#1c1c1c] px-3 py-2"
                                    >
                                        {provider.logoPath ? (
                                            <img
                                                src={getImageUrl(provider.logoPath, 'w92')}
                                                alt=""
                                                className="w-6 h-6 rounded object-cover"
                                            />
                                        ) : (
                                            <div className="w-6 h-6 rounded bg-[#151515]" />
                                        )}
                                        <div>
                                            <p className="text-xs text-[#999] font-light leading-tight">{provider.name}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-[#3a3a3a]">
                                                {provider.label || provider.type}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cast */}
                    {details?.topCast?.length > 0 && (
                        <div className="mt-8">
                            <p className="text-[10px] uppercase tracking-widest text-[#444] mb-4">Cast</p>
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {details.topCast.map(person => (
                                    <div key={person.name} className="w-16 shrink-0 text-center">
                                        {person.profilePath ? (
                                            <img
                                                src={getImageUrl(person.profilePath, 'w185')}
                                                alt={person.name}
                                                className="w-16 h-16 object-cover rounded-full"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-[#151515]" />
                                        )}
                                        <p className="mt-2 text-[10px] text-[#777] font-light leading-tight truncate">{person.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-10 pt-6 border-t border-[#161616] flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => onToggleFavorite?.(movie)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-light tracking-wide transition-all border ${
                                movie.isFavorite
                                    ? 'bg-white text-black border-white'
                                    : 'bg-transparent text-[#777] hover:text-white border-[#222] hover:border-[#444]'
                            }`}
                        >
                            <svg className="w-4 h-4" fill={movie.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.5l2.31 4.68 5.17.75-3.74 3.64.88 5.15-4.62-2.43-4.62 2.43.88-5.15L3.99 8.93l5.17-.75L11.48 3.5z" />
                            </svg>
                            {movie.isFavorite ? 'Pinned' : 'Pin as favourite'}
                        </button>

                        <a
                            href={`https://www.themoviedb.org/${movie.mediaType}/${movie.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2.5 text-xs font-light tracking-wide text-[#666] hover:text-white border border-[#222] hover:border-[#444] transition-colors"
                        >
                            Open on TMDB
                        </a>

                        <button
                            onClick={() => onRemove?.(movie.key)}
                            className="ml-auto px-4 py-2.5 text-xs font-light tracking-wide text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
