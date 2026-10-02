import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { disconnectSlack, getSlackStatus, slackConnectUrl } from '../api/slack';
import type { SlackStatus } from '../types/api';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';

export function SlackButton() {
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

    setParams({}, { replace: true });
    load();
  }, [params, setParams, toast, load]);

  async function handleDisconnect() {
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

  if (!status) return null;

  if (status.connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
          Slack connected{status.channel ? ` · ${status.channel}` : ''}
        </span>
        <Button variant="ghost" size="sm" loading={busy} onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      onClick={() => {
        window.location.href = slackConnectUrl;
      }}
    >
      Connect Slack
    </Button>
  );
}