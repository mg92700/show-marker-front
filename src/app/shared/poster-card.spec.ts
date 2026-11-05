import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PosterCard } from './poster-card';

describe('PosterCard', () => {
  const render = async (inputs: Record<string, unknown>) => {
    TestBed.configureTestingModule({ imports: [PosterCard], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PosterCard);
    fixture.componentRef.setInput('link', ['/shows', '1']);
    fixture.componentRef.setInput('title', 'Dark');
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('affiche l’affiche, le titre, le sous-titre, le badge et la progression', async () => {
    const el = await render({ posterUrl: 'https://img/dark.jpg', subtitle: '2017', badge: '★ 8.7', progress: 40 });
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://img/dark.jpg');
    expect(el.querySelector('.title')?.textContent).toContain('Dark');
    expect(el.textContent).toContain('2017');
    expect(el.querySelector('.badge')?.textContent).toContain('★ 8.7');
    expect((el.querySelector('.progress span') as HTMLElement).style.width).toBe('40%');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/shows/1');
  });

  it('affiche le titre en repli sans affiche, sans badge, sous-titre ni progression', async () => {
    const el = await render({});
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.poster-fallback')?.textContent).toContain('Dark');
    expect(el.querySelector('.badge')).toBeNull();
    expect(el.querySelector('.progress')).toBeNull();
    expect(el.querySelector('.muted')).toBeNull();
  });
});
