'use client'

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  AlertCircle, 
  FileText, 
  Cpu, 
  Braces, 
  Presentation, 
  Download,
  LucideIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PipelineStep } from '@/lib/pipeline-types';

interface StepDetail {
  step: PipelineStep;
  label: string;
  icon: LucideIcon;
}

const STEPS: StepDetail[] = [
  { step: PipelineStep.EXTRACTING_TEXT, label: 'PDF Text Extraction', icon: FileText },
  { step: PipelineStep.PROCESSING_AI, label: 'Google AI Processing', icon: Cpu },
  { step: PipelineStep.PPT_GENERATED, label: 'PPT Slide Generation', icon: Presentation },
  { step: PipelineStep.EXPORT_READY, label: 'PPT Export Ready', icon: Download },
];

interface PipelineTimelineProps {
  currentStatus: PipelineStep;
  failedAtStep?: string;
  errorLogs?: string;
  onRetry?: (step: PipelineStep) => void;
}

export function PipelineTimeline({ 
  currentStatus, 
  failedAtStep, 
  errorLogs,
  onRetry 
}: PipelineTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStepStatus = (step: PipelineStep, index: number) => {
    // Order matters here for completion state
    const stepOrder = [
      PipelineStep.EXTRACTING_TEXT,
      PipelineStep.PROCESSING_AI,
      PipelineStep.GENERATING_PPT,
      PipelineStep.PPT_GENERATED,
      PipelineStep.EXPORT_READY
    ];

    const currentOrderIdx = stepOrder.indexOf(currentStatus);
    const stepOrderIdx = stepOrder.indexOf(step);

    if (currentStatus === PipelineStep.FAILED && failedAtStep === step) {
      return 'failed';
    }

    if (currentStatus === step) {
      return 'processing';
    }

    // Special cases for steps combined in the UI
    if (step === PipelineStep.PPT_GENERATED && currentStatus === PipelineStep.GENERATING_PPT) return 'processing';
    
    // Check if step is completed
    if (currentOrderIdx > stepOrderIdx || currentStatus === PipelineStep.COMPLETED || currentStatus === PipelineStep.EXPORT_READY) {
      return 'completed';
    }

    return 'pending';
  };

  return (
    <div className="w-full py-8">
      <div className="relative">
        {/* Connecting Line */}
        <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-white/5 md:left-0 md:right-0 md:top-[22px] md:bottom-auto md:h-0.5 md:w-full" />
        
        <div className="flex flex-col gap-8 md:flex-row md:justify-between relative z-10">
          {STEPS.map((s, idx) => {
            const status = getStepStatus(s.step, idx);
            const StepIcon = s.icon;
            
            return (
              <div key={s.step} className="flex md:flex-col items-center md:text-center group flex-1">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 shrink-0",
                  status === 'completed' && "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]",
                  status === 'processing' && "bg-indigo-500/10 border-indigo-500 text-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]",
                  status === 'failed' && "bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]",
                  status === 'pending' && "bg-zinc-900 border-white/10 text-zinc-600"
                )}>
                  {status === 'completed' && <CheckCircle2 size={24} />}
                  {status === 'processing' && <Loader2 size={24} className="animate-spin" />}
                  {status === 'failed' && <AlertCircle size={24} />}
                  {status === 'pending' && <StepIcon size={24} />}
                </div>
                
                <div className="ml-4 md:ml-0 md:mt-4">
                  <p className={cn(
                    "text-xs font-black uppercase tracking-widest transition-colors",
                    status === 'completed' && "text-emerald-400",
                    status === 'processing' && "text-indigo-400",
                    status === 'failed' && "text-red-400",
                    status === 'pending' && "text-zinc-600"
                  )}>
                    {s.label}
                  </p>
                  
                  {status === 'failed' && onRetry && (
                    <button 
                      onClick={() => onRetry(s.step)}
                      className="mt-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1 mx-auto"
                    >
                      Retry Stage
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {currentStatus === PipelineStep.FAILED && errorLogs && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 p-6 rounded-2xl bg-red-500/5 border border-red-500/10"
        >
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={18} />
              <h4 className="text-xs font-black uppercase tracking-widest text-red-500">Pipeline Execution Failed at {failedAtStep?.replace('_', ' ')}</h4>
            </div>
            <button className="text-red-400 hover:text-red-300">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          <p className={cn("text-xs mt-4 text-red-400/80 font-mono bg-red-950/20 p-4 rounded-xl border border-red-500/10 whitespace-pre-wrap transition-all overflow-hidden", isExpanded ? "" : "line-clamp-2")}>
            {errorLogs}
          </p>
        </motion.div>
      )}
    </div>
  );
}
