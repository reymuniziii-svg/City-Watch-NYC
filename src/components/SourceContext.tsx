import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { SourceContext as SourceContextType } from '../lib/types';

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function SourceContext({ context }: { context?: SourceContextType | null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!context) return null;

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors group"
      >
        <Info className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          View AI source data
        </span>
        {isOpen ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {isOpen && (
        <div className="mt-4 border-editorial bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
            The AI was given these inputs to generate the summary above
          </p>

          <div className="space-y-3">
            {context.inputFields.map((field, i) => (
              <div key={i}>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {field.label}
                </dt>
                <dd className="text-sm text-slate-700 mt-0.5 leading-relaxed">
                  {field.value || <span className="italic text-slate-400">Not provided</span>}
                </dd>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Model: {context.model}</span>
            <span>Generated: {formatDate(context.generatedAt)}</span>
            {context.sourceUrl ? (
              <a
                href={context.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-black hover:text-slate-600 underline"
              >
                <ExternalLink className="w-3 h-3" />
                {context.sourceLabel}
              </a>
            ) : (
              <span>Source: {context.sourceLabel}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
