import { Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import { parseLeads } from '../../lib/csv';

type Props = {
  emails: string[];
  onAdd: (emails: string[]) => void;
  onRemoveLast: () => void;
  onUpload: (file: File) => void;
};

const VISIBLE_CHIPS = 3;

export function ChipsInput({ emails, onAdd, onRemoveLast, onUpload }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // turns typed or pasted text into chips, keeps the text if it is not an email
  function commit(text: string) {
    if (!text.trim()) return;
    const found = parseLeads(text).emails;
    if (found.length === 0) {
      setInvalid(true);
      return;
    }
    onAdd(found);
    setDraft('');
    setInvalid(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (['Enter', ',', ' ', 'Tab'].includes(e.key) && draft.trim()) {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && emails.length > 0) {
      onRemoveLast();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    commit(e.clipboardData.getData('text'));
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onUpload(file);
  }

  const shown = expanded ? emails : emails.slice(0, VISIBLE_CHIPS);
  const hidden = emails.length - shown.length;
  const chip = 'rounded-full border border-brand bg-brand-soft px-3 py-0.5 text-[13px] text-ink';

  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2 py-2">
        {shown.map((email) => (
          <span key={email} className={chip}>
            {email}
          </span>
        ))}
        {hidden > 0 && (
          <button type="button" onClick={() => setExpanded(true)} className={chip}>
            +{hidden}
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => commit(draft)}
          placeholder={emails.length === 0 ? 'recipient@example.com' : ''}
          aria-label="Recipients"
          className={`min-w-[180px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted ${
            invalid ? 'text-red-600' : 'text-ink'
          }`}
        />
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        <Upload className="h-4 w-4" />
        Upload List
      </button>
    </div>
  );
}
