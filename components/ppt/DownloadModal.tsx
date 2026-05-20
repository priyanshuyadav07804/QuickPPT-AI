'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Presentation, 
  Layout, 
  PenTool, 
  Download, 
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTitle: string;
  presentationId: string;
}

type LayoutMode = 'standard' | 'solving';

export function DownloadModal({ isOpen, onClose, defaultTitle, presentationId }: DownloadModalProps) {
  const [layout, setLayout] = useState<LayoutMode>('standard');
  const [filename, setFilename] = useState(defaultTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  const [isDownloading, setIsDownloading] = useState(false);

  // Auto-update filename based on selection
  const currentFilename = `${filename}-${layout}.pptx`;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const url = `/api/presentations/${presentationId}/download?layout=${layout}&format=pptx&filename=${encodeURIComponent(filename)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Download failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = currentFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('File downloaded successfully');
      onClose();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to generate file');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-400" />
            Download Presentation
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Choose your preferred layout and format for export.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Layout Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-zinc-300">Layout Mode</Label>
            <RadioGroup 
              value={layout} 
              onValueChange={(val) => setLayout(val as LayoutMode)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="standard" id="standard" className="sr-only" />
                <Label
                  htmlFor="standard"
                  className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-900 hover:text-white cursor-pointer transition-all",
                    layout === 'standard' && "border-indigo-500 bg-zinc-900 ring-1 ring-indigo-500/20"
                  )}
                >
                  <Layout className="mb-3 h-6 w-6 text-indigo-400" />
                  <div className="text-sm font-semibold">Standard</div>
                  <div className="text-[10px] text-zinc-500 mt-1 text-center">Full question view</div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="solving" id="solving" className="sr-only" />
                <Label
                  htmlFor="solving"
                  className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-900 hover:text-white cursor-pointer transition-all",
                    layout === 'solving' && "border-indigo-500 bg-zinc-900 ring-1 ring-indigo-500/20"
                  )}
                >
                  <PenTool className="mb-3 h-6 w-6 text-emerald-400" />
                  <div className="text-sm font-semibold">Solving</div>
                  <div className="text-[10px] text-zinc-500 mt-1 text-center">Empty side for math</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Format Selection - Removed PDF, keeping only PPTX for now as requested */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-zinc-300">File Format</Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-center gap-2 rounded-md border-2 border-indigo-500 bg-zinc-900 ring-1 ring-indigo-500/20 p-3 w-full">
                  <Presentation className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium">PowerPoint (PPTX)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filename Input */}
          <div className="space-y-3">
            <Label htmlFor="filename" className="text-sm font-medium text-zinc-300">File Name</Label>
            <div className="relative">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value.replace(/[^a-z0-9-]/g, '-').toLowerCase())}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 h-10 pr-24"
                placeholder="presentation-name"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">
                -{layout}.pptx
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              Generated: <span className="text-zinc-300">{currentFilename}</span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDownload}
            disabled={isDownloading || !filename}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
