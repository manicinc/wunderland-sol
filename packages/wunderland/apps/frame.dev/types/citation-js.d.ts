/**
 * Type declarations for citation-js
 * @see https://citation.js.org/
 */

declare module 'citation-js' {
  interface CiteOptions {
    format?: 'string' | 'object' | 'html' | 'text'
    type?: 'html' | 'string' | 'text'
    style?: string
    lang?: string
    template?: string
  }

  interface CiteData {
    id?: string
    type?: string
    title?: string
    author?: Array<{ given?: string; family?: string }>
    issued?: { 'date-parts'?: number[][] }
    DOI?: string
    URL?: string
    ISSN?: string
    ISBN?: string
    publisher?: string
    'container-title'?: string
    volume?: string | number
    issue?: string | number
    page?: string
    [key: string]: unknown
  }

  class Cite {
    constructor(data?: string | object | object[], options?: CiteOptions)

    static async(data: string | object | object[], options?: CiteOptions): Promise<Cite>

    add(data: string | object | object[]): Cite

    set(data: string | object | object[]): Cite

    reset(): Cite

    data: CiteData[]

    format(format: string, options?: CiteOptions): string

    get(options?: CiteOptions): CiteData[] | string
  }

  export default Cite
}

declare module '@citation-js/plugin-csl' {
  // CSL plugin for citation-js
}
