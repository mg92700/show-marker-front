import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { httpError, render, submit, text, type } from '../../testing/helpers';
import { ForgotPasswordPage } from './forgot-password.page';

describe('ForgotPasswordPage', () => {
  const setup = (auth: Record<string, unknown> = {}) => {
    const stub = { forgotPassword: vi.fn(() => of({ message: 'Si un compte existe, un e-mail est envoyé.' })), ...auth };
    TestBed.configureTestingModule({ imports: [ForgotPasswordPage], providers: [provideRouter([]), { provide: AuthService, useValue: stub }] });
    return { fixture: TestBed.createComponent(ForgotPasswordPage), stub };
  };

  it('refuse une adresse invalide', async () => {
    const { fixture, stub } = setup();
    const el = await render(fixture);
    type(el, '#email', 'pas-un-email');
    submit(el);
    await fixture.whenStable();
    expect(stub.forgotPassword).not.toHaveBeenCalled();
    expect(text(el)).toContain('Renseignez une adresse e-mail valide.');
  });

  it('demande le lien et affiche la réponse générique du serveur', async () => {
    const { fixture, stub } = setup();
    const el = await render(fixture);
    type(el, '#email', ' a@b.c ');
    submit(el);
    await fixture.whenStable();
    expect(stub.forgotPassword).toHaveBeenCalledWith('a@b.c');
    expect(text(el)).toContain('Si un compte existe, un e-mail est envoyé.');
  });

  it('affiche l’erreur en cas d’échec', async () => {
    const { fixture } = setup({ forgotPassword: vi.fn(() => throwError(() => httpError(0))) });
    const el = await render(fixture);
    type(el, '#email', 'a@b.c');
    submit(el);
    await fixture.whenStable();
    expect(text(el)).toContain('injoignable');
  });
});
