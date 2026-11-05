import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';

import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FeedItem, UserSummary } from '../../core/models';
import { FEED_PAGE_SIZE, SocialService } from '../../core/social.service';
import { FeedList } from '../../shared/feed-list';

@Component({
  selector: 'app-social-page',
  imports: [RouterLink, FeedList],
  template: `
    <h1 class="page-title">Amis</h1>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (requests().length) {
      <section class="card section">
        <h2 class="col-title">Demandes reçues</h2>
        <div class="list">
          @for (u of requests(); track u.id) {
            <div class="list-item request">
              <a class="grow title" [routerLink]="['/users', u.id]">{{ u.displayName }}</a>
              <button
                class="btn btn-success btn-sm"
                type="button"
                [disabled]="busy()"
                (click)="run(social.accept(u.id))"
              >
                Accepter
              </button>
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                [disabled]="busy()"
                (click)="run(social.removeFollower(u.id))"
              >
                Refuser
              </button>
            </div>
          }
        </div>
      </section>
    }

    <section class="section">
      <form class="row search" (submit)="$event.preventDefault(); search(query.value)">
        <input
          #query
          class="input grow"
          type="search"
          placeholder="Rechercher un utilisateur par pseudo…"
          aria-label="Pseudo"
        />
        <button class="btn btn-primary" type="submit">Rechercher</button>
      </form>
      @if (results(); as list) {
        @if (list.length) {
          <div class="list card results">
            @for (u of list; track u.id) {
              <div class="list-item result">
                <a class="grow title" [routerLink]="['/users', u.id]">{{ u.displayName }}</a>
                @switch (u.followStatus) {
                  @case ('ACCEPTED') {
                    <button
                      class="btn btn-ghost btn-sm"
                      type="button"
                      [disabled]="busy()"
                      (click)="run(social.unfollow(u.id))"
                    >
                      Ne plus suivre
                    </button>
                  }
                  @case ('PENDING') {
                    <span class="muted small">Demande envoyée</span>
                    <button
                      class="btn btn-ghost btn-sm"
                      type="button"
                      [disabled]="busy()"
                      (click)="run(social.unfollow(u.id))"
                    >
                      Annuler
                    </button>
                  }
                  @default {
                    <button
                      class="btn btn-primary btn-sm"
                      type="button"
                      [disabled]="busy()"
                      (click)="run(social.follow(u.id))"
                    >
                      Suivre
                    </button>
                  }
                }
              </div>
            }
          </div>
        } @else {
          <div class="empty">Aucun utilisateur trouvé (au moins 2 caractères).</div>
        }
      }
    </section>

    <div class="two-cols section">
      <section>
        <h2 class="col-title">Fil d'activité</h2>
        @if (feed(); as items) {
          @if (items.length) {
            <app-feed-list
              [items]="items"
              (itemsChange)="feed.set($event)"
              [meId]="auth.user()?.id ?? null"
            />
            @if (hasMore()) {
              <button class="btn more" type="button" [disabled]="busy()" (click)="loadMore()">
                Voir plus
              </button>
            }
          } @else {
            <div class="empty">
              Rien pour l'instant. Suivez des amis pour voir ce qu'ils regardent.
            </div>
          }
        } @else if (!error()) {
          <div class="loader"><div class="spinner"></div></div>
        }
      </section>

      <section class="stack">
        <div class="card">
          <h2 class="col-title">Abonnements</h2>
          @if (following().length) {
            <div class="list">
              @for (u of following(); track u.id) {
                <div class="list-item following">
                  <a class="grow" [routerLink]="['/users', u.id]">{{ u.displayName }}</a>
                  @if (u.followStatus === 'PENDING') {
                    <span class="badge">En attente</span>
                  }
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    [disabled]="busy()"
                    (click)="run(social.unfollow(u.id))"
                  >
                    {{ u.followStatus === 'PENDING' ? 'Annuler' : 'Ne plus suivre' }}
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="muted">Vous ne suivez personne.</p>
          }
        </div>
        <div class="card">
          <h2 class="col-title">Abonnés</h2>
          @if (acceptedFollowers().length) {
            <div class="list">
              @for (u of acceptedFollowers(); track u.id) {
                <div class="list-item follower">
                  <a class="grow" [routerLink]="['/users', u.id]">{{ u.displayName }}</a>
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    [disabled]="busy()"
                    (click)="run(social.removeFollower(u.id))"
                  >
                    Retirer
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="muted">Personne ne vous suit pour l'instant.</p>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .search {
      flex-wrap: nowrap;
    }
    .results {
      margin-top: 12px;
      padding: 4px 18px;
    }
    .title {
      font-weight: 600;
    }
    .two-cols {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 820px) {
      .two-cols {
        grid-template-columns: 1fr;
      }
    }
    .col-title {
      margin-bottom: 8px;
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .more {
      margin-top: 12px;
      width: 100%;
    }
  `,
})
export class SocialPage implements OnInit {
  protected readonly social = inject(SocialService);
  protected readonly auth = inject(AuthService);

  protected readonly feed = signal<FeedItem[] | null>(null);
  protected readonly hasMore = signal(false);
  protected readonly following = signal<UserSummary[]>([]);
  protected readonly followers = signal<UserSummary[]>([]);
  protected readonly results = signal<UserSummary[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly requests = computed(() =>
    this.followers().filter((u) => u.followStatus === 'PENDING'),
  );
  protected readonly acceptedFollowers = computed(() =>
    this.followers().filter((u) => u.followStatus === 'ACCEPTED'),
  );

  private lastQuery = '';
  private page = 0;

  ngOnInit(): void {
    this.load();
  }

  protected search(query: string): void {
    this.lastQuery = query.trim();
    this.social.searchUsers(this.lastQuery).subscribe({
      next: (users) => this.results.set(users),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  /** Exécute une action (suivre, accepter…) puis recharge la page. */
  protected run(action: Observable<unknown>): void {
    this.busy.set(true);
    action.subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
        if (this.results()) this.search(this.lastQuery);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  protected loadMore(): void {
    this.busy.set(true);
    this.social.feed(this.page + 1).subscribe({
      next: (items) => {
        this.busy.set(false);
        this.page++;
        this.hasMore.set(items.length === FEED_PAGE_SIZE);
        this.feed.update((current) => [...(current ?? []), ...items]);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  private load(): void {
    forkJoin({
      feed: this.social.feed(),
      following: this.social.following(),
      followers: this.social.followers(),
    }).subscribe({
      next: ({ feed, following, followers }) => {
        this.page = 0;
        this.feed.set(feed);
        this.hasMore.set(feed.length === FEED_PAGE_SIZE);
        this.following.set(following);
        this.followers.set(followers);
        this.error.set(null);
      },
      error: (err) => this.error.set(errorMessage(err, 'Impossible de charger la page Amis.')),
    });
  }
}
