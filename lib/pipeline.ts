import { SupabaseClient } from '@supabase/supabase-js';
import { getPdfText } from './pdf';
import { extractQuestionsFromText, Question } from './gemini';
import { generatePPTX } from './ppt';
import { sanitizeError } from './error-utils';

import { PipelineStep } from './pipeline-types';
export { PipelineStep };

export class ProcessingPipeline {
  private id: string;
  private supabase: SupabaseClient;

  constructor(id: string, supabaseClient: SupabaseClient) {
    this.id = id;
    this.supabase = supabaseClient;
  }

  private async updateRecord(data: any) {
    const { error: updateError } = await this.supabase
      .from('presentations')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.id);
    
    if (updateError) {
      console.error('Failed to update presentation record:', updateError);
      throw updateError;
    }
  }

  private async logError(step: PipelineStep, error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedError = sanitizeError(errorMessage);
    await this.updateRecord({
      status: PipelineStep.FAILED,
      failed_at_step: step,
      error_logs: sanitizedError
    });
    
    // Attempt to update history table as well
    await this.supabase.from('uploads').update({
      pipeline_status: PipelineStep.FAILED,
      failed_at_step: step,
      error_logs: sanitizedError
    }).eq('id', this.id);
  }

  async run(forceStep?: PipelineStep) {
    const startTime = Date.now();
    
    try {
      // 1. Fetch current state
      const { data: presentation, error: fetchError } = await this.supabase
        .from('presentations')
        .select('*')
        .eq('id', this.id)
        .single();

      if (fetchError || !presentation) throw new Error('Presentation not found');

      let currentStatus = (forceStep || presentation.status) as PipelineStep;
      
      // Step 1: TEXT EXTRACTION
      if (currentStatus === PipelineStep.UPLOADED || currentStatus === PipelineStep.EXTRACTING_TEXT || forceStep === PipelineStep.EXTRACTING_TEXT) {
        await this.updateRecord({ status: PipelineStep.EXTRACTING_TEXT });
        try {
          const pdfResponse = await fetch(presentation.pdf_url);
          if (!pdfResponse.ok) throw new Error('Failed to download PDF');
          const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
          const text = await getPdfText(pdfBuffer);
          
          if (!text || text.trim().length < 20) throw new Error('PDF content too short or unreadable');

          await this.updateRecord({
            raw_pdf_text: text,
            status: PipelineStep.TEXT_EXTRACTED,
            last_successful_step: PipelineStep.EXTRACTING_TEXT
          });
          presentation.raw_pdf_text = text; // Update local ref
          currentStatus = PipelineStep.TEXT_EXTRACTED;
        } catch (err) {
          await this.logError(PipelineStep.EXTRACTING_TEXT, err);
          throw err;
        }
      }

      // Step 2: AI PROCESSING
      if (currentStatus === PipelineStep.TEXT_EXTRACTED || currentStatus === PipelineStep.PROCESSING_AI || forceStep === PipelineStep.PROCESSING_AI) {
        await this.updateRecord({ status: PipelineStep.PROCESSING_AI });
        try {
          const text = presentation.raw_pdf_text;
          if (!text) throw new Error('Missing extracted text for AI processing');
          
          const { questions, rawResponse } = await extractQuestionsFromText(text);

          if (!questions || questions.length === 0) throw new Error('AI failed to extract questions');

          await this.updateRecord({
            ai_raw_response: rawResponse,
            questions: questions,
            status: PipelineStep.AI_PROCESSED,
            last_successful_step: PipelineStep.PROCESSING_AI
          });
          presentation.questions = questions; // Update local ref
          currentStatus = PipelineStep.AI_PROCESSED;
        } catch (err) {
          await this.logError(PipelineStep.PROCESSING_AI, err);
          throw err;
        }
      }

      // Step 3: PPT GENERATION
      if (currentStatus === PipelineStep.AI_PROCESSED || currentStatus === PipelineStep.GENERATING_PPT || forceStep === PipelineStep.GENERATING_PPT) {
        await this.updateRecord({ status: PipelineStep.GENERATING_PPT });
        try {
          const questions = presentation.questions;
          if (!questions || questions.length === 0) throw new Error('Missing JSON data for PPT generation');

          const pptBuffer = await generatePPTX(questions, {
            title: presentation.title,
            themeColor: presentation.theme.themeColor,
            accentColor: presentation.theme.accentColor,
            layout: presentation.theme.layout
          });

          const fileName = `pptx/${this.id}.pptx`;
          const { error: uploadError } = await this.supabase.storage
            .from('pptxs')
            .upload(fileName, pptBuffer, {
              contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              upsert: true
            });

          if (uploadError) throw new Error(`Failed to upload PPT: ${uploadError.message}`);

          const { data: { publicUrl: pptPublicUrl } } = this.supabase.storage
            .from('pptxs')
            .getPublicUrl(fileName);

          await this.updateRecord({
            pptx_url: pptPublicUrl,
            status: PipelineStep.EXPORT_READY,
            last_successful_step: PipelineStep.GENERATING_PPT,
            stats: {
              totalQuestions: questions.length,
              processingTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
            }
          });

          // Also update the 'uploads' history table
          await this.supabase.from('uploads').upsert({
            id: this.id,
            pdf_name: presentation.title,
            pdf_url: presentation.pdf_url,
            ppt_url: pptPublicUrl,
            exam_name: presentation.title,
            extracted_json: questions,
            total_questions: questions.length,
            raw_pdf_text: presentation.raw_pdf_text,
            ai_raw_response: presentation.ai_raw_response,
            pipeline_status: PipelineStep.EXPORT_READY,
            user_id: presentation.user_id
          });

          currentStatus = PipelineStep.EXPORT_READY;
        } catch (err) {
          await this.logError(PipelineStep.GENERATING_PPT, err);
          throw err;
        }
      }

      return { success: true, status: currentStatus };
    } catch (error: any) {
      console.error('Pipeline Error:', error);
      return { success: false, error: error.message };
    }
  }
}
