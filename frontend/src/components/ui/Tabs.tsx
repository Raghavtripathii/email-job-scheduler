type Tab<T extends string> = { id: T; label: string; count?: number };

type Props<T extends string> = {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
};

export function Tabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab.id === active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-700">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}