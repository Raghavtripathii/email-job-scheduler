import { PAGE_SIZE, type EmailsState } from '../hooks/useEmails';
import type { EmailItem } from '../types/api';
import { EmailRow } from './EmailRow';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Pagination } from './ui/Pagination';

function SkeletonRows() {
  return (
    <div className="animate-pulse" aria-label="loading emails">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-4 border-b border-line px-6 py-[22px]">
          <div className="h-4 w-40 rounded bg-surface" />
          <div className="h-4 w-24 rounded-full bg-surface" />
          <div className="h-4 flex-1 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

type Props = {
  state: EmailsState;
  emptyTitle: string;
  emptyText: string;
  onOpen: (id: string) => void;
  onToggleStar: (item: EmailItem) => void;
};

export function EmailList({ state, emptyTitle, emptyText, onOpen, onToggleStar }: Props) {
  const { data, loading, error, page, setPage, refresh } = state;

  if (!data && loading) return <SkeletonRows />;

  if (!data && error) {
    return (
      <EmptyState
        title="Could not load emails"
        text={error}
        action={<Button onClick={refresh}>Try again</Button>}
      />
    );
  }

  if (!data || data.items.length === 0) {
    return <EmptyState title={emptyTitle} text={emptyText} />;
  }

  return (
    <div>
      {error && (
        <div className="mb-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">Could not refresh: {error}</div>
      )}
      {data.items.map((item) => (
        <EmailRow key={item.id} item={item} onOpen={onOpen} onToggleStar={onToggleStar} />
      ))}
      <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
    </div>
  );
}