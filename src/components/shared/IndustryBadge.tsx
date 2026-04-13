export const INDUSTRY_COLORS: Record<string, string> = {
  'Real Estate': 'bg-amber-100 text-amber-800',
  'Finance': 'bg-blue-100 text-blue-800',
  'Legal': 'bg-purple-100 text-purple-800',
  'Labor': 'bg-green-100 text-green-800',
  'Healthcare': 'bg-rose-100 text-rose-800',
  'Education': 'bg-teal-100 text-teal-800',
  'Nonprofit / Advocacy': 'bg-indigo-100 text-indigo-800',
  'Government / Public Sector': 'bg-slate-200 text-slate-700',
  'Small Business / Retail': 'bg-orange-100 text-orange-800',
  'Other / Mixed': 'bg-gray-100 text-gray-600',
};

interface IndustryBadgeProps {
  industry: string;
  className?: string;
}

export default function IndustryBadge({ industry, className = '' }: IndustryBadgeProps) {
  const colors = INDUSTRY_COLORS[industry] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${colors} ${className}`}>
      {industry}
    </span>
  );
}
