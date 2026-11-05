import { DatePipe } from '@angular/common';
import { Component, inject, input, model, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { errorMessage } from '../core/api.service';
import { activityLabel, detailLink } from '../core/labels';
import { FeedItem } from '../core/models';
import { SocialService } from '../core/social.service';

/** Liste d'activités (fil ou profil) : réponses aux commentaires et suppression de ses propres messages. */
@Component({
  selector: 'app-feed-list',
  imports: [RouterLink, DatePipe],
  template: `
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    <div class="feed">
      @for (a of items(); track a.id) {
        <article class="card feed-item">
          <div class="row">
            <div class="thumb">
              @if (a.posterUrl) {
                <img [src]="a.posterUrl" [alt]="a.title" loading="lazy" />
              }
            </div>
            <div class="grow small">
              <a class="author" [routerLink]="['/users', a.userId]">{{ a.displayName }}</a>
              {{ label(a) }}
              @if (a.externalId) {
                <a class="title media-link" [routerLink]="link(a)">{{ a.title }}</a>
              } @else {
                <span class="title">{{ a.title }}</span>
              }
              <div class="muted small">{{ a.createdAt | date: 'd MMM HH:mm' }}</div>
            </div>
            @if (a.type === 'COMMENTED' && a.userId === meId()) {
              <button
                class="btn btn-ghost btn-danger btn-sm delete-comment"
                type="button"
                [disabled]="busy()"
                (click)="deleteComment(a)"
              >
                Supprimer
              </button>
            }
          </div>
          @if (a.type === 'COMMENTED') {
            <blockquote class="comment">{{ a.detail }}</blockquote>
            @for (r of a.replies; track r.id) {
              <div class="reply small">
                <strong>{{ r.displayName }}</strong> {{ r.text }}
                @if (r.userId === meId()) {
                  <button
                    class="btn btn-ghost btn-sm delete-reply"
                    type="button"
                    aria-label="Supprimer ma réponse"
                    [disabled]="busy()"
                    (click)="deleteReply(a, r.id)"
                  >
                    ✕
                  </button>
                }
              </div>
            }
            <form class="row reply-form" (submit)="$event.preventDefault(); reply(a, replyField)">
              <input
                #replyField
                class="input grow"
                maxlength="255"
                placeholder="Répondre…"
                aria-label="Répondre"
              />
              <button class="btn btn-sm" type="submit" [disabled]="busy()">Envoyer</button>
            </form>
          }
        </article>
      }
    </div>
  `,
  styles: `
    .feed {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .feed-item {
      padding: 12px 14px;
    }
    .feed-item .row {
      flex-wrap: nowrap;
      align-items: flex-start;
    }
    .title,
    .author {
      font-weight: 600;
    }
    .comment {
      margin: 10px 0 6px;
      padding: 8px 12px;
      border-left: 3px solid var(--accent);
      background: var(--bg-elev-2);
      border-radius: var(--radius-sm);
    }
    .reply {
      padding: 4px 0 4px 15px;
    }
    .reply-form {
      margin-top: 6px;
      flex-wrap: nowrap;
    }
  `,
})
export class FeedList {
  private readonly social = inject(SocialService);

  readonly items = model.required<FeedItem[]>();
  /** Identifiant de l'utilisateur connecté : seuls ses propres messages sont supprimables. */
  readonly meId = input<number | null>(null);

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly label = activityLabel;

  protected link(a: FeedItem): string[] {
    return detailLink(a.mediaType, a.externalId ?? '');
  }

  protected reply(item: FeedItem, field: HTMLInputElement): void {
    const text = field.value.trim();
    if (!text) return;
    this.run(this.social.reply(item.id, text), (reply) => {
      field.value = '';
      this.update(item.id, (a) => ({ ...a, replies: [...a.replies, reply] }));
    });
  }

  protected deleteComment(item: FeedItem): void {
    this.run(this.social.deleteComment(item.id), () =>
      this.items.update((items) => items.filter((a) => a.id !== item.id)),
    );
  }

  protected deleteReply(item: FeedItem, replyId: number): void {
    this.run(this.social.deleteReply(replyId), () =>
      this.update(item.id, (a) => ({ ...a, replies: a.replies.filter((r) => r.id !== replyId) })),
    );
  }

  private update(id: number, change: (a: FeedItem) => FeedItem): void {
    this.items.update((items) => items.map((a) => (a.id === id ? change(a) : a)));
  }

  private run<T>(action: Observable<T>, done: (result: T) => void): void {
    this.busy.set(true);
    this.error.set(null);
    action.subscribe({
      next: (result) => {
        this.busy.set(false);
        done(result);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
