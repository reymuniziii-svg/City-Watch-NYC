import { Link } from 'react-router-dom';
import { Search, Home, FileText, Users, Calendar } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Page Not Found</p>
      <h1 className="font-editorial text-5xl md:text-7xl font-black text-black tracking-tighter mb-4">404</h1>
      <p className="text-slate-600 text-lg max-w-md mb-10 leading-relaxed">
        This page doesn't exist. It may have been moved, or the link might be outdated.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-xl">
        <Link
          to="/"
          className="flex flex-col items-center gap-2 p-4 border-editorial bg-white hover:bg-slate-50 transition-colors"
        >
          <Home className="w-5 h-5 text-black" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Home</span>
        </Link>
        <Link
          to="/members"
          className="flex flex-col items-center gap-2 p-4 border-editorial bg-white hover:bg-slate-50 transition-colors"
        >
          <Users className="w-5 h-5 text-black" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Members</span>
        </Link>
        <Link
          to="/bills"
          className="flex flex-col items-center gap-2 p-4 border-editorial bg-white hover:bg-slate-50 transition-colors"
        >
          <FileText className="w-5 h-5 text-black" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Bills</span>
        </Link>
        <Link
          to="/hearings"
          className="flex flex-col items-center gap-2 p-4 border-editorial bg-white hover:bg-slate-50 transition-colors"
        >
          <Calendar className="w-5 h-5 text-black" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Hearings</span>
        </Link>
      </div>
    </div>
  );
}
