import pptxgen from "pptxgenjs";
import { RenderedSlide } from "../slide-utils";
import { PPTConfig } from "./types";
import { SLIDE_THEME, PRES_LAYOUT } from "../presentation-constants";
import { calculateSolvingLayout } from "./layout-engine";

export function addSolvingQuestionSlide(pres: pptxgen, s: RenderedSlide, config: PPTConfig) {
  const slide = pres.addSlide();
  const { questionSlide: qTheme } = SLIDE_THEME;
  const layout = qTheme.layouts.solving;

  // Split line in middle for solving area layout
  slide.addShape(pres.ShapeType.line, {
    x: layout.body.x - 0.2, // margin offset
    y: 0,
    w: 0,
    h: 5.625,
    line: { color: "cccccc", dashType: "dash", width: 1 }
  });

  if (s.type === 'question') {
    let english = s.english || s.content;
    let hindi = s.hindi || "";
    
    if (config.languageMode === 'english') hindi = "";
    if (config.languageMode === 'hindi') english = "";
    
    // Use dynamic scaler
    const metrics = calculateSolvingLayout(english, hindi, layout.body.w);
    let currentY = layout.body.y;

    if (english || hindi) {
      const textObjects: any[] = [];
      const qPrefix = (s.qNum && !s.isContinuation) ? `${s.qNum}. ` : "";

      if (english) {
        if (qPrefix) {
          textObjects.push({ text: qPrefix, options: { bold: true, fontSize: metrics.baseFontSize, color: qTheme.body.color } });
        }
        textObjects.push({ text: english, options: { fontSize: metrics.baseFontSize, color: qTheme.body.color } });
      }

      if (hindi) {
        if (english) {
          textObjects.push({ text: "\n\n", options: { fontSize: metrics.baseFontSize } });
        } else if (qPrefix) {
          textObjects.push({ text: qPrefix, options: { bold: true, fontSize: metrics.hindiFontSize, color: qTheme.body.color } });
        }
        textObjects.push({ text: hindi, options: { fontSize: metrics.hindiFontSize, color: qTheme.body.hindiColor } });
      }

      const totalHeight = metrics.englishHeight + metrics.hindiHeight + (english && hindi ? 0.2 : 0);

      slide.addText(textObjects, {
        x: layout.body.x,
        y: layout.body.y,
        w: layout.body.w,
        h: totalHeight,
        valign: "top",
        margin: 0,
        wrap: true,
        fit: 'shrink'
      });
    }

    // 2x2 Options Grid
    if (s.optionList && s.optionList.length >= 4 && !s.isContinuation) {
      const gapX = 0.1;
      const gapY = 0.1;
      const optW = (layout.body.w - gapX) / 2;
      const optH = 0.45; // slightly taller
      
      // Pin options to same vertical region as standard layout
      const startY = PRES_LAYOUT.height - 0.4 - (2 * optH + gapY);
      
      s.optionList.forEach((opt, idx) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const optX = layout.body.x + (col * (optW + gapX));
        const optY = startY + (row * (optH + gapY));
        
        slide.addShape(pres.ShapeType.rect, {
            x: optX,
            y: optY,
            w: optW,
            h: optH,
            fill: { color: "F9FAFB" }, // zinc-50
            line: { color: "F4F4F5", width: 1 }, // zinc-100
            rectRadius: 0.05
        });
        
        slide.addText(opt, {
            x: optX + 0.05,
            y: optY,
            w: optW - 0.1,
            h: optH,
            color: qTheme.options.color,
            fontSize: metrics.optionsFontSize,
            valign: "middle",
            margin: 0
        });
      });
    }

  } else {
    // Title
    slide.addText(s.content, {
      x: layout.body.x,
      y: layout.body.y,
      w: layout.body.w,
      h: layout.body.h,
      fontSize: qTheme.body.fontSize - 2,
      color: qTheme.body.color,
      align: "left",
      valign: "top",
      wrap: true,
      fit: 'shrink',
      margin: 0
    });
  }

  // Title / Metadata header (bottom right)
  if (s.exam_full_text) {
    slide.addText(s.exam_full_text, {
      x: layout.body.x,
      y: PRES_LAYOUT.height - 0.3,
      w: layout.body.w,
      h: 0.2,
      fontSize: qTheme.header.examSize,
      color: "#6b7280",
      align: "right",
      bold: true,
      margin: 0
    });
  }
}
