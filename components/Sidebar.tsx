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
  Lock,
  X,
} from 'lucide-react';
import { View } from '../types';
import Logo from './Logo';
import { AppModule, canAccessModule } from '../lib/permissions';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  toggle: () => void;
  userRole?: string;
  permissions?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isOpen,
  toggle,
  userRole,
  permissions,
}) => {
  const menuItems: { id: AppModule; icon: typeof LayoutDashboard; label: string }[] = [
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

  const visibleItems = menuItems.filter((item) => canAccessModule(item.id, userRole, permissions));
  const canOpenCms = canAccessModule('cms', userRole, permissions);

  const showLabels = isOpen;

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-black text-white',
        'transition-all duration-300 ease-in-out',
        'w-72 max-w-[85vw]',
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        'lg:relative lg:translate-x-0 lg:max-w-none lg:shadow-none',
        isOpen ? 'lg:w-64' : 'lg:w-20',
      ].join(' ')}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between h-16 sm:h-20 px-4 bg-slate-950 border-b border-white/5 shrink-0">
        {showLabels ? (
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <Logo size={36} hideText={true} className="flex-shrink-0" />
            <span className="font-black text-base sm:text-lg tracking-tighter whitespace-nowrap uppercase text-gold-500 truncate">
              Charis Console
            </span>
          </div>
        ) : (
          <div className="mx-auto hidden lg:block">
            <Logo size={32} hideText={true} />
          </div>
        )}
        <button
          onClick={toggle}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-gold-500 hover:bg-slate-900"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="mt-4 px-2 space-y-1 flex-1 overflow-y-auto pb-28">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              currentView === item.id
                ? 'bg-gold-500 text-black shadow-lg shadow-gold-900/40'
                : 'text-slate-500 hover:bg-slate-900 hover:text-gold-400'
            } ${!showLabels ? 'lg:justify-center' : ''}`}
            title={item.label}
          >
            <item.icon
              size={20}
              className={`shrink-0 ${currentView === item.id ? 'text-black' : 'group-hover:scale-110 transition-transform'}`}
            />
            {showLabels && (
              <span className="font-black text-[11px] uppercase tracking-wider truncate">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {canOpenCms && (
        <div className="absolute bottom-16 left-0 w-full px-2">
          <button
            onClick={() => onViewChange('cms')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed transition-all group ${
              currentView === 'cms'
                ? 'bg-gold-950 border-gold-500 text-gold-500'
                : 'border-slate-800 text-slate-600 hover:border-gold-700 hover:text-gold-600'
            } ${!showLabels ? 'lg:justify-center' : ''}`}
            title="Portal CMS"
          >
            <Lock
              size={18}
              className={`shrink-0 ${currentView === 'cms' ? 'text-gold-500' : 'text-slate-600 group-hover:text-gold-600'}`}
            />
            {showLabels && <span className="font-black text-[9px] uppercase tracking-widest">Portal CMS</span>}
          </button>
        </div>
      )}

      <div className="absolute bottom-4 left-0 w-full px-2 hidden lg:block">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center p-2 text-slate-600 hover:text-gold-500 hover:bg-slate-900 rounded-lg"
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
