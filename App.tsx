
import React, { useState, useEffect, useMemo } from 'react';
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
import { supabase } from './lib/supabase';
import { View, Member, Branch } from './types';

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'hq-01', name: 'CCC Global HQ', location: 'Accra, Ghana', code: 'HQ-ACC', isHQ: true, timezone: 'GMT' }
];

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Production State
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);

  // 1. Check Auth Session on Load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession) setSession(currentSession);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Initial Org Data if Authenticated
  useEffect(() => {
    if (!session) return;
    fetchInitialData();
  }, [session]);

  const fetchInitialData = async () => {
    // Fetch Branches
    const { data: branchData } = await supabase
      .from('branches')
      .select('*')
      .order('is_hq', { ascending: false });
    
    if (branchData && branchData.length > 0) {
      const mappedBranches = branchData.map(b => ({
        id: b.id,
        name: b.name,
        location: b.location,
        code: b.code,
        isHQ: b.is_hq,
        timezone: b.timezone || 'GMT'
      }));
      setBranches(mappedBranches);
      // Only set active branch if not already set or if it's the first load
      if (!activeBranchId) setActiveBranchId(mappedBranches[0].id);
    }

    fetchMembers();
  };

  const fetchMembers = async () => {
    const { data: memberData, error } = await supabase
      .from('members')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error && memberData) {
      setMembers(memberData.map(m => ({
        id: m.id,
        branchId: m.branch_id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        category: m.category,
        dept: m.dept,
        status: m.status,
        photo: m.photo_url || m.id,
        dob: m.dob
      })));
    }
  };

  const activeBranchMembers = useMemo(() => 
    members.filter(m => m.branchId === activeBranchId), 
  [members, activeBranchId]);

  const activeBranch = useMemo(() => 
    branches.find(b => b.id === activeBranchId) || branches[0],
  [branches, activeBranchId]);

  if (loading) return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
       <div className="text-gold-500 animate-pulse font-black uppercase tracking-[0.5em] flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
          Synchronizing Charis Node...
       </div>
    </div>
  );

  if (!session) {
    return <LoginView onLogin={(newSession) => setSession(newSession)} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView members={activeBranchMembers} branch={activeBranch as Branch} allMembers={members} />;
      case 'members': return <MembersView members={members} onRefresh={fetchMembers} activeBranchId={activeBranchId} />;
      case 'finance': return <FinanceView branchId={activeBranchId} />;
      case 'attendance': return <AttendanceView members={members} onRefresh={fetchMembers} activeBranchId={activeBranchId} />;
      case 'counseling': return <CounselingView activeBranchId={activeBranchId} />;
      case 'settings': return <SettingsView branches={branches} setBranches={setBranches} />;
      default: return <div className="p-8 text-slate-400 font-bold uppercase tracking-widest text-center py-20 bg-white rounded-[3rem] border border-slate-200 border-dashed">Module terminal active. Collecting telemetry...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden animate-fadeIn">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        isOpen={isSidebarOpen} 
        toggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          currentView={currentView} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          branches={branches}
          activeBranchId={activeBranchId}
          onBranchChange={setActiveBranchId}
          onLogout={async () => {
            await supabase.auth.signOut();
            setSession(null);
          }}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            <div className="mb-6 flex items-center gap-3">
               <span className="px-3 py-1 bg-gold-500 text-black text-[10px] font-black uppercase rounded-lg border border-gold-600 shadow-sm flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                 {activeBranch?.isHQ ? 'Master HQ Node' : 'Satellite Node'}
               </span>
               <span className="text-slate-300 font-black text-xs uppercase tracking-widest">•</span>
               <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{activeBranch?.location || 'Detecting Location...'}</span>
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
