import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import db from './db.js';
import { TmdbClient } from './lib/tmdb/index.js';

const app = express();
const tmdb = new TmdbClient();

app.use(cors());
app.use(express.json());

// Multi-user context: reads x-user-id header, defaults to 1 (admin)
app.use((req: any, _res: Response, next: NextFunction) => {
  const headerVal = Number(req.headers['x-user-id']);
  req.userId = headerVal && !isNaN(headerVal) ? headerVal : 1;
  next();
});

// Format SQLite row into clean JSON for frontend
function formatMovie(row: any) {
  return {
    ...row,
    watched: Boolean(row.watched),
    tags: JSON.parse(row.tags || '[]'),
    genres: JSON.parse(row.genres || '[]'),
  };
}

// Derived stats computed on demand
function getCollectionStats(movies: ReturnType<typeof formatMovie>[]) {
  if (!movies.length) return null;

  const rated = movies.filter((m) => m.user_rating);
  const avgRating = rated.length
    ? Number((rated.reduce((sum, m) => sum + m.user_rating, 0) / rated.length).toFixed(1))
    : null;

  const genreCounts: Record<string, number> = {};
  movies.flatMap((m) => m.genres).forEach((g) => {
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  });

  const years = movies
    .map((m) => parseInt(m.release_date?.slice(0, 4) || ''))
    .filter(Boolean)
    .sort((a, b) => a - b);

  return {
    total_movies: movies.length,
    total_runtime_minutes: movies.reduce((sum, m) => sum + (m.runtime || 0), 0),
    watched_count: movies.filter((m) => m.watched).length,
    avg_user_rating: avgRating,
    genre_breakdown: genreCounts,
    release_span: years.length ? { oldest: years[0], newest: years[years.length - 1] } : null,
  };
}

// --- Users (for UI switcher dropdown) ---

app.get('/api/users', (_req: Request, res: Response) => {
  const users = db.prepare('SELECT id, username, email FROM users ORDER BY id ASC').all();
  res.json(users);
});

// --- TMDB Routes ---

app.get('/api/tmdb/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'Search term q is required' });
    const data = await tmdb.searchMovies(q);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.get('/api/tmdb/movie/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const movieId = Number(req.params.id);
    if (!movieId) return res.status(400).json({ error: 'Valid movie ID required' });
    const data = await tmdb.getMovieDetails(movieId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// --- Collections Routes (Scoped to Active User) ---

app.get('/api/collections', (req: any, res: Response) => {
  const collections = db.prepare(`
    SELECT c.*, COUNT(m.id) as movie_count 
    FROM collections c
    LEFT JOIN movies m ON c.id = m.collection_id
    WHERE c.created_by = ?
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all(req.userId);
  res.json(collections);
});

app.post('/api/collections', (req: any, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const info = db.prepare(`
    INSERT INTO collections (name, description, created_by) 
    VALUES (?, ?, ?)
  `).run(name, description || null, req.userId);

  const created = db.prepare('SELECT * FROM collections WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.get('/api/collections/:id', (req: any, res: Response) => {
  // Collection lookup scoped to active user
  const collection = db.prepare('SELECT * FROM collections WHERE id = ? AND created_by = ?').get(req.params.id, req.userId);
  if (!collection) return res.status(404).json({ error: 'Collection not found' });

  const rawMovies = db.prepare('SELECT * FROM movies WHERE collection_id = ?').all(req.params.id);
  const movies = rawMovies.map(formatMovie);

  res.json({
    ...collection,
    stats: getCollectionStats(movies),
    movies,
  });
});

app.delete('/api/collections/:id', (req: any, res: Response) => {
  // Scoped deletion: only deletes if the collection belongs to req.userId
  const info = db.prepare('DELETE FROM collections WHERE id = ? AND created_by = ?').run(req.params.id, req.userId);
  if (!info.changes) return res.status(404).json({ error: 'Collection not found' });
  res.status(204).send();
});

// --- Movies Routes (Scoped to Collections Owned by Active User) ---

app.post('/api/collections/:id/movies', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tmdb_id, title, poster_path, release_date, user_notes, user_rating, tags } = req.body;
    const numericTmdbId = Number(tmdb_id);
    if (!numericTmdbId || !title) return res.status(400).json({ error: 'tmdb_id and title are required' });

    // Verify the target collection exists AND belongs to the active user
    const collection = db.prepare('SELECT id FROM collections WHERE id = ? AND created_by = ?').get(req.params.id, req.userId);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const details = await tmdb.getMovieDetails(numericTmdbId);
    const genres = details.genres?.map((g: { name: string }) => g.name) || [];
    const runtime = details.runtime || 0;

    const stmt = db.prepare(`
      INSERT INTO movies (
        collection_id, tmdb_id, title, poster_path, release_date,
        runtime, vote_average, genres, user_notes, user_rating, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      req.params.id,
      numericTmdbId,
      title,
      poster_path || null,
      release_date || null,
      runtime,
      details.vote_average || 0,
      JSON.stringify(genres),
      user_notes || null,
      user_rating || null,
      JSON.stringify(tags || [])
    );

    const inserted = db.prepare('SELECT * FROM movies WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(formatMovie(inserted));
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Movie already exists in this collection' });
    }
    next(err);
  }
});

app.patch('/api/movies/:id', (req: any, res: Response) => {
  // Verify target movie belongs to a collection owned by the active user
  const existing: any = db.prepare(`
    SELECT m.* 
    FROM movies m
    JOIN collections c ON m.collection_id = c.id
    WHERE m.id = ? AND c.created_by = ?
  `).get(req.params.id, req.userId);

  if (!existing) return res.status(404).json({ error: 'Movie not found' });

  const { watched, user_notes, user_rating, tags } = req.body;

  db.prepare(`
    UPDATE movies SET
      watched = COALESCE(?, watched),
      user_notes = COALESCE(?, user_notes),
      user_rating = COALESCE(?, user_rating),
      tags = COALESCE(?, tags)
    WHERE id = ?
  `).run(
    watched !== undefined ? (watched ? 1 : 0) : null,
    user_notes !== undefined ? user_notes : null,
    user_rating !== undefined ? user_rating : null,
    tags !== undefined ? JSON.stringify(tags) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  res.json(formatMovie(updated));
});

app.delete('/api/movies/:id', (req: any, res: Response) => {
  // Scoped movie deletion via collection ownership check
  const info = db.prepare(`
    DELETE FROM movies 
    WHERE id = ? 
      AND collection_id IN (SELECT id FROM collections WHERE created_by = ?)
  `).run(req.params.id, req.userId);

  if (!info.changes) return res.status(404).json({ error: 'Movie not found' });
  res.status(204).send();
});

// JSON fallback error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});