import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useFirestore } from './hooks/useFirestore';
import Header from './components/Header';
import MovieGrid from './components/MovieGrid';
import RatingModal from './components/RatingModal';

function AppContent() {
  const [movies, addMovie, removeMovie, loading, error] = useFirestore();
  const [selectedMovie, setSelectedMovie] = useState(null);

  const handleMovieSelect = (movie) => {
    const exists = movies.some((m) => m.id === movie.id);
    if (exists) {
      return;
    }
    setSelectedMovie(movie);
  };

  const handleAddMovie = async (movieWithRating) => {
    await addMovie(movieWithRating);
    setSelectedMovie(null);
  };

  const handleRemoveMovie = async (movieId) => {
    await removeMovie(movieId);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
  };

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
    <div className="min-h-screen flex flex-col">
      <Header onMovieSelect={handleMovieSelect} watchedMovies={movies} />

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

      <MovieGrid
        movies={movies}
        onRemoveMovie={handleRemoveMovie}
      />
      {selectedMovie && (
        <RatingModal
          movie={selectedMovie}
          onClose={handleCloseModal}
          onConfirm={handleAddMovie}
        />
      )}
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
