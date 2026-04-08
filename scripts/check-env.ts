import 'dotenv/config';

/* ------------------------------------------------------------------ */
/*  Environment Variable Checker                                      */
/*  Run: npx tsx scripts/check-env.ts                                 */
/* ------------------------------------------------------------------ */

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

interface VarGroup {
  label: string;
  vars: { name: string; required: boolean }[];
}

const groups: VarGroup[] = [
  {
    label: 'Required (Build Pipeline)',
    vars: [{ name: 'GEMINI_API_KEY', required: true }],
  },
  {
    label: 'Supabase (Database + Edge Functions)',
    vars: [
      { name: 'VITE_SUPABASE_URL', required: true },
      { name: 'VITE_SUPABASE_ANON_KEY', required: true },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true },
      { name: 'SUPABASE_PROJECT_REF', required: true },
      { name: 'SUPABASE_ACCESS_TOKEN', required: true },
    ],
  },
  {
    label: 'Clerk (Authentication)',
    vars: [
      { name: 'VITE_CLERK_PUBLISHABLE_KEY', required: true },
    ],
  },
  {
    label: 'Stripe (Pro Billing)',
    vars: [
      { name: 'STRIPE_SECRET_KEY', required: true },
      { name: 'STRIPE_WEBHOOK_SECRET', required: true },
      { name: 'STRIPE_ADVOCATE_PRICE_ID', required: true },
      { name: 'STRIPE_ENTERPRISE_PRICE_ID', required: true },
    ],
  },
  {
    label: 'Email (Alerts)',
    vars: [{ name: 'RESEND_API_KEY', required: true }],
  },
  {
    label: 'Optional',
    vars: [
      { name: 'APP_URL', required: false },
      { name: 'GEMINI_API_BASE_URL', required: false },
      { name: 'GEMINI_MODEL', required: false },
      { name: 'AI_REQUEST_TIMEOUT_MS', required: false },
      { name: 'SUMMARY_RETRY_MAX', required: false },
    ],
  },
];

/* ------------------------------------------------------------------ */

function isSet(name: string): boolean {
  const val = process.env[name];
  return val !== undefined && val !== '';
}

console.log();
console.log(`${BOLD}City Watch NYC — Environment Check${RESET}`);
console.log(`${DIM}${'─'.repeat(48)}${RESET}`);

let totalSet = 0;
let totalVars = 0;

for (const group of groups) {
  console.log();
  console.log(`${BOLD}${group.label}${RESET}`);

  for (const v of group.vars) {
    totalVars++;
    const present = isSet(v.name);
    if (present) totalSet++;

    let icon: string;
    if (present) {
      icon = `${GREEN}\u2713${RESET}`;
    } else if (v.required) {
      icon = `${RED}\u2717${RESET}`;
    } else {
      icon = `${YELLOW}\u26A0${RESET}`;
    }

    const suffix = !present && !v.required ? `${DIM} (optional)${RESET}` : '';
    console.log(`  ${icon}  ${v.name}${suffix}`);
  }
}

console.log();
console.log(`${DIM}${'─'.repeat(48)}${RESET}`);
console.log(`${BOLD}${totalSet}/${totalVars}${RESET} variables configured`);
console.log();

// Always exit 0 — this is informational only.
process.exit(0);
