import { Calendar } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatLongDate, tomorrowAt } from '../../lib/format';

type Props = {
  value: string;
  onDone: (value: string) => void;
  onClose: () => void;
};

const OPTIONS = [
  { label: 'Tomorrow', hour: 9 },
  { label: 'Tomorrow, 10:00 AM', hour: 10 },
  { label: 'Tomorrow, 11:00 AM', hour: 11 },
  { label: 'Tomorrow, 3:00 PM', hour: 15 },
];

export function SendLaterPopover({ value, onDone, onClose }: Props) {
  const [draft, setDraft] = useState(value);
  const box = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  return (
    <div
      ref={box}
      className="absolute right-0 top-full z-30 mt-3 w-80 rounded-xl border border-line bg-white p-4 shadow-lg"
    >
      <p className="text-sm font-medium text-ink">Send Later</p>

      <label className="relative mt-3 flex cursor-pointer items-center justify-between border-b border-line pb-2 text-sm">
        <span className={draft ? 'text-ink' : 'text-muted'}>
          {draft ? formatLongDate(new Date(draft)) : 'Pick date & time'}
        </span>
        <Calendar className="h-4 w-4 text-muted" />
        <input
          ref={picker}
          type="datetime-local"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={() => picker.current?.showPicker?.()}
          aria-label="Pick date and time"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      <div className="mt-2">
        {OPTIONS.map((option) => {
          const optionValue = tomorrowAt(option.hour);
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => setDraft(optionValue)}
              className={`block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface ${
                draft === optionValue ? 'bg-brand-soft font-medium' : 'text-ink'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-3">
        <button type="button" onClick={onClose} className="text-sm text-ink hover:underline">
          Cancel
        </button>
        <button
          type="button"
          disabled={!draft}
          onClick={() => onDone(draft)}
          className="rounded-full border border-brand px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft disabled:opacity-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}