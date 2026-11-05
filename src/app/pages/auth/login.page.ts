import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { errorCode, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card auth-card">
      <div class="brand"><img class="brand-mark" src="logo.svg" alt="" width="34" height="34"> Show Marker</div>
      <div>
        <h1>Connexion</h1>
        <p class="muted">Retrouvez vos séries et vos films.</p>
      </div>

      @if (expired()) {
        <div class="alert alert-info">Votre session a expiré, veuillez vous reconnecter.</div>
      }
      @if (info()) {
        <div class="alert alert-success" role="status">{{ info() }}</div>
      }
      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
        @if (unverified()) {
          <button class="btn btn-block" type="button" [disabled]="loading()" (click)="resendVerification()">
            Renvoyer l'e-mail de confirmation
          </button>
        }
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
        </div>
        <div class="field">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            class="input"
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
        </div>
        <a class="forgot" routerLink="/forgot-password">Mot de passe oublié ?</a>
        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <p class="switch">Pas encore de compte ? <a routerLink="/register">Créer un compte</a></p>
    </div>
  `,
  styleUrl: './auth-layout.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();
  readonly expired = input<string>();

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  /** Le compte existe mais son adresse e-mail n'est pas encore confirmée. */
  protected readonly unverified = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.error.set('Renseignez un email valide et votre mot de passe.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.info.set(null);
    this.unverified.set(false);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl(this.safeReturnUrl()),
      error: (err) => {
        this.loading.set(false);
        this.unverified.set(errorCode(err) === 'EMAIL_NOT_VERIFIED');
        this.error.set(errorMessage(err, 'Connexion impossible.'));
      },
    });
  }

  protected resendVerification(): void {
    this.loading.set(true);
    this.auth.resendVerification(this.form.getRawValue().email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.error.set(null);
        this.unverified.set(false);
        this.info.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, "Impossible de renvoyer l'e-mail."));
      },
    });
  }

  /** N'accepte que les chemins internes pour éviter les redirections ouvertes. */
  private safeReturnUrl(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
