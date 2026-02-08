import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useFirestore } from './hooks/useFirestore';
import Header from './components/Header';
import MovieGrid from './components/MovieGrid';
import RatingModal from './components/RatingModal';

function AppContent() {
  const [movies, addMovie, removeMovie, loading] = useFirestore();
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
      <Header onMovieSelect={handleMovieSelect} />
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
