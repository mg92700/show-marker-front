import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card auth-card">
      <div class="brand"><img class="brand-mark" src="logo.svg" alt="" width="34" height="34"> Show Marker</div>

      @if (sentTo(); as email) {
        <div>
          <h1>Vérifiez vos e-mails</h1>
          <p class="muted">
            Nous avons envoyé un lien de confirmation à <strong>{{ email }}</strong>. Cliquez dessus pour activer
            votre compte, puis connectez-vous.
          </p>
        </div>
        @if (info()) {
          <div class="alert alert-success" role="status">{{ info() }}</div>
        }
        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }
        <button class="btn btn-block" type="button" [disabled]="loading()" (click)="resend(email)">
          Renvoyer l'e-mail
        </button>
        <p class="switch"><a routerLink="/login">Aller à la connexion</a></p>
      } @else {
        <div>
          <h1>Créer un compte</h1>
          <p class="muted">Suivez vos séries épisode par épisode.</p>
        </div>

        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="displayName">Pseudo</label>
            <input id="displayName" class="input" formControlName="displayName" autocomplete="nickname" />
            @if (invalid('displayName')) {
              <span class="field-error">Pseudo obligatoire (50 caractères max).</span>
            }
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
            @if (invalid('email')) {
              <span class="field-error">Email invalide.</span>
            }
          </div>
          <div class="field">
            <label for="password">Mot de passe</label>
            <input
              id="password"
              class="input"
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
            @if (invalid('password')) {
              <span class="field-error">8 caractères minimum.</span>
            }
          </div>
          <div class="field">
            <label for="confirm">Confirmation du mot de passe</label>
            <input
              id="confirm"
              class="input"
              type="password"
              formControlName="confirm"
              autocomplete="new-password"
            />
            @if (form.controls.confirm.touched && mismatch()) {
              <span class="field-error">Les mots de passe ne correspondent pas.</span>
            }
          </div>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
            {{ loading() ? 'Création…' : 'Créer mon compte' }}
          </button>
        </form>

        <p class="switch">Déjà inscrit ? <a routerLink="/login">Se connecter</a></p>
      }
    </div>
  `,
  styleUrl: './auth-layout.css',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  /** Adresse à laquelle le lien de confirmation vient d'être envoyé (affiche l'écran « vérifiez vos e-mails »). */
  protected readonly sentTo = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    displayName: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirm: ['', Validators.required],
  });

  protected invalid(name: 'displayName' | 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  protected mismatch(): boolean {
    const { password, confirm } = this.form.getRawValue();
    return password !== confirm;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.mismatch()) {
      this.error.set('Corrigez les champs en erreur.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { email, password, displayName } = this.form.getRawValue();
    this.auth.register(email, password, displayName.trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.sentTo.set(email.trim());
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Inscription impossible.'));
      },
    });
  }

  protected resend(email: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.info.set(null);
    this.auth.resendVerification(email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.info.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, "Impossible de renvoyer l'e-mail."));
      },
    });
  }
}
