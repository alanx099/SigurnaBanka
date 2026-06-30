import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Account, Movement } from '../core/models';
import { MaskedIbanPipe } from '../shared/masked-iban.pipe';
@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MaskedIbanPipe,
  ],
  templateUrl: './movements.component.html',
  styleUrl: './movements.component.css',
})
export class MovementsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  kind = this.route.snapshot.data['kind'] as 'deposits' | 'withdrawals';
  items: Movement[] = [];
  accounts: Account[] = [];
  showForm = false;
  loading = true;
  error = '';
  success = '';
  form = this.fb.nonNullable.group({
    accountId: [0, Validators.min(1)],
    amount: [0, Validators.min(0.01)],
    description: ['', Validators.required],
    reference: [''],
  });
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.load();
    this.api
      .accounts()
      .subscribe(
        (a) => (this.accounts = a.filter((x) => x.status === 'ACTIVE')),
      );
  }
  load() {
    const call =
      this.kind === 'deposits' ? this.api.deposits() : this.api.withdrawals();
    call.subscribe({
      next: (r) => {
        this.items = r;
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
    const call =
      this.kind === 'deposits'
        ? this.api.createDeposit(this.form.getRawValue())
        : this.api.createWithdrawal(this.form.getRawValue());
    call.subscribe({
      next: () => {
        this.success =
          this.kind === 'deposits'
            ? 'Uplata je evidentirana.'
            : 'Isplata je provedena.';
        this.showForm = false;
        this.form.reset({
          accountId: 0,
          amount: 0,
          description: '',
          reference: '',
        });
        this.load();
      },
      error: (e) =>
        (this.error = e.error?.message || 'Transakciju nije moguće provesti.'),
    });
  }
  get title() {
    return this.kind === 'deposits' ? 'Uplate' : 'Isplate';
  }
  get total() {
    return this.items.reduce((s, m) => s + Number(m.amount), 0);
  }
}
