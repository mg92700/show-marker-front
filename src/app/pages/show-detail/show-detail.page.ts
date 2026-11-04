import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { ApiService, errorMessage } from '../../core/api.service';
import { SHOW_STATUSES, episodeCode, statusLabel } from '../../core/labels';
import { Episode, LibraryEntry, LibraryStatus, Season, ShowDetails } from '../../core/models';

@Component({
  selector: 'app-show-detail-page',
  imports: [DatePipe],
  templateUrl: './show-detail.page.html',
  styleUrl: './show-detail.page.css',
})
export class ShowDetailPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly show = signal<ShowDetails | null>(null);
  protected readonly entry = signal<LibraryEntry>({ item: null, watchedEpisodeIds: [] });
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly openSeason = signal<number | null>(null);

  protected readonly statuses = SHOW_STATUSES;
  protected readonly code = episodeCode;
  protected readonly label = (s: LibraryStatus) => statusLabel(s, 'SHOW');

  protected readonly item = computed(() => this.entry().item);
  protected readonly watched = computed(() => new Set(this.entry().watchedEpisodeIds));
  protected readonly progress = computed(() => this.item()?.progress ?? null);

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected seasonWatchedCount(season: Season): number {
    const w = this.watched();
    return season.episodes.filter((e) => w.has(e.externalId)).length;
  }

  protected seasonAired(season: Season): Episode[] {
    return season.episodes.filter((e) => e.aired);
  }

  protected isSeasonComplete(season: Season): boolean {
    const aired = this.seasonAired(season);
    return aired.length > 0 && aired.every((e) => this.watched().has(e.externalId));
  }

  protected toggleSeasonOpen(number: number): void {
    this.openSeason.update((current) => (current === number ? null : number));
  }

  protected add(status: LibraryStatus = 'WATCHLIST'): void {
    this.run(this.ensureInLibrary(status).pipe(switchMap(() => this.refreshEntry())));
  }

  protected changeStatus(status: LibraryStatus): void {
    const item = this.item();
    if (!item || item.status === status) return;
    this.run(this.api.updateStatus(item.id, status).pipe(switchMap(() => this.refreshEntry())));
  }

  protected remove(): void {
    const item = this.item();
    if (!item) return;
    this.run(
      this.api.remove(item.id).pipe(map((): LibraryEntry => ({ item: null, watchedEpisodeIds: [] }))),
    );
  }

  protected toggleEpisode(episode: Episode): void {
    this.setEpisodes([episode.externalId], !this.watched().has(episode.externalId));
  }

  protected markSeason(season: Season, watched: boolean): void {
    const ids = (watched ? this.seasonAired(season) : season.episodes).map((e) => e.externalId);
    if (ids.length) this.setEpisodes(ids, watched);
  }

  /** Marque comme vus tous les épisodes diffusés jusqu'à celui-ci inclus. */
  protected markUpTo(episode: Episode): void {
    const ids = (this.show()?.seasons ?? [])
      .flatMap((s) => s.episodes)
      .filter(
        (e) =>
          e.aired &&
          (e.season < episode.season || (e.season === episode.season && e.number <= episode.number)),
      )
      .map((e) => e.externalId);
    this.setEpisodes(ids, true);
  }

  private setEpisodes(ids: string[], watched: boolean): void {
    this.run(
      this.ensureInLibrary('WATCHING').pipe(
        switchMap((itemId) => this.api.setEpisodes(itemId, ids, watched)),
      ),
    );
  }

  /** Ajoute la série à la bibliothèque si nécessaire et renvoie l'id de l'élément. */
  private ensureInLibrary(status: LibraryStatus): Observable<number> {
    const item = this.item();
    if (item) return of(item.id);
    return this.api.add('SHOW', this.id(), status).pipe(map((created) => created.id));
  }

  private refreshEntry(): Observable<LibraryEntry> {
    return this.api.entry('SHOW', this.id());
  }

  private run(action: Observable<LibraryEntry>): void {
    this.busy.set(true);
    this.actionError.set(null);
    action.subscribe({
      next: (entry) => {
        this.entry.set(entry);
        this.busy.set(false);
      },
      error: (err) => {
        this.busy.set(false);
        this.actionError.set(errorMessage(err));
      },
    });
  }

  private load(id: string): void {
    this.show.set(null);
    this.error.set(null);
    forkJoin({ show: this.api.show(id), entry: this.api.entry('SHOW', id) }).subscribe({
      next: ({ show, entry }) => {
        this.show.set(show);
        this.entry.set(entry);
        const next = entry.item?.progress?.nextEpisode;
        this.openSeason.set(next ? next.season : (show.seasons[0]?.number ?? null));
      },
      error: (err) => this.error.set(errorMessage(err, 'Série introuvable.')),
    });
  }

  protected back(): void {
    if (history.length > 1) {
      history.back();
    } else {
      this.router.navigate(['/search']);
    }
  }
}
