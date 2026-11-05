import { Route } from '@angular/router';

import { routes } from './app.routes';

/** Toutes les routes à chargement différé doivent résoudre vers un composant. */
const collect = (list: Route[]): Route[] => list.flatMap((r) => [r, ...collect(r.children ?? [])]);

describe('routes', () => {
  const all = collect(routes);

  it('charge chaque composant différé', async () => {
    const lazy = all.filter((r) => r.loadComponent);
    expect(lazy.length).toBeGreaterThanOrEqual(8);
    for (const route of lazy) {
      const component = await (route.loadComponent as () => Promise<unknown>)();
      expect(component, `route "${route.path}"`).toBeTruthy();
    }
  });

  it('protège les pages privées et réserve connexion/inscription aux invités', () => {
    const privateShell = routes.find((r) => r.path === '' && r.children);
    expect(privateShell?.canActivate).toHaveLength(1);
    for (const path of ['login', 'register']) {
      expect(routes.find((r) => r.path === path)?.canActivate, path).toHaveLength(1);
    }
  });
});
