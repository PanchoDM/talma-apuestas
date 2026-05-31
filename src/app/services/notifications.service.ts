import { Injectable, signal, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { PrediccionesService } from './predicciones.service';

export type ToastType = 'info' | 'warning' | 'missed' | 'score';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

export interface ScoreUpdateEvent {
  partido_id: number;
  match_name: string;
  goles_local_mt: number;
  goles_visitante_mt: number;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private auth         = inject(AuthService);
  private predicciones = inject(PrediccionesService);

  toasts = signal<Toast[]>([]);

  private scoreUpdateSubject   = new Subject<ScoreUpdateEvent>();
  private partidoDeleteSubject = new Subject<number>();

  scoreUpdate$    = this.scoreUpdateSubject.asObservable();
  partidoDelete$  = this.partidoDeleteSubject.asObservable();

  private counter     = 0;
  private eventSource?: EventSource;

  connect() {
    if (this.eventSource) return;
    const token = this.auth.getToken();
    if (!token) return;

    this.eventSource = new EventSource(
      `${environment.apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`
    );

    this.eventSource.addEventListener('bet-opened', (e: MessageEvent) => {
      const { match_name } = JSON.parse(e.data);
      this.push('info', '¡Nueva apuesta disponible!', match_name);
    });

    this.eventSource.addEventListener('bet-closed', (e: MessageEvent) => {
      const { partido_id, match_name } = JSON.parse(e.data);
      this.push('warning', 'Se cerró la apuesta', match_name);

      if (this.auth.isAdmin()) return;

      this.predicciones.getMias().subscribe(mias => {
        const hizoBet = mias.some(p => p.partido_id === partido_id);
        if (!hizoBet) {
          this.push('missed', 'Más atento la próxima vez', `No apostaste en ${match_name}`);
        }
      });
    });

    this.eventSource.addEventListener('score-updated', (e: MessageEvent) => {
      const data: ScoreUpdateEvent = JSON.parse(e.data);

      const estadoLabel = data.estado === 'medio_tiempo' ? '⏱ Medio Tiempo'
                        : data.estado === 'finalizado'   ? '🏁 Finalizado'
                        : '🔄 Actualizado';

      this.push('score', estadoLabel, `${data.match_name} · ${data.goles_local_mt}–${data.goles_visitante_mt}`);
      this.scoreUpdateSubject.next(data);
    });

    this.eventSource.addEventListener('partido-eliminado', (e: MessageEvent) => {
      const { partido_id, match_name } = JSON.parse(e.data);
      this.push('warning', 'Partido eliminado', match_name);
      this.partidoDeleteSubject.next(partido_id);
    });

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.eventSource = undefined;
      setTimeout(() => { if (this.auth.isLoggedIn()) this.connect(); }, 5000);
    };
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = undefined;
  }

  private push(type: ToastType, title: string, message: string) {
    const id = ++this.counter;
    this.toasts.update(list => [...list, { id, type, title, message }]);
    setTimeout(() => this.dismiss(id), 6000);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
