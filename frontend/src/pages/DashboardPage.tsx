import { useCallback, useEffect, useState } from 'react';
import { listScheduled, listSent, queueBoardUrl, searchEmails } from '../api/emails';
import { ComposeModal } from '../components/ComposeModal';
import { EmailTable } from '../components/EmailTable';
import { Header } from '../components/Header';
import { SearchBox } from '../components/SearchBox';
import { SlackButton } from '../components/SlackButton';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useEmails } from '../hooks/useEmails';

type TabId = 'scheduled' | 'sent';

export function DashboardPage() {
  const [tab, setTab] = useState<TabId>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState('');

  const term = useDebouncedValue(query.trim(), 300);
  const searching = term.length > 0;

  const scheduled = useEmails(listScheduled);
  const sent = useEmails(listSent);

  const fetchSearch = useCallback(
    (page: number, limit: number) => searchEmails(term, page, limit),
    [term],
  );
  const search = useEmails(fetchSearch, searching);

  // a new search always starts on the first page
  const { setPage: setSearchPage } = search;
  useEffect(() => {
    setSearchPage(1);
  }, [term, setSearchPage]);

  const activeState = searching ? search : tab === 'scheduled' ? scheduled : sent;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'scheduled', label: 'Scheduled Emails', count: scheduled.data?.total },
              { id: 'sent', label: 'Sent Emails', count: sent.data?.total },
            ]}
            active={tab}
            onChange={(id) => {
              setQuery('');
              setTab(id);
            }}
          />
          <div className="flex items-center gap-3">
            <SlackButton />
            <Button onClick={() => setComposeOpen(true)}>Compose New Email</Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <SearchBox value={query} onChange={setQuery} />
          <a
            href={queueBoardUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Queue dashboard
          </a>
        </div>

        {searching && (
          <p className="mb-3 text-sm text-slate-600">
            {search.data ? `${search.data.total} results` : 'Searching'} for “{term}”
          </p>
        )}

        <EmailTable kind={searching ? 'search' : tab} state={activeState} />
      </main>

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={scheduled.refresh}
      />
    </div>
  );
}