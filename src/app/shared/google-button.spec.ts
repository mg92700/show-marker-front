import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../core/auth.service';
import { GoogleSignInService } from '../core/google-sign-in';
import { httpError, render, text } from '../testing/helpers';
import { GoogleButton } from './google-button';

describe('GoogleButton', () => {
  const setup = (opts: { clientId?: string | null; providersError?: boolean; loadError?: boolean; login?: unknown; returnUrl?: string } = {}) => {
    const auth = {
      providers: vi.fn(() =>
        opts.providersError ? throwError(() => httpError(500)) : of({ googleClientId: opts.clientId === undefined ? 'client-123' : opts.clientId }),
      ),
      loginWithGoogle: vi.fn(opts.login ? () => opts.login : () => of({})),
    };
    const google = {
      load: vi.fn(() => (opts.loadError ? Promise.reject(new Error('indisponible')) : Promise.resolve())),
      render: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [GoogleButton],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: GoogleSignInService, useValue: google }],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(GoogleButton);
    if (opts.returnUrl) fixture.componentRef.setInput('returnUrl', opts.returnUrl);
    return { fixture, auth, google, navigate };
  };

  it('affiche le bouton Google quand le backend fournit un client ID', async () => {
    const { fixture, google } = setup();
    const el = await render(fixture);
    await fixture.whenStable();
    expect(el.querySelector('.host')).not.toBeNull();
    expect(text(el)).toContain('ou');
    expect(google.load).toHaveBeenCalledTimes(1);
    expect(google.render).toHaveBeenCalledWith(el.querySelector('.host'), 'client-123', expect.any(Function));
  });

  it('ne montre rien quand Google n’est pas configuré', async () => {
    const { fixture, google } = setup({ clientId: null });
    const el = await render(fixture);
    expect(el.querySelector('.host')).toBeNull();
    expect(google.load).not.toHaveBeenCalled();
  });

  it('ne montre rien quand les fournisseurs ne peuvent pas être lus', async () => {
    const { fixture } = setup({ providersError: true });
    const el = await render(fixture);
    expect(el.querySelector('.host')).toBeNull();
  });

  it('signale que Google est indisponible si le script ne se charge pas', async () => {
    const { fixture } = setup({ loadError: true });
    const el = await render(fixture);
    await fixture.whenStable();
    expect(text(el)).toContain('Connexion Google indisponible');
  });

  it('connecte avec le jeton reçu puis redirige (URL de retour sûre)', async () => {
    const { fixture, google, auth, navigate } = setup({ returnUrl: '/library' });
    await render(fixture);
    await fixture.whenStable();
    google.render.mock.calls[0][2]('jeton-google');
    expect(auth.loginWithGoogle).toHaveBeenCalledWith('jeton-google');
    expect(navigate).toHaveBeenCalledWith('/library');
  });

  it('redirige vers l’accueil sans URL de retour', async () => {
    const { fixture, google, navigate } = setup();
    await render(fixture);
    await fixture.whenStable();
    google.render.mock.calls[0][2]('jeton-google');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('affiche l’erreur du serveur si la connexion échoue', async () => {
    const { fixture, google, navigate } = setup({ login: throwError(() => httpError(401, { detail: 'Jeton Google invalide ou expiré.' })) });
    const el = await render(fixture);
    await fixture.whenStable();
    google.render.mock.calls[0][2]('mauvais');
    await fixture.whenStable();
    expect(text(el)).toContain('Jeton Google invalide ou expiré.');
    expect(navigate).not.toHaveBeenCalled();
  });
});
