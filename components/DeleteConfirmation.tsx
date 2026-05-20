'use client'
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = "Delete Presentation?",
  description = "Are you sure you want to permanently delete this upload, generated PPT, previews, and history record? This action cannot be undone."
}: DeleteConfirmationProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden p-0 max-w-md">
        <div className="absolute top-0 inset-x-0 h-1 bg-red-600/50 shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
        
        <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                    <Trash2 size={24} />
                </div>
                <div className="space-y-1">
                    <AlertDialogTitle className="text-xl font-bold tracking-tight text-white">{title}</AlertDialogTitle>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500/80 bg-red-500/5 px-2 py-0.5 rounded-full w-fit">
                        <AlertTriangle size={12} /> Irreversible Action
                    </div>
                </div>
            </div>
            
            <AlertDialogDescription className="text-zinc-400 text-sm leading-relaxed mb-0">
                {description}
            </AlertDialogDescription>
        </div>

        <AlertDialogFooter className="bg-zinc-900/40 p-6 flex items-center justify-end gap-3 border-t border-white/5">
          <AlertDialogCancel 
            disabled={isLoading}
            className="rounded-xl h-11 px-6 border-white/5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={(e) => {
                e.preventDefault();
                onConfirm();
            }}
            disabled={isLoading}
            className="rounded-xl h-11 px-6 bg-red-600 hover:bg-red-500 text-white border-none shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all text-xs font-bold uppercase tracking-widest min-w-[120px]"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              "Delete Permanently"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
