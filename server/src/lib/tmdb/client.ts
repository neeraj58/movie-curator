import {
    TMDBClientConfig,
    TMDBResponse,
    TMDBMovieDetails,
  } from './types.js';
  
  export class TmdbClient {
    private readonly baseUrl: string;
    private readonly apiKey?: string;
  
    constructor(config: TMDBClientConfig = {}) {
      this.baseUrl = config.baseUrl || 'https://api.themoviedb.org/3';
      this.apiKey = config.apiKey || process.env.TMDB_API_KEY;
    }
  
    private async fetchFromTmdb<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
      const url = new URL(`${this.baseUrl}${path}`);
  
      if (this.apiKey) {
        url.searchParams.set('api_key', this.apiKey);
      }
  
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
  
      const response = await fetch(url.toString());
  
      if (!response.ok) {
        throw new Error(`TMDB error: ${response.status} ${response.statusText}`);
      }
  
      return response.json() as Promise<T>;
    }
  
    public async searchMovies(query: string, page = 1): Promise<TMDBResponse> {
      return this.fetchFromTmdb<TMDBResponse>('/search/movie', {
        query,
        page,
      });
    }
  
    public async getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
      return this.fetchFromTmdb<TMDBMovieDetails>(`/movie/${movieId}`);
    }
  }