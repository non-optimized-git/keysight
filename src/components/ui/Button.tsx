import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'secondary', children, className = '', ...rest }: PropsWithChildren<Props>) {
  const base = 'muji-btn px-4 py-2 rounded-lg text-base transition-colors';
  const style =
    variant === 'primary'
      ? 'muji-btn-primary'
      : 'muji-btn-secondary';
  return (
    <button className={`${base} ${style} ${className}`} {...rest}>
      {children}
    </button>
  );
}
