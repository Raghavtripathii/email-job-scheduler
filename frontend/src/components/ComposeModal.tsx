import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { scheduleEmails } from '../api/emails';
import { MAX_EMAILS, parseLeads, type ParsedLeads } from '../lib/csv';
import { formatDateTime, toLocalInputValue } from '../lib/format';
import { Button } from './ui/Button';
import { Field, Input, Textarea } from './ui/Field';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

type Props = {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
};

const MAX_FILE_BYTES = 1_000_000;

export function ComposeModal({ open, onClose, onScheduled }: Props) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [leads, setLeads] = useState<ParsedLeads | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('');
  const [delaySec, setDelaySec] = useState('5');
  const [hourlyLimit, setHourlyLimit] = useState('50');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // a start time in the past gets refreshed to one minute from now
  useEffect(() => {
    if (!open) return;
    setStartTime((current) =>
      !current || new Date(current).getTime() < Date.now()
        ? toLocalInputValue(new Date(Date.now() + 60_000))
        : current,
    );
  }, [open]);

  // when the last email goes out, ignoring hourly pauses
  const lastSendAt = useMemo(() => {
    const start = new Date(startTime).getTime();
    const delay = Number(delaySec);
    if (!leads || leads.emails.length === 0 || Number.isNaN(start) || !Number.isFinite(delay) || delay < 0) {
      return null;
    }
    return new Date(start + (leads.emails.length - 1) * delay * 1000);
  }, [leads, startTime, delaySec]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setErrors((cur) => ({ ...cur, file: 'File is too big, keep it under 1 MB' }));
      return;
    }

    setLeads(parseLeads(await file.text()));
    setFileName(file.name);
    setErrors((cur) => ({ ...cur, file: '' }));
  }

  function validate() {
    const next: Record<string, string> = {};

    if (!subject.trim()) next.subject = 'Add a subject';
    if (!body.trim()) next.body = 'Write the email body';

    if (!leads || leads.emails.length === 0) {
      next.file = 'Upload a CSV or text file with at least one valid email';
    } else if (leads.emails.length > MAX_EMAILS) {
      next.file = `Up to ${MAX_EMAILS} emails per batch, this file has ${leads.emails.length}`;
    }

    if (!startTime || Number.isNaN(new Date(startTime).getTime())) next.startTime = 'Pick a start time';

    const delay = Number(delaySec);
    if (delaySec === '' || !Number.isFinite(delay) || delay < 0) next.delay = 'Use 0 or more seconds';

    const limit = Number(hourlyLimit);
    if (!Number.isInteger(limit) || limit < 1) next.hourlyLimit = 'Use a whole number, 1 or more';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function reset() {
    setSubject('');
    setBody('');
    setLeads(null);
    setFileName(null);
    setDelaySec('5');
    setHourlyLimit('50');
    setErrors({});
    setServerError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate() || !leads) return;

    setSubmitting(true);
    try {
      const result = await scheduleEmails({
        subject: subject.trim(),
        body: body.trim(),
        emails: leads.emails,
        startTime: new Date(startTime).toISOString(),
        delayMs: Math.round(Number(delaySec) * 1000),
        hourlyLimit: Number(hourlyLimit),
      });

      toast.success(`Scheduled ${result.total} emails across ${result.senders} senders`);
      reset();
      onScheduled();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'could not schedule the emails';
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Compose New Email" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Subject" htmlFor="subject" error={errors.subject}>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Quick question about your launch"
            maxLength={500}
          />
        </Field>

        <Field label="Body" htmlFor="body" error={errors.body}>
          <Textarea
            id="body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email here"
          />
        </Field>

        <Field
          label="Email leads"
          htmlFor="leads"
          error={errors.file}
          hint="CSV or text file. Any column works, we pick out the email addresses."
        >
          <input
            ref={fileInput}
            id="leads"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600 hover:border-green-600 hover:bg-green-50/40"
          >
            <span className="font-medium text-slate-800">{fileName ?? 'Upload CSV or text file'}</span>
            {leads ? (
              <span className="font-medium text-green-700">{leads.emails.length} email addresses detected</span>
            ) : (
              <span>Click to choose a file</span>
            )}
          </button>
          {leads && (leads.invalid > 0 || leads.duplicates > 0) && (
            <p className="mt-1 text-xs text-slate-500">
              Skipped {leads.invalid} invalid and {leads.duplicates} duplicate addresses
            </p>
          )}
        </Field>

        <Field label="Start time" htmlFor="startTime" error={errors.startTime}>
          <Input
            id="startTime"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Delay between emails (seconds)" htmlFor="delay" error={errors.delay}>
            <Input
              id="delay"
              type="number"
              min={0}
              step={1}
              value={delaySec}
              onChange={(e) => setDelaySec(e.target.value)}
            />
          </Field>
          <Field label="Hourly limit per sender" htmlFor="hourlyLimit" error={errors.hourlyLimit}>
            <Input
              id="hourlyLimit"
              type="number"
              min={1}
              step={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
            />
          </Field>
        </div>

        {lastSendAt && (
          <p className="text-xs text-slate-500">
            One email every {delaySec}s. The last one goes out around {formatDateTime(lastSendAt)}, unless an
            hourly limit pauses it.
          </p>
        )}

        {serverError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
}