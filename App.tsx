
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
  { id: 'hq-01', name: 'CCC Global HQ', location: 'Accra, Ghana', code: 'HQ-ACC', isHQ: true, timezone: 'GMT' },
  { id: 'sat-02', name: 'CCC North Campus', location: 'Kumasi, Ghana', code: 'SAT-KMS', isHQ: false, timezone: 'GMT' }
];

const MOCK_MEMBERS: Member[] = [
  { id: 'm1', branchId: 'hq-01', name: 'Dr. Silas Okeke', email: 'silas@charis.org', phone: '+233 24 555 0123', category: 'Pastor', dept: 'Leadership', status: 'Active', photo: 'silas', dob: '1985-06-15' },
  { id: 'm2', branchId: 'hq-01', name: 'Sarah Johnson', email: 'sarah@gmail.com', phone: '+233 24 555 0456', category: 'Member', dept: 'Choir', status: 'Active', photo: 'sarah', dob: '1992-11-20' },
  { id: 'm3', branchId: 'sat-02', name: 'Michael Boateng', email: 'mike@charis.org', phone: '+233 24 555 0789', category: 'Deacon', dept: 'Protocol', status: 'Active', photo: 'mike', dob: '1988-04-12' },
];

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Production State
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [activeBranchId, setActiveBranchId] = useState<string>('hq-01');
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);

  // 1. Check Auth Session on Load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession) setSession(currentSession);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (currentSession) setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Initial Org Data if Authenticated and not in Demo Mode
  useEffect(() => {
    if (!session || session.isDemo) return;

    const fetchData = async () => {
      // Fetch Branches from Supabase
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
        setActiveBranchId(mappedBranches[0].id);
      }

      fetchMembers();
    };

    fetchData();
  }, [session]);

  const fetchMembers = async () => {
    if (session?.isDemo) return;

    const { data: memberData } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (memberData && memberData.length > 0) {
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
          Initializing CCC Cloud...
       </div>
    </div>
  );

  if (!session) {
    return <LoginView onLogin={(newSession) => setSession(newSession)} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView members={activeBranchMembers} branch={activeBranch as Branch} allMembers={members} />;
      case 'members': return <MembersView members={activeBranchMembers} onRefresh={fetchMembers} activeBranchId={activeBranchId} />;
      case 'finance': return <FinanceView branchId={activeBranchId} />;
      case 'attendance': return <AttendanceView members={activeBranchMembers} onRefresh={fetchMembers} activeBranchId={activeBranchId} />;
      case 'counseling': return <CounselingView activeBranchId={activeBranchId} />;
      case 'settings': return <SettingsView branches={branches} setBranches={setBranches} />;
      default: return <div className="p-8 text-slate-400 font-bold uppercase tracking-widest text-center py-20 bg-white rounded-[3rem] border border-slate-200 border-dashed">Module Terminal Under Development...</div>;
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
            if (!session.isDemo) await supabase.auth.signOut();
            setSession(null);
          }}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            <div className="mb-6 flex items-center gap-3">
               <span className="px-3 py-1 bg-gold-100 text-gold-700 text-[10px] font-black uppercase rounded-lg border border-gold-200 shadow-sm flex items-center gap-2">
                 {session.isDemo && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>}
                 {activeBranch.isHQ ? 'Global HQ Terminal' : 'Satellite Branch'}
               </span>
               <span className="text-slate-300 font-black text-xs uppercase tracking-widest">•</span>
               <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{activeBranch.location}</span>
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
