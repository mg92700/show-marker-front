import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { LibraryEntry, ShowDetails } from '../../core/models';
import { makeItem } from '../../testing/fixtures';
import { ShowDetailPage } from './show-detail.page';

const show: ShowDetails = {
  provider: 'tvmaze',
  externalId: '1',
  title: 'Test Show',
  overview: 'Synopsis',
  posterUrl: null,
  backdropUrl: null,
  year: 2020,
  genres: ['Drama'],
  rating: 8,
  status: 'Ended',
  ended: true,
  network: 'HBO',
  seasons: [
    {
      number: 1,
      episodeCount: 2,
      premiereDate: '2020-01-01',
      episodes: [
        { externalId: '11', season: 1, number: 1, title: 'Pilot', airDate: '2020-01-01', runtime: 50, overview: null, imageUrl: null, aired: true },
        { externalId: '12', season: 1, number: 2, title: 'Two', airDate: '2020-01-08', runtime: 50, overview: null, imageUrl: null, aired: true },
      ],
    },
  ],
};

describe('ShowDetailPage', () => {
  it('affiche la série et ses épisodes, puis marque un épisode', async () => {
    const entry: LibraryEntry = { item: null, watchedEpisodeIds: [] };
    const api = {
      show: vi.fn(() => of(show)),
      entry: vi.fn(() => of(entry)),
      add: vi.fn(() => of({ id: 5 })),
      setEpisodes: vi.fn(() => of({ item: { id: 5, status: 'WATCHING', progress: null }, watchedEpisodeIds: ['11'] })),
    };
    TestBed.configureTestingModule({
      imports: [ShowDetailPage],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(ShowDetailPage);
    fixture.componentRef.setInput('id', '1');
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Test Show');
    expect(el.querySelectorAll('.episode').length).toBe(2);
    expect(api.show).toHaveBeenCalledTimes(1);

    (el.querySelector('.episode .check') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(api.add).toHaveBeenCalledWith('SHOW', '1', 'WATCHING');
    expect(api.setEpisodes).toHaveBeenCalledWith(5, ['11'], true);
    expect(el.querySelector('.episode.watched')).not.toBeNull();
  }, 10_000);

  it('ne propose de commenter qu’une série dont au moins un épisode est vu', async () => {
    const render = async (watched: number) => {
      TestBed.resetTestingModule();
      const item = makeItem({ progress: { watched, total: 4, percent: 0, nextEpisode: null } });
      const api = { show: vi.fn(() => of(show)), entry: vi.fn(() => of({ item, watchedEpisodeIds: [] })) };
      TestBed.configureTestingModule({
        imports: [ShowDetailPage],
        providers: [provideRouter([]), { provide: ApiService, useValue: api }],
      });
      const fixture = TestBed.createComponent(ShowDetailPage);
      fixture.componentRef.setInput('id', '1');
      await fixture.whenStable();
      return fixture.nativeElement as HTMLElement;
    };
    expect((await render(0)).querySelector('app-comment-box')).toBeNull();
    expect((await render(1)).querySelector('app-comment-box')).not.toBeNull();
  });
});
