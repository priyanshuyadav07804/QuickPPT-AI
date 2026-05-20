'use client'

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { FileText, Download, Eye, Clock, Trash2, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';
import { DeleteConfirmation } from './DeleteConfirmation';

interface Presentation {
  id: string;
  title: string;
  pdf_url: string;
  pptx_url?: string;
  status: string;
  created_at: string;
  error_logs?: string;
  failed_at_step?: string;
  stats?: {
    totalQuestions: number;
    processingTime: string;
  };
}

export function PresentationHistory() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresentations(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/presentations/${deleteId}`, { method: 'DELETE' });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      
      setPresentations(prev => prev.filter(p => p.id !== deleteId));
      toast.success("Presentation deleted permanently");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 w-full bg-zinc-900/40 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (presentations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Recent Uploads</h2>
        <Badge variant="outline" className="bg-indigo-500/5 border-indigo-500/20 text-indigo-400 text-[10px] h-5 font-bold">{presentations.length} Total</Badge>
      </div>

      <div className="grid gap-4">
        {presentations.map((pres) => (
          <div key={pres.id} className="group relative bg-zinc-900/10 hover:bg-zinc-900/20 rounded-2xl p-5 transition-all duration-300 hover:glow-indigo border border-white/5 hover:border-indigo-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all shrink-0 shadow-lg">
                <PresentationIcon status={pres.status} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm md:text-base font-bold text-white group-hover:text-indigo-100 transition-colors break-words line-clamp-2 leading-tight">
                    {pres.title}
                  </h3>
                  <StatusBadge status={pres.status} />
                </div>
                
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Clock size={14} className="text-zinc-600" />
                    {format(new Date(pres.created_at), 'MMM dd, yyyy • HH:mm')}
                  </span>
                  {pres.stats?.totalQuestions && (
                    <span className="flex items-center gap-2">
                      <FileText size={14} className="text-zinc-600" />
                      {pres.stats.totalQuestions} Questions
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/[0.03] flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Link href={`/pipeline/${pres.id}`} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full h-9 text-[10px] font-black uppercase tracking-[0.1em] bg-white/[0.03] border border-white/5 hover:bg-white/10 text-white rounded-xl gap-2 transition-all">
                    <RefreshCw size={14} /> Pipeline
                  </Button>
                </Link>
                <Link href={`/preview/${pres.id}`} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full h-9 text-[10px] font-black uppercase tracking-[0.1em] bg-white/[0.03] border border-white/5 hover:bg-white/10 text-white rounded-xl gap-2 transition-all" disabled={pres.status !== 'export_ready' && pres.status !== 'completed'}>
                    <Eye size={14} /> Preview
                  </Button>
                </Link>
                {pres.pptx_url && (
                  <Button 
                    size="sm" 
                    className="flex-1 h-9 text-[10px] font-black uppercase tracking-[0.1em] bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_4px_15px_rgba(79,70,229,0.3)] rounded-xl gap-2 transition-all"
                    onClick={() => window.open(pres.pptx_url, '_blank')}
                  >
                    <Download size={14} /> PPTX
                  </Button>
                )}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-9 w-9 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl shrink-0 transition-colors"
                  onClick={() => setDeleteId(pres.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              {pres.status === 'failed' && pres.error_logs && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Error at {pres.failed_at_step?.replace('_', ' ') || 'unknown step'}</p>
                  <p className="text-xs text-red-400 font-mono break-words line-clamp-3">{pres.error_logs}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmation 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}

function PresentationIcon({ status }: { status: string }) {
  if (status === 'completed') return <Presentation size={18} />;
  if (status === 'failed') return <FileText size={18} className="text-red-400" />;
  return <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />;
}

function Presentation({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    failed: 'text-red-400 bg-red-400/10 border-red-400/20',
    processing: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    reading_pdf: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    extracting_questions: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    generating_ppt: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-tighter shrink-0 ${colors[status] || 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
