import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
      .select('stats')
      .eq('id', id)
      .single();

    if (fetchError || !presentation) throw new Error('Presentation not found');

    const stats = presentation.stats || {};
    const chunks = stats.chunks || [];
    
    if (chunks.length === 0) {
        throw new Error('No chunks found to merge');
    }

    // Merge JSONs only for successful chunks
    let allQuestions: any[] = [];
    let fullRawResponse = "";

    chunks.forEach((c: any) => {
        if (c.status === 'success' && c.json && Array.isArray(c.json)) {
            allQuestions = allQuestions.concat(c.json);
        }
        if (c.rawResponse) {
            fullRawResponse += `--- CHUNK ${c.index} ---\n${c.rawResponse}\n\n`;
        }
    });

    // Remove duplicates and maintain original extracted numbering
    const uniqueQuestionsMap = new Map();

    allQuestions.forEach(q => {
        const numMatch = String(q.number).match(/\d+/);
        const originalNum = numMatch ? parseInt(numMatch[0], 10) : 0;
        
        if (originalNum > 0 && !uniqueQuestionsMap.has(originalNum)) {
            uniqueQuestionsMap.set(originalNum, q);
        }
    });

    // Sort by original number to preserve structural order
    const mergedQuestions = Array.from(uniqueQuestionsMap.values()).sort((a, b) => {
        const numA = parseInt(String(a.number).match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(String(b.number).match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
    });

    // Save
    await supabase.from('presentations').update({
      ai_raw_response: fullRawResponse,
      questions: mergedQuestions,
      status: PipelineStep.AI_PROCESSED,
      last_successful_step: PipelineStep.PROCESSING_AI,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    await supabase.from('uploads').update({
      ai_raw_response: fullRawResponse,
      extracted_json: mergedQuestions,
      total_questions: mergedQuestions.length,
      pipeline_status: PipelineStep.AI_PROCESSED
    }).eq('id', id);

    return NextResponse.json({ questions: mergedQuestions, status: PipelineStep.AI_PROCESSED });

  } catch (error: any) {
    console.error('Merge Chunks Error:', error);
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
