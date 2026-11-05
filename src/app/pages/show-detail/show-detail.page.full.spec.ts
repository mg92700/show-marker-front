import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { LibraryEntry } from '../../core/models';
import { makeEpisode, makeItem, makeShow } from '../../testing/fixtures';
import { click, httpError, render, text } from '../../testing/helpers';
import { ShowDetailPage } from './show-detail.page';

describe('ShowDetailPage (complet)', () => {
  const empty: LibraryEntry = { item: null, watchedEpisodeIds: [] };
  const inLibrary = (ids: string[] = [], over = {}): LibraryEntry => ({ item: makeItem({ id: 5, ...over }), watchedEpisodeIds: ids });

  const setup = (api: Record<string, unknown> = {}) => {
    const stub = {
      show: vi.fn(() => of(makeShow())),
      entry: vi.fn(() => of(empty)),
      add: vi.fn(() => of(makeItem({ id: 5 }))),
      updateStatus: vi.fn(() => of(makeItem())),
      remove: vi.fn(() => of(undefined)),
      setEpisodes: vi.fn(() => of(inLibrary(['11']))),
      ...api,
    };
    TestBed.configureTestingModule({ imports: [ShowDetailPage], providers: [provideRouter([]), { provide: ApiService, useValue: stub }] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ShowDetailPage);
    fixture.componentRef.setInput('id', '1');
    return { fixture, stub, navigate };
  };

  it('affiche un indicateur pendant le chargement', async () => {
    const { fixture } = setup({ show: vi.fn(() => NEVER) });
    expect((await render(fixture)).querySelector('.spinner')).not.toBeNull();
  });

  it('affiche l’erreur et revient en arrière (recherche si pas d’historique)', async () => {
    const { fixture, navigate } = setup({ show: vi.fn(() => throwError(() => httpError(404))) });
    const el = await render(fixture);
    expect(text(el)).toContain('Série introuvable.');
    const spy = vi.spyOn(history, 'length', 'get').mockReturnValue(1);
    click(el, 'button.section');
    expect(navigate).toHaveBeenCalledWith(['/search']);
    spy.mockReturnValue(3);
    const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
    click(el, 'button.section');
    expect(back).toHaveBeenCalled();
  });

  it('affiche un fond, l’affiche de remplacement et les statuts de production', async () => {
    const { fixture } = setup({ show: vi.fn(() => of(makeShow({ posterUrl: null, backdropUrl: 'https://img/bg.jpg', status: 'Running', ended: false, year: null, network: null, rating: null, genres: [], overview: null, seasons: [] }))) });
    const el = await render(fixture);
    expect(el.querySelector('.hero-bg')).not.toBeNull();
    expect(el.querySelector('.poster-fallback')).not.toBeNull();
    expect(text(el)).toContain('En production');
    expect(text(el)).toContain('Aucun épisode référencé');
  });

  it('affiche le statut brut quand ni terminée ni en production, et pas de fond sans image', async () => {
    const { fixture } = setup({ show: vi.fn(() => of(makeShow({ posterUrl: null, backdropUrl: null, status: 'To Be Determined', ended: false, seasons: [] }))) });
    const el = await render(fixture);
    expect(text(el)).toContain('To Be Determined');
    expect(el.querySelector('.hero-bg')).toBeNull();
  });

  it('ne montre aucun badge de statut quand il est absent', async () => {
    const { fixture } = setup({ show: vi.fn(() => of(makeShow({ status: null, ended: false }))) });
    expect(text(await render(fixture))).not.toContain('Terminée');
  });

  it('ajoute à la bibliothèque (liste puis « je la regarde »)', async () => {
    const { fixture, stub } = setup({ entry: vi.fn().mockReturnValueOnce(of(empty)).mockReturnValue(of(inLibrary())) });
    const el = await render(fixture);
    click(el, '.row .btn-primary');
    await fixture.whenStable();
    expect(stub.add).toHaveBeenCalledWith('SHOW', '1', 'WATCHLIST');
    expect(el.querySelector('#status')).not.toBeNull();
  });

  it('ajoute avec le statut « en cours »', async () => {
    const { fixture, stub } = setup();
    const el = await render(fixture);
    click(el, '.row .btn:not(.btn-primary)');
    await fixture.whenStable();
    expect(stub.add).toHaveBeenCalledWith('SHOW', '1', 'WATCHING');
  });

  it('change le statut, ignore un statut identique, et retire la série', async () => {
    const { fixture, stub } = setup({ entry: vi.fn(() => of(inLibrary([], { status: 'WATCHING' }))) });
    const el = await render(fixture);
    const select = el.querySelector('#status') as HTMLSelectElement;
    select.value = 'WATCHING';
    select.dispatchEvent(new Event('change'));
    expect(stub.updateStatus).not.toHaveBeenCalled();
    select.value = 'DROPPED';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(stub.updateStatus).toHaveBeenCalledWith(5, 'DROPPED');

    click(el, '.btn-danger');
    await fixture.whenStable();
    expect(stub.remove).toHaveBeenCalledWith(5);
    expect(el.querySelector('#status')).toBeNull();
  });

  it('ignore changement de statut et retrait sans élément en bibliothèque', async () => {
    const { fixture, stub } = setup();
    await render(fixture);
    const page = fixture.componentInstance as unknown as { changeStatus(s: string): void; remove(): void };
    page.changeStatus('DROPPED');
    page.remove();
    expect(stub.updateStatus).not.toHaveBeenCalled();
    expect(stub.remove).not.toHaveBeenCalled();
  });

  it('affiche la progression, le prochain épisode et le marque comme vu', async () => {
    const next = makeEpisode({ externalId: '12', number: 2, title: 'Two' });
    const entry = inLibrary(['11'], { progress: { watched: 1, total: 3, percent: 33, nextEpisode: next } });
    const { fixture, stub } = setup({ entry: vi.fn(() => of(entry)) });
    const el = await render(fixture);
    expect(text(el)).toContain('33%');
    expect(text(el)).toContain('Prochain épisode');
    click(el, '.next .btn-success');
    await fixture.whenStable();
    expect(stub.setEpisodes).toHaveBeenCalledWith(5, ['12'], true);
  });

  it('affiche « ? » quand le total est inconnu et aucun prochain épisode', async () => {
    const entry = inLibrary([], { progress: { watched: 0, total: null, percent: 0, nextEpisode: null } });
    const { fixture } = setup({ entry: vi.fn(() => of(entry)) });
    const el = await render(fixture);
    expect(text(el)).toContain('0 / ? épisodes');
    expect(el.querySelector('.next')).toBeNull();
  });

  it('ouvre la saison du prochain épisode et bascule l’ouverture des saisons', async () => {
    const next = makeEpisode({ externalId: '21', season: 2 });
    const entry = inLibrary([], { progress: { watched: 2, total: 4, percent: 50, nextEpisode: next } });
    const { fixture } = setup({ entry: vi.fn(() => of(entry)) });
    const el = await render(fixture);
    expect(el.querySelectorAll('.season.open').length).toBe(1);
    expect(el.querySelector('.season.open')?.textContent).toContain('Return');

    const heads = el.querySelectorAll('.season-head');
    (heads[1] as HTMLElement).click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.season.open').length).toBe(0);
    (heads[0] as HTMLElement).click();
    await fixture.whenStable();
    expect(el.querySelector('.season.open')?.textContent).toContain('Pilot');
  });

  it('gère les épisodes sans date ni durée, à venir et déjà vus', async () => {
    const { fixture } = setup({ entry: vi.fn(() => of(inLibrary(['21']))) });
    const el = await render(fixture);
    (el.querySelectorAll('.season-head')[1] as HTMLElement).click();
    await fixture.whenStable();
    const t = text(el);
    expect(t).toContain('Date inconnue');
    expect(el.querySelector('.episode.upcoming')).not.toBeNull();
    expect(el.querySelector('.episode.watched')).not.toBeNull();
  });

  it('affiche la date de diffusion future', async () => {
    const show = makeShow();
    show.seasons[0].episodes[1] = makeEpisode({ externalId: '12', number: 2, aired: false, airDate: '2099-01-01' });
    const { fixture } = setup({ show: vi.fn(() => of(show)) });
    expect(text(await render(fixture))).toContain('Diffusion le');
  });

  it('marque toute la saison puis la démarque', async () => {
    const { fixture, stub } = setup({ entry: vi.fn(() => of(inLibrary())) });
    const el = await render(fixture);
    click(el, '.season-actions .btn');
    await fixture.whenStable();
    expect(stub.setEpisodes).toHaveBeenLastCalledWith(5, ['11', '12'], true);
  });

  it('démarque la saison complète', async () => {
    const { fixture, stub } = setup({ entry: vi.fn(() => of(inLibrary(['11', '12']))) });
    const el = await render(fixture);
    expect(text(el)).toContain('Vue');
    click(el, '.season-actions .btn');
    await fixture.whenStable();
    expect(stub.setEpisodes).toHaveBeenLastCalledWith(5, ['11', '12'], false);
  });

  it('ignore le marquage d’une saison sans épisode', async () => {
    const { fixture, stub } = setup();
    await render(fixture);
    const page = fixture.componentInstance as unknown as { markSeason(s: unknown, w: boolean): void };
    page.markSeason({ number: 9, episodeCount: 0, premiereDate: null, episodes: [] }, true);
    expect(stub.setEpisodes).not.toHaveBeenCalled();
  });

  it('marque « vu jusqu’ici » tous les épisodes diffusés précédents', async () => {
    const { fixture, stub } = setup({ entry: vi.fn(() => of(inLibrary())) });
    const el = await render(fixture);
    const upto = el.querySelectorAll('.upto');
    (upto[1] as HTMLElement).click();
    await fixture.whenStable();
    expect(stub.setEpisodes).toHaveBeenLastCalledWith(5, ['11', '12'], true);
  });

  it('markUpTo sans détails chargés ne marque rien d’inattendu', async () => {
    const { fixture, stub } = setup({ show: vi.fn(() => NEVER) });
    await render(fixture);
    (fixture.componentInstance as unknown as { markUpTo(e: unknown): void }).markUpTo(makeEpisode());
    expect(stub.add).toHaveBeenCalled();
  });

  it('affiche l’erreur d’action', async () => {
    const { fixture } = setup({ add: vi.fn(() => throwError(() => httpError(500, { detail: 'Échec action.' }))) });
    const el = await render(fixture);
    click(el, '.row .btn-primary');
    await fixture.whenStable();
    expect(text(el)).toContain('Échec action.');
  });
});
