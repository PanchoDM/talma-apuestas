import { Pipe, PipeTransform } from '@angular/core';
import { getFlag } from '../data/countries.data';

@Pipe({ name: 'flag', standalone: true })
export class FlagPipe implements PipeTransform {
  transform(countryName: string): string {
    return getFlag(countryName);
  }
}
