import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Carte « affiche » cliquable, avec sous-titre et barre de progression optionnels. */
@Component({
  selector: 'app-poster-card',
  imports: [RouterLink],
  template: `
    <a [routerLink]="link()" class="card-link" [attr.aria-label]="title()">
      <div class="poster">
        @if (posterUrl()) {
          <img [src]="posterUrl()" [alt]="title()" loading="lazy" />
        } @else {
          <div class="poster-fallback">{{ title() }}</div>
        }
        @if (badge()) {
          <span class="badge badge-accent corner">{{ badge() }}</span>
        }
      </div>
      @if (progress() !== null) {
        <div class="progress"><span [style.width.%]="progress()"></span></div>
      }
      <div class="caption">
        <div class="title ellipsis">{{ title() }}</div>
        @if (subtitle()) {
          <div class="muted small ellipsis">{{ subtitle() }}</div>
        }
      </div>
    </a>
  `,
  styles: `
    .card-link { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .card-link:hover .poster { outline: 2px solid var(--accent); outline-offset: 2px; }
    .caption { min-width: 0; }
    .title { font-weight: 600; font-size: 0.9rem; }
    .corner { position: absolute; top: 8px; left: 8px; background: rgba(15, 17, 23, 0.85); }
  `,
})
export class PosterCard {
  readonly link = input.required<string[]>();
  readonly title = input.required<string>();
  readonly posterUrl = input<string | null>(null);
  readonly subtitle = input<string | null>(null);
  readonly badge = input<string | null>(null);
  /** Pourcentage 0-100, ou null pour masquer la barre. */
  readonly progress = input<number | null>(null);
}
