import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { FeedItem, Reply, UserProfile, UserSummary } from './models';

/** Taille d'une page du fil et des activités d'un profil (alignée sur le backend). */
export const FEED_PAGE_SIZE = 20;

/** Partie sociale : abonnements (sur demande à valider), fil d'activité et réponses aux commentaires. */
@Injectable({ providedIn: 'root' })
export class SocialService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/social`;

  /** Nombre de demandes de suivi reçues en attente (badge de la navigation), mis à jour à chaque lecture. */
  readonly pendingRequests = signal(0);

  /** Recherche par pseudo, avec l'état de mon abonnement à chaque résultat. */
  searchUsers(query: string): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.api}/users`, { params: { query } });
  }

  profile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.api}/users/${userId}`);
  }

  /** Activités partagées d'un utilisateur (vide si je ne fais pas partie de ses abonnés acceptés). */
  userActivity(userId: number, page = 0): Observable<FeedItem[]> {
    return this.http.get<FeedItem[]>(`${this.api}/users/${userId}/activity`, { params: { page } });
  }

  following(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.api}/following`);
  }

  /** Envoie une demande de suivi. */
  follow(userId: number): Observable<UserSummary> {
    return this.http.post<UserSummary>(`${this.api}/following/${userId}`, null);
  }

  /** Ne plus suivre, ou annuler une demande envoyée. */
  unfollow(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/following/${userId}`);
  }

  /** Mes abonnés, demandes en attente comprises. */
  followers(): Observable<UserSummary[]> {
    return this.http
      .get<UserSummary[]>(`${this.api}/followers`)
      .pipe(
        tap((users) =>
          this.pendingRequests.set(users.filter((u) => u.followStatus === 'PENDING').length),
        ),
      );
  }

  accept(userId: number): Observable<UserSummary> {
    return this.http.post<UserSummary>(`${this.api}/followers/${userId}/accept`, null);
  }

  /** Refuse une demande reçue, ou retire un abonné. */
  removeFollower(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/followers/${userId}`);
  }

  feed(page = 0): Observable<FeedItem[]> {
    return this.http.get<FeedItem[]>(`${this.api}/feed`, { params: { page } });
  }

  reply(activityId: number, text: string): Observable<Reply> {
    return this.http.post<Reply>(`${this.api}/activities/${activityId}/replies`, { text });
  }

  /** Supprime un de mes commentaires (et ses réponses). */
  deleteComment(activityId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/activities/${activityId}`);
  }

  deleteReply(replyId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/replies/${replyId}`);
  }
}
