import { Check, Funnel, RefreshCw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { EmailStatus } from '../types/api';

type Option = { value: EmailStatus | ''; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  status: EmailStatus | '';
  onStatus: (status: EmailStatus | '') => void;
  onRefresh: () => void;
  refreshing: boolean;
};

export function SearchBar({ value, onChange, options, status, onStatus, onRefresh, refreshing }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-5">
      <div className="relative max-w-[670px] flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search"
          aria-label="Search emails"
          className="h-10 w-full rounded-full bg-surface pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div ref={box} className="relative">
        <button
          type="button"
          aria-label="Filter"
          onClick={() => setMenuOpen((open) => !open)}
          className={status ? 'text-brand' : 'text-ink/60 hover:text-ink'}
        >
          <Funnel className="h-[18px] w-[18px]" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 w-40 rounded-xl border border-line bg-white p-1 shadow-lg">
            {options.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => {
                  onStatus(option.value);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface"
              >
                {option.label}
                {status === option.value && <Check className="h-4 w-4 text-brand" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" aria-label="Refresh" onClick={onRefresh} className="text-ink/60 hover:text-ink">
        <RefreshCw className={`h-[18px] w-[18px] ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}