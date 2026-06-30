import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './auth.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  error = '';
  loading = false;
  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}
  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/']),
      error: (e) => {
        this.error = e.error?.message || 'Registracija trenutno nije moguća.';
        this.loading = false;
      },
    });
  }
}
