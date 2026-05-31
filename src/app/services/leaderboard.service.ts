import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface LeaderboardEntry {
  posicion: number;
  nombre_usuario: string;
  puntos_totales: number;
  aciertos_exactos: number;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  constructor(private http: HttpClient) {}

  get() {
    return this.http.get<LeaderboardEntry[]>(`${environment.apiUrl}/leaderboard`);
  }
}
