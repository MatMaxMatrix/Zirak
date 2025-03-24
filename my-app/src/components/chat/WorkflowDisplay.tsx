import { Circle, CheckCircle2, AlertCircle } from "lucide-react";
import { getAgentColor, renderMessageContent } from "@/lib/chat-utils";
import { WorkflowDisplayProps } from "@/types/chat";

export function WorkflowDisplay({ workflowSteps, workflowEndRef }: WorkflowDisplayProps) {
  if (!workflowSteps || workflowSteps.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500 h-full flex flex-col items-center justify-center">
        <Circle className="h-12 w-12 mb-2 text-gray-400" />
        <p>No workflow steps yet. Start by sending a message.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {workflowSteps.map((step, index) => (
        <div
          key={step.id || index}
          className={`rounded-lg border p-3 ${
            step.status === 'active' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' :
            step.status === 'complete' ? 'border-green-500 bg-green-50 dark:bg-green-950/30' :
            step.status === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950/30' :
            'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
          }`}
        >
          <div className="flex items-start">
            <div className="mr-3 mt-1">
              {step.status === 'active' ? <Circle className="h-5 w-5 text-blue-500" /> :
               step.status === 'complete' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
               step.status === 'error' ? <AlertCircle className="h-5 w-5 text-red-500" /> :
               <Circle className="h-5 w-5 text-yellow-500" />}
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center">
                <span className="font-medium" style={{ color: getAgentColor(step.agent) }}>
                  {step.agent || 'System'}
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
              <div className="text-sm">
                {renderMessageContent(step.message || '')}
              </div>
            </div>
          </div>
        </div>
      ))}
      <div ref={workflowEndRef} />
    </div>
  );
} 