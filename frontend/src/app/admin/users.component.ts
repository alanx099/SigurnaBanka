import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { User } from '../core/models';
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  filtered: User[] = [];
  loading = true;
  error = '';
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.users().subscribe({
      next: (u) => {
        this.users = this.filtered = u;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.error?.message;
        this.loading = false;
      },
    });
  }
  search(value: string) {
    const q = value.toLowerCase();
    this.filtered = this.users.filter((u) =>
      `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q),
    );
  }
}
