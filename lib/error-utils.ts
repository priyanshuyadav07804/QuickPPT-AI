export function sanitizeError(errorMsg: string): string {
  if (!errorMsg) return "";
  
  // Mask potential API keys, access tokens, UUIDs, or common secret patterns
  let sanitized = errorMsg.replace(/(eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,})/g, '[REDACTED_JWT]');
  // Pattern to catch AI key (Gemini usually AI...)
  sanitized = sanitized.replace(/(AIza[0-9A-Za-z-_]{35})/g, '[REDACTED_API_KEY]');
  // Catch any strings that look closely like a secret or generic keys
  sanitized = sanitized.replace(/(api[_-]?key)=?([a-zA-Z0-9\-_]{20,})/gi, '$1=[REDACTED_KEY]');
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/gi, 'Bearer [REDACTED_TOKEN]');
  sanitized = sanitized.replace(/([a-zA-Z0-9_-]+_secret_[a-zA-Z0-9_-]+)/gi, '[REDACTED_SECRET]');
  
  return sanitized;
}
