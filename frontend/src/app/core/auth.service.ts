import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { User } from './models';
import { API_BASE_URL } from './api-url';

interface AuthResponse {
  user: User;
  token: string;
}
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${API_BASE_URL}/auth`;
  private readonly userState = signal<User | null>(this.readUser());
  readonly user = this.userState.asReadonly();
  readonly loggedIn = computed(() => !!this.userState());
  readonly isAdmin = computed(() => this.userState()?.role === 'ADMIN');
  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}
  login(data: { email: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, data)
      .pipe(tap((r) => this.store(r)));
  }
  register(data: object) {
    return this.http
      .post<AuthResponse>(`${this.base}/register`, data)
      .pipe(tap((r) => this.store(r)));
  }
  token() {
    return sessionStorage.getItem('sb_token');
  }
  logout() {
    sessionStorage.removeItem('sb_token');
    sessionStorage.removeItem('sb_user');
    // Remove sessions created by older application versions.
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_user');
    this.userState.set(null);
    this.router.navigate(['/login']);
  }
  private store(response: AuthResponse) {
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_user');
    sessionStorage.setItem('sb_token', response.token);
    sessionStorage.setItem('sb_user', JSON.stringify(response.user));
    this.userState.set(response.user);
  }
  private readUser(): User | null {
    // A user object without its matching token must never create an authenticated UI.
    if (!sessionStorage.getItem('sb_token')) {
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_user');
      return null;
    }
    try {
      return JSON.parse(sessionStorage.getItem('sb_user') || 'null');
    } catch {
      return null;
    }
  }
}
