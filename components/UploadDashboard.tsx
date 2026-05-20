'use client'

import { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, X, Loader2, Sparkles, CheckCircle2, ChevronRight, Presentation, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PipelineStep } from "@/lib/pipeline-types";
import { PipelineTimeline } from "./PipelineTimeline";

export function UploadDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<'standard' | 'solving'>('standard');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing'>('idle');
  
  // Pipeline tracking
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [pipelineState, setPipelineState] = useState<{
    status: PipelineStep,
    failed_at_step?: string,
    error_logs?: string
  } | null>(null);

  const router = useRouter();
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast.error("Please upload a valid PDF file.");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  const pollStatus = async (id: string) => {
    const { data, error } = await supabase
      .from('presentations')
      .select('status, failed_at_step, error_logs')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(error);
      return;
    }

    setPipelineState({
      status: data.status as PipelineStep,
      failed_at_step: data.failed_at_step,
      error_logs: data.error_logs
    });
  };

  useEffect(() => {
    if (status === 'processing' && presentationId) {
      if (!pollingInterval.current) {
        pollingInterval.current = setInterval(() => {
          pollStatus(presentationId);
        }, 2000);
      }
    } else {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [status, presentationId]);

  // Stop polling if complete or failed
  useEffect(() => {
    if (pipelineState?.status === PipelineStep.EXPORT_READY || 
        pipelineState?.status === PipelineStep.COMPLETED || 
        pipelineState?.status === PipelineStep.FAILED) {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }
  }, [pipelineState?.status]);

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(filePath);

      // 2. Create Presentation entry
      const createResponse = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pdf_url: publicUrl, 
          title: file.name.replace('.pdf', ''),
          theme: { themeColor: '#8b5cf6', layout: selectedLayout }
        }),
      });

      const presentation = await createResponse.json();
      if (presentation.error) throw new Error(presentation.error);
      
      setPresentationId(presentation.id);
      setPipelineState({ status: PipelineStep.UPLOADED });
      setStatus('processing');

      // 3. Initiate processing
      router.push(`/pipeline/${presentation.id}`);

      toast.success("File uploaded! Redirecting to pipeline...");

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred.");
      setStatus('idle');
    }
  };

  const handleRetry = async (step?: PipelineStep) => {
    if (!presentationId) return;
    setPipelineState(prev => prev ? { ...prev, status: step || PipelineStep.EXTRACTING_TEXT, error_logs: undefined, failed_at_step: undefined } : null);
    
    try {
      fetch(`/api/presentations/${presentationId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceStep: step })
      });
      toast.success("Stage retry initiated");
      // Restart polling
      if (!pollingInterval.current) {
        pollingInterval.current = setInterval(() => {
          pollStatus(presentationId);
        }, 2000);
      }
    } catch (err: any) {
      toast.error(err.message || "Retry failed");
    }
  };

  const isComplete = pipelineState?.status === PipelineStep.EXPORT_READY || pipelineState?.status === PipelineStep.COMPLETED;

  return (
    <div className="w-full py-0">
      <AnimatePresence mode="wait">
        {status === 'idle' ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            {/* Layout Selector */}
            <div className="flex flex-col items-center space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Pick Slide Layout</h4>
              <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
                <button 
                  onClick={() => setSelectedLayout('standard')}
                  className={cn(
                    "relative group p-4 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden",
                    selectedLayout === 'standard' 
                      ? "bg-indigo-600/10 border-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.2)]" 
                      : "bg-zinc-900/40 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                       <Presentation size={16} className={selectedLayout === 'standard' ? "text-indigo-400" : "text-zinc-500"} />
                       <span className={cn("text-xs font-bold uppercase tracking-widest", selectedLayout === 'standard' ? "text-white" : "text-zinc-500")}>Standard</span>
                    </div>
                    <div className="aspect-video bg-zinc-950 rounded-lg border border-white/10 p-2 relative">
                        <div className="w-full h-2 bg-indigo-500/20 rounded-full mb-1" />
                        <div className="w-2/3 h-2 bg-indigo-500/20 rounded-full mb-3" />
                        <div className="grid grid-cols-2 gap-1 mt-auto">
                            <div className="h-2 bg-white/5 rounded" />
                            <div className="h-2 bg-white/5 rounded" />
                            <div className="h-2 bg-white/5 rounded" />
                            <div className="h-2 bg-white/5 rounded" />
                        </div>
                    </div>
                  </div>
                  {selectedLayout === 'standard' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
                </button>

                <button 
                  onClick={() => setSelectedLayout('solving')}
                  className={cn(
                    "relative group p-4 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden",
                    selectedLayout === 'solving' 
                      ? "bg-indigo-600/10 border-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.2)]" 
                      : "bg-zinc-900/40 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                       <Sparkles size={16} className={selectedLayout === 'solving' ? "text-indigo-400" : "text-zinc-500"} />
                       <span className={cn("text-xs font-bold uppercase tracking-widest", selectedLayout === 'solving' ? "text-white" : "text-zinc-500")}>Solving Mode</span>
                    </div>
                    <div className="aspect-video bg-zinc-950 rounded-lg border border-white/10 p-2 relative flex">
                        <div className="w-1/2 h-full border-r border-white/5 border-dashed" />
                        <div className="flex-1 p-1">
                            <div className="w-full h-2 bg-indigo-500/20 rounded-full mb-1" />
                            <div className="w-2/3 h-2 bg-indigo-500/20 rounded-full mb-3" />
                            <div className="grid grid-cols-2 gap-1 mt-auto">
                                <div className="h-2 bg-white/5 rounded" />
                                <div className="h-2 bg-white/5 rounded" />
                                <div className="h-2 bg-white/5 rounded" />
                                <div className="h-2 bg-white/5 rounded" />
                            </div>
                        </div>
                    </div>
                  </div>
                  {selectedLayout === 'solving' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
                </button>
              </div>
            </div>

            <Card className="glass border-dashed bg-zinc-900/10 hover:bg-zinc-900/20 transition-all duration-300 border-white/10 group cursor-pointer overflow-hidden">
              <CardContent className="p-0">
                <div {...getRootProps()} className="w-full flex-1 flex flex-col items-center justify-center py-12 md:py-16 px-6 min-h-[300px]">
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
                    <Upload size={28} />
                  </div>
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 text-white">
                    {isDragActive ? "Drop PDF here" : "Upload Question Paper"}
                  </h3>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-bold mb-8">
                    PDF format only • Max 10MB
                  </p>
                  
                  {!file && (
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium bg-white/[0.02] px-3 py-1.5 rounded-full border border-white/5">
                      <Sparkles size={14} className="text-indigo-500" />
                      <span>Gemini 1.5 Flash</span>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="px-6 pb-10 flex flex-col items-center w-full">
                    <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 px-5 py-3 rounded-2xl mb-8 w-full max-w-xl">
                      <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="text-xs font-bold truncate text-white">{file.name}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-zinc-500 hover:text-white transition-colors p-2">
                        <X size={18} />
                      </button>
                    </div>

                    <Button 
                      size="lg" 
                      className="w-full max-w-xl h-12 text-xs font-bold uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] rounded-xl disabled:opacity-50"
                      disabled={!file}
                      onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                    >
                      Process Presentation <ChevronRight className="ml-2" size={18} />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col py-6 bg-zinc-900/10 border border-white/5 rounded-3xl p-8"
          >
            <div className="mb-8 text-center flex flex-col items-center">
              <h3 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight text-white">
                {status === 'uploading' ? "Securing PDF" : "Processing Pipeline"}
              </h3>
              <p className="text-zinc-500 text-[10px] font-bold max-w-[280px] uppercase tracking-[0.15em] leading-relaxed mx-auto">
                {status === 'uploading' ? "Uploading to storage..." : "Real-time AI stage tracking"}
              </p>
            </div>
            
            <div className="w-full max-w-4xl mx-auto mt-4 mb-4">
               {status === 'uploading' ? (
                 <div className="flex justify-center py-12 text-indigo-500"><Loader2 size={36} className="animate-spin" /></div>
               ) : pipelineState ? (
                 <PipelineTimeline 
                    currentStatus={pipelineState.status} 
                    failedAtStep={pipelineState.failed_at_step}
                    errorLogs={pipelineState.error_logs}
                    onRetry={handleRetry}
                 />
               ) : (
                 <div className="flex justify-center py-12 text-zinc-500"><Loader2 size={36} className="animate-spin" /></div>
               )}
            </div>

            {isComplete && presentationId && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex justify-center">
                <Button 
                  size="lg" 
                  onClick={() => router.push(`/preview/${presentationId}`)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-widest text-xs h-12 px-8 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                >
                  View Generated PPT <ArrowRight size={16} className="ml-2" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
