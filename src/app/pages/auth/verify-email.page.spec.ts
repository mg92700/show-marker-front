import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { httpError, render, text } from '../../testing/helpers';
import { VerifyEmailPage } from './verify-email.page';

describe('VerifyEmailPage', () => {
  const setup = (token: string | undefined, opts: { authenticated?: boolean; verify?: () => unknown } = {}) => {
    const stub = {
      verifyEmail: vi.fn(opts.verify ?? (() => of(undefined))),
      isAuthenticated: signal(opts.authenticated ?? false),
      loadSession: vi.fn(() => Promise.resolve(null)),
    };
    TestBed.configureTestingModule({ imports: [VerifyEmailPage], providers: [provideRouter([]), { provide: AuthService, useValue: stub }] });
    const fixture = TestBed.createComponent(VerifyEmailPage);
    if (token) fixture.componentRef.setInput('token', token);
    return { fixture, stub };
  };

  it('affiche une erreur sans appeler le serveur quand le jeton est absent', async () => {
    const { fixture, stub } = setup(undefined);
    const el = await render(fixture);
    expect(stub.verifyEmail).not.toHaveBeenCalled();
    expect(text(el)).toContain('Lien invalide');
  });

  it('affiche l’attente pendant la vérification', async () => {
    const { fixture } = setup('tok', { verify: () => NEVER });
    const el = await render(fixture);
    expect(text(el)).toContain('Vérification…');
  });

  it('confirme l’adresse et propose la connexion à un visiteur', async () => {
    const { fixture, stub } = setup('tok');
    const el = await render(fixture);
    expect(stub.verifyEmail).toHaveBeenCalledWith('tok');
    expect(text(el)).toContain('Adresse confirmée');
    expect(el.querySelector('a[href="/login"]')).not.toBeNull();
    expect(stub.loadSession).not.toHaveBeenCalled();
  });

  it('recharge la session et ramène au profil quand l’utilisateur est connecté (changement d’adresse)', async () => {
    const { fixture, stub } = setup('tok', { authenticated: true });
    const el = await render(fixture);
    expect(stub.loadSession).toHaveBeenCalledTimes(1);
    expect(el.querySelector('a[href="/profile"]')).not.toBeNull();
  });

  it('affiche l’erreur du serveur quand le lien est invalide ou expiré', async () => {
    const { fixture } = setup('tok', { verify: () => throwError(() => httpError(400, { detail: 'Ce lien est invalide ou a expiré.' })) });
    const el = await render(fixture);
    expect(text(el)).toContain('Lien invalide');
    expect(text(el)).toContain('Ce lien est invalide ou a expiré.');
  });
});
