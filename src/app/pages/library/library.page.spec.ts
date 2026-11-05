import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { makeItem, makeMovieItem } from '../../testing/fixtures';
import { click, httpError, render, text } from '../../testing/helpers';
import { LibraryPage } from './library.page';

describe('LibraryPage', () => {
  const setup = (library: (...args: unknown[]) => unknown, type?: string) => {
    const api = { library: vi.fn(library) };
    TestBed.configureTestingModule({ imports: [LibraryPage], providers: [provideRouter([]), { provide: ApiService, useValue: api }] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LibraryPage);
    if (type) fixture.componentRef.setInput('type', type);
    return { fixture, api, navigate };
  };

  const shows = [
    makeItem({ id: 1, title: 'Alpha', status: 'WATCHING' }),
    makeItem({ id: 2, title: 'Beta', status: 'COMPLETED', progress: { watched: 4, total: 4, percent: 100, nextEpisode: null } }),
    makeItem({ id: 3, title: 'Gamma', status: 'WATCHLIST', progress: null, year: null }),
    makeItem({ id: 4, title: 'Delta', status: 'DROPPED', progress: { watched: 0, total: null, percent: 0, nextEpisode: null } }),
  ];

  it('affiche un indicateur pendant le chargement', async () => {
    const { fixture } = setup(() => NEVER);
    const el = await render(fixture);
    expect(el.querySelector('.spinner')).not.toBeNull();
  });

  it('charge les séries par défaut et affiche les compteurs par statut', async () => {
    const { fixture, api } = setup(() => of(shows));
    const el = await render(fixture);
    expect(api.library).toHaveBeenCalledWith('SHOW');
    const t = text(el);
    expect(t).toContain('Tous (4)');
    expect(t).toContain('En cours (1)');
    expect(t).toContain('Terminée (1)');
    expect(t).toContain('Abandonnée (1)');
    expect(el.querySelectorAll('app-poster-card').length).toBe(4);
    expect(t).toContain('4 / 4 épisodes');
    expect(t).toContain('2020');
  });

  it('filtre par statut puis revient à « Tous »', async () => {
    const { fixture } = setup(() => of(shows));
    const el = await render(fixture);
    const chips = Array.from(el.querySelectorAll('.chip')) as HTMLButtonElement[];
    chips.find((c) => c.textContent?.includes('Terminée'))?.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('app-poster-card').length).toBe(1);
    expect(text(el)).toContain('Beta');

    chips[0].click();
    await fixture.whenStable();
    expect(el.querySelectorAll('app-poster-card').length).toBe(4);
  });

  it('affiche les films quand le paramètre type vaut MOVIE', async () => {
    const { fixture, api } = setup(() => of([makeMovieItem({ status: 'WATCHED' }), makeMovieItem({ id: 10, year: null })]), 'MOVIE');
    const el = await render(fixture);
    expect(api.library).toHaveBeenCalledWith('MOVIE');
    const t = text(el);
    expect(t).toContain('Vu (1)');
    expect(t).toContain('À regarder (1)');
    expect(t).not.toContain('Abandonnée');
  });

  it('propose la recherche quand la bibliothèque est vide (onglet films → type=MOVIE)', async () => {
    const { fixture } = setup(() => of([]), 'MOVIE');
    const el = await render(fixture);
    expect(text(el)).toContain("Rien ici pour l'instant.");
    expect(el.querySelector('.empty a')?.getAttribute('href')).toBe('/search?type=MOVIE');
  });

  it('propose la recherche de séries quand la bibliothèque de séries est vide', async () => {
    const { fixture } = setup(() => of([]));
    const el = await render(fixture);
    expect(el.querySelector('.empty a')?.getAttribute('href')).toBe('/search');
  });

  it('affiche l’erreur de chargement', async () => {
    const { fixture } = setup(() => throwError(() => httpError(500)));
    const el = await render(fixture);
    expect(text(el)).toContain('Impossible de charger la bibliothèque.');
  });

  it('change d’onglet en mettant à jour l’URL', async () => {
    const { fixture, navigate } = setup(() => of(shows));
    const el = await render(fixture);
    const [seriesTab, moviesTab] = Array.from(el.querySelectorAll('.tab')) as HTMLButtonElement[];
    moviesTab.click();
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { type: 'MOVIE' }, replaceUrl: true });
    seriesTab.click();
    expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { type: null }, replaceUrl: true });
    click(el, '.chip');
  });
});
