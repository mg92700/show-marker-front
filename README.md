# show-marker-front

Frontend Angular de **Show Marker**, application de suivi de séries et de films.
L'API est fournie par le projet séparé [`show-marker-back`](../show-marker-back).

## Fonctionnalités (V1)

- Inscription, connexion, déconnexion, expiration automatique de session
- Tableau de bord : séries en cours, prochains épisodes (bouton « ✓ Vu »), derniers épisodes, films à regarder, activités, progression globale
- Recherche de séries (TVmaze) et de films (TMDB)
- Fiche série : synopsis, saisons, épisodes, statut (à regarder / en cours / terminée / abandonnée), progression, prochain épisode, « marquer la saison », « vu jusqu'ici »
- Fiche film : à regarder / vu / retirer
- Bibliothèque personnelle filtrable par statut, profil avec statistiques et historique des films

## Technologies

Angular 21 (composants standalone, signals, zoneless), TypeScript 5.9, HTML, CSS (sans framework UI), Vitest pour les tests.

## Prérequis

- Node.js 20.19+ ou 22/24 (testé avec Node 24) et npm
- Le backend `show-marker-back` démarré sur `http://localhost:8080`

## Installation et lancement

```bash
npm install
npm start            # http://localhost:4200  (ng serve + proxy /api -> localhost:8080)
```

| Commande | Rôle |
|---|---|
| `npm start` | Serveur de développement avec rechargement |
| `npm run build` | Build de production dans `dist/show-marker-front/browser` |
| `npm test -- --watch=false` | Tests unitaires (Vitest) |

### Avec Docker

```bash
docker compose up -d --build    # http://localhost:4200
```

L'image nginx sert l'application et relaie `/api` vers le backend (`BACKEND_URL`, par défaut `http://host.docker.internal:8080`).

## Configuration de l'URL du backend

Le frontend appelle toujours l'API en relatif sur **`/api`** (`src/environments/environment.ts`) :

- en développement, `proxy.conf.json` redirige `/api` vers `http://localhost:8080` (modifier `target` si besoin) ;
- en Docker, nginx redirige `/api` vers `BACKEND_URL`.

Ce choix « même origine » évite toute configuration CORS et permet un cookie d'authentification `SameSite=Strict`.

## Variables d'environnement

| Variable | Où | Défaut | Rôle |
|---|---|---|---|
| `BACKEND_URL` | docker compose / image nginx | `http://host.docker.internal:8080` | URL du backend vue depuis nginx |

Aucun secret n'existe côté frontend : la clé TMDB et la clé de signature JWT restent dans le backend. Voir `.env.example`.

## Authentification

- Le backend pose le JWT dans un **cookie `HttpOnly`, `SameSite=Strict`** : il est envoyé automatiquement par le navigateur et n'est **jamais lisible par JavaScript** (protection contre le vol de jeton par XSS ; rien n'est stocké en `localStorage`).
- `core/auth.interceptor.ts` ajoute `withCredentials` sur les appels API et, sur une réponse `401`, ferme la session et redirige vers `/login`.
- `core/auth.guards.ts` : `authGuard` protège les pages (redirection vers `/login?returnUrl=…`), `guestGuard` évite les pages de connexion une fois connecté.
- `core/auth.service.ts` restaure la session au démarrage (`GET /api/auth/me`) et programme la déconnexion à la date d'expiration du JWT.
- Le backend accepte aussi `Authorization: Bearer <token>` pour les clients API (Postman, curl, mobile).

## Structure

```
src/app/
  core/       modèles (alignés sur les DTO du backend), services API & auth, intercepteur, guards, libellés
  layout/     coque (navigation haute, barre basse sur mobile, attributions)
  shared/     composant affiche
  pages/      auth, dashboard, search, library, show-detail, movie-detail, profile
```

## Attributions

Données des séries : [TVmaze](https://www.tvmaze.com) (CC BY-SA 4.0). Données des films : [TMDB](https://www.themoviedb.org). Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.

## Git

```bash
git status
git add -A && git commit -m "feat: ..."
git push origin main
```

Convention : `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.


## Connexion avec Google

Le bouton « Continuer avec Google » (pages de connexion et d'inscription) n'apparaît que si le backend a un `GOOGLE_CLIENT_ID` configuré : le front lit `GET /api/auth/providers`. Aucune configuration côté front.
Dans Google Cloud Console, l'URL du front (`http://localhost:4200` en local, l'URL publique en production) doit figurer dans les *Origines JavaScript autorisées* du client OAuth. Voir le README du backend.
