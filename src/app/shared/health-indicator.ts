import { Component, computed, inject } from '@angular/core';

import { HealthService, SignalState } from '../core/health.service';

interface Signal {
  label: string;
  title: string;
  state: SignalState;
}

const PROVIDER_LABELS: Record<string, string> = { tvmaze: 'TVmaze', tmdb: 'TMDB' };
const PROVIDER_STATE_TEXT: Record<string, string> = { UP: 'en ligne', DOWN: 'indisponible', DISABLED: 'non configuré' };

const STATE_TEXT: Record<SignalState, string> = {
  up: 'en ligne',
  down: 'indisponible',
  unknown: 'état inconnu',
};

/** Trois pastilles en bas à droite (base de données, web service, API externes), chacune verte (en ligne) ou rouge (en panne). */
@Component({
  selector: 'app-health-indicator',
  template: `
    <div class="health" role="status" aria-label="État des services">
      @for (signal of signals(); track signal.label) {
        <span class="signal" [attr.data-state]="signal.state" [title]="signal.title" [attr.aria-label]="signal.title">
          <span class="dot"></span>
          <span class="label">{{ signal.label }}</span>
        </span>
      }
    </div>
  `,
  styles: `
    :host { position: fixed; right: 16px; bottom: 16px; z-index: 30; }
    .health { display: flex; align-items: center; gap: 12px; padding: 6px 12px; border-radius: 999px; background: var(--bg-elev); border: 1px solid var(--border); box-shadow: var(--shadow); }
    .signal { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 600; color: var(--text-muted); cursor: default; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--text-muted); opacity: 0.6; }
    [data-state='up'] .dot { background: var(--success); opacity: 1; box-shadow: 0 0 0 0 rgba(47, 191, 113, 0.6); animation: pulse 2.4s infinite; }
    [data-state='down'] .dot { background: var(--danger); opacity: 1; box-shadow: 0 0 8px 2px rgba(239, 93, 93, 0.55); }
    [data-state='down'] .label { color: var(--danger); }
    @keyframes pulse {
      70% { box-shadow: 0 0 0 6px rgba(47, 191, 113, 0); }
      100% { box-shadow: 0 0 0 0 rgba(47, 191, 113, 0); }
    }
    @media (prefers-reduced-motion: reduce) { [data-state='up'] .dot { animation: none; } }
    /* Mobile : la barre de navigation est fixée en bas de l'écran, on se place au-dessus. */
    @media (max-width: 720px) { :host { bottom: calc(76px + env(safe-area-inset-bottom)); } }
  `,
})
export class HealthIndicator {
  private readonly health = inject(HealthService);

  protected readonly signals = computed<Signal[]>(() => {
    const providers = Object.entries(this.health.apiProviders())
      .map(([name, state]) => `${PROVIDER_LABELS[name] ?? name} ${PROVIDER_STATE_TEXT[state] ?? state}`)
      .join(', ');
    const apis = this.health.externalApis();
    return [
      { label: 'BDD', title: `Base de données : ${STATE_TEXT[this.health.database()]}`, state: this.health.database() },
      { label: 'Web', title: `Web service : ${STATE_TEXT[this.health.webService()]}`, state: this.health.webService() },
      { label: 'API', title: `API externes : ${STATE_TEXT[apis]}${providers ? ` (${providers})` : ''}`, state: apis },
    ];
  });

  constructor() {
    this.health.start();
  }
}
