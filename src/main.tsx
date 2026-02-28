import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

type RuntimeErrorItem = {
  time: string;
  source: string;
  message: string;
  stack?: string;
};

declare global {
  interface Window {
    __APP_RUNTIME_ERRORS__?: RuntimeErrorItem[];
  }
}

function recordError(source: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const item: RuntimeErrorItem = {
    time: new Date().toISOString(),
    source,
    message,
    stack,
  };
  const current = window.__APP_RUNTIME_ERRORS__ ?? [];
  window.__APP_RUNTIME_ERRORS__ = [item, ...current].slice(0, 50);
  window.dispatchEvent(new Event('app-runtime-error'));
}

window.addEventListener('error', (event) => {
  recordError('window.error', event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  recordError('unhandledrejection', event.reason);
});

class RootErrorBoundary extends React.Component<React.PropsWithChildren, { error: Error | null }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    recordError('ReactErrorBoundary', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: 'monospace' }}>
          <h2>页面发生错误</h2>
          <p>请把下面错误信息发给我：</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack ?? this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
} catch (e) {
  recordError('bootstrap', e);
  const el = document.getElementById('root');
  if (el) {
    const msg = e instanceof Error ? e.stack ?? e.message : String(e);
    el.innerHTML = `<pre style="white-space:pre-wrap;padding:16px;font-family:monospace;">启动失败:\n${msg}</pre>`;
  }
}
