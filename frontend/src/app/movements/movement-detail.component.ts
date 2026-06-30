import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Movement } from '../core/models';
import { MaskedIbanPipe } from '../shared/masked-iban.pipe';
@Component({
  selector: 'app-movement-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, MaskedIbanPipe],
  templateUrl: './movement-detail.component.html',
  styleUrl: './movement-detail.component.css',
})
export class MovementDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  kind = this.route.snapshot.data['kind'] as 'deposits' | 'withdrawals';
  id = Number(this.route.snapshot.paramMap.get('id'));
  item?: Movement;
  error = '';
  constructor(private api: ApiService) {}
  ngOnInit() {
    const call =
      this.kind === 'deposits'
        ? this.api.deposit(this.id)
        : this.api.withdrawal(this.id);
    call.subscribe({
      next: (m) => (this.item = m),
      error: (e) => (this.error = e.error?.message || 'Stavka nije dostupna.'),
    });
  }
}
