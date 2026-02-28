import { useEffect, useState } from 'react';

export interface RuntimeErrorItem {
  time: string;
  source: string;
  message: string;
  stack?: string;
}

declare global {
  interface Window {
    __APP_RUNTIME_ERRORS__?: RuntimeErrorItem[];
  }
}

export function useRuntimeErrors() {
  const [errors, setErrors] = useState<RuntimeErrorItem[]>(() => window.__APP_RUNTIME_ERRORS__ ?? []);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onError = () => setErrors([...(window.__APP_RUNTIME_ERRORS__ ?? [])]);
    window.addEventListener('app-runtime-error', onError);
    return () => window.removeEventListener('app-runtime-error', onError);
  }, []);

  const copy = async () => {
    const text = errors
      .map((e) => `[${e.time}] ${e.source}\n${e.message}\n${e.stack ?? ''}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
  };

  return { errors, open, setOpen, copy };
}

