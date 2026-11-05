import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { httpError, render, submit, text, type } from '../../testing/helpers';
import { RegisterPage } from './register.page';

describe('RegisterPage', () => {
  const setup = (auth: Record<string, unknown> = {}) => {
    const stub = { register: vi.fn(() => of({})), providers: vi.fn(() => of({ googleClientId: null })), ...auth };
    TestBed.configureTestingModule({ imports: [RegisterPage], providers: [provideRouter([]), { provide: AuthService, useValue: stub }, { provide: ApiService, useValue: { showcase: () => of([]) } }] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return { fixture: TestBed.createComponent(RegisterPage), stub, navigate };
  };

  const fill = (el: HTMLElement, o: { name?: string; email?: string; password?: string; confirm?: string } = {}) => {
    type(el, '#displayName', o.name ?? '  Mouhsin ');
    type(el, '#email', o.email ?? 'm@x.fr');
    type(el, '#password', o.password ?? 'secret123');
    type(el, '#confirm', o.confirm ?? 'secret123');
  };

  it('signale les champs invalides sans appeler le serveur', async () => {
    const { fixture, stub } = setup();
    const el = await render(fixture);
    fill(el, { name: '', email: 'nope', password: 'short', confirm: 'autre' });
    submit(el);
    await fixture.whenStable();
    expect(stub.register).not.toHaveBeenCalled();
    const t = text(el);
    expect(t).toContain('Corrigez les champs en erreur.');
    expect(t).toContain('Pseudo obligatoire');
    expect(t).toContain('Email invalide.');
    expect(t).toContain('8 caractères minimum.');
    expect(t).toContain('Les mots de passe ne correspondent pas.');
  });

  it('refuse deux mots de passe différents', async () => {
    const { fixture, stub } = setup();
    const el = await render(fixture);
    fill(el, { confirm: 'different1' });
    submit(el);
    await fixture.whenStable();
    expect(stub.register).not.toHaveBeenCalled();
    expect(text(el)).toContain('Les mots de passe ne correspondent pas.');
  });

  it('crée le compte puis redirige vers l’accueil (session ouverte)', async () => {
    const { fixture, stub, navigate } = setup();
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    expect(stub.register).toHaveBeenCalledWith('m@x.fr', 'secret123', 'Mouhsin');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('affiche l’erreur du serveur (pseudo déjà pris)', async () => {
    const { fixture } = setup({ register: vi.fn(() => throwError(() => httpError(409, { detail: 'Ce pseudo est déjà pris.' }))) });
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    expect(text(el)).toContain('Ce pseudo est déjà pris.');
    expect(el.querySelector('form')).not.toBeNull();
  });
});
