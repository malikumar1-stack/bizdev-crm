import React from 'react';
import { IOpportunity, OpportunityStage } from '../../types';
import { Badge } from '../common/Badge';
import { Plus, DollarSign, Calendar, User, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

interface KanbanBoardProps {
  opportunities: IOpportunity[];
  onRefresh: () => void;
  onOpenOpportunity: (opp: IOpportunity) => void;
  onNewOpportunity: (stage?: OpportunityStage) => void;
}

const STAGES: { id: OpportunityStage; label: string; color: string }[] = [
  { id: 'LEAD', label: 'Lead / Prospect', color: 'border-slate-300 bg-slate-100 text-slate-800' },
  { id: 'CONTACTED', label: 'Contacted', color: 'border-sky-300 bg-sky-50 text-sky-800' },
  { id: 'MEETING', label: 'Meeting Scheduled', color: 'border-brand-300 bg-brand-50 text-brand-800' },
  { id: 'PROPOSAL', label: 'Proposal Sent', color: 'border-purple-300 bg-purple-50 text-purple-800' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'border-amber-300 bg-amber-50 text-amber-800' },
  { id: 'WON', label: 'Won / Closed', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  { id: 'LOST', label: 'Lost', color: 'border-rose-300 bg-rose-50 text-rose-800' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  opportunities,
  onRefresh,
  onOpenOpportunity,
  onNewOpportunity
}) => {
  const handleAdvanceStage = async (opp: IOpportunity, nextStage: OpportunityStage) => {
    try {
      await api.updateOpportunityStage(opp.id, nextStage);
      onRefresh();
    } catch (err) {
      console.error('Failed to advance stage:', err);
    }
  };

  const getNextStage = (current: OpportunityStage): OpportunityStage | null => {
    const order: OpportunityStage[] = ['LEAD', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON'];
    const idx = order.indexOf(current);
    if (idx >= 0 && idx < order.length - 1) return order[idx + 1];
    return null;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 min-h-[600px]">
      {STAGES.map((stage) => {
        const stageOpps = opportunities.filter((o) => o.stage === stage.id);
        const stageTotal = stageOpps.reduce((sum, o) => sum + o.value, 0);

        return (
          <div
            key={stage.id}
            className="w-72 shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[750px]"
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  {stage.label}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  ${stageTotal.toLocaleString()} &bull; {stageOpps.length}
                </p>
              </div>
              <button
                onClick={() => onNewOpportunity(stage.id)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Column Cards */}
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {stageOpps.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No deals
                </div>
              ) : (
                stageOpps.map((opp) => {
                  const next = getNextStage(opp.stage);
                  return (
                    <div
                      key={opp.id}
                      onClick={() => onOpenOpportunity(opp)}
                      className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                          {opp.title}
                        </h5>
                        <Badge size="sm" variant={opp.probability >= 70 ? 'success' : opp.probability >= 40 ? 'info' : 'default'}>
                          {opp.probability}%
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                        {opp.client?.company?.name || 'Client'}
                      </p>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center text-sm">
                          ${opp.value.toLocaleString()}
                        </span>
                        {next && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceStage(opp, next);
                            }}
                            title={`Advance to ${next}`}
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
