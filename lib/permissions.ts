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

export const ROLE_PRESETS: Record<Exclude<StaffRole, 'custom'>, AppModule[]> = {
  admin: APP_MODULES.map((m) => m.id),
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

export const modulesForRole = (role: StaffRole, custom?: string[] | null): AppModule[] => {
  if (role === 'custom') {
    const allowed = new Set(APP_MODULES.map((m) => m.id));
    return (custom || []).filter((m): m is AppModule => allowed.has(m as AppModule));
  }
  return ROLE_PRESETS[role] || ROLE_PRESETS.viewer;
};

export const canAccessModule = (
  module: AppModule,
  role: string | null | undefined,
  permissions?: string[] | null
): boolean => {
  const normalized = (role || 'viewer') as StaffRole;
  if (normalized === 'admin') return true;
  const allowed = modulesForRole(
    ['pastor', 'finance', 'kiosk', 'viewer', 'custom'].includes(normalized) ? normalized : 'viewer',
    permissions
  );
  return allowed.includes(module);
};

export const defaultLandingView = (
  role: string | null | undefined,
  permissions?: string[] | null
): AppModule => {
  const order = APP_MODULES.map((m) => m.id);
  for (const mod of order) {
    if (canAccessModule(mod, role, permissions)) return mod;
  }
  return 'dashboard';
};
