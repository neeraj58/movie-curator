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