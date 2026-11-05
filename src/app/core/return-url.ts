/** N'accepte que les chemins internes pour éviter les redirections ouvertes. */
export function safeReturnUrl(url: string | null | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}
