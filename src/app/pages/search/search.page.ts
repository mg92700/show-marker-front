import { Component, OnDestroy, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ApiService, errorMessage } from '../../core/api.service';
import { detailLink } from '../../core/labels';
import { MediaSummary, MediaType } from '../../core/models';
import { PosterCard } from '../../shared/poster-card';

@Component({
  selector: 'app-search-page',
  imports: [PosterCard],
  template: `
    <h1 class="page-title">Recherche</h1>

    <div class="search-box">
      <input
        class="input search-input"
        type="search"
        placeholder="Rechercher une série ou un film…"
        [value]="q() ?? ''"
        (input)="onInput($any($event.target).value)"
        aria-label="Rechercher"
        autofocus
      />
    </div>

    <div class="tabs" role="tablist">
      <button class="tab" role="tab" [class.active]="tab() === 'SHOW'" (click)="setTab('SHOW')">
        Séries
      </button>
      <button class="tab" role="tab" [class.active]="tab() === 'MOVIE'" (click)="setTab('MOVIE')">
        Films
      </button>
    </div>

    @if (tab() === 'MOVIE' && moviesDisabled()) {
      <div class="alert alert-info">
        La recherche de films nécessite une clé TMDB gratuite côté backend (variable
        <code>TMDB_API_KEY</code>).
      </div>
    } @else if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    } @else if (loading()) {
      <div class="loader"><div class="spinner"></div></div>
    } @else if (!query()) {
      <div class="empty">Tapez au moins 2 caractères pour lancer la recherche.</div>
    } @else if (results().length === 0) {
      <div class="empty">Aucun résultat pour « {{ query() }} ».</div>
    } @else {
      <div class="poster-grid">
        @for (r of results(); track r.provider + r.externalId) {
          <app-poster-card
            [link]="link(r)"
            [title]="r.title"
            [posterUrl]="r.posterUrl"
            [subtitle]="subtitle(r)"
            [badge]="r.rating ? '★ ' + r.rating : null"
          />
        }
      </div>
    }
  `,
  styles: `
    .search-box { margin-bottom: 16px; }
    .search-input { font-size: 1.05rem; padding: 14px 16px; }
  `,
})
export class SearchPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  /** Paramètres d'URL (?q=...&type=MOVIE) pour conserver la recherche au retour arrière. */
  readonly q = input<string>();
  readonly type = input<string>();

  protected readonly tab = computed<MediaType>(() => (this.type() === 'MOVIE' ? 'MOVIE' : 'SHOW'));
  protected readonly query = computed(() => {
    const value = (this.q() ?? '').trim();
    return value.length >= 2 ? value : '';
  });

  protected readonly results = signal<MediaSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly moviesDisabled = signal(false);

  private debounce: ReturnType<typeof setTimeout> | undefined;
  private request: Subscription | undefined;

  constructor() {
    effect(() => this.search(this.query(), this.tab()));
  }

  ngOnInit(): void {
    this.api.catalogStatus().subscribe({
      next: (s) => this.moviesDisabled.set(!s.moviesEnabled),
      error: () => this.moviesDisabled.set(false),
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounce);
    this.request?.unsubscribe();
  }

  protected onInput(value: string): void {
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.updateUrl({ q: value || null }), 350);
  }

  protected setTab(type: MediaType): void {
    this.updateUrl({ type: type === 'MOVIE' ? 'MOVIE' : null });
  }

  protected link(r: MediaSummary): string[] {
    return detailLink(r.type, r.externalId);
  }

  protected subtitle(r: MediaSummary): string {
    return [r.year, r.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
  }

  private updateUrl(params: Record<string, string | null>): void {
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private search(query: string, type: MediaType): void {
    this.request?.unsubscribe();
    this.error.set(null);
    if (!query) {
      this.results.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const call = type === 'SHOW' ? this.api.searchShows(query) : this.api.searchMovies(query);
    this.request = call.subscribe({
      next: (results) => {
        this.results.set(results);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.results.set([]);
        this.error.set(errorMessage(err, 'La recherche a échoué.'));
      },
    });
  }
}
