import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Account, Movement } from '../core/models';
import { MaskedIbanPipe } from '../shared/masked-iban.pipe';
@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MaskedIbanPipe,
  ],
  templateUrl: './account-detail.component.html',
  styleUrl: './account-detail.component.css',
})
export class AccountDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  id = Number(this.route.snapshot.paramMap.get('id'));
  account?: Account;
  movements: Movement[] = [];
  error = '';
  editing = false;
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['CURRENT'],
    status: ['ACTIVE'],
  });
  constructor(
    private router: Router,
    private api: ApiService,
    public auth: AuthService,
  ) {}
  ngOnInit() {
    forkJoin({
      account: this.api.account(this.id),
      deposits: this.api.deposits(this.id),
      withdrawals: this.api.withdrawals(this.id),
    }).subscribe({
      next: (r) => {
        this.account = r.account;
        this.form.patchValue({
          name: r.account.name,
          type: r.account.type,
          status: r.account.status,
        });
        this.movements = [
          ...r.deposits.map((m) => ({ ...m, kind: 'DEPOSIT' as const })),
          ...r.withdrawals.map((m) => ({ ...m, kind: 'WITHDRAWAL' as const })),
        ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      },
      error: (e) => (this.error = e.error?.message || 'Račun nije dostupan.'),
    });
  }
  save() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.api
      .updateAccount(this.id, this.auth.isAdmin() ? raw : { name: raw.name })
      .subscribe({
        next: (a) => {
          this.account = { ...this.account!, ...a };
          this.editing = false;
        },
        error: (e) => (this.error = e.error?.message),
      });
  }
  remove() {
    if (confirm('Trajno obrisati ovaj račun?'))
      this.api.deleteAccount(this.id).subscribe({
        next: () => this.router.navigate(['/accounts']),
        error: (e) => (this.error = e.error?.message),
      });
  }
}
