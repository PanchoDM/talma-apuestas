import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PrediccionesService } from '../../services/predicciones.service';
import { Partido } from '../../models/models';

@Component({
  selector: 'app-prediccion-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './prediccion-form.html',
  styleUrl: './prediccion-form.scss',
})
export class PrediccionFormComponent {
  @Input() partido!: Partido;
  @Output() saved  = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  error   = '';
  loading = false;

  constructor(private fb: FormBuilder, private svc: PrediccionesService) {
    this.form = this.fb.group({
      goles_local:     [0, [Validators.required, Validators.min(0), Validators.max(20)]],
      goles_visitante: [0, [Validators.required, Validators.min(0), Validators.max(20)]],
    });
  }

  get tendenciaPreview(): string {
    const l = +this.form.value.goles_local;
    const v = +this.form.value.goles_visitante;
    if (l > v) return `Victoria ${this.partido.equipo_local}`;
    if (l < v) return `Victoria ${this.partido.equipo_visitante}`;
    return 'Empate';
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = '';
    this.svc.crear({
      partido_id:                  this.partido.id,
      goles_local_esperados_mt:    +this.form.value.goles_local,
      goles_visitante_esperados_mt: +this.form.value.goles_visitante,
    }).subscribe({
      next: () => { this.loading = false; this.saved.emit(); },
      error: err => { this.loading = false; this.error = err.error?.message || 'Error al guardar'; },
    });
  }
}
