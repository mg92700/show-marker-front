import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { errorMessage } from '../../core/api.service';
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
      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
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
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl(this.safeReturnUrl()),
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Connexion impossible.'));
      },
    });
  }

  /** N'accepte que les chemins internes pour éviter les redirections ouvertes. */
  private safeReturnUrl(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
