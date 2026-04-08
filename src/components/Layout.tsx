import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Users, FileText, Calendar, Landmark, Map, Menu, X, DollarSign, Heart, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import GlobalSearch from './GlobalSearch';
import ScrollToTop from './ScrollToTop';
import ChatAssistant from './ChatAssistant';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname, location.search]);

  const navItems = [
    { name: 'Find My Member', icon: Search, path: '/' },
    { name: 'Council Members', icon: Users, path: '/members' },
    { name: 'District Map', icon: Map, path: '/districts' },
    { name: 'Bills', icon: FileText, path: '/bills' },
    { name: 'Hearings', icon: Calendar, path: '/hearings' },
    { name: 'Money', icon: DollarSign, path: '/money' },
    { name: 'Influence', icon: Network, path: '/influence' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b-editorial p-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <Landmark className="w-6 h-6 text-black" />
          <span className="font-editorial font-bold text-xl tracking-tight text-black">Council Watch</span>
        </Link>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-black">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r-editorial transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <Link to="/" className="hidden md:flex items-center gap-3 mb-10">
            <Landmark className="w-8 h-8 text-black" />
            <span className="font-editorial font-black text-2xl tracking-tight text-black leading-none">
              Council<br/>Watch
            </span>
          </Link>

          <div className="mb-6">
            <GlobalSearch />
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-none border-l-2 transition-all duration-200 group",
                    isActive 
                      ? "bg-slate-100 text-black border-black font-semibold" 
                      : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-black"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-black" : "text-slate-400 group-hover:text-black"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t-editorial space-y-4">
            <Link
              to="/support"
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-none border-l-2 transition-all duration-200 group w-full",
                location.pathname === '/support'
                  ? "bg-slate-100 text-black border-black font-semibold"
                  : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-black"
              )}
            >
              <Heart className={cn(
                "w-5 h-5 transition-colors",
                location.pathname === '/support' ? "text-black" : "text-slate-400 group-hover:text-black"
              )} />
              Support the Project
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed px-1">
              Demystifying NYC's legislative process for everyday New Yorkers.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        <ScrollToTop />
        <ChatAssistant />
      </main>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
