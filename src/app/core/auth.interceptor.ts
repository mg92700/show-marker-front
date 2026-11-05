import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * - Envoie les cookies (dont le JWT HttpOnly) avec chaque appel à l'API, y compris si l'API est sur une autre origine.
 * - Sur une réponse 401 hors endpoints publics (authentification, santé) : la session a expiré, retour à la connexion.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApi = req.url.startsWith(environment.apiUrl);
  const request = isApi ? req.clone({ withCredentials: true }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      const isPublicCall =
        req.url.startsWith(`${environment.apiUrl}/auth/`) || req.url === `${environment.apiUrl}/health`;
      if (isApi && !isPublicCall && error instanceof HttpErrorResponse && error.status === 401) {
        auth.handleUnauthorized();
      }
      return throwError(() => error);
    }),
  );
};
