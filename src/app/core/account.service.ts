import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { MessageResponse, User } from './models';

/** Modification du compte par son propriétaire : pseudo, mot de passe, adresse e-mail. */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.apiUrl}/account`;

  /** Change le pseudo (refusé s'il est déjà pris). */
  updateDisplayName(displayName: string): Observable<User> {
    return this.http
      .patch<User>(`${this.api}/profile`, { displayName })
      .pipe(tap((user) => this.auth.updateUser(user)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.api}/password`, { currentPassword, newPassword });
  }

  /** Demande un changement d'adresse : la nouvelle adresse doit être confirmée par e-mail avant d'être appliquée. */
  changeEmail(newEmail: string, currentPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/email`, { newEmail, currentPassword });
  }
}
