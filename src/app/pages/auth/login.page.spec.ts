import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { click, httpError, render, submit, text, type } from '../../testing/helpers';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  const setup = (auth: Record<string, unknown> = {}, inputs: Record<string, string> = {}) => {
    const stub = { login: vi.fn(() => of({})), resendVerification: vi.fn(() => of({ message: 'Mail renvoyé.' })), ...auth };
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: stub }],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    return { fixture, stub, navigate };
  };

  const fill = (el: HTMLElement, email = 'a@b.c', password = 'secret123') => {
    type(el, '#email', email);
    type(el, '#password', password);
  };

  it('affiche le lien « Mot de passe oublié » et l’invitation à créer un compte', async () => {
    const { fixture } = setup();
    const el = await render(fixture);
    expect(el.querySelector('a.forgot')?.getAttribute('href')).toBe('/forgot-password');
    expect(el.querySelector('.switch a')?.getAttribute('href')).toBe('/register');
  });

  it('informe que la session a expiré', async () => {
    const { fixture } = setup({}, { expired: '1' });
    const el = await render(fixture);
    expect(text(el)).toContain('Votre session a expiré');
  });

  it('refuse un formulaire invalide sans appeler le serveur', async () => {
    const { fixture, stub } = setup();
    const el = await render(fixture);
    fill(el, 'pas-un-email', '');
    submit(el);
    await fixture.whenStable();
    expect(stub.login).not.toHaveBeenCalled();
    expect(text(el)).toContain('Renseignez un email valide');
  });

  it('connecte puis redirige vers l’accueil', async () => {
    const { fixture, stub, navigate } = setup();
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    expect(stub.login).toHaveBeenCalledWith('a@b.c', 'secret123');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('redirige vers l’URL demandée si elle est interne', async () => {
    const { fixture, navigate } = setup({}, { returnUrl: '/library' });
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/library');
  });

  it.each(['//evil.example', 'https://evil.example', 'library'])('ignore l’URL de retour non sûre %s', async (url) => {
    const { fixture, navigate } = setup({}, { returnUrl: url });
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('affiche l’erreur du serveur sans proposer de renvoi', async () => {
    const { fixture } = setup({ login: vi.fn(() => throwError(() => httpError(401, { detail: 'Email ou mot de passe incorrect.' }))) });
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    expect(text(el)).toContain('Email ou mot de passe incorrect.');
    expect(text(el)).not.toContain('Renvoyer');
  });

  it('propose de renvoyer l’e-mail quand l’adresse n’est pas confirmée', async () => {
    const { fixture, stub } = setup({
      login: vi.fn(() => throwError(() => httpError(403, { detail: 'Confirmez votre adresse e-mail.', code: 'EMAIL_NOT_VERIFIED' }))),
    });
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    expect(text(el)).toContain('Renvoyer l\'e-mail de confirmation');

    click(el, '.alert-error + button');
    await fixture.whenStable();
    expect(stub.resendVerification).toHaveBeenCalledWith('a@b.c');
    expect(text(el)).toContain('Mail renvoyé.');
    expect(el.querySelector('.alert-error')).toBeNull();
  });

  it('affiche l’erreur si le renvoi échoue', async () => {
    const { fixture } = setup({
      login: vi.fn(() => throwError(() => httpError(403, { detail: 'Confirmez.', code: 'EMAIL_NOT_VERIFIED' }))),
      resendVerification: vi.fn(() => throwError(() => httpError(500))),
    });
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    click(el, '.alert-error + button');
    await fixture.whenStable();
    expect(text(el)).toContain("Impossible de renvoyer l'e-mail.");
  });
});
