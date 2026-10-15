import { Clock, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

type Tab = 'scheduled' | 'sent';

type NavItemProps = {
  to: string;
  icon: ReactNode;
  label: string;
  count?: number;
  active: boolean;
};

function NavItem({ to, icon, label, count, active }: NavItemProps) {
  return (
    <Link
      to={to}
      className={`flex h-9 items-center gap-3 rounded-lg px-3 text-sm ${
        active ? 'bg-brand-soft font-semibold text-ink' : 'text-ink hover:bg-surface'
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-xs font-normal text-muted">{count.toLocaleString()}</span>
      )}
    </Link>
  );
}

type Props = { tab: Tab; scheduledCount?: number; sentCount?: number };

export function Sidebar({ tab, scheduledCount, sentCount }: Props) {
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-5 px-5 py-6">
      <Logo />
      <UserMenu />

      <Link
        to="/compose"
        className="flex h-10 items-center justify-center rounded-full border border-brand text-sm font-medium text-brand hover:bg-brand-soft"
      >
        Compose
      </Link>

      <nav className="flex flex-col gap-1">
        <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-wider text-muted">Core</p>
        <NavItem
          to="/dashboard?tab=scheduled"
          icon={<Clock className="h-4 w-4" />}
          label="Scheduled"
          count={scheduledCount}
          active={tab === 'scheduled'}
        />
        <NavItem
          to="/dashboard?tab=sent"
          icon={<Send className="h-4 w-4" />}
          label="Sent"
          count={sentCount}
          active={tab === 'sent'}
        />
      </nav>
    </aside>
  );
}
