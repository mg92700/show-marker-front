import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { httpError, render, submit, text, type } from '../../testing/helpers';
import { ResetPasswordPage } from './reset-password.page';

describe('ResetPasswordPage', () => {
  const setup = (token: string | undefined, auth: Record<string, unknown> = {}) => {
    const stub = { resetPassword: vi.fn(() => of(undefined)), ...auth };
    TestBed.configureTestingModule({ imports: [ResetPasswordPage], providers: [provideRouter([]), { provide: AuthService, useValue: stub }] });
    const fixture = TestBed.createComponent(ResetPasswordPage);
    if (token) fixture.componentRef.setInput('token', token);
    return { fixture, stub };
  };

  const fill = (el: HTMLElement, password: string, confirm: string) => {
    type(el, '#password', password);
    type(el, '#confirm', confirm);
  };

  it('signale un lien incomplet quand le jeton est absent', async () => {
    const { fixture } = setup(undefined);
    const el = await render(fixture);
    expect(text(el)).toContain('Lien invalide');
    expect(el.querySelector('a[href="/forgot-password"]')).not.toBeNull();
    expect(el.querySelector('form')).toBeNull();
  });

  it('refuse un mot de passe trop court ou non confirmé', async () => {
    const { fixture, stub } = setup('tok');
    const el = await render(fixture);
    fill(el, 'short', 'autre');
    submit(el);
    await fixture.whenStable();
    expect(stub.resetPassword).not.toHaveBeenCalled();
    expect(text(el)).toContain('Corrigez les champs en erreur.');
    expect(text(el)).toContain('8 caractères minimum.');
    expect(text(el)).toContain('Les mots de passe ne correspondent pas.');
  });

  it('change le mot de passe avec le jeton puis propose de se connecter', async () => {
    const { fixture, stub } = setup('tok');
    const el = await render(fixture);
    fill(el, 'new-secret-456', 'new-secret-456');
    submit(el);
    await fixture.whenStable();
    expect(stub.resetPassword).toHaveBeenCalledWith('tok', 'new-secret-456');
    expect(text(el)).toContain('Mot de passe modifié');
    expect(el.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it('affiche l’erreur quand le lien a expiré', async () => {
    const { fixture } = setup('tok', { resetPassword: vi.fn(() => throwError(() => httpError(400, { detail: 'Ce lien est invalide ou a expiré.' }))) });
    const el = await render(fixture);
    fill(el, 'new-secret-456', 'new-secret-456');
    submit(el);
    await fixture.whenStable();
    expect(text(el)).toContain('Ce lien est invalide ou a expiré.');
    expect(el.querySelector('form')).not.toBeNull();
  });
});
