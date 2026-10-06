import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, CheckCircle2, ArrowLeft, ShieldCheck, Smartphone, UserPlus,
  Users, Loader2, Plus, X, Sparkles, AlertTriangle, UserCheck, Star,
  CalendarDays, Ban, RefreshCw
} from 'lucide-react';
import { Member } from '../types';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import {
  AttendanceLog,
  ServiceRecord,
  analyzeService,
  ServiceInsightReport,
} from '../lib/attendanceInsights';

interface AttendanceViewProps {
  members: Member[];
  onRefresh: () => void;
  activeBranchId: string;
}

type Tab = 'services' | 'checkin' | 'insights' | 'alerts';

const mapService = (row: any): ServiceRecord => ({
  id: row.id,
  branchId: row.branch_id,
  name: row.name,
  serviceDate: row.service_date,
  serviceTime: row.service_time,
  status: row.status,
  notes: row.notes,
  closedAt: row.closed_at,
});

const mapLog = (row: any): AttendanceLog => ({
  id: row.id,
  serviceId: row.service_id,
  memberId: row.member_id,
  name: row.name,
  method: row.method || 'Admin Panel',
  isFirstTimer: !!row.is_first_timer,
  visitorStatus: (row.visitor_status || (row.is_first_timer ? 'first_timer' : row.member_id ? 'member' : 'visitor')) as AttendanceLog['visitorStatus'],
  createdAt: row.created_at,
});

