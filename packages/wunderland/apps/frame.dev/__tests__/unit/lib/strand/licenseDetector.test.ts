/**
 * Tests for license detection service
 * @module __tests__/unit/lib/strand/licenseDetector.test
 */

import { describe, it, expect } from 'vitest'
import {
  detectLicenseFromContent,
  detectLicenseFromHTML,
  detectLicenseFromGitHub,
  detectLicenseFromAcademic,
  detectLicenseFromPackageJson,
  detectLicense,
  detectLicenseOrDefault,
} from '@/lib/strand/licenseDetector'

// ============================================================================
// detectLicenseFromContent TESTS
// ============================================================================

describe('detectLicenseFromContent', () => {
  describe('MIT license detection', () => {
    it('detects MIT from full license text', () => {
      const content = 'Permission is hereby granted, free of charge, to any person obtaining a copy'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('mit')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('detects MIT License header', () => {
      const content = '/* MIT License\n * Copyright 2024 */'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('mit')
    })

    it('detects MIT from SPDX identifier', () => {
      const content = '// SPDX-License-Identifier: MIT\nconst x = 1;'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('mit')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.95)
    })

    it('detects "Licensed under the MIT" phrase', () => {
      const content = 'This software is Licensed under the MIT license.'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('mit')
    })
  })

  describe('Apache 2.0 license detection', () => {
    it('detects Apache 2.0 from license text', () => {
      const content = 'Licensed under the Apache License, Version 2.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('apache-2.0')
    })

    it('detects Apache 2.0 from SPDX identifier', () => {
      const content = '// SPDX-License-Identifier: Apache-2.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('apache-2.0')
    })

    it('detects Apache License 2 variation', () => {
      const content = 'Apache License Version 2.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('apache-2.0')
    })
  })

  describe('GPL v3 license detection', () => {
    it('detects GPL v3 from license text', () => {
      const content = 'GNU General Public License version 3'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('gpl-3.0')
    })

    it('detects GPL v3 from SPDX identifier', () => {
      const content = '// SPDX-License-Identifier: GPL-3.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('gpl-3.0')
    })

    it('detects GPL3 shorthand', () => {
      const content = 'Licensed under GPLv3'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('gpl-3.0')
    })
  })

  describe('BSD 3-Clause license detection', () => {
    it('detects BSD 3-Clause from license name', () => {
      const content = 'BSD 3-Clause License\n\nCopyright (c) 2024'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('bsd-3-clause')
    })

    it('detects BSD from redistribution clause', () => {
      const content = 'Redistribution and use in source and binary forms, with or without modification'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('bsd-3-clause')
    })

    it('detects BSD from SPDX identifier', () => {
      const content = '// SPDX-License-Identifier: BSD-3-Clause'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('bsd-3-clause')
    })
  })

  describe('Creative Commons license detection', () => {
    it('detects CC-BY 4.0', () => {
      const content = 'Creative Commons Attribution 4.0 International'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by')
    })

    it('detects CC BY 4.0 shorthand', () => {
      const content = 'Licensed under CC BY 4.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by')
    })

    it('detects CC BY-SA 4.0', () => {
      const content = 'This work is licensed under CC BY-SA 4.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by-sa')
    })

    it('detects CC BY-NC 4.0', () => {
      const content = 'CC BY-NC 4.0 License'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by-nc')
    })

    it('detects CC BY-NC-SA 4.0', () => {
      const content = 'CC BY-NC-SA 4.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by-nc-sa')
    })

    it('detects CC BY-ND 4.0', () => {
      const content = 'CC BY-ND 4.0 International'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by-nd')
    })

    it('detects CC BY-NC-ND 4.0', () => {
      const content = 'CC BY-NC-ND 4.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by-nc-nd')
    })

    it('detects CC0 / Public Domain', () => {
      const content = 'This work is released under CC0 1.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc0')
    })

    it('detects Public Domain dedication', () => {
      const content = 'Public Domain - no rights reserved'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc0')
    })
  })

  describe('Commercial / All Rights Reserved detection', () => {
    it('detects All Rights Reserved', () => {
      const content = 'Copyright 2024. All Rights Reserved.'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('commercial')
    })

    it('detects Proprietary license', () => {
      const content = 'This is Proprietary software.'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('commercial')
    })
  })

  describe('Private license detection', () => {
    it('detects Confidential', () => {
      const content = 'Confidential - Internal Use Only'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('private')
    })

    it('detects Private', () => {
      const content = 'Private document - do not distribute'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('private')
    })

    it('detects Internal Use Only', () => {
      const content = 'Internal Use Only - Not for distribution'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('private')
    })
  })

  describe('license URL detection', () => {
    it('detects MIT from OSI URL', () => {
      const content = 'See https://opensource.org/licenses/MIT for details'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('mit')
      expect(result?.licenseUrl).toContain('opensource.org')
    })

    it('detects Apache from apache.org URL', () => {
      const content = 'License: http://apache.org/licenses/LICENSE-2.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('apache-2.0')
    })

    it('detects CC-BY from creativecommons.org URL', () => {
      const content = 'https://creativecommons.org/licenses/by/4.0/'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by')
    })

    it('detects CC0 from publicdomain URL', () => {
      const content = 'https://creativecommons.org/publicdomain/zero/1.0/'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc0')
    })
  })

  describe('edge cases', () => {
    it('returns null for empty content', () => {
      expect(detectLicenseFromContent('')).toBeNull()
    })

    it('returns null for very short content', () => {
      expect(detectLicenseFromContent('Hello')).toBeNull()
    })

    it('returns null for content without license', () => {
      const content = 'This is just regular content without any license information.'
      expect(detectLicenseFromContent(content)).toBeNull()
    })

    it('only checks first 2000 characters for header patterns', () => {
      const content = 'x'.repeat(2100) + 'MIT License'
      const result = detectLicenseFromContent(content)
      // Should find MIT from URL patterns that check full content, or return null
      // Pattern matching on header area only should not find it
      expect(result?.source).not.toBe('content')
    })

    it('sets source to content', () => {
      const content = 'MIT License'
      const result = detectLicenseFromContent(content)
      expect(result?.source).toBe('content')
    })
  })
})

