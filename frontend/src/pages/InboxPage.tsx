import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listScheduled, listSent, searchEmails, setStar } from '../api/emails';
import { EmailList } from '../components/EmailList';
import { SearchBar } from '../components/SearchBar';
import { Sidebar } from '../components/Sidebar';
import { useToast } from '../components/ui/Toast';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useEmails } from '../hooks/useEmails';
import type { EmailItem, EmailStatus } from '../types/api';

type Tab = 'scheduled' | 'sent';
type Option = { value: EmailStatus | ''; label: string };

const ALL: Option = { value: '', label: 'All' };

const FILTERS: Record<Tab | 'search', Option[]> = {
  scheduled: [ALL, { value: 'scheduled', label: 'Scheduled' }, { value: 'sending', label: 'Sending' }],
  sent: [ALL, { value: 'sent', label: 'Sent' }, { value: 'failed', label: 'Failed' }],
  search: [
    ALL,
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'sending', label: 'Sending' },
    { value: 'sent', label: 'Sent' },
    { value: 'failed', label: 'Failed' },
  ],
};

const EMPTY = {
  scheduled: {
    title: 'No scheduled emails',
    text: 'Emails you schedule will wait here until it is time to go out.',
  },
  sent: { title: 'No sent emails yet', text: 'Once an email goes out, it shows up here with its status.' },
  search: { title: 'No matches', text: 'Try another word, or part of an email address.' },
};

export function InboxPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const tab: Tab = params.get('tab') === 'sent' ? 'sent' : 'scheduled';

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<EmailStatus | ''>('');
  const [refreshing, setRefreshing] = useState(false);

  const term = useDebouncedValue(query.trim(), 300);
  const searching = term.length > 0;
  const kind = searching ? 'search' : tab;

  // these two always run, the sidebar counts come from them
  const scheduled = useEmails(listScheduled);
  const sent = useEmails(listSent);

  const fetchFiltered = useCallback(
    (page: number, limit: number) =>
      (tab === 'scheduled' ? listScheduled : listSent)(page, limit, status || undefined),
    [tab, status],
  );
  const filtered = useEmails(fetchFiltered, status !== '' && !searching);

  const fetchSearch = useCallback(
    (page: number, limit: number) => searchEmails(term, page, limit, status || undefined),
    [term, status],
  );
  const search = useEmails(fetchSearch, searching);

  // a new tab clears the filter, and a new search or filter starts on page one
  useEffect(() => {
    setStatus('');
    setQuery('');
  }, [tab]);

  const { setPage: setFilteredPage } = filtered;
  const { setPage: setSearchPage } = search;
  useEffect(() => {
    setFilteredPage(1);
    setSearchPage(1);
  }, [term, status, setFilteredPage, setSearchPage]);

  const visible = searching ? search : status ? filtered : tab === 'scheduled' ? scheduled : sent;

  async function refreshNow() {
    setRefreshing(true);
    await visible.refresh();
    setTimeout(() => setRefreshing(false), 400);
  }

  async function toggleStar(item: EmailItem) {
    const next = !item.starred;
    visible.patchItem(item.id, { starred: next });
    try {
      await setStar(item.id, next);
    } catch (err) {
      visible.patchItem(item.id, { starred: item.starred });
      toast.error(err instanceof Error ? err.message : 'Could not update the star');
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar tab={tab} scheduledCount={scheduled.data?.total} sentCount={sent.data?.total} />

      <main className="min-w-0 flex-1 px-5 py-5">
        <SearchBar
          value={query}
          onChange={setQuery}
          options={FILTERS[kind]}
          status={status}
          onStatus={setStatus}
          onRefresh={refreshNow}
          refreshing={refreshing}
        />

        {searching && (
          <p className="mt-4 px-6 text-sm text-ink/70">
            {search.data ? `${search.data.total} results` : 'Searching'} for “{term}”
          </p>
        )}

        <div className="mt-3">
          <EmailList
            state={visible}
            emptyTitle={EMPTY[kind].title}
            emptyText={EMPTY[kind].text}
            onOpen={(id) => navigate(`/emails/${id}`)}
            onToggleStar={toggleStar}
          />
        </div>
      </main>
    </div>
  );
}
