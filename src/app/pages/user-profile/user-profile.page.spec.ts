import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { FEED_PAGE_SIZE, SocialService } from '../../core/social.service';
import { makeFeedItem, makeProfile, makeUser } from '../../testing/fixtures';
import { click, httpError, render, text } from '../../testing/helpers';
import { UserProfilePage } from './user-profile.page';

describe('UserProfilePage', () => {
  const setup = (extra: Record<string, unknown> = {}, id = '2') => {
    const social = {
      profile: vi.fn(() => of(makeProfile({ followStatus: 'ACCEPTED', activityVisible: true }))),
      userActivity: vi.fn(() => of([makeFeedItem()])),
      follow: vi.fn(() => of({})),
      unfollow: vi.fn(() => of(undefined)),
      reply: vi.fn(),
      deleteComment: vi.fn(),
      deleteReply: vi.fn(),
      ...extra,
    };
    TestBed.configureTestingModule({
      imports: [UserProfilePage],
      providers: [
        provideRouter([]),
        { provide: SocialService, useValue: social },
        { provide: AuthService, useValue: { user: signal(makeUser({ id: 1 })) } },
      ],
    });
    const fixture = TestBed.createComponent(UserProfilePage);
    fixture.componentRef.setInput('id', id);
    return { fixture, social };
  };

  it('affiche le profil et l’activité d’un utilisateur suivi', async () => {
    const { fixture, social } = setup();
    const el = await render(fixture);
    expect(social.profile).toHaveBeenCalledWith(2);
    expect(social.userActivity).toHaveBeenCalledWith(2);
    const t = text(el);
    expect(t).toContain('Bob');
    expect(t).toContain('3 abonné(s) · 4 abonnement(s)');
    expect(t).toContain('The Matrix');
    expect(t).toContain('Ne plus suivre');
    expect(el.querySelector('.more')).toBeNull();
  });

  it('se désabonne puis recharge le profil', async () => {
    const { fixture, social } = setup();
    const el = await render(fixture);
    click(el, 'header .btn-ghost');
    await fixture.whenStable();
    expect(social.unfollow).toHaveBeenCalledWith(2);
    expect(social.profile).toHaveBeenCalledTimes(2);
  });

  it('propose de suivre quand l’activité est masquée, sans la charger', async () => {
    const { fixture, social } = setup({ profile: vi.fn(() => of(makeProfile())) });
    const el = await render(fixture);
    expect(text(el)).toContain("Suivez Bob pour voir ce qu'il regarde.");
    expect(social.userActivity).not.toHaveBeenCalled();
    click(el, 'header .btn-primary');
    await fixture.whenStable();
    expect(social.follow).toHaveBeenCalledWith(2);
  });

  it('indique une demande en attente et permet de l’annuler', async () => {
    const { fixture, social } = setup({
      profile: vi.fn(() => of(makeProfile({ followStatus: 'PENDING' }))),
    });
    const el = await render(fixture);
    expect(text(el)).toContain('Demande envoyée');
    click(el, 'header .btn-ghost');
    expect(social.unfollow).toHaveBeenCalledWith(2);
  });

  it('n’affiche aucune action de suivi sur son propre profil', async () => {
    const { fixture } = setup(
      { profile: vi.fn(() => of(makeProfile({ id: 1, activityVisible: true }))) },
      '1',
    );
    const el = await render(fixture);
    expect(el.querySelector('header button')).toBeNull();
  });

  it('affiche un message quand il n’y a aucune activité', async () => {
    const { fixture } = setup({ userActivity: vi.fn(() => of([])) });
    expect(text(await render(fixture))).toContain("Aucune activité pour l'instant.");
  });

  it('pagine l’activité avec « Voir plus »', async () => {
    const full = Array.from({ length: FEED_PAGE_SIZE }, (_, i) => makeFeedItem({ id: i + 1 }));
    const userActivity = vi.fn((_id: number, page = 0) =>
      of(page === 0 ? full : [makeFeedItem({ id: 99, title: 'Dernier' })]),
    );
    const { fixture } = setup({ userActivity });
    const el = await render(fixture);
    expect(el.querySelectorAll('.feed-item').length).toBe(FEED_PAGE_SIZE);
    click(el, '.more');
    await fixture.whenStable();
    expect(userActivity).toHaveBeenLastCalledWith(2, 1);
    expect(el.querySelectorAll('.feed-item').length).toBe(FEED_PAGE_SIZE + 1);
    expect(el.querySelector('.more')).toBeNull();
  });

  it('affiche les erreurs de chargement, d’action et de pagination', async () => {
    const missing = setup({ profile: vi.fn(() => throwError(() => httpError(404))) });
    expect(text(await render(missing.fixture))).toContain('Profil introuvable.');

    TestBed.resetTestingModule();
    const noActivity = setup({
      userActivity: vi.fn(() => throwError(() => httpError(500, { detail: 'Panne.' }))),
    });
    expect(text(await render(noActivity.fixture))).toContain('Panne.');

    TestBed.resetTestingModule();
    const full = Array.from({ length: FEED_PAGE_SIZE }, (_, i) => makeFeedItem({ id: i + 1 }));
    const userActivity = vi.fn((_id: number, page = 0) =>
      page === 0 ? of(full) : throwError(() => httpError(500, { detail: 'Échec page.' })),
    );
    const paged = setup({
      userActivity,
      follow: vi.fn(() => throwError(() => httpError(409, { detail: 'Déjà.' }))),
    });
    const el = await render(paged.fixture);
    click(el, '.more');
    await paged.fixture.whenStable();
    expect(text(el)).toContain('Échec page.');
  });

  it('affiche un indicateur de chargement', async () => {
    const { fixture } = setup({ profile: vi.fn(() => NEVER) });
    expect((await render(fixture)).querySelector('.spinner')).not.toBeNull();
  });

  it('affiche l’erreur d’une action de suivi', async () => {
    const { fixture } = setup({
      profile: vi.fn(() => of(makeProfile())),
      follow: vi.fn(() => throwError(() => httpError(409, { detail: 'Déjà demandé.' }))),
    });
    const el = await render(fixture);
    click(el, 'header .btn-primary');
    await fixture.whenStable();
    expect(text(el)).toContain('Déjà demandé.');
  });
});
