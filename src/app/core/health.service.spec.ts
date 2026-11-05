import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { HealthService } from './health.service';
import { HealthReport } from './models';

const report = (databaseUp = true): HealthReport => ({
  status: databaseUp ? 'UP' : 'DOWN',
  database: { status: databaseUp ? 'UP' : 'DOWN' },
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
  });

  it('web service et base verts quand tout répond', () => {
    health.check().subscribe();
    http.expectOne('/api/health').flush(report());
    expect(health.webService()).toBe('up');
    expect(health.database()).toBe('up');
  });

  it('base rouge mais web service vert quand seule la base est en panne', () => {
    health.check().subscribe();
    http.expectOne('/api/health').flush(report(false));
    expect(health.webService()).toBe('up');
    expect(health.database()).toBe('down');
  });

  it('web service rouge et base inconnue quand l’API est injoignable', () => {
    health.check().subscribe();
    http.expectOne('/api/health').error(new ProgressEvent('error'), { status: 0 });
    expect(health.webService()).toBe('down');
    expect(health.database()).toBe('unknown');
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
