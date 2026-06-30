import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DashboardData } from '../core/models';
import { MaskedIbanPipe } from '../shared/masked-iban.pipe';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, MaskedIbanPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  data?: DashboardData;
  error = '';
  constructor(
    private api: ApiService,
    public auth: AuthService,
  ) {}
  ngOnInit() {
    this.api.dashboard().subscribe({
      next: (d) => (this.data = d),
      error: (e) => (this.error = e.error?.message || 'Podaci nisu dostupni.'),
    });
  }
  get total() {
    return this.data?.accounts.reduce((s, a) => s + Number(a.balance), 0) || 0;
  }
  get greeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Dobro jutro';
    if (hour >= 12 && hour < 18) return 'Dobar dan';
    return 'Dobra večer';
  }
}
