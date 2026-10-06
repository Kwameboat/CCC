import React, { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import MembersView from './components/MembersView';
import FinanceView from './components/FinanceView';
import AttendanceView from './components/AttendanceView';
import CMSView from './components/CMSView';
import StoreView from './components/StoreView';
import SermonsView from './components/SermonsView';
import EventsView from './components/EventsView';
import CommunicationView from './components/CommunicationView';
import SettingsView from './components/SettingsView';
import CounselingView from './components/CounselingView';
import LoginView from './components/LoginView';
import InstallAppButton from './components/InstallAppButton';
import { supabase, hasSupabaseConfig } from './lib/supabase';
import { showToast } from './lib/toast';
import { View, Member, Branch } from './types';
import {
  AppModule,
  canAccessModule,
  defaultLandingView,
  modulesForRole,
  StaffRole,
} from './lib/permissions';

type AppSession = Session | { user: { email?: string; id: string }; isDemo: true };

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'hq-01', name: 'CCC Global HQ', location: 'Accra, Ghana', code: 'HQ-ACC', isHQ: true, timezone: 'GMT' }
];

const ConfigMissingScreen = () => (
  <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
    <div className="max-w-lg space-y-5 text-center">
      <h1 className="text-3xl font-black uppercase tracking-tight text-gold-400">Configuration Required</h1>
      <p className="text-slate-400 text-sm leading-relaxed">
        Set <code className="text-gold-300">VITE_SUPABASE_URL</code> and{' '}
        <code className="text-gold-300">VITE_SUPABASE_ANON_KEY</code> in <code className="text-white">.env.local</code> locally
        and in the Vercel project environment variables for production.
      </p>
      <p className="text-xs text-slate-500 font-medium">See <code className="text-slate-300">.env.example</code> and <code className="text-slate-300">supabase/schema.sql</code>.</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('admin');
  const [userName, setUserName] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [accessReady, setAccessReady] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession) setSession(currentSession);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (currentSession) setSession(currentSession);
      else setSession((prev) => (prev && 'isDemo' in prev ? prev : null));
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !hasSupabaseConfig) return;
    if ('isDemo' in session && session.isDemo) {
      setDataError('Demo session: cloud writes require a real Supabase login.');
      setUserName(session.user.email || 'Demo');
      setUserRole('viewer');
      setUserPermissions(modulesForRole('viewer'));
      setCurrentView(defaultLandingView('viewer'));
      setAccessReady(true);
      return;
    }
    fetchInitialData();
    loadProfile(session.user.id, session.user.email);
  }, [session]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsSidebarOpen(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const loadProfile = async (userId: string, email?: string | null) => {
    setAccessReady(false);
    let { data, error } = await supabase
      .from('profiles')
      .select('full_name, role, permissions, is_active, email')
      .eq('id', userId)
      .maybeSingle();

    // Bootstrap profile for first sign-ins (e.g. first admin created in dashboard)
    if (!data && !error) {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const bootstrapRole: StaffRole = !count || count === 0 ? 'admin' : 'viewer';
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: email?.split('@')[0] || 'Staff',
        email: email || null,
        role: bootstrapRole,
        permissions: modulesForRole(bootstrapRole),
        is_active: true,
      });
      ({ data } = await supabase
        .from('profiles')
        .select('full_name, role, permissions, is_active, email')
        .eq('id', userId)
        .maybeSingle());
    }

    if (data && data.is_active === false) {
      showToast('Your staff account is deactivated. Contact an administrator.', 'error');
      await supabase.auth.signOut();
      setSession(null);
      setAccessReady(true);
      return;
    }

    const role = (data?.role || 'admin') as StaffRole;
    const perms = modulesForRole(role, data?.permissions);
    setUserRole(role);
    setUserName(data?.full_name || '');
    setUserPermissions(perms);
    setCurrentView((prev) => (canAccessModule(prev as AppModule, role, perms) ? prev : defaultLandingView(role, perms)));
    setAccessReady(true);
  };
  const fetchInitialData = async () => {
    setDataError(null);
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('*')
      .order('is_hq', { ascending: false });

    if (branchError) {
      setDataError(branchError.message);
      showToast('Could not load branches.', 'error');
    } else if (branchData && branchData.length > 0) {
      const mappedBranches = branchData.map((b) => ({
        id: b.id,
        name: b.name,
        location: b.location,
        code: b.code,
        isHQ: b.is_hq,
        timezone: b.timezone || 'GMT'
      }));
      setBranches(mappedBranches);
      setActiveBranchId((prev) => prev || mappedBranches[0].id);
    }

    await fetchMembers();
  };

  const fetchMembers = async () => {
    const { data: memberData, error } = await supabase
      .from('members')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    if (memberData) {
      setMembers(
        memberData.map((m) => ({
          id: m.id,
          branchId: m.branch_id,
          name: m.name,
          email: m.email || '',
          phone: m.phone || '',
          category: m.category || 'Member',
          dept: m.dept || '',
          status: m.status || 'Active',
          photo: m.photo_url || m.id,
          dob: m.dob || ''
        }))
      );
    }
  };

  const activeBranchMembers = useMemo(
    () => members.filter((m) => m.branchId === activeBranchId),
    [members, activeBranchId]
  );

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId) || branches[0],
    [branches, activeBranchId]
  );

  const userEmail =
    session && 'user' in session
      ? session.user?.email || ('isDemo' in session ? 'demo@charis.org' : 'Staff')
      : 'Staff';

  if (!hasSupabaseConfig) {
    return <ConfigMissingScreen />;
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-gold-500 animate-pulse font-black uppercase tracking-[0.5em] flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
          Synchronizing Charis Node...
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginView onLogin={(newSession) => setSession(newSession)} />;
  }

  const renderContent = () => {
    const view = currentView as AppModule;
    if (!canAccessModule(view, userRole, userPermissions)) {
      return (
        <div className="p-8 text-center bg-white rounded-[3rem] border border-rose-100">
          <h3 className="text-lg font-black uppercase text-rose-600 mb-2">Access Denied</h3>
          <p className="text-sm text-slate-500">Your role does not include this module. Ask an administrator to grant access.</p>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardView members={activeBranchMembers} branch={activeBranch as Branch} allMembers={members} />;
      case 'members':
        return <MembersView members={members} onRefresh={fetchMembers} activeBranchId={activeBranchId} />;
      case 'finance':
        return <FinanceView branchId={activeBranchId} members={members} />;
      case 'attendance':
        return <AttendanceView members={members} onRefresh={fetchMembers} activeBranchId={activeBranchId} />;
      case 'counseling':
        return <CounselingView activeBranchId={activeBranchId} />;
      case 'store':
        return <StoreView />;
      case 'sermons':
        return <SermonsView branchId={activeBranchId} />;
      case 'events':
        return <EventsView branchId={activeBranchId} />;
      case 'communication':
        return <CommunicationView members={activeBranchMembers} />;
      case 'cms':
        return <CMSView />;
      case 'settings':
        return (
          <SettingsView
            branches={branches}
            setBranches={setBranches}
            onBranchesChanged={fetchInitialData}
            userRole={userRole}
            currentUserId={!('isDemo' in session) ? session.user.id : undefined}
          />
        );
      default:
        return (
          <div className="p-8 text-slate-400 font-bold uppercase tracking-widest text-center py-20 bg-white rounded-[3rem] border border-slate-200 border-dashed">
            Module unavailable.
          </div>
        );
    }
  };

  if (!accessReady && session && !('isDemo' in session)) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-gold-500 animate-pulse font-black uppercase tracking-[0.5em] flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
          Loading staff access...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden animate-fadeIn">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isOpen={isSidebarOpen}
        toggle={() => setIsSidebarOpen(!isSidebarOpen)}
        userRole={userRole}
        permissions={userPermissions}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
        <Header
          currentView={currentView}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          branches={branches}
          activeBranchId={activeBranchId}
          onBranchChange={setActiveBranchId}
          userEmail={userEmail}
          userName={userName || undefined}
          userRole={userRole}
          onLogout={async () => {
            if (!('isDemo' in session)) await supabase.auth.signOut();
            setSession(null);
          }}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full animate-fadeIn">
            {dataError && (
              <div className="mb-4 px-3 sm:px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-bold break-words">
                {dataError}
              </div>
            )}
            <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="px-2.5 sm:px-3 py-1 bg-gold-500 text-black text-[9px] sm:text-[10px] font-black uppercase rounded-lg border border-gold-600 shadow-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                {activeBranch?.isHQ ? 'Master HQ Node' : 'Satellite Node'}
              </span>
              <span className="text-slate-300 font-black text-xs uppercase tracking-widest hidden sm:inline">•</span>
              <span className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest truncate max-w-full">
                {activeBranch?.location || 'Detecting Location...'}
              </span>
            </div>
            <div className="mb-4 sm:mb-6">
              <InstallAppButton variant="banner" />
            </div>
            {renderContent()}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
