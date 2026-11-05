import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AccountService } from '../../core/account.service';
import { AuthService } from '../../core/auth.service';
import { makeUser } from '../../testing/fixtures';
import { httpError, render, submit, text, type } from '../../testing/helpers';
import { AccountSettings } from './account-settings';

describe('AccountSettings', () => {
  const setup = (account: Record<string, unknown> = {}, user: ReturnType<typeof makeUser> | null = makeUser({ displayName: 'Mouhsin' })) => {
    const stub = {
      updateDisplayName: vi.fn((name: string) => of(makeUser({ displayName: name }))),
      changePassword: vi.fn(() => of(undefined)),
      ...account,
    };
    TestBed.configureTestingModule({
      imports: [AccountSettings],
      providers: [
        { provide: AccountService, useValue: stub },
        { provide: AuthService, useValue: { user: signal(user) } },
      ],
    });
    return { fixture: TestBed.createComponent(AccountSettings), stub };
  };
  const form = (el: HTMLElement, n: number) => `form:nth-of-type(${n})`;

  describe('pseudo', () => {
    it('est prérempli et le bouton est désactivé tant que rien ne change', async () => {
      const { fixture } = setup();
      const el = await render(fixture);
      expect((el.querySelector('#set-displayName') as HTMLInputElement).value).toBe('Mouhsin');
      expect((el.querySelector('form button') as HTMLButtonElement).disabled).toBe(true);
    });

    it('démarre vide sans utilisateur connecté', async () => {
      const { fixture } = setup({}, null);
      const el = await render(fixture);
      expect((el.querySelector('#set-displayName') as HTMLInputElement).value).toBe('');
    });

    it('enregistre un nouveau pseudo', async () => {
      const { fixture, stub } = setup();
      const el = await render(fixture);
      type(el, '#set-displayName', '  Neo ');
      await fixture.whenStable();
      submit(el, form(el, 1));
      await fixture.whenStable();
      expect(stub.updateDisplayName).toHaveBeenCalledWith('Neo');
      expect(text(el)).toContain('Pseudo mis à jour.');
      expect((el.querySelector('#set-displayName') as HTMLInputElement).value).toBe('Neo');
    });

    it('refuse un pseudo vide et affiche l’erreur de champ', async () => {
      const { fixture, stub } = setup();
      const el = await render(fixture);
      type(el, '#set-displayName', '');
      submit(el, form(el, 1));
      await fixture.whenStable();
      expect(stub.updateDisplayName).not.toHaveBeenCalled();
      expect(text(el)).toContain('Pseudo obligatoire');
    });

    it('ne soumet pas un pseudo inchangé', async () => {
      const { fixture, stub } = setup();
      const el = await render(fixture);
      submit(el, form(el, 1));
      expect(stub.updateDisplayName).not.toHaveBeenCalled();
    });

    it('affiche l’erreur serveur (pseudo déjà pris)', async () => {
      const { fixture } = setup({ updateDisplayName: vi.fn(() => throwError(() => httpError(409, { detail: 'Pseudo déjà pris.' }))) });
      const el = await render(fixture);
      type(el, '#set-displayName', 'Pris');
      submit(el, form(el, 1));
      await fixture.whenStable();
      expect(text(el)).toContain('Pseudo déjà pris.');
      expect(el.querySelector('.alert-error')).not.toBeNull();
    });

    it('utilise un message par défaut si le serveur n’en donne pas', async () => {
      const { fixture } = setup({ updateDisplayName: vi.fn(() => throwError(() => httpError(500))) });
      const el = await render(fixture);
      type(el, '#set-displayName', 'Autre');
      submit(el, form(el, 1));
      await fixture.whenStable();
      expect(text(el)).toContain('Impossible de modifier le pseudo.');
    });
  });

  describe('mot de passe', () => {
    const fill = (el: HTMLElement, current: string, next: string, confirm: string) => {
      type(el, '#set-current', current);
      type(el, '#set-new', next);
      type(el, '#set-confirm', confirm);
    };

    it('modifie le mot de passe et vide le formulaire', async () => {
      const { fixture, stub } = setup();
      const el = await render(fixture);
      fill(el, 'ancien123', 'nouveau123', 'nouveau123');
      submit(el, form(el, 2));
      await fixture.whenStable();
      expect(stub.changePassword).toHaveBeenCalledWith('ancien123', 'nouveau123');
      expect(text(el)).toContain('Mot de passe modifié.');
      expect((el.querySelector('#set-new') as HTMLInputElement).value).toBe('');
    });

    it('refuse un mot de passe trop court', async () => {
      const { fixture, stub } = setup();
      const el = await render(fixture);
      fill(el, 'ancien123', 'court', 'court');
      submit(el, form(el, 2));
      await fixture.whenStable();
      expect(stub.changePassword).not.toHaveBeenCalled();
      expect(text(el)).toContain('8 caractères minimum.');
    });

    it('refuse une confirmation différente', async () => {
      const { fixture, stub } = setup();
      const el = await render(fixture);
      fill(el, 'ancien123', 'nouveau123', 'autre12345');
      submit(el, form(el, 2));
      await fixture.whenStable();
      expect(stub.changePassword).not.toHaveBeenCalled();
      expect(text(el)).toContain('Les mots de passe ne correspondent pas.');
    });

    it('affiche l’erreur serveur', async () => {
      const { fixture } = setup({ changePassword: vi.fn(() => throwError(() => httpError(400, { detail: 'Ancien mot de passe incorrect.' }))) });
      const el = await render(fixture);
      fill(el, 'faux12345', 'nouveau123', 'nouveau123');
      submit(el, form(el, 2));
      await fixture.whenStable();
      expect(text(el)).toContain('Ancien mot de passe incorrect.');
    });

    it('utilise un message par défaut si le serveur n’en donne pas', async () => {
      const { fixture } = setup({ changePassword: vi.fn(() => throwError(() => httpError(500))) });
      const el = await render(fixture);
      fill(el, 'ancien123', 'nouveau123', 'nouveau123');
      submit(el, form(el, 2));
      await fixture.whenStable();
      expect(text(el)).toContain('Impossible de modifier le mot de passe.');
    });
  });
});
