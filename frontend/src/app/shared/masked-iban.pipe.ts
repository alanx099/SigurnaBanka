import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'maskedIban', standalone: true })
export class MaskedIbanPipe implements PipeTransform {
  transform(value?: string): string {
    if (!value) return '—';
    const clean = value.replace(/\s/g, '');
    return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
  }
}
