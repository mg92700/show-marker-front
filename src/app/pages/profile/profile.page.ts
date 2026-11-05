import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { DashboardStats, LibraryItem } from '../../core/models';
import { detailLink } from '../../core/labels';
import { PosterCard } from '../../shared/poster-card';
import { AccountSettings } from './account-settings';

@Component({
  selector: 'app-profile-page',
  imports: [DatePipe, PosterCard, AccountSettings],
  template: `
    <h1 class="page-title">Mon profil</h1>

    @if (auth.user(); as user) {
      <div class="card profile">
        <div class="avatar" aria-hidden="true">{{ user.displayName.charAt(0).toUpperCase() }}</div>
        <div class="grow">
          <h2>{{ user.displayName }}</h2>
          <p class="muted">{{ user.email }}</p>
          <p class="muted small">Membre depuis le {{ user.createdAt | date: 'longDate' }}</p>
        </div>
        <button class="btn btn-danger" type="button" (click)="auth.logout()">Se déconnecter</button>
      </div>
    }

    <section class="section">
      <div class="section-head"><h2>Mon compte</h2></div>
      <app-account-settings />
    </section>

    @if (stats(); as s) {
      <div class="stats section">
        <div class="card stat"><strong>{{ s.showsCount }}</strong><span class="muted small">séries suivies</span></div>
        <div class="card stat"><strong>{{ s.completedShows }}</strong><span class="muted small">séries terminées</span></div>
        <div class="card stat"><strong>{{ s.episodesWatched }}</strong><span class="muted small">épisodes vus</span></div>
        <div class="card stat"><strong>{{ s.moviesCount }}</strong><span class="muted small">films en bibliothèque</span></div>
        <div class="card stat"><strong>{{ s.moviesWatched }}</strong><span class="muted small">films vus</span></div>
        <div class="card stat"><strong>{{ s.globalProgress }}%</strong><span class="muted small">progression globale</span></div>
      </div>
    }

    <section class="section">
      <div class="section-head"><h2>Historique des films vus</h2></div>
      @if (history().length) {
        <div class="poster-grid">
          @for (m of history(); track m.id) {
            <app-poster-card
              [link]="link(m)"
              [title]="m.title"
              [posterUrl]="m.posterUrl"
              [subtitle]="m.watchedAt ? 'Vu le ' + (m.watchedAt | date: 'd MMM y') : null"
            />
          }
        </div>
      } @else {
        <div class="empty">Aucun film marqué comme vu.</div>
      }
    </section>
  `,
  styles: `
    .profile { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: var(--accent); font-size: 1.6rem; font-weight: 800; }
    .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .stat { display: flex; flex-direction: column; gap: 4px; }
    .stat strong { font-size: 1.5rem; }
  `,
})
export class ProfilePage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly history = signal<LibraryItem[]>([]);

  ngOnInit(): void {
    this.api.dashboard().subscribe((d) => this.stats.set(d.stats));
    this.api.library('MOVIE', 'WATCHED').subscribe((items) =>
      this.history.set(
        [...items].sort((a, b) => (b.watchedAt ?? '').localeCompare(a.watchedAt ?? '')),
      ),
    );
  }

  protected link(item: LibraryItem): string[] {
    return detailLink(item.type, item.externalId);
  }
}
