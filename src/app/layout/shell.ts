import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="topbar-inner">
        <a routerLink="/" class="brand" aria-label="Show Marker - accueil">
          <img class="brand-mark" src="logo.svg" alt="" width="28" height="28"> Show Marker
        </a>
        <nav class="nav" aria-label="Navigation principale">
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: link.path === '/' }"
            >
              <span class="nav-icon" aria-hidden="true">{{ link.icon }}</span>
              <span class="nav-label">{{ link.label }}</span>
            </a>
          }
        </nav>
        <div class="user">
          <span class="muted small user-name">{{ auth.user()?.displayName }}</span>
          <button class="btn btn-sm btn-ghost" type="button" (click)="auth.logout()">Déconnexion</button>
        </div>
      </div>
    </header>

    <main class="container">
      <router-outlet />
    </main>

    <footer class="footer muted small">
      Données des séries :
      <a href="https://www.tvmaze.com" target="_blank" rel="noopener">TVmaze</a> (CC BY-SA 4.0) ·
      Données des films :
      <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a>. Ce produit
      utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.
    </footer>
  `,
  styles: `
    .topbar { position: sticky; top: 0; z-index: 20; background: rgba(15, 17, 23, 0.96); border-bottom: 1px solid var(--border); }
    .topbar-inner { max-width: 1200px; margin: 0 auto; height: var(--nav-h); padding: 0 16px; display: flex; align-items: center; gap: 24px; }
    .brand { font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
    .brand-mark { width: 28px; height: 28px; border-radius: 8px; }
    .nav { display: flex; gap: 4px; flex: 1; }
    .nav a { padding: 8px 14px; border-radius: var(--radius-sm); color: var(--text-muted); font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .nav a:hover { color: var(--text); }
    .nav a.active { color: var(--text); background: var(--bg-elev-2); }
    .nav-icon { font-size: 1rem; }
    .user { display: flex; align-items: center; gap: 8px; }
    .footer { max-width: 1200px; margin: 0 auto; padding: 0 16px 90px; text-align: center; }
    .footer a { text-decoration: underline; }
    @media (max-width: 720px) {
      .topbar-inner { gap: 12px; }
      .user-name { display: none; }
      .nav { position: fixed; bottom: 0; left: 0; right: 0; justify-content: space-around; background: var(--bg-elev); border-top: 1px solid var(--border); padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); }
      .nav a { flex-direction: column; gap: 2px; padding: 6px 10px; font-size: 0.72rem; }
      .nav a.active { background: none; color: var(--accent); }
      .nav-icon { font-size: 1.2rem; }
      .user { margin-left: auto; }
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly links = [
    { path: '/', label: 'Accueil', icon: '⌂' },
    { path: '/library', label: 'Bibliothèque', icon: '▦' },
    { path: '/search', label: 'Recherche', icon: '⌕' },
    { path: '/profile', label: 'Profil', icon: '◉' },
  ];
}
