declare module 'dompurify' {
  interface SanitizeConfig {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    FORBID_TAGS?: string[];
    FORBID_ATTR?: string[];
    [key: string]: unknown;
  }

  export function sanitize(input: string, config?: SanitizeConfig): string;

  export interface DOMPurify {
    sanitize(input: string, config?: SanitizeConfig): string;
  }

  const DomPurify: DOMPurify;
  export default DomPurify;
}
