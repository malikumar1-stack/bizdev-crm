import React, { useState, useEffect } from 'react';
import { Search, Building2, Calendar, Clock, CheckSquare, TrendingUp, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (type: string, id: string) => void;
}

export const GlobalSearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectEntity }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ clients: any[]; meetings: any[]; followups: any[]; tasks: any[]; opportunities: any[] }>({
    clients: [],
    meetings: [],
    followups: [],
    tasks: [],
    opportunities: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ clients: [], meetings: [], followups: [], tasks: [], opportunities: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.globalSearch(query);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = results.clients.length + results.meetings.length + results.followups.length + results.tasks.length + results.opportunities.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center p-4 pt-20 text-center">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left shadow-2xl border border-slate-200 dark:border-slate-800 z-10">
          {/* Search Bar Input */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search companies, clients, meetings, follow-ups, opportunities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-base font-medium"
            />
            <kbd className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 border rounded text-slate-400">ESC</kbd>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto p-4 space-y-4">
            {query.trim() && totalResults === 0 && !loading && (
              <p className="text-center text-sm text-slate-400 py-6">No matching CRM records found for "{query}"</p>
            )}

            {/* Clients */}
            {results.clients.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Clients & Companies</p>
                <div className="space-y-1">
                  {results.clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { onSelectEntity('client', c.id); onClose(); }}
                      className="w-full p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="w-4 h-4 text-brand-500 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.company.name}</p>
                          <p className="text-xs text-slate-400">{c.customClientId} &bull; {c.primaryContact?.name || 'No Contact'}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Meetings */}
            {results.meetings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Meetings</p>
                <div className="space-y-1">
                  {results.meetings.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { onSelectEntity('meeting', m.id); onClose(); }}
                      className="w-full p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.title}</p>
                          <p className="text-xs text-slate-400">{m.client?.company?.name} &bull; {new Date(m.startTime).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-ups */}
            {results.followups.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Follow-ups</p>
                <div className="space-y-1">
                  {results.followups.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { onSelectEntity('followup', f.id); onClose(); }}
                      className="w-full p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{f.title}</p>
                          <p className="text-xs text-slate-400">{f.client?.company?.name} &bull; Due {new Date(f.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
