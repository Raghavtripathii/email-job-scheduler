import { PAGE_SIZE, type EmailsState } from '../hooks/useEmails';
import { formatDateTime } from '../lib/format';
import type { EmailItem } from '../types/api';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Pagination } from './ui/Pagination';
import { StatusBadge } from './ui/StatusBadge';
import { Table, type Column } from './ui/Table';

type Kind = 'scheduled' | 'sent';

const emailCell = (row: EmailItem) => <span className="font-medium text-slate-900">{row.toEmail}</span>;

const subjectCell = (row: EmailItem) => (
  <span className="block max-w-xs truncate text-slate-600" title={row.subject}>
    {row.subject}
  </span>
);

// hover a failed badge to see why it failed
const statusCell = (row: EmailItem) => <StatusBadge status={row.status} title={row.error ?? undefined} />;

const columns: Record<Kind, Column<EmailItem>[]> = {
  scheduled: [
    { header: 'Email', cell: emailCell },
    { header: 'Subject', cell: subjectCell },
    { header: 'Scheduled time', cell: (row) => formatDateTime(row.scheduledAt) },
    { header: 'Status', cell: statusCell },
  ],
  sent: [
    { header: 'Email', cell: emailCell },
    { header: 'Subject', cell: subjectCell },
    { header: 'Sent time', cell: (row) => formatDateTime(row.sentAt) },
    { header: 'Status', cell: statusCell },
  ],
};

const emptyText: Record<Kind, { title: string; text: string }> = {
  scheduled: {
    title: 'No scheduled emails',
    text: 'Emails you schedule will wait here until it is their time to go out.',
  },
  sent: {
    title: 'No sent emails yet',
    text: 'Once an email goes out, it shows up here with its status.',
  },
};

function SkeletonRows() {
  return (
    <div className="animate-pulse divide-y divide-slate-100" aria-label="loading emails">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-4 px-4 py-4">
          <div className="h-4 w-1/4 rounded bg-slate-200" />
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-1/6 rounded bg-slate-200" />
          <div className="h-4 w-16 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

type Props = { kind: Kind; state: EmailsState };

export function EmailTable({ kind, state }: Props) {
  const { data, loading, error, page, setPage, refresh } = state;

  let content;
  if (!data && loading) {
    content = <SkeletonRows />;
  } else if (!data && error) {
    content = (
      <EmptyState
        title="Could not load emails"
        text={error}
        action={<Button onClick={refresh}>Try again</Button>}
      />
    );
  } else if (!data || data.items.length === 0) {
    content = <EmptyState {...emptyText[kind]} />;
  } else {
    content = (
      <>
        <Table columns={columns[kind]} rows={data.items} rowKey={(row) => row.id} />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {error && data && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          Could not refresh: {error}
        </div>
      )}
      {content}
    </div>
  );
}