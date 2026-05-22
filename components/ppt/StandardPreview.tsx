'use client'

import React from 'react';
import { SLIDE_THEME, PRES_LAYOUT } from '@/lib/presentation-constants';
import { RenderedSlide } from '@/lib/slide-utils';
import { calculateStandardLayout } from '@/lib/ppt/layout-engine';

import { LanguageMode } from '@/lib/ppt/types';

interface Props {
  slide: RenderedSlide;
  themeColor: string;
  languageMode?: LanguageMode;
}

export function StandardPreview({ slide, themeColor, languageMode = 'both' }: Props) {
  const { questionSlide: qTheme } = SLIDE_THEME;
  const layout = qTheme.layouts.standard;

  let english = slide.english || slide.content;
  let hindi = slide.hindi || "";

  if (languageMode === 'english') hindi = "";
  if (languageMode === 'hindi') english = "";
  
  const { baseFontSize, hindiFontSize, optionsFontSize } = calculateStandardLayout(english, hindi, layout.body.w);
  
  const toVw = (pt: number) => `${(pt / (PRES_LAYOUT.width * 72)) * 100}cqw`;

  return (
    <div className="w-full h-full relative bg-white p-[4%] flex flex-col" style={{ fontFamily: 'var(--font-hindi), sans-serif' }}>
      {/* Content Block (English + Hindi) */}
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {english ? (
          <div className="text-[#1f2937] leading-[1.3] mb-[1%]" style={{ fontSize: toVw(baseFontSize) }}>
            {slide.qNum && !slide.isContinuation && <span className="font-bold text-[#111827] mr-1.5">{slide.qNum}.</span>}
            {english}
          </div>
        ) : null}

        {hindi ? (
          <div className={`text-[#374151] leading-[1.4]` + (english ? " mt-[1%]" : "")} style={{ fontSize: toVw(hindiFontSize) }}>
            {!english && slide.qNum && !slide.isContinuation && <span className="font-bold text-[#111827] mr-1.5">{slide.qNum}.</span>}
            {hindi}
          </div>
        ) : null}
      </div>

      {/* Vertical spacer if options exist, otherwise auto margin pushes badge to bottom */}
      
      {/* Options Grid */}
      {slide.optionList && slide.optionList.length >= 4 && (
        <div className="mt-[2%] h-[20%] grid grid-cols-2 gap-x-[2%] gap-y-[4%] text-[#4b5563] flex-shrink-0" style={{ fontSize: toVw(optionsFontSize) }}>
          {slide.optionList.map((opt, idx) => (
            <div key={idx} className="bg-zinc-50/80 px-2 py-1.5 rounded-sm border border-zinc-100 flex items-center truncate">
              {opt}
            </div>
          ))}
        </div>
      )}

      {/* Custom Exam Badge (if available) - positioned at the bottom right */}
      {slide.exam_full_text && (
        <div className="mt-auto pt-[2%] flex justify-end flex-shrink-0">
          <div className="text-[#6b7280] font-semibold text-right max-w-full truncate" style={{ fontSize: toVw(10) }}>
            {slide.exam_full_text}
          </div>
        </div>
      )}
    </div>
  );
}
