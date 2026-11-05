import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { LibraryEntry } from '../../core/models';
import { makeMovie, makeMovieItem } from '../../testing/fixtures';
import { click, httpError, render, text } from '../../testing/helpers';
import { MovieDetailPage } from './movie-detail.page';

describe('MovieDetailPage', () => {
  const empty: LibraryEntry = { item: null, watchedEpisodeIds: [] };

  const setup = (api: Record<string, unknown> = {}) => {
    const stub = {
      movie: vi.fn(() => of(makeMovie())),
      entry: vi.fn(() => of(empty)),
      add: vi.fn(() => of(makeMovieItem())),
      updateStatus: vi.fn((_id: number, status: string) => of(makeMovieItem({ status: status as 'WATCHED', watchedAt: '2026-02-01T00:00:00Z' }))),
      remove: vi.fn(() => of(undefined)),
      ...api,
    };
    TestBed.configureTestingModule({ imports: [MovieDetailPage], providers: [{ provide: ApiService, useValue: stub }] });
    const fixture = TestBed.createComponent(MovieDetailPage);
    fixture.componentRef.setInput('id', '603');
    return { fixture, stub };
  };

  it('affiche un indicateur pendant le chargement', async () => {
    const { fixture } = setup({ movie: vi.fn(() => NEVER) });
    expect((await render(fixture)).querySelector('.spinner')).not.toBeNull();
  });

  it('affiche toutes les informations du film', async () => {
    const { fixture, stub } = setup();
    const el = await render(fixture);
    expect(stub.movie).toHaveBeenCalledWith('603');
    expect(stub.entry).toHaveBeenCalledWith('MOVIE', '603');
    const t = text(el);
    expect(t).toContain('Matrix');
    expect(t).toContain('The Matrix');
    expect(t).toMatch(/31 \S+ 1999/);
    expect(t).toContain('2 h 16');
    expect(t).toContain('★ 8.2');
    expect(t).toContain('Sci-Fi');
    expect(t).toContain('Free your mind');
    expect(t).toContain('Synopsis');
    expect(el.querySelector('.hero-bg')).not.toBeNull();
  });

  it('gère un film aux informations minimales', async () => {
    const minimal = makeMovie({
      originalTitle: 'Matrix',
      posterUrl: null,
      backdropUrl: null,
      releaseDate: null,
      runtime: 45,
      rating: null,
      genres: [],
      tagline: null,
      overview: null,
    });
    const { fixture } = setup({ movie: vi.fn(() => of(minimal)) });
    const el = await render(fixture);
    expect(el.querySelector('.hero-bg')).toBeNull();
    expect(el.querySelector('.poster-fallback')?.textContent).toContain('Matrix');
    expect(text(el)).toContain('45 min');
    expect(el.querySelector('.hero-info > .muted')).toBeNull();
  });

  it('utilise l’affiche comme fond quand il n’y a pas d’image de fond', async () => {
    const { fixture } = setup({ movie: vi.fn(() => of(makeMovie({ backdropUrl: null, runtime: null }))) });
    const el = await render(fixture);
    expect((el.querySelector('.hero-bg') as HTMLElement).style.backgroundImage).toContain('matrix.jpg');
  });

  it('affiche l’erreur quand le film est introuvable', async () => {
    const { fixture } = setup({ movie: vi.fn(() => throwError(() => httpError(404))) });
    expect(text(await render(fixture))).toContain('Film introuvable.');
  });

  it('ajoute le film à la liste « à regarder »', async () => {
    const entry: LibraryEntry = { item: makeMovieItem(), watchedEpisodeIds: [] };
    const { fixture, stub } = setup({ entry: vi.fn().mockReturnValueOnce(of(empty)).mockReturnValue(of(entry)) });
    const el = await render(fixture);
    click(el, '.row .btn-primary');
    await fixture.whenStable();
    expect(stub.add).toHaveBeenCalledWith('MOVIE', '603', 'WATCHLIST');
    expect(text(el)).toContain('À regarder');
    expect(text(el)).toContain('Marquer comme vu');
  });

  it('ajoute le film directement comme « déjà vu »', async () => {
    const entry: LibraryEntry = { item: makeMovieItem({ status: 'WATCHED', watchedAt: null }), watchedEpisodeIds: [] };
    const { fixture, stub } = setup({ entry: vi.fn().mockReturnValueOnce(of(empty)).mockReturnValue(of(entry)) });
    const el = await render(fixture);
    click(el, '.row .btn-success');
    await fixture.whenStable();
    expect(stub.add).toHaveBeenCalledWith('MOVIE', '603', 'WATCHED');
    expect(text(el)).toContain('Remettre à regarder');
  });

  it('marque comme vu puis remet à regarder', async () => {
    const { fixture, stub } = setup({ entry: vi.fn(() => of({ item: makeMovieItem(), watchedEpisodeIds: [] })) });
    const el = await render(fixture);
    click(el, '.row .btn-success');
    await fixture.whenStable();
    expect(stub.updateStatus).toHaveBeenCalledWith(9, 'WATCHED');
    expect(text(el)).toMatch(/le 1 \S+ 2026/);

    click(el, '.row .btn:not(.btn-danger)');
    await fixture.whenStable();
    expect(stub.updateStatus).toHaveBeenLastCalledWith(9, 'WATCHLIST');
  });

  it('retire le film de la bibliothèque', async () => {
    const { fixture, stub } = setup({ entry: vi.fn(() => of({ item: makeMovieItem(), watchedEpisodeIds: [] })) });
    const el = await render(fixture);
    click(el, '.btn-danger');
    await fixture.whenStable();
    expect(stub.remove).toHaveBeenCalledWith(9);
    expect(text(el)).toContain('+ À regarder');
  });

  it('affiche l’erreur d’une action qui échoue', async () => {
    const { fixture } = setup({ add: vi.fn(() => throwError(() => httpError(500, { detail: 'Action impossible.' }))) });
    const el = await render(fixture);
    click(el, '.row .btn-primary');
    await fixture.whenStable();
    expect(text(el)).toContain('Action impossible.');
  });

  it('ignore les changements de statut et retraits quand le film n’est pas en bibliothèque', async () => {
    const { fixture, stub } = setup();
    await render(fixture);
    const page = fixture.componentInstance as unknown as { setStatus(s: string): void; remove(): void };
    page.setStatus('WATCHED');
    page.remove();
    expect(stub.updateStatus).not.toHaveBeenCalled();
    expect(stub.remove).not.toHaveBeenCalled();
  });
});
