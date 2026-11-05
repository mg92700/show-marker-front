import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HealthIndicator } from './shared/health-indicator';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HealthIndicator],
  template: '<router-outlet /><app-health-indicator />',
})
export class App {}
