import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initMonitoring() {
  if (!SENTRY_DSN) return;
  Sentry.init({ dsn: SENTRY_DSN, environment: import.meta.env.MODE, tracesSampleRate: 0.1 });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) { console.error(error); return; }
  Sentry.captureException(error, { extra: context });
}

export function setUserContext(user: { id: string; tier: string }) {
  if (!SENTRY_DSN) return;
  Sentry.setUser({ id: user.id });
  Sentry.setTag('tier', user.tier);
}
