import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractQuestionsFromText } from '@/lib/gemini';
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
      .select('raw_pdf_text, questions')
      .eq('id', id)
      .single();

    if (fetchError || !presentation) throw new Error('Presentation not found');

    if (presentation.questions && Array.isArray(presentation.questions) && presentation.questions.length > 0) {
       return NextResponse.json({ questions: presentation.questions, status: PipelineStep.AI_PROCESSED });
    }

    if (!presentation.raw_pdf_text) {
        throw new Error('Missing extracted text. Please run extraction step first.');
    }

    await supabase.from('presentations').update({ status: PipelineStep.PROCESSING_AI }).eq('id', id);
    await supabase.from('uploads').update({ pipeline_status: PipelineStep.PROCESSING_AI }).eq('id', id);

    const { questions, rawResponse } = await extractQuestionsFromText(presentation.raw_pdf_text);

    if (!questions || questions.length === 0) throw new Error('AI failed to extract questions');

    await supabase.from('presentations').update({
      ai_raw_response: rawResponse,
      questions: questions,
      status: PipelineStep.AI_PROCESSED,
      last_successful_step: PipelineStep.PROCESSING_AI,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    await supabase.from('uploads').update({
      ai_raw_response: rawResponse,
      extracted_json: questions,
      total_questions: questions.length,
      pipeline_status: PipelineStep.AI_PROCESSED
    }).eq('id', id);

    return NextResponse.json({ questions, status: PipelineStep.AI_PROCESSED });

  } catch (error: any) {
    console.error('AI Processing Route Error:', error);
    const sanitizedError = sanitizeError(error.message);
    const supabase = await createClient();
    await supabase.from('presentations').update({
      status: PipelineStep.FAILED,
      failed_at_step: PipelineStep.PROCESSING_AI,
      error_logs: sanitizedError
    }).eq('id', id);
    await supabase.from('uploads').update({
      pipeline_status: PipelineStep.FAILED,
      failed_at_step: PipelineStep.PROCESSING_AI,
      error_logs: sanitizedError
    }).eq('id', id);
    return NextResponse.json({ error: sanitizedError }, { status: 500 });
  }
}
