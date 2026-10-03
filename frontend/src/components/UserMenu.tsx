import { ChevronDown, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { queueBoardUrl } from '../api/emails';
import { slackConnectUrl } from '../api/slack';
import { useAuth } from '../context/AuthContext';
import { useSlack } from '../hooks/useSlack';
import { Avatar } from './ui/Avatar';

const itemClass = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const slack = useSlack();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-xl bg-surface px-3 py-2.5 text-left"
      >
        <Avatar name={user.name} src={user.avatar} size={28} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
          <span className="block truncate text-[11px] text-muted">{user.email}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-line bg-white p-1 shadow-lg">
          {slack.status?.connected ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-ink">
                Slack connected{slack.status.channel ? ` · ${slack.status.channel}` : ''}
              </span>
              <button
                type="button"
                onClick={slack.disconnect}
                disabled={slack.busy}
                className="shrink-0 text-xs font-medium text-brand hover:underline disabled:opacity-60"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a href={slackConnectUrl} className={itemClass}>
              Connect Slack
            </a>
          )}

          <a href={queueBoardUrl} target="_blank" rel="noreferrer" className={itemClass}>
            Queue dashboard
          </a>

          <div className="my-1 border-t border-line" />

          <button type="button" onClick={signOut} className={itemClass}>
            <LogOut className="h-4 w-4 text-muted" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}