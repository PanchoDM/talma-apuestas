import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PartidosService } from '../../services/partidos.service';
import { Partido } from '../../models/models';
import { NavbarComponent } from '../navbar/navbar';
import { CountryAutocompleteComponent } from '../country-autocomplete/country-autocomplete';
import { ResultadoModalComponent } from '../resultado-modal/resultado-modal';
import { FlagPipe } from '../../pipes/flag.pipe';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, NavbarComponent, ReactiveFormsModule,
            CountryAutocompleteComponent, ResultadoModalComponent, FlagPipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent implements OnInit {
  partidos          = signal<Partido[]>([]);
  loading           = signal(true);
  toggling          = signal<number | null>(null);
  showForm          = signal(false);
  saving            = signal(false);
  selectedPartido   = signal<Partido | null>(null);
  confirmingDelete  = signal<number | null>(null);
  deleting          = signal<number | null>(null);
  togglingVis       = signal<number | null>(null);
  showAll           = signal(true);
  formError         = '';
  formSuccess       = '';
  form: FormGroup;

  // Partidos visibles según el filtro activo
  filteredPartidos = computed(() => {
    const list = this.partidos();
    if (this.showAll()) return list;
    // Oculta: finalizados Y los que tienen apuestas cerradas sin resultado (cerrados por el admin)
    return list.filter(p => p.estado !== 'finalizado' && p.apuestas_abiertas);
  });

  hiddenCount = computed(() => this.partidos().length - this.filteredPartidos().length);

  constructor(private svc: PartidosService, private fb: FormBuilder) {
    this.form = this.fb.group({
      equipo_local:     ['', Validators.required],
      equipo_visitante: ['', Validators.required],
      fecha_partido:    ['', Validators.required],
    });
  }

  ngOnInit() { this.loadPartidos(); }

  loadPartidos() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: p => { this.partidos.set(p); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  toggle(id: number) {
    this.toggling.set(id);
    this.svc.toggleApuestas(id).subscribe({
      next: updated => {
        this.partidos.update(list =>
          list.map(p => p.id === +updated.id ? { ...p, apuestas_abiertas: updated.apuestas_abiertas } : p)
        );
        this.toggling.set(null);
      },
      error: () => this.toggling.set(null),
    });
  }

  openResultado(partido: Partido) {
    this.selectedPartido.set(partido);
  }

  onResultadoSaved() {
    this.selectedPartido.set(null);
    this.loadPartidos();
  }

  pedirConfirmacionEliminar(id: number) {
    this.confirmingDelete.set(id);
    // Auto-cancelar tras 5 s si no confirma
    setTimeout(() => {
      if (this.confirmingDelete() === id) this.confirmingDelete.set(null);
    }, 5000);
  }

  toggleVisibilidad(id: number) {
    this.togglingVis.set(id);
    this.svc.toggleVisibilidad(id).subscribe({
      next: updated => {
        this.partidos.update(list =>
          list.map(p => p.id === +updated.id ? { ...p, visible_usuarios: updated.visible_usuarios } : p)
        );
        this.togglingVis.set(null);
      },
      error: () => this.togglingVis.set(null),
    });
  }

  eliminar(id: number) {
    this.deleting.set(id);
    this.svc.eliminar(id).subscribe({
      next: () => {
        this.partidos.update(list => list.filter(p => p.id !== id));
        this.confirmingDelete.set(null);
        this.deleting.set(null);
      },
      error: () => {
        this.confirmingDelete.set(null);
        this.deleting.set(null);
      },
    });
  }

  submitPartido() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.formError   = '';
    this.formSuccess = '';

    const raw = this.form.value;
    const fechaFormateada = raw.fecha_partido.replace('T', ' ') + ':00';

    this.svc.crear({
      equipo_local:     raw.equipo_local.trim(),
      equipo_visitante: raw.equipo_visitante.trim(),
      fecha_partido:    fechaFormateada,
    }).subscribe({
      next: nuevo => {
        this.saving.set(false);
        this.formSuccess = `Partido "${nuevo.equipo_local} vs ${nuevo.equipo_visitante}" creado.`;
        this.form.reset();
        this.loadPartidos();
        setTimeout(() => { this.formSuccess = ''; this.showForm.set(false); }, 2500);
      },
      error: err => {
        this.saving.set(false);
        this.formError = err.error?.message || 'Error al crear partido';
      },
    });
  }
}
