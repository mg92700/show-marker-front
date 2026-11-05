import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { makeActivity, makeUser } from '../testing/fixtures';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { activityLabel } from './labels';

describe('compléments de couverture (core)', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    }),
  );

  it('labels : tous les types d’activité, avec et sans détail', () => {
    expect(activityLabel(makeActivity({ type: 'ADDED', mediaType: 'SHOW' }))).toBe('a ajouté la série');
    expect(activityLabel(makeActivity({ type: 'ADDED', mediaType: 'MOVIE' }))).toBe('a ajouté le film');
    expect(activityLabel(makeActivity({ type: 'EPISODE_WATCHED', detail: 'S01E01' }))).toBe('a vu S01E01 de');
    expect(activityLabel(makeActivity({ type: 'EPISODE_WATCHED', detail: null }))).toBe('a vu un épisode de');
    expect(activityLabel(makeActivity({ type: 'EPISODES_WATCHED', detail: '3 épisodes' }))).toBe('a vu 3 épisodes de');
    expect(activityLabel(makeActivity({ type: 'EPISODES_WATCHED', detail: null }))).toBe('a vu des épisodes de');
  });

  it('auth : updateUser sans session ne fait rien, puis remplace l’utilisateur', () => {
    const auth = TestBed.inject(AuthService);
    auth.updateUser(makeUser());
    expect(auth.user()).toBeNull();

    const http = TestBed.inject(HttpTestingController);
    auth.login('a@b.c', 'x').subscribe();
    http.expectOne('/api/auth/login').flush({ user: makeUser(), expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
    auth.updateUser(makeUser({ displayName: 'Nouveau' }));
    expect(auth.user()?.displayName).toBe('Nouveau');
  });

  it('auth : handleUnauthorized sans session ne redirige pas', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(AuthService).handleUnauthorized();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('auth : une session déjà expirée à la connexion est fermée aussitôt', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth.login('a@b.c', 'x').subscribe();
    http.expectOne('/api/auth/login').flush({ user: makeUser(), expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalled();
  });

  it('interceptor : n’ajoute pas les cookies hors API et ignore un 401 hors API', () => {
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(HttpClient).get('https://example.com/x').subscribe({ error: () => undefined });
    const req = http.expectOne('https://example.com/x');
    expect(req.request.withCredentials).toBe(false);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('interceptor : une erreur non-401 sur l’API est relayée sans déconnexion', () => {
    const http = TestBed.inject(HttpTestingController);
    const error = vi.fn();
    TestBed.inject(HttpClient).get('/api/library').subscribe({ error });
    http.expectOne('/api/library').flush(null, { status: 500, statusText: 'Server Error' });
    expect(error).toHaveBeenCalled();
  });
});
