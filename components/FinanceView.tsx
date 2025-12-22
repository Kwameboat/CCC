import React, { useState } from 'react';
import { 
  CreditCard, DollarSign, Wallet, FileText, 
  ArrowUp, ArrowDown, PieChart as PieIcon, Download,
  ExternalLink, CheckCircle2, X, Smartphone, Landmark
} from 'lucide-react';

const FinanceView: React.FC<{ branchId: string }> = ({ branchId }) => {
  const [balance, setBalance] = useState(242500.42);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'Tithe', amount: 500.00, method: 'Stripe', status: 'Completed', date: 'Oct 24, 2023', icon: <ArrowUp size={14}/>, color: 'emerald' },
    { id: 2, type: 'Offering', amount: 50.00, method: 'Mobile Money', status: 'Completed', date: 'Oct 24, 2023', icon: <ArrowUp size={14}/>, color: 'emerald' },
    { id: 3, type: 'Utilities', amount: 420.00, method: 'Bank Transfer', status: 'Completed', date: 'Oct 23, 2023', icon: <ArrowDown size={14}/>, color: 'rose' },
  ]);

  const [formData, setFormData] = useState({ amount: '', category: 'Tithe', method: 'Mobile Money' });

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (isNaN(amt)) return;

    const newTx = {
      id: Date.now(),
      type: formData.category,
      amount: amt,
      method: formData.method,
      status: 'Completed',
      date: 'Just now',
      icon: modalType === 'income' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>,
      color: modalType === 'income' ? 'emerald' : 'rose'
    };

    setTransactions([newTx, ...transactions]);
    setBalance(prev => modalType === 'income' ? prev + amt : prev - amt);
    setIsModalOpen(false);
    setFormData({ amount: '', category: 'Tithe', method: 'Mobile Money' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Treasury Operations</h2>
          <p className="text-slate-500">Real-time ledger for church tithes, offerings, and local MM collections.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setModalType('income'); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95"
          >
            <DollarSign size={18} /> New Entry
          </button>
          <button 
            onClick={() => { setModalType('expense'); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 shadow-md transition-all active:scale-95"
          >
            <ArrowDown size={18} /> Log Disbursement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-700 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="text-indigo-200 text-xs font-black uppercase tracking-widest">Global Vault</div>
            <div className="text-4xl font-black mt-2">GH₵ {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="mt-4 flex items-center gap-2 text-indigo-100 text-[10px] font-black uppercase">
              <span className="bg-indigo-600/50 px-2 py-1 rounded-lg">+12.4% MoM Growth</span>
            </div>
          </div>
          <Wallet className="absolute -bottom-4 -right-4 w-32 h-32 text-indigo-600 opacity-20 group-hover:scale-110 transition-transform" />
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-400 transition-all">
          <div className="flex justify-between items-start">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Smartphone size={24} /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Money Collections</span>
          </div>
          <div className="mt-6">
            <div className="text-2xl font-black text-slate-900">GH₵ 18,450.00</div>
            <p className="text-slate-400 text-xs font-medium">via Paystack & Hubtel Hub</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-rose-400 transition-all">
          <div className="flex justify-between items-start">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><Landmark size={24} /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Remittances</span>
          </div>
          <div className="mt-6">
            <div className="text-2xl font-black text-slate-900">GH₵ 4,120.00</div>
            <p className="text-slate-400 text-xs font-medium">Settled to main account</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-black text-slate-900 uppercase tracking-tight">Audit Trail</h3>
          <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><Download size={20}/></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantum</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Channel</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors animate-fadeIn">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase">
                       <span className={`p-1.5 rounded-lg bg-${tx.color}-50 text-${tx.color}-600`}>{tx.icon}</span>
                       {tx.type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm font-black ${tx.color === 'rose' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {tx.color === 'rose' ? '-' : '+'}GH₵ {tx.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       {tx.method === 'Mobile Money' && <Smartphone size={14} className="text-indigo-500" />}
                       <span className="text-[10px] font-black text-slate-500 uppercase">{tx.method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg uppercase tracking-widest">Confirmed</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-bold uppercase">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className={`p-8 border-b border-slate-100 flex justify-between items-center ${modalType === 'income' ? 'bg-indigo-50' : 'bg-rose-50'}`}>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Manual {modalType === 'income' ? 'Inflow' : 'Disbursement'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleTransaction} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantum Amount (GH₵)</label>
                <input 
                  required autoFocus type="number" step="0.01"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-2xl font-black transition-all"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categorization</label>
                    <select 
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option>Tithe</option>
                      <option>Offering</option>
                      <option>Utility</option>
                      <option>Missions</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Medium</label>
                    <select 
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"
                      value={formData.method}
                      onChange={e => setFormData({...formData, method: e.target.value})}
                    >
                      <option>Mobile Money</option>
                      <option>Paystack</option>
                      <option>Hubtel</option>
                      <option>Cash</option>
                      <option>Bank</option>
                    </select>
                 </div>
              </div>
              <button type="submit" className={`w-full py-5 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl transition-all ${
                modalType === 'income' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
              }`}>
                Finalize Accounting
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceView;
