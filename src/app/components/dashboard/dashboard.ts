import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { timer } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PartidosService } from '../../services/partidos.service';
import { PrediccionesService } from '../../services/predicciones.service';
import { NotificationsService } from '../../services/notifications.service';
import { Partido, PartidoStats, Prediccion, Streak } from '../../models/models';
import { PrediccionFormComponent } from '../prediccion-form/prediccion-form';
import { StreakBannerComponent } from '../streak-banner/streak-banner';
import { NavbarComponent } from '../navbar/navbar';
import { FlagPipe } from '../../pipes/flag.pipe';

type FiltroChip = 'todos' | 'abiertas' | 'mis-apuestas' | 'en-vivo';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, PrediccionFormComponent, StreakBannerComponent, NavbarComponent, FlagPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  partidos        = signal<Partido[]>([]);
  predicciones    = signal<Prediccion[]>([]);
  streak          = signal<Streak | null>(null);
  selectedPartido = signal<Partido | null>(null);
  loading         = signal(true);

  // ── Marcadores en tiempo real ─────────────────────────────────────────────
  // ids de partidos cuyo marcador acaba de cambiar → dispara animación de gol
  flashScore   = signal<Set<number>>(new Set());
  flashPenales = signal<Set<number>>(new Set());

  // ── Probabilidades de la comunidad ────────────────────────────────────────
  stats         = signal<Map<number, PartidoStats>>(new Map());
  statsAbiertas = signal<Set<number>>(new Set());
  statsLoading  = signal<number | null>(null);

  // ── Filtros y búsqueda ────────────────────────────────────────────────────
  busqueda    = signal('');
  filtroChip  = signal<FiltroChip>('todos');

  // ── Reloj para cuenta regresiva (tick cada segundo) ───────────────────────
  private nowTick = signal(Date.now());

  readonly auth            = inject(AuthService);
  readonly partidosSvc     = inject(PartidosService);
  readonly prediccionesSvc = inject(PrediccionesService);
  readonly notif           = inject(NotificationsService);
  private  destroyRef      = inject(DestroyRef);

  user = this.auth.currentUser;

  private readonly GRUPOS_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  private readonly RONDA_ORDER  = ['16avos','octavos','cuartos','semis','tercero','final'];
  private readonly RONDA_LABELS: Record<string, string> = {
    '16avos':  'DIECISEISAVOS DE FINAL',
    'octavos': 'OCTAVOS DE FINAL',
    'cuartos': 'CUARTOS DE FINAL',
    'semis':   'SEMIFINAL',
    'tercero': 'TERCER LUGAR',
    'final':   'FINAL',
  };

  partidosAgrupados = computed(() => {
    // Excluir partidos ocultos por el admin antes de agrupar
    let list = this.partidos().filter(p => p.visible_usuarios !== false);

    // Búsqueda por equipo
    const q = this.busqueda().trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.equipo_local.toLowerCase().includes(q) || p.equipo_visitante.toLowerCase().includes(q));
    }

    // Chips de filtro rápido
    const chip = this.filtroChip();
    if (chip === 'abiertas')    list = list.filter(p => p.apuestas_abiertas && p.estado !== 'finalizado');
    if (chip === 'en-vivo')     list = list.filter(p => p.estado === 'medio_tiempo');
    if (chip === 'mis-apuestas') {
      const ids = new Set(this.predicciones().map(pr => pr.partido_id));
      list = list.filter(p => ids.has(p.id));
    }

    const grupoMap = new Map<string, Partido[]>();
    const rondaMap = new Map<string, Partido[]>();

    for (const p of list) {
      if (p.ronda) {
        if (!rondaMap.has(p.ronda)) rondaMap.set(p.ronda, []);
        rondaMap.get(p.ronda)!.push(p);
      } else {
        const key = p.grupo ?? '__sin_grupo__';
        if (!grupoMap.has(key)) grupoMap.set(key, []);
        grupoMap.get(key)!.push(p);
      }
    }

    const secciones: { titulo: string; partidos: Partido[] }[] = [];

    for (const g of this.GRUPOS_ORDER) {
      if (grupoMap.has(g)) secciones.push({ titulo: `GRUPO ${g}`, partidos: grupoMap.get(g)! });
    }
    if (grupoMap.has('__sin_grupo__')) {
      secciones.push({ titulo: 'FASE DE GRUPOS', partidos: grupoMap.get('__sin_grupo__')! });
    }
    for (const r of this.RONDA_ORDER) {
      if (rondaMap.has(r)) secciones.push({ titulo: this.RONDA_LABELS[r], partidos: rondaMap.get(r)! });
    }
    for (const [r, ps] of rondaMap.entries()) {
      if (!this.RONDA_ORDER.includes(r)) secciones.push({ titulo: r.toUpperCase(), partidos: ps });
    }

    return secciones;
  });

  ngOnInit() {
    this.loadData();
    this.loadStreak();

    // Tick de 1 s para las cuentas regresivas
    timer(0, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.nowTick.set(Date.now()));

    // RENDIMIENTO: el SSE ya empuja marcadores en tiempo real; el polling
    // queda solo como respaldo lejano (90 s) por si la conexión SSE se cae.
    timer(90_000, 90_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData(true));

    // ⚡ Marcador en tiempo real: actualiza la tarjeta EN SITIO (sin recargar
    // toda la lista) y dispara la animación de gol.
    this.notif.scoreUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ev => {
        this.partidos.update(list => list.map(p => p.id === ev.partido_id
          ? { ...p, goles_local_mt: ev.goles_local_mt, goles_visitante_mt: ev.goles_visitante_mt, estado: ev.estado as Partido['estado'] }
          : p));
        this.triggerFlash(this.flashScore, ev.partido_id);
        // Si el partido terminó, refrescar puntos de mis predicciones
        if (ev.estado === 'finalizado' || ev.estado === 'medio_tiempo') {
          this.prediccionesSvc.getMias().subscribe(p => this.predicciones.set(p));
          this.loadStreak();
        }
      });

    // 🥅 Tanda de penales en tiempo real
    this.notif.penalesUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ev => {
        this.partidos.update(list => list.map(p => p.id === ev.partido_id
          ? { ...p, penales_habilitados: ev.penales_habilitados, penales_local: ev.penales_local, penales_visitante: ev.penales_visitante }
          : p));
        this.triggerFlash(this.flashPenales, ev.partido_id);
      });

    // Apertura/cierre de apuestas en tiempo real, sin recarga
    this.notif.betToggle$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ partido_id, abierta }) => {
        const existe = this.partidos().some(p => p.id === partido_id);
        if (!existe && abierta) { this.loadData(true); return; }
        this.partidos.update(list => list.map(p => p.id === partido_id ? { ...p, apuestas_abiertas: abierta } : p));
      });

    // Retirar partido eliminado de la lista sin recarga completa
    this.notif.partidoDelete$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => this.partidos.update(list => list.filter(p => p.id !== id)));
  }

  private triggerFlash(target: typeof this.flashScore, id: number) {
    target.update(s => new Set(s).add(id));
    setTimeout(() => target.update(s => { const n = new Set(s); n.delete(id); return n; }), 2500);
  }

  loadData(silent = false) {
    if (!silent) this.loading.set(true);
    this.partidosSvc.getAll().subscribe({
      next: p => { this.partidos.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.prediccionesSvc.getMias().subscribe(p => this.predicciones.set(p));
  }

  loadStreak() {
    this.prediccionesSvc.getMiRacha().subscribe(s => {
      if (s.streak !== 'neutral') this.streak.set(s);
    });
  }

  getPrediccion(partidoId: number): Prediccion | undefined {
    return this.predicciones().find(p => p.partido_id === partidoId);
  }

  // ── Probabilidades de la comunidad ────────────────────────────────────────
  // Solo se pueden ver si el usuario ya apostó o las apuestas están cerradas,
  // para no sesgar las apuestas de los demás.
  puedeVerStats(partido: Partido): boolean {
    return !!this.getPrediccion(partido.id) || !partido.apuestas_abiertas || partido.estado !== 'pendiente';
  }

  toggleStats(partido: Partido) {
    const abiertas = this.statsAbiertas();
    if (abiertas.has(partido.id)) {
      this.statsAbiertas.update(s => { const n = new Set(s); n.delete(partido.id); return n; });
      return;
    }
    this.statsAbiertas.update(s => new Set(s).add(partido.id));
    this.statsLoading.set(partido.id);
    this.partidosSvc.getStats(partido.id).subscribe({
      next: st => {
        this.stats.update(m => new Map(m).set(partido.id, st));
        this.statsLoading.set(null);
      },
      error: () => this.statsLoading.set(null),
    });
  }

  getStats(id: number): PartidoStats | undefined { return this.stats().get(id); }

  // ── Cuenta regresiva al cierre de apuestas ────────────────────────────────
  // Las fechas en BD están en hora Lima (UTC-5) guardadas como naive; el JSON
  // las trae como ISO interpretadas en UTC, por eso comparamos contra
  // "ahora en Lima" (Date.now() - 5h). El cron cierra al minuto 45.
  countdown(partido: Partido): string | null {
    if (!partido.apuestas_abiertas || partido.estado !== 'pendiente') return null;
    const inicio = Date.parse(partido.fecha_partido);
    if (isNaN(inicio)) return null;
    const cierre  = inicio + 45 * 60_000;
    const nowLima = this.nowTick() - 5 * 3600_000;
    const diff = cierre - nowLima;
    if (diff <= 0) return null;

    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    if (d > 0)  return `${d}d ${h}h`;
    if (h > 0)  return `${h}h ${m}m`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  countdownUrgente(partido: Partido): boolean {
    if (!partido.apuestas_abiertas) return false;
    const inicio = Date.parse(partido.fecha_partido);
    const nowLima = this.nowTick() - 5 * 3600_000;
    return inicio + 45 * 60_000 - nowLima < 3_600_000; // menos de 1 hora
  }

  setFiltro(chip: FiltroChip) { this.filtroChip.set(chip); }

  openBet(partido: Partido) {
    if (!partido.apuestas_abiertas) return;
    this.selectedPartido.set(partido);
  }

  onSaved() {
    this.selectedPartido.set(null);
    this.loadData(true);
  }

  sectionId(titulo: string): string {
    return 'sec-' + titulo.toLowerCase().replace(/[\s·]+/g, '-');
  }

  scrollTo(titulo: string) {
    document.getElementById(this.sectionId(titulo))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getEstadoBadgeClass(estado: string): string {
    return { pendiente: 'badge-pending', medio_tiempo: 'badge-live', finalizado: 'badge-done' }[estado] ?? '';
  }

  getPuntosClass(pts: number | null): string {
    if (pts === null) return '';
    if (pts >= 7) return 'pts-exact';
    if (pts === 3)  return 'pts-trend';
    return 'pts-miss';
  }
}
