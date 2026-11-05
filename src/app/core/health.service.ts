import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, filter, fromEvent, map, merge, of, switchMap, tap, timeout, timer } from 'rxjs';

import { environment } from '../../environments/environment';
import { HealthReport } from './models';

/** Dernier résultat connu. `report` est null quand l'API elle-même ne répond pas. */
export interface HealthSnapshot {
  report: HealthReport | null;
  checkedAt: Date;
}

/** unknown = pas (encore) d'information ; up = en ligne ; down = en panne. */
export type SignalState = 'unknown' | 'up' | 'down';

const POLL_INTERVAL_MS = 30_000;
/** Un backend gratuit en veille met longtemps à répondre : on le considère injoignable au-delà. */
const REQUEST_TIMEOUT_MS = 8_000;

/** Surveille le web service (API backend), la base de données et les API externes via GET /api/health. */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  readonly snapshot = signal<HealthSnapshot | null>(null);

  /** Web service : en ligne dès que /api/health répond. */
  readonly webService = computed<SignalState>(() => {
    const snapshot = this.snapshot();
    if (!snapshot) return 'unknown';
    return snapshot.report ? 'up' : 'down';
  });

  /** Base de données : inconnue tant que le web service ne répond pas (lui seul peut la tester). */
  readonly database = computed<SignalState>(() => {
    const report = this.snapshot()?.report;
    if (!report) return 'unknown';
    return report.database.status === 'UP' ? 'up' : 'down';
  });

  /** API externes du catalogue (TVmaze, TMDB) : inconnues tant que le web service ne répond pas. */
  readonly externalApis = computed<SignalState>(() => {
    const apis = this.snapshot()?.report?.apis;
    if (!apis) return 'unknown';
    return apis.status === 'UP' ? 'up' : 'down';
  });

  /** Détail par fournisseur, pour l'infobulle. */
  readonly apiProviders = computed(() => this.snapshot()?.report?.apis?.providers ?? {});

  /** Interroge l'API une fois ; une erreur réseau ou un dépassement de délai donne un rapport nul (API injoignable). */
  check(): Observable<HealthSnapshot> {
    return this.http.get<HealthReport>(`${environment.apiUrl}/health`).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError(() => of(null)),
      map((report) => ({ report, checkedAt: new Date() })),
      tap((snapshot) => this.snapshot.set(snapshot)),
    );
  }

  /** Lance la surveillance périodique (idempotent). Suspendue quand l'onglet est masqué. */
  start(): void {
    if (this.started) return;
    this.started = true;
    merge(timer(0, POLL_INTERVAL_MS), fromEvent(document, 'visibilitychange'))
      .pipe(
        filter(() => !document.hidden),
        switchMap(() => this.check()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
