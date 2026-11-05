import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiService, errorCode, errorMessage } from './api.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('interroge le statut du catalogue', () => {
    api.catalogStatus().subscribe();
    expect(http.expectOne('/api/catalog/status').request.method).toBe('GET');
  });

  it('recherche des séries et des films avec le terme en paramètre', () => {
    api.searchShows('dark').subscribe();
    const shows = http.expectOne((r) => r.url === '/api/catalog/shows');
    expect(shows.request.params.get('query')).toBe('dark');
    shows.flush([]);

    api.searchMovies('matrix').subscribe();
    const movies = http.expectOne((r) => r.url === '/api/catalog/movies');
    expect(movies.request.params.get('query')).toBe('matrix');
    movies.flush([]);
  });

  it('charge le détail d’une série et d’un film en encodant l’identifiant', () => {
    api.show('a/b').subscribe();
    http.expectOne('/api/catalog/shows/a%2Fb').flush({});
    api.movie('603').subscribe();
    http.expectOne('/api/catalog/movies/603').flush({});
  });

  it('liste la bibliothèque avec ou sans filtres', () => {
    api.library().subscribe();
    const all = http.expectOne('/api/library');
    expect(all.request.params.keys()).toEqual([]);
    all.flush([]);

    api.library('MOVIE', 'WATCHED').subscribe();
    const filtered = http.expectOne((r) => r.url === '/api/library');
    expect(filtered.request.params.get('type')).toBe('MOVIE');
    expect(filtered.request.params.get('status')).toBe('WATCHED');
    filtered.flush([]);
  });

  it('lit l’état d’un contenu dans la bibliothèque', () => {
    api.entry('SHOW', '42').subscribe();
    const req = http.expectOne((r) => r.url === '/api/library/entry');
    expect(req.request.params.get('type')).toBe('SHOW');
    expect(req.request.params.get('externalId')).toBe('42');
    req.flush({});
  });

  it('ajoute, change le statut et retire un élément', () => {
    api.add('SHOW', '42', 'WATCHING').subscribe();
    const add = http.expectOne('/api/library');
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ type: 'SHOW', externalId: '42', status: 'WATCHING' });
    add.flush({});

    api.updateStatus(5, 'COMPLETED').subscribe();
    const patch = http.expectOne('/api/library/5/status');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'COMPLETED' });
    patch.flush({});

    api.remove(5).subscribe();
    const del = http.expectOne('/api/library/5');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
  });

  it('marque des épisodes et charge le tableau de bord', () => {
    api.setEpisodes(5, ['1', '2'], true).subscribe();
    const put = http.expectOne('/api/library/5/episodes');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ episodeIds: ['1', '2'], watched: true });
    put.flush({});

    api.dashboard().subscribe();
    http.expectOne('/api/dashboard').flush({});
  });
});

describe('errorMessage / errorCode', () => {
  const httpError = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

  it('signale un serveur injoignable (statut 0)', () => {
    expect(errorMessage(httpError(0, null))).toContain('injoignable');
  });

  it('privilégie la première erreur de champ', () => {
    expect(errorMessage(httpError(400, { errors: { email: 'Email invalide.' }, detail: 'Données invalides.' }))).toBe('Email invalide.');
  });

  it('retombe sur le détail quand aucune erreur de champ n’est exploitable', () => {
    expect(errorMessage(httpError(400, { errors: {}, detail: 'Détail.' }))).toBe('Détail.');
    expect(errorMessage(httpError(409, { detail: 'Conflit.' }))).toBe('Conflit.');
  });

  it('utilise le message de secours sinon', () => {
    expect(errorMessage(httpError(500, null), 'Oups')).toBe('Oups');
    expect(errorMessage(httpError(500, {}))).toBe('Une erreur est survenue.');
    expect(errorMessage(new Error('x'))).toBe('Une erreur est survenue.');
  });

  it('expose le code machine du backend', () => {
    expect(errorCode(httpError(403, { code: 'EMAIL_NOT_VERIFIED' }))).toBe('EMAIL_NOT_VERIFIED');
    expect(errorCode(httpError(403, null))).toBeUndefined();
    expect(errorCode(new Error('x'))).toBeUndefined();
  });
});
