export interface TMDBMovieGenre {
    id: number;
    name: string;
  }
  
  export interface TMDBMovieSummary {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    release_date: string;
    vote_average: number;
    genre_ids: number[];
  }
  
  export interface TMDBMovieDetails {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    release_date: string;
    vote_average: number;
    runtime: number | null;
    genres: TMDBMovieGenre[];
  }
  
  export interface TMDBResponse {
    page: number;
    results: TMDBMovieSummary[];
    total_pages: number;
    total_results: number;
  }
  
  export interface TMDBClientConfig {
    apiKey?: string;
    baseUrl?: string;
    useFallbackOnError?: boolean;
  }