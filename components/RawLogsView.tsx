'use client'

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, FileText, Cpu, Braces } from "lucide-react";
import { toast } from "sonner";

interface RawLogsViewProps {
  title: string;
  pdfText?: string;
  aiResponse?: string;
}

export function RawLogsView({ title, pdfText, aiResponse }: RawLogsViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const currentText = pdfText;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
          <Button 
            variant='default'
            size="sm" 
            className="bg-indigo-600"
          >
            <FileText size={14} className="mr-2" /> PDF Text
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!currentText}
            className="h-9 border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase gap-2"
            onClick={() => handleCopy(currentText)}
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            Copy
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-8 custom-scrollbar">
        {!currentText ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-4">
             <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                <Braces size={30} />
             </div>
             <p className="text-sm font-bold uppercase tracking-widest">No data available for this stage yet</p>
          </div>
        ) : (
          <pre className="font-mono text-sm leading-relaxed text-zinc-400 whitespace-pre-wrap selection:bg-indigo-500/30">
            {currentText}
          </pre>
        )}
      </div>
    </div>
  );
}
