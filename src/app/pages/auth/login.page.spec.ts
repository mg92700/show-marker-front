import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { httpError, render, submit, text, type } from '../../testing/helpers';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  const setup = (auth: Record<string, unknown> = {}, inputs: Record<string, string> = {}) => {
    const stub = { login: vi.fn(() => of({})), providers: vi.fn(() => of({ googleClientId: null })), ...auth };
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

  it('propose de créer un compte', async () => {
    const { fixture } = setup();
    const el = await render(fixture);
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

  it('affiche l’erreur du serveur', async () => {
    const { fixture } = setup({ login: vi.fn(() => throwError(() => httpError(401, { detail: 'Email ou mot de passe incorrect.' }))) });
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    expect(text(el)).toContain('Email ou mot de passe incorrect.');
  });
});
