import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card auth-card">
      <div class="brand"><img class="brand-mark" src="logo.svg" alt="" width="34" height="34"> Show Marker</div>

      @if (done()) {
        <div>
          <h1>Mot de passe modifié</h1>
          <p class="muted">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        </div>
        <a class="btn btn-primary btn-block" routerLink="/login">Se connecter</a>
      } @else if (!token()) {
        <div>
          <h1>Lien invalide</h1>
          <p class="muted">Ce lien de réinitialisation est incomplet. Demandez-en un nouveau.</p>
        </div>
        <a class="btn btn-primary btn-block" routerLink="/forgot-password">Demander un nouveau lien</a>
      } @else {
        <div>
          <h1>Nouveau mot de passe</h1>
          <p class="muted">Choisissez un mot de passe d'au moins 8 caractères.</p>
        </div>

        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="password">Nouveau mot de passe</label>
            <input
              id="password"
              class="input"
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <span class="field-error">8 caractères minimum.</span>
            }
          </div>
          <div class="field">
            <label for="confirm">Confirmation</label>
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
            {{ loading() ? 'Enregistrement…' : 'Changer le mot de passe' }}
          </button>
        </form>
        <p class="switch"><a routerLink="/forgot-password">Demander un nouveau lien</a></p>
      }
    </div>
  `,
  styleUrl: './auth-layout.css',
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);

  /** Jeton reçu par e-mail (paramètre d'URL ?token=). */
  readonly token = input<string>();

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirm: ['', Validators.required],
  });

  protected mismatch(): boolean {
    const { password, confirm } = this.form.getRawValue();
    return password !== confirm;
  }

  submit(): void {
    this.form.markAllAsTouched();
    const token = this.token();
    if (!token || this.form.invalid || this.mismatch()) {
      this.error.set('Corrigez les champs en erreur.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.resetPassword(token, this.form.getRawValue().password).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Impossible de modifier le mot de passe.'));
      },
    });
  }
}
