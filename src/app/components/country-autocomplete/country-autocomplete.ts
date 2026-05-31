import {
  Component, ElementRef, forwardRef, HostListener, Input, signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Country, searchCountries } from '../../data/countries.data';

@Component({
  selector: 'app-country-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './country-autocomplete.html',
  styleUrl: './country-autocomplete.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CountryAutocompleteComponent),
    multi: true,
  }],
})
export class CountryAutocompleteComponent implements ControlValueAccessor {
  @Input() placeholder = 'Buscar país...';

  query        = '';
  suggestions  = signal<Country[]>([]);
  open         = signal(false);
  activeIndex  = -1;
  disabled     = false;

  private onChange  = (_: string) => {};
  private onTouched = () => {};

  constructor(private el: ElementRef) {}

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null) {
    if (target && !this.el.nativeElement.contains(target)) this.close();
  }

  onInput(value: string) {
    this.query = value;
    const results = searchCountries(value);
    this.suggestions.set(results);
    this.open.set(results.length > 0);
    this.activeIndex = -1;
    this.onChange(value);
  }

  onKeydown(event: KeyboardEvent) {
    const list = this.suggestions();
    if (!this.open() || !list.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex = Math.min(this.activeIndex + 1, list.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
    } else if (event.key === 'Enter' && this.activeIndex >= 0) {
      event.preventDefault();
      this.select(list[this.activeIndex]);
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  // mousedown prevent evita que el blur del input cierre el dropdown antes del click
  select(country: Country) {
    this.query = country.name;
    this.close();
    this.onChange(country.name);
    this.onTouched();
  }

  private close() {
    this.open.set(false);
    this.activeIndex = -1;
  }

  // ControlValueAccessor
  writeValue(val: string)            { this.query = val ?? ''; }
  registerOnChange(fn: (_: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void)  { this.onTouched = fn; }
  setDisabledState(d: boolean)       { this.disabled = d; }
}
