import { SignInButton, UserButton } from '@clerk/clerk-react';
import { useProUser } from '../hooks/useProUser';
import { LogIn } from 'lucide-react';

export default function AuthButton() {
  const { isAuthenticated, user, tier } = useProUser();

  // Don't render anything if Clerk is not configured
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) return null;

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-black leading-tight">{user?.displayName}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{tier}</p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
    );
  }

  return (
    <SignInButton mode="modal">
      <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-sm font-bold uppercase tracking-widest text-slate-600 hover:border-black hover:text-black transition-colors">
        <LogIn className="w-4 h-4" />
        Sign In
      </button>
    </SignInButton>
  );
}
