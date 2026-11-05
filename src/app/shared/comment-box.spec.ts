import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiService } from '../core/api.service';
import { httpError, render, submit, text, type } from '../testing/helpers';
import { CommentBox } from './comment-box';

describe('CommentBox', () => {
  const setup = (comment: () => unknown) => {
    const api = { comment: vi.fn(comment) };
    TestBed.configureTestingModule({
      imports: [CommentBox],
      providers: [{ provide: ApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(CommentBox);
    fixture.componentRef.setInput('itemId', 5);
    return { fixture, api };
  };

  it('publie le commentaire puis vide le champ', async () => {
    const { fixture, api } = setup(() => of(undefined));
    const el = await render(fixture);
    type(el, 'input', '  Excellent final  ');
    submit(el);
    await fixture.whenStable();
    expect(api.comment).toHaveBeenCalledWith(5, 'Excellent final');
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('');
    expect(el.querySelector('.alert-success')).not.toBeNull();
    expect(text(el)).toContain('Commentaire publié');

    // Une nouvelle saisie efface le message.
    type(el, 'input', 'a');
    await fixture.whenStable();
    expect(el.querySelector('.alert')).toBeNull();
  });

  it('ignore un commentaire vide', async () => {
    const { fixture, api } = setup(() => of(undefined));
    const el = await render(fixture);
    type(el, 'input', '   ');
    submit(el);
    expect(api.comment).not.toHaveBeenCalled();
  });

  it('affiche l’erreur du backend', async () => {
    const { fixture } = setup(() => throwError(() => httpError(400, { detail: 'Trop long.' })));
    const el = await render(fixture);
    type(el, 'input', 'Texte');
    submit(el);
    await fixture.whenStable();
    expect(el.querySelector('.alert-error')?.textContent).toContain('Trop long.');
    expect((el.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
