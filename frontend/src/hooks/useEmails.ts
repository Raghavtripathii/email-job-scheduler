import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmailList } from '../types/api';

export const PAGE_SIZE = 20;
const POLL_MS = 5000;

type Fetcher = (page: number, limit: number) => Promise<EmailList>;

// enabled=false switches it off, used when there is nothing to search for
export function useEmails(fetcher: Fetcher, enabled = true) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EmailList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const load = useCallback(
    async (showSpinner: boolean) => {
      // only the newest request is allowed to update the screen
      const id = ++latest.current;
      if (showSpinner) setLoading(true);

      try {
        const result = await fetcher(page, PAGE_SIZE);
        if (id !== latest.current) return;
        setData(result);
        setError(null);

        // the page can vanish when rows move to the other tab
        const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
        if (page > lastPage) setPage(lastPage);
      } catch (err) {
        if (id !== latest.current) return;
        setError(err instanceof Error ? err.message : 'could not load emails');
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [fetcher, page],
  );

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(true);
      return;
    }

    load(true);
    // refresh quietly, but not while the tab is hidden
    const timer = setInterval(() => {
      if (!document.hidden) load(false);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load, enabled]);

  const refresh = useCallback(() => load(false), [load]);

  return { data, loading, error, page, setPage, refresh };
}

export type EmailsState = ReturnType<typeof useEmails>;