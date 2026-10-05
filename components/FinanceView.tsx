import React, { useEffect, useMemo, useState } from 'react';
import {
  DollarSign, Wallet, Download, ArrowUp, ArrowDown, X, Smartphone,
  Landmark, Loader2, Search, UserCheck, HandCoins, RefreshCw, Plus
} from 'lucide-react';
import { Member } from '../types';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';

interface TransactionRecord {
  id: string;
  type: string;
  amount: number;
  method: string;
  status: string;
  date: string;
  dateRaw: string;
  isIncome: boolean;
  memberId?: string | null;
  memberName?: string | null;
  description?: string | null;
}

interface PledgeRecord {
  id: string;
  memberId?: string | null;
  memberName: string;
  promisedAmount: number;
  paidAmount: number;
  status: 'open' | 'partial' | 'fulfilled';
  description?: string | null;
  createdAt: string;
  fulfilledAt?: string | null;
}

type Tab = 'ledger' | 'tithes' | 'pledges';
type ModalMode = 'income' | 'expense' | 'pledge_promise' | 'pledge_payment';

const INCOME_TYPES = new Set(['Tithe', 'Offering', 'Donation', 'Special Fund', 'Store', 'Pledge']);
const MEMBER_REQUIRED_TYPES = new Set(['Tithe', 'Pledge']);

interface FinanceViewProps {
  branchId: string;
  members: Member[];
}

