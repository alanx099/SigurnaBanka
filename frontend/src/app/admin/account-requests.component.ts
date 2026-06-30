import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AccountRequest, AccountType } from '../core/models';

@Component({
  selector: 'app-account-requests',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './account-requests.component.html',
  styleUrl: './account-requests.component.css',
})
export class AccountRequestsComponent implements OnInit {
  requests: AccountRequest[] = [];
  responses: Record<number, string> = {};
  loading = true;
  error = '';
  notice = '';
  processing?: number;
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.load();
  }
  load() {
    this.api.accountRequests().subscribe({
      next: (r) => {
        this.requests = r;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.message || 'Zahtjevi nisu dostupni.';
        this.loading = false;
      },
    });
  }
  typeLabel(type: AccountType) {
    return {
      CURRENT: 'Tekući račun',
      GIRO: 'Žiro račun',
      SAVINGS: 'Štedni račun',
      BUSINESS: 'Poslovni račun',
    }[type];
  }
  setResponse(id: number, event: Event) {
    this.responses[id] = (event.target as HTMLTextAreaElement).value;
  }
  review(request: AccountRequest, action: 'APPROVE' | 'REJECT') {
    const message = this.responses[request.id]?.trim();
    if (action === 'REJECT' && !message) {
      this.error = 'Napišite razlog odbijanja prije potvrde.';
      return;
    }
    this.error = '';
    this.notice = '';
    this.processing = request.id;
    this.api
      .reviewAccountRequest(request.id, { action, adminMessage: message })
      .subscribe({
        next: (r) => {
          this.notice =
            action === 'APPROVE'
              ? `Račun ${r.account?.iban} uspješno je otvoren.`
              : 'Zahtjev je odbijen, a poruka poslana korisniku.';
          this.processing = undefined;
          this.load();
        },
        error: (e) => {
          this.error = e.error?.message || 'Zahtjev nije moguće obraditi.';
          this.processing = undefined;
        },
      });
  }
  get pending() {
    return this.requests.filter((r) => r.status === 'PENDING');
  }
  get processed() {
    return this.requests.filter((r) => r.status !== 'PENDING');
  }
}
