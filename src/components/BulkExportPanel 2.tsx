import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { generateCSV, generateJSON, downloadFile } from '../lib/exportUtils';

interface BulkExportPanelProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; label: string }[];
}

export default function BulkExportPanel({ data, filename, columns }: BulkExportPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const flags = useFeatureFlags();

  if (!flags.canExportData) return null;

  const handleDownload = () => {
    if (data.length === 0) return;

    if (format === 'csv') {
      const csv = generateCSV(data, columns);
      downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
    } else {
      const json = generateJSON(data);
      downloadFile(json, `${filename}.json`, 'application/json');
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-3 py-1.5 border-editorial text-[10px] font-bold uppercase tracking-widest text-black hover:bg-slate-50 transition-colors"
      >
        <Download className="w-3 h-3" />
        Export
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={format}
          onChange={e => setFormat(e.target.value as 'csv' | 'json')}
          className="appearance-none pl-3 pr-7 py-1.5 border-editorial text-[10px] font-bold uppercase tracking-widest text-black bg-white focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
      </div>
      <button
        onClick={handleDownload}
        disabled={data.length === 0}
        className="flex items-center gap-2 px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        <Download className="w-3 h-3" />
        Download
      </button>
      <button
        onClick={() => setExpanded(false)}
        className="px-2 py-1.5 text-[10px] text-slate-400 hover:text-black transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
