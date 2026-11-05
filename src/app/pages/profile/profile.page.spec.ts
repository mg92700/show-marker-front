import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AccountService } from '../../core/account.service';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { makeDashboard, makeMovieItem, makeUser } from '../../testing/fixtures';
import { click, render, text } from '../../testing/helpers';
import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  const setup = (movies = [makeMovieItem()], user: ReturnType<typeof makeUser> | null = makeUser({ displayName: 'mouhsin' })) => {
    const auth = { user: signal(user), logout: vi.fn() };
    const api = { dashboard: vi.fn(() => of(makeDashboard())), library: vi.fn(() => of(movies)) };
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }, { provide: AuthService, useValue: auth }, { provide: AccountService, useValue: {} }],
    });
    return { fixture: TestBed.createComponent(ProfilePage), auth, api };
  };

  it('affiche l’identité, les statistiques et les réglages du compte', async () => {
    const { fixture, api } = setup();
    const el = await render(fixture);
    const t = text(el);
    expect(t).toContain('mouhsin');
    expect(el.querySelector('.avatar')?.textContent?.trim()).toBe('M');
    expect(t).toContain('Membre depuis le');
    expect(t).toContain('séries suivies');
    expect(t).toContain('55%');
    expect(el.querySelector('app-account-settings')).not.toBeNull();
    expect(api.library).toHaveBeenCalledWith('MOVIE', 'WATCHED');
  });

  it('trie l’historique du plus récent au plus ancien, avec ou sans date', async () => {
    const movies = [
      makeMovieItem({ id: 1, title: 'Ancien', watchedAt: '2020-01-01T00:00:00Z' }),
      makeMovieItem({ id: 2, title: 'Récent', watchedAt: '2024-01-01T00:00:00Z' }),
      makeMovieItem({ id: 3, title: 'Sans date', watchedAt: null }),
    ];
    const { fixture } = setup(movies);
    const el = await render(fixture);
    const titles = Array.from(el.querySelectorAll('app-poster-card')).map((c) => text(c as HTMLElement));
    expect(titles[0]).toContain('Récent');
    expect(titles[1]).toContain('Ancien');
    expect(titles[2]).toContain('Sans date');
    expect(text(el)).toContain('Vu le');
  });

  it('indique quand aucun film n’a été vu', async () => {
    const { fixture } = setup([]);
    expect(text(await render(fixture))).toContain('Aucun film marqué comme vu.');
  });

  it('se déconnecte', async () => {
    const { fixture, auth } = setup();
    const el = await render(fixture);
    click(el, '.profile button');
    expect(auth.logout).toHaveBeenCalled();
  });

  it('ne montre pas la carte d’identité sans utilisateur', async () => {
    const { fixture } = setup([], null);
    const el = await render(fixture);
    expect(el.querySelector('.profile')).toBeNull();
  });
});
