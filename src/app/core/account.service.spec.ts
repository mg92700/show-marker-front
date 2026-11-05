import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AccountService } from './account.service';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { AuthResponse, User } from './models';

const alice: User = { id: 1, email: 'a@b.c', displayName: 'Alice', role: 'USER', createdAt: '2026-01-01T00:00:00Z' };

describe('Compte : inscription, vérification, mot de passe, profil', () => {
  let auth: AuthService;
  let account: AccountService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    account = TestBed.inject(AccountService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const startSession = () => {
    const promise = auth.loadSession();
    const res: AuthResponse = { user: alice, expiresAt: new Date(Date.now() + 3_600_000).toISOString() };
    http.expectOne('/api/auth/me').flush(res);
    return promise;
  };

  it("l'inscription ouvre directement une session", () => {
    auth.register('a@b.c', 'secret123', 'Alice').subscribe();
    const req = http.expectOne('/api/auth/register');
    expect(req.request.body).toEqual({ email: 'a@b.c', password: 'secret123', displayName: 'Alice' });
    req.flush(
      { user: alice, expiresAt: new Date(Date.now() + 3_600_000).toISOString() },
      { status: 201, statusText: 'Created' },
    );
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.displayName).toBe('Alice');
  });

  it('met à jour le pseudo affiché après modification du profil', async () => {
    await startSession();
    account.updateDisplayName('Alice2').subscribe();
    const req = http.expectOne('/api/account/profile');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ displayName: 'Alice2' });
    req.flush({ ...alice, displayName: 'Alice2' });
    expect(auth.user()?.displayName).toBe('Alice2');
  });

  it('un pseudo déjà pris (409) ne modifie pas l’utilisateur ni la session', async () => {
    await startSession();
    account.updateDisplayName('Bob').subscribe({ error: () => undefined });
    http.expectOne('/api/account/profile').flush({ status: 409, detail: 'Ce pseudo est déjà pris.' }, { status: 409, statusText: 'Conflict' });
    expect(auth.user()?.displayName).toBe('Alice');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('un mauvais mot de passe actuel (400) ne déconnecte pas', async () => {
    await startSession();
    account.changePassword('wrong', 'new-secret-456').subscribe({ error: () => undefined });
    http.expectOne('/api/account/password').flush({ status: 400, detail: 'Le mot de passe actuel est incorrect.' }, { status: 400, statusText: 'Bad Request' });
    expect(auth.isAuthenticated()).toBe(true);
  });
});
