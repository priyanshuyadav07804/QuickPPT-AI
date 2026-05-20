export function cleanOcrText(text: string): string {
  if (!text) return "";

  // 1. Remove common noisy page headers/footers (e.g. Page 1, Test 2023, www.example.com)
  let cleaned = text
    .replace(/^page\s*\d+/gim, '')
    .replace(/^scanned with camscanner/gim, '')
    .replace(/www\.[a-z0-9-]+\.[a-z]+/gim, '')
    .replace(/https?:\/\/[^\s]+/gim, '');

  // 2. Remove telegram/social text like "Join @telegram_channel"
  cleaned = cleaned.replace(/join\s*(our|@)?\s*telegram.*/gim, '')
                   .replace(/subscribe.*/gim, '');

  // 3. Remove duplicate blank lines and normalize spacing
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 4. Try to remove common watermark lines or footer garbage
  // We should preserve empty lines to maintain paragraphs
  cleaned = cleaned.split('\n').filter(line => {
    if (line.trim() === '') return true; // keep empty lines for paragraph separation
    const l = line.trim().toLowerCase();
    // Ignore lines that are just symbols or too short if they don't look like math or options
    if (l.length < 3 && !l.match(/[a-z0-9]/i)) return false;
    // Ignore common trash
    if (l.includes("all rights reserved")) return false;
    if (l.includes("watermark")) return false;
    return true;
  }).join('\n');

  return cleaned;
}

export interface DetectedQuestion {
  num: number;
  text: string;
}

export interface QuestionChunk {
  text: string;
  startQ: number;
  endQ: number;
  expectedCount: number;
  questionMap?: { num: number; text: string }[];
}

export function splitByQuestions(text: string, questionsPerChunk: number = 20): string[] {
  return detectAndChunkQuestions(text, questionsPerChunk).map(c => c.text);
}

export function detectAndChunkQuestions(text: string, questionsPerChunk: number = 20): QuestionChunk[] {
  // 1. Regex to match question starts anchored to start of lines
  const startRegex = /^(?:\s*(?:Q(?:uestion)?[\.\s]*|प्र(?:श्न)?[\.\s]*)?(0*[1-9][0-9]{0,2})\s*[\.\-\:\)])/gim;

  const matches = [...text.matchAll(startRegex)];
  
  if (matches.length === 0) {
    return [{ text, startQ: 0, endQ: 0, expectedCount: 1 }];
  }

  // 2. Filter matches to ensure continuous/increasing numbering to avoid false positives
  const validQuestions: { num: number, startIndex: number, endIndex: number }[] = [];
  let lastNum = 0;

  for (const match of matches) {
     const n = parseInt(match[1], 10);
     if (lastNum === 0) {
       // First question should be early, allow up to 50 just in case
       if (n > 0 && n <= 50) {
          validQuestions.push({ num: n, startIndex: match.index!, endIndex: -1 });
          lastNum = n;
       }
     } else {
       // Must increment, allow any jump to recover from OCR destroying intermediate numbers
       if (n > lastNum) {
          validQuestions.push({ num: n, startIndex: match.index!, endIndex: -1 });
          lastNum = n;
       }
     }
  }

  if (validQuestions.length === 0) {
      return [{ text, startQ: 0, endQ: 0, expectedCount: 1 }];
  }

  // 3. Mark the end of each question's text boundary
  for (let i = 0; i < validQuestions.length; i++) {
     if (i < validQuestions.length - 1) {
         validQuestions[i].endIndex = validQuestions[i+1].startIndex;
     } else {
         validQuestions[i].endIndex = text.length;
     }
  }

  // 4. Group questions into chunks of max questionsPerChunk
  const chunks: QuestionChunk[] = [];
  
  for (let i = 0; i < validQuestions.length; i += questionsPerChunk) {
     const group = validQuestions.slice(i, i + questionsPerChunk);
     const startQ = group[0].num;
     const endQ = group[group.length - 1].num;
     
     let chunkText = "";
     // For the very first chunk, also include any preamble text (e.g. Exam headers)
     if (i === 0 && validQuestions[0].startIndex > 0) {
         chunkText += text.substring(0, validQuestions[0].startIndex);
     }
     
     const startIdx = group[0].startIndex;
     const endIdx = group[group.length - 1].endIndex;
     
     chunkText += text.substring(startIdx, endIdx);
     
     const questionMap: { num: number; text: string }[] = [];
     for (const q of group) {
       questionMap.push({
         num: q.num,
         text: text.substring(q.startIndex, q.endIndex).trim()
       });
     }
     
     chunks.push({
         text: chunkText.trim(),
         startQ,
         endQ,
         expectedCount: endQ - startQ + 1,
         questionMap
     });
  }

  return chunks.length > 0 ? chunks : [{ text, startQ: 0, endQ: 0, expectedCount: 1 }];
}
