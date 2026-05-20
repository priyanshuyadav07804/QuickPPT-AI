import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPdfText } from '@/lib/pdf';
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
      .select('pdf_url, raw_pdf_text')
      .eq('id', id)
      .single();

    if (fetchError || !presentation) throw new Error('Presentation not found');

    if (presentation.raw_pdf_text) {
      return NextResponse.json({ text: presentation.raw_pdf_text, status: PipelineStep.TEXT_EXTRACTED });
    }

    await supabase.from('presentations').update({ status: PipelineStep.EXTRACTING_TEXT }).eq('id', id);
    await supabase.from('uploads').update({ pipeline_status: PipelineStep.EXTRACTING_TEXT }).eq('id', id);

    const pdfResponse = await fetch(presentation.pdf_url);
    if (!pdfResponse.ok) throw new Error('Failed to download PDF');
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const text = await getPdfText(pdfBuffer);
    
    if (!text || text.trim().length < 20) throw new Error('PDF content too short or unreadable');

    await supabase.from('presentations').update({
      raw_pdf_text: text,
      status: PipelineStep.TEXT_EXTRACTED,
      last_successful_step: PipelineStep.EXTRACTING_TEXT,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    await supabase.from('uploads').update({
      raw_pdf_text: text,
      pipeline_status: PipelineStep.TEXT_EXTRACTED
    }).eq('id', id);

    return NextResponse.json({ text, status: PipelineStep.TEXT_EXTRACTED });

  } catch (error: any) {
    console.error('Extract Route Error:', error);
    const sanitizedError = sanitizeError(error.message);
    const supabase = await createClient();
    await supabase.from('presentations').update({
      status: PipelineStep.FAILED,
      failed_at_step: PipelineStep.EXTRACTING_TEXT,
      error_logs: sanitizedError
    }).eq('id', id);
    await supabase.from('uploads').update({
      pipeline_status: PipelineStep.FAILED,
      failed_at_step: PipelineStep.EXTRACTING_TEXT,
      error_logs: sanitizedError
    }).eq('id', id);
    return NextResponse.json({ error: sanitizedError }, { status: 500 });
  }
}
