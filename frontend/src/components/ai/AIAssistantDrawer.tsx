import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Button } from '../common/Button';
import { Send, Bot, Sparkles, User, HelpCircle } from 'lucide-react';
import { api } from '../../services/api';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose, clientId }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Business Development CRM Copilot. You can ask me questions about your upcoming meetings, client relationship health, overdue follow-ups, or request follow-up message drafts.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    'What meetings do I have tomorrow?',
    'Which clients have overdue follow-ups?',
    'Summarize my relationship with ABC Investments',
    'Draft a partnership follow-up message'
  ];

  const handleSend = async (text?: string) => {
    const query = text || input;
    if (!query.trim() || loading) return;

    const newMsgs = [...messages, { role: 'user' as const, content: query }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chatAI(query, clientId);
      setMessages([...newMsgs, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setMessages([...newMsgs, { role: 'assistant', content: `⚠️ ${err.message || 'AI request failed'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="AI CRM Copilot"
      subtitle="Context-aware Business Development Intelligence"
      width="lg"
    >
      <div className="flex flex-col h-full justify-between pb-4">
        {/* Chat History */}
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-sky-400 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
              CRM Copilot is analyzing records...
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">Suggested Queries:</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium transition-colors text-left"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about meetings, clients, or drafts..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
            <Button type="submit" loading={loading} icon={<Send className="w-4 h-4" />}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </Drawer>
  );
};
