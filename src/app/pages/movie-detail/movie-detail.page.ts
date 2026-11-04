import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Observable, forkJoin, map, switchMap } from 'rxjs';

import { ApiService, errorMessage } from '../../core/api.service';
import { statusLabel } from '../../core/labels';
import { LibraryEntry, LibraryItem, LibraryStatus, MovieDetails } from '../../core/models';

@Component({
  selector: 'app-movie-detail-page',
  imports: [DatePipe],
  template: `
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    } @else if (movie(); as m) {
      <section class="hero">
        @if (m.backdropUrl || m.posterUrl) {
          <div class="hero-bg" [style.background-image]="'url(' + (m.backdropUrl || m.posterUrl) + ')'"></div>
        }
        <div class="hero-inner">
          <div class="hero-poster">
            <div class="poster">
              @if (m.posterUrl) {
                <img [src]="m.posterUrl" [alt]="m.title" />
              } @else {
                <div class="poster-fallback">{{ m.title }}</div>
              }
            </div>
          </div>
          <div class="hero-info">
            <h1>{{ m.title }}</h1>
            @if (m.originalTitle && m.originalTitle !== m.title) {
              <p class="muted">{{ m.originalTitle }}</p>
            }
            <div class="meta">
              @if (m.releaseDate) {
                <span>{{ m.releaseDate | date: 'd MMMM y' }}</span>
              }
              @if (m.runtime) {
                <span>· {{ duration(m.runtime) }}</span>
              }
              @if (m.rating) {
                <span class="badge badge-accent">★ {{ m.rating }}</span>
              }
            </div>
            @if (m.genres.length) {
              <div class="chips">
                @for (g of m.genres; track g) {
                  <span class="badge">{{ g }}</span>
                }
              </div>
            }
            @if (m.tagline) {
              <p class="muted"><em>{{ m.tagline }}</em></p>
            }
            @if (m.overview) {
              <p class="overview">{{ m.overview }}</p>
            }

            <div class="row">
              @if (item(); as it) {
                <span class="badge badge-accent">{{ label(it) }}</span>
                @if (it.status === 'WATCHED') {
                  @if (it.watchedAt) {
                    <span class="muted small">le {{ it.watchedAt | date: 'd MMM y' }}</span>
                  }
                  <button class="btn btn-sm" type="button" [disabled]="busy()" (click)="setStatus('WATCHLIST')">
                    Remettre à regarder
                  </button>
                } @else {
                  <button class="btn btn-success" type="button" [disabled]="busy()" (click)="setStatus('WATCHED')">
                    ✓ Marquer comme vu
                  </button>
                }
                <button class="btn btn-ghost btn-danger btn-sm" type="button" [disabled]="busy()" (click)="remove()">
                  Retirer
                </button>
              } @else {
                <button class="btn btn-primary" type="button" [disabled]="busy()" (click)="add('WATCHLIST')">
                  + À regarder
                </button>
                <button class="btn btn-success" type="button" [disabled]="busy()" (click)="add('WATCHED')">
                  ✓ Déjà vu
                </button>
              }
            </div>
            @if (actionError()) {
              <div class="alert alert-error">{{ actionError() }}</div>
            }
          </div>
        </div>
      </section>
    } @else {
      <div class="loader"><div class="spinner"></div></div>
    }
  `,
})
export class MovieDetailPage {
  private readonly api = inject(ApiService);

  readonly id = input.required<string>();

  protected readonly movie = signal<MovieDetails | null>(null);
  protected readonly entry = signal<LibraryEntry>({ item: null, watchedEpisodeIds: [] });
  protected readonly item = computed(() => this.entry().item);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected label(item: LibraryItem): string {
    return statusLabel(item.status, 'MOVIE');
  }

  protected duration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
  }

  protected add(status: LibraryStatus): void {
    this.run(this.api.add('MOVIE', this.id(), status).pipe(switchMap(() => this.api.entry('MOVIE', this.id()))));
  }

  protected setStatus(status: LibraryStatus): void {
    const item = this.item();
    if (!item) return;
    this.run(this.api.updateStatus(item.id, status).pipe(map((updated) => ({ item: updated, watchedEpisodeIds: [] }))));
  }

  protected remove(): void {
    const item = this.item();
    if (!item) return;
    this.run(this.api.remove(item.id).pipe(map((): LibraryEntry => ({ item: null, watchedEpisodeIds: [] }))));
  }

  private run(action: Observable<LibraryEntry>): void {
    this.busy.set(true);
    this.actionError.set(null);
    action.subscribe({
      next: (entry) => {
        this.entry.set(entry);
        this.busy.set(false);
      },
      error: (err) => {
        this.busy.set(false);
        this.actionError.set(errorMessage(err));
      },
    });
  }

  private load(id: string): void {
    this.movie.set(null);
    this.error.set(null);
    forkJoin({ movie: this.api.movie(id), entry: this.api.entry('MOVIE', id) }).subscribe({
      next: ({ movie, entry }) => {
        this.movie.set(movie);
        this.entry.set(entry);
      },
      error: (err) => this.error.set(errorMessage(err, 'Film introuvable.')),
    });
  }
}
