import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import { ApiService } from '../core/api.service';
import { ShowcaseItem } from '../core/models';
import { httpError, render, text } from '../testing/helpers';
import { PosterWall } from './poster-wall';

describe('PosterWall', () => {
  const poster = (i: number): ShowcaseItem => ({ title: `Titre ${i}`, posterUrl: `https://img/${i}.jpg` });

  const setup = (showcase: () => unknown) => {
    TestBed.configureTestingModule({ imports: [PosterWall], providers: [{ provide: ApiService, useValue: { showcase: vi.fn(showcase) } }] });
    return TestBed.createComponent(PosterWall);
  };

  it('répartit les affiches en 4 rangées qui bouclent sans trou', async () => {
    const el = await render(setup(() => of(Array.from({ length: 30 }, (_, i) => poster(i)))));
    const lanes = el.querySelectorAll('.lane');
    expect(lanes.length).toBe(4);
    expect(el.querySelectorAll('.lane.reverse').length).toBe(2);
    // chaque rangée est dupliquée pour la boucle, et compte au moins 14 affiches avant duplication
    for (const lane of Array.from(lanes)) {
      expect(lane.querySelectorAll('img').length).toBeGreaterThanOrEqual(28);
    }
    expect(el.querySelector('.wall')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('remplit toutes les rangées même avec moins de 4 affiches', async () => {
    const el = await render(setup(() => of([poster(1), poster(2)])));
    expect(el.querySelectorAll('.lane').length).toBe(4);
    for (const lane of Array.from(el.querySelectorAll('.lane'))) {
      expect(lane.querySelectorAll('img').length).toBeGreaterThanOrEqual(28);
    }
  });

  it('mentionne la source des affiches (TVmaze, TMDB)', async () => {
    const el = await render(setup(() => of([poster(1)])));
    expect(text(el)).toContain('TVmaze et TMDB');
    expect(text(el)).toContain('n\'est ni approuvé ni certifié par TMDB');
  });

  it('n’affiche rien sans affiche', async () => {
    const el = await render(setup(() => of([])));
    expect(el.querySelector('.wall')).toBeNull();
    expect(text(el)).toBe('');
  });

  it('n’affiche rien tant que les affiches arrivent', async () => {
    expect((await render(setup(() => NEVER))).querySelector('.wall')).toBeNull();
  });

  it('n’affiche rien si le chargement échoue', async () => {
    expect((await render(setup(() => throwError(() => httpError(500))))).querySelector('.wall')).toBeNull();
  });
});
