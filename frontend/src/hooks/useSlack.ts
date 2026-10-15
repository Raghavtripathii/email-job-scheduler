import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { disconnectSlack, getSlackStatus } from '../api/slack';
import { useToast } from '../components/ui/Toast';
import type { SlackStatus } from '../types/api';

export function useSlack() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  const load = useCallback(() => {
    getSlackStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // slack sends the person back with the result in the address bar
  useEffect(() => {
    const result = params.get('slack');
    if (!result) {
      handled.current = false;
      return;
    }
    if (handled.current) return;
    handled.current = true;

    if (result === 'connected') toast.success('Slack connected, you will get a message when a limit is hit');
    else if (result === 'denied') toast.error('Slack connection was cancelled');
    else toast.error('Could not connect Slack, please try again');

    const next = new URLSearchParams(params);
    next.delete('slack');
    setParams(next, { replace: true });
    load();
  }, [params, setParams, toast, load]);

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectSlack();
      setStatus({ connected: false });
      toast.success('Slack disconnected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not disconnect Slack');
    } finally {
      setBusy(false);
    }
  }

  return { status, busy, disconnect };
}
