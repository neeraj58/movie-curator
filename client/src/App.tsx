import { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [userId, setUserId] = useState(1);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);

  const [newCollectionName, setNewCollectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState('');

  const authFetch = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(userId),
        ...options.headers,
      },
    });
  };

  const loadCollections = async () => {
    try {
      const res = await authFetch('/api/collections');
      const data = await res.json();
      setCollections(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
      } else {
        setSelectedId(null);
        setSelectedCollection(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadCollections();
  }, [userId]);

  const loadCollectionDetails = async (id: number) => {
    try {
      const res = await authFetch(`/api/collections/${id}`);
      const data = await res.json();
      setSelectedCollection(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadCollectionDetails(selectedId);
    }
  }, [selectedId]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    await authFetch('/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name: newCollectionName }),
    });

    setNewCollectionName('');
    loadCollections();
  };

  const handleDeleteCollection = async (id: number) => {
    await authFetch(`/api/collections/${id}`, { method: 'DELETE' });
    loadCollections();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setError('');

    const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data.results ? data.results.slice(0, 5) : []);
  };

  const handleAddMovie = async (movie: any) => {
    if (!selectedId) return;
    setError('');

    const res = await authFetch(`/api/collections/${selectedId}/movies`, {
      method: 'POST',
      body: JSON.stringify({
        tmdb_id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
      }),
    });

    if (res.status === 409) {
      setError('This movie is already in the collection.');
      return;
    }

    loadCollectionDetails(selectedId);
  };

  const handleUpdateMovie = async (movieId: number, patchData: any) => {
    await authFetch(`/api/movies/${movieId}`, {
      method: 'PATCH',
      body: JSON.stringify(patchData),
    });
    if (selectedId) loadCollectionDetails(selectedId);
  };

  const handleDeleteMovie = async (movieId: number) => {
    await authFetch(`/api/movies/${movieId}`, { method: 'DELETE' });
    if (selectedId) loadCollectionDetails(selectedId);
  };

  return (
    <div>
      <header>
        <h2>🎬 Movie Collection App</h2>
        <div>
          <label style={{ marginRight: '8px' }}>Current User:</label>
          <select value={userId} onChange={(e) => setUserId(Number(e.target.value))}>
            <option value={1}>Admin (ID: 1)</option>
            <option value={2}>User 1 (ID: 2)</option>
            <option value={3}>User 2 (ID: 3)</option>
          </select>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <h3>Collections</h3>

          <form onSubmit={handleCreateCollection} style={{ display: 'flex', gap: '4px' }}>
            <input
              placeholder="New list name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              style={{ width: '100%' }}
            />
            <button type="submit">+</button>
          </form>

          <div style={{ marginTop: '16px' }}>
            {collections.map((col) => (
              <div
                key={col.id}
                className={`list-item ${col.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(col.id)}
              >
                <span>{col.name}</span>
                <button
                  className="danger"
                  style={{ padding: '2px 6px', fontSize: '11px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCollection(col.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        <main className="main-content">
          {error && <div style={{ color: '#ef4444', marginBottom: '12px' }}>⚠️ {error}</div>}

          <div className="card">
            <h3>Search TMDB to Add Movies</h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
              <input
                placeholder="Search by title (e.g. Matrix)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit">Search</button>
            </form>

            {searchResults.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', overflowX: 'auto' }}>
                {searchResults.map((m) => (
                  <div key={m.id} style={{ width: '130px', fontSize: '13px' }}>
                    {m.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w200${m.poster_path}`}
                        alt={m.title}
                        style={{ width: '100%', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ height: '180px', background: '#374151' }}>No Poster</div>
                    )}
                    <div style={{ fontWeight: 'bold', margin: '4px 0' }}>{m.title}</div>
                    <button
                      disabled={!selectedId}
                      onClick={() => handleAddMovie(m)}
                      style={{ width: '100%', fontSize: '12px' }}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCollection ? (
            <div className="card">
              <h2>{selectedCollection.name}</h2>

              {selectedCollection.stats && (
                <div className="stats-grid">
                  <div>Total Movies: <b>{selectedCollection.stats.total_movies}</b></div>
                  <div>Watched: <b>{selectedCollection.stats.watched_count}</b></div>
                  <div>
                    Runtime: <b>
                      {Math.floor(selectedCollection.stats.total_runtime_minutes / 60)}h{' '}
                      {selectedCollection.stats.total_runtime_minutes % 60}m
                    </b>
                  </div>
                  <div>Avg Rating: <b>{selectedCollection.stats.avg_user_rating ?? 'N/A'}</b></div>
                </div>
              )}

              <div style={{ marginTop: '20px' }}>
                {selectedCollection.movies.length === 0 && (
                  <p style={{ color: '#9ca3af' }}>No movies in this collection yet. Search above to add one.</p>
                )}

                {selectedCollection.movies.map((movie: any) => (
                  <div key={movie.id} className="movie-row">
                    {movie.poster_path && (
                      <img src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} alt={movie.title} />
                    )}

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <b>{movie.title} ({movie.release_date?.slice(0, 4) || 'N/A'})</b>
                        <button
                          className="danger"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                          onClick={() => handleDeleteMovie(movie.id)}
                        >
                          Remove
                        </button>
                      </div>

                      <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                        Runtime: {movie.runtime}m | Genres: {movie.genres.join(', ') || 'N/A'}
                      </div>

                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <label style={{ fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={movie.watched}
                            onChange={(e) => handleUpdateMovie(movie.id, { watched: e.target.checked })}
                          />{' '}
                          Watched
                        </label>

                        <label style={{ fontSize: '13px' }}>
                          Rating:{' '}
                          <select
                            value={movie.user_rating || ''}
                            onChange={(e) =>
                              handleUpdateMovie(movie.id, {
                                user_rating: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          >
                            <option value="">None</option>
                            <option value="1">⭐ 1</option>
                            <option value="2">⭐⭐ 2</option>
                            <option value="3">⭐⭐⭐ 3</option>
                            <option value="4">⭐⭐⭐⭐ 4</option>
                            <option value="5">⭐⭐⭐⭐⭐ 5</option>
                          </select>
                        </label>
                      </div>

                      <input
                        placeholder="Add private note..."
                        defaultValue={movie.user_notes || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (movie.user_notes || '')) {
                            handleUpdateMovie(movie.id, { user_notes: e.target.value });
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: '#9ca3af' }}>Select or create a collection on the left.</p>
          )}
        </main>
      </div>
    </div>
  );
}