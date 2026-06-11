import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

export interface PenalesUpdateEvent {
  partido_id: number;
  match_name: string;
  penales_habilitados: boolean;
  penales_local: number | null;
  penales_visitante: number | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private auth         = inject(AuthService);
  private predicciones = inject(PrediccionesService);
  private http         = inject(HttpClient);

  toasts = signal<Toast[]>([]);

  private scoreUpdateSubject   = new Subject<ScoreUpdateEvent>();
  private partidoDeleteSubject = new Subject<number>();
  private penalesUpdateSubject = new Subject<PenalesUpdateEvent>();
  private betToggleSubject     = new Subject<{ partido_id: number; abierta: boolean }>();

  scoreUpdate$    = this.scoreUpdateSubject.asObservable();
  partidoDelete$  = this.partidoDeleteSubject.asObservable();
  penalesUpdate$  = this.penalesUpdateSubject.asObservable();
  betToggle$      = this.betToggleSubject.asObservable();

  private counter     = 0;
  private eventSource?: EventSource;
  private connecting  = false;

  connect() {
    if (this.eventSource || this.connecting) return;
    if (!this.auth.getToken()) return;

    // SEGURIDAD: pedimos un ticket efímero (60 s) por header Authorization.
    // Así el JWT de sesión nunca viaja en la query string (logs, historial, proxies).
    this.connecting = true;
    this.http.post<{ ticket: string }>(`${environment.apiUrl}/notifications/ticket`, {}).subscribe({
      next: ({ ticket }) => { this.connecting = false; this.openStream(ticket); },
      error: () => {
        this.connecting = false;
        setTimeout(() => { if (this.auth.isLoggedIn()) this.connect(); }, 5000);
      },
    });
  }

  private openStream(ticket: string) {
    this.eventSource = new EventSource(
      `${environment.apiUrl}/notifications/stream?ticket=${encodeURIComponent(ticket)}`
    );

    this.eventSource.addEventListener('bet-opened', (e: MessageEvent) => {
      const { partido_id, match_name } = JSON.parse(e.data);
      this.push('info', '¡Nueva apuesta disponible!', match_name);
      this.betToggleSubject.next({ partido_id, abierta: true });
    });

    this.eventSource.addEventListener('bet-closed', (e: MessageEvent) => {
      const { partido_id, match_name } = JSON.parse(e.data);
      this.push('warning', 'Se cerró la apuesta', match_name);
      this.betToggleSubject.next({ partido_id, abierta: false });

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

    this.eventSource.addEventListener('penales-updated', (e: MessageEvent) => {
      const data: PenalesUpdateEvent = JSON.parse(e.data);
      if (data.penales_habilitados) {
        this.push('score', '🥅 Tanda de penales', `${data.match_name} · ${data.penales_local ?? 0}–${data.penales_visitante ?? 0}`);
      }
      this.penalesUpdateSubject.next(data);
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
