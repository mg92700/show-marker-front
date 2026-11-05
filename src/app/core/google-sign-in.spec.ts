import { TestBed } from '@angular/core/testing';

import { GoogleSignInService } from './google-sign-in';

describe('GoogleSignInService', () => {
  const scripts = () => Array.from(document.head.querySelectorAll('script[src*="accounts.google.com/gsi/client"]'));

  afterEach(() => {
    scripts().forEach((s) => s.remove());
    delete window.google;
  });

  it('ajoute le script une seule fois et se résout quand il est chargé', async () => {
    const service = TestBed.inject(GoogleSignInService);
    const first = service.load();
    const second = service.load();
    expect(scripts().length).toBe(1);
    scripts()[0].dispatchEvent(new Event('load'));
    await expect(Promise.all([first, second])).resolves.toBeDefined();
  });

  it('se résout aussitôt si Google est déjà chargé', async () => {
    window.google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
    await expect(TestBed.inject(GoogleSignInService).load()).resolves.toBeUndefined();
    expect(scripts().length).toBe(0);
  });

  it('échoue puis permet de réessayer si le script ne se charge pas', async () => {
    const service = TestBed.inject(GoogleSignInService);
    const failed = service.load();
    scripts()[0].dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow();
    expect(scripts().length).toBe(0);

    const retry = service.load();
    expect(scripts().length).toBe(1);
    scripts()[0].dispatchEvent(new Event('load'));
    await expect(retry).resolves.toBeUndefined();
  });

  it('initialise Google puis affiche le bouton, et relaie le jeton reçu', () => {
    const initialize = vi.fn();
    const renderButton = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };
    const onCredential = vi.fn();
    const host = document.createElement('div');

    TestBed.inject(GoogleSignInService).render(host, 'client-123', onCredential);

    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'client-123' }));
    expect(renderButton).toHaveBeenCalledWith(host, expect.objectContaining({ text: 'continue_with' }));
    initialize.mock.calls[0][0].callback({ credential: 'jeton' });
    expect(onCredential).toHaveBeenCalledWith('jeton');
  });

  it('refuse d’afficher le bouton si Google n’est pas chargé', () => {
    expect(() => TestBed.inject(GoogleSignInService).render(document.createElement('div'), 'x', vi.fn())).toThrow();
  });
});
