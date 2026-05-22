'use client'

import { useState, useEffect, useRef, useCallback } from "react";
import { Container } from "@/components/Container";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, 
  Copy, 
  FileDown, 
  CheckCircle2, 
  ListChecks, 
  Presentation, 
  Layout, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Info,
  Braces,
  Terminal,
  RefreshCw,
  Eye,
  Settings2,
  AlertCircle,
  Play,
  Languages,
  Type,
  ChevronDown
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Question } from "@/lib/gemini";
import { useRouter } from "next/navigation";
import { SlideRenderer } from "./SlideRenderer";
import { cn } from "@/lib/utils";
import { RenderedSlide, getRenderedSlides } from "@/lib/slide-utils";
import { JsonView } from "./JsonView";
import { DownloadModal } from "./ppt/DownloadModal";
import { PipelineStep } from "@/lib/pipeline-types";
import { RawLogsView } from "./RawLogsView";
import { LanguageMode } from "@/lib/ppt/types";

interface PresentationData {
  id: string;
  title: string;
  questions: Question[];
  pptx_url: string;
  status: PipelineStep;
  raw_pdf_text?: string;
  ai_raw_response?: string;
  failed_at_step?: string;
  error_logs?: string;
  last_successful_step?: string;
  stats: {
    totalQuestions: number;
    processingTime: string;
  };
  theme: {
    themeColor: string;
    layout?: 'standard' | 'solving';
  };
}

