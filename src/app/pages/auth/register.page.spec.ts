import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { click, httpError, render, submit, text, type } from '../../testing/helpers';
import { RegisterPage } from './register.page';

describe('RegisterPage', () => {
  const setup = (auth: Record<string, unknown> = {}) => {
    const stub = {
      register: vi.fn(() => of({ message: 'ok' })),
      resendVerification: vi.fn(() => of({ message: 'Un nouvel e-mail vient d’être envoyé.' })),
      ...auth,
    };
    TestBed.configureTestingModule({ imports: [RegisterPage], providers: [provideRouter([]), { provide: AuthService, useValue: stub }] });
    return { fixture: TestBed.createComponent(RegisterPage), stub };
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

  it('crée le compte puis invite à vérifier ses e-mails (sans connexion automatique)', async () => {
    const { fixture, stub } = setup();
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    expect(stub.register).toHaveBeenCalledWith('m@x.fr', 'secret123', 'Mouhsin');
    expect(text(el)).toContain('Vérifiez vos e-mails');
    expect(text(el)).toContain('m@x.fr');
    expect(el.querySelector('form')).toBeNull();
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

  it('permet de renvoyer l’e-mail de confirmation', async () => {
    const { fixture, stub } = setup();
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    click(el, 'button.btn-block');
    await fixture.whenStable();
    expect(stub.resendVerification).toHaveBeenCalledWith('m@x.fr');
    expect(text(el)).toContain('Un nouvel e-mail vient d’être envoyé.');
  });

  it('affiche l’erreur si le renvoi échoue', async () => {
    const { fixture } = setup({ resendVerification: vi.fn(() => throwError(() => httpError(500))) });
    const el = await render(fixture);
    fill(el);
    submit(el);
    await fixture.whenStable();
    click(el, 'button.btn-block');
    await fixture.whenStable();
    expect(text(el)).toContain("Impossible de renvoyer l'e-mail.");
  });
});
