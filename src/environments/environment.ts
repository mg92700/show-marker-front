// URL de base de l'API. En développement, "/api" est redirigé vers le backend par proxy.conf.json ;
// en Docker, par nginx. Utiliser une URL absolue uniquement si le backend est sur un autre domaine
// (il faut alors configurer CORS_ALLOWED_ORIGINS et un cookie SameSite adapté côté backend).
export const environment = {
  apiUrl: '/api',
};
