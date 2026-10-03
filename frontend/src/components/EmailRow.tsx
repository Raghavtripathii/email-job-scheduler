import { Clock, Star } from 'lucide-react';
import { formatLongDate, formatPillTime } from '../lib/format';
import type { EmailItem } from '../types/api';

function StatusPill({ item }: { item: EmailItem }) {
  if (item.status === 'scheduled') {
    return (
      <span
        title="Scheduled"
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-bg px-2.5 py-1 text-xs font-medium text-warn"
      >
        <Clock className="h-3 w-3" />
        {formatPillTime(item.scheduledAt)}
      </span>
    );
  }
  if (item.status === 'sending') {
    return (
      <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">Sending</span>
    );
  }
  if (item.status === 'failed') {
    return (
      <span
        title={item.error ?? undefined}
        className="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
      >
        Failed
      </span>
    );
  }
  return <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-xs text-ink/70">Sent</span>;
}

type Props = {
  item: EmailItem;
  onOpen: (id: string) => void;
  onToggleStar: (item: EmailItem) => void;
};

export function EmailRow({ item, onOpen, onToggleStar }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(item.id)}
      className="grid cursor-pointer grid-cols-[208px_1fr_auto] items-center gap-4 border-b border-line px-6 py-[17px] hover:bg-surface/60"
    >
      <span className="truncate text-sm text-ink">To: {item.toEmail}</span>

      <div className="flex min-w-0 items-center gap-2 text-sm">
        <StatusPill item={item} />
        <span className="max-w-[55%] shrink-0 truncate font-semibold text-ink">{item.subject}</span>
        {item.snippet && <span className="min-w-0 truncate text-muted">- {item.snippet}</span>}
      </div>

      <div className="flex items-center gap-4">
        {/* sentAt is only filled for sent and failed emails */}
        {item.sentAt && (
          <span className="hidden whitespace-nowrap text-xs text-muted md:block">{formatLongDate(item.sentAt)}</span>
        )}
        <button
          type="button"
          aria-label={item.starred ? 'Remove star' : 'Add star'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(item);
          }}
        >
          <Star className={`h-4 w-4 ${item.starred ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
        </button>
      </div>
    </div>
  );
}