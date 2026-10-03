import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'soft' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

const variants = {
  primary: 'rounded-xl bg-brand text-white hover:bg-brand-dark',
  outline: 'rounded-full border border-brand text-brand hover:bg-brand-soft',
  soft: 'rounded-xl bg-brand-soft text-ink hover:bg-[#d9efe2]',
  secondary: 'rounded-lg border border-line bg-white text-ink hover:bg-surface',
  ghost: 'rounded-lg text-ink hover:bg-surface',
};

const sizes = {
  sm: 'h-8 px-3',
  md: 'h-10 px-5',
  lg: 'h-12 px-5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}