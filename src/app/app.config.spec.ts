import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { appConfig } from './app.config';

describe('appConfig', () => {
  it('restaure la session (GET /api/auth/me) avant la première navigation', async () => {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClient(), provideHttpClientTesting()],
    });
    const status = TestBed.inject(ApplicationInitStatus);
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('/api/auth/me');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    await status.donePromise;
    http.verify();
  });
});
