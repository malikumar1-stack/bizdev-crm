import React, { useState } from 'react';
import { Bot, Send, Sparkles, Copy, Check, User, ArrowRight, Lightbulb } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';

export const AIAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: `Hello! I am your AI Business Development Copilot.

I have full contextual awareness of your clients, scheduled meetings, overdue follow-ups, and pipeline opportunities.

Try asking me one of the quick prompts below or type your custom inquiry:`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const smartQueries = [
    { title: '📅 Upcoming Meetings', prompt: 'What meetings do I have scheduled for today and tomorrow?' },
    { title: '⚠️ Overdue Follow-ups', prompt: 'Which clients have overdue follow-up tasks that need attention?' },
    { title: '📊 Pipeline Summary', prompt: 'Summarize our current pipeline value and deal stage distribution.' },
    { title: '✉️ Draft Partnership Email', prompt: 'Draft a professional follow-up email after a successful initial meeting.' },
    { title: '🎯 High Value Accounts', prompt: 'Who are our highest priority client relationships?' }
  ];

  const handleSend = async (queryText?: string) => {
    const query = queryText || input;
    if (!query.trim() || loading) return;

    const newMsgs = [...messages, { role: 'user' as const, content: query }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chatAI(query);
      setMessages([...newMsgs, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setMessages([...newMsgs, { role: 'assistant', content: `⚠️ ${err.message || 'AI request failed'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white flex items-center justify-center shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI CRM Copilot</h2>
            <p className="text-xs text-slate-500">Instant intelligence, briefing generation, and CRM workflow automation</p>
          </div>
        </div>
      </div>

      {/* Suggested Smart Prompt Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {smartQueries.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq.prompt)}
            className="p-3 text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:shadow-xs transition-all text-xs group"
          >
            <span className="font-bold text-slate-900 dark:text-white block group-hover:text-brand-500">{sq.title}</span>
            <span className="text-[10px] text-slate-400 mt-1 line-clamp-2">{sq.prompt}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm min-h-[450px] flex flex-col justify-between space-y-6">
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-sky-400 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`relative p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-none shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>
                {m.role === 'assistant' && idx > 0 && (
                  <button
                    onClick={() => handleCopy(m.content, idx)}
                    className="mt-3 flex items-center gap-1 text-[11px] text-slate-400 hover:text-brand-500 font-semibold"
                  >
                    {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedIdx === idx ? 'Copied to clipboard' : 'Copy text'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-400 p-2">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
              AI Copilot is analyzing database context...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800"
        >
          <input
            type="text"
            placeholder="Ask about clients, upcoming meetings, drafting messages, or strategy..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
          />
          <Button type="submit" loading={loading} icon={<Send className="w-4 h-4" />}>
            Ask AI
          </Button>
        </form>
      </div>
    </div>
  );
};
