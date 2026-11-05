import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

interface GoogleAccounts {
  id: {
    initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
    renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/** Charge Google Identity Services à la demande et affiche le bouton « Continuer avec Google ». */
@Injectable({ providedIn: 'root' })
export class GoogleSignInService {
  private readonly document = inject(DOCUMENT);
  private loading: Promise<void> | undefined;

  load(): Promise<void> {
    const win = this.document.defaultView;
    if (win?.google?.accounts) {
      return Promise.resolve();
    }
    this.loading ??= new Promise<void>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        this.loading = undefined;
        reject(new Error('Google Identity Services indisponible'));
      };
      this.document.head.appendChild(script);
    });
    return this.loading;
  }

  /** À appeler après `load()`. `onCredential` reçoit le jeton d'identité quand l'utilisateur choisit un compte. */
  render(host: HTMLElement, clientId: string, onCredential: (credential: string) => void): void {
    const accounts = this.document.defaultView?.google?.accounts;
    if (!accounts) {
      throw new Error('Google Identity Services non chargé');
    }
    accounts.id.initialize({ client_id: clientId, callback: (response) => onCredential(response.credential) });
    accounts.id.renderButton(host, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'fr', width: 320 });
  }
}
