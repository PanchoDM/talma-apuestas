import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Streak } from '../../models/models';

@Component({
  selector: 'app-streak-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './streak-banner.html',
  styleUrl: './streak-banner.scss',
})
export class StreakBannerComponent {
  @Input() streak!: Streak;
  @Output() close = new EventEmitter<void>();
}
