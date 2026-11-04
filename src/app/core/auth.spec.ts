import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { authGuard, guestGuard } from './auth.guards';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { AuthResponse } from './models';

const session = (offsetMs = 3_600_000): AuthResponse => ({
  user: { id: 1, email: 'a@b.c', displayName: 'Alice', role: 'USER', createdAt: '2026-01-01T00:00:00Z' },
  expiresAt: new Date(Date.now() + offsetMs).toISOString(),
});

describe('Authentification', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  const runGuard = (guard: typeof authGuard, url = '/library') =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  it('login stocke la session sans exposer de jeton', () => {
    auth.login('a@b.c', 'secret123').subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(session());

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.displayName).toBe('Alice');
    expect(JSON.stringify(localStorage)).not.toContain('token');
  });

  it('loadSession restaure la session ou reste déconnecté sur 401', async () => {
    const ok = auth.loadSession();
    http.expectOne('/api/auth/me').flush(session());
    await ok;
    expect(auth.isAuthenticated()).toBe(true);

    const ko = auth.loadSession();
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await ko;
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('un 401 sur une route protégée ferme la session et redirige vers /login', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    auth.login('a@b.c', 'secret123').subscribe();
    http.expectOne('/api/auth/login').flush(session());

    TestBed.inject(HttpClient).get('/api/library').subscribe({ error: () => undefined });
    http.expectOne('/api/library').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: 1 } });
  });

  it("la session expire automatiquement à la date d'expiration du JWT", () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      auth.login('a@b.c', 'secret123').subscribe();
      http.expectOne('/api/auth/login').flush(session(1000));
      expect(auth.isAuthenticated()).toBe(true);
      vi.advanceTimersByTime(1500);
      expect(auth.isAuthenticated()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('logout appelle le backend et oublie la session', () => {
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    auth.login('a@b.c', 'secret123').subscribe();
    http.expectOne('/api/auth/login').flush(session());

    auth.logout();
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('authGuard redirige vers /login avec returnUrl si non connecté', () => {
    const result = runGuard(authGuard) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Flibrary');
  });

  it('authGuard laisse passer et guestGuard redirige une fois connecté', () => {
    auth.login('a@b.c', 'secret123').subscribe();
    http.expectOne('/api/auth/login').flush(session());
    expect(runGuard(authGuard)).toBe(true);
    expect(router.serializeUrl(runGuard(guestGuard) as UrlTree)).toBe('/');
  });
});
