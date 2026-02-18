# Translation & Internationalization (i18n)

## Current Recommendation: **Use Chrome's Built-in Translation**

Quarry Codex currently does **NOT** implement full i18n/l10n infrastructure. Instead, we recommend users rely on browser-native translation for the following reasons:

### Why Browser Translation?

1. **Zero maintenance** - No translation files to manage, no outdated strings
2. **100+ languages** supported out-of-the-box (Chrome, Edge, Safari)
3. **On-the-fly** - Works immediately without configuration
4. **No bundle bloat** - Keeps the app fast and lean
5. **Existing solution** - You already have i18n in `openstrand.ai` for the full PKMS app

### How Users Translate Content

**Chrome / Edge:**
- Right-click → "Translate to [Language]"
- Or use the translate icon in the address bar
- Works with all markdown content, UI labels, and metadata

**Safari:**
- Right-click → "Translate to [Language]"
- Or use the Translate menu

**Firefox:**
- Install "To Google Translate" extension
- Or use Firefox Translations (built-in for 100+ languages)

### Future: Programmatic Translation (If Needed)

If you decide to implement on-demand translation later, here's the recommended approach:

```typescript
// Option 1: LLM-based translation (GPT-4)
async function translateContent(text: string, targetLang: string) {
  const response = await fetch('/api/translate', {
    method: 'POST',
    body: JSON.stringify({ text, targetLang }),
  })
  return response.json()
}

// Option 2: Browser Translation API (experimental)
if ('translation' in navigator) {
  const translator = await navigator.translation.createTranslator({
    sourceLanguage: 'en',
    targetLanguage: 'es',
  })
  const translated = await translator.translate(text)
}
```

**Storage Strategy:**
- Cache translations in `localStorage` (per-doc, per-language)
- Store in `assets/translations/{lang}/{doc-path}.json`
- Lazy-load only visible content
- Never commit translations to Git (auto-generated)

**Integration Points:**
- Add language selector dropdown in `CodexToolbar`
- Translate on-demand when user switches language
- Show loading spinner during translation
- Fallback to original if translation fails

### Why NOT i18n Now?

- **Duplication** - You already have this in OpenStrand.ai
- **Complexity** - Adds 10+ npm packages, build config, SSG complications
- **Performance** - Bundle size increases by 200-500 KB per language
- **Maintenance** - Every UI change requires translation updates
- **Better UX** - Browser translation is instant, free, and always up-to-date

### Decision Matrix

| Use Case | Recommendation |
|----------|----------------|
| **Personal knowledge base** | Browser translation (current) |
| **Public documentation** | Browser translation (current) |
| **Multi-tenant SaaS** | Implement i18n (use Next.js i18n) |
| **Enterprise deployment** | Implement i18n with translation memory |

---

**Bottom line:** For Quarry Codex (a personal/team knowledge viewer), browser translation is the pragmatic choice. Save i18n complexity for `openstrand.ai` where you need fine-grained control over the full PKMS experience.

