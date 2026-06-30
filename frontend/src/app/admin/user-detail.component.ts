import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { User } from '../core/models';
@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, ReactiveFormsModule],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css',
})
export class UserDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  id = Number(this.route.snapshot.paramMap.get('id'));
  user?: User;
  error = '';
  form = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    role: ['USER'],
    active: [true],
  });
  constructor(
    private router: Router,
    private api: ApiService,
    public auth: AuthService,
  ) {}
  ngOnInit() {
    this.api.user(this.id).subscribe({
      next: (u) => {
        this.user = u;
        this.form.patchValue({
          firstName: u.first_name,
          lastName: u.last_name,
          role: u.role,
          active: u.active,
        });
      },
      error: (e) => (this.error = e.error?.message),
    });
  }
  save() {
    this.api.updateUser(this.id, this.form.getRawValue()).subscribe({
      next: (u) => (this.user = u),
      error: (e) => (this.error = e.error?.message),
    });
  }
  remove() {
    if (confirm('Obrisati korisnika i sve njegove račune?'))
      this.api.deleteUser(this.id).subscribe({
        next: () => this.router.navigate(['/admin/users']),
        error: (e) => (this.error = e.error?.message),
      });
  }
}
