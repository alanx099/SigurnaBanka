import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Account,
  AccountRequest,
  DashboardData,
  Movement,
  Transfer,
  TransferRecipient,
  User,
} from './models';
import { API_BASE_URL } from './api-url';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = API_BASE_URL;
  constructor(private http: HttpClient) {}
  dashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.base}/dashboard`);
  }
  accounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.base}/accounts`);
  }
  account(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.base}/accounts/${id}`);
  }
  createAccount(data: object): Observable<Account> {
    return this.http.post<Account>(`${this.base}/accounts`, data);
  }
  updateAccount(id: number, data: object): Observable<Account> {
    return this.http.patch<Account>(`${this.base}/accounts/${id}`, data);
  }
  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/accounts/${id}`);
  }
  accountRequests(): Observable<AccountRequest[]> {
    return this.http.get<AccountRequest[]>(`${this.base}/account-requests`);
  }
  createAccountRequest(data: object): Observable<AccountRequest> {
    return this.http.post<AccountRequest>(
      `${this.base}/account-requests`,
      data,
    );
  }
  reviewAccountRequest(
    id: number,
    data: { action: 'APPROVE' | 'REJECT'; adminMessage?: string },
  ) {
    return this.http.patch<{
      request: AccountRequest;
      account: Account | null;
    }>(`${this.base}/account-requests/${id}`, data);
  }
  transferRecipients(): Observable<TransferRecipient[]> {
    return this.http.get<TransferRecipient[]>(
      `${this.base}/transfer-recipients`,
    );
  }
  transfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.base}/transfers`);
  }
  createTransfer(data: object): Observable<Transfer> {
    return this.http.post<Transfer>(`${this.base}/transfers`, data);
  }
  deposits(accountId?: number): Observable<Movement[]> {
    return this.http.get<Movement[]>(`${this.base}/deposits`, {
      params: accountId ? { accountId } : {},
    });
  }
  deposit(id: number): Observable<Movement> {
    return this.http.get<Movement>(`${this.base}/deposits/${id}`);
  }
  createDeposit(data: object): Observable<Movement> {
    return this.http.post<Movement>(`${this.base}/deposits`, data);
  }
  withdrawals(accountId?: number): Observable<Movement[]> {
    return this.http.get<Movement[]>(`${this.base}/withdrawals`, {
      params: accountId ? { accountId } : {},
    });
  }
  withdrawal(id: number): Observable<Movement> {
    return this.http.get<Movement>(`${this.base}/withdrawals/${id}`);
  }
  createWithdrawal(data: object): Observable<Movement> {
    return this.http.post<Movement>(`${this.base}/withdrawals`, data);
  }
  users(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/users`);
  }
  user(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}/users/${id}`);
  }
  updateUser(id: number, data: object): Observable<User> {
    return this.http.patch<User>(`${this.base}/users/${id}`, data);
  }
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }
}
