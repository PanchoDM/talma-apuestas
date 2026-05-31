import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationToastComponent } from './components/notification-toast/notification-toast';
import { NotificationsService } from './services/notifications.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationToastComponent],
  template: `
    <router-outlet />
    <app-notification-toast />
  `,
})
export class App {
  private auth  = inject(AuthService);
  private notif = inject(NotificationsService);

  constructor() {
    // Conectar/desconectar SSE reactivamente según estado de sesión
    effect(() => {
      if (this.auth.currentUser()) this.notif.connect();
      else                         this.notif.disconnect();
    });
  }
}
