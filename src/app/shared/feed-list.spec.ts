import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FeedItem } from '../core/models';
import { SocialService } from '../core/social.service';
import { makeFeedItem } from '../testing/fixtures';
import { click, httpError, render, text } from '../testing/helpers';
import { FeedList } from './feed-list';

describe('FeedList', () => {
  const mine = makeFeedItem({
    id: 31,
    userId: 1,
    displayName: 'Alice',
    type: 'COMMENTED',
    detail: 'Mon avis',
    replies: [
      {
        id: 1,
        userId: 1,
        displayName: 'Alice',
        text: 'Ma réponse',
        createdAt: '2026-01-03T11:00:00Z',
      },
      {
        id: 2,
        userId: 2,
        displayName: 'Bob',
        text: 'Sa réponse',
        createdAt: '2026-01-03T11:05:00Z',
      },
    ],
  });
  const theirs = makeFeedItem({ id: 32, type: 'COMMENTED', detail: 'Son avis', replies: [] });

  const setup = (extra: Record<string, unknown> = {}, items: FeedItem[] = [mine, theirs]) => {
    const social = {
      deleteComment: vi.fn(() => of(undefined)),
      deleteReply: vi.fn(() => of(undefined)),
      reply: vi.fn(),
      ...extra,
    };
    TestBed.configureTestingModule({
      imports: [FeedList],
      providers: [provideRouter([]), { provide: SocialService, useValue: social }],
    });
    const fixture = TestBed.createComponent(FeedList);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('meId', 1);
    return { fixture, social };
  };

  it('ne propose de supprimer que ses propres commentaires et réponses', async () => {
    const { fixture } = setup();
    const el = await render(fixture);
    expect(el.querySelectorAll('.delete-comment').length).toBe(1);
    expect(el.querySelectorAll('.delete-reply').length).toBe(1);
    expect(el.querySelector('.feed-item a.author')?.getAttribute('href')).toBe('/users/1');
  });

  it('supprime un commentaire de la liste', async () => {
    const { fixture, social } = setup();
    const el = await render(fixture);
    click(el, '.delete-comment');
    await fixture.whenStable();
    expect(social.deleteComment).toHaveBeenCalledWith(31);
    expect(el.querySelectorAll('.feed-item').length).toBe(1);
    expect(text(el)).not.toContain('Mon avis');
  });

  it('supprime une réponse sans toucher aux autres', async () => {
    const { fixture, social } = setup();
    const el = await render(fixture);
    click(el, '.delete-reply');
    await fixture.whenStable();
    expect(social.deleteReply).toHaveBeenCalledWith(1);
    expect(el.querySelectorAll('.reply').length).toBe(1);
    expect(text(el)).toContain('Sa réponse');
    expect(text(el)).not.toContain('Ma réponse');
  });

  it('affiche l’erreur d’une suppression et réactive les boutons', async () => {
    const { fixture } = setup({
      deleteComment: vi.fn(() =>
        throwError(() => httpError(404, { detail: 'Commentaire introuvable.' })),
      ),
    });
    const el = await render(fixture);
    click(el, '.delete-comment');
    await fixture.whenStable();
    expect(text(el)).toContain('Commentaire introuvable.');
    expect((el.querySelector('.delete-comment') as HTMLButtonElement).disabled).toBe(false);
    expect(el.querySelectorAll('.feed-item').length).toBe(2);
  });
});
