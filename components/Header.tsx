import React, { useState } from 'react';
import { Bell, Search, Languages, User, Menu, ChevronDown, MapPin, Globe, Check, LogOut } from 'lucide-react';
import { View, Branch } from '../types';

interface HeaderProps {
  currentView: View;
  toggleSidebar: () => void;
  branches: Branch[];
  activeBranchId: string;
  onBranchChange: (id: string) => void;
  onLogout: () => void;
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  toggleSidebar,
  branches,
  activeBranchId,
  onBranchChange,
  onLogout,
  userEmail,
  userName,
  userRole,
}) => {
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];
  const displayName =
    userName ||
    userEmail?.split('@')[0]?.replace(/[._]/g, ' ') ||
    'Staff';
  const titleName = displayName.replace(/\b\w/g, (c) => c.toUpperCase());
  const roleLabel = (userRole || 'staff').replace(/_/g, ' ');

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 lg:px-8 shrink-0 z-[100] relative">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-lg font-bold capitalize text-slate-800 leading-tight truncate">
            {currentView.replace('-', ' ')}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 h-full shrink-0">
        <div className="relative h-full flex items-center">
          <button
            onClick={() => {
              setShowBranchMenu(!showBranchMenu);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all max-w-[42vw] sm:max-w-none"
          >
            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
            <div className="text-left min-w-0 hidden xs:block sm:block">
              <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase leading-none tracking-tighter hidden md:block">
                Current Branch
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-none mt-0.5 sm:mt-1 truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">
                {activeBranch?.name || 'Branch'}
              </div>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 shrink-0 transition-transform ${showBranchMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showBranchMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowBranchMenu(false)} />
              <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 w-[min(18rem,calc(100vw-1.5rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden animate-slideUp">
                <div className="px-4 py-2 border-b border-slate-50 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Location</span>
                </div>
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => {
                      onBranchChange(branch.id);
                      setShowBranchMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all mb-1 ${
                      activeBranchId === branch.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MapPin
                        size={16}
                        className={`shrink-0 ${activeBranchId === branch.id ? 'text-indigo-600' : 'text-slate-400'}`}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{branch.name}</div>
                        <div className="text-[10px] opacity-70 truncate">{branch.location}</div>
                      </div>
                    </div>
                    {activeBranchId === branch.id && <Check size={16} className="shrink-0" />}
                  </button>
                ))}
                <div className="mt-2 pt-2 border-t border-slate-50">
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Globe size={14} /> View Global Map
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="hidden lg:flex items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search cross-branch..."
            className="bg-transparent border-none focus:outline-none ml-2 text-sm w-40 xl:w-56"
          />
        </div>

        <button className="hidden sm:inline-flex p-2 text-slate-500 hover:bg-slate-100 rounded-full relative" aria-label="Notifications">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
        </button>

        <div className="relative h-full flex items-center">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowBranchMenu(false);
            }}
            className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200 group h-full"
          >
            <div className="hidden md:block text-right min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate max-w-[120px] lg:max-w-[160px]">{titleName}</div>
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate max-w-[160px]">
                {roleLabel} · {userEmail || 'Authorized Staff'}
              </div>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gold-100 border-2 border-gold-200 flex items-center justify-center text-gold-700 overflow-hidden shadow-sm group-hover:ring-4 group-hover:ring-gold-50 transition-all font-black text-sm uppercase shrink-0">
              {(userEmail || 'S').charAt(0)}
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute top-full right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 animate-slideUp">
                <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 text-sm font-bold text-slate-600">
                  <User size={16} /> My Profile
                </button>
                <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 text-sm font-bold text-slate-600">
                  <Languages size={16} /> Preferences
                </button>
                <div className="h-px bg-slate-100 my-2" />
                <button
                  onClick={() => {
                    onLogout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-rose-50 flex items-center gap-3 text-sm font-black text-rose-600 uppercase tracking-widest"
                >
                  <LogOut size={16} /> Logout Session
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </header>
  );
};

export default Header;
