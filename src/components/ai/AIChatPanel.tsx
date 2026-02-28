import { useState } from 'react';
import type { Question, ViewConfig } from '../../types';
import { buildPrompt } from '../../ai/promptBuilder';
import { useAIChat } from '../../hooks/useAIChat';
import { Button } from '../ui/Button';

interface Props {
  questions: Question[];
  view: ViewConfig;
}

export function AIChatPanel({ questions, view }: Props) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('anthropic_api_key') ?? '');
  const [saveKey, setSaveKey] = useState(true);
  const [input, setInput] = useState('');
  const { messages, loading, send } = useAIChat();

  const onSend = async () => {
    if (!apiKey || !input.trim()) return;
    const payload = buildPrompt(questions, view, input.trim());
    await send(apiKey, payload.prompt, input.trim());
    setInput('');
    if (saveKey) localStorage.setItem('anthropic_api_key', apiKey);
  };

  if (!open) {
    return (
      <button
        className="fixed right-5 bottom-5 w-12 h-12 rounded-full bg-accent text-white"
        onClick={() => setOpen(true)}
      >
        AI
      </button>
    );
  }

  return (
    <div className="fixed right-5 bottom-5 w-[380px] h-[520px] bg-white border border-border rounded-2xl shadow-card flex flex-col">
      <header className="p-3 border-b border-border flex justify-between">
        <strong className="text-sm">AI 分析助手</strong>
        <button onClick={() => setOpen(false)}>×</button>
      </header>

      {!apiKey && (
        <div className="p-3 border-b border-border text-xs space-y-2">
          <div>请输入 Claude API Key</div>
          <input className="w-full border border-border rounded px-2 py-1" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={saveKey} onChange={(e) => setSaveKey(e.target.checked)} />
            保存到本地
          </label>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 space-y-2 text-sm">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>{m.content}</div>
        ))}
        {loading && <div className="text-secondary">AI 正在思考...</div>}
      </div>

      <footer className="p-3 border-t border-border flex gap-2">
        <input
          className="flex-1 border border-border rounded px-2 py-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的问题"
        />
        <Button variant="primary" onClick={onSend}>发送</Button>
      </footer>
    </div>
  );
}
