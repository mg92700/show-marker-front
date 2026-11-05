import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { FEED_PAGE_SIZE, SocialService } from '../../core/social.service';
import { makeFeedItem, makeUser, makeUserSummary } from '../../testing/fixtures';
import { click, httpError, render, submit, text, type } from '../../testing/helpers';
import { SocialPage } from './social.page';

describe('SocialPage', () => {
  const comment = makeFeedItem({
    id: 31,
    type: 'COMMENTED',
    detail: 'Chef-d’œuvre',
    replies: [
      {
        id: 1,
        userId: 1,
        displayName: 'Alice',
        text: 'Carrément',
        createdAt: '2026-01-03T11:00:00Z',
      },
    ],
  });

  const setup = (extra: Record<string, unknown> = {}) => {
    const social = {
      feed: vi.fn(() => of([makeFeedItem(), comment])),
      following: vi.fn(() =>
        of([
          makeUserSummary({ followStatus: 'ACCEPTED' }),
          makeUserSummary({ id: 4, displayName: 'Dan', followStatus: 'PENDING' }),
        ]),
      ),
      followers: vi.fn(() =>
        of([
          makeUserSummary({ id: 3, displayName: 'Carol', followStatus: 'PENDING' }),
          makeUserSummary({ id: 5, displayName: 'Eve', followStatus: 'ACCEPTED' }),
        ]),
      ),
      searchUsers: vi.fn(() =>
        of([
          makeUserSummary({ id: 6, displayName: 'Fred' }),
          makeUserSummary({ id: 4, displayName: 'Dan', followStatus: 'PENDING' }),
          makeUserSummary({ followStatus: 'ACCEPTED' }),
        ]),
      ),
      follow: vi.fn(() => of(makeUserSummary())),
      unfollow: vi.fn(() => of(undefined)),
      accept: vi.fn(() => of(makeUserSummary())),
      removeFollower: vi.fn(() => of(undefined)),
      reply: vi.fn(() =>
        of({
          id: 2,
          userId: 1,
          displayName: 'Alice',
          text: 'Merci',
          createdAt: '2026-01-03T12:00:00Z',
        }),
      ),
      ...extra,
    };
    TestBed.configureTestingModule({
      imports: [SocialPage],
      providers: [
        provideRouter([]),
        { provide: SocialService, useValue: social },
        { provide: AuthService, useValue: { user: signal(makeUser()) } },
      ],
    });
    return { fixture: TestBed.createComponent(SocialPage), social };
  };

  it('affiche le fil, les demandes, les abonnements et les abonnés', async () => {
    const { fixture } = setup();
    const el = await render(fixture);
    const t = text(el);
    expect(t).toContain('Bob a vu le film The Matrix');
    expect(t).toContain('Bob a commenté The Matrix');
    expect(el.querySelector('.comment')?.textContent).toContain('Chef-d’œuvre');
    expect(text(el.querySelector('.reply') as HTMLElement)).toContain('Alice Carrément');
    expect(text(el.querySelector('.request') as HTMLElement)).toContain('Carol');
    expect(t).toContain('En attente');
    expect(text(el.querySelector('.follower') as HTMLElement)).toContain('Eve');
    expect(el.querySelector('.feed-item a.media-link')?.getAttribute('href')).toBe('/movies/603');
  });

  it('affiche les états vides et un titre retiré sans lien', async () => {
    const { fixture } = setup({
      feed: vi.fn(() => of([])),
      following: vi.fn(() => of([])),
      followers: vi.fn(() => of([])),
    });
    const t = text(await render(fixture));
    expect(t).toContain("Rien pour l'instant");
    expect(t).toContain('Vous ne suivez personne.');
    expect(t).toContain("Personne ne vous suit pour l'instant.");
    expect(t).not.toContain('Demandes reçues');

    TestBed.resetTestingModule();
    const removed = setup({
      feed: vi.fn(() => of([makeFeedItem({ externalId: null, posterUrl: null })])),
    });
    const el = await render(removed.fixture);
    expect(el.querySelector('.feed-item a.media-link')).toBeNull();
    expect(el.querySelector('.feed-item img')).toBeNull();
    expect(text(el)).toContain('The Matrix');
  });

  it('affiche un indicateur de chargement puis l’erreur de chargement', async () => {
    const loading = setup({ feed: vi.fn(() => NEVER) });
    expect((await render(loading.fixture)).querySelector('.spinner')).not.toBeNull();

    TestBed.resetTestingModule();
    const failing = setup({ feed: vi.fn(() => throwError(() => httpError(500))) });
    const el = await render(failing.fixture);
    expect(text(el)).toContain('Impossible de charger la page Amis.');
    expect(el.querySelector('.spinner')).toBeNull();
  });

  it('accepte et refuse les demandes, retire un abonné et annule un abonnement', async () => {
    const { fixture, social } = setup();
    const el = await render(fixture);
    click(el, '.request .btn-success');
    expect(social.accept).toHaveBeenCalledWith(3);
    await fixture.whenStable();
    click(el, '.request .btn-ghost');
    expect(social.removeFollower).toHaveBeenCalledWith(3);
    click(el, '.follower button');
    expect(social.removeFollower).toHaveBeenCalledWith(5);
    const following = el.querySelectorAll('.following button');
    expect(text(following[0] as HTMLElement)).toBe('Ne plus suivre');
    expect(text(following[1] as HTMLElement)).toBe('Annuler');
    (following[1] as HTMLButtonElement).click();
    expect(social.unfollow).toHaveBeenCalledWith(4);
    expect(social.feed).toHaveBeenCalledTimes(5);
    expect(social.searchUsers).not.toHaveBeenCalled();
  });

  it('recherche des utilisateurs et propose l’action adaptée à chacun', async () => {
    const { fixture, social } = setup();
    const el = await render(fixture);
    type(el, '.search input', ' fr ');
    submit(el, '.search');
    await fixture.whenStable();
    expect(social.searchUsers).toHaveBeenCalledWith('fr');
    const results = Array.from(el.querySelectorAll('.result')).map((r) => text(r as HTMLElement));
    expect(results[0]).toBe('Fred Suivre');
    expect(results[1]).toMatch(/^Dan\s?Demande envoyée Annuler$/);
    expect(results[2]).toBe('Bob Ne plus suivre');

    click(el, '.result .btn-primary');
    await fixture.whenStable();
    expect(social.follow).toHaveBeenCalledWith(6);
    // Les résultats sont rafraîchis après l'action.
    expect(social.searchUsers).toHaveBeenCalledTimes(2);
    (el.querySelectorAll('.result button')[1] as HTMLButtonElement).click();
    (el.querySelectorAll('.result button')[2] as HTMLButtonElement).click();
    expect(social.unfollow).toHaveBeenCalledTimes(2);
  });

  it('signale une recherche sans résultat et une erreur de recherche', async () => {
    const { fixture, social } = setup({ searchUsers: vi.fn(() => of([])) });
    const el = await render(fixture);
    submit(el, '.search');
    await fixture.whenStable();
    expect(text(el)).toContain('Aucun utilisateur trouvé');

    social.searchUsers.mockReturnValue(throwError(() => httpError(500, { detail: 'Panne.' })));
    submit(el, '.search');
    await fixture.whenStable();
    expect(text(el)).toContain('Panne.');
  });

  it('affiche l’erreur d’une action', async () => {
    const { fixture } = setup({
      accept: vi.fn(() => throwError(() => httpError(404, { detail: 'Demande introuvable.' }))),
    });
    const el = await render(fixture);
    click(el, '.request .btn-success');
    await fixture.whenStable();
    expect(text(el)).toContain('Demande introuvable.');
    expect((el.querySelector('.request .btn-success') as HTMLButtonElement).disabled).toBe(false);
  });

  it('répond à un commentaire et ajoute la réponse sous celui-ci', async () => {
    const { fixture, social } = setup();
    const el = await render(fixture);
    type(el, '.reply-form input', '  Merci  ');
    submit(el, '.reply-form');
    await fixture.whenStable();
    expect(social.reply).toHaveBeenCalledWith(31, 'Merci');
    const replies = Array.from(el.querySelectorAll('.reply')).map((r) => text(r as HTMLElement));
    expect(replies.length).toBe(2);
    expect(replies[0]).toContain('Alice Carrément');
    expect(replies[1]).toContain('Alice Merci');
    expect((el.querySelector('.reply-form input') as HTMLInputElement).value).toBe('');

    // Réponse vide ignorée ; une erreur est affichée.
    submit(el, '.reply-form');
    expect(social.reply).toHaveBeenCalledTimes(1);
    social.reply.mockReturnValue(
      throwError(() => httpError(404, { detail: 'Commentaire introuvable.' })),
    );
    type(el, '.reply-form input', 'Encore');
    submit(el, '.reply-form');
    await fixture.whenStable();
    expect(text(el)).toContain('Commentaire introuvable.');
  });

  it('charge la page suivante du fil avec « Voir plus » jusqu’à épuisement', async () => {
    const full = Array.from({ length: FEED_PAGE_SIZE }, (_, i) => makeFeedItem({ id: i + 1 }));
    const feed = vi.fn((page = 0) =>
      of(page === 0 ? full : [makeFeedItem({ id: 100, title: 'Dernier' })]),
    );
    const { fixture } = setup({ feed });
    const el = await render(fixture);
    expect(el.querySelectorAll('.feed-item').length).toBe(FEED_PAGE_SIZE);
    click(el, '.more');
    await fixture.whenStable();
    expect(feed).toHaveBeenLastCalledWith(1);
    expect(el.querySelectorAll('.feed-item').length).toBe(FEED_PAGE_SIZE + 1);
    expect(el.querySelector('.more')).toBeNull();
  });

  it('ne propose pas « Voir plus » pour une page incomplète, et affiche une erreur de pagination', async () => {
    const short = setup();
    expect((await render(short.fixture)).querySelector('.more')).toBeNull();

    TestBed.resetTestingModule();
    const full = Array.from({ length: FEED_PAGE_SIZE }, (_, i) => makeFeedItem({ id: i + 1 }));
    const feed = vi.fn((page = 0) =>
      page === 0 ? of(full) : throwError(() => httpError(500, { detail: 'Échec.' })),
    );
    const failing = setup({ feed });
    const el = await render(failing.fixture);
    click(el, '.more');
    await failing.fixture.whenStable();
    expect(text(el)).toContain('Échec.');
    expect(el.querySelectorAll('.feed-item').length).toBe(FEED_PAGE_SIZE);
  });
});
