import { ArrowLeft, ChevronDown, Clock } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSenders, scheduleEmails } from '../api/emails';
import { ChipsInput } from '../components/compose/ChipsInput';
import { RichTextEditor } from '../components/compose/RichTextEditor';
import { SendLaterPopover } from '../components/compose/SendLaterPopover';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { MAX_EMAILS, parseLeads } from '../lib/csv';
import type { Sender } from '../types/api';

const MAX_FILE_BYTES = 1_000_000;

type RowProps = { label: string; line?: boolean; error?: string; children: ReactNode };

function FormRow({ label, line = false, error, children }: RowProps) {
  return (
    <div>
      <div className={`flex items-center gap-4 ${line ? 'border-b border-line' : ''}`}>
        <span className="w-14 shrink-0 text-[13px] text-ink">{label}</span>
        {children}
      </div>
      {error && <p className="ml-[72px] mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const smallBox =
  'h-[38px] w-[70px] rounded-lg bg-surface text-center text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/30';

export function ComposePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [delaySec, setDelaySec] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [sendAt, setSendAt] = useState('');
  const [laterOpen, setLaterOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listSenders()
      .then(setSenders)
      .catch(() => toast.error('Could not load the senders'));
  }, [toast]);

  function addEmails(list: string[]) {
    const merged = [...new Set([...emails, ...list])];
    if (merged.length > MAX_EMAILS) {
      toast.error(`Up to ${MAX_EMAILS} emails per batch`);
      return;
    }
    setEmails(merged);
    setErrors((cur) => ({ ...cur, to: '' }));
  }

  async function handleUpload(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File is too big, keep it under 1 MB');
      return;
    }
    const parsed = parseLeads(await file.text());
    if (parsed.emails.length === 0) {
      toast.error('No email addresses found in that file');
      return;
    }
    addEmails(parsed.emails);
    setUploadNote(
      `${parsed.emails.length} email addresses detected` +
        (parsed.invalid || parsed.duplicates
          ? `, skipped ${parsed.invalid} invalid and ${parsed.duplicates} duplicates`
          : ''),
    );
  }

  function validate() {
    const next: Record<string, string> = {};
    if (emails.length === 0) next.to = 'Add at least one recipient';
    if (!subject.trim()) next.subject = 'Add a subject';

    const delay = Number(delaySec);
    if (delaySec === '' || !Number.isFinite(delay) || delay < 0)
      next.delay = 'Enter the seconds between emails';

    const limit = Number(hourlyLimit);
    if (!Number.isInteger(limit) || limit < 1) next.limit = 'Enter a whole number, 1 or more';

    // the editor html still has tags when it only looks empty
    if (
      bodyHtml
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim() === ''
    )
      next.body = 'Write the email';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSend() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await scheduleEmails({
        subject: subject.trim(),
        body: bodyHtml,
        emails,
        startTime: (sendAt ? new Date(sendAt) : new Date()).toISOString(),
        delayMs: Math.round(Number(delaySec) * 1000),
        hourlyLimit: Number(hourlyLimit),
        senderId: senderId || undefined,
      });
      toast.success(`Scheduled ${result.total} emails across ${result.senders} sender(s)`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not schedule the emails');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white pb-16">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Back" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5 text-ink" />
          </button>
          <h1 className="text-xl text-ink">Compose New Email</h1>
        </div>

        <div className="relative flex items-center gap-4">
          <button
            type="button"
            aria-label="Send later"
            onClick={() => setLaterOpen((open) => !open)}
            className={sendAt ? 'text-brand' : 'text-muted hover:text-ink'}
          >
            <Clock className="h-5 w-5" />
          </button>
          <Button variant="outline" loading={submitting} onClick={handleSend}>
            {sendAt ? 'Send Later' : 'Send'}
          </Button>

          {laterOpen && (
            <SendLaterPopover
              value={sendAt}
              onDone={(value) => {
                setSendAt(value);
                setLaterOpen(false);
              }}
              onClose={() => setLaterOpen(false)}
            />
          )}
        </div>
      </header>

      <div className="mx-auto mt-4 flex max-w-[1040px] flex-col gap-4 px-5">
        <FormRow label="From">
          <div className="relative">
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              aria-label="From"
              className="h-9 appearance-none rounded-lg bg-surface pl-3 pr-9 text-sm text-ink outline-none"
            >
              <option value="">All senders (rotate)</option>
              {senders.map((sender) => (
                <option key={sender.id} value={sender.id}>
                  {sender.email}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </FormRow>

        <FormRow label="To" line error={errors.to}>
          <ChipsInput
            emails={emails}
            onAdd={addEmails}
            onRemoveLast={() => setEmails((cur) => cur.slice(0, -1))}
            onUpload={handleUpload}
          />
        </FormRow>
        {(uploadNote || emails.length > 0) && (
          <p className="-mt-2 ml-[72px] text-xs text-brand">
            {uploadNote ?? `${emails.length} email addresses`}
            {uploadNote && ` · ${emails.length} recipients in total`}
          </p>
        )}

        <FormRow label="Subject" line error={errors.subject}>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={500}
            className="w-full bg-transparent py-3 text-sm text-ink outline-none placeholder:text-muted"
          />
        </FormRow>

        <div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-ink">Delay between 2 emails</span>
            <input
              type="number"
              min={0}
              value={delaySec}
              onChange={(e) => setDelaySec(e.target.value)}
              placeholder="00"
              title="seconds"
              aria-label="Delay between 2 emails in seconds"
              className={smallBox}
            />
            <span className="ml-2 text-[13px] text-ink">Hourly Limit</span>
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              placeholder="00"
              title="emails per hour for each sender"
              aria-label="Hourly limit per sender"
              className={smallBox}
            />
          </div>
          {(errors.delay || errors.limit) && (
            <p className="mt-1 text-xs text-red-600">{errors.delay ?? errors.limit}</p>
          )}
        </div>

        <div>
          <RichTextEditor onChange={setBodyHtml} />
          {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body}</p>}
        </div>
      </div>
    </div>
  );
}
