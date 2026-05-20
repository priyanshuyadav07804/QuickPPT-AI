import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cleanOcrText, detectAndChunkQuestions } from '@/lib/text-chunker';
import { PipelineStep } from '@/lib/pipeline-types';
import { sanitizeError } from '@/lib/error-utils';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: presentation, error: fetchError } = await supabase
      .from('presentations')
      .select('raw_pdf_text, stats, status')
      .eq('id', id)
      .single();

    if (fetchError || !presentation) throw new Error('Presentation not found');

    if (!presentation.raw_pdf_text) {
        throw new Error('Missing extracted text. Please run extraction step first.');
    }

    // If chunks are already prepared and status is at least process-ai, we can optionally skip
    // but just to be safe we always return the prepared count or prepare it
    let currentStats = presentation.stats || {};
    if (currentStats.chunks && currentStats.chunks.length > 0) {
        return NextResponse.json({ totalChunks: currentStats.chunks.length, success: true });
    }

    const cleanedText = cleanOcrText(presentation.raw_pdf_text);
    const chunksData = detectAndChunkQuestions(cleanedText, 20);

    const initialChunks = chunksData.map((c, i) => ({
       index: i,
       text: c.text,
       startQ: c.startQ,
       endQ: c.endQ,
       expectedCount: c.expectedCount,
       questionMap: c.questionMap,
       status: 'pending',
    }));

    currentStats = {
       ...currentStats,
       chunks: initialChunks,
    };

    await supabase.from('presentations').update({ 
       status: PipelineStep.PROCESSING_AI,
       stats: currentStats
    }).eq('id', id);

    await supabase.from('uploads').update({ 
       pipeline_status: PipelineStep.PROCESSING_AI 
    }).eq('id', id);

    return NextResponse.json({ totalChunks: initialChunks.length, success: true });

  } catch (error: any) {
    console.error('Prepare Chunks Error:', error);
    const sanitizedError = sanitizeError(error.message);
    const supabase = await createClient();
    await supabase.from('presentations').update({
      status: PipelineStep.FAILED,
      failed_at_step: PipelineStep.PROCESSING_AI,
      error_logs: sanitizedError
    }).eq('id', id);
    return NextResponse.json({ error: sanitizedError }, { status: 500 });
  }
}
