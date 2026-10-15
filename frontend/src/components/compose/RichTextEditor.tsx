import {
  AlignCenter,
  Bold,
  ChevronsUpDown,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Type,
  Underline,
  Undo2,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = { onChange: (html: string) => void };

type MenuItem = { label: string; command: string; value?: string };

const SIZES: MenuItem[] = [
  { label: 'Small', command: 'fontSize', value: '2' },
  { label: 'Normal', command: 'fontSize', value: '3' },
  { label: 'Large', command: 'fontSize', value: '5' },
  { label: 'Huge', command: 'fontSize', value: '6' },
];

const ALIGNS: MenuItem[] = [
  { label: 'Left', command: 'justifyLeft' },
  { label: 'Center', command: 'justifyCenter' },
  { label: 'Right', command: 'justifyRight' },
  { label: 'Justify', command: 'justifyFull' },
];

type ToolProps = { label: string; onClick: () => void; children: ReactNode };

// mouse down is cancelled so the text selection is not lost
function Tool({ label, onClick, children }: ToolProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded-md p-1.5 text-ink/60 hover:bg-white hover:text-ink"
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1.5 h-5 w-px bg-line" />;

export function RichTextEditor({ onChange }: Props) {
  const editor = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(true);
  const [menu, setMenu] = useState<'size' | 'align' | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!toolbar.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menu]);

  function sync() {
    setEmpty((editor.current?.textContent ?? '').trim().length === 0);
    onChange(editor.current?.innerHTML ?? '');
  }

  // execCommand is old but it is the lightest way to get a real editor
  function run(command: string, value?: string) {
    editor.current?.focus();
    document.execCommand(command, false, value);
    setMenu(null);
    sync();
  }

  function dropdown(items: MenuItem[]) {
    return (
      <div className="absolute left-0 top-full z-20 mt-2 w-32 rounded-xl border border-line bg-white p-1 shadow-lg">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(item.command, item.value)}
            className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-ink hover:bg-surface"
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#fafafa] px-5 pb-6 pt-4">
      <p
        onClick={() => editor.current?.focus()}
        className={`cursor-text text-sm text-muted ${empty ? '' : 'invisible'}`}
      >
        Type Your Reply...
      </p>

      <div ref={toolbar} className="mt-3 flex flex-wrap items-center rounded-full bg-[#f1f1f1] px-3 py-1.5">
        <Tool label="Undo" onClick={() => run('undo')}>
          <Undo2 className="h-4 w-4" />
        </Tool>
        <Tool label="Redo" onClick={() => run('redo')}>
          <Redo2 className="h-4 w-4" />
        </Tool>
        <Divider />

        <div className="relative">
          <Tool label="Font size" onClick={() => setMenu(menu === 'size' ? null : 'size')}>
            <span className="flex items-center gap-0.5">
              <Type className="h-4 w-4" />
              <ChevronsUpDown className="h-3 w-3" />
            </span>
          </Tool>
          {menu === 'size' && dropdown(SIZES)}
        </div>
        <Divider />

        <Tool label="Bold" onClick={() => run('bold')}>
          <Bold className="h-4 w-4" />
        </Tool>
        <Tool label="Italic" onClick={() => run('italic')}>
          <Italic className="h-4 w-4" />
        </Tool>
        <Tool label="Underline" onClick={() => run('underline')}>
          <Underline className="h-4 w-4" />
        </Tool>
        <Divider />

        <div className="relative">
          <Tool label="Align" onClick={() => setMenu(menu === 'align' ? null : 'align')}>
            <span className="flex items-center gap-0.5">
              <AlignCenter className="h-4 w-4" />
              <ChevronsUpDown className="h-3 w-3" />
            </span>
          </Tool>
          {menu === 'align' && dropdown(ALIGNS)}
        </div>
        <Divider />

        <Tool label="Numbered list" onClick={() => run('insertOrderedList')}>
          <ListOrdered className="h-4 w-4" />
        </Tool>
        <Tool label="Bullet list" onClick={() => run('insertUnorderedList')}>
          <List className="h-4 w-4" />
        </Tool>
        <Tool label="Indent" onClick={() => run('indent')}>
          <IndentIncrease className="h-4 w-4" />
        </Tool>
        <Tool label="Outdent" onClick={() => run('outdent')}>
          <IndentDecrease className="h-4 w-4" />
        </Tool>
        <Tool label="Quote" onClick={() => run('formatBlock', 'blockquote')}>
          <Quote className="h-4 w-4" />
        </Tool>
        <Tool label="Clear formatting" onClick={() => run('removeFormat')}>
          <RemoveFormatting className="h-4 w-4" />
        </Tool>
        <Divider />

        <Tool label="Strikethrough" onClick={() => run('strikeThrough')}>
          <Strikethrough className="h-4 w-4" />
        </Tool>
      </div>

      <div
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        onInput={sync}
        // paste as plain text, the server cleans the html anyway
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
        className="email-body mt-4 min-h-[320px] outline-none"
      />
    </div>
  );
}
