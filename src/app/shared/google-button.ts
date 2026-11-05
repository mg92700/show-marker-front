import { Component, ElementRef, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { GoogleSignInService } from '../core/google-sign-in';
import { safeReturnUrl } from '../core/return-url';

/** Bouton « Continuer avec Google », affiché seulement si le backend a un client ID Google configuré. */
@Component({
  selector: 'app-google-button',
  template: `
    @if (clientId()) {
      <div class="separator" aria-hidden="true"><span>ou</span></div>
      <div class="host" #host></div>
      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .separator { display: flex; align-items: center; gap: 12px; margin: 4px 0 14px; color: var(--text-muted); font-size: 0.85rem; }
    .separator::before, .separator::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .host { display: flex; justify-content: center; min-height: 44px; }
  `,
})
export class GoogleButton {
  private readonly auth = inject(AuthService);
  private readonly google = inject(GoogleSignInService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  protected readonly clientId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  private rendered = false;

  constructor() {
    this.auth.providers().subscribe({
      next: (providers) => this.clientId.set(providers.googleClientId),
      error: () => this.clientId.set(null),
    });
    effect(() => {
      const clientId = this.clientId();
      const host = this.host()?.nativeElement;
      if (clientId && host && !this.rendered) {
        this.rendered = true;
        untracked(() => this.show(host, clientId));
      }
    });
  }

  private show(host: HTMLElement, clientId: string): void {
    this.google
      .load()
      .then(() => this.google.render(host, clientId, (credential) => this.signIn(credential)))
      .catch(() => this.error.set('Connexion Google indisponible pour le moment.'));
  }

  private signIn(credential: string): void {
    this.error.set(null);
    this.auth.loginWithGoogle(credential).subscribe({
      next: () => this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
      error: (err) => this.error.set(errorMessage(err, 'Connexion Google impossible.')),
    });
  }
}