const FinanceView: React.FC<FinanceViewProps> = ({ branchId, members }) => {
  const [tab, setTab] = useState<Tab>('ledger');
  const [balance, setBalance] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('income');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [pledges, setPledges] = useState<PledgeRecord[]>([]);
  const [schemaHint, setSchemaHint] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPledgeId, setSelectedPledgeId] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Tithe',
    method: 'Mobile Money',
    description: '',
  });

  const branchMembers = useMemo(
    () => members.filter((m) => m.branchId === branchId && (m.status || 'Active') === 'Active'),
    [members, branchId]
  );

  const memberMatches = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (q.length < 1) return branchMembers.slice(0, 8);
    return branchMembers
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.phone || '').includes(q) ||
          (m.email || '').toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [branchMembers, memberSearch]);

  useEffect(() => {
    refreshAll();
  }, [branchId]);

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchTransactions(), fetchPledges()]);
    setIsLoading(false);
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) {
      showToast(error.message, 'error');
      setTransactions([]);
      setBalance(0);
      return;
    }

    const mapped = (data || []).map((tx) => {
      const isIncome = INCOME_TYPES.has(tx.type) || Number(tx.amount) > 0;
      return {
        id: tx.id,
        type: tx.type,
        amount: Math.abs(Number(tx.amount)),
        method: tx.method,
        status: tx.status,
        date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateRaw: tx.created_at,
        isIncome,
        memberId: tx.member_id,
        memberName: tx.member_name,
        description: tx.description,
      } as TransactionRecord;
    });
    setTransactions(mapped);
    const total = (data || []).reduce((acc, curr) => {
      const amt = Math.abs(Number(curr.amount));
      return INCOME_TYPES.has(curr.type) || Number(curr.amount) > 0 ? acc + amt : acc - amt;
    }, 0);
    setBalance(total);
  };

  const fetchPledges = async () => {
    const { data, error } = await supabase
      .from('pledges')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) {
      if (/relation .*pledges.* does not exist/i.test(error.message) || error.code === '42P01' || /Could not find the table/i.test(error.message)) {
        setSchemaHint(true);
      }
      setPledges([]);
      return;
    }
    setSchemaHint(false);
    setPledges(
      (data || []).map((p) => ({
        id: p.id,
        memberId: p.member_id,
        memberName: p.member_name,
        promisedAmount: Number(p.promised_amount),
        paidAmount: Number(p.paid_amount || 0),
        status: p.status,
        description: p.description,
        createdAt: p.created_at,
        fulfilledAt: p.fulfilled_at,
      }))
    );
  };

  const titheByMember = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number; lastDate: string }>();
    for (const tx of transactions.filter((t) => t.type === 'Tithe' && t.isIncome)) {
      const key = tx.memberId || tx.memberName || 'unknown';
      const name = tx.memberName || 'Unnamed';
      const prev = map.get(key) || { name, total: 0, count: 0, lastDate: tx.dateRaw };
      prev.total += tx.amount;
      prev.count += 1;
      if (tx.dateRaw > prev.lastDate) prev.lastDate = tx.dateRaw;
      map.set(key, prev);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const openPledgesForMember = useMemo(
    () =>
      pledges.filter(
        (p) =>
          p.status !== 'fulfilled' &&
          (!selectedMember || p.memberId === selectedMember.id || p.memberName === selectedMember.name)
      ),
    [pledges, selectedMember]
  );

  const openModal = (mode: ModalMode, defaults?: Partial<typeof formData>) => {
    setModalMode(mode);
    setSelectedMember(null);
    setSelectedPledgeId('');
    setMemberSearch('');
    if (mode === 'expense') {
      setFormData({ amount: '', category: 'Utility', method: 'Cash', description: '', ...defaults });
    } else if (mode === 'pledge_promise') {
      setFormData({ amount: '', category: 'Pledge', method: 'Promise', description: '', ...defaults });
    } else if (mode === 'pledge_payment') {
      setFormData({ amount: '', category: 'Pledge', method: 'Mobile Money', description: '', ...defaults });
    } else {
      setFormData({ amount: '', category: 'Tithe', method: 'Mobile Money', description: '', ...defaults });
    }
    setIsModalOpen(true);
  };

  const needsMember =
    modalMode === 'pledge_promise' ||
    modalMode === 'pledge_payment' ||
    (modalMode === 'income' && MEMBER_REQUIRED_TYPES.has(formData.category));

  const handleExportCsv = () => {
    const header = ['Type', 'Member', 'Amount', 'Method', 'Status', 'Date', 'Description'];
    const rows = transactions.map((t) =>
      [
        t.type,
        t.memberName || '',
        t.isIncome ? t.amount : -t.amount,
        t.method,
        t.status,
        t.date,
        t.description || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ccc-finance-${branchId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${transactions.length} transactions.`, 'success');
  };

  const insertTransaction = async (payload: Record<string, unknown>) => {
    const { error } = await supabase.from('transactions').insert([payload]);
    if (error) {
      if (/column .*member_name.* does not exist/i.test(error.message) || /member_id/i.test(error.message)) {
        setSchemaHint(true);
      }
      throw new Error(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Enter a valid amount greater than zero.', 'error');
      return;
    }
    if (needsMember && !selectedMember) {
      showToast('Select the member this record belongs to.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      if (modalMode === 'pledge_promise') {
        const { error } = await supabase.from('pledges').insert([
          {
            branch_id: branchId,
            member_id: selectedMember!.id,
            member_name: selectedMember!.name,
            promised_amount: amt,
            paid_amount: 0,
            status: 'open',
            description: formData.description || null,
          },
        ]);
        if (error) {
          if (/relation .*pledges.* does not exist/i.test(error.message)) setSchemaHint(true);
          throw new Error(error.message);
        }
        showToast(`Pledge recorded for ${selectedMember!.name}.`, 'success');
        setTab('pledges');
      } else if (modalMode === 'pledge_payment') {
        const pledge = pledges.find((p) => p.id === selectedPledgeId);
        if (!pledge) {
          showToast('Select which pledge this payment fulfills.', 'error');
          setIsProcessing(false);
          return;
        }
        const newPaid = Math.min(pledge.promisedAmount, pledge.paidAmount + amt);
        const status: PledgeRecord['status'] =
          newPaid >= pledge.promisedAmount ? 'fulfilled' : newPaid > 0 ? 'partial' : 'open';

        await insertTransaction({
          branch_id: branchId,
          amount: amt,
          type: 'Pledge',
          method: formData.method,
          status: 'Completed',
          member_id: pledge.memberId || selectedMember?.id || null,
          member_name: pledge.memberName,
          description: formData.description || `Payment toward pledge (${pledge.promisedAmount})`,
        });

        const { error } = await supabase
          .from('pledges')
          .update({
            paid_amount: newPaid,
            status,
            fulfilled_at: status === 'fulfilled' ? new Date().toISOString() : null,
          })
          .eq('id', pledge.id);
        if (error) throw new Error(error.message);

        showToast(
          status === 'fulfilled'
            ? `${pledge.memberName}'s pledge is fulfilled.`
            : `Payment recorded for ${pledge.memberName}.`,
          'success'
        );
        setTab('pledges');
      } else {
        const isExpense = modalMode === 'expense';
        const category =
          isExpense && INCOME_TYPES.has(formData.category) ? 'Utility' : formData.category;
        const memberRequired = !isExpense && MEMBER_REQUIRED_TYPES.has(category);

        await insertTransaction({
          branch_id: branchId,
          amount: isExpense ? -amt : amt,
          type: category,
          method: formData.method,
          status: 'Completed',
          member_id: memberRequired || selectedMember ? selectedMember?.id || null : null,
          member_name: memberRequired || selectedMember ? selectedMember?.name || null : null,
          description: formData.description || null,
        });
        showToast(
          category === 'Tithe' && selectedMember
            ? `Tithe recorded for ${selectedMember.name}.`
            : 'Transaction recorded.',
          'success'
        );
        if (category === 'Tithe') setTab('tithes');
      }

      setIsModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      showToast(err.message || 'Could not save.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const statusBadge = (status: PledgeRecord['status']) => {
    const styles = {
      open: 'bg-amber-50 text-amber-700 border-amber-100',
      partial: 'bg-sky-50 text-sky-700 border-sky-100',
      fulfilled: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    };
    return (
      <span className={`text-[9px] font-black px-2.5 py-1 border rounded-lg uppercase tracking-widest ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {schemaHint && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <span>
            Member tithe/pledge columns are missing. Run{' '}
            <code className="font-bold">supabase/migrations/004_member_tithe_pledge.sql</code> in the Supabase SQL Editor, then refresh.
          </span>
          <button
            className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"
            onClick={async () => {
              const res = await fetch('/supabase/migrations/004_member_tithe_pledge.sql');
              const text = await res.text();
              await navigator.clipboard.writeText(text);
              showToast('SQL copied. Paste in Supabase SQL Editor.', 'success');
            }}
          >
            Copy SQL
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Treasury Operations</h2>
          <p className="text-slate-500 text-sm font-medium">
            Record tithes and pledges under each member’s name and track promise fulfillment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refreshAll} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-gold-600" aria-label="Refresh">
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50">
            <Download size={18} /> Export
          </button>
          <button
            onClick={() => openModal('income')}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-xl text-sm font-bold hover:bg-gold-600 shadow-md"
          >
            <DollarSign size={18} /> Record Tithe / Income
          </button>
          <button
            onClick={() => openModal('pledge_promise')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-gold-400 rounded-xl text-sm font-bold"
          >
            <HandCoins size={18} /> New Pledge
          </button>
          <button
            onClick={() => openModal('expense')}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700"
          >
            <ArrowDown size={18} /> Log Disbursement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-700 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="text-indigo-200 text-xs font-black uppercase tracking-widest">Branch Balance</div>
            <div className="text-4xl font-black mt-2">GH₵ {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <Wallet className="absolute -bottom-4 -right-4 w-32 h-32 text-indigo-600 opacity-20" />
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Smartphone size={24} /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Money</span>
          </div>
          <div className="mt-6 text-2xl font-black text-slate-900">
            GH₵ {transactions.filter((t) => t.method === 'Mobile Money' && t.isIncome).reduce((a, b) => a + b.amount, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><Landmark size={24} /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open Pledges</span>
          </div>
          <div className="mt-6 text-2xl font-black text-slate-900">
            {pledges.filter((p) => p.status !== 'fulfilled').length}
          </div>
          <p className="text-slate-400 text-xs font-medium mt-1">
            {pledges.filter((p) => p.status === 'fulfilled').length} fulfilled
          </p>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit flex-wrap gap-1">
        {[
          { id: 'ledger', label: 'Ledger' },
          { id: 'tithes', label: 'Tithe by Member' },
          { id: 'pledges', label: 'Pledges & Promises' },
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

      {tab === 'ledger' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm min-h-[400px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase tracking-tight">Audit Trail</h3>
            <button onClick={handleExportCsv} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400" aria-label="Export CSV">
              <Download size={20} />
            </button>
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-30">
              <Loader2 size={40} className="animate-spin text-indigo-600" />
              <span className="font-black uppercase text-[10px] tracking-widest">Loading ledger…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Member</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase">
                            <span className={`p-1.5 rounded-lg ${tx.isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {tx.isIncome ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            </span>
                            {tx.type}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">
                          {tx.memberName || <span className="text-slate-300 font-medium">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm font-black ${tx.isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.isIncome ? '+' : '-'}GH₵ {tx.amount.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">{tx.method}</td>
                        <td className="px-6 py-4">
                          <span className="text-[9px] font-black px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg uppercase tracking-widest">
                            {tx.status || 'Confirmed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-bold uppercase">{tx.date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No transactions for this branch yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'tithes' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight">Tithe by Member</h3>
              <p className="text-sm text-slate-500">Who is giving tithe and how much so far.</p>
            </div>
            <button
              onClick={() => openModal('income', { category: 'Tithe' })}
              className="px-4 py-2 bg-gold-500 text-black rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Plus size={14} /> Record Tithe
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Member</th>
                  <th className="px-6 py-4">Payments</th>
                  <th className="px-6 py-4">Total Tithe</th>
                  <th className="px-6 py-4">Last Given</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {titheByMember.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No tithes recorded under member names yet. Use Record Tithe and select a member.
                    </td>
                  </tr>
                ) : (
                  titheByMember.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-black text-slate-900 uppercase text-sm flex items-center gap-2">
                        <UserCheck size={16} className="text-gold-600" /> {row.name}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600">{row.count}</td>
                      <td className="px-6 py-4 text-sm font-black text-emerald-600">GH₵ {row.total.toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                        {new Date(row.lastDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pledges' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight">Pledges & Promises</h3>
              <p className="text-sm text-slate-500">Track who promised what and whether they have fulfilled it.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openModal('pledge_promise')}
                className="px-4 py-2 bg-slate-900 text-gold-400 rounded-xl text-xs font-black uppercase tracking-widest"
              >
                New Promise
              </button>
              <button
                onClick={() => openModal('pledge_payment')}
                className="px-4 py-2 bg-gold-500 text-black rounded-xl text-xs font-black uppercase tracking-widest"
              >
                Record Payment
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Member</th>
                  <th className="px-6 py-4">Promised</th>
                  <th className="px-6 py-4">Paid</th>
                  <th className="px-6 py-4">Remaining</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pledges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No pledges yet. Record a promise under a member’s name, then log payments as they give.
                    </td>
                  </tr>
                ) : (
                  pledges.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-black text-slate-900 uppercase text-sm">{p.memberName}</td>
                      <td className="px-6 py-4 text-sm font-bold">GH₵ {p.promisedAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-black text-emerald-600">GH₵ {p.paidAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600">
                        GH₵ {Math.max(0, p.promisedAmount - p.paidAmount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">{statusBadge(p.status)}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{p.description || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp max-h-[90vh] overflow-y-auto">
            <div
              className={`p-8 border-b border-slate-100 flex justify-between items-center ${
                modalMode === 'expense' ? 'bg-rose-50' : 'bg-indigo-50'
              }`}
            >
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {modalMode === 'expense'
                  ? 'Log Disbursement'
                  : modalMode === 'pledge_promise'
                    ? 'New Member Pledge'
                    : modalMode === 'pledge_payment'
                      ? 'Pledge Payment'
                      : 'Record Income'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {(needsMember || modalMode === 'income') && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Member {needsMember ? '(required)' : '(optional)'}
                  </label>
                  {selectedMember ? (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <div className="flex items-center gap-2 font-black text-slate-900 uppercase text-sm">
                        <UserCheck size={16} className="text-emerald-600" />
                        {selectedMember.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(null);
                          setMemberSearch('');
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-rose-600"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Search member by name or phone…"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50">
                        {memberMatches.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400">No members found.</div>
                        ) : (
                          memberMatches.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedMember(m);
                                setMemberSearch(m.name);
                                const memberPledge = pledges.find(
                                  (p) => p.status !== 'fulfilled' && (p.memberId === m.id || p.memberName === m.name)
                                );
                                if (memberPledge && modalMode === 'pledge_payment') {
                                  setSelectedPledgeId(memberPledge.id);
                                }
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gold-50 text-sm font-bold text-slate-800"
                            >
                              {m.name}
                              <span className="block text-[10px] font-medium text-slate-400">{m.phone || m.category}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modalMode === 'pledge_payment' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Which pledge?
                  </label>
                  <select
                    required
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"
                    value={selectedPledgeId}
                    onChange={(e) => {
                      setSelectedPledgeId(e.target.value);
                      const p = pledges.find((x) => x.id === e.target.value);
                      if (p) {
                        const member = branchMembers.find((m) => m.id === p.memberId || m.name === p.memberName);
                        if (member) setSelectedMember(member);
                      }
                    }}
                  >
                    <option value="">Select open pledge…</option>
                    {(selectedMember ? openPledgesForMember : pledges.filter((p) => p.status !== 'fulfilled')).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.memberName} — GH₵ {p.paidAmount}/{p.promisedAmount} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {modalMode === 'pledge_promise' ? 'Promised Amount (GH₵)' : 'Amount (GH₵)'}
                </label>
                <input
                  required
                  autoFocus
                  type="number"
                  step="0.01"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-2xl font-black"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              {modalMode === 'income' || modalMode === 'expense' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                    <select
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {modalMode === 'income' ? (
                        <>
                          <option>Tithe</option>
                          <option>Pledge</option>
                          <option>Offering</option>
                          <option>Donation</option>
                          <option>Special Fund</option>
                        </>
                      ) : (
                        <>
                          <option>Utility</option>
                          <option>Missions</option>
                          <option>Welfare</option>
                          <option>Salaries</option>
                        </>
                      )}
                    </select>
                    {modalMode === 'income' && MEMBER_REQUIRED_TYPES.has(formData.category) && (
                      <p className="text-[10px] text-amber-700 font-bold mt-2">Tithe and Pledge must be linked to a member.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Method</label>
                    <select
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"
                      value={formData.method}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    >
                      <option>Mobile Money</option>
                      <option>Paystack</option>
                      <option>Hubtel</option>
                      <option>Cash</option>
                      <option>Bank</option>
                    </select>
                  </div>
                </div>
              ) : modalMode === 'pledge_payment' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Method</label>
                  <select
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  >
                    <option>Mobile Money</option>
                    <option>Cash</option>
                    <option>Bank</option>
                    <option>Paystack</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. January tithe, building project promise"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full py-5 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 ${
                  modalMode === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : null}
                Save Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceView;
