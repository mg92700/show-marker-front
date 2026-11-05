import { Component, computed, inject, signal } from '@angular/core';

import { ApiService } from '../core/api.service';
import { ShowcaseItem } from '../core/models';

const ROWS = 4;
/** Nombre minimal d'affiches par rangée avant duplication (la rangée doit dépasser la largeur d'un grand écran). */
const MIN_PER_ROW = 14;

/**
 * Mur d'affiches de séries et de films cultes qui défile en fond des pages de connexion et d'inscription.
 * Les affiches viennent du catalogue (TVmaze, TMDB) via le backend ; sans données, rien n'est affiché.
 */
@Component({
  selector: 'app-poster-wall',
  template: `
    @if (rows().length) {
      <div class="wall" aria-hidden="true">
        @for (row of rows(); track $index) {
          <div class="lane" [class.reverse]="$index % 2 === 1">
            <div class="track">
              @for (poster of row; track $index) {
                <img [src]="poster.posterUrl" alt="" width="130" height="195" loading="lazy" decoding="async" />
              }
              @for (poster of row; track $index) {
                <img [src]="poster.posterUrl" alt="" width="130" height="195" loading="lazy" decoding="async" />
              }
            </div>
          </div>
        }
      </div>
      <div class="veil"></div>
      <p class="credits">
        Affiches : TVmaze et TMDB. Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.
      </p>
    }
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
    .wall { position: absolute; inset: -25% -10%; display: flex; flex-direction: column; justify-content: center; gap: 16px; transform: rotate(-8deg); }
    .lane { overflow: hidden; }
    .track { display: flex; gap: 16px; width: max-content; animation: slide 90s linear infinite; }
    .lane.reverse .track { animation-direction: reverse; animation-duration: 110s; }
    img { width: 130px; height: 195px; object-fit: cover; border-radius: 8px; box-shadow: 0 8px 22px rgba(0, 0, 0, 0.55); background: var(--bg-elev); }
    .veil { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(15, 17, 23, 0.3) 0%, rgba(15, 17, 23, 0.7) 85%), linear-gradient(to bottom, rgba(15, 17, 23, 0.55), transparent 22%, transparent 78%, rgba(15, 17, 23, 0.85)); }
    .credits { position: absolute; left: 0; right: 0; bottom: 8px; margin: 0; padding: 0 16px; text-align: center; font-size: 0.7rem; color: var(--text-muted); opacity: 0.8; }
    @keyframes slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @media (prefers-reduced-motion: reduce) { .track { animation: none; } }
    @media (max-width: 600px) { img { width: 100px; height: 150px; } }
  `,
})
export class PosterWall {
  private readonly api = inject(ApiService);
  private readonly items = signal<ShowcaseItem[]>([]);

  /** Répartit les affiches en rangées, chacune répétée jusqu'à être assez longue pour boucler sans trou. */
  protected readonly rows = computed(() => {
    const items = this.items();
    if (items.length === 0) return [];
    return Array.from({ length: ROWS }, (_, r) => {
      const own = items.filter((_, i) => i % ROWS === r);
      const base = own.length ? own : items;
      const row: ShowcaseItem[] = [];
      while (row.length < MIN_PER_ROW) row.push(...base);
      return row;
    });
  });

  constructor() {
    this.api.showcase().subscribe({
      next: (items) => this.items.set(items),
      error: () => this.items.set([]),
    });
  }
}
