import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card auth-card">
      <div class="brand"><img class="brand-mark" src="logo.svg" alt="" width="34" height="34"> Show Marker</div>
      <div>
        <h1>Mot de passe oublié</h1>
        <p class="muted">Saisissez votre adresse e-mail : nous vous enverrons un lien pour en choisir un nouveau.</p>
      </div>

      @if (info()) {
        <div class="alert alert-success" role="status">{{ info() }}</div>
      }
      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
        </div>
        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Envoi…' : 'Envoyer le lien' }}
        </button>
      </form>

      <p class="switch"><a routerLink="/login">Retour à la connexion</a></p>
    </div>
  `,
  styleUrl: './auth-layout.css',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.error.set('Renseignez une adresse e-mail valide.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.info.set(null);
    this.auth.forgotPassword(this.form.getRawValue().email.trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.info.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, "Impossible d'envoyer l'e-mail."));
      },
    });
  }
}