const AttendanceView: React.FC<AttendanceViewProps> = ({ members, onRefresh, activeBranchId }) => {
  const [tab, setTab] = useState<Tab>('services');
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [activeServiceId, setActiveServiceId] = useState<string>('');
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [allRecentLogs, setAllRecentLogs] = useState<AttendanceLog[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<ServiceInsightReport | null>(null);

  const [isKioskMode, setIsKioskMode] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCheckedInMember, setLastCheckedInMember] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [registrationForm, setRegistrationForm] = useState({ name: '', phone: '', email: '', dob: '' });

  const [serviceModal, setServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: 'Sunday Service',
    serviceDate: new Date().toISOString().slice(0, 10),
    serviceTime: '09:00',
  });
  const [saving, setSaving] = useState(false);
  const [schemaHint, setSchemaHint] = useState(false);

  const activeService = useMemo(
    () => services.find((s) => s.id === activeServiceId) || services.find((s) => s.status === 'open') || services[0],
    [services, activeServiceId]
  );

  const branchMembers = useMemo(
    () => members.filter((m) => m.branchId === activeBranchId),
    [members, activeBranchId]
  );

  useEffect(() => {
    refreshAll();
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeService?.id) return;
    fetchServiceLogs(activeService.id);
    const channel = supabase
      .channel(`attendance_${activeService.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, (payload) => {
        const row = payload.new;
        if (row.service_id === activeService.id) {
          setLogs((prev) => [mapLog(row), ...prev.filter((p) => p.id !== row.id)]);
        }
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [activeService?.id]);

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchServices(), fetchAlerts(), fetchRecentLogs()]);
    setLoading(false);
  };

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('branch_id', activeBranchId)
      .order('service_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (/relation .*services.* does not exist/i.test(error.message) || error.code === '42P01' || /Could not find the table/i.test(error.message)) {
        setSchemaHint(true);
      } else {
        showToast(error.message, 'error');
      }
      setServices([]);
      return;
    }
    setSchemaHint(false);
    const mapped = (data || []).map(mapService);
    setServices(mapped);
    setActiveServiceId((prev) => prev || mapped.find((s) => s.status === 'open')?.id || mapped[0]?.id || '');
  };

  const fetchServiceLogs = async (serviceId: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast(error.message, 'error');
      setLogs([]);
      return;
    }
    setLogs((data || []).map(mapLog));
  };

  const fetchRecentLogs = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('branch_id', activeBranchId)
      .not('service_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(2000);
    setAllRecentLogs((data || []).map(mapLog));
  };

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('attendance_alerts')
      .select('*')
      .eq('branch_id', activeBranchId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    setAlerts(data || []);
  };

  const createService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from('services')
      .insert([
        {
          branch_id: activeBranchId,
          name: serviceForm.name.trim(),
          service_date: serviceForm.serviceDate,
          service_time: serviceForm.serviceTime || null,
          status: 'open',
        },
      ])
      .select()
      .single();
    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Service opened for check-in.', 'success');
    setServiceModal(false);
    await fetchServices();
    if (data?.id) {
      setActiveServiceId(data.id);
      setTab('checkin');
    }
  };

  const alreadyCheckedIn = (memberId?: string | null, name?: string) => {
    if (memberId && logs.some((l) => l.memberId === memberId)) return true;
    if (name && logs.some((l) => l.name.toLowerCase() === name.toLowerCase())) return true;
    return false;
  };

  const handleCheckIn = async (
    person: Member | { name: string; id?: string },
    visitorStatus: AttendanceLog['visitorStatus'] = 'member'
  ) => {
    if (!activeService || activeService.status !== 'open') {
      showToast('Open or select an active service first.', 'error');
      return;
    }
    const name = person.name;
    const memberId = 'id' in person && person.id ? person.id : null;
    if (alreadyCheckedIn(memberId, name)) {
      showToast(`${name} is already checked in for this service.`, 'info');
      return;
    }

    const isFirstTimer = visitorStatus === 'first_timer';
    const { error } = await supabase.from('attendance').insert([
      {
        branch_id: activeBranchId,
        service_id: activeService.id,
        member_id: memberId,
        name,
        method: isKioskMode ? 'Kiosk' : 'Admin Panel',
        is_first_timer: isFirstTimer,
        visitor_status: visitorStatus,
      },
    ]);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    setLastCheckedInMember(name);
    setShowSuccess(true);
    setSearchTerm('');
    setAdminSearch('');
    setTimeout(() => setShowSuccess(false), 2500);
    setIsRegistering(false);
    fetchServiceLogs(activeService.id);
  };

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: newMember, error } = await supabase
      .from('members')
      .insert([
        {
          branch_id: activeBranchId,
          name: registrationForm.name.trim(),
          email: registrationForm.email || null,
          phone: registrationForm.phone.trim(),
          category: 'First Timer',
          dept: 'Visitors',
          status: 'Active',
          dob: registrationForm.dob || null,
        },
      ])
      .select()
      .single();

    if (error || !newMember) {
      showToast(error?.message || 'Could not register visitor.', 'error');
      return;
    }
    onRefresh();
    await handleCheckIn(
      { id: newMember.id, name: newMember.name },
      'first_timer'
    );
  };

  const promoteToMember = async (log: AttendanceLog) => {
    if (!log.memberId) {
      showToast('No linked profile to update.', 'error');
      return;
    }
    const { error } = await supabase
      .from('members')
      .update({ category: 'Member', dept: 'Congregation', status: 'Active' })
      .eq('id', log.memberId);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    await supabase
      .from('attendance')
      .update({ visitor_status: 'member', is_first_timer: false })
      .eq('id', log.id);
    showToast(`${log.name} marked as Member.`, 'success');
    onRefresh();
    if (activeService) fetchServiceLogs(activeService.id);
  };

  const closeServiceAndAnalyze = async () => {
    if (!activeService) return;
    setSaving(true);

    const { error } = await supabase
      .from('services')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', activeService.id);

    if (error) {
      setSaving(false);
      showToast(error.message, 'error');
      return;
    }

    await fetchServices();
    await fetchRecentLogs();

    const closedNewest = [
      { ...activeService, status: 'closed' as const },
      ...services.filter((s) => s.id !== activeService.id && s.status === 'closed'),
    ].sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : -1));

    const logsByServiceId: Record<string, AttendanceLog[]> = {};
    for (const log of [...logs, ...allRecentLogs]) {
      if (!log.serviceId) continue;
      if (!logsByServiceId[log.serviceId]) logsByServiceId[log.serviceId] = [];
      if (!logsByServiceId[log.serviceId].some((x) => x.id === log.id)) {
        logsByServiceId[log.serviceId].push(log);
      }
    }
    logsByServiceId[activeService.id] = logs;

    const report = analyzeService(
      { ...activeService, status: 'closed' },
      branchMembers,
      logs,
      closedNewest,
      logsByServiceId,
      3
    );
    setInsight(report);

    // Persist 3-miss alerts
    for (const alert of report.consecutiveMissAlerts) {
      const { data: existing } = await supabase
        .from('attendance_alerts')
        .select('id')
        .eq('branch_id', activeBranchId)
        .eq('member_id', alert.member.id)
        .eq('status', 'open')
        .maybeSingle();
      if (!existing) {
        await supabase.from('attendance_alerts').insert([
          {
            branch_id: activeBranchId,
            member_id: alert.member.id,
            member_name: alert.member.name,
            alert_type: 'consecutive_absence',
            miss_count: alert.missCount,
            details: `Missed: ${alert.recentServiceNames.join('; ')}`,
            status: 'open',
          },
        ]);
      }
    }

    await fetchAlerts();
    setSaving(false);
    setTab('insights');
    showToast('Service closed. Intelligence report ready.', 'success');
  };

  const runInsightsForService = async (service: ServiceRecord) => {
    setActiveServiceId(service.id);
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('service_id', service.id)
      .order('created_at', { ascending: false });
    const serviceLogs = (data || []).map(mapLog);
    setLogs(serviceLogs);

    const closedNewest = services
      .filter((s) => s.status === 'closed' || s.id === service.id)
      .sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : -1));

    const logsByServiceId: Record<string, AttendanceLog[]> = {};
    for (const log of allRecentLogs) {
      if (!log.serviceId) continue;
      if (!logsByServiceId[log.serviceId]) logsByServiceId[log.serviceId] = [];
      logsByServiceId[log.serviceId].push(log);
    }
    logsByServiceId[service.id] = serviceLogs;

    const report = analyzeService(service, branchMembers, serviceLogs, closedNewest, logsByServiceId, 3);
    setInsight(report);
    setTab('insights');
  };

  const acknowledgeAlert = async (id: string) => {
    const { error } = await supabase.from('attendance_alerts').update({ status: 'acknowledged' }).eq('id', id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    fetchAlerts();
  };

  const stats = useMemo(() => {
    const membersPresent = logs.filter((l) => l.visitorStatus === 'member' || (!!l.memberId && !l.isFirstTimer)).length;
    const firstTimers = logs.filter((l) => l.isFirstTimer || l.visitorStatus === 'first_timer').length;
    return { total: logs.length, membersPresent, firstTimers };
  }, [logs]);

  const filteredKioskMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    return branchMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.phone || '').includes(q)
    );
  }, [searchTerm, branchMembers]);

  const filteredAdminMembers = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    if (!q) return branchMembers.slice(0, 12);
    return branchMembers
      .filter((m) => m.name.toLowerCase().includes(q) || (m.phone || '').includes(q))
      .slice(0, 20);
  }, [adminSearch, branchMembers]);

  if (isKioskMode) {
    return (
      <div className="fixed inset-0 z-[999] bg-slate-950 flex flex-col text-white animate-fadeIn overflow-hidden">
        <div className="h-16 sm:h-24 bg-slate-900 border-b border-white/5 flex items-center justify-between px-4 sm:px-8 shrink-0 gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="p-2 sm:p-3 bg-gold-500 text-black rounded-2xl shrink-0"><Smartphone size={22} className="sm:w-7 sm:h-7" /></div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-black uppercase text-gold-500 truncate">Kiosk · {activeService?.name || 'No Service'}</h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5 mt-1 truncate">
                <ShieldCheck size={14} className="text-gold-500 shrink-0" /> {activeService?.serviceDate || 'Select a service'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsKioskMode(false)} className="px-3 sm:px-6 py-2 sm:py-3 bg-white/5 hover:bg-rose-600 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0">Exit</button>
        </div>

        {showSuccess && (
          <div className="absolute inset-0 z-[1100] bg-gold-500 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
            <CheckCircle2 size={72} className="mb-4 sm:mb-6 text-slate-950 sm:w-24 sm:h-24" strokeWidth={3} />
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-slate-950 mb-3">Welcome!</h2>
            <p className="text-xl sm:text-3xl font-black uppercase text-slate-800 break-words px-2">{lastCheckedInMember}</p>
          </div>
        )}

        {isRegistering ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <form onSubmit={handleQuickRegister} className="max-w-xl w-full bg-slate-900 rounded-[2.5rem] p-10 space-y-5 border border-white/10">
              <button type="button" onClick={() => setIsRegistering(false)} className="flex items-center gap-2 text-gold-500 text-xs font-black uppercase"><ArrowLeft size={16} /> Back</button>
              <h3 className="text-2xl font-black uppercase">First Timer Registration</h3>
              <input required placeholder="Full Name" className="w-full px-5 py-4 bg-slate-800 rounded-2xl font-bold outline-none" value={registrationForm.name} onChange={(e) => setRegistrationForm({ ...registrationForm, name: e.target.value })} />
              <input required placeholder="Phone" className="w-full px-5 py-4 bg-slate-800 rounded-2xl font-bold outline-none" value={registrationForm.phone} onChange={(e) => setRegistrationForm({ ...registrationForm, phone: e.target.value })} />
              <input type="email" placeholder="Email (optional)" className="w-full px-5 py-4 bg-slate-800 rounded-2xl font-bold outline-none" value={registrationForm.email} onChange={(e) => setRegistrationForm({ ...registrationForm, email: e.target.value })} />
              <button type="submit" className="w-full py-5 bg-gold-500 text-black rounded-2xl font-black uppercase tracking-widest">Check In First Timer</button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
            <div className="flex-1 p-4 sm:p-8 flex flex-col items-center justify-center overflow-y-auto">
              <div className="max-w-2xl w-full space-y-6 sm:space-y-8 text-center">
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter">Check-In</h2>
                <div className="relative">
                  <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-500" size={22} />
                  <input autoFocus placeholder="Name or phone…" className="w-full pl-12 sm:pl-16 pr-4 sm:pr-6 py-4 sm:py-6 bg-slate-900 border-2 border-white/10 rounded-[1.5rem] sm:rounded-[2rem] text-lg sm:text-2xl font-black outline-none focus:border-gold-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {searchTerm.length >= 2 && (
                  <div className="space-y-3 text-left">
                    {filteredKioskMembers.length > 0 ? (
                      filteredKioskMembers.slice(0, 5).map((m) => (
                        <button key={m.id} onClick={() => handleCheckIn(m, 'member')} className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-900 rounded-2xl border border-white/5 hover:border-gold-500">
                          <div className="min-w-0 text-left">
                            <div className="font-black text-base sm:text-xl uppercase truncate">{m.name}</div>
                            <div className="text-[10px] text-gold-500 font-black uppercase tracking-widest">{m.category || 'Member'}</div>
                          </div>
                          <UserCheck size={22} className="text-gold-500 shrink-0" />
                        </button>
                      ))
                    ) : (
                      <button onClick={() => { setRegistrationForm({ ...registrationForm, name: searchTerm }); setIsRegistering(true); }} className="w-full py-5 sm:py-6 border-2 border-dashed border-white/20 rounded-2xl font-black uppercase text-slate-400 hover:text-gold-500 text-sm sm:text-base">
                        + Register First Timer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="hidden lg:flex w-96 bg-slate-900 border-l border-white/5 flex-col p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">This Service</h3>
              <div className="space-y-3 overflow-y-auto">
                {logs.map((c) => (
                  <div key={c.id} className="p-4 bg-slate-950 rounded-2xl flex justify-between gap-2">
                    <div>
                      <div className="font-black uppercase text-sm">{c.name}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-gold-500">
                        {c.isFirstTimer || c.visitorStatus === 'first_timer' ? 'First Timer' : 'Member'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 font-bold">
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {schemaHint && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm font-medium">
          Service tables are missing. Run <code className="font-bold">supabase/migrations/003_service_attendance.sql</code> in the Supabase SQL Editor, then refresh.
          <button
            className="ml-3 text-amber-700 font-black uppercase text-[10px] tracking-widest underline"
            onClick={async () => {
              const res = await fetch('/supabase/migrations/003_service_attendance.sql');
              await navigator.clipboard.writeText(await res.text());
              showToast('SQL copied.', 'success');
            }}
          >
            Copy SQL
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Service Attendance</h2>
          <p className="text-slate-500 text-sm font-medium">Track each service, members vs first-timers, and absence intelligence.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refreshAll} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-gold-600" aria-label="Refresh">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setServiceModal(true)} className="px-5 py-3 bg-gold-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Plus size={16} /> New Service
          </button>
          <button
            disabled={!activeService || activeService.status !== 'open'}
            onClick={() => setIsKioskMode(true)}
            className="px-5 py-3 bg-slate-950 text-gold-500 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
          >
            <Smartphone size={16} /> Kiosk
          </button>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit flex-wrap gap-1">
        {[
          { id: 'services', label: 'Services' },
          { id: 'checkin', label: 'Check-In' },
          { id: 'insights', label: 'AI Insights' },
          { id: 'alerts', label: `Alerts (${alerts.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
              tab === t.id ? 'bg-white text-gold-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeService && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Service</div>
            <div className="font-black text-slate-900 uppercase tracking-tight text-sm sm:text-base break-words">
              {activeService.name} · {activeService.serviceDate}
              <span className={`ml-2 text-[9px] px-2 py-0.5 rounded-lg inline-block ${activeService.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {activeService.status}
              </span>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div><div className="text-xl sm:text-2xl font-black">{stats.total}</div><div className="text-[9px] font-black uppercase text-slate-400">Total</div></div>
            <div><div className="text-xl sm:text-2xl font-black text-emerald-600">{stats.membersPresent}</div><div className="text-[9px] font-black uppercase text-slate-400">Members</div></div>
            <div><div className="text-xl sm:text-2xl font-black text-gold-600">{stats.firstTimers}</div><div className="text-[9px] font-black uppercase text-slate-400">First Timers</div></div>
          </div>
          {activeService.status === 'open' && (
            <button
              onClick={closeServiceAndAnalyze}
              disabled={saving}
              className="w-full md:w-auto px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} className="text-gold-400" />}
              Close & Run AI Report
            </button>
          )}
        </div>
      )}

      {tab === 'services' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
          ) : services.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No services yet. Create one to start recording attendance.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((s) => (
                  <tr key={s.id} className={activeServiceId === s.id ? 'bg-gold-50/40' : ''}>
                    <td className="px-6 py-4 font-black text-slate-900 uppercase text-sm">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-bold">{s.serviceDate}{s.serviceTime ? ` · ${String(s.serviceTime).slice(0, 5)}` : ''}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${s.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => { setActiveServiceId(s.id); setTab('checkin'); }} className="text-[10px] font-black uppercase text-gold-700 hover:underline">Open</button>
                      <button onClick={() => runInsightsForService(s)} className="text-[10px] font-black uppercase text-slate-500 hover:underline">Insights</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'checkin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-black uppercase tracking-tight text-slate-900">Check In Members</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                placeholder="Search members…"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAdminMembers.map((m) => {
                const inAlready = alreadyCheckedIn(m.id, m.name);
                return (
                  <button
                    key={m.id}
                    disabled={inAlready || activeService?.status !== 'open'}
                    onClick={() => handleCheckIn(m, 'member')}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-gold-300 disabled:opacity-50 text-left"
                  >
                    <div>
                      <div className="font-black text-sm uppercase text-slate-900">{m.name}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Member · {m.category}</div>
                    </div>
                    {inAlready ? <Ban size={16} className="text-slate-300" /> : <UserCheck size={16} className="text-gold-600" />}
                  </button>
                );
              })}
            </div>
            <button
              disabled={activeService?.status !== 'open'}
              onClick={() => setIsRegistering(true)}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-gold-600 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <UserPlus size={14} /> Register First Timer
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[32rem]">
            <div className="p-5 border-b border-slate-100 font-black uppercase tracking-tight">Service Roll ({logs.length})</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No check-ins yet for this service.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-sm uppercase text-slate-900">{log.name}</div>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                          log.isFirstTimer || log.visitorStatus === 'first_timer'
                            ? 'bg-gold-100 text-gold-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {log.isFirstTimer || log.visitorStatus === 'first_timer' ? 'First Timer' : 'Member'}
                        </span>
                        <span className="text-[8px] font-black uppercase text-slate-400">{log.method}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-500">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {(log.isFirstTimer || log.visitorStatus === 'first_timer') && log.memberId && (
                        <button onClick={() => promoteToMember(log)} className="mt-1 text-[9px] font-black uppercase text-gold-700 hover:underline">
                          Make Member
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'insights' && (
        <div className="space-y-6">
          {!insight ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
              Close a service or open Insights on a past service to generate the AI attendance report.
            </div>
          ) : (
            <>
              <div className="bg-slate-950 text-white rounded-[2rem] p-8 relative overflow-hidden">
                <div className="flex items-center gap-2 text-gold-400 text-[10px] font-black uppercase tracking-widest mb-3">
                  <Sparkles size={14} /> Service Intelligence
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-3">
                  {insight.service.name} · {insight.service.serviceDate}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">{insight.narrative}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200">
                  <div className="text-[10px] font-black uppercase text-slate-400">Present Members</div>
                  <div className="text-4xl font-black text-emerald-600 mt-1">{insight.presentMembers.length}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200">
                  <div className="text-[10px] font-black uppercase text-slate-400">Absent Members</div>
                  <div className="text-4xl font-black text-rose-600 mt-1">{insight.absentMembers.length}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200">
                  <div className="text-[10px] font-black uppercase text-slate-400">First Timers</div>
                  <div className="text-4xl font-black text-gold-600 mt-1">{insight.firstTimers.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6">
                  <h4 className="font-black uppercase text-sm mb-4 flex items-center gap-2"><Users size={16} className="text-emerald-600" /> Came to Service</h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {insight.presentMembers.map((m) => (
                      <div key={m.id} className="p-3 bg-emerald-50/60 rounded-xl text-sm font-bold text-slate-800 uppercase">{m.name}</div>
                    ))}
                    {insight.presentMembers.length === 0 && <p className="text-slate-400 text-sm">No members checked in.</p>}
                  </div>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 p-6">
                  <h4 className="font-black uppercase text-sm mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-rose-500" /> Absent Members</h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {insight.absentMembers.map((m) => (
                      <div key={m.id} className="p-3 bg-rose-50/60 rounded-xl text-sm font-bold text-slate-800 uppercase">{m.name}</div>
                    ))}
                    {insight.absentMembers.length === 0 && <p className="text-slate-400 text-sm">Full member turnout.</p>}
                  </div>
                </div>
              </div>

              {insight.consecutiveMissAlerts.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6">
                  <h4 className="font-black uppercase text-rose-700 text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} /> Admin Alert · 3+ Consecutive Misses
                  </h4>
                  <div className="space-y-2">
                    {insight.consecutiveMissAlerts.map((a) => (
                      <div key={a.member.id} className="p-4 bg-white rounded-2xl border border-rose-100">
                        <div className="font-black uppercase text-slate-900">{a.member.name}</div>
                        <div className="text-xs text-rose-600 font-bold mt-1">Missed {a.missCount} services: {a.recentServiceNames.join(' → ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 font-black uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-500" /> Open Absence Alerts
          </div>
          {alerts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No open alerts. Alerts appear after closing services when a member misses 3 in a row.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <div key={a.id} className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-black uppercase text-slate-900">{a.member_name}</div>
                    <div className="text-xs text-rose-600 font-bold mt-1">{a.details || `${a.miss_count} consecutive misses`}</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase mt-1">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <button onClick={() => acknowledgeAlert(a.id)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isRegistering && !isKioskMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <form onSubmit={handleQuickRegister} className="bg-white rounded-3xl p-8 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black uppercase">Register First Timer</h3>
              <button type="button" onClick={() => setIsRegistering(false)}><X size={18} /></button>
            </div>
            <input required placeholder="Full Name" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={registrationForm.name} onChange={(e) => setRegistrationForm({ ...registrationForm, name: e.target.value })} />
            <input required placeholder="Phone" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={registrationForm.phone} onChange={(e) => setRegistrationForm({ ...registrationForm, phone: e.target.value })} />
            <input type="email" placeholder="Email optional" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={registrationForm.email} onChange={(e) => setRegistrationForm({ ...registrationForm, email: e.target.value })} />
            <button type="submit" className="w-full py-3 bg-gold-500 text-black rounded-xl font-black uppercase text-xs tracking-widest">Check In</button>
          </form>
        </div>
      )}

      {serviceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <form onSubmit={createService} className="bg-white rounded-3xl p-8 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black uppercase flex items-center gap-2"><CalendarDays size={18} /> New Service</h3>
              <button type="button" onClick={() => setServiceModal(false)}><X size={18} /></button>
            </div>
            <input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="Sunday 1st Service" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required type="date" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={serviceForm.serviceDate} onChange={(e) => setServiceForm({ ...serviceForm, serviceDate: e.target.value })} />
              <input type="time" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={serviceForm.serviceTime} onChange={(e) => setServiceForm({ ...serviceForm, serviceTime: e.target.value })} />
            </div>
            <button type="submit" disabled={saving} className="w-full py-3 bg-gold-500 text-black rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Open Service
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
