import { useState } from 'react';

type Props = { name: string; src?: string | null; size?: number };

export function Avatar({ name, src, size = 36 }: Props) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

  // google photos can fail to load, so fall back to initials
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700"
    >
      {initials || '?'}
    </div>
  );
}