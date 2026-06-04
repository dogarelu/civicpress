import 'zone.js';
import './styles.css';
import { bootstrapApplication } from '@angular/platform-browser';
import { AdminAppComponent } from './app/admin-app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AdminAppComponent, appConfig).catch((err) => console.error(err));