// ============================================================================
// detectLicenseFromHTML TESTS
// ============================================================================

describe('detectLicenseFromHTML', () => {
  describe('link rel="license" detection', () => {
    it('detects license from link tag', () => {
      const html = '<link rel="license" href="https://creativecommons.org/licenses/by/4.0/">'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('cc-by')
      expect(result?.source).toBe('html')
    })

    it('detects MIT from link tag', () => {
      const html = '<link rel="license" href="https://opensource.org/licenses/MIT">'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('mit')
    })

    it('handles single quotes in attributes', () => {
      const html = "<link rel='license' href='https://creativecommons.org/licenses/by-sa/4.0/'>"
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('cc-by-sa')
    })
  })

  describe('dc.rights meta tag detection', () => {
    it('detects license from dc.rights meta tag', () => {
      const html = '<meta name="dc.rights" content="CC BY 4.0">'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('cc-by')
    })

    it('detects MIT from dc.rights', () => {
      const html = '<meta name="dc.rights" content="MIT">'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('mit')
    })
  })

  describe('schema.org license property detection', () => {
    it('detects license from schema.org JSON-LD', () => {
      const html = '<script type="application/ld+json">{"license": "https://creativecommons.org/licenses/by-nc/4.0/"}</script>'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('cc-by-nc')
    })

    it('detects Apache from schema.org', () => {
      const html = '{"license": "https://apache.org/licenses/LICENSE-2.0"}'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('apache-2.0')
    })
  })

  describe('Creative Commons badge detection', () => {
    it('detects CC-BY from badge image', () => {
      const html = '<img src="https://creativecommons.org/l/by/4.0/88x31.png">'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('cc-by')
    })

    it('detects CC-BY-SA from badge', () => {
      const html = '<a href="https://creativecommons.org/l/by-sa/4.0/">'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('cc-by-sa')
    })

    it('detects CC-BY-NC from badge', () => {
      const html = 'creativecommons.org/l/by-nc/4.0/'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('cc-by-nc')
    })
  })

  describe('footer license detection', () => {
    it('detects license in footer', () => {
      const html = '<footer><p>MIT License</p></footer>'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('mit')
    })

    it('detects CC license in footer', () => {
      const html = '<footer>Content licensed under CC BY 4.0</footer>'
      const result = detectLicenseFromHTML(html)
      expect(result?.license).toBe('cc-by')
    })

    it('applies lower confidence for footer detection', () => {
      const html = '<footer>MIT License</footer>'
      const result = detectLicenseFromHTML(html)
      expect(result?.confidence).toBeLessThan(0.9)
    })
  })

  describe('edge cases', () => {
    it('returns null for empty HTML', () => {
      expect(detectLicenseFromHTML('')).toBeNull()
    })

    it('returns null for null HTML', () => {
      expect(detectLicenseFromHTML(null as any)).toBeNull()
    })

    it('returns null for HTML without license', () => {
      const html = '<html><body><p>Hello World</p></body></html>'
      expect(detectLicenseFromHTML(html)).toBeNull()
    })
  })
})

