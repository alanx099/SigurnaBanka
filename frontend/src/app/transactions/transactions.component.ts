import { Component } from '@angular/core';
import { GlassCardComponent } from '../shared/glass-card.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [GlassCardComponent],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css'],
})
export class TransactionsComponent {
  transactions = [
    {
      id: 1,
      type: 'income',
      desc: 'Salary',
      date: '2026-06-15',
      amount: 12500,
    },
    {
      id: 2,
      type: 'outcome',
      desc: 'Electricity Bill',
      date: '2026-06-12',
      amount: -420.75,
    },
    {
      id: 3,
      type: 'outcome',
      desc: 'Groceries',
      date: '2026-06-10',
      amount: -256.4,
    },
  ];
}
