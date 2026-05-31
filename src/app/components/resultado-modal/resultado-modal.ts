import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FlagPipe } from '../../pipes/flag.pipe';
import { PartidosService } from '../../services/partidos.service';
import { Partido } from '../../models/models';

@Component({
  selector: 'app-resultado-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FlagPipe],
  templateUrl: './resultado-modal.html',
  styleUrl: './resultado-modal.scss',
})
export class ResultadoModalComponent implements OnInit {
  @Input() partido!: Partido;
  @Output() saved  = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private svc = inject(PartidosService);
  private fb  = inject(FormBuilder);

  form!: FormGroup;
  saving = false;
  error  = '';

  ngOnInit() {
    this.form = this.fb.group({
      goles_local:     [
        this.partido.goles_local_mt ?? 0,
        [Validators.required, Validators.min(0), Validators.max(20)],
      ],
      goles_visitante: [
        this.partido.goles_visitante_mt ?? 0,
        [Validators.required, Validators.min(0), Validators.max(20)],
      ],
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.saving = true;
    this.error  = '';
    const { goles_local, goles_visitante } = this.form.value;

    this.svc.actualizarResultado(this.partido.id, {
      goles_local_mt:     +goles_local,
      goles_visitante_mt: +goles_visitante,
      estado:             'finalizado',
    }).subscribe({
      next: () => { this.saving = false; this.saved.emit(); },
      error: err => { this.saving = false; this.error = err.error?.message || 'Error al guardar'; },
    });
  }
}
