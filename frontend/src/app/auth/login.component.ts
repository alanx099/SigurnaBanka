import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './auth.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  error = '';
  loading = false;
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}
  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/']),
      error: (e) => {
        this.error = e.error?.message || 'Prijava trenutno nije moguća.';
        this.loading = false;
      },
    });
  }
}
