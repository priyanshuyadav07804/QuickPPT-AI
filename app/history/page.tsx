'use client'

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Container } from "@/components/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckSquare, Square, FileText, Search, Download, Trash2, Eye, Clock, ChevronLeft, ChevronRight, Filter, RefreshCw, MoreVertical, Calendar, CheckSquare2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import Link from "next/link";
import { DeleteConfirmation } from "@/components/DeleteConfirmation";
import { cn } from "@/lib/utils";

interface UploadRecord {
  id: string;
  pdf_name: string;
  pdf_url: string;
  ppt_url: string;
  exam_name: string;
  extracted_json: any;
  total_questions: number;
  created_at: string;
  pipeline_status?: string;
  failed_at_step?: string;
  error_logs?: string;
}

export default function HistoryPage() {
  const [data, setData] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/history?search=${encodeURIComponent(search)}&sort=${sort}&page=${page}`);
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      setData(result.data);
      setTotalPages(Math.ceil(result.total / result.limit));
      setTotalCount(result.total);
    } catch (err: any) {
      toast.error(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [search, sort, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleConfirmDelete = async () => {
    if (!deleteId && deleteIds.length === 0) return;
    setIsDeleting(true);
    try {
      let query = '';
      if (deleteIds.length > 0) {
        query = `?ids=${deleteIds.join(',')}`;
      } else if (deleteId) {
        query = `?id=${deleteId}`;
      }
      
      const resp = await fetch(`/api/history${query}`, { method: 'DELETE' });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      toast.success(deleteIds.length > 0 ? `${deleteIds.length} presentations and files deleted permanently` : "Presentation and all files deleted permanently");
      
      if (deleteIds.length > 0) {
        setSelectedIds(new Set());
      }
      
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || "Deletion failed");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
      setDeleteIds([]);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(item => item.id)));
    }
  };

  const handleRegenerate = async (id: string) => {
    toast.promise(
      (async () => {
        const resp = await fetch(`/api/presentations/${id}/process`, { method: 'POST' });
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        
        fetchHistory();
        return data;
      })(),
      {
        loading: 'Regenerating presentation...',
        success: 'Regeneration complete!',
        error: (err) => `Failed: ${err.message}`,
      }
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#050505]">
      <Navbar />
      <main className="flex-1 py-8">
        <Container>
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Legacy History</h1>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.1em]">Manage and review your previous generations</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={toggleSelectAll}
                className="rounded-xl h-10 px-4 font-bold uppercase text-xs tracking-widest border-white/10 hover:bg-white/5 flex items-center gap-2 text-white bg-transparent"
                disabled={data.length === 0}
              >
                {selectedIds.size === data.length && data.length > 0 ? (
                  <><CheckSquare size={16} /> Deselect All</>
                ) : (
                  <><Square size={16} /> Select All</>
                )}
              </Button>
              <form onSubmit={handleSearch} className="relative group flex-1 md:flex-none">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full md:w-64 pl-10 pr-4 bg-zinc-900/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all text-sm font-medium text-white placeholder:text-zinc-500"
                />
              </form>
              <select 
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-10 px-4 bg-zinc-900/40 border border-white/10 rounded-xl focus:outline-none text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-zinc-900/60 transition-colors text-white"
              >
                <option value="latest" className="bg-[#0a0a0a] text-white">Latest</option>
                <option value="oldest" className="bg-[#0a0a0a] text-white">Oldest</option>
              </select>
            </div>
          </header>

          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 w-full bg-zinc-900/20 rounded-2xl animate-pulse border border-white-[0.03]" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-700 mb-6 border border-white/5">
                <Clock size={28} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">No history found</h2>
              <p className="text-sm text-zinc-500 mb-8 max-w-sm">You haven&apos;t generated any presentations yet.</p>
              <Link href="/dashboard">
                <Button variant="outline" className="rounded-xl border-white/10 h-10 px-6 font-bold uppercase text-xs tracking-widest text-white hover:bg-white/5 bg-transparent">Go to Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {data.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card 
                      className={cn(
                        "bg-[#0a0a0a] border hover:border-white/10 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl group relative overflow-hidden",
                        selectedIds.has(item.id) ? "border-indigo-500/50 bg-indigo-500/5" : "border-white/[0.03]"
                      )}
                    >
                      <button 
                        onClick={() => toggleSelection(item.id)}
                        className="absolute top-4 right-4 z-10 text-zinc-500 hover:text-indigo-400 transition-colors"
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare className="text-indigo-500" size={20} />
                        ) : (
                          <Square size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <div className="flex items-start gap-4 mb-4 pr-6">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform flex-shrink-0">
                          <FileText size={18} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white mb-1.5 break-words line-clamp-1 group-hover:text-indigo-100 transition-colors">
                            {item.exam_name || item.pdf_name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-zinc-600" /> 
                              {formatDate(item.created_at)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <RefreshCw size={12} className="text-zinc-600" /> 
                              {item.total_questions} Questions
                            </span>
                            {item.pipeline_status && (
                              <span className={cn(
                                "px-2 py-0.5 rounded-full border",
                                item.pipeline_status === 'export_ready' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                item.pipeline_status === 'failed' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                              )}>
                                {item.pipeline_status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/pipeline/${item.id}`} className="flex-1">
                          <Button variant="secondary" size="sm" className="w-full rounded-lg h-8 text-[10px] bg-white/5 border border-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest gap-1.5">
                            <RefreshCw size={14} /> Pipeline
                          </Button>
                        </Link>
                        <Link href={`/preview/${item.id}`} className="flex-1">
                          <Button variant="secondary" size="sm" className="w-full rounded-lg h-8 text-[10px] bg-white/5 border border-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest gap-1.5" disabled={item.pipeline_status !== 'export_ready' && item.pipeline_status !== 'completed'}>
                            <Eye size={14} /> Preview
                          </Button>
                        </Link>
                        {item.ppt_url && (
                          <a href={item.ppt_url} download target="_blank" rel="noreferrer" className="flex-1 max-w-[80px]">
                            <Button size="sm" className="w-full rounded-lg h-8 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest shadow-lg gap-1.5">
                              <Download size={14} /> PPT
                            </Button>
                          </a>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setDeleteId(item.id)}
                          className="w-8 h-8 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      {item.pipeline_status === 'failed' && item.error_logs && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Error at {item.failed_at_step?.replace('_', ' ') || 'unknown step'}</p>
                          <p className="text-xs text-red-400 font-mono break-words line-clamp-3">{item.error_logs}</p>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <DeleteConfirmation 
            isOpen={!!deleteId || deleteIds.length > 0}
            onClose={() => { setDeleteId(null); setDeleteIds([]); }}
            onConfirm={handleConfirmDelete}
            isLoading={isDeleting}
            title={deleteIds.length > 0 ? "Delete Presentations?" : undefined}
            description={deleteIds.length > 0 ? `Are you sure you want to delete ${deleteIds.length} selected history records? This action cannot be undone.` : undefined}
          />

          {/* Pagination */}
          {!loading && data.length > 0 && (
            <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Showing {data.length} of {totalCount} Records
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded-xl h-10 w-10 p-0 border-white/10 text-white hover:text-white hover:bg-white/5 bg-transparent"
                >
                  <ChevronLeft size={16} />
                </Button>
                <div className="flex items-center px-4 text-sm font-bold bg-zinc-900/50 rounded-xl border border-white/5 text-white">
                  Page {page} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-xl h-10 w-10 p-0 border-white/10 text-white hover:text-white hover:bg-white/5 bg-transparent"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 50, x: '-50%' }}
                className="fixed bottom-8 left-1/2 z-50 flex items-center gap-4 bg-[#121212] border border-white/10 p-4 rounded-full shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                    {selectedIds.size}
                  </div>
                  <span className="text-white font-medium text-sm pr-2">Presentations Selected</span>
                </div>
                
                <div className="w-px h-8 bg-white/10" />
                
                <div className="flex items-center gap-2 pl-2">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-full h-10 px-4 text-zinc-400 hover:text-white hover:bg-white/5 font-bold uppercase text-xs tracking-widest gap-2 bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteIds(Array.from(selectedIds))}
                    className="rounded-full h-10 px-6 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs tracking-widest shadow-lg shadow-red-500/20 flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Delete Selected
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </main>
    </div>
  );
}
