import { Question } from "../gemini";
import { RenderedSlide } from "../slide-utils";

export interface PPTConfig {
  title: string;
  themeColor: string;
  accentColor: string;
  layout?: 'standard' | 'solving';
}

export interface LayoutOptions {
  fontSize: {
    english: number;
    hindi: number;
    options: number;
  };
  margins: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  optionsArea: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}
