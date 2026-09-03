# Movie Curator — Design & Architecture Plan

Details for Requirements, API Design, Data Model, Low-level Design for overall project

---

## 1. Requirements

### Deliverables
* **TMDB Wrapper Library/SDK:** An internal module that wraps the parts of the TMDB API needed (don't use existing TMDB client libraries). Must return matching movies given a search term, and movie details given an ID. Needs to be extensible to cover more parts of the external API later.
* **Backend API & Data Store:** An API backed by a real, durable persistent data store (survives server restarts, not in-memory). All search queries must route through this API only.
* **Single-Page App:** An app that consumes the API and allows navigating between views without a page refresh or using the browser back button (URL does not need to change). Assume this app will grow to support more features.
* **Readme:** Documentation covering: Decision Log, What you'd do with more time, What breaks first at 100x, and Notes.

### Functional Requirements
* **Collections:** Create, list, view, and delete named collections (playlists/lists of movies).
* **Collection Management:** Search for movies from TMDB and add or remove them from an open collection.
* **Custom Annotations:** Attach user-owned annotations to a movie within a collection (free-text note, zero or more tags, 1 to 5 rating). The same movie in two different collections can carry different annotations.
* **Derived Stats:** Return and display derived summary stats for a collection (e.g., total runtime, genre breakdown, average rating, release-year span).
* **Data Boundary:** Movie data belongs to TMDB, not your application. Decide what movie data to copy locally vs. fetch on demand.
* **Users:** Assume multiple users.

### Project Constraints
* Local execution only (no Docker, no CI, no cloud setup).

---

## 2. API Design

`GET /api/users` : `User[]`
List users for the active-user switcher.

`GET /api/tmdb/search?q=` : `TMDBResponse`
Search TMDB by title; `q` required.

`GET /api/tmdb/movie/:id` : `TMDBMovieDetails`
Full details for one TMDB movie.

`GET /api/collections` : `Collection[]`
List collections owned by the active user (`x-user-id` header, defaults to 1), each with a `movie_count`.

`POST /api/collections` : `Collection` (201)
Create a collection; `name` required.

`GET /api/collections/:id` : `Collection & { stats: CollectionStats | null, movies: Movie[] }`
One collection with its movies.

`DELETE /api/collections/:id` : `204`
Delete a collection; cascades to its movies.

`POST /api/collections/:id/movies` : `Movie` (201)
Add a movie to a collection; `409` if already present.

`PATCH /api/movies/:id` : `Movie`
Update `watched`, `user_notes`, `user_rating`, or `tags`.

`DELETE /api/movies/:id` : `204`
Remove a movie from its collection.

---

## 4. Data Model

### users

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PK, autoincrement |
| username | TEXT | NOT NULL, UNIQUE |
| email | TEXT | NOT NULL, UNIQUE |

### collections

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PK, autoincrement |
| name | TEXT | NOT NULL |
| description | TEXT | nullable |
| created_by | INTEGER | NOT NULL, default 1, FK → users.id |
| created_at | DATETIME | default CURRENT_TIMESTAMP |

### movies

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PK, autoincrement |
| collection_id | INTEGER | NOT NULL, FK → collections.id (CASCADE) |
| tmdb_id | INTEGER | NOT NULL |
| title | TEXT | NOT NULL |
| poster_path | TEXT | nullable |
| release_date | TEXT | nullable |
| runtime | INTEGER | default 0 |
| vote_average | REAL | default 0 |
| genres | TEXT | JSON array, default `'[]'` |
| user_notes | TEXT | nullable |
| user_rating | INTEGER | nullable, CHECK 1–5 |
| tags | TEXT | JSON array, default `'[]'` |
| watched | INTEGER | default 0 |

`UNIQUE (collection_id, tmdb_id)`

---