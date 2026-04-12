import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Copy, CheckCircle, Shield, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import ProGate from './ProGate';

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; description: string }[];
  exampleResponse: string;
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/bills',
    description: 'List all bills with optional filtering and pagination.',
    params: [
      { name: 'page', type: 'number', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', description: 'Items per page (default: 20, max: 100)' },
      { name: 'status', type: 'string', description: 'Filter by status name' },
      { name: 'committee', type: 'string', description: 'Filter by committee name' },
      { name: 'q', type: 'string', description: 'Search bill titles and intro numbers' },
    ],
    exampleResponse: `{
  "data": [
    {
      "introNumber": "Int 0001-2024",
      "title": "A Local Law to amend the administrative code...",
      "statusName": "Committee",
      "committeeName": "Housing and Buildings",
      "introDate": "2024-01-15"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1234 }
}`,
  },
  {
    method: 'GET',
    path: '/bills/:id',
    description: 'Get detailed information about a specific bill by intro number.',
    exampleResponse: `{
  "data": {
    "introNumber": "Int 0001-2024",
    "title": "A Local Law to amend the administrative code...",
    "statusName": "Committee",
    "committeeName": "Housing and Buildings",
    "leadSponsor": "Member Name",
    "introDate": "2024-01-15",
    "actionDate": "2024-03-01"
  }
}`,
  },
  {
    method: 'GET',
    path: '/members',
    description: 'List all council members with optional filtering.',
    params: [
      { name: 'page', type: 'number', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', description: 'Items per page (default: 20, max: 100)' },
      { name: 'borough', type: 'string', description: 'Filter by borough' },
      { name: 'party', type: 'string', description: 'Filter by party affiliation' },
    ],
    exampleResponse: `{
  "data": [
    {
      "slug": "john-doe",
      "name": "John Doe",
      "district": 1,
      "borough": "Manhattan",
      "party": "Democratic"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 51 }
}`,
  },
  {
    method: 'GET',
    path: '/members/:slug',
    description: 'Get detailed profile for a specific council member.',
    exampleResponse: `{
  "data": {
    "slug": "john-doe",
    "name": "John Doe",
    "district": 1,
    "borough": "Manhattan",
    "party": "Democratic",
    "committees": ["Housing", "Finance"]
  }
}`,
  },
  {
    method: 'GET',
    path: '/hearings',
    description: 'List council hearings with optional filtering.',
    params: [
      { name: 'page', type: 'number', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', description: 'Items per page (default: 20, max: 100)' },
      { name: 'upcoming', type: 'boolean', description: 'Show only future hearings (true/false)' },
    ],
    exampleResponse: `{
  "data": [
    {
      "date": "2024-04-15T10:00:00Z",
      "committee": "Housing and Buildings",
      "location": "Council Chambers",
      "bills": ["Int 0001-2024"]
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 89 }
}`,
  },
  {
    method: 'GET',
    path: '/finance/:slug',
    description: 'Get campaign finance data for a specific candidate.',
    exampleResponse: `{
  "data": {
    "slug": "john-doe",
    "totalRaised": 150000,
    "totalSpent": 120000,
    "donors": 450,
    "matchingFunds": 60000
  }
}`,
  },
  {
    method: 'GET',
    path: '/influence',
    description: 'Get influence map data showing connections between entities.',
    params: [
      { name: 'page', type: 'number', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', description: 'Items per page (default: 20, max: 100)' },
    ],
    exampleResponse: `{
  "data": [
    {
      "entity": "Organization Name",
      "type": "lobbying_firm",
      "connections": 12,
      "totalSpending": 500000
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 200 }
}`,
  },
  {
    method: 'GET',
    path: '/lobbying',
    description: 'Get lobbying activity index.',
    params: [
      { name: 'page', type: 'number', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', description: 'Items per page (default: 20, max: 100)' },
    ],
    exampleResponse: `{
  "data": [
    {
      "organization": "Acme Corp",
      "subject": "Housing regulation",
      "amount": 25000,
      "year": 2024
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 500 }
}`,
  },
];

const codeExamples = {
  curl: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://your-project.supabase.co/functions/v1/api-v1/bills?page=1&limit=10"`,
  javascript: `const response = await fetch(
  "https://your-project.supabase.co/functions/v1/api-v1/bills?page=1&limit=10",
  {
    headers: {
      "Authorization": "Bearer YOUR_API_KEY"
    }
  }
);
const data = await response.json();
console.log(data);`,
  python: `import requests

response = requests.get(
    "https://your-project.supabase.co/functions/v1/api-v1/bills",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    params={"page": 1, "limit": 10}
)
data = response.json()
print(data)`,
};

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-editorial bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest">
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-black flex-1">{endpoint.path}</code>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100">
          <p className="text-sm text-slate-600 pt-3">{endpoint.description}</p>
          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Query Parameters</p>
              <div className="space-y-1">
                {endpoint.params.map(p => (
                  <div key={p.name} className="flex gap-3 text-xs">
                    <code className="font-mono text-black font-bold min-w-[80px]">{p.name}</code>
                    <span className="text-slate-400 min-w-[60px]">{p.type}</span>
                    <span className="text-slate-600">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Example Response</p>
            <pre className="bg-slate-950 text-slate-100 p-4 text-xs font-mono overflow-x-auto">
              {endpoint.exampleResponse}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeTabs() {
  const [tab, setTab] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeExamples[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-editorial bg-white overflow-hidden">
      <div className="flex border-b border-slate-100">
        {(['curl', 'javascript', 'python'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              tab === t ? 'bg-black text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="px-3 py-2 text-slate-400 hover:text-black transition-colors"
          aria-label="Copy code"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="bg-slate-950 text-slate-100 p-4 text-xs font-mono overflow-x-auto">
        {codeExamples[tab]}
      </pre>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b-editorial pb-4 mb-8">
        <BookOpen className="w-5 h-5 text-black" />
        <h1 className="font-editorial text-4xl font-bold text-black">Enterprise API</h1>
        <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest ml-2">
          Enterprise
        </span>
      </div>

      <ProGate feature="Enterprise API" flag="canAccessAPI">
        <div className="space-y-10">
          {/* Authentication */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-black" />
              <h2 className="font-editorial text-2xl font-bold text-black">Authentication</h2>
            </div>
            <div className="bg-white border-editorial p-6 space-y-3">
              <p className="text-sm text-slate-700">
                All API requests require an API key sent in the <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5">Authorization</code> header.
              </p>
              <pre className="bg-slate-950 text-slate-100 p-4 text-xs font-mono">
                Authorization: Bearer YOUR_API_KEY
              </pre>
              <p className="text-sm text-slate-700">
                Generate API keys from the <strong>API Keys</strong> section of your account settings.
                Keys are shown only once upon creation, so store them securely.
              </p>
            </div>
          </section>

          {/* Rate Limits */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-black" />
              <h2 className="font-editorial text-2xl font-bold text-black">Rate Limits</h2>
            </div>
            <div className="bg-white border-editorial p-6">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="font-editorial text-3xl font-bold text-black">100</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Requests</p>
                </div>
                <div className="text-slate-300 text-2xl">/</div>
                <div className="text-center">
                  <p className="font-editorial text-3xl font-bold text-black">1</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Minute</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-4">
                Rate limits are enforced per API key. Exceeding the limit returns a <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5">429 Too Many Requests</code> response.
              </p>
            </div>
          </section>

          {/* Endpoints */}
          <section>
            <h2 className="font-editorial text-2xl font-bold text-black mb-4">Endpoints</h2>
            <div className="space-y-3">
              {endpoints.map(ep => (
                <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
              ))}
            </div>
          </section>

          {/* Code Examples */}
          <section>
            <h2 className="font-editorial text-2xl font-bold text-black mb-4">Code Examples</h2>
            <CodeTabs />
          </section>

          {/* Error Codes */}
          <section>
            <h2 className="font-editorial text-2xl font-bold text-black mb-4">Error Codes</h2>
            <div className="bg-white border-editorial overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b-editorial">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Code</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: '401', desc: 'Invalid or missing API key' },
                    { code: '403', desc: 'Enterprise subscription required' },
                    { code: '404', desc: 'Resource not found' },
                    { code: '429', desc: 'Rate limit exceeded' },
                    { code: '500', desc: 'Internal server error' },
                  ].map(row => (
                    <tr key={row.code} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-mono text-sm font-bold text-black">{row.code}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </ProGate>
    </motion.div>
  );
}