// ============================================================================
// detectLicenseFromGitHub TESTS
// ============================================================================

describe('detectLicenseFromGitHub', () => {
  it('detects MIT license from GitHub API', () => {
    const result = detectLicenseFromGitHub({
      owner: 'facebook',
      repo: 'react',
      license: 'MIT',
    })
    expect(result?.license).toBe('mit')
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    expect(result?.source).toBe('github')
  })

  it('detects Apache 2.0 from GitHub API', () => {
    const result = detectLicenseFromGitHub({
      owner: 'tensorflow',
      repo: 'tensorflow',
      license: 'Apache-2.0',
    })
    expect(result?.license).toBe('apache-2.0')
  })

  it('generates correct license URL', () => {
    const result = detectLicenseFromGitHub({
      owner: 'owner',
      repo: 'repo',
      license: 'MIT',
    })
    expect(result?.licenseUrl).toContain('github.com/owner/repo')
  })

  it('returns null when no license provided', () => {
    const result = detectLicenseFromGitHub({
      owner: 'owner',
      repo: 'repo',
    })
    expect(result).toBeNull()
  })

  it('returns null for unrecognized license', () => {
    const result = detectLicenseFromGitHub({
      owner: 'owner',
      repo: 'repo',
      license: 'CUSTOM-LICENSE-XYZ',
    })
    expect(result).toBeNull()
  })

  it('includes reasoning in result', () => {
    const result = detectLicenseFromGitHub({
      owner: 'owner',
      repo: 'repo',
      license: 'MIT',
    })
    expect(result?.reasoning).toContain('GitHub API')
  })
})

// ============================================================================
// detectLicenseFromAcademic TESTS
// ============================================================================

describe('detectLicenseFromAcademic', () => {
  describe('open access detection', () => {
    it('detects CC-BY for open access content when isAcademic is set', () => {
      // Note: The function requires isAcademic OR sourceUrl to be set
      const result = detectLicenseFromAcademic({ isAcademic: true, isOpenAccess: true })
      expect(result?.license).toBe('cc-by')
      expect(result?.source).toBe('academic')
    })

    it('has lower confidence for inferred academic license', () => {
      const result = detectLicenseFromAcademic({ isAcademic: true, isOpenAccess: true })
      expect(result?.confidence).toBeLessThanOrEqual(0.75)
    })
  })

  describe('arXiv detection', () => {
    it('detects CC-BY for arXiv preprints', () => {
      const result = detectLicenseFromAcademic({
        sourceUrl: 'https://arxiv.org/abs/2301.12345',
      })
      expect(result?.license).toBe('cc-by')
      expect(result?.reasoning).toContain('arXiv')
    })
  })

  describe('bioRxiv detection', () => {
    it('detects CC-BY-NC-ND for bioRxiv preprints', () => {
      const result = detectLicenseFromAcademic({
        sourceUrl: 'https://www.biorxiv.org/content/10.1101/2023.01.01',
      })
      expect(result?.license).toBe('cc-by-nc-nd')
      expect(result?.reasoning).toContain('bioRxiv')
    })
  })

  describe('medRxiv detection', () => {
    it('detects CC-BY-NC-ND for medRxiv preprints', () => {
      const result = detectLicenseFromAcademic({
        sourceUrl: 'https://www.medrxiv.org/content/10.1101/2023.01.01',
      })
      expect(result?.license).toBe('cc-by-nc-nd')
      expect(result?.reasoning).toContain('medRxiv')
    })
  })

  describe('non-open-access academic content', () => {
    it('returns fair-use for academic non-open-access', () => {
      const result = detectLicenseFromAcademic({
        isAcademic: true,
        isOpenAccess: false,
      })
      expect(result?.license).toBe('fair-use')
      expect(result?.reasoning).toContain('fair use')
    })
  })

  describe('edge cases', () => {
    it('returns null for non-academic content', () => {
      const result = detectLicenseFromAcademic({})
      expect(result).toBeNull()
    })

    it('returns null for empty options', () => {
      const result = detectLicenseFromAcademic({ sourceUrl: 'https://example.com' })
      expect(result).toBeNull()
    })
  })
})

