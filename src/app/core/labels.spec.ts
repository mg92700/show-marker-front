import { HttpErrorResponse } from '@angular/common/http';

import { errorMessage } from './api.service';
import { episodeCode, statusLabel } from './labels';

describe('labels', () => {
  it('formate les codes épisode', () => {
    expect(episodeCode({ season: 1, number: 2 })).toBe('S01E02');
    expect(episodeCode({ season: 12, number: 105 })).toBe('S12E105');
  });

  it('traduit les statuts selon le type', () => {
    expect(statusLabel('WATCHING')).toBe('En cours');
    expect(statusLabel('WATCHED', 'MOVIE')).toBe('Vu');
  });

  it("extrait le message d'un ProblemDetail", () => {
    const validation = new HttpErrorResponse({
      status: 400,
      error: { status: 400, detail: 'Données invalides.', errors: { email: 'Email invalide.' } },
    });
    expect(errorMessage(validation)).toBe('Email invalide.');
    expect(errorMessage(new HttpErrorResponse({ status: 409, error: { status: 409, detail: 'Déjà pris' } }))).toBe(
      'Déjà pris',
    );
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Serveur injoignable');
  });
});
