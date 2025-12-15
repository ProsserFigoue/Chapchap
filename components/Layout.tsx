import React from 'react';
import { MessageCircle, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { Button } from './ui/Button';
import { MockDB } from '../services/db.ts';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onLogout, currentPage, onNavigate }) => {
  const user = MockDB.getUser();

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-8 h-8 bg-[#1BD760] rounded-lg flex items-center justify-center text-white">
              <MessageCircle size={20} fill="currentColor" />
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">Chapchap</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1">
              <Button
                variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onNavigate('dashboard')}
                className="rounded-lg"
              >
                <LayoutDashboard size={16} className="mr-2" />
                Dashboard
              </Button>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 hidden sm:block">
                {user?.name}
              </span>
              <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-500">
                <LogOut size={18} />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-slate-100 bg-white py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Chapchap SaaS. Powered by Evolution API v2.
        </div>
      </footer>
    </div>
  );
};