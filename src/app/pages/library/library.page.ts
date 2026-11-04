import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ApiService, errorMessage } from '../../core/api.service';
import { MOVIE_STATUSES, SHOW_STATUSES, detailLink, statusLabel } from '../../core/labels';
import { LibraryItem, LibraryStatus, MediaType } from '../../core/models';
import { PosterCard } from '../../shared/poster-card';

@Component({
  selector: 'app-library-page',
  imports: [PosterCard, RouterLink],
  template: `
    <h1 class="page-title">Ma bibliothèque</h1>

    <div class="tabs" role="tablist">
      <button class="tab" role="tab" [class.active]="tab() === 'SHOW'" (click)="setTab('SHOW')">
        Séries
      </button>
      <button class="tab" role="tab" [class.active]="tab() === 'MOVIE'" (click)="setTab('MOVIE')">
        Films
      </button>
    </div>

    <div class="chips filters">
      <button class="chip" [class.active]="filter() === null" (click)="filter.set(null)">
        Tous ({{ items().length }})
      </button>
      @for (s of statuses(); track s) {
        <button class="chip" [class.active]="filter() === s" (click)="filter.set(s)">
          {{ label(s) }} ({{ count(s) }})
        </button>
      }
    </div>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    } @else if (loading()) {
      <div class="loader"><div class="spinner"></div></div>
    } @else if (visible().length === 0) {
      <div class="empty">
        Rien ici pour l'instant. <a routerLink="/search" [queryParams]="searchParams()">Rechercher</a>
      </div>
    } @else {
      <div class="poster-grid">
        @for (item of visible(); track item.id) {
          <app-poster-card
            [link]="link(item)"
            [title]="item.title"
            [posterUrl]="item.posterUrl"
            [badge]="label(item.status, item.type)"
            [progress]="item.type === 'SHOW' ? (item.progress?.percent ?? 0) : null"
            [subtitle]="subtitle(item)"
          />
        }
      </div>
    }
  `,
  styles: `
    .filters { margin-bottom: 20px; }
  `,
})
export class LibraryPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly type = input<string>();

  protected readonly tab = computed<MediaType>(() => (this.type() === 'MOVIE' ? 'MOVIE' : 'SHOW'));
  protected readonly statuses = computed(() => (this.tab() === 'SHOW' ? SHOW_STATUSES : MOVIE_STATUSES));
  protected readonly items = signal<LibraryItem[]>([]);
  protected readonly filter = signal<LibraryStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const f = this.filter();
    return f ? this.items().filter((i) => i.status === f) : this.items();
  });
  protected readonly searchParams = computed(() => (this.tab() === 'MOVIE' ? { type: 'MOVIE' } : {}));

  constructor() {
    effect(() => this.load(this.tab()));
  }

  protected setTab(type: MediaType): void {
    this.filter.set(null);
    this.router.navigate([], { queryParams: { type: type === 'MOVIE' ? 'MOVIE' : null }, replaceUrl: true });
  }

  protected count(status: LibraryStatus): number {
    return this.items().filter((i) => i.status === status).length;
  }

  protected label(status: LibraryStatus, type: MediaType = this.tab()): string {
    return statusLabel(status, type);
  }

  protected link(item: LibraryItem): string[] {
    return detailLink(item.type, item.externalId);
  }

  protected subtitle(item: LibraryItem): string | null {
    if (item.type === 'SHOW' && item.progress?.total != null) {
      return `${item.progress.watched} / ${item.progress.total} épisodes`;
    }
    return item.year ? String(item.year) : null;
  }

  private load(type: MediaType): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.library(type).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Impossible de charger la bibliothèque.'));
      },
    });
  }
}
