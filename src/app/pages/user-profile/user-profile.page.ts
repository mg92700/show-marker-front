import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FeedItem, UserProfile } from '../../core/models';
import { FEED_PAGE_SIZE, SocialService } from '../../core/social.service';
import { FeedList } from '../../shared/feed-list';

/** Profil public d'un utilisateur : abonnés, abonnements et, pour ses abonnés acceptés, son activité. */
@Component({
  selector: 'app-user-profile-page',
  imports: [FeedList],
  template: `
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    } @else if (profile(); as p) {
      <header class="card head">
        <div class="grow">
          <h1 class="page-title">{{ p.displayName }}</h1>
          <p class="muted counts">
            {{ p.followersCount }} abonné(s) · {{ p.followingCount }} abonnement(s)
          </p>
        </div>
        @if (!isMe()) {
          @switch (p.followStatus) {
            @case ('ACCEPTED') {
              <button class="btn btn-ghost" type="button" [disabled]="busy()" (click)="unfollow()">
                Ne plus suivre
              </button>
            }
            @case ('PENDING') {
              <span class="muted small">Demande envoyée</span>
              <button class="btn btn-ghost" type="button" [disabled]="busy()" (click)="unfollow()">
                Annuler
              </button>
            }
            @default {
              <button class="btn btn-primary" type="button" [disabled]="busy()" (click)="follow()">
                Suivre
              </button>
            }
          }
        }
      </header>

      <section class="section">
        <h2 class="col-title">Activité</h2>
        @if (!p.activityVisible) {
          <div class="empty">Suivez {{ p.displayName }} pour voir ce qu'il regarde.</div>
        } @else if (activity(); as items) {
          @if (items.length) {
            <app-feed-list
              [items]="items"
              (itemsChange)="activity.set($event)"
              [meId]="auth.user()?.id ?? null"
            />
            @if (hasMore()) {
              <button class="btn more" type="button" [disabled]="busy()" (click)="loadMore()">
                Voir plus
              </button>
            }
          } @else {
            <div class="empty">Aucune activité pour l'instant.</div>
          }
        } @else {
          <div class="loader"><div class="spinner"></div></div>
        }
      </section>
    } @else {
      <div class="loader"><div class="spinner"></div></div>
    }
  `,
  styles: `
    .head {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .counts {
      margin: 4px 0 0;
    }
    .col-title {
      margin-bottom: 8px;
    }
    .more {
      margin-top: 12px;
      width: 100%;
    }
  `,
})
export class UserProfilePage {
  private readonly social = inject(SocialService);
  protected readonly auth = inject(AuthService);

  readonly id = input.required<string>();

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly activity = signal<FeedItem[] | null>(null);
  protected readonly hasMore = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly isMe = computed(() => this.auth.user()?.id === this.profile()?.id);

  private page = 0;

  constructor() {
    effect(() => this.load(Number(this.id())));
  }

  protected follow(): void {
    this.change(this.social.follow(Number(this.id())));
  }

  protected unfollow(): void {
    this.change(this.social.unfollow(Number(this.id())));
  }

  protected loadMore(): void {
    this.busy.set(true);
    this.social.userActivity(Number(this.id()), this.page + 1).subscribe({
      next: (items) => {
        this.busy.set(false);
        this.page++;
        this.hasMore.set(items.length === FEED_PAGE_SIZE);
        this.activity.update((current) => [...(current ?? []), ...items]);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  private change(action: Observable<unknown>): void {
    this.busy.set(true);
    action.subscribe({
      next: () => {
        this.busy.set(false);
        this.load(Number(this.id()));
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  private load(userId: number): void {
    this.error.set(null);
    this.page = 0;
    this.social.profile(userId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        if (!profile.activityVisible) {
          this.activity.set(null);
          return;
        }
        this.social.userActivity(userId).subscribe({
          next: (items) => {
            this.activity.set(items);
            this.hasMore.set(items.length === FEED_PAGE_SIZE);
          },
          error: (err) => this.error.set(errorMessage(err)),
        });
      },
      error: (err) => this.error.set(errorMessage(err, 'Profil introuvable.')),
    });
  }
}
