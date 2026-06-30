export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'USER' | 'ADMIN';
  active: boolean;
  created_at: string;
}
export type AccountType = 'CURRENT' | 'GIRO' | 'SAVINGS' | 'BUSINESS';
export interface Account {
  id: number;
  user_id: number;
  iban: string;
  name: string;
  type: AccountType;
  balance: number | string;
  currency: string;
  status: 'ACTIVE' | 'BLOCKED' | 'CLOSED';
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}
export interface Movement {
  id: number;
  account_id: number;
  amount: number | string;
  description?: string;
  reference?: string;
  created_at: string;
  kind?: 'DEPOSIT' | 'WITHDRAWAL';
  iban?: string;
  account_name?: string;
}
export interface DashboardData {
  accounts: Account[];
  recent: Movement[];
}
export interface AccountRequest {
  id: number;
  user_id: number;
  account_type: AccountType;
  requested_name: string;
  user_message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_message?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_account_id?: number;
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}
export interface TransferRecipient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  accounts: Array<Pick<Account, 'id' | 'name' | 'iban' | 'type'>>;
}
export interface Transfer {
  id: number;
  sender_account_id: number;
  recipient_account_id: number;
  sender_user_id?: number;
  recipient_user_id?: number;
  amount: number | string;
  description: string;
  created_at: string;
  sender_iban?: string;
  sender_account_name?: string;
  sender_first_name?: string;
  sender_last_name?: string;
  recipient_iban?: string;
  recipient_account_name?: string;
  recipient_first_name?: string;
  recipient_last_name?: string;
}