// ============================================================================
// detectLicenseFromPackageJson TESTS
// ============================================================================

describe('detectLicenseFromPackageJson', () => {
  it('detects MIT license', () => {
    const content = JSON.stringify({ name: 'test', license: 'MIT' })
    const result = detectLicenseFromPackageJson(content)
    expect(result?.license).toBe('mit')
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    expect(result?.source).toBe('file')
  })

  it('detects Apache 2.0 license', () => {
    const content = JSON.stringify({ license: 'Apache-2.0' })
    const result = detectLicenseFromPackageJson(content)
    expect(result?.license).toBe('apache-2.0')
  })

  it('returns null for unsupported ISC license', () => {
    // Note: ISC is not in the StrandLicense type, so parseLicense returns 'none'
    // and detectLicenseFromPackageJson returns null for 'none'
    const content = JSON.stringify({ license: 'ISC' })
    const result = detectLicenseFromPackageJson(content)
    expect(result).toBeNull()
  })

  it('detects GPL-3.0 license', () => {
    const content = JSON.stringify({ license: 'GPL-3.0' })
    const result = detectLicenseFromPackageJson(content)
    expect(result?.license).toBe('gpl-3.0')
  })

  it('returns null for invalid JSON', () => {
    const result = detectLicenseFromPackageJson('not json')
    expect(result).toBeNull()
  })

  it('returns null when no license field', () => {
    const content = JSON.stringify({ name: 'test', version: '1.0.0' })
    const result = detectLicenseFromPackageJson(content)
    expect(result).toBeNull()
  })

  it('returns null for unrecognized license', () => {
    const content = JSON.stringify({ license: 'CUSTOM-PROPRIETARY' })
    const result = detectLicenseFromPackageJson(content)
    expect(result).toBeNull()
  })

  it('includes reasoning in result', () => {
    const content = JSON.stringify({ license: 'MIT' })
    const result = detectLicenseFromPackageJson(content)
    expect(result?.reasoning).toContain('package.json')
  })
})

// ============================================================================
// detectLicense TESTS (combined detection)
// ============================================================================

