import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('accepte un chemin interne', () => {
    expect(safeReturnUrl('/library?type=MOVIE')).toBe('/library?type=MOVIE');
  });

  it.each([undefined, null, '', 'library', '//evil.example', 'https://evil.example'])('ignore %s', (url) => {
    expect(safeReturnUrl(url)).toBe('/');
  });
});
