export interface Branch {
  id: string;
  name: string;
  location: string;
  code: string;
  timezone: string;
  isHQ: boolean;
}

export interface Member {
  id: string;
  branchId: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  dept: string;
  status: string;
  photo: string;
  dob: string; // YYYY-MM-DD
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: 'on_registration' | 'on_birthday' | 'on_giving' | 'on_first_visit';
  action: 'send_sms' | 'send_email' | 'notify_admin' | 'assign_dept';
  delay: string; // e.g. "Instant", "2 hours", "1 day"
  active: boolean;
}

export interface GatewayConfig {
  provider: 'paystack' | 'hubtel' | 'flutterwave' | 'stripe';
  publicKey: string;
  secretKey: string;
  isEnabled: boolean;
  merchantId?: string;
}

export interface CounselingRecord {
  id: string;
  branchId: string;
  personName: string;
  problem: string;
  solution: string;
  followUpStatus: 'Solved' | 'Pending' | 'Ongoing';
  date: string;
  counselor: string;
}

export interface Transaction {
  id: string;
  branchId: string;
  memberId?: string;
  memberName?: string;
  amount: number;
  type: 'Tithe' | 'Offering' | 'Donation' | 'Special Fund' | 'Store' | 'Pledge';
  method: 'Stripe' | 'PayPal' | 'Cash' | 'Bank Transfer' | 'Mobile Money';
  status: 'Completed' | 'Pending' | 'Failed';
  date: string;
}

export type View = 'dashboard' | 'members' | 'finance' | 'attendance' | 'cms' | 'store' | 'sermons' | 'events' | 'communication' | 'settings' | 'counseling' | 'branches';
