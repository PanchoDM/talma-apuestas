export interface Usuario {
  id: string;
  nombre_usuario: string;
  puntos_totales: number;
  aciertos_exactos: number;
  rol: 'user' | 'admin';
}

export interface AuthResponse {
  token: string;
  user: Usuario;
}

export interface Partido {
  id: number;
  equipo_local: string;
  equipo_visitante: string;
  fecha_partido: string;
  grupo?: string | null;
  jornada?: number | null;
  ronda?: string | null;
  goles_local_mt: number | null;
  goles_visitante_mt: number | null;
  estado: 'pendiente' | 'medio_tiempo' | 'finalizado';
  apuestas_abiertas: boolean;
  visible_usuarios: boolean;
  penales_habilitados?: boolean;
  penales_local?: number | null;
  penales_visitante?: number | null;
}

export interface PartidoStats {
  partido_id: number;
  total: number;
  local: number;
  empate: number;
  visitante: number;
  pct_local: number;
  pct_empate: number;
  pct_visitante: number;
  avg_local: number | null;
  avg_visitante: number | null;
}

export interface ResumenAdmin {
  partidos: {
    total: number;
    pendientes: number;
    en_vivo: number;
    finalizados: number;
    apuestas_abiertas: number;
  };
  usuarios: number;
  predicciones: number;
}

export interface Prediccion {
  id: number;
  partido_id: number;
  equipo_local: string;
  equipo_visitante: string;
  fecha_partido: string;
  goles_local_esperados_mt: number;
  goles_visitante_esperados_mt: number;
  tendencia_apostada: string;
  puntos_obtenidos: number | null;
}

export interface Streak {
  streak: 'hot' | 'cold' | 'neutral';
  message: string | null;
}
