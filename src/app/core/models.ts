// Modèles alignés sur les DTO du backend show-marker-back.

export type MediaType = 'SHOW' | 'MOVIE';
export type LibraryStatus = 'WATCHLIST' | 'WATCHING' | 'COMPLETED' | 'DROPPED' | 'WATCHED';

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  expiresAt: string;
}

export interface MediaSummary {
  provider: string;
  externalId: string;
  type: MediaType;
  title: string;
  overview: string | null;
  posterUrl: string | null;
  year: number | null;
  genres: string[];
  rating: number | null;
}

export interface Episode {
  externalId: string;
  season: number;
  number: number;
  title: string | null;
  airDate: string | null;
  runtime: number | null;
  overview: string | null;
  imageUrl: string | null;
  aired: boolean;
}

export interface Season {
  number: number;
  episodeCount: number;
  premiereDate: string | null;
  episodes: Episode[];
}

export interface ShowDetails {
  provider: string;
  externalId: string;
  title: string;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  year: number | null;
  genres: string[];
  rating: number | null;
  status: string | null;
  ended: boolean;
  network: string | null;
  seasons: Season[];
}

export interface MovieDetails {
  provider: string;
  externalId: string;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  tagline: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  year: number | null;
  runtime: number | null;
  genres: string[];
  rating: number | null;
}

export interface CatalogStatus {
  showProvider: string;
  movieProvider: string;
  moviesEnabled: boolean;
}

export interface Progress {
  watched: number;
  total: number | null;
  percent: number;
  nextEpisode: Episode | null;
}

export interface LibraryItem {
  id: number;
  type: MediaType;
  provider: string;
  externalId: string;
  title: string;
  posterUrl: string | null;
  year: number | null;
  status: LibraryStatus;
  addedAt: string;
  updatedAt: string;
  watchedAt: string | null;
  progress: Progress | null;
}

export interface LibraryEntry {
  item: LibraryItem | null;
  watchedEpisodeIds: string[];
}

export interface RecentEpisode {
  libraryItemId: number;
  showExternalId: string;
  showTitle: string;
  posterUrl: string | null;
  episodeExternalId: string;
  season: number;
  number: number;
  episodeTitle: string | null;
  watchedAt: string;
}

export interface Activity {
  id: number;
  type: 'ADDED' | 'REMOVED' | 'STATUS_CHANGED' | 'EPISODE_WATCHED' | 'EPISODES_WATCHED' | 'MOVIE_WATCHED';
  mediaType: MediaType;
  libraryItemId: number | null;
  title: string;
  detail: string | null;
  createdAt: string;
}

export interface DashboardStats {
  showsCount: number;
  watchingCount: number;
  completedShows: number;
  moviesCount: number;
  moviesWatched: number;
  episodesWatched: number;
  globalProgress: number;
}

export interface Dashboard {
  watching: LibraryItem[];
  upNext: { show: LibraryItem; episode: Episode }[];
  recentEpisodes: RecentEpisode[];
  movieWatchlist: LibraryItem[];
  recentMovies: LibraryItem[];
  recentActivity: Activity[];
  stats: DashboardStats;
}

/** Erreur au format ProblemDetail (RFC 9457) renvoyée par le backend. */
export interface ProblemDetail {
  status: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string>;
}

/** État renvoyé par GET /api/health. Si la réponse arrive, le web service est en ligne ; `database` dit si la base répond. */
export interface HealthReport {
  status: 'UP' | 'DOWN';
  database: { status: 'UP' | 'DOWN' };
  checkedAt: string;
}