describe('detectLicense', () => {
  describe('priority ordering', () => {
    it('prioritizes GitHub license over content', () => {
      const result = detectLicense({
        content: 'BSD 3-Clause License',
        githubRepo: { owner: 'test', repo: 'test', license: 'MIT' },
      })
      expect(result?.license).toBe('mit')
      expect(result?.source).toBe('github')
    })

    it('uses content when no GitHub info', () => {
      const result = detectLicense({
        content: 'MIT License',
      })
      expect(result?.license).toBe('mit')
      expect(result?.source).toBe('content')
    })

    it('uses HTML when no higher priority source', () => {
      const result = detectLicense({
        htmlContent: '<link rel="license" href="https://creativecommons.org/licenses/by/4.0/">',
      })
      expect(result?.license).toBe('cc-by')
      expect(result?.source).toBe('html')
    })
  })

  describe('package.json detection', () => {
    it('detects license from package.json filename', () => {
      const result = detectLicense({
        content: JSON.stringify({ license: 'MIT' }),
        filename: 'package.json',
      })
      expect(result?.license).toBe('mit')
    })

    it('is case-insensitive for package.json', () => {
      const result = detectLicense({
        content: JSON.stringify({ license: 'MIT' }),
        filename: 'PACKAGE.JSON',
      })
      expect(result?.license).toBe('mit')
    })
  })

  describe('academic source detection', () => {
    it('includes academic detection in combined results', () => {
      const result = detectLicense({
        isAcademic: true,
        isOpenAccess: true,
      })
      expect(result?.license).toBe('cc-by')
    })
  })

  describe('confidence-based selection', () => {
    it('returns highest confidence result across different sources', () => {
      // GitHub source has higher confidence (0.95) than academic inference (0.7)
      const result = detectLicense({
        isAcademic: true,
        isOpenAccess: true, // Would infer cc-by at 0.7 confidence
        githubRepo: { owner: 'test', repo: 'test', license: 'MIT' }, // 0.95 confidence
      })
      // GitHub has 0.95 confidence vs academic at 0.7
      expect(result?.license).toBe('mit')
      expect(result?.source).toBe('github')
    })

    it('returns first match when multiple patterns match in content', () => {
      // detectLicenseFromContent returns the first matching pattern
      // MIT pattern appears before Apache in the pattern list
      const result = detectLicense({
        content: 'MIT License - Also Apache License 2.0',
      })
      expect(result?.license).toBe('mit')
    })
  })

  describe('edge cases', () => {
    it('returns null when no license detected', () => {
      const result = detectLicense({
        content: 'Just some regular content',
      })
      expect(result).toBeNull()
    })

    it('returns null for empty options', () => {
      const result = detectLicense({})
      expect(result).toBeNull()
    })
  })
})

// ============================================================================
// detectLicenseOrDefault TESTS
// ============================================================================

describe('detectLicenseOrDefault', () => {
  it('returns detected license when found', () => {
    const result = detectLicenseOrDefault({
      content: 'MIT License',
    })
    expect(result.license).toBe('mit')
  })

  it('returns none when no license detected', () => {
    const result = detectLicenseOrDefault({
      content: 'Regular content without license',
    })
    expect(result.license).toBe('none')
    expect(result.confidence).toBe(1.0)
    expect(result.source).toBe('inferred')
  })

  it('returns none for empty options', () => {
    const result = detectLicenseOrDefault({})
    expect(result.license).toBe('none')
  })

  it('includes reasoning for default', () => {
    const result = detectLicenseOrDefault({})
    expect(result.reasoning).toContain('No license detected')
  })

  it('always returns a result (never null)', () => {
    const result = detectLicenseOrDefault({})
    expect(result).not.toBeNull()
    expect(result.license).toBeDefined()
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('license detection integration', () => {
  it('handles real-world MIT LICENSE file content', () => {
    const content = `MIT License

Copyright (c) 2024 Example Corp

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.`

    const result = detectLicenseFromContent(content)
    expect(result?.license).toBe('mit')
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('handles real-world Apache 2.0 header', () => {
    const content = `/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */`

    const result = detectLicenseFromContent(content)
    expect(result?.license).toBe('apache-2.0')
  })

  it('handles real-world Creative Commons page', () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <link rel="license" href="https://creativecommons.org/licenses/by/4.0/">
  <meta name="dc.rights" content="CC BY 4.0">
</head>
<body>
  <footer>
    <a href="https://creativecommons.org/licenses/by/4.0/">
      <img src="https://creativecommons.org/l/by/4.0/88x31.png">
    </a>
    Licensed under Creative Commons Attribution 4.0
  </footer>
</body>
</html>`

    const result = detectLicenseFromHTML(html)
    expect(result?.license).toBe('cc-by')
  })

  it('handles real-world package.json', () => {
    const content = JSON.stringify({
      name: '@example/package',
      version: '1.0.0',
      license: 'MIT',
      author: 'Example Corp',
      dependencies: {},
    })

    const result = detectLicense({
      content,
      filename: 'package.json',
    })
    expect(result?.license).toBe('mit')
  })
})
