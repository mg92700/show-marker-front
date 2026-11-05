import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../core/auth.service';
import { SocialService } from '../core/social.service';
import { makeUser } from '../testing/fixtures';
import { Shell } from './shell';

describe('Shell', () => {
  const setup = async (user = makeUser(), pending = 0, followers = () => of([])) => {
    const auth = { user: signal(user), logout: vi.fn() };
    const social = { pendingRequests: signal(pending), followers: vi.fn(followers) };
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: SocialService, useValue: social },
      ],
    });
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    return { auth, social, el: fixture.nativeElement as HTMLElement };
  };

  it('affiche la navigation, le pseudo et les attributions des données', async () => {
    const { el } = await setup(makeUser({ displayName: 'Mouhsin' }));
    expect(Array.from(el.querySelectorAll('nav a')).map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/library',
      '/search',
      '/friends',
      '/profile',
    ]);
    expect(el.querySelector('.user-name')?.textContent).toContain('Mouhsin');
    expect(el.querySelector('footer')?.textContent).toContain('TVmaze');
    expect(el.querySelector('footer')?.textContent).toContain('TMDB');
  });

  it('déconnecte l’utilisateur au clic sur « Déconnexion »', async () => {
    const { auth, el } = await setup();
    (el.querySelector('.user button') as HTMLButtonElement).click();
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it('affiche le nombre de demandes de suivi en attente sur l’onglet Amis', async () => {
    const { el, social } = await setup(makeUser(), 2);
    expect(social.followers).toHaveBeenCalledTimes(1);
    const badge = el.querySelector('a[href="/friends"] .nav-badge');
    expect(badge?.textContent?.trim()).toBe('2');
    expect(badge?.getAttribute('aria-label')).toBe('2 demande(s) en attente');
  });

  it('n’affiche aucun badge sans demande, et ignore une erreur de chargement', async () => {
    const { el } = await setup(makeUser(), 0, () => throwError(() => new Error('panne')));
    expect(el.querySelector('.nav-badge')).toBeNull();
  });
});
