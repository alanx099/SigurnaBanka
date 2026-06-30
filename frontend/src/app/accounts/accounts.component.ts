import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Account, AccountRequest, User } from '../core/models';
import { MaskedIbanPipe } from '../shared/masked-iban.pipe';
@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MaskedIbanPipe,
  ],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css', './account-requests.css'],
})
export class AccountsComponent implements OnInit {
  private fb = inject(FormBuilder);
  accounts: Account[] = [];
  users: User[] = [];
  requests: AccountRequest[] = [];
  loading = true;
  error = '';
  success = '';
  showForm = false;
  showRequestForm = false;
  form = this.fb.nonNullable.group({
    userId: [0, Validators.min(1)],
    iban: ['', Validators.required],
    name: ['', Validators.required],
    type: ['CURRENT'],
    balance: [0, Validators.min(0)],
  });
  requestForm = this.fb.nonNullable.group({
    accountType: ['CURRENT', Validators.required],
    requestedName: ['', Validators.required],
    userMessage: [''],
  });
  constructor(
    private api: ApiService,
    public auth: AuthService,
  ) {}
  ngOnInit() {
    this.load();
    if (this.auth.isAdmin())
      this.api.users().subscribe((u) => (this.users = u));
    else this.loadRequests();
  }
  load() {
    this.api.accounts().subscribe({
      next: (a) => {
        this.accounts = a;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.message;
        this.loading = false;
      },
    });
  }
  create() {
    if (this.form.invalid) return;
    this.api.createAccount(this.form.getRawValue()).subscribe({
      next: () => {
        this.showForm = false;
        this.form.reset({
          userId: 0,
          iban: '',
          name: '',
          type: 'CURRENT',
          balance: 0,
        });
        this.load();
      },
      error: (e) =>
        (this.error = e.error?.message || 'Račun nije moguće spremiti.'),
    });
  }
  loadRequests() {
    this.api.accountRequests().subscribe({
      next: (r) => (this.requests = r),
      error: (e) =>
        (this.error = e.error?.message || 'Zahtjevi nisu dostupni.'),
    });
  }
  submitRequest() {
    if (this.requestForm.invalid) return;
    this.error = '';
    this.api.createAccountRequest(this.requestForm.getRawValue()).subscribe({
      next: () => {
        this.success = 'Zahtjev je uspješno poslan banci.';
        this.showRequestForm = false;
        this.requestForm.reset({
          accountType: 'CURRENT',
          requestedName: '',
          userMessage: '',
        });
        this.loadRequests();
      },
      error: (e) =>
        (this.error = e.error?.message || 'Zahtjev nije moguće poslati.'),
    });
  }
  typeLabel(type: Account['type']) {
    return {
      CURRENT: 'Tekući račun',
      GIRO: 'Žiro račun',
      SAVINGS: 'Štedni račun',
      BUSINESS: 'Poslovni račun',
    }[type];
  }
}
