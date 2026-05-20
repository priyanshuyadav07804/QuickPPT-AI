import pptxgen from "pptxgenjs";
import { Question } from "./gemini";
import { SLIDE_THEME } from "./presentation-constants";
import { getRenderedSlides } from "./slide-utils";

export { generatePPTX } from "./ppt/generator";
export type { PPTConfig } from "./ppt/types";

