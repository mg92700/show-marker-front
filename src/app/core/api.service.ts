import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CatalogStatus,
  Dashboard,
  LibraryEntry,
  LibraryItem,
  LibraryStatus,
  MediaSummary,
  MediaType,
  MovieDetails,
  ProblemDetail,
  ShowDetails,
  ShowcaseItem,
} from './models';

/** Accès typé à l'API REST du backend (catalogue, bibliothèque, tableau de bord). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  // --- Catalogue
  catalogStatus(): Observable<CatalogStatus> {
    return this.http.get<CatalogStatus>(`${this.api}/catalog/status`);
  }

  /** Affiches de titres cultes (public, sert de fond aux pages de connexion). */
  showcase(): Observable<ShowcaseItem[]> {
    return this.http.get<ShowcaseItem[]>(`${this.api}/catalog/showcase`);
  }

  searchShows(query: string): Observable<MediaSummary[]> {
    return this.http.get<MediaSummary[]>(`${this.api}/catalog/shows`, { params: { query } });
  }

  searchMovies(query: string): Observable<MediaSummary[]> {
    return this.http.get<MediaSummary[]>(`${this.api}/catalog/movies`, { params: { query } });
  }

  show(id: string): Observable<ShowDetails> {
    return this.http.get<ShowDetails>(`${this.api}/catalog/shows/${encodeURIComponent(id)}`);
  }

  movie(id: string): Observable<MovieDetails> {
    return this.http.get<MovieDetails>(`${this.api}/catalog/movies/${encodeURIComponent(id)}`);
  }

  // --- Bibliothèque
  library(type?: MediaType, status?: LibraryStatus): Observable<LibraryItem[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (status) params = params.set('status', status);
    return this.http.get<LibraryItem[]>(`${this.api}/library`, { params });
  }

  entry(type: MediaType, externalId: string): Observable<LibraryEntry> {
    return this.http.get<LibraryEntry>(`${this.api}/library/entry`, { params: { type, externalId } });
  }

  add(type: MediaType, externalId: string, status?: LibraryStatus): Observable<LibraryItem> {
    return this.http.post<LibraryItem>(`${this.api}/library`, { type, externalId, status });
  }

  updateStatus(id: number, status: LibraryStatus): Observable<LibraryItem> {
    return this.http.patch<LibraryItem>(`${this.api}/library/${id}/status`, { status });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/library/${id}`);
  }

  setEpisodes(id: number, episodeIds: string[], watched: boolean): Observable<LibraryEntry> {
    return this.http.put<LibraryEntry>(`${this.api}/library/${id}/episodes`, { episodeIds, watched });
  }

  // --- Tableau de bord
  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.api}/dashboard`);
  }
}

/** Message lisible à partir d'une erreur HTTP du backend. */
export function errorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Serveur injoignable. Vérifiez que le backend est démarré.';
    }
    const problem = error.error as ProblemDetail | null;
    if (problem?.errors) {
      const first = Object.values(problem.errors)[0];
      if (first) return first;
    }
    if (problem?.detail) return problem.detail;
  }
  return fallback;
}
