import { Question } from "./gemini";

export interface RenderedSlide {
  type: 'title' | 'question';
  qNum?: string;
  isContinuation?: boolean;
  content: string; // Keep for title or unified content if needed
  english?: string;
  hindi?: string;
  options?: string;
  optionList?: string[];
  exam_full_text?: string;
}

export function parseQuestionText(text: string) {
  const parts = text.split(/\n\n+/);
  let english = parts[0] || "";
  let hindi = parts.slice(1).join("\n\n") || "";
  
  return { english, hindi };
}

export function getRenderedSlides(title: string, questions: Question[]): RenderedSlide[] {
  const slides: RenderedSlide[] = [];

  // Title slide
  slides.push({
    type: 'title',
    content: title
  });

  // Question slides
  questions.forEach(q => {
    const { english, hindi } = parseQuestionText(q.text);
    const optionList = Array.isArray(q.options) ? q.options : [];
    const optionsText = optionList.join("\n");
    
    // Combine English and Hindi for splitting
    const fullBody = (english + (hindi ? "\n\n" + hindi : "")).trim();
    
    // Heuristic: Using content length + complexity 
    // Bilingual text takes more space.
    const MAX_CHARS = 3000; 
    
    if (fullBody.length > MAX_CHARS) {
      const parts: string[] = [];
      let remaining = fullBody;
      
      while (remaining.length > MAX_CHARS) {
        let splitIdx = remaining.lastIndexOf("\n\n", MAX_CHARS);
        if (splitIdx < MAX_CHARS * 0.3) splitIdx = remaining.lastIndexOf("\n", MAX_CHARS);
        if (splitIdx < MAX_CHARS * 0.3) splitIdx = remaining.lastIndexOf(". ", MAX_CHARS);
        if (splitIdx < MAX_CHARS * 0.3) splitIdx = MAX_CHARS;
        
        parts.push(remaining.substring(0, splitIdx).trim());
        remaining = remaining.substring(splitIdx).trim();
      }
      if (remaining) parts.push(remaining);

      parts.forEach((part, idx) => {
        const isLast = idx === parts.length - 1;
        const subParts = part.split(/\n\n+/);
        
        slides.push({
          type: 'question',
          qNum: q.number,
          isContinuation: idx > 0,
          content: part,
          english: subParts[0] || "",
          hindi: subParts.slice(1).join("\n\n") || "",
          options: isLast ? optionsText : "",
          optionList: isLast ? optionList : [],
          exam_full_text: q.exam_full_text
        });
      });
    } else {
      slides.push({
        type: 'question',
        qNum: q.number,
        isContinuation: false,
        content: fullBody,
        english,
        hindi,
        options: optionsText,
        optionList,
        exam_full_text: q.exam_full_text
      });
    }
  });

  return slides;
}
