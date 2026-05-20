export const PRES_W = 10;
export const PRES_H = 5.625;

export interface LayoutCalculations {
  baseFontSize: number;
  hindiFontSize: number;
  optionsFontSize: number;
  englishHeight: number;
  hindiHeight: number;
}

export function calculateStandardLayout(english: string, hindi: string, usableW: number): LayoutCalculations {
  const totalLen = english.length + (hindi?.length || 0);
  let baseFontSize = 18; 
  
  if (totalLen > 600) baseFontSize = 17;
  if (totalLen > 1000) baseFontSize = 16;
  if (totalLen > 1500) baseFontSize = 14.5;
  if (totalLen > 2000) baseFontSize = 13.5;

  const getHeights = (fontSize: number) => {
    const charsPerLineEng = Math.floor(usableW * (100 / fontSize) * 0.7); 
    const engLines = Math.ceil((english.length + 5) / charsPerLineEng) || 1;
    const englishHeight = (engLines * (fontSize / 72) * 1.5) + 0.1;

    const origFontSize = fontSize - 4;
    const hindiSize = Math.max(origFontSize * 0.95, 8.5) + 4;
    const charsPerLineHindi = Math.floor(usableW * (100 / hindiSize) * 0.6); 
    const hindiLines = Math.ceil((hindi?.length || 0) / charsPerLineHindi) || 1;
    const hindiHeight = hindi ? (hindiLines * (hindiSize / 72) * 1.6) + 0.15 : 0;
    
    return { fontSize, hindiSize, englishHeight, hindiHeight };
  };

  let metrics = getHeights(baseFontSize);
  
  // Safe bounds check: if total height > 3.8 inches (reserving space for options/meta), shrink further
  while ((metrics.englishHeight + metrics.hindiHeight > 3.8) && metrics.fontSize > 12) {
    metrics = getHeights(metrics.fontSize - 0.5);
  }

  return {
    baseFontSize: metrics.fontSize,
    hindiFontSize: metrics.hindiSize,
    optionsFontSize: Math.max((metrics.fontSize - 4) * 0.85, 9),
    englishHeight: metrics.englishHeight,
    hindiHeight: metrics.hindiHeight
  };
}

export function calculateSolvingLayout(english: string, hindi: string, usableW: number): LayoutCalculations {
  const totalLen = english.length + (hindi?.length || 0);
  let baseFontSize = 17;
  
  if (totalLen > 500) baseFontSize = 16;
  if (totalLen > 800) baseFontSize = 15;
  if (totalLen > 1200) baseFontSize = 13.5;
  if (totalLen > 1600) baseFontSize = 12.5;

  const getHeights = (fontSize: number) => {
    const charsPerLineEng = Math.floor(usableW * (100 / fontSize) * 0.7);
    const engLines = Math.ceil((english.length + 5) / charsPerLineEng) || 1;
    const englishHeight = (engLines * (fontSize / 72) * 1.5) + 0.1;

    const origFontSize = fontSize - 4;
    const hindiSize = Math.max(origFontSize * 0.95, 8) + 4;
    const charsPerLineHindi = Math.floor(usableW * (100 / hindiSize) * 0.6);
    const hindiLines = Math.ceil((hindi?.length || 0) / charsPerLineHindi) || 1;
    const hindiHeight = hindi ? (hindiLines * (hindiSize / 72) * 1.6) + 0.15 : 0;
    
    return { fontSize, hindiSize, englishHeight, hindiHeight };
  };

  let metrics = getHeights(baseFontSize);

  // Safe bounds check for solving area (narrower, 4.4w)
  while ((metrics.englishHeight + metrics.hindiHeight > 3.8) && metrics.fontSize > 11) {
    metrics = getHeights(metrics.fontSize - 0.5);
  }

  return {
    baseFontSize: metrics.fontSize,
    hindiFontSize: metrics.hindiSize,
    optionsFontSize: Math.max((metrics.fontSize - 4) * 0.85, 9),
    englishHeight: metrics.englishHeight,
    hindiHeight: metrics.hindiHeight
  };
}
