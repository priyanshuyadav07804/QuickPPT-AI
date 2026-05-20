'use client'

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, FileText, Cpu, Presentation, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PipelineStep } from "@/lib/pipeline-types";

// UI states for each step
type StepStatus = 'idle' | 'loading' | 'success' | 'error';

interface PresentationData {
  title: string;
  pdf_url: string;
  raw_pdf_text?: string;
  ai_raw_response?: string;
  questions?: any[];
  pptx_url?: string;
  status: PipelineStep;
  error_logs?: string;
  failed_at_step?: string;
  stats?: any;
}

export function PipelineManager({ presentationId }: { presentationId: string }) {
  const router = useRouter();
  
  const [data, setData] = useState<PresentationData | null>(null);
  
  // Independent step statuses
  const [extractStatus, setExtractStatus] = useState<StepStatus>('idle');
  const [aiStatus, setAiStatus] = useState<StepStatus>('idle');
  const [pptStatus, setPptStatus] = useState<StepStatus>('idle');

  const [chunkProgress, setChunkProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    current: 0,
  });

  const [chunkLogs, setChunkLogs] = useState<string[]>([]);

  // Load initial state
  const loadData = useCallback(async () => {
    try {
      const { data: pres, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', presentationId)
        .single();
        
      if (error) throw error;
      setData(pres);

      // Determine initial states based on DB data
      if (pres.raw_pdf_text) {
        setExtractStatus('success');
      } else if (pres.status === PipelineStep.FAILED && pres.failed_at_step === PipelineStep.EXTRACTING_TEXT) {
        setExtractStatus('error');
      }

      if (pres.questions && pres.questions.length > 0) {
        setAiStatus('success');
      } else if (pres.status === PipelineStep.FAILED && pres.failed_at_step === PipelineStep.PROCESSING_AI) {
        setAiStatus('error');
      }

      if (pres.pptx_url) {
        setPptStatus('success');
      } else if (pres.status === PipelineStep.FAILED && pres.failed_at_step === PipelineStep.GENERATING_PPT) {
        setPptStatus('error');
      }
      
      if (pres.stats && pres.stats.chunks) {
        const chunks = pres.stats.chunks;
        setChunkProgress({
          total: chunks.length,
          completed: chunks.filter((c: any) => c.status === 'success').length,
          failed: chunks.filter((c: any) => c.status === 'failed').length,
          current: 0,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load presentation data');
    }
  }, [presentationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // Actions
  const runExtraction = async () => {
    setExtractStatus('loading');
    setData((prev) => prev ? { ...prev, error_logs: undefined, failed_at_step: undefined } : null);
    try {
      const res = await fetch(`/api/presentations/${presentationId}/extract`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to extract text');
      
      setData((prev) => prev ? { ...prev, raw_pdf_text: json.text } : null);
      setExtractStatus('success');
      
      // Auto trigger next
      runAiGeneration();
    } catch (err: any) {
      toast.error(err.message);
      setExtractStatus('error');
      setData((prev) => prev ? { ...prev, error_logs: err.message, failed_at_step: PipelineStep.EXTRACTING_TEXT } : null);
    }
  };

  const runAiGeneration = async () => {
    setAiStatus('loading');
    setData((prev) => prev ? { ...prev, error_logs: undefined, failed_at_step: undefined } : null);
    setChunkLogs([]);
    
    try {
      // 1. Prepare chunks
      let res = await fetch(`/api/presentations/${presentationId}/prepare-chunks`, { method: 'POST' });
      let json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to prepare chunks');
      
      const totalChunks = json.totalChunks;
      
      // Refetch state to get chunks array
      const { data: pres } = await supabase.from('presentations').select('stats').eq('id', presentationId).single();
      const chunks = pres?.stats?.chunks || [];
      
      setChunkProgress(prev => ({ ...prev, total: totalChunks }));

      let completedCount = chunks.filter((c: any) => c.status === 'success').length;
      let failedCount = 0;

      // 2. Loop through chunks
      for (let i = 0; i < totalChunks; i++) {
        setChunkProgress(prev => ({ ...prev, current: i + 1, completed: completedCount, failed: failedCount }));
        
        // Skip already successful chunks
        if (chunks[i] && chunks[i].status === 'success') {
           continue;
        }

        const chunkRes = await fetch(`/api/presentations/${presentationId}/process-chunk`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chunkIndex: i })
        });
        const chunkJson = await chunkRes.json();
        
        if (!chunkRes.ok) {
           failedCount++;
           setChunkProgress(prev => ({ ...prev, failed: failedCount }));
           setChunkLogs(prev => [...prev, `❌ Chunk ${i + 1}/${totalChunks} failed: ${chunkJson.error}`]);
           // Do NOT throw here, we want to continue with remaining chunks
        } else {
           completedCount++;
           setChunkProgress(prev => ({ ...prev, completed: completedCount }));
           
           if (!chunkJson.message?.includes('Already processed')) {
               const { expectedCount, extractedCount, initialExtractedCount, missingCount, recoveredCount, recoveryLogs, questionRange, modelUsed, fallbackCount } = chunkJson;
               let msg = `✅ Chunk ${i + 1}/${totalChunks}\n`;
               if (questionRange) msg += `${questionRange}\n`;
               
               if (recoveryLogs && recoveryLogs.length > 0) {
                   msg += `\n` + recoveryLogs.join('\n') + `\n\n`;
                   msg += `Chunk ${i + 1} Summary:\n`;
                   msg += `Expected Questions: ${expectedCount}\n`;
                   msg += `Initially Extracted: ${initialExtractedCount}\n`;
                   msg += `Recovered Successfully: ${recoveredCount}\n`;
                   msg += `Final Valid Questions: ${extractedCount}\n`;
                   msg += `Still Missing: ${missingCount}\n`;
               } else {
                   if (expectedCount !== undefined) {
                       msg += `Expected: ${expectedCount}\n`;
                       msg += `Extracted: ${extractedCount}\n`;
                       if (missingCount !== undefined && missingCount !== 0) {
                           msg += `Missing: ${missingCount}\n`;
                       }
                   }
               }
               
               msg += `Model: ${modelUsed || 'gemini-3.1-flash-lite'}\n`;
               if (fallbackCount > 0) {
                   msg += `(Fallback model used)\n`;
               }
               if (missingCount && missingCount > 0) {
                   msg += `\n⚠ ${missingCount} questions were not processed correctly.`;
               }
               
               setChunkLogs(prev => [...prev, msg.trim()]);
           } else {
               setChunkLogs(prev => [...prev, `✅ Chunk ${i + 1}/${totalChunks} already processed (Cached).`]);
           }
        }
      }

      // 3. Merge chunks
      res = await fetch(`/api/presentations/${presentationId}/merge-chunks`, { method: 'POST' });
      json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to merge chunks');
      
      setData((prev) => prev ? { ...prev, questions: json.questions, ai_raw_response: JSON.stringify(json.questions, null, 2) } : null);
      setAiStatus('success');
      
      // Auto trigger next
      runPptGeneration();
    } catch (err: any) {
      toast.error(err.message);
      setAiStatus('error');
      setData((prev) => prev ? { ...prev, error_logs: err.message, failed_at_step: PipelineStep.PROCESSING_AI } : null);
    }
  };

  const runPptGeneration = async () => {
    setPptStatus('loading');
    setData((prev) => prev ? { ...prev, error_logs: undefined, failed_at_step: undefined } : null);
    try {
      const res = await fetch(`/api/presentations/${presentationId}/generate-ppt`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate PPT');
      
      setData((prev) => prev ? { ...prev, pptx_url: json.url } : null);
      setPptStatus('success');
    } catch (err: any) {
      toast.error(err.message);
      setPptStatus('error');
      setData((prev) => prev ? { ...prev, error_logs: err.message, failed_at_step: PipelineStep.GENERATING_PPT } : null);
    }
  };

  // Auto-start and Auto-resume logic
  useEffect(() => {
    if (!data) return;

    // We only want to auto-start if there isn't an error. If there's an error, the user must click Retry.
    if (extractStatus === 'error' || aiStatus === 'error' || pptStatus === 'error') return;

    if (extractStatus === 'idle' && !data.raw_pdf_text) {
      runExtraction();
    } else if (extractStatus === 'success' && aiStatus === 'idle' && (!data.questions || data.questions.length === 0)) {
      runAiGeneration();
    } else if (aiStatus === 'success' && pptStatus === 'idle' && !data.pptx_url) {
      runPptGeneration();
    }
  }, [data, extractStatus, aiStatus, pptStatus]);

  if (!data) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  }

  const allSuccess = extractStatus === 'success' && aiStatus === 'success' && pptStatus === 'success';

  return (
    <div className="space-y-6 pb-24">
      {/* Upload Step */}
      <Card className="bg-[#0a0a0a] border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-300">Step 1: PDF Uploaded</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <FileText className="text-zinc-500" size={20} />
               <div>
                  <p className="text-sm font-bold text-white">{data.title}.pdf</p>
                  <a href={data.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">View original file</a>
               </div>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Success</span>
          </div>
        </CardContent>
      </Card>

      {/* Extract Step */}
      <Card className={cn("bg-[#0a0a0a] border-white/10 relative overflow-hidden transition-all duration-300", extractStatus === 'idle' ? 'opacity-50 grayscale' : 'opacity-100')}>
        <div className={cn(
          "absolute top-0 left-0 w-1 h-full transition-colors",
          extractStatus === 'success' ? "bg-emerald-500" :
          extractStatus === 'loading' ? "bg-indigo-500" :
          extractStatus === 'error' ? "bg-red-500" : "bg-zinc-800"
        )} />
        <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02] flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors",
               extractStatus === 'success' ? "bg-emerald-500/20 text-emerald-400" :
               extractStatus === 'loading' ? "bg-indigo-500/20 text-indigo-400" :
               extractStatus === 'error' ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500"
            )}>
              {extractStatus === 'success' ? <CheckCircle2 size={16} /> :
               extractStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> :
               extractStatus === 'error' ? <AlertCircle size={16} /> : <FileText size={16} />}
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-300">Step 2: Extract Text</CardTitle>
          </div>
          {extractStatus === 'error' && (
            <Button size="sm" variant="outline" onClick={runExtraction} className="h-8 text-xs">Retry</Button>
          )}
        </CardHeader>
        {(extractStatus !== 'idle') && (
          <CardContent className="pt-4">
            {extractStatus === 'loading' && <p className="text-sm text-zinc-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Reading PDF contents...</p>}
            {extractStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                <p className="text-sm text-red-500 font-semibold mb-1">Failed to extract text. Please try again.</p>
                {data.error_logs && data.failed_at_step === PipelineStep.EXTRACTING_TEXT && (
                  <p className="text-xs text-red-400 font-mono break-words whitespace-pre-wrap">{data.error_logs}</p>
                )}
              </div>
            )}
            {data.raw_pdf_text && (
              <div className="mt-2 text-xs font-mono text-zinc-400 bg-black/40 p-3 rounded-lg border border-white/5 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {data.raw_pdf_text.substring(0, 1000)}
                {data.raw_pdf_text.length > 1000 ? '\n\n... (truncated for preview)' : ''}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* AI Generation Step */}
      <Card className={cn("bg-[#0a0a0a] border-white/10 relative overflow-hidden transition-all duration-300", aiStatus === 'idle' ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100')}>
        <div className={cn(
          "absolute top-0 left-0 w-1 h-full transition-colors",
          aiStatus === 'success' ? "bg-emerald-500" :
          aiStatus === 'loading' ? "bg-indigo-500" :
          aiStatus === 'error' ? "bg-red-500" : "bg-zinc-800"
        )} />
        <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02] flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors",
               aiStatus === 'success' ? "bg-emerald-500/20 text-emerald-400" :
               aiStatus === 'loading' ? "bg-indigo-500/20 text-indigo-400" :
               aiStatus === 'error' ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500"
            )}>
              {aiStatus === 'success' ? <CheckCircle2 size={16} /> :
               aiStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> :
               aiStatus === 'error' ? <AlertCircle size={16} /> : <Cpu size={16} />}
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-300">Step 3: Google AI Generation</CardTitle>
          </div>
          {aiStatus === 'error' && (
            <Button size="sm" variant="outline" onClick={runAiGeneration} className="h-8 text-xs">Retry</Button>
          )}
        </CardHeader>
        {(aiStatus !== 'idle') && (
          <CardContent className="pt-4">
            {aiStatus === 'loading' && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500 flex items-center gap-2 mb-2">
                  <Loader2 size={14} className="animate-spin"/> Analyzing text with Gemini...
                </p>
                {chunkProgress.total > 0 && (
                  <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
                      <span>Chunk Progress</span>
                      <span className="text-indigo-400">{chunkProgress.completed} / {chunkProgress.total}</span>
                    </div>
                    
                    <div className="relative h-2 w-full bg-zinc-800 rounded-full overflow-hidden mb-3">
                      <div 
                        className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${(chunkProgress.completed / chunkProgress.total) * 100}%` }}
                      />
                    </div>

                    <div className="flex gap-4 text-xs font-mono text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                        Processing Chunk {chunkProgress.current}
                      </div>
                      {chunkProgress.failed > 0 && (
                        <div className="flex items-center gap-1.5 text-red-400">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {chunkProgress.failed} Failed
                        </div>
                      )}
                    </div>                   
                  </div>
                )}
              </div>
            )}
            
            {chunkLogs.length > 0 && (
              <div className="mt-4 bg-black/40 border border-white/5 rounded-xl p-3 overflow-y-auto max-h-48 text-xs font-mono text-zinc-400 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
                {chunkLogs.map((log, idx) => (
                  <div key={idx} className={cn("flex items-start gap-2 whitespace-pre-wrap", log.includes("failed") || log.includes("⚠") || log.includes("❌") ? "text-red-400" : "text-emerald-400/80")}>
                    <span className="opacity-50 select-none mt-px">»</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}

            {aiStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg mt-4">
                <p className="text-sm text-red-500 font-semibold mb-1">AI processing failed. Retrying might fix transient errors.</p>
                {data.error_logs && data.failed_at_step === PipelineStep.PROCESSING_AI && (
                  <p className="text-xs text-red-400 font-mono break-words whitespace-pre-wrap">{data.error_logs}</p>
                )}
                {chunkProgress.failed > 0 && (
                  <p className="text-xs text-red-400 font-mono mt-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {chunkProgress.failed} out of {chunkProgress.total} chunks failed. Click retry to resume.
                  </p>
                )}
              </div>
            )}
            {data.questions && data.questions.length > 0 && (
              <div className="mt-2 text-xs font-mono text-zinc-400 bg-black/40 p-3 rounded-lg border border-white/5 max-h-48 overflow-y-auto">
                 <p className="text-emerald-400 mb-2 font-sans font-bold">
                    Successfully generated {data.questions.length} slides.
                 </p>
                 <pre>{JSON.stringify(data.questions[0], null, 2)}</pre>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* PPT Generation Step */}
      <Card className={cn("bg-[#0a0a0a] border-white/10 relative overflow-hidden transition-all duration-300", pptStatus === 'idle' ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100')}>
        <div className={cn(
          "absolute top-0 left-0 w-1 h-full transition-colors",
          pptStatus === 'success' ? "bg-emerald-500" :
          pptStatus === 'loading' ? "bg-indigo-500" :
          pptStatus === 'error' ? "bg-red-500" : "bg-zinc-800"
        )} />
        <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02] flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors",
               pptStatus === 'success' ? "bg-emerald-500/20 text-emerald-400" :
               pptStatus === 'loading' ? "bg-indigo-500/20 text-indigo-400" :
               pptStatus === 'error' ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500"
            )}>
              {pptStatus === 'success' ? <CheckCircle2 size={16} /> :
               pptStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> :
               pptStatus === 'error' ? <AlertCircle size={16} /> : <Presentation size={16} />}
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-300">Step 4: Presentation Generation</CardTitle>
          </div>
          {pptStatus === 'error' && (
            <Button size="sm" variant="outline" onClick={runPptGeneration} className="h-8 text-xs">Retry</Button>
          )}
        </CardHeader>
        {(pptStatus !== 'idle') && (
          <CardContent className="pt-4">
            {pptStatus === 'loading' && <p className="text-sm text-zinc-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Building PPTX file...</p>}
            {pptStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                <p className="text-sm text-red-500 font-semibold mb-1">Failed to generate PPTX. Please try again.</p>
                {data.error_logs && data.failed_at_step === PipelineStep.GENERATING_PPT && (
                  <p className="text-xs text-red-400 font-mono break-words whitespace-pre-wrap">{data.error_logs}</p>
                )}
              </div>
            )}
            {data.pptx_url && (
              <p className="text-sm text-zinc-400 mt-2">File generated and securely saved.</p>
            )}
          </CardContent>
        )}
      </Card>


      {/* Step 5: Navigation */}
      <div className="pt-6 flex justify-end">
         <Button 
            size="lg"
            disabled={!allSuccess}
            onClick={() => router.push(`/preview/${presentationId}`)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-widest text-xs h-14 px-10 rounded-xl disabled:opacity-50 transition-all shadow-[0_0_30px_rgba(79,70,229,0.2)]"
         >
            Go To Preview <ArrowRight size={18} className="ml-2" />
         </Button>
      </div>

    </div>
  );
}
