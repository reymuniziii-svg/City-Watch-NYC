import { Mail, Phone, CheckCircle, MessageSquare } from 'lucide-react';
import type { Staffer } from '../lib/types';

interface StafferCardProps {
  staffer: Staffer;
  onLogContact?: () => void;
}

export default function StafferCard({ staffer, onLogContact }: StafferCardProps) {
  return (
    <div className="bg-white border-editorial p-6 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-editorial text-lg font-bold text-black">
              {staffer.full_name}
            </h3>
            {staffer.verified && (
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            )}
          </div>
          <p className="text-sm text-slate-600">{staffer.title}</p>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">
          District {staffer.district_number}
        </div>
      </div>

      {staffer.policy_areas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {staffer.policy_areas.map((area) => (
            <span
              key={area}
              className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-600"
            >
              {area}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mb-4 text-sm">
        {staffer.email && (
          <a
            href={`mailto:${staffer.email}`}
            className="flex items-center gap-1.5 text-slate-600 hover:text-black transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate max-w-[160px]">{staffer.email}</span>
          </a>
        )}
        {staffer.phone && (
          <a
            href={`tel:${staffer.phone}`}
            className="flex items-center gap-1.5 text-slate-600 hover:text-black transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{staffer.phone}</span>
          </a>
        )}
      </div>

      {onLogContact && (
        <button
          onClick={onLogContact}
          className="flex items-center gap-2 px-4 py-2 border-editorial bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white active:scale-95 transition-all w-full justify-center"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Log Contact
        </button>
      )}
    </div>
  );
}
