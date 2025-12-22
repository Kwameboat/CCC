
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Clock, 
  ShoppingBag, 
  Mic2, 
  Calendar, 
  MessageSquare, 
  Settings,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Lock
} from 'lucide-react';
import { View } from '../types';
import Logo from './Logo';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  toggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen, toggle }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'members', icon: Users, label: 'Members' },
    { id: 'finance', icon: Wallet, label: 'Finance' },
    { id: 'attendance', icon: Clock, label: 'Attendance' },
    { id: 'counseling', icon: HeartHandshake, label: 'Counseling' },
    { id: 'store', icon: ShoppingBag, label: 'Store' },
    { id: 'sermons', icon: Mic2, label: 'Sermons' },
    { id: 'events', icon: Calendar, label: 'Events' },
    { id: 'communication', icon: MessageSquare, label: 'Broadcast' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out bg-black text-white ${isOpen ? 'w-64' : 'w-20'}`}
    >
      <div className="flex items-center justify-between h-20 px-4 bg-slate-950 border-b border-white/5">
        {isOpen ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <Logo size={40} hideText={true} className="flex-shrink-0" />
            <span className="font-black text-lg tracking-tighter whitespace-nowrap uppercase text-gold-500">Charis Console</span>
          </div>
        ) : (
          <div className="mx-auto">
             <Logo size={32} hideText={true} />
          </div>
        )}
      </div>

      <nav className="mt-6 px-2 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              currentView === item.id 
                ? 'bg-gold-500 text-black shadow-lg shadow-gold-900/40' 
                : 'text-slate-500 hover:bg-slate-900 hover:text-gold-400'
            }`}
          >
            <item.icon size={20} className={currentView === item.id ? 'text-black' : 'group-hover:scale-110 transition-transform'} />
            {isOpen && <span className="font-black text-[11px] uppercase tracking-wider">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-20 left-0 w-full px-2">
         <button 
           onClick={() => onViewChange('cms')}
           className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed transition-all group ${
             currentView === 'cms'
               ? 'bg-gold-950 border-gold-500 text-gold-500' 
               : 'border-slate-800 text-slate-600 hover:border-gold-700 hover:text-gold-600'
           }`}
         >
           <Lock size={18} className={currentView === 'cms' ? 'text-gold-500' : 'text-slate-600 group-hover:text-gold-600'} />
           {isOpen && <span className="font-black text-[9px] uppercase tracking-widest">Portal Restricted</span>}
         </button>
      </div>

      <div className="absolute bottom-4 left-0 w-full px-2">
        <button 
          onClick={toggle}
          className="w-full flex items-center justify-center p-2 text-slate-600 hover:text-gold-500 hover:bg-slate-900 rounded-lg"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
