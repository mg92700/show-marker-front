import { Component, inject, input, signal } from '@angular/core';

import { ApiService, errorMessage } from '../core/api.service';

/** Court commentaire sur un titre de la bibliothèque, publié dans le fil des abonnés. */
@Component({
  selector: 'app-comment-box',
  template: `
    <form class="comment-box" (submit)="$event.preventDefault(); publish(field)">
      <label class="muted small" for="comment">Un mot sur ce que vous venez de regarder ?</label>
      <div class="row">
        <input
          #field
          id="comment"
          class="input grow"
          maxlength="255"
          placeholder="Votre commentaire (visible par vos abonnés)"
          (input)="message.set(null)"
        />
        <button class="btn btn-primary btn-sm" type="submit" [disabled]="busy()">Publier</button>
      </div>
      @if (message()) {
        <div class="alert" [class.alert-success]="!failed()" [class.alert-error]="failed()">
          {{ message() }}
        </div>
      }
    </form>
  `,
  styles: `
    .comment-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 12px;
      max-width: 560px;
    }
    .comment-box .row {
      flex-wrap: nowrap;
    }
  `,
})
export class CommentBox {
  private readonly api = inject(ApiService);

  readonly itemId = input.required<number>();

  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly failed = signal(false);

  protected publish(field: HTMLInputElement): void {
    const text = field.value.trim();
    if (!text) return;
    this.busy.set(true);
    this.api.comment(this.itemId(), text).subscribe({
      next: () => {
        field.value = '';
        this.busy.set(false);
        this.failed.set(false);
        this.message.set('Commentaire publié : vos abonnés le verront dans leur fil.');
      },
      error: (err) => {
        this.busy.set(false);
        this.failed.set(true);
        this.message.set(errorMessage(err));
      },
    });
  }
}
