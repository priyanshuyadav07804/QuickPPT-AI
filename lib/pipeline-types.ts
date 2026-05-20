export enum PipelineStep {
  UPLOADED = 'uploaded',
  EXTRACTING_TEXT = 'extracting_text',
  TEXT_EXTRACTED = 'text_extracted',
  PROCESSING_AI = 'processing_ai',
  AI_PROCESSED = 'ai_processed',
  JSON_GENERATED = 'json_generated',
  GENERATING_PPT = 'generating_ppt',
  PPT_GENERATED = 'ppt_generated',
  EXPORT_READY = 'export_ready',
  FAILED = 'failed',
  COMPLETED = 'completed'
}
