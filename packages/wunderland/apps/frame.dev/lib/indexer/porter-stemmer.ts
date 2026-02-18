/**
 * Porter Stemmer Implementation
 *
 * Reduces English words to their root/stem form using the Porter Stemming Algorithm (1980).
 * Pure TypeScript implementation - works in browser and Node.js.
 *
 * @module lib/indexer/porter-stemmer
 */

/**
 * Porter Stemmer class
 * Based on the Porter Stemming Algorithm
 */
export class PorterStemmer {
  private step2list: Record<string, string> = {
    ational: 'ate',
    tional: 'tion',
    enci: 'ence',
    anci: 'ance',
    izer: 'ize',
    bli: 'ble',
    alli: 'al',
    entli: 'ent',
    eli: 'e',
    ousli: 'ous',
    ization: 'ize',
    ation: 'ate',
    ator: 'ate',
    alism: 'al',
    iveness: 'ive',
    fulness: 'ful',
    ousness: 'ous',
    aliti: 'al',
    iviti: 'ive',
    biliti: 'ble',
    logi: 'log',
  }

  private step3list: Record<string, string> = {
    icate: 'ic',
    ative: '',
    alize: 'al',
    iciti: 'ic',
    ical: 'ic',
    ful: '',
    ness: '',
  }

  // Consonant and vowel patterns
  private c = '[^aeiou]'
  private v = '[aeiouy]'
  private C: string
  private V: string
  private mgr0: RegExp
  private meq1: RegExp
  private mgr1: RegExp
  private s_v: RegExp

  constructor() {
    this.C = this.c + '[^aeiouy]*'
    this.V = this.v + '[aeiou]*'
    this.mgr0 = new RegExp('^(' + this.C + ')?' + this.V + this.C)
    this.meq1 = new RegExp('^(' + this.C + ')?' + this.V + this.C + '(' + this.V + ')?$')
    this.mgr1 = new RegExp('^(' + this.C + ')?' + this.V + this.C + this.V + this.C)
    this.s_v = new RegExp('^(' + this.C + ')?' + this.v)
  }

  /**
   * Stem a word to its root form
   */
  stem(w: string): string {
    if (w.length < 3) return w

    let word = w
    const firstch = word.charAt(0)

    if (firstch === 'y') {
      word = firstch.toUpperCase() + word.slice(1)
    }

    // Step 1a
    let re = /^(.+?)(ss|i)es$/
    let re2 = /^(.+?)([^s])s$/

    if (re.test(word)) {
      word = word.replace(re, '$1$2')
    } else if (re2.test(word)) {
      word = word.replace(re2, '$1$2')
    }

    // Step 1b
    re = /^(.+?)eed$/
    re2 = /^(.+?)(ed|ing)$/

    if (re.test(word)) {
      const fp = re.exec(word)
      if (fp && this.mgr0.test(fp[1])) {
        word = word.replace(/.$/, '')
      }
    } else if (re2.test(word)) {
      const fp = re2.exec(word)
      if (fp) {
        const stem = fp[1]
        if (this.s_v.test(stem)) {
          word = stem
          const re2b = /(at|bl|iz)$/
          const re3 = /([^aeiouylsz])\1$/
          const re4 = new RegExp('^' + this.C + this.v + '[^aeiouwxy]$')

          if (re2b.test(word)) {
            word = word + 'e'
          } else if (re3.test(word)) {
            word = word.replace(/.$/, '')
          } else if (re4.test(word)) {
            word = word + 'e'
          }
        }
      }
    }

    // Step 1c
    re = /^(.+?)y$/
    if (re.test(word)) {
      const fp = re.exec(word)
      if (fp) {
        const stem = fp[1]
        if (this.s_v.test(stem)) {
          word = stem + 'i'
        }
      }
    }

    // Step 2
    re =
      /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/
    if (re.test(word)) {
      const fp = re.exec(word)
      if (fp) {
        const stem = fp[1]
        const suffix = fp[2]
        if (this.mgr0.test(stem)) {
          word = stem + this.step2list[suffix]
        }
      }
    }

    // Step 3
    re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/
    if (re.test(word)) {
      const fp = re.exec(word)
      if (fp) {
        const stem = fp[1]
        const suffix = fp[2]
        if (this.mgr0.test(stem)) {
          word = stem + this.step3list[suffix]
        }
      }
    }

    // Step 4
    re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/
    re2 = /^(.+?)(s|t)(ion)$/

    if (re.test(word)) {
      const fp = re.exec(word)
      if (fp) {
        const stem = fp[1]
        if (this.mgr1.test(stem)) {
          word = stem
        }
      }
    } else if (re2.test(word)) {
      const fp = re2.exec(word)
      if (fp) {
        const stem = fp[1] + fp[2]
        if (this.mgr1.test(stem)) {
          word = stem
        }
      }
    }

    // Step 5
    re = /^(.+?)e$/
    if (re.test(word)) {
      const fp = re.exec(word)
      if (fp) {
        const stem = fp[1]
        const re3 = new RegExp('^' + this.C + this.v + '[^aeiouwxy]$')
        if (this.mgr1.test(stem) || (this.meq1.test(stem) && !re3.test(stem))) {
          word = stem
        }
      }
    }

    re = /ll$/
    if (re.test(word) && this.mgr1.test(word)) {
      word = word.replace(/.$/, '')
    }

    if (firstch === 'y') {
      word = firstch.toLowerCase() + word.slice(1)
    }

    return word
  }
}

// Singleton instance
let stemmerInstance: PorterStemmer | null = null

/**
 * Get a shared Porter Stemmer instance
 */
export function getStemmer(): PorterStemmer {
  if (!stemmerInstance) {
    stemmerInstance = new PorterStemmer()
  }
  return stemmerInstance
}

export default PorterStemmer
