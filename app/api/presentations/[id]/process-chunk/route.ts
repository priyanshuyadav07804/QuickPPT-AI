import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recoverMissingQuestionsFromText, extractQuestionsFromText, hasCorruptedHindi } from '@/lib/gemini';
import { sanitizeError } from '@/lib/error-utils';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const { chunkIndex } = await req.json();
    if (typeof chunkIndex !== 'number') throw new Error('chunkIndex is required');

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
    
    if (!chunks[chunkIndex]) {
        throw new Error(`Chunk ${chunkIndex} not found`);
    }

    const chunk = chunks[chunkIndex];

    if (chunk.status === 'success' && Array.isArray(chunk.json)) {
        return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Attempt to get context from previous successful chunk
    let previousContext;
    for (let i = chunkIndex - 1; i >= 0; i--) {
        const prevChunk = chunks[i];
        if (prevChunk.status === 'success' && Array.isArray(prevChunk.json) && prevChunk.json.length > 0) {
            // Find the last question in the previous chunk that has exam_full_text
            const lastQuestionsWithExam = [...prevChunk.json].reverse().filter(q => q.exam_full_text);
            if (lastQuestionsWithExam.length > 0) {
                const q = lastQuestionsWithExam[0];
                previousContext = {
                    previousExamFullText: q.exam_full_text
                };
                break;
            }
        }
    }

    // Call Gemini
    const { questions, rawResponse, modelUsed, retryCount, fallbackCount, responseTime, errorLogs, expectedCount: computedExpectedCount, extractedCount, missingCount: computedMissingCount, questionRange: computedQuestionRange } = await extractQuestionsFromText(chunk.text, previousContext);

    const providedStartQ = chunk.startQ || 0;
    const providedEndQ = chunk.endQ || 0;
    const providedExpectedCount = chunk.expectedCount || 0;
    
    let expectedCount = providedExpectedCount > 0 ? providedExpectedCount : (computedExpectedCount || 0);
    let questionRange = providedStartQ > 0 && providedEndQ > 0 ? `Questions ${providedStartQ}–${providedEndQ}` : (computedQuestionRange || "");

    let finalQuestions = [];
    let corruptedLogs: string[] = [];
    
    // Identify corrupted Hindi questions
    for (const q of questions) {
       if (hasCorruptedHindi(q.text)) {
         corruptedLogs.push(`Corrupted Hindi detected in ${q.number}. Scheduling for recovery.`);
       } else {
         finalQuestions.push(q);
       }
    }
    
    // Find all valid question numbers extracted
    const qNumbers = finalQuestions
        .map(q => {
          const match = String(q.number).match(/\d+/);
          return match ? parseInt(match[0], 10) : NaN;
        })
        .filter(n => !isNaN(n));

    let minNumber = providedStartQ > 0 ? providedStartQ : (qNumbers.length > 0 ? Math.min(...qNumbers) : 0);
    let maxNumber = providedEndQ > 0 ? providedEndQ : (qNumbers.length > 0 ? Math.max(...qNumbers) : 0);

    const missingNumbers: number[] = [];
    if (minNumber > 0 && maxNumber > 0) {
      for (let i = minNumber; i <= maxNumber; i++) {
        if (!qNumbers.includes(i)) {
          missingNumbers.push(i);
        }
      }
    }

    let initialMissingCount = missingNumbers.length;
    let recoveredCount = 0;
    let unrecoveredCount = initialMissingCount;
    let recoveryLogs: string[] = [...corruptedLogs];

    // Attempt recovery if there are missing questions
    if (initialMissingCount > 0) {
      recoveryLogs.push(`Missing/Corrupted Questions Detected: ${initialMissingCount}`);
      recoveryLogs.push(`Recovery Processing Started...`);

      try {
        let isolatedText = "";
        if (chunk.questionMap && Array.isArray(chunk.questionMap)) {
          for (const mn of missingNumbers) {
             const qEntry = chunk.questionMap.find((qm: any) => qm.num === mn);
             if (qEntry) {
                isolatedText += qEntry.text + "\n\n";
             }
          }
        }
        if (!isolatedText.trim()) {
           isolatedText = chunk.text;
        }

        const recoveryResult = await recoverMissingQuestionsFromText(isolatedText, missingNumbers, previousContext);
        
        for (const mn of missingNumbers) {
          const recoveredQ = recoveryResult.questions.find(q => {
            const match = String(q.number).match(/\d+/);
            return match ? parseInt(match[0], 10) === mn : false;
          });

          if (recoveredQ) {
            finalQuestions.push(recoveredQ);
            recoveredCount++;
            recoveryLogs.push(`✅ Recovered Question ${mn}`);
          } else {
            recoveryLogs.push(`❌ Question ${mn} could not be recovered`);
          }
        }
      } catch (recoveryErr: any) {
        recoveryLogs.push(`Recovery failed: ${recoveryErr.message}`);
      }

      unrecoveredCount = missingNumbers.length - recoveredCount;
      
      // Re-sort final questions
      finalQuestions.sort((a, b) => {
        const numA = parseInt(String(a.number).match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(String(b.number).match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });
    }

    // Update chunk state
    chunk.status = 'success';
    chunk.json = finalQuestions;
    chunk.rawResponse = rawResponse;
    chunk.modelUsed = modelUsed;
    chunk.retryCount = retryCount;
    chunk.fallbackCount = fallbackCount;
    chunk.responseTime = responseTime;
    chunk.errorLogs = errorLogs;
    chunk.expectedCount = expectedCount;
    chunk.extractedCount = finalQuestions.length; // Post-recovery count
    chunk.initialExtractedCount = extractedCount;
    chunk.missingCount = unrecoveredCount;
    chunk.recoveredCount = recoveredCount;
    chunk.recoveryLogs = recoveryLogs;
    chunk.questionRange = questionRange;
    chunk.completedAt = new Date().toISOString();
    chunk.error = null;

    stats.chunks = chunks;

    // Do NOT set overall pipeline status to failed. Just update the stats JSON
    await supabase.from('presentations').update({ stats }).eq('id', id);

    return NextResponse.json({ 
        success: true, 
        questionsCount: finalQuestions.length,
        modelUsed: modelUsed,
        fallbackCount: fallbackCount,
        retryCount: retryCount,
        expectedCount,
        extractedCount: finalQuestions.length,
        initialExtractedCount: extractedCount,
        missingCount: unrecoveredCount,
        recoveredCount: recoveredCount,
        recoveryLogs: recoveryLogs,
        questionRange
    });
  } catch (error: any) {
    console.error(`Chunk Process Error:`, error);
    const sanitizedError = sanitizeError(error.message);
    
    // Log failure into the chunk specifically instead of failing whole pipeline right away
    const supabase = await createClient();
    const { data: presentation } = await supabase
      .from('presentations')
      .select('stats')
      .eq('id', id)
      .single();
      
    if (presentation && presentation.stats && presentation.stats.chunks) {
        // try to catch the chunk index
        try {
            const { chunkIndex } = await req.clone().json();
            if (typeof chunkIndex === 'number' && presentation.stats.chunks[chunkIndex]) {
                presentation.stats.chunks[chunkIndex].status = 'failed';
                presentation.stats.chunks[chunkIndex].error = sanitizedError;
                await supabase.from('presentations').update({ stats: presentation.stats }).eq('id', id);
            }
        } catch(e) {}
    }

    return NextResponse.json({ error: sanitizedError }, { status: 500 });
  }
}
