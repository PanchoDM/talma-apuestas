import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Prediccion, Streak } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PrediccionesService {
  private url = `${environment.apiUrl}/predicciones`;

  constructor(private http: HttpClient) {}

  crear(data: { partido_id: number; goles_local_esperados_mt: number; goles_visitante_esperados_mt: number }) {
    return this.http.post<{ message: string; tendencia: string }>(this.url, data);
  }

  getMias() {
    return this.http.get<Prediccion[]>(`${this.url}/mias`);
  }

  getMiRacha() {
    return this.http.get<Streak>(`${this.url}/mi-racha`);
  }
}
