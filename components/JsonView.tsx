'use client'

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, Braces, Minimize2, Maximize2 } from "lucide-react";
import { toast } from "sonner";

interface JsonViewProps {
  data: any;
  title: string;
}

export function JsonView({ data, title }: JsonViewProps) {
  const [copied, setCopied] = useState(false);
  const [isMinified, setIsMinified] = useState(false);

  const jsonString = isMinified 
    ? JSON.stringify(data) 
    : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_extracted.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded successfully");
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Braces size={18} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Extracted Data</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Raw JSON Response</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase gap-2"
            onClick={() => setIsMinified(!isMinified)}
          >
            {isMinified ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            {isMinified ? "Beautify" : "Minify"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase gap-2"
            onClick={handleCopy}
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            Copy
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase gap-2"
            onClick={handleDownload}
          >
            <Download size={14} />
            Download
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-8 custom-scrollbar">
        <pre className="font-mono text-sm leading-relaxed text-indigo-100/80 whitespace-pre-wrap selection:bg-indigo-500/30">
          {jsonString.split('\n').map((line, i) => {
            // Very basic syntax highlighting logic
            let coloredLine = line;
            if (line.includes(':')) {
              const [key, ...valueParts] = line.split(':');
              const value = valueParts.join(':');
              return (
                <div key={i} className="flex group">
                  <span className="text-zinc-600 mr-6 w-8 text-right select-none">{i + 1}</span>
                  <span>
                    <span className="text-indigo-400 font-semibold">{key}</span>:
                    <span className="text-emerald-300/90">{value}</span>
                  </span>
                </div>
              );
            }
            return (
              <div key={i} className="flex group">
                 <span className="text-zinc-600 mr-6 w-8 text-right select-none">{i + 1}</span>
                 <span>{line}</span>
              </div>
            );
          })}
        </pre>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
