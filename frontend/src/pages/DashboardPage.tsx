import { useState } from 'react';
import { listScheduled, listSent } from '../api/emails';
import { ComposeModal } from '../components/ComposeModal';
import { EmailTable } from '../components/EmailTable';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { useEmails } from '../hooks/useEmails';

type TabId = 'scheduled' | 'sent';

export function DashboardPage() {
  const [tab, setTab] = useState<TabId>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);

  const scheduled = useEmails(listScheduled);
  const sent = useEmails(listSent);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'scheduled', label: 'Scheduled Emails', count: scheduled.data?.total },
              { id: 'sent', label: 'Sent Emails', count: sent.data?.total },
            ]}
            active={tab}
            onChange={setTab}
          />
          <Button onClick={() => setComposeOpen(true)}>Compose New Email</Button>
        </div>

        <EmailTable kind={tab} state={tab === 'scheduled' ? scheduled : sent} />
      </main>

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={scheduled.refresh}
      />
    </div>
  );
}