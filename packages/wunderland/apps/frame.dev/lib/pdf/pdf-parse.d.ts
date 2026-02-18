/**
 * Type declarations for pdf-parse module
 */
declare module 'pdf-parse' {
  interface PDFInfo {
    Title?: string
    Author?: string
    Subject?: string
    Creator?: string
    Producer?: string
    CreationDate?: string
    ModDate?: string
    [key: string]: unknown
  }

  interface PDFData {
    numpages: number
    numrender: number
    info: PDFInfo
    metadata: unknown
    text: string
    version: string
  }

  interface PDFParseOptions {
    pagerender?: (pageData: unknown) => string
    max?: number
  }

  function parse(
    dataBuffer: Buffer,
    options?: PDFParseOptions
  ): Promise<PDFData>

  export = parse
}
