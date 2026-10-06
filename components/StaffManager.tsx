import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Shield, Trash2, UserPlus, X, Check, Ban, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import {
  APP_MODULES,
  AppModule,
  ROLE_LABELS,
  ROLE_PRESETS,
  StaffProfile,
  StaffRole,
  modulesForRole,
} from '../lib/permissions';

interface StaffManagerProps {
  currentUserId?: string;
  currentUserRole?: string;
}

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'pastor' as StaffRole,
  permissions: ROLE_PRESETS.pastor as AppModule[],
};

const StaffManager: React.FC<StaffManagerProps> = ({ currentUserId, currentUserRole }) => {
  const isAdmin = currentUserRole === 'admin';
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, permissions, is_active, branch_id')
      .order('full_name', { ascending: true });

    if (error) {
      showToast(error.message, 'error');
      setStaff([]);
    } else {
      setStaff(
        (data || []).map((row) => ({
          id: row.id,
          fullName: row.full_name || '',
          email: row.email || '',
          role: (row.role || 'viewer') as StaffRole,
          permissions: modulesForRole((row.role || 'viewer') as StaffRole, row.permissions),
          isActive: row.is_active !== false,
          branchId: row.branch_id,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (person: StaffProfile) => {
    setEditing(person);
    setForm({
      fullName: person.fullName,
      email: person.email,
      password: '',
      role: person.role,
      permissions: person.permissions,
    });
    setModalOpen(true);
  };

  const onRoleChange = (role: StaffRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: role === 'custom' ? prev.permissions : modulesForRole(role),
    }));
  };

  const toggleModule = (mod: AppModule) => {
    setForm((prev) => {
      const nextRole: StaffRole = prev.role === 'admin' ? 'admin' : 'custom';
      const has = prev.permissions.includes(mod);
      const permissions = has ? prev.permissions.filter((m) => m !== mod) : [...prev.permissions, mod];
      return { ...prev, role: nextRole === 'admin' ? 'admin' : 'custom', permissions };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only administrators can manage staff.', 'error');
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: form.fullName.trim(),
            role: form.role,
            permissions: form.role === 'custom' ? form.permissions : modulesForRole(form.role),
            email: form.email.trim().toLowerCase() || editing.email,
          })
          .eq('id', editing.id);

        if (error) throw error;
        showToast('Staff permissions updated.', 'success');
      } else {
        if (!form.email.trim() || !form.password || form.password.length < 8) {
          showToast('Email and password (min 8 chars) are required.', 'error');
          setSaving(false);
          return;
        }

        const {
          data: { session: adminSession },
        } = await supabase.auth.getSession();
        if (!adminSession) throw new Error('Admin session expired. Sign in again.');

        const permissions = form.role === 'custom' ? form.permissions : modulesForRole(form.role);

        const { data: created, error: signUpError } = await supabase.auth.signUp({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          options: {
            data: {
              full_name: form.fullName.trim(),
              role: form.role,
              permissions,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Restore admin session (signUp may switch to the new user)
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });

        if (created.user?.id) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: created.user.id,
            full_name: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            role: form.role,
            permissions,
            is_active: true,
          });
          if (profileError) {
            // Trigger may have created row; try update
            await supabase
              .from('profiles')
              .update({
                full_name: form.fullName.trim(),
                email: form.email.trim().toLowerCase(),
                role: form.role,
                permissions,
                is_active: true,
              })
              .eq('id', created.user.id);
          }
        }

        showToast('Staff account created. They can sign in with that email/password.', 'success');
      }

      setModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      showToast(err?.message || 'Could not save staff member.', 'error');
      // Best-effort restore if signup swapped sessions
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id && data.session.user.id !== currentUserId) {
          showToast('Session changed — please sign in again as admin.', 'info');
        }
      } catch {
        /* ignore */
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (person: StaffProfile) => {
    if (!isAdmin) return;
    if (person.id === currentUserId) {
      showToast('You cannot deactivate your own account.', 'error');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !person.isActive })
      .eq('id', person.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(person.isActive ? 'Staff deactivated.' : 'Staff reactivated.', 'success');
    fetchStaff();
  };

  const removeStaffProfile = async (person: StaffProfile) => {
    if (!isAdmin || person.id === currentUserId) return;
    if (!window.confirm(`Remove ${person.fullName || person.email} from staff directory? Their login may still exist in Auth until deleted there.`)) {
      return;
    }
    const { error } = await supabase.from('profiles').delete().eq('id', person.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Staff profile removed.', 'success');
    fetchStaff();
  };

  const activeCount = useMemo(() => staff.filter((s) => s.isActive).length, [staff]);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Staff & Permissions</h3>
        <p className="text-sm text-slate-500">Only administrators can add staff or change module access.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 animate-fadeIn space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Shield size={22} className="text-gold-600" /> Staff & Permissions
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Add staff accounts and grant access to console modules. {activeCount} active.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gold-600"
        >
          <UserPlus size={16} /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : staff.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          No staff profiles yet. Add your first team member.
        </div>
      ) : (
        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="pb-3 pr-4">Staff</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Modules</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((person) => (
                <tr key={person.id} className="align-top">
                  <td className="py-4 pr-4">
                    <div className="text-sm font-black text-slate-900">{person.fullName || '—'}</div>
                    <div className="text-[11px] text-slate-400 font-medium">{person.email || person.id.slice(0, 8)}</div>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                      {ROLE_LABELS[person.role] || person.role}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {person.permissions.map((m) => (
                        <span key={m} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gold-50 text-gold-800 border border-gold-100">
                          {APP_MODULES.find((x) => x.id === m)?.label || m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                        person.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {person.isActive ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(person)} className="p-2 rounded-xl text-slate-400 hover:text-gold-600 hover:bg-gold-50" aria-label="Edit">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => toggleActive(person)} className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50" aria-label="Toggle active">
                        {person.isActive ? <Ban size={16} /> : <Check size={16} />}
                      </button>
                      {person.id !== currentUserId && (
                        <button onClick={() => removeStaffProfile(person)} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label="Remove">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 leading-relaxed">
        <strong className="text-slate-700">How access works:</strong> choose a role preset (Pastor, Finance, Kiosk, Viewer) or Custom,
        then tick the modules they may open. Settings stays admin-only by default unless you grant it on a custom role.
        After creating staff, they sign in at the console with the email and temporary password you set.
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {editing ? 'Edit Staff Access' : 'Add Staff Member'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-400" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Work Email</label>
                <input
                  required
                  type="email"
                  disabled={!!editing}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none disabled:opacity-60"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              {!editing && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Temporary Password</label>
                  <input
                    required
                    type="password"
                    minLength={8}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 8 characters"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role Preset</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(ROLE_LABELS) as StaffRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => onRoleChange(role)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        form.role === role
                          ? 'bg-gold-500 text-black border-gold-500'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-gold-300'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Module Access</label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {APP_MODULES.map((mod) => {
                    const checked = form.permissions.includes(mod.id) || form.role === 'admin';
                    const locked = form.role === 'admin';
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border ${
                          checked ? 'border-gold-200 bg-gold-50/50' : 'border-slate-100 bg-slate-50'
                        } ${locked ? 'opacity-80' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggleModule(mod.id)}
                        />
                        <span>
                          <span className="block text-xs font-black text-slate-800 uppercase tracking-tight">{mod.label}</span>
                          <span className="block text-[11px] text-slate-500">{mod.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-gold-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gold-600 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                {editing ? 'Save Permissions' : 'Create Staff Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;
