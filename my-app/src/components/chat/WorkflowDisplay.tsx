import { CheckCircle2, AlertCircle, Activity } from "lucide-react";
import { getAgentColor, renderMessageContent } from "@/lib/chat-utils";
import { WorkflowDisplayProps } from "@/types/chat";
import { useWebSocket } from "@/app/contexts/WebSocketContext";

export function WorkflowDisplay({ workflowSteps, workflowEndRef }: WorkflowDisplayProps) {
  const { tokenUsage } = useWebSocket();

  const isEmpty = !workflowSteps || workflowSteps.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Steps list */}
      <div className="flex-1 overflow-auto space-y-1.5 p-1">
        {isEmpty && !tokenUsage ? (
          <div className="flex flex-col items-center justify-center h-full select-none text-center py-10">
            <Activity className="h-7 w-7 mb-3 text-gray-500" />
            <p className="text-sm text-gray-400">Activity will appear here while Zirak is working.</p>
          </div>
        ) : (
          <>
            {workflowSteps.map((step, index) => (
              <div
                key={step.id || index}
                className={`rounded border px-3 py-2 ${
                  step.status === 'active'
                    ? 'border-blue-600 bg-blue-950/50'
                    : step.status === 'error'
                    ? 'border-red-600 bg-red-950/40'
                    : 'border-gray-700/60 bg-[#1a1a1a]'
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Status icon */}
                  <div className="mt-0.5 shrink-0">
                    {step.status === 'active' ? (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : step.status === 'error' ? (
                      <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Agent name + timestamp */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: getAgentColor(step.agent) }}
                      >
                        {step.agent || 'System'}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-2 shrink-0">
                        {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    {/* Message text — white so it's always readable */}
                    <div className="text-xs text-gray-100 break-words leading-relaxed">
                      {renderMessageContent(step.message || '')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={workflowEndRef} />
      </div>

      {/* Token usage bar — sticky at the bottom, shown only when data is available */}
      {tokenUsage && (
        <div className="shrink-0 border-t border-gray-700/60 bg-[#111] px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Token Usage
            </span>
            <span className="text-[10px] text-gray-300 font-mono">
              {tokenUsage.totalUsed.toLocaleString()} / {tokenUsage.maxTokens.toLocaleString()}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                tokenUsage.totalUsed / tokenUsage.maxTokens > 0.9
                  ? 'bg-red-500'
                  : tokenUsage.totalUsed / tokenUsage.maxTokens > 0.7
                  ? 'bg-yellow-500'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.min(100, (tokenUsage.totalUsed / tokenUsage.maxTokens) * 100).toFixed(1)}%`,
              }}
            />
          </div>
          {/* Prompt / completion breakdown */}
          <div className="flex gap-3 mt-1">
            <span className="text-[10px] text-gray-500">
              Prompt: <span className="text-gray-300">{tokenUsage.promptTokens.toLocaleString()}</span>
            </span>
            <span className="text-[10px] text-gray-500">
              Completion: <span className="text-gray-300">{tokenUsage.completionTokens.toLocaleString()}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
