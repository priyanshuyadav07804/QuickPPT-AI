import pptxgen from "pptxgenjs";
import { Question } from "../gemini";
import { getRenderedSlides } from "../slide-utils";
import { PPTConfig } from "./types";
import { SLIDE_THEME } from "../presentation-constants";
import { addStandardQuestionSlide } from "./generateStandardLayout";
import { addSolvingQuestionSlide } from "./generateSolvingLayout";

export async function generatePPTX(questions: Question[], config: PPTConfig): Promise<Buffer> {
  const pres = new pptxgen();
  pres.title = config.title;
  pres.layout = "LAYOUT_16x9";

  const { titleSlide: titleTheme } = SLIDE_THEME;
  const slides = getRenderedSlides(config.title, questions);
  const layout = config.layout || 'standard';

  slides.forEach((s) => {
    if (s.type === 'title') {
      const slide = pres.addSlide();
      slide.background = { color: config.themeColor };
      
      slide.addText(config.title, {
        x: titleTheme.title.x,
        y: titleTheme.title.y,
        w: titleTheme.title.w,
        fontSize: titleTheme.title.fontSize,
        bold: titleTheme.title.bold,
        color: titleTheme.title.color,
        align: titleTheme.title.align as any,
      });
    } else {
      if (layout === 'solving') {
        addSolvingQuestionSlide(pres, s, config);
      } else {
        addStandardQuestionSlide(pres, s, config);
      }
    }
  });

  const buffer = await pres.write({ outputType: "nodebuffer" }) as Buffer;
  return buffer;
}
