import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { activityLabel, detailLink, episodeCode } from '../../core/labels';
import { Dashboard, Episode, LibraryItem } from '../../core/models';
import { PosterCard } from '../../shared/poster-card';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, DatePipe, PosterCard],
  template: `
    <h1 class="page-title">Bonjour {{ auth.user()?.displayName }} 👋</h1>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (data(); as d) {
      <div class="stats">
        <div class="card stat">
          <span class="stat-value">{{ d.stats.watchingCount }}</span>
          <span class="muted small">séries en cours</span>
        </div>
        <div class="card stat">
          <span class="stat-value">{{ d.stats.episodesWatched }}</span>
          <span class="muted small">épisodes vus</span>
        </div>
        <div class="card stat">
          <span class="stat-value">{{ d.stats.moviesWatched }}</span>
          <span class="muted small">films vus</span>
        </div>
        <div class="card stat stat-wide">
          <div class="row">
            <span class="stat-value">{{ d.stats.globalProgress }}%</span>
            <span class="muted small">progression globale</span>
          </div>
          <div class="progress progress-lg"><span [style.width.%]="d.stats.globalProgress"></span></div>
        </div>
      </div>

      <section class="section">
        <div class="section-head">
          <h2>À regarder ensuite</h2>
        </div>
        @if (d.upNext.length) {
          <div class="up-next">
            @for (u of d.upNext; track u.show.id) {
              <div class="card up-card">
                <a [routerLink]="link(u.show)" class="thumb thumb-lg">
                  @if (u.show.posterUrl) {
                    <img [src]="u.show.posterUrl" [alt]="u.show.title" loading="lazy" />
                  }
                </a>
                <div class="grow stack-sm">
                  <a [routerLink]="link(u.show)" class="ellipsis title">{{ u.show.title }}</a>
                  <span class="badge badge-accent">{{ code(u.episode) }}</span>
                  <span class="muted small ellipsis">{{ u.episode.title }}</span>
                  <div class="progress"><span [style.width.%]="u.show.progress?.percent ?? 0"></span></div>
                </div>
                <button
                  class="btn btn-success btn-sm"
                  type="button"
                  [disabled]="busy() === u.show.id"
                  (click)="markWatched(u.show, u.episode)"
                  [attr.aria-label]="'Marquer ' + code(u.episode) + ' comme vu'"
                >
                  ✓ Vu
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="empty">
            Aucun épisode en attente. <a routerLink="/search">Ajoutez une série</a> et commencez à la
            suivre !
          </div>
        }
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Séries en cours</h2>
          <a routerLink="/library">Tout voir</a>
        </div>
        @if (d.watching.length) {
          <div class="scroller">
            @for (s of d.watching; track s.id) {
              <app-poster-card
                [link]="link(s)"
                [title]="s.title"
                [posterUrl]="s.posterUrl"
                [progress]="s.progress?.percent ?? 0"
                [subtitle]="progressText(s)"
              />
            }
          </div>
        } @else {
          <div class="empty">Aucune série en cours.</div>
        }
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Films à regarder</h2>
          <a routerLink="/library" [queryParams]="{ type: 'MOVIE' }">Tout voir</a>
        </div>
        @if (d.movieWatchlist.length) {
          <div class="scroller">
            @for (m of d.movieWatchlist; track m.id) {
              <app-poster-card
                [link]="link(m)"
                [title]="m.title"
                [posterUrl]="m.posterUrl"
                [subtitle]="m.year ? '' + m.year : null"
              />
            }
          </div>
        } @else {
          <div class="empty">Votre liste de films est vide.</div>
        }
      </section>

      <div class="two-cols section">
        <section class="card">
          <h2 class="col-title">Derniers épisodes regardés</h2>
          @if (d.recentEpisodes.length) {
            <div class="list">
              @for (e of d.recentEpisodes; track e.episodeExternalId + e.libraryItemId) {
                <a class="list-item" [routerLink]="['/shows', e.showExternalId]">
                  <div class="thumb">
                    @if (e.posterUrl) {
                      <img [src]="e.posterUrl" [alt]="e.showTitle" loading="lazy" />
                    }
                  </div>
                  <div class="grow">
                    <div class="ellipsis title">{{ e.showTitle }}</div>
                    <div class="muted small ellipsis">
                      {{ code(e) }} · {{ e.episodeTitle }}
                    </div>
                  </div>
                  <span class="muted small">{{ e.watchedAt | date: 'd MMM' }}</span>
                </a>
              }
            </div>
          } @else {
            <p class="muted">Aucun épisode regardé pour l'instant.</p>
          }
        </section>

        <section class="card">
          <h2 class="col-title">Dernières activités</h2>
          @if (d.recentActivity.length) {
            <div class="list">
              @for (a of d.recentActivity; track a.id) {
                <div class="list-item">
                  <div class="grow small">
                    Vous {{ activity(a) }} <strong>{{ a.title }}</strong>
                  </div>
                  <span class="muted small">{{ a.createdAt | date: 'd MMM HH:mm' }}</span>
                </div>
              }
            </div>
          } @else {
            <p class="muted">Aucune activité récente.</p>
          }
        </section>
      </div>
    } @else if (!error()) {
      <div class="loader"><div class="spinner"></div></div>
    }
  `,
  styles: `
    .stats { display: grid; grid-template-columns: repeat(3, 1fr) 2fr; gap: 12px; }
    .stat { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; }
    .stat-value { font-size: 1.6rem; font-weight: 800; }
    @media (max-width: 720px) { .stats { grid-template-columns: repeat(3, 1fr); } .stat-wide { grid-column: 1 / -1; } }
    .up-next { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
    .up-card { display: flex; align-items: center; gap: 14px; padding: 12px; }
    .thumb-lg { width: 64px; }
    .stack-sm { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .stack-sm .progress { width: 100%; }
    .title { font-weight: 600; }
    .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 820px) { .two-cols { grid-template-columns: 1fr; } }
    .col-title { margin-bottom: 8px; }
  `,
})
export class DashboardPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<number | null>(null);

  protected readonly code = episodeCode;
  protected readonly activity = activityLabel;

  ngOnInit(): void {
    this.load();
  }

  protected link(item: LibraryItem): string[] {
    return detailLink(item.type, item.externalId);
  }

  protected progressText(s: LibraryItem): string {
    const p = s.progress;
    return p && p.total !== null ? `${p.watched} / ${p.total} épisodes` : '';
  }

  protected markWatched(show: LibraryItem, episode: Episode): void {
    this.busy.set(show.id);
    this.api.setEpisodes(show.id, [episode.externalId], true).subscribe({
      next: () => {
        this.busy.set(null);
        this.load();
      },
      error: (err) => {
        this.busy.set(null);
        this.error.set(errorMessage(err));
      },
    });
  }

  private load(): void {
    this.api.dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.error.set(null);
      },
      error: (err) => this.error.set(errorMessage(err, 'Impossible de charger le tableau de bord.')),
    });
  }
}
