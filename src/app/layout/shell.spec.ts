import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { makeUser } from '../testing/fixtures';
import { Shell } from './shell';

describe('Shell', () => {
  const setup = async (user = makeUser()) => {
    const auth = { user: signal(user), logout: vi.fn() };
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    return { auth, el: fixture.nativeElement as HTMLElement };
  };

  it('affiche la navigation, le pseudo et les attributions des données', async () => {
    const { el } = await setup(makeUser({ displayName: 'Mouhsin' }));
    expect(Array.from(el.querySelectorAll('nav a')).map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/library',
      '/search',
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
});
