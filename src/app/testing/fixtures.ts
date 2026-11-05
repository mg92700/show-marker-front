import {
  Activity,
  Dashboard,
  Episode,
  FeedItem,
  LibraryItem,
  MediaSummary,
  MovieDetails,
  RecentEpisode,
  ShowDetails,
  User,
  UserProfile,
  UserSummary,
} from '../core/models';

export const makeUser = (o: Partial<User> = {}): User => ({
  id: 1,
  email: 'alice@example.com',
  displayName: 'Alice',
  role: 'USER',
  createdAt: '2026-01-01T00:00:00Z',
  hasPassword: true,
  ...o,
});

export const makeEpisode = (o: Partial<Episode> = {}): Episode => ({
  externalId: '11',
  season: 1,
  number: 1,
  title: 'Pilot',
  airDate: '2020-01-01',
  runtime: 50,
  overview: null,
  imageUrl: null,
  aired: true,
  ...o,
});

export const makeItem = (o: Partial<LibraryItem> = {}): LibraryItem => ({
  id: 5,
  type: 'SHOW',
  provider: 'tvmaze',
  externalId: '1',
  title: 'Test Show',
  posterUrl: 'https://img/poster.jpg',
  year: 2020,
  status: 'WATCHING',
  addedAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  watchedAt: null,
  progress: { watched: 1, total: 4, percent: 25, nextEpisode: makeEpisode({ externalId: '12', number: 2, title: 'Two' }) },
  ...o,
});

export const makeMovieItem = (o: Partial<LibraryItem> = {}): LibraryItem =>
  makeItem({ id: 9, type: 'MOVIE', provider: 'tmdb', externalId: '603', title: 'The Matrix', year: 1999, status: 'WATCHLIST', progress: null, ...o });

export const makeSummary = (o: Partial<MediaSummary> = {}): MediaSummary => ({
  provider: 'tvmaze',
  externalId: '1',
  type: 'SHOW',
  title: 'Dark',
  overview: null,
  posterUrl: 'https://img/dark.jpg',
  year: 2017,
  genres: ['Drama', 'Sci-Fi', 'Thriller'],
  rating: 8.7,
  ...o,
});

export const makeShow = (o: Partial<ShowDetails> = {}): ShowDetails => ({
  provider: 'tvmaze',
  externalId: '1',
  title: 'Test Show',
  overview: 'Synopsis',
  posterUrl: 'https://img/poster.jpg',
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
        makeEpisode({ externalId: '11', number: 1 }),
        makeEpisode({ externalId: '12', number: 2, title: 'Two', airDate: '2020-01-08', runtime: null }),
      ],
    },
    {
      number: 2,
      episodeCount: 2,
      premiereDate: '2021-01-01',
      episodes: [
        makeEpisode({ externalId: '21', season: 2, number: 1, title: 'Return', airDate: '2021-01-01' }),
        makeEpisode({ externalId: '22', season: 2, number: 2, title: 'Future', airDate: null, aired: false }),
      ],
    },
  ],
  ...o,
});

export const makeMovie = (o: Partial<MovieDetails> = {}): MovieDetails => ({
  provider: 'tmdb',
  externalId: '603',
  title: 'Matrix',
  originalTitle: 'The Matrix',
  overview: 'Synopsis',
  tagline: 'Free your mind',
  posterUrl: 'https://img/matrix.jpg',
  backdropUrl: 'https://img/matrix-bg.jpg',
  releaseDate: '1999-03-31',
  year: 1999,
  runtime: 136,
  genres: ['Sci-Fi', 'Action'],
  rating: 8.2,
  ...o,
});

export const makeRecentEpisode = (o: Partial<RecentEpisode> = {}): RecentEpisode => ({
  libraryItemId: 5,
  showExternalId: '1',
  showTitle: 'Test Show',
  posterUrl: 'https://img/poster.jpg',
  episodeExternalId: '11',
  season: 1,
  number: 1,
  episodeTitle: 'Pilot',
  watchedAt: '2026-01-03T10:00:00Z',
  ...o,
});

export const makeActivity = (o: Partial<Activity> = {}): Activity => ({
  id: 1,
  type: 'ADDED',
  mediaType: 'SHOW',
  libraryItemId: 5,
  title: 'Test Show',
  detail: null,
  createdAt: '2026-01-03T10:00:00Z',
  ...o,
});

export const makeDashboard = (o: Partial<Dashboard> = {}): Dashboard => ({
  watching: [makeItem()],
  upNext: [{ show: makeItem(), episode: makeEpisode({ externalId: '12', number: 2, title: 'Two' }) }],
  recentEpisodes: [makeRecentEpisode()],
  movieWatchlist: [makeMovieItem()],
  recentMovies: [],
  recentActivity: [makeActivity()],
  stats: {
    showsCount: 3,
    watchingCount: 1,
    completedShows: 1,
    moviesCount: 2,
    moviesWatched: 1,
    episodesWatched: 40,
    globalProgress: 55,
  },
  ...o,
});

export const makeUserSummary = (o: Partial<UserSummary> = {}): UserSummary => ({
  id: 2,
  displayName: 'Bob',
  followStatus: null,
  ...o,
});

export const makeFeedItem = (o: Partial<FeedItem> = {}): FeedItem => ({
  id: 30,
  userId: 2,
  displayName: 'Bob',
  type: 'MOVIE_WATCHED',
  mediaType: 'MOVIE',
  externalId: '603',
  posterUrl: 'https://img/matrix.jpg',
  title: 'The Matrix',
  detail: null,
  createdAt: '2026-01-03T10:00:00Z',
  replies: [],
  ...o,
});

export const makeProfile = (o: Partial<UserProfile> = {}): UserProfile => ({
  id: 2,
  displayName: 'Bob',
  followStatus: null,
  followersCount: 3,
  followingCount: 4,
  activityVisible: false,
  ...o,
});