export function PreviewView({ id }: { id: string }) {
  const [data, setData] = useState<PresentationData | null>(null);
  const [slides, setSlides] = useState<RenderedSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'slides' | 'json' | 'debug'>('slides');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('both');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchPresentation = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data: record, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error(error);
      }
    } else {
      setData(record as PresentationData);
      if (record.questions && record.questions.length > 0) {
        const rendered = getRenderedSlides(record.title, record.questions);
        setSlides(rendered);
      }
    }
    setLoading(false);
  }, [id, activeTab]);

  // Polling for processing status
  useEffect(() => {
    if (data?.status && data.status !== PipelineStep.EXPORT_READY && data.status !== PipelineStep.COMPLETED && data.status !== PipelineStep.FAILED) {
      if (!pollingInterval.current) {
        pollingInterval.current = setInterval(() => {
          fetchPresentation(false);
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
  }, [data?.status, fetchPresentation]);

  useEffect(() => {
    fetchPresentation();
  }, [fetchPresentation]);

  const handleLayoutChange = async (layout: 'standard' | 'solving') => {
    if (!data) return;
    setIsProcessing(true);
    
    // Optimistic UI update to ensure instant preview
    setData(prev => prev ? { ...prev, theme: { ...prev.theme, layout } } : null);
    
    try {
      const response = await fetch(`/api/presentations/${id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout })
      });
      if (!response.ok) throw new Error("Regeneration failed");
      
      const result = await response.json();
      // Result is the updated presentation record
      setData(result);
    } catch (err: any) {
      toast.error(err.message);
      // Revert on error
      fetchPresentation(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresent = () => {
    setIsPresenting(true);
    if (containerRef.current && !document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setIsPresenting(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'slides') return;
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) {
        setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        setCurrentSlide(prev => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Navbar />
        <Container className="py-20 space-y-12">
            <Skeleton className="h-12 w-1/3 bg-white/5" />
            <div className="grid grid-cols-4 gap-6">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-white/5 rounded-2xl" />)}
            </div>
            <Skeleton className="h-[400px] w-full bg-white/5 rounded-3xl" />
        </Container>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen bg-[#050505] text-[#f0f0f0]">
        <Navbar />
        <Container className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-700 mb-6 border border-white/5 mx-auto">
                <AlertCircle size={28} />
            </div>
            <h2 className="text-xl font-bold mb-2">Presentation Not Found</h2>
            <p className="text-sm text-zinc-500 mb-8 max-w-sm mx-auto">
                The presentation you are looking for doesn't exist or has been deleted.
            </p>
            <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="rounded-xl border-white/10 h-10 px-6 font-bold uppercase text-xs tracking-widest text-white hover:bg-white/5 bg-transparent"
            >
                Go to Dashboard
            </Button>
        </Container>
      </div>
    );
  }

  const isComplete = data.status === PipelineStep.EXPORT_READY || data.status === PipelineStep.COMPLETED;
  const totalSlides = slides.length;

  return (
    <div className="flex h-screen flex-col bg-[#050505] text-[#f0f0f0] overflow-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Sidebar Nav */}
        {/* Overlay backdrop for mobile when open */}
        {isSidebarOpen && (
            <div 
                className="fixed md:hidden inset-0 bg-black/60 z-30 backdrop-blur-sm transition-opacity" 
                onClick={() => setIsSidebarOpen(false)} 
            />
        )}
        <aside className={cn(
          "flex flex-col z-40 shrink-0 glass border-r border-white/5 transition-all duration-300 ease-in-out absolute md:relative h-full bg-[#080808]/95 overflow-hidden",
          isSidebarOpen ? "w-[240px] md:w-56 lg:w-[260px] translate-x-0 shadow-2xl md:shadow-none" : "w-0 -translate-x-full pointer-events-none"
        )}>
            <div className="p-4 border-b border-white/5 space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Terminal size={14} className="text-indigo-400" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Preview Tools</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                    <Button 
                        variant={activeTab === 'slides' ? 'default' : 'ghost'} 
                        size="sm"
                        disabled={!isComplete}
                        className={cn(
                            "justify-start text-[10px] uppercase tracking-widest font-bold h-10 rounded-xl px-4",
                            activeTab === 'slides' ? "bg-indigo-600 shadow-lg shadow-indigo-500/20" : "text-zinc-500"
                        )}
                        onClick={() => setActiveTab('slides')}
                    >
                        <Presentation size={14} className="mr-3" />
                        PPT Preview
                    </Button>
                    <Button 
                        variant={activeTab === 'debug' ? 'default' : 'ghost'} 
                        size="sm"
                        disabled={!data.raw_pdf_text}
                        className={cn(
                            "justify-start text-[10px] uppercase tracking-widest font-bold h-10 rounded-xl px-4",
                            activeTab === 'debug' ? "bg-indigo-600" : "text-zinc-500"
                        )}
                        onClick={() => setActiveTab('debug')}
                    >
                        <Terminal size={14} className="mr-3" />
                        Debug Logs
                    </Button>
                    <Button 
                        variant={activeTab === 'json' ? 'default' : 'ghost'} 
                        size="sm"
                        disabled={!data.questions || data.questions.length === 0}
                        className={cn(
                            "justify-start text-[10px] uppercase tracking-widest font-bold h-10 rounded-xl px-4",
                            activeTab === 'json' ? "bg-indigo-600" : "text-zinc-500"
                        )}
                        onClick={() => setActiveTab('json')}
                    >
                        <Braces size={14} className="mr-3" />
                        Question JSON
                    </Button>
                </div>
            </div>

            {activeTab === 'slides' && isComplete && (
               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  <div className="px-2 mb-2 flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-zinc-500">Thumbnail Preview</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">{totalSlides}</Badge>
                  </div>
                  {slides.map((slide, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={cn(
                            "w-full rounded-xl overflow-hidden border-2 transition-all group",
                            currentSlide === i ? "border-indigo-500 scale-[1.02] shadow-xl" : "border-white/5 opacity-50 hover:opacity-100"
                        )}
                    >
                        <div className="aspect-video relative bg-zinc-900">
                             <div className="absolute inset-0 origin-top-left scale-[0.25]" style={{ width: '400%', height: '400%' }}>
                                <SlideRenderer 
                                    slide={slide} 
                                    themeColor={data.theme.themeColor} 
                                    title={data.title}
                                    layout={data.theme.layout}
                                    languageMode={languageMode}
                                />
                             </div>
                        </div>
                        <div className="px-3 py-1.5 bg-black/40 flex justify-between items-center text-[9px] font-bold text-zinc-500">
                            <span>{i + 1}</span>
                            <span className="uppercase text-[8px]">{slide.type}</span>
                        </div>
                    </button>
                  ))}
               </div>
            )}
        </aside>

        {/* Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950 relative" ref={containerRef}>
            {/* Header Toolbar */}
            {!isPresenting && (
                <div className="p-2 md:p-3 border-b border-white/5 bg-[#080808]/95 backdrop-blur-sm flex items-center justify-between gap-1.5 md:gap-4 shrink-0 px-2 md:px-6 z-50 sticky top-0 w-full overflow-visible">
                    <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                        <Button variant="ghost" size="icon" className="flex h-8 w-8 text-zinc-400 shrink-0" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Layers size={16} />
                        </Button>
                        <div className="hidden md:block h-4 w-px bg-white/10 shrink-0" />
                        <div className="relative group flex items-center min-w-0">
                            <h2 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400 truncate max-w-[80px] sm:max-w-[120px] lg:max-w-[200px] cursor-default">
                                {data.title}
                            </h2>
                            <div className="absolute top-full left-0 mt-2 p-2 bg-zinc-900 border border-white/10 rounded shadow-xl text-xs text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-nowrap pointer-events-none">
                                {data.title}
                            </div>
                        </div>
                    </div>

                    {activeTab === 'slides' && (
                        <div className="flex items-center justify-center gap-1.5 md:gap-4 shrink-0">
                            <div className="flex bg-[#121212] p-1 border border-white/5 rounded-lg">
                                <Button
                                    variant={(data.theme?.layout || 'standard') === 'standard' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    disabled={isProcessing}
                                    onClick={() => handleLayoutChange('standard')}
                                    className={cn("h-7 px-2 md:px-4 transition-all duration-200 flex items-center justify-center gap-2", 
                                      (data.theme?.layout || 'standard') === 'standard' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                                    title="Standard Layout"
                                >
                                    <Layout size={14} />
                                    <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest">Standard</span>
                                </Button>
                                <Button
                                    variant={data.theme?.layout === 'solving' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    disabled={isProcessing}
                                    onClick={() => handleLayoutChange('solving')}
                                    className={cn("h-7 px-2 md:px-4 transition-all duration-200 flex items-center justify-center gap-2", 
                                      data.theme?.layout === 'solving' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                                    title="Solving Layout"
                                >
                                    <Layers size={14} />
                                    <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest">Solving</span>
                                </Button>
                            </div>

                            <div className="flex relative items-center">
                                <div 
                                    className="bg-[#121212] border border-white/5 rounded-lg h-7 md:h-9 flex items-center px-1.5 md:px-3 cursor-pointer select-none"
                                    onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                >
                                    <Languages size={14} className="text-zinc-400 md:mr-2" />
                                    <span className="hidden md:flex text-[10px] items-center font-bold uppercase tracking-widest text-zinc-300 md:mr-4">
                                        {languageMode === 'both' ? 'EN + HI' : languageMode === 'english' ? 'English Only' : 'Hindi Only'}
                                    </span>
                                    <ChevronDown size={14} className={cn("hidden md:block text-zinc-500 transition-transform", isLangDropdownOpen && "rotate-180")} />
                                </div>

                                {isLangDropdownOpen && (
                                    <div className="fixed inset-0 z-40" onClick={() => setIsLangDropdownOpen(false)} />
                                )}

                                <div className={cn(
                                    "absolute top-full left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-0 mt-1 w-32 md:w-36 bg-[#121212] border border-white/5 rounded-lg shadow-xl transition-all z-50 flex flex-col p-1",
                                    isLangDropdownOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2 pointer-events-none"
                                )}>
                                    <button onClick={() => { setLanguageMode('both'); setIsLangDropdownOpen(false); }} className={cn("text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md", languageMode === 'both' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200')}>EN + HI</button>
                                    <button onClick={() => { setLanguageMode('english'); setIsLangDropdownOpen(false); }} className={cn("text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md", languageMode === 'english' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200')}>English Only</button>
                                    <button onClick={() => { setLanguageMode('hindi'); setIsLangDropdownOpen(false); }} className={cn("text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md", languageMode === 'hindi' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200')}>Hindi Only</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-1 md:gap-3 shrink-0">
                        {activeTab === 'slides' && (
                            <>
                                <div className="flex items-center bg-white/[0.03] rounded-full border border-white/10 px-1.5 sm:px-3 h-7 sm:h-8 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={() => setZoom(z => Math.max(0.2, z-0.1))}><ZoomOut size={12}/></Button>
                                    <span className="text-[9px] sm:text-[10px] font-bold w-8 sm:w-12 text-center">{Math.round(zoom*100)}%</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={() => setZoom(z => Math.min(2, z+0.1))}><ZoomIn size={12}/></Button>
                                </div>
                                <Button 
                                    onClick={handlePresent}
                                    size="icon" 
                                    className="bg-zinc-800 hover:bg-zinc-700 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-white/5"
                                    title="Present Fullscreen"
                                >
                                    <Play size={14} className="ml-0.5" />
                                </Button>
                                <Button 
                                    onClick={() => setIsDownloadModalOpen(true)}
                                    size="icon" 
                                    className="bg-indigo-600 hover:bg-indigo-700 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20"
                                    title="Download Presentation"
                                >
                                    <FileDown size={14} />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className={cn("flex-1 overflow-auto custom-scrollbar flex flex-col origin-top", isPresenting ? "p-0" : "p-2 md:p-12")}>
                <AnimatePresence mode="wait">
                    {activeTab === 'slides' && !isComplete && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 mb-6">
                                <AlertCircle size={32} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Generation Failed</h2>
                            <p className="text-zinc-500 text-sm mb-8">This presentation did not complete successfully. You can view the extracted data in the debug tabs, or return to the dashboard to try again.</p>
                            <Button variant="outline" onClick={() => router.push('/')}>Return Home</Button>
                        </motion.div>
                    )}

                    {activeTab === 'debug' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full max-w-6xl mx-auto">
                            <RawLogsView title={data.title} pdfText={data.raw_pdf_text} aiResponse={data.ai_raw_response} />
                        </motion.div>
                    )}

                    {activeTab === 'json' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full max-w-6xl mx-auto">
                            <JsonView data={data.questions} title={data.title} />
                        </motion.div>
                    )}

                    {activeTab === 'slides' && isComplete && (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={cn("h-full flex items-center justify-center", isPresenting ? "p-0" : "p-2 md:p-8")}>
                             <div className={cn("relative w-full h-full flex items-center justify-center", isPresenting ? "max-w-none" : "max-w-5xl")}>
                                 <div 
                                    className="relative transition-all duration-300 shadow-2xl" 
                                    style={{ 
                                        width: '100%', 
                                        aspectRatio: '16/9', 
                                        transform: isPresenting ? 'none' : `scale(${zoom})`,
                                        maxWidth: isPresenting ? '177.78vh' : (zoom === 1 ? 'min(100%, calc((100vh - 12rem) * 16 / 9))' : 'none'),
                                        maxHeight: isPresenting ? '100vh' : 'none'
                                    }}
                                 >
                                    <SlideRenderer 
                                        slide={slides[currentSlide]} 
                                        themeColor={data.theme.themeColor} 
                                        title={data.title}
                                        layout={data.theme.layout}
                                        languageMode={languageMode}
                                    />
                                    
                                     <div className={cn("absolute inset-y-0 -left-2 sm:-left-4 md:-left-6 flex items-center", isPresenting && "left-4 opacity-0 hover:opacity-100 transition-opacity")}>
                                        <Button 
                                            variant="ghost" size="icon" 
                                            disabled={currentSlide === 0} 
                                            onClick={() => setCurrentSlide(currentSlide - 1)}
                                            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/5"
                                        >
                                            <ChevronLeft size={24}/>
                                        </Button>
                                    </div>
                                    <div className={cn("absolute inset-y-0 -right-2 sm:-right-4 md:-right-6 flex items-center", isPresenting && "right-4 opacity-0 hover:opacity-100 transition-opacity")}>
                                        <Button 
                                            variant="ghost" size="icon" 
                                            disabled={currentSlide === totalSlides - 1} 
                                            onClick={() => setCurrentSlide(currentSlide + 1)}
                                            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/5"
                                        >
                                            <ChevronRight size={24}/>
                                        </Button>
                                    </div>
                                    
                                    {isPresenting && (
                                        <div className="absolute top-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" size="icon" 
                                                onClick={() => {
                                                    document.exitFullscreen().catch(console.error);
                                                }}
                                                className="h-10 w-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/5"
                                            >
                                                <Minimize2 size={20}/>
                                            </Button>
                                        </div>
                                    )}
                                    {isPresenting && (
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/5 text-[10px] uppercase font-bold tracking-widest opacity-0 hover:opacity-100 transition-opacity flex items-center gap-4">
                                            <span>Slide {currentSlide + 1} of {totalSlides}</span>
                                        </div>
                                    )}
                                 </div>
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Mobile Bottom Thumbnails Carousel */}
            {!isPresenting && activeTab === 'slides' && isComplete && (
                <>
                <div className="md:hidden h-24 border-t border-white/5 bg-[#080808]/95 backdrop-blur-sm shrink-0 flex items-center px-4 gap-3 overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {slides.map((slide, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={cn(
                            "w-24 shrink-0 rounded-lg overflow-hidden border-2 transition-all relative flex flex-col",
                            currentSlide === i ? "border-indigo-500 scale-[1.05]" : "border-white/5 opacity-50"
                        )}
                    >
                        <div className="aspect-video relative bg-zinc-900 w-full overflow-hidden">
                             <div className="absolute inset-0 origin-top-left scale-[0.25]" style={{ width: '400%', height: '400%' }}>
                                <SlideRenderer 
                                    slide={slide} 
                                    themeColor={data.theme.themeColor} 
                                    title={data.title}
                                    layout={data.theme.layout}
                                    languageMode={languageMode}
                                />
                             </div>
                        </div>
                        <div className="px-1 py-0.5 bg-black/60 absolute bottom-0 left-0 right-0 flex justify-between items-center text-[8px] font-bold text-zinc-400">
                            <span>{i + 1}</span>
                        </div>
                    </button>
                  ))}
                </div>
                </>
            )}
        </div>

        <DownloadModal 
            isOpen={isDownloadModalOpen}
            onClose={() => setIsDownloadModalOpen(false)}
            defaultTitle={data.title}
            presentationId={id}
            languageMode={languageMode}
        />
      </main>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
}
