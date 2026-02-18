/**
 * Tests for License Detector
 * @module __tests__/unit/strand/licenseDetector.test
 */

import { describe, it, expect } from 'vitest'
import {
  detectLicense,
  detectLicenseOrDefault,
  detectLicenseFromContent,
  detectLicenseFromHTML,
  detectLicenseFromGitHub,
  detectLicenseFromAcademic,
  detectLicenseFromPackageJson,
} from '@/lib/strand/licenseDetector'

// ============================================================================
// detectLicenseFromContent TESTS
// ============================================================================

describe('detectLicenseFromContent', () => {
  describe('MIT License detection', () => {
    it('detects MIT from "Permission is hereby granted"', () => {
      const content = `
        MIT License

        Copyright (c) 2024

        Permission is hereby granted, free of charge, to any person obtaining a copy
        of this software and associated documentation files.
      `
      const result = detectLicenseFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.license).toBe('mit')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('detects MIT from SPDX identifier', () => {
      const content = `
        // SPDX-License-Identifier: MIT

        function hello() {
          console.log('Hello World');
        }
      `
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('mit')
      expect(result?.confidence).toBe(0.98)
    })

    it('detects MIT from simple header', () => {
      const content = 'Licensed under the MIT License\n\nSome content here...'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('mit')
    })
  })

  describe('Apache License detection', () => {
    it('detects Apache 2.0 from header', () => {
      const content = `
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
      `
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('apache-2.0')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('detects Apache 2.0 from SPDX', () => {
      const content = '// SPDX-License-Identifier: Apache-2.0\n\ncode here'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('apache-2.0')
    })
  })

  describe('GPL License detection', () => {
    it('detects GPL v3', () => {
      const content = `
        This program is free software: you can redistribute it and/or modify
        it under the terms of the GNU General Public License version 3.
      `
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('gpl-3.0')
    })

    it('detects GPL v3 from SPDX', () => {
      const content = '// SPDX-License-Identifier: GPL-3.0\n\ncode'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('gpl-3.0')
    })
  })

  describe('Creative Commons detection', () => {
    it('detects CC BY 4.0', () => {
      const content = `
        This work is licensed under CC BY 4.0.
        To view a copy of this license, visit...
      `
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by')
    })

    it('detects CC BY-SA 4.0', () => {
      const content = 'Licensed under CC BY-SA 4.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by-sa')
    })

    it('detects CC BY-NC 4.0', () => {
      const content = 'This article is licensed under CC BY-NC 4.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc-by-nc')
    })

    it('detects CC0 / Public Domain', () => {
      const content = 'Released to the Public Domain under CC0 1.0'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('cc0')
    })
  })

  describe('BSD License detection', () => {
    it('detects BSD 3-Clause', () => {
      const content = `
        BSD 3-Clause License

        Redistribution and use in source and binary forms, with or without
        modification, are permitted...
      `
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('bsd-3-clause')
    })
  })

  describe('Commercial/Proprietary detection', () => {
    it('detects All Rights Reserved', () => {
      const content = 'Copyright 2024 Example Corp. All Rights Reserved.'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('commercial')
    })

    it('detects proprietary content', () => {
      const content = 'This is Proprietary software.'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('commercial')
    })
  })

  describe('Private/Confidential detection', () => {
    it('detects confidential content', () => {
      const content = 'CONFIDENTIAL - Do not distribute'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('private')
    })

    it('detects internal use content', () => {
      const content = 'Internal Use Only - Company XYZ'
      const result = detectLicenseFromContent(content)
      expect(result?.license).toBe('private')
    })
  })

  describe('Edge cases', () => {
    it('returns null for empty content', () => {
      expect(detectLicenseFromContent('')).toBeNull()
    })

    it('returns null for very short content', () => {
      expect(detectLicenseFromContent('Hi')).toBeNull()
    })

    it('returns null for content without license info', () => {
      const content = 'This is just a regular article about cooking pasta.'
      const result = detectLicenseFromContent(content)
      expect(result).toBeNull()
    })
  })
})

// ============================================================================
// detectLicenseFromHTML TESTS
// ============================================================================

describe('detectLicenseFromHTML', () => {
  it('detects license from link rel="license"', () => {
    const html = `
      <html>
        <head>
          <link rel="license" href="https://creativecommons.org/licenses/by/4.0/">
        </head>
      </html>
    `
    const result = detectLicenseFromHTML(html)
    expect(result?.license).toBe('cc-by')
    expect(result?.source).toBe('html')
  })

  it('detects CC BY-SA from license link', () => {
    const html = '<link rel="license" href="https://creativecommons.org/licenses/by-sa/4.0/">'
    const result = detectLicenseFromHTML(html)
    expect(result?.license).toBe('cc-by-sa')
  })

  it('detects MIT from license link', () => {
    const html = '<link rel="license" href="https://opensource.org/licenses/MIT">'
    const result = detectLicenseFromHTML(html)
    expect(result?.license).toBe('mit')
  })

  it('detects license from dc.rights meta tag', () => {
    const html = '<meta name="dc.rights" content="CC BY 4.0">'
    const result = detectLicenseFromHTML(html)
    expect(result?.license).toBe('cc-by')
  })

  it('detects license from schema.org license property', () => {
    const html = `
      <script type="application/ld+json">
        {"@context": "https://schema.org", "license": "https://creativecommons.org/licenses/by-nc/4.0/"}
      </script>
    `
    const result = detectLicenseFromHTML(html)
    expect(result?.license).toBe('cc-by-nc')
  })

  it('detects Creative Commons badge', () => {
    const html = '<img src="https://creativecommons.org/l/by-sa/4.0/badge.png">'
    const result = detectLicenseFromHTML(html)
    expect(result?.license).toBe('cc-by-sa')
  })

  it('detects license in footer', () => {
    const html = `
      <html>
        <body>
          <main>Content here</main>
          <footer>
            Licensed under the MIT License
          </footer>
        </body>
      </html>
    `
    const result = detectLicenseFromHTML(html)
    expect(result?.license).toBe('mit')
  })

  it('returns null for HTML without license info', () => {
    const html = '<html><head><title>Test</title></head><body>Hello</body></html>'
    const result = detectLicenseFromHTML(html)
    expect(result).toBeNull()
  })

  it('returns null for empty HTML', () => {
    expect(detectLicenseFromHTML('')).toBeNull()
  })
})

// ============================================================================
// detectLicenseFromGitHub TESTS
// ============================================================================

describe('detectLicenseFromGitHub', () => {
  it('detects MIT from GitHub repo info', () => {
    const result = detectLicenseFromGitHub({
      owner: 'example',
      repo: 'test',
      license: 'MIT'
    })
    expect(result?.license).toBe('mit')
    expect(result?.confidence).toBe(0.95)
    expect(result?.source).toBe('github')
  })

  it('detects Apache 2.0 from GitHub', () => {
    const result = detectLicenseFromGitHub({
      owner: 'example',
      repo: 'test',
      license: 'Apache-2.0'
    })
    expect(result?.license).toBe('apache-2.0')
  })

  it('returns null when no license provided', () => {
    const result = detectLicenseFromGitHub({
      owner: 'example',
      repo: 'test'
    })
    expect(result).toBeNull()
  })

  it('includes license URL', () => {
    const result = detectLicenseFromGitHub({
      owner: 'myorg',
      repo: 'myrepo',
      license: 'MIT'
    })
    expect(result?.licenseUrl).toBe('https://github.com/myorg/myrepo/blob/main/LICENSE')
  })
})

// ============================================================================
// detectLicenseFromAcademic TESTS
// ============================================================================

describe('detectLicenseFromAcademic', () => {
  it('suggests CC-BY for open access content', () => {
    const result = detectLicenseFromAcademic({
      isAcademic: true,
      isOpenAccess: true
    })
    expect(result?.license).toBe('cc-by')
    expect(result?.source).toBe('academic')
  })

  it('suggests CC-BY for arXiv URLs', () => {
    const result = detectLicenseFromAcademic({
      sourceUrl: 'https://arxiv.org/abs/2401.12345'
    })
    expect(result?.license).toBe('cc-by')
  })

  it('suggests CC-BY-NC-ND for bioRxiv URLs', () => {
    const result = detectLicenseFromAcademic({
      sourceUrl: 'https://biorxiv.org/content/10.1101/2024.01.01.12345'
    })
    expect(result?.license).toBe('cc-by-nc-nd')
  })

  it('suggests CC-BY-NC-ND for medRxiv URLs', () => {
    const result = detectLicenseFromAcademic({
      sourceUrl: 'https://medrxiv.org/content/10.1101/2024.01.01.12345'
    })
    expect(result?.license).toBe('cc-by-nc-nd')
  })

  it('suggests fair-use for non-open-access academic content', () => {
    const result = detectLicenseFromAcademic({
      isAcademic: true,
      isOpenAccess: false
    })
    expect(result?.license).toBe('fair-use')
  })

  it('returns null for non-academic content', () => {
    const result = detectLicenseFromAcademic({
      sourceUrl: 'https://example.com/article'
    })
    expect(result).toBeNull()
  })
})

// ============================================================================
// detectLicenseFromPackageJson TESTS
// ============================================================================

describe('detectLicenseFromPackageJson', () => {
  it('detects MIT from package.json', () => {
    const content = JSON.stringify({ name: 'test', license: 'MIT' })
    const result = detectLicenseFromPackageJson(content)
    expect(result?.license).toBe('mit')
    expect(result?.confidence).toBe(0.95)
    expect(result?.source).toBe('file')
  })

  it('detects Apache-2.0 from package.json', () => {
    const content = JSON.stringify({ name: 'test', license: 'Apache-2.0' })
    const result = detectLicenseFromPackageJson(content)
    expect(result?.license).toBe('apache-2.0')
  })

  it('returns null for package.json without license', () => {
    const content = JSON.stringify({ name: 'test', version: '1.0.0' })
    const result = detectLicenseFromPackageJson(content)
    expect(result).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    const result = detectLicenseFromPackageJson('not valid json')
    expect(result).toBeNull()
  })
})

// ============================================================================
// detectLicense (main function) TESTS
// ============================================================================

describe('detectLicense', () => {
  it('prioritizes GitHub license when available', () => {
    const result = detectLicense({
      githubRepo: { owner: 'test', repo: 'test', license: 'MIT' },
      content: 'Some content with Apache License 2.0 header'
    })
    expect(result?.license).toBe('mit')
    expect(result?.source).toBe('github')
  })

  it('falls back to HTML when no GitHub', () => {
    const result = detectLicense({
      htmlContent: '<link rel="license" href="https://creativecommons.org/licenses/by/4.0/">'
    })
    expect(result?.license).toBe('cc-by')
    expect(result?.source).toBe('html')
  })

  it('falls back to content when no HTML license', () => {
    const result = detectLicense({
      content: 'Licensed under the MIT License'
    })
    expect(result?.license).toBe('mit')
    expect(result?.source).toBe('content')
  })

  it('uses package.json detection for package.json files', () => {
    const result = detectLicense({
      filename: 'package.json',
      content: JSON.stringify({ license: 'GPL-3.0' })
    })
    expect(result?.license).toBe('gpl-3.0')
    expect(result?.source).toBe('file')
  })

  it('uses academic detection when applicable', () => {
    const result = detectLicense({
      isAcademic: true,
      isOpenAccess: true
    })
    expect(result?.license).toBe('cc-by')
    expect(result?.source).toBe('academic')
  })

  it('returns null when no license detected', () => {
    const result = detectLicense({
      content: 'Just some regular text without any license info'
    })
    expect(result).toBeNull()
  })
})

// ============================================================================
// detectLicenseOrDefault TESTS
// ============================================================================

describe('detectLicenseOrDefault', () => {
  it('returns detected license when found', () => {
    const result = detectLicenseOrDefault({
      content: 'MIT License - Permission is hereby granted'
    })
    expect(result.license).toBe('mit')
  })

  it('returns none when no license detected', () => {
    const result = detectLicenseOrDefault({
      content: 'Just regular content'
    })
    expect(result.license).toBe('none')
    expect(result.confidence).toBe(1.0)
    expect(result.source).toBe('inferred')
    expect(result.reasoning).toContain('No license detected')
  })
})
