import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Account, Transfer, TransferRecipient } from '../core/models';
import { MaskedIbanPipe } from '../shared/masked-iban.pipe';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, MaskedIbanPipe],
  templateUrl: './transfers.component.html',
  styleUrl: './transfers.component.css',
})
export class TransfersComponent implements OnInit {
  private fb = inject(FormBuilder);
  accounts: Account[] = [];
  recipients: TransferRecipient[] = [];
  history: Transfer[] = [];
  loading = true;
  sending = false;
  error = '';
  success = '';
  form = this.fb.nonNullable.group({
    senderAccountId: [0, Validators.min(1)],
    recipientUserId: [0, Validators.min(1)],
    recipientAccountId: [{ value: 0, disabled: true }, Validators.min(1)],
    amount: [0, Validators.min(0.01)],
    description: ['', Validators.required],
  });
  constructor(
    private api: ApiService,
    public auth: AuthService,
  ) {}
  ngOnInit() {
    this.load();
  }
  load() {
    forkJoin({
      accounts: this.api.accounts(),
      recipients: this.api.transferRecipients(),
      history: this.api.transfers(),
    }).subscribe({
      next: (r) => {
        this.accounts = r.accounts.filter(
          (a) =>
            Number(a.user_id) === Number(this.auth.user()?.id) &&
            a.status === 'ACTIVE',
        );
        this.recipients = r.recipients;
        this.history = r.history;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.message || 'Podaci za transfer nisu dostupni.';
        this.loading = false;
      },
    });
  }
  get recipientAccounts() {
    return (
      this.recipients.find(
        (r) =>
          Number(r.id) === Number(this.form.controls.recipientUserId.value),
      )?.accounts || []
    );
  }
  get selectedSource() {
    return this.accounts.find(
      (a) => Number(a.id) === Number(this.form.controls.senderAccountId.value),
    );
  }
  recipientChanged() {
    const control = this.form.controls.recipientAccountId;
    control.setValue(0);
    this.recipientAccounts.length ? control.enable() : control.disable();
  }
  send() {
    if (this.form.invalid) return;
    const { recipientUserId, ...payload } = this.form.getRawValue();
    this.sending = true;
    this.error = '';
    this.success = '';
    this.api.createTransfer(payload).subscribe({
      next: () => {
        this.success =
          'Transfer je uspješno proveden, a oba stanja računa su ažurirana.';
        this.form.reset({
          senderAccountId: 0,
          recipientUserId: 0,
          recipientAccountId: 0,
          amount: 0,
          description: '',
        });
        this.form.controls.recipientAccountId.disable();
        this.sending = false;
        this.load();
      },
      error: (e) => {
        this.error = e.error?.message || 'Transfer nije moguće provesti.';
        this.sending = false;
      },
    });
  }
  outgoing(t: Transfer) {
    return Number(t.sender_user_id) === Number(this.auth.user()?.id);
  }
}
