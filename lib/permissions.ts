import { View } from '../types';

export type StaffRole = 'admin' | 'pastor' | 'finance' | 'kiosk' | 'viewer' | 'custom';

export type AppModule = Exclude<View, 'branches'>;

export const APP_MODULES: { id: AppModule; label: string; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview & analytics' },
  { id: 'members', label: 'Members', description: 'Congregation directory' },
  { id: 'finance', label: 'Finance', description: 'Treasury & ledger' },
  { id: 'attendance', label: 'Attendance', description: 'Check-in & kiosk' },
  { id: 'counseling', label: 'Counseling', description: 'Pastoral care notes' },
  { id: 'store', label: 'Store', description: 'Inventory catalog' },
  { id: 'sermons', label: 'Sermons', description: 'Message library' },
  { id: 'events', label: 'Events', description: 'Programs & calendar' },
  { id: 'communication', label: 'Broadcast', description: 'Member messaging' },
  { id: 'cms', label: 'CMS Portal', description: 'Website pages' },
  { id: 'settings', label: 'Settings', description: 'Admin & staff control' },
];

export const ALL_MODULE_IDS: AppModule[] = APP_MODULES.map((m) => m.id);

export const ROLE_PRESETS: Record<Exclude<StaffRole, 'custom'>, AppModule[]> = {
  admin: ALL_MODULE_IDS,
  pastor: ['dashboard', 'members', 'attendance', 'counseling', 'sermons', 'events', 'communication'],
  finance: ['dashboard', 'finance', 'store'],
  kiosk: ['attendance'],
  viewer: ['dashboard'],
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrator',
  pastor: 'Pastor / Ministry',
  finance: 'Finance Officer',
  kiosk: 'Attendance Kiosk',
  viewer: 'Viewer (read-only dash)',
  custom: 'Custom permissions',
};

export interface StaffProfile {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  permissions: AppModule[];
  isActive: boolean;
  branchId?: string | null;
}

export const normalizeRole = (role: string | null | undefined): StaffRole => {
  const r = (role || 'viewer').toLowerCase().trim();
  if (r === 'admin' || r === 'pastor' || r === 'finance' || r === 'kiosk' || r === 'viewer' || r === 'custom') {
    return r;
  }
  return 'viewer';
};

export const modulesForRole = (role: StaffRole | string | null | undefined, custom?: string[] | null): AppModule[] => {
  const normalized = normalizeRole(role);
  const allowed = new Set(ALL_MODULE_IDS);
  const fromDb = (custom || []).filter((m): m is AppModule => allowed.has(m as AppModule));

  if (normalized === 'admin') return ALL_MODULE_IDS;
  if (normalized === 'custom') return fromDb;
  // Honor explicit permissions saved in the database (manual SQL / staff edits)
  if (fromDb.length > 0) return fromDb;
  return ROLE_PRESETS[normalized] || ROLE_PRESETS.viewer;
};

export const canAccessModule = (
  module: AppModule,
  role: string | null | undefined,
  permissions?: string[] | null
): boolean => {
  const normalized = normalizeRole(role);
  if (normalized === 'admin') return true;
  return modulesForRole(normalized, permissions).includes(module);
};

export const defaultLandingView = (
  role: string | null | undefined,
  permissions?: string[] | null
): AppModule => {
  for (const mod of ALL_MODULE_IDS) {
    if (canAccessModule(mod, role, permissions)) return mod;
  }
  return 'dashboard';
};
