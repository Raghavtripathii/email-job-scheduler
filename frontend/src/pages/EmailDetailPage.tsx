import { ArrowLeft, ChevronDown, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEmail, setStar } from '../api/emails';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { formatLongDate } from '../lib/format';
import type { EmailDetail } from '../types/api';

export function EmailDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    getEmail(id)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'could not load the email'));
  }, [id]);

  const backTo = detail && (detail.status === 'sent' || detail.status === 'failed') ? 'sent' : 'scheduled';

  async function toggleStar() {
    if (!detail) return;
    const next = !detail.starred;
    setDetail({ ...detail, starred: next });
    try {
      await setStar(detail.id, next);
    } catch (err) {
      setDetail({ ...detail, starred: !next });
      toast.error(err instanceof Error ? err.message : 'Could not update the star');
    }
  }

  return (
    <div className="min-h-screen bg-white pb-16">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <button type="button" aria-label="Back" onClick={() => navigate(`/dashboard?tab=${backTo}`)}>
            <ArrowLeft className="h-5 w-5 text-ink" />
          </button>
          <h1 className="truncate text-xl text-ink">{detail?.subject ?? ''}</h1>
        </div>

        <div className="flex items-center gap-4">
          {detail && (
            <button
              type="button"
              aria-label={detail.starred ? 'Remove star' : 'Add star'}
              onClick={toggleStar}
            >
              <Star
                className={`h-[18px] w-[18px] ${detail.starred ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
              />
            </button>
          )}
          <span className="h-6 w-px bg-line" />
          {user && <Avatar name={user.name} src={user.avatar} size={28} />}
        </div>
      </header>

      {!detail && !error && (
        <div className="flex justify-center pt-24 text-brand">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {error && <p className="px-5 pt-16 text-center text-sm text-red-600">{error}</p>}

      {detail && (
        <div className="mx-auto mt-4 max-w-[1040px] px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {detail.sender.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <p className="truncate text-sm text-ink">
                  <span className="font-semibold">{detail.sender.name}</span>{' '}
                  <span className="text-muted">&lt;{detail.sender.email}&gt;</span>
                </p>
                <span className="shrink-0 text-xs text-muted">
                  {formatLongDate(detail.sentAt ?? detail.scheduledAt)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDetails((open) => !open)}
                className="mt-0.5 flex items-center gap-1 text-xs text-muted"
              >
                to {detail.toEmail}
                <ChevronDown className={`h-3 w-3 transition ${showDetails ? 'rotate-180' : ''}`} />
              </button>

              {showDetails && (
                <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-1 rounded-xl bg-surface px-4 py-3 text-xs">
                  <dt className="text-muted">From</dt>
                  <dd className="text-ink">
                    {detail.sender.name} &lt;{detail.sender.email}&gt;
                  </dd>
                  <dt className="text-muted">To</dt>
                  <dd className="text-ink">{detail.toEmail}</dd>
                  <dt className="text-muted">Status</dt>
                  <dd className="capitalize text-ink">{detail.status}</dd>
                  <dt className="text-muted">{detail.sentAt ? 'Sent' : 'Scheduled for'}</dt>
                  <dd className="text-ink">{formatLongDate(detail.sentAt ?? detail.scheduledAt)}</dd>
                  {detail.error && (
                    <>
                      <dt className="text-muted">Error</dt>
                      <dd className="text-red-600">{detail.error}</dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          </div>

          <div
            className="email-body mt-8"
            // cleaned on the server before it gets here
            dangerouslySetInnerHTML={{ __html: detail.bodyHtml }}
          />
        </div>
      )}
    </div>
  );
}
