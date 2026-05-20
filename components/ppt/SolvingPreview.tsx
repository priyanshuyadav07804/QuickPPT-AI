'use client'

import React from 'react';
import { SLIDE_THEME, PRES_LAYOUT } from '@/lib/presentation-constants';
import { RenderedSlide } from '@/lib/slide-utils';
import { calculateSolvingLayout } from '@/lib/ppt/layout-engine';

interface Props {
  slide: RenderedSlide;
}

export function SolvingPreview({ slide }: Props) {
  const { questionSlide: qTheme } = SLIDE_THEME;
  const layout = qTheme.layouts.solving;

  const english = slide.english || slide.content;
  const hindi = slide.hindi || "";
  
  const { baseFontSize, hindiFontSize, optionsFontSize } = calculateSolvingLayout(english, hindi, layout.body.w);
  
  const toVw = (pt: number) => `${(pt / (PRES_LAYOUT.width * 72)) * 100}cqw`;

  return (
    <div className="w-full h-full relative bg-white flex" style={{ fontFamily: 'var(--font-hindi), sans-serif' }}>
      {/* Solving Side */}
      <div className="w-[50%] h-full border-r border-dashed border-zinc-200 flex items-center justify-center relative">
        <span className="text-[10px] text-zinc-300 uppercase tracking-widest rotate-90">Solving Area</span>
      </div>

      {/* Content Side */}
      <div className="w-[50%] h-full p-[4%] flex flex-col justify-start overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* English Block */}
          <div className="text-[#1f2937] leading-[1.3] mb-[2%]" style={{ fontSize: toVw(baseFontSize) }}>
            {slide.qNum && !slide.isContinuation && <span className="font-bold text-[#111827] mr-1.5">{slide.qNum}.</span>}
            {english}
          </div>

          {/* Hindi Block */}
          {hindi && (
            <div className="text-[#374151] leading-[1.4] mt-[1%]" style={{ fontSize: toVw(hindiFontSize) }}>
              {hindi}
            </div>
          )}
        </div>

        {/* Options 2x2 */}
        {slide.optionList && slide.optionList.length >= 4 && (
          <div className="mt-[2%] h-[20%] grid grid-cols-2 gap-x-[2%] gap-y-[4%] text-[#4b5563] flex-shrink-0" style={{ fontSize: toVw(optionsFontSize) }}>
            {slide.optionList.map((opt, idx) => (
              <div key={idx} className="bg-zinc-50/80 px-1.5 py-1 rounded-sm border border-zinc-100 flex items-center truncate">
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
    </div>
  );
}
