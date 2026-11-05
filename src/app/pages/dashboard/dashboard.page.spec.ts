import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Dashboard } from '../../core/models';
import { makeActivity, makeDashboard, makeEpisode, makeItem, makeMovieItem, makeRecentEpisode, makeUser } from '../../testing/fixtures';
import { click, httpError, render, text } from '../../testing/helpers';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  const setup = (dashboard: () => unknown, extra: Record<string, unknown> = {}) => {
    const api = { dashboard: vi.fn(dashboard), setEpisodes: vi.fn(() => of({})), ...extra };
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { user: signal(makeUser({ displayName: 'Mouhsin' })) } },
      ],
    });
    return { fixture: TestBed.createComponent(DashboardPage), api };
  };

  it('affiche un indicateur de chargement tant que les données arrivent', async () => {
    const { fixture } = setup(() => NEVER);
    const el = await render(fixture);
    expect(el.querySelector('.spinner')).not.toBeNull();
    expect(text(el)).toContain('Bonjour Mouhsin');
  });

  it('affiche statistiques, prochains épisodes, séries, films, épisodes récents et activités', async () => {
    const { fixture } = setup(() => of(makeDashboard()));
    const el = await render(fixture);
    const t = text(el);
    expect(t).toContain('55%');
    expect(t).toContain('À regarder ensuite');
    expect(t).toContain('S01E02');
    expect(t).toContain('1 / 4 épisodes');
    expect(t).toContain('The Matrix');
    expect(t).toContain('1999');
    expect(t).toContain('S01E01');
    expect(t).toContain('Vous a ajouté la série');
    expect(el.querySelector('.spinner')).toBeNull();
  });

  it('affiche les messages vides quand il n’y a rien', async () => {
    const empty: Dashboard = makeDashboard({ watching: [], upNext: [], recentEpisodes: [], movieWatchlist: [], recentActivity: [] });
    const { fixture } = setup(() => of(empty));
    const t = text(await render(fixture));
    expect(t).toContain('Aucun épisode en attente');
    expect(t).toContain('Aucune série en cours.');
    expect(t).toContain('Votre liste de films est vide.');
    expect(t).toContain("Aucun épisode regardé pour l'instant.");
    expect(t).toContain('Aucune activité récente.');
  });

  it('gère les contenus sans affiche, sans progression ni année', async () => {
    const noProgress = makeItem({ id: 7, posterUrl: null, progress: null, title: 'Sans progression' });
    const noTotal = makeItem({ id: 8, title: 'Total inconnu', progress: { watched: 3, total: null, percent: 0, nextEpisode: null } });
    const dashboard = makeDashboard({
      watching: [noProgress, noTotal],
      upNext: [{ show: noProgress, episode: makeEpisode() }],
      movieWatchlist: [makeMovieItem({ year: null, posterUrl: null })],
      recentEpisodes: [makeRecentEpisode({ posterUrl: null })],
    });
    const { fixture } = setup(() => of(dashboard));
    const el = await render(fixture);
    expect(text(el)).toContain('Sans progression');
    expect(text(el)).toContain('Total inconnu');
    expect(el.querySelectorAll('.up-card img').length).toBe(0);
  });

  it('affiche chaque type d’activité', async () => {
    const activities = [
      makeActivity({ id: 1, type: 'REMOVED' }),
      makeActivity({ id: 2, type: 'STATUS_CHANGED', detail: 'COMPLETED' }),
      makeActivity({ id: 3, type: 'MOVIE_WATCHED', mediaType: 'MOVIE' }),
    ];
    const { fixture } = setup(() => of(makeDashboard({ recentActivity: activities })));
    const t = text(await render(fixture));
    expect(t).toContain('a retiré');
    expect(t).toContain('est passé à « Terminée »');
    expect(t).toContain('a vu le film');
  });

  it('affiche l’erreur de chargement', async () => {
    const { fixture } = setup(() => throwError(() => httpError(500)));
    const el = await render(fixture);
    expect(text(el)).toContain('Impossible de charger le tableau de bord.');
    expect(el.querySelector('.spinner')).toBeNull();
  });

  it('marque l’épisode comme vu puis recharge le tableau de bord', async () => {
    const { fixture, api } = setup(() => of(makeDashboard()));
    const el = await render(fixture);
    click(el, '.up-card button');
    await fixture.whenStable();
    expect(api.setEpisodes).toHaveBeenCalledWith(5, ['12'], true);
    expect(api.dashboard).toHaveBeenCalledTimes(2);
  });

  it('affiche l’erreur si le marquage échoue', async () => {
    const { fixture, api } = setup(() => of(makeDashboard()), { setEpisodes: vi.fn(() => throwError(() => httpError(500, { detail: 'Échec.' }))) });
    const el = await render(fixture);
    click(el, '.up-card button');
    await fixture.whenStable();
    expect(text(el)).toContain('Échec.');
    expect(api.dashboard).toHaveBeenCalledTimes(1);
  });
});
