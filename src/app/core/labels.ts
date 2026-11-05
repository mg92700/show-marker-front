import { Activity, Episode, LibraryStatus, MediaType } from './models';

export const SHOW_STATUSES: LibraryStatus[] = ['WATCHLIST', 'WATCHING', 'COMPLETED', 'DROPPED'];
export const MOVIE_STATUSES: LibraryStatus[] = ['WATCHLIST', 'WATCHED'];

export function statusLabel(status: LibraryStatus, type: MediaType = 'SHOW'): string {
  switch (status) {
    case 'WATCHLIST':
      return 'À regarder';
    case 'WATCHING':
      return 'En cours';
    case 'COMPLETED':
      return 'Terminée';
    case 'DROPPED':
      return 'Abandonnée';
    case 'WATCHED':
      return type === 'MOVIE' ? 'Vu' : 'Vue';
  }
}

export function episodeCode(e: Pick<Episode, 'season' | 'number'>): string {
  return `S${String(e.season).padStart(2, '0')}E${String(e.number).padStart(2, '0')}`;
}

export function activityLabel(a: Pick<Activity, 'type' | 'mediaType' | 'detail'>): string {
  switch (a.type) {
    case 'ADDED':
      return a.mediaType === 'SHOW' ? 'a ajouté la série' : 'a ajouté le film';
    case 'REMOVED':
      return 'a retiré';
    case 'STATUS_CHANGED':
      return `est passé à « ${statusLabel(a.detail as LibraryStatus, a.mediaType)} » pour`;
    case 'EPISODE_WATCHED':
      return `a vu ${a.detail ?? 'un épisode'} de`;
    case 'EPISODES_WATCHED':
      return `a vu ${a.detail ?? 'des épisodes'} de`;
    case 'MOVIE_WATCHED':
      return 'a vu le film';
    case 'COMMENTED':
      return 'a commenté';
  }
}

export function detailLink(type: MediaType, externalId: string): string[] {
  return [type === 'SHOW' ? '/shows' : '/movies', externalId];
}
