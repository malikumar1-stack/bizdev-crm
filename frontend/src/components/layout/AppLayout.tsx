import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { GlobalSearchModal } from './GlobalSearchModal';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';

interface AppLayoutProps {
  currentPage: string;
  onNavigate: (page: string, entityId?: string) => void;
  children: React.ReactNode;
  onQuickAdd: (type: 'client' | 'meeting' | 'followup' | 'task' | 'opportunity') => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
  onQuickAdd
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          onOpenSearch={() => setSearchOpen(true)}
          onQuickAdd={onQuickAdd}
          onOpenAI={() => setAiOpen(true)}
          onNavigate={onNavigate}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Search Modal (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectEntity={(type, id) => {
          if (type === 'client') onNavigate('clients', id);
          else if (type === 'meeting') onNavigate('meetings');
          else if (type === 'followup') onNavigate('followups');
          else if (type === 'opportunity') onNavigate('pipeline');
        }}
      />

      {/* AI Assistant Copilot Drawer */}
      <AIAssistantDrawer
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
      />
    </div>
  );
};
