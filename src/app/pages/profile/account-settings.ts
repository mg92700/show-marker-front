import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AccountService } from '../../core/account.service';
import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

interface Feedback {
  kind: 'success' | 'error';
  text: string;
}

/** Modification du pseudo et du mot de passe depuis le profil. */
@Component({
  selector: 'app-account-settings',
  imports: [ReactiveFormsModule],
  template: `
    <div class="settings">
      <form class="card stack" [formGroup]="nameForm" (ngSubmit)="saveName()" novalidate>
        <h3>Pseudo</h3>
        <div class="field">
          <label for="set-displayName">Pseudo</label>
          <input id="set-displayName" class="input" formControlName="displayName" autocomplete="nickname" />
          @if (nameForm.controls.displayName.touched && nameForm.controls.displayName.invalid) {
            <span class="field-error">Pseudo obligatoire (50 caractères max).</span>
          }
        </div>
        @if (nameFeedback(); as f) {
          <div class="alert" [class.alert-success]="f.kind === 'success'" [class.alert-error]="f.kind === 'error'" role="status">{{ f.text }}</div>
        }
        <button class="btn btn-primary" type="submit" [disabled]="nameBusy() || !nameChanged()">Enregistrer le pseudo</button>
      </form>

      <form class="card stack" [formGroup]="passwordForm" (ngSubmit)="savePassword()" novalidate>
        <h3>Mot de passe</h3>
        <div class="field">
          <label for="set-current">Mot de passe actuel</label>
          <input id="set-current" class="input" type="password" formControlName="currentPassword" autocomplete="current-password" />
          @if (passwordForm.controls.currentPassword.touched && passwordForm.controls.currentPassword.invalid) {
            <span class="field-error">Mot de passe obligatoire.</span>
          }
        </div>
        <div class="field">
          <label for="set-new">Nouveau mot de passe</label>
          <input id="set-new" class="input" type="password" formControlName="newPassword" autocomplete="new-password" />
          @if (passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.invalid) {
            <span class="field-error">8 caractères minimum.</span>
          }
        </div>
        <div class="field">
          <label for="set-confirm">Confirmation du nouveau mot de passe</label>
          <input id="set-confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password" />
          @if (passwordForm.controls.confirm.touched && mismatch()) {
            <span class="field-error">Les mots de passe ne correspondent pas.</span>
          }
        </div>
        @if (passwordFeedback(); as f) {
          <div class="alert" [class.alert-success]="f.kind === 'success'" [class.alert-error]="f.kind === 'error'" role="status">{{ f.text }}</div>
        }
        <button class="btn btn-primary" type="submit" [disabled]="passwordBusy()">Changer le mot de passe</button>
      </form>
    </div>
  `,
  styles: `
    .settings { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; align-items: start; }
    .stack { display: flex; flex-direction: column; gap: 12px; }
    .stack .btn { align-self: flex-start; }
  `,
})
export class AccountSettings {
  private readonly account = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly nameForm = this.fb.group({
    displayName: [this.auth.user()?.displayName ?? '', [Validators.required, Validators.maxLength(50)]],
  });
  protected readonly passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirm: ['', Validators.required],
  });

  protected readonly nameBusy = signal(false);
  protected readonly passwordBusy = signal(false);
  protected readonly nameFeedback = signal<Feedback | null>(null);
  protected readonly passwordFeedback = signal<Feedback | null>(null);

  protected nameChanged(): boolean {
    const value = this.nameForm.getRawValue().displayName.trim();
    return value !== '' && value !== this.auth.user()?.displayName;
  }

  protected mismatch(): boolean {
    const { newPassword, confirm } = this.passwordForm.getRawValue();
    return newPassword !== confirm;
  }

  protected saveName(): void {
    this.nameForm.markAllAsTouched();
    if (this.nameForm.invalid || !this.nameChanged()) return;
    this.nameBusy.set(true);
    this.nameFeedback.set(null);
    this.account.updateDisplayName(this.nameForm.getRawValue().displayName.trim()).subscribe({
      next: (user) => {
        this.nameBusy.set(false);
        this.nameForm.setValue({ displayName: user.displayName });
        this.nameFeedback.set({ kind: 'success', text: 'Pseudo mis à jour.' });
      },
      error: (err) => {
        this.nameBusy.set(false);
        this.nameFeedback.set({ kind: 'error', text: errorMessage(err, 'Impossible de modifier le pseudo.') });
      },
    });
  }

  protected savePassword(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid || this.mismatch()) return;
    this.passwordBusy.set(true);
    this.passwordFeedback.set(null);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.account.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordBusy.set(false);
        this.passwordForm.reset();
        this.passwordFeedback.set({ kind: 'success', text: 'Mot de passe modifié.' });
      },
      error: (err) => {
        this.passwordBusy.set(false);
        this.passwordFeedback.set({ kind: 'error', text: errorMessage(err, 'Impossible de modifier le mot de passe.') });
      },
    });
  }
}
