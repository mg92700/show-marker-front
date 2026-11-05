import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { MediaSummary } from '../../core/models';
import { makeSummary } from '../../testing/fixtures';
import { httpError, render, text } from '../../testing/helpers';
import { SearchPage } from './search.page';

describe('SearchPage', () => {
  afterEach(() => vi.useRealTimers());

  const setup = (api: Record<string, unknown> = {}, inputs: Record<string, string> = {}) => {
    const stub = {
      catalogStatus: vi.fn(() => of({ showProvider: 'tvmaze', movieProvider: 'tmdb', moviesEnabled: true })),
      searchShows: vi.fn(() => of([makeSummary()])),
      searchMovies: vi.fn(() => of([makeSummary({ type: 'MOVIE', title: 'Matrix', rating: null, genres: [], year: null })])),
      ...api,
    };
    TestBed.configureTestingModule({ imports: [SearchPage], providers: [provideRouter([]), { provide: ApiService, useValue: stub }] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SearchPage);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    return { fixture, stub, navigate };
  };

  it('invite à saisir au moins 2 caractères', async () => {
    const { fixture, stub } = setup({}, { q: 'd' });
    const el = await render(fixture);
    expect(text(el)).toContain('Tapez au moins 2 caractères');
    expect(stub.searchShows).not.toHaveBeenCalled();
  });

  it('cherche des séries et affiche les résultats (sous-titre, note)', async () => {
    const { fixture, stub } = setup({}, { q: ' dark ' });
    const el = await render(fixture);
    expect(stub.searchShows).toHaveBeenCalledWith('dark');
    const t = text(el);
    expect(t).toContain('Dark');
    expect(t).toContain('2017 · Drama, Sci-Fi');
    expect(t).toContain('★ 8.7');
  });

  it('affiche un indicateur pendant la recherche', async () => {
    const { fixture } = setup({ searchShows: vi.fn(() => NEVER) }, { q: 'dark' });
    const el = await render(fixture);
    expect(el.querySelector('.spinner')).not.toBeNull();
  });

  it('indique l’absence de résultat', async () => {
    const { fixture } = setup({ searchShows: vi.fn(() => of([] as MediaSummary[])) }, { q: 'zzzz' });
    expect(text(await render(fixture))).toContain('Aucun résultat pour « zzzz ».');
  });

  it('affiche l’erreur de recherche', async () => {
    const { fixture } = setup({ searchShows: vi.fn(() => throwError(() => httpError(502))) }, { q: 'dark' });
    expect(text(await render(fixture))).toContain('La recherche a échoué.');
  });

  it('cherche des films sur l’onglet films (sans note, genre ni année)', async () => {
    const { fixture, stub } = setup({}, { q: 'matrix', type: 'MOVIE' });
    const el = await render(fixture);
    expect(stub.searchMovies).toHaveBeenCalledWith('matrix');
    expect(text(el)).toContain('Matrix');
  });

  it('explique qu’une clé TMDB est nécessaire quand les films sont désactivés', async () => {
    const { fixture } = setup(
      { catalogStatus: vi.fn(() => of({ showProvider: 'tvmaze', movieProvider: 'tmdb', moviesEnabled: false })) },
      { q: 'matrix', type: 'MOVIE' },
    );
    expect(text(await render(fixture))).toContain('TMDB_API_KEY');
  });

  it('ignore une erreur sur le statut du catalogue', async () => {
    const { fixture } = setup({ catalogStatus: vi.fn(() => throwError(() => httpError(500))) }, { q: 'matrix', type: 'MOVIE' });
    expect(text(await render(fixture))).not.toContain('TMDB_API_KEY');
  });

  it('met à jour l’URL après un délai quand on tape (antirebond)', async () => {
    const { fixture, navigate } = setup();
    const el = await render(fixture);
    vi.useFakeTimers();
    const input = el.querySelector('input') as HTMLInputElement;

    input.value = 'da';
    input.dispatchEvent(new Event('input'));
    input.value = 'dark';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(349);
    expect(navigate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith([], { queryParams: { q: 'dark' }, queryParamsHandling: 'merge', replaceUrl: true });

    input.value = '';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(350);
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { q: null }, queryParamsHandling: 'merge', replaceUrl: true });
  });

  it('change d’onglet en mettant à jour l’URL', async () => {
    const { fixture, navigate } = setup();
    const el = await render(fixture);
    const [seriesTab, moviesTab] = Array.from(el.querySelectorAll('.tab')) as HTMLButtonElement[];
    moviesTab.click();
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { type: 'MOVIE' }, queryParamsHandling: 'merge', replaceUrl: true });
    seriesTab.click();
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { type: null }, queryParamsHandling: 'merge', replaceUrl: true });
  });

  it('annule la recherche précédente quand la requête change, et à la destruction', async () => {
    const first = new Subject<MediaSummary[]>();
    const searchShows = vi.fn().mockReturnValueOnce(first).mockReturnValue(of([makeSummary({ title: 'Darker' })]));
    const { fixture } = setup({ searchShows }, { q: 'dark' });
    await render(fixture);
    expect(first.observed).toBe(true);

    fixture.componentRef.setInput('q', 'darker');
    const el = await render(fixture);
    expect(first.observed).toBe(false);
    expect(text(el)).toContain('Darker');

    fixture.destroy();
  });
});
