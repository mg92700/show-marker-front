import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, of, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthResponse, MessageResponse, User } from './models';

/**
 * Session utilisateur. Le JWT est stocké par le navigateur dans un cookie HttpOnly posé par le backend :
 * il n'est jamais accessible au JavaScript (protection contre le vol de jeton par XSS).
 * Le frontend ne conserve que l'utilisateur courant et la date d'expiration.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = `${environment.apiUrl}/auth`;

  private readonly session = signal<AuthResponse | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  /** Appelé au démarrage : restaure la session si le cookie est encore valide. */
  loadSession(): Promise<unknown> {
    return firstValueFrom(
      this.http.get<AuthResponse>(`${this.api}/me`).pipe(
        tap((res) => this.start(res)),
        catchError(() => {
          this.clear();
          return of(null);
        }),
      ),
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api}/login`, { email, password })
      .pipe(tap((res) => this.start(res)));
  }

  /** Crée le compte : aucune session n'est ouverte, l'utilisateur doit d'abord confirmer son adresse e-mail. */
  register(email: string, password: string, displayName: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/register`, { email, password, displayName });
  }

  /** Confirme une adresse (création de compte ou changement d'adresse) avec le jeton reçu par e-mail. */
  verifyEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.api}/verify-email`, { token });
  }

  resendVerification(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/resend-verification`, { email });
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.api}/reset-password`, { token, newPassword });
  }

  /** Met à jour l'utilisateur affiché (après une modification de profil) sans toucher à la durée de session. */
  updateUser(user: User): void {
    this.session.update((session) => (session ? { ...session, user } : session));
  }

  /** Déconnexion : le backend expire le cookie, le frontend oublie la session. */
  logout(): void {
    this.http
      .post<void>(`${this.api}/logout`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.clear();
        this.router.navigate(['/login']);
      });
  }

  /** Session expirée ou rejetée par le serveur (401). */
  handleUnauthorized(): void {
    if (!this.session()) {
      return;
    }
    this.clear();
    this.router.navigate(['/login'], { queryParams: { expired: 1 } });
  }

  private start(res: AuthResponse): void {
    this.session.set(res);
    clearTimeout(this.expiryTimer);
    const delay = new Date(res.expiresAt).getTime() - Date.now();
    if (delay <= 0) {
      this.handleUnauthorized();
      return;
    }
    // setTimeout est limité à ~24,8 jours ; largement suffisant pour la durée de vie du JWT.
    this.expiryTimer = setTimeout(() => this.handleUnauthorized(), Math.min(delay, 2_147_000_000));
  }

  private clear(): void {
    clearTimeout(this.expiryTimer);
    this.session.set(null);
  }
}
