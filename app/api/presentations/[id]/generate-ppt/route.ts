import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePPTX } from '@/lib/ppt';
import { PipelineStep } from '@/lib/pipeline-types';
import { sanitizeError } from '@/lib/error-utils';
import { hasCorruptedHindi } from '@/lib/gemini';

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
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !presentation) throw new Error('Presentation not found');
    
    if (presentation.pptx_url) {
      return NextResponse.json({ url: presentation.pptx_url, status: PipelineStep.EXPORT_READY });
    }

    if (!presentation.questions || presentation.questions.length === 0) {
      throw new Error('Missing JSON data for PPT generation');
    }

    let finalQuestions = [];
    let corruptedGlobalCount = 0;

    for (const q of presentation.questions) {
      if (hasCorruptedHindi(q.text)) {
        corruptedGlobalCount++;
        console.log(`[Global Validation] Corrupted Hindi found in Q${q.number}`);
      } else {
        finalQuestions.push(q);
      }
    }

    // ====================================================
    // FINAL GLOBAL VALIDATION
    // ====================================================
    if (presentation.stats && presentation.stats.chunks) {
      const qNumbers = finalQuestions.map(q => {
        const match = String(q.number).match(/\d+/);
        return match ? parseInt(match[0], 10) : NaN;
      }).filter(n => !isNaN(n));

      // Calculate total expected from chunks
      const allChunks = presentation.stats.chunks;
      const expectedNumbers: number[] = [];
      let minGlobal = Infinity;
      let maxGlobal = 0;
      
      allChunks.forEach((c: any) => {
        if (c.startQ && c.endQ) {
          if (c.startQ < minGlobal) minGlobal = c.startQ;
          if (c.endQ > maxGlobal) maxGlobal = c.endQ;
        }
      });

      if (minGlobal !== Infinity && maxGlobal > 0) {
        for (let i = minGlobal; i <= maxGlobal; i++) {
          expectedNumbers.push(i);
        }

        const missingGlobal = expectedNumbers.filter(n => !qNumbers.includes(n));
        
        if (missingGlobal.length > 0) {
          console.log(`[Global Validation] Missing questions detected before PPT gen:`, missingGlobal);
          try {
            // Attempt recovery from raw text
            const { recoverMissingQuestionsFromText } = await import('@/lib/gemini');
            
            // Build text context for missing
            let isolatedText = '';
            for (const n of missingGlobal) {
               for (const c of allChunks) {
                  if (c.questionMap) {
                     const qEntry = c.questionMap.find((qm: any) => qm.num === n);
                     if (qEntry) isolatedText += qEntry.text + '\n\n';
                  }
               }
            }
            if (!isolatedText.trim() && presentation.raw_pdf_text) {
               isolatedText = presentation.raw_pdf_text;
            }

            const globalRecoveryResult = await recoverMissingQuestionsFromText(isolatedText, missingGlobal);
            
            for (const mn of missingGlobal) {
               const recoveredQ = globalRecoveryResult.questions.find(q => {
                 const match = String(q.number).match(/\d+/);
                 return match ? parseInt(match[0], 10) === mn : false;
               });
               
               if (recoveredQ) {
                 finalQuestions.push(recoveredQ);
                 console.log(`[Global Validation] Recovered missed question ${mn}`);
               }
            }

            // Deduplicate again
            const uniqueMap = new Map();
            finalQuestions.forEach(q => {
                const numMatch = String(q.number).match(/\d+/);
                const oNum = numMatch ? parseInt(numMatch[0], 10) : 0;
                if (oNum > 0 && !uniqueMap.has(oNum)) {
                    uniqueMap.set(oNum, q);
                }
            });

            finalQuestions = Array.from(uniqueMap.values()).sort((a, b) => {
                const numA = parseInt(String(a.number).match(/\d+/)?.[0] || '0', 10);
                const numB = parseInt(String(b.number).match(/\d+/)?.[0] || '0', 10);
                return numA - numB;
            });
            
            // Save updated questions
            await supabase.from('presentations').update({ questions: finalQuestions }).eq('id', id);

          } catch (e) {
            console.error('[Global Validation] Recovery failed, proceeding with current questions', e);
          }
        }
      }
    }

    await supabase.from('presentations').update({ status: PipelineStep.GENERATING_PPT }).eq('id', id);
    await supabase.from('uploads').update({ pipeline_status: PipelineStep.GENERATING_PPT }).eq('id', id);

    const pptBuffer = await generatePPTX(finalQuestions, {
      title: presentation.title,
      themeColor: presentation.theme.themeColor,
      accentColor: presentation.theme.accentColor,
      layout: presentation.theme.layout
    });

    const fileName = `pptx/${id}.pptx`;
    const { error: uploadError } = await supabase.storage
      .from('pptxs')
      .upload(fileName, pptBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true
      });

    if (uploadError) throw new Error(`Failed to upload PPT: ${uploadError.message}`);

    const { data: { publicUrl: pptPublicUrl } } = supabase.storage
      .from('pptxs')
      .getPublicUrl(fileName);

    await supabase.from('presentations').update({
      pptx_url: pptPublicUrl,
      status: PipelineStep.EXPORT_READY,
      last_successful_step: PipelineStep.GENERATING_PPT,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    // Update history table
    await supabase.from('uploads').upsert({
      id: id,
      pdf_name: presentation.title,
      pdf_url: presentation.pdf_url,
      ppt_url: pptPublicUrl,
      exam_name: presentation.title,
      extracted_json: finalQuestions,
      total_questions: finalQuestions.length,
      raw_pdf_text: presentation.raw_pdf_text,
      ai_raw_response: presentation.ai_raw_response,
      pipeline_status: PipelineStep.EXPORT_READY,
      user_id: user.id
    });

    return NextResponse.json({ url: pptPublicUrl, status: PipelineStep.EXPORT_READY });

  } catch (error: any) {
    console.error('PPT Generation Route Error:', error);
    const sanitizedError = sanitizeError(error.message);
    const supabase = await createClient();
    await supabase.from('presentations').update({
      status: PipelineStep.FAILED,
      failed_at_step: PipelineStep.GENERATING_PPT,
      error_logs: sanitizedError
    }).eq('id', id);
    await supabase.from('uploads').update({
      pipeline_status: PipelineStep.FAILED,
      failed_at_step: PipelineStep.GENERATING_PPT,
      error_logs: sanitizedError
    }).eq('id', id);
    return NextResponse.json({ error: sanitizedError }, { status: 500 });
  }
}
