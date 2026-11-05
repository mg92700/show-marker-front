import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

/** Page ouverte depuis le lien de l'e-mail : confirme l'adresse (création de compte ou changement d'adresse). */
@Component({
  selector: 'app-verify-email-page',
  imports: [RouterLink],
  template: `
    <div class="card auth-card">
      <div class="brand"><img class="brand-mark" src="logo.svg" alt="" width="34" height="34"> Show Marker</div>

      @switch (state()) {
        @case ('loading') {
          <div>
            <h1>Vérification…</h1>
            <p class="muted">Confirmation de votre adresse e-mail en cours.</p>
          </div>
        }
        @case ('success') {
          <div>
            <h1>Adresse confirmée</h1>
            <p class="muted">Merci ! Votre adresse e-mail est confirmée.</p>
          </div>
          @if (auth.isAuthenticated()) {
            <a class="btn btn-primary btn-block" routerLink="/profile">Retour à mon profil</a>
          } @else {
            <a class="btn btn-primary btn-block" routerLink="/login">Se connecter</a>
          }
        }
        @case ('error') {
          <div>
            <h1>Lien invalide</h1>
            <p class="muted">{{ error() }}</p>
          </div>
          <a class="btn btn-block" routerLink="/login">Retour à la connexion</a>
        }
      }
    </div>
  `,
  styleUrl: './auth-layout.css',
})
export class VerifyEmailPage implements OnInit {
  protected readonly auth = inject(AuthService);

  /** Jeton reçu par e-mail (paramètre d'URL ?token=). */
  readonly token = input<string>();

  protected readonly state = signal<'loading' | 'success' | 'error'>('loading');
  protected readonly error = signal('Ce lien est invalide ou a expiré.');

  ngOnInit(): void {
    const token = this.token();
    if (!token) {
      this.state.set('error');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: () => {
        this.state.set('success');
        // Changement d'adresse depuis le profil : recharge l'utilisateur pour afficher la nouvelle adresse.
        if (this.auth.isAuthenticated()) {
          void this.auth.loadSession();
        }
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'Ce lien est invalide ou a expiré.'));
        this.state.set('error');
      },
    });
  }
}
