import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { HealthService } from './health.service';
import { HealthReport } from './models';

const report = (databaseUp = true, apisUp = true): HealthReport => ({
  status: databaseUp && apisUp ? 'UP' : 'DOWN',
  database: { status: databaseUp ? 'UP' : 'DOWN' },
  apis: { status: apisUp ? 'UP' : 'DOWN', providers: { tvmaze: apisUp ? 'UP' : 'DOWN', tmdb: 'DISABLED' } },
  checkedAt: '2026-11-05T07:00:00Z',
});

describe('HealthService', () => {
  let health: HealthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    health = TestBed.inject(HealthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('les deux signaux sont inconnus tant qu’aucune réponse n’est arrivée', () => {
    expect(health.webService()).toBe('unknown');
    expect(health.database()).toBe('unknown');
    expect(health.externalApis()).toBe('unknown');
  });

  it('web service et base verts quand tout répond', () => {
    health.check().subscribe();
    http.expectOne('/api/health').flush(report());
    expect(health.webService()).toBe('up');
    expect(health.database()).toBe('up');
    expect(health.externalApis()).toBe('up');
  });

  it('base rouge mais web service vert quand seule la base est en panne', () => {
    health.check().subscribe();
    http.expectOne('/api/health').flush(report(false));
    expect(health.webService()).toBe('up');
    expect(health.database()).toBe('down');
  });

  it('API externes rouges, le reste vert, quand TVmaze/TMDB sont en panne', () => {
    health.check().subscribe();
    http.expectOne('/api/health').flush(report(true, false));
    expect(health.webService()).toBe('up');
    expect(health.database()).toBe('up');
    expect(health.externalApis()).toBe('down');
    expect(health.apiProviders()).toEqual({ tvmaze: 'DOWN', tmdb: 'DISABLED' });
  });

  it('API externes inconnues avec un backend qui ne les expose pas encore', () => {
    health.check().subscribe();
    const { apis: _apis, ...legacy } = report();
    http.expectOne('/api/health').flush(legacy);
    expect(health.webService()).toBe('up');
    expect(health.externalApis()).toBe('unknown');
  });

  it('web service rouge, base et API inconnues quand le backend est injoignable', () => {
    health.check().subscribe();
    http.expectOne('/api/health').error(new ProgressEvent('error'), { status: 0 });
    expect(health.webService()).toBe('down');
    expect(health.database()).toBe('unknown');
    expect(health.externalApis()).toBe('unknown');
  });

  it('web service rouge sur une erreur serveur (502/503)', () => {
    health.check().subscribe();
    http.expectOne('/api/health').flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(health.webService()).toBe('down');
  });

  it('revient au vert quand le service se rétablit', () => {
    health.check().subscribe();
    http.expectOne('/api/health').error(new ProgressEvent('error'), { status: 0 });
    expect(health.webService()).toBe('down');

    health.check().subscribe();
    http.expectOne('/api/health').flush(report());
    expect(health.webService()).toBe('up');
    expect(health.database()).toBe('up');
  });

  it('ne déconnecte pas l’utilisateur si /api/health répond 401 (back pas encore à jour)', () => {
    const auth = TestBed.inject(AuthService);
    const unauthorized = vi.spyOn(auth, 'handleUnauthorized');
    health.check().subscribe();
    http.expectOne('/api/health').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(unauthorized).not.toHaveBeenCalled();
    expect(health.webService()).toBe('down');
  });
});
