import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';

export const httpError = (status: number, body: unknown = null): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: body });

/** Saisit une valeur dans un champ (déclenche l'événement `input` attendu par les formulaires réactifs). */
export function type(el: HTMLElement, selector: string, value: string): void {
  const input = el.querySelector(selector) as HTMLInputElement | null;
  if (!input) throw new Error(`Champ introuvable : ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

export function click(el: HTMLElement, selector: string): void {
  const target = el.querySelector(selector) as HTMLElement | null;
  if (!target) throw new Error(`Élément introuvable : ${selector}`);
  target.click();
}

export function submit(el: HTMLElement, selector = 'form'): void {
  (el.querySelector(selector) as HTMLFormElement).dispatchEvent(new Event('submit'));
}

export const text = (el: HTMLElement): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

export async function render<T>(fixture: ComponentFixture<T>): Promise<HTMLElement> {
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}
