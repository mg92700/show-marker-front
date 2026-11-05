import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HealthService, SignalState } from '../core/health.service';
import { HealthIndicator } from './health-indicator';

describe('HealthIndicator', () => {
  const setup = (opts: { db: SignalState; web: SignalState; api: SignalState; providers?: Record<string, string> }) => {
    const health = {
      start: vi.fn(),
      database: signal(opts.db),
      webService: signal(opts.web),
      externalApis: signal(opts.api),
      apiProviders: signal(opts.providers ?? {}),
    };
    TestBed.configureTestingModule({ imports: [HealthIndicator], providers: [{ provide: HealthService, useValue: health }] });
    const fixture = TestBed.createComponent(HealthIndicator);
    return { fixture, health, el: fixture.nativeElement as HTMLElement };
  };

  it('démarre la surveillance et affiche trois pastilles avec leur état', async () => {
    const { fixture, health, el } = setup({ db: 'up', web: 'down', api: 'unknown' });
    await fixture.whenStable();
    expect(health.start).toHaveBeenCalledTimes(1);
    const signals = Array.from(el.querySelectorAll('.signal'));
    expect(signals.map((s) => s.getAttribute('data-state'))).toEqual(['up', 'down', 'unknown']);
    expect(signals.map((s) => s.textContent?.trim())).toEqual(['BDD', 'Web', 'API']);
    expect(signals[0].getAttribute('title')).toBe('Base de données : en ligne');
    expect(signals[1].getAttribute('title')).toBe('Web service : indisponible');
    expect(signals[2].getAttribute('title')).toBe('API externes : état inconnu');
  });

  it('détaille chaque fournisseur d’API dans l’infobulle', async () => {
    const { fixture, el } = setup({
      db: 'up',
      web: 'up',
      api: 'down',
      providers: { tvmaze: 'DOWN', tmdb: 'DISABLED', autre: 'BIZARRE' },
    });
    await fixture.whenStable();
    const title = el.querySelectorAll('.signal')[2].getAttribute('title');
    expect(title).toBe('API externes : indisponible (TVmaze indisponible, TMDB non configuré, autre BIZARRE)');
  });
});
