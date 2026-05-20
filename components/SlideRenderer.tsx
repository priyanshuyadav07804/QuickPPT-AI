'use client'

import React from 'react';
import { SLIDE_THEME, PRES_LAYOUT } from '@/lib/presentation-constants';
import { cn } from '@/lib/utils';
import { RenderedSlide } from '@/lib/slide-utils';

interface SlideRendererProps {
  slide: RenderedSlide;
  themeColor: string;
  title: string;
  className?: string;
  zoom?: number;
  style?: React.CSSProperties;
  layout?: 'standard' | 'solving';
}

import { StandardPreview } from './ppt/StandardPreview';
import { SolvingPreview } from './ppt/SolvingPreview';

export function SlideRenderer({ 
  slide, 
  themeColor, 
  title, 
  className, 
  zoom = 1, 
  style, 
  layout = 'standard' 
}: SlideRendererProps) {
  const { titleSlide: titleTheme } = SLIDE_THEME;
  
  const scaleStyles = {
    '--slide-scale': zoom,
  } as React.CSSProperties;

  return (
    <div 
      className={cn(
        "relative bg-white overflow-hidden shadow-2xl transition-all duration-300",
        "aspect-video font-hindi", 
        className
      )}
      style={{
        width: '100%',
        fontSize: '16px', 
        ...scaleStyles,
        ...style
      }}
    >
      {slide.type === 'title' ? (
        <div className="w-full h-full flex flex-col items-center justify-center relative" style={{ backgroundColor: themeColor }}>
           <div 
             className="absolute flex items-center justify-center text-center font-bold text-white whitespace-pre-wrap px-4"
             style={{
               left: `${(titleTheme.title.x / PRES_LAYOUT.width) * 100}%`,
               top: `${(titleTheme.title.y / PRES_LAYOUT.height) * 100}%`,
               width: `${(titleTheme.title.w / PRES_LAYOUT.width) * 100}%`,
               fontSize: `${(titleTheme.title.fontSize / (PRES_LAYOUT.width * 72)) * 100}cqw`, 
             }}
           >
             {title}
           </div>
        </div>
      ) : (
        layout === 'solving' ? (
          <SolvingPreview slide={slide} />
        ) : (
          <StandardPreview slide={slide} themeColor={themeColor} />
        )
      )}
      
      <style jsx>{`
        div {
          container-type: size;
        }
      `}</style>
    </div>
  );
}
