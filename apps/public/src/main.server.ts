import '@angular/platform-server/init';
import 'zone.js/node';
import './styles.css';
import { render } from '@analogjs/router/server';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

export default render(AppComponent, config);
