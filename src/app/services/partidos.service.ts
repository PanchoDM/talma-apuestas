import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Partido, PartidoStats, ResumenAdmin } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PartidosService {
  private url = `${environment.apiUrl}/partidos`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Partido[]>(this.url);
  }

  crear(data: { equipo_local: string; equipo_visitante: string; fecha_partido: string; grupo?: string; jornada?: number }) {
    return this.http.post<Partido>(this.url, data);
  }

  actualizarResultado(id: number, data: { goles_local_mt: number; goles_visitante_mt: number; estado: string }) {
    return this.http.patch<{ message: string }>(`${this.url}/${id}/resultado`, data);
  }

  eliminar(id: number) {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }

  toggleApuestas(id: number) {
    return this.http.patch<{ id: string; apuestas_abiertas: boolean }>(`${this.url}/${id}/toggle-apuestas`, {});
  }

  toggleVisibilidad(id: number) {
    return this.http.patch<{ id: string; visible_usuarios: boolean }>(`${this.url}/${id}/toggle-visibilidad`, {});
  }

  marcadorEnVivo(id: number, data: { goles_local_mt: number; goles_visitante_mt: number }) {
    return this.http.put<{ message: string; partido_id: number }>(`${this.url}/${id}/marcador-en-vivo`, data);
  }

  getStats(id: number) {
    return this.http.get<PartidoStats>(`${this.url}/${id}/stats`);
  }

  getResumen() {
    return this.http.get<ResumenAdmin>(`${this.url}/resumen`);
  }

  togglePenales(id: number) {
    return this.http.patch<{ id: number; penales_habilitados: boolean }>(`${this.url}/${id}/toggle-penales`, {});
  }

  actualizarPenales(id: number, data: { penales_local: number; penales_visitante: number }) {
    return this.http.put<{ message: string; partido_id: number }>(`${this.url}/${id}/penales`, data);
  }

  cerrarTodas() {
    return this.http.patch<{ cerrados: number }>(`${this.url}/cerrar-todas`, {});
  }

  setVisibilidadFase(tipo: 'grupo' | 'ronda', valor: string, visible: boolean) {
    return this.http.put<{ updated: number; tipo: string; valor: string; visible: boolean }>(
      `${this.url}/visibilidad-fase`,
      { tipo, valor, visible }
    );
  }
}
