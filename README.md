# Movie Curator

Movie collection curator built against the TMDB API.

## Stack
- **Backend:** Node.js, Express, TypeScript, SQLite
- **Frontend:** React, TypeScript, Vite, CSS

## Running it

Requires a free [TMDB API key](https://www.themoviedb.org/settings/api) (v3).

```bash
# server
cd server
npm install
cp .env.example .env   
npm run dev            

# client (separate terminal)
cd client
npm install
npm run dev             
```

## Decision log

- **SQLite vs. Postgres.** Picked SQLite for zero-setup, file system persistence that survives a restart with no process to install. This avoided any infra setup. However this doesnt support concurrent writes so not at all scalable and one of the first things to change later.
- **De-Normalized Data Model for correctness and fast development.** Saved the movie metadata from TMDB (title, runtime, poster) in the movies table. Have a unique key on tmdb_id and collection_id to prevent duplications. This is correct and quick to develop however wastes a lot of storage. A normalized way to maintaining some movie data from tmdb should be explored.
- **Re-fetch movie details server-side vs. trust the client fetched data.** When adding a film, the backend calls TMDB's /movie/:id endpoint directly instead of using data sent from the browser. This prevents fake client data from messing up collection stats and guarantees complete details like runtimes and genre names. However, this adds an extra network round-trip on every movie save, making the add action slightly slower.
- **User Identification via HTTP header.** Used the x-user-id header in the request to authenticate users (header mapped to user_id). Didnt implement password or token based auth for faster development. However this can be spoofed.
- **Derived stats computed on every request vs. stored and maintained.** While fetching a collection, we recompute runtime, genre breakdown, average rating, and release span from scratch on every fetch rather than pre-computing and caching them. Statistics which dont need strong consistency are prime caching candidates, and doing so would greatly improve performance of the query.

## What I'd do with more time

**Weak spots:**
- Zero error feedback on write failures: if adding, updating, or deleting a film fails, the UI fails silently without telling the user.
- UI needs to be more intuitive and better designed overall.
- All stats computed by backend arent being shown on UI.

**Next:**
- Add real auth (sessions or JWTs) to replace the trust-based `x-user-id` header.
- Add pre-computation and caching for usecases such as derived stats

## What breaks first at 100x

- **SQLite write throughput issues:** SQLite runs synchronously on a single file lock. 50k users concurrently saving movies will serialize writes and block the Node event loop. Moving to a pooled PostgreSQL instance is the first operational fix.
- **TMDB rate limits:** Adding a film triggers a fresh fetch against TMDB with zero caching. Multiple users adding popular movies will cause a large number of requests against TMDB. Since this data doesnt change, some popular movies/trending movies need to be cached by us.
- **On-the-fly computation of stats:** Calculating runtimes and genre stats on every collection fetch works fine for a tiny number, but wont scale.

## Notes

- **Time spent:** ~4.5 hours in total.
- **AI tools:** Used Gemini to draft some API route helpers and to quickly scaffold the React UI when running short on time.