import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SocialService } from './social.service';

describe('SocialService', () => {
  let social: SocialService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    social = TestBed.inject(SocialService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const expectCall = (
    method: string,
    url: string,
    body: unknown = null,
    response: unknown[] | null = null,
  ) => {
    const req = http.expectOne((r) => r.urlWithParams === url);
    expect(req.request.method).toBe(method);
    expect(req.request.body).toEqual(body);
    req.flush(response);
  };

  it('appelle les endpoints des abonnements', () => {
    social.searchUsers('bo').subscribe();
    expectCall('GET', '/api/social/users?query=bo');
    social.following().subscribe();
    expectCall('GET', '/api/social/following');
    social.follow(2).subscribe();
    expectCall('POST', '/api/social/following/2');
    social.unfollow(2).subscribe();
    expectCall('DELETE', '/api/social/following/2');
    social.followers().subscribe();
    expectCall('GET', '/api/social/followers', null, []);
    social.accept(3).subscribe();
    expectCall('POST', '/api/social/followers/3/accept');
    social.removeFollower(3).subscribe();
    expectCall('DELETE', '/api/social/followers/3');
  });

  it('appelle les endpoints du fil et des réponses', () => {
    social.feed().subscribe();
    expectCall('GET', '/api/social/feed?page=0');
    social.feed(2).subscribe();
    expectCall('GET', '/api/social/feed?page=2');
    social.reply(30, 'Top').subscribe();
    expectCall('POST', '/api/social/activities/30/replies', { text: 'Top' });
  });

  it('appelle les endpoints des profils et des suppressions', () => {
    social.profile(2).subscribe();
    expectCall('GET', '/api/social/users/2');
    social.userActivity(2).subscribe();
    expectCall('GET', '/api/social/users/2/activity?page=0');
    social.userActivity(2, 3).subscribe();
    expectCall('GET', '/api/social/users/2/activity?page=3');
    social.deleteComment(30).subscribe();
    expectCall('DELETE', '/api/social/activities/30');
    social.deleteReply(7).subscribe();
    expectCall('DELETE', '/api/social/replies/7');
  });

  it('compte les demandes en attente à chaque lecture des abonnés', () => {
    social.followers().subscribe();
    http.expectOne('/api/social/followers').flush([
      { id: 3, displayName: 'Carol', followStatus: 'PENDING' },
      { id: 4, displayName: 'Dan', followStatus: 'PENDING' },
      { id: 5, displayName: 'Eve', followStatus: 'ACCEPTED' },
    ]);
    expect(social.pendingRequests()).toBe(2);
    social.followers().subscribe();
    http.expectOne('/api/social/followers').flush([]);
    expect(social.pendingRequests()).toBe(0);
  });
});
