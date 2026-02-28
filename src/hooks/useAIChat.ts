import { useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async (apiKey: string, prompt: string, userMessage: string) => {
    setLoading(true);
    setMessages((m) => [...m, { role: 'user', content: userMessage }]);
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!resp.ok) throw new Error(`AI 请求失败: ${resp.status}`);

      const json = (await resp.json()) as { content?: Array<{ text?: string }> };
      const text = json.content?.[0]?.text ?? '未返回内容';
      setMessages((m) => [...m, { role: 'assistant', content: text }]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, send };
}
