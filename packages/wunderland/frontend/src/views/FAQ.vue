<template>
  <main class="container mx-auto px-4 py-10 md:py-14 max-w-4xl">
    <header class="mb-8 md:mb-10">
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight">
        Frequently Asked Questions
      </h1>
      <p class="mt-3 text-base md:text-lg text-gray-600">
        Answers to common questions about VCA.Chat, voice assistants, privacy, and how this
        connects with AgentOS and Frame.dev.
      </p>
    </header>

    <section aria-labelledby="vca-basics" class="space-y-6 md:space-y-8">
      <h2 id="vca-basics" class="sr-only">VCA basics</h2>

      <article>
        <h3 class="text-xl md:text-2xl font-semibold">What is VCA.Chat?</h3>
        <p class="mt-2 text-gray-700">
          VCA.Chat is a voice-first assistant and agent marketplace. It helps you talk to specialized
          agents, automate tasks, and orchestrate multi‑step workflows powered by AgentOS.
        </p>
      </article>

      <article>
        <h3 class="text-xl md:text-2xl font-semibold">How is my data handled?</h3>
        <p class="mt-2 text-gray-700">
          Your conversations are processed to provide responses and improve agent quality. We follow
          strict retention and access controls, and you can delete your data at any time from Settings.
        </p>
      </article>

      <article>
        <h3 class="text-xl md:text-2xl font-semibold">Do you support multiple languages?</h3>
        <p class="mt-2 text-gray-700">
          Yes. VCA supports multilingual speech recognition and synthesis, and our UI is localized for
          popular locales. You can switch your locale in the header menu.
        </p>
      </article>

      <article>
        <h3 class="text-xl md:text-2xl font-semibold">How does VCA relate to AgentOS?</h3>
        <p class="mt-2 text-gray-700">
          VCA runs on AgentOS — our adaptive orchestration layer that manages tools, guardrails,
          memory, and multi‑agent collaboration. Learn more on the AgentOS FAQ linked below.
        </p>
      </article>

      <article>
        <h3 class="text-xl md:text-2xl font-semibold">Is this open source?</h3>
        <p class="mt-2 text-gray-700">
          Yes. Our core libraries and many components are open source under permissive licenses.
          See our GitHub organization for details.
        </p>
      </article>

      <article>
        <h3 class="text-xl md:text-2xl font-semibold">Where can I get support?</h3>
        <p class="mt-2 text-gray-700">
          For product help, use the in‑app support or join our community. For enterprise inquiries,
          contact Manic Agency.
        </p>
      </article>
    </section>

    <section aria-labelledby="see-also" class="mt-10 md:mt-14">
      <h2 id="see-also" class="text-lg font-semibold">See also</h2>
      <ul class="mt-3 grid gap-2 text-blue-600 underline">
        <li><a href="https://agentos.sh/faq" target="_blank" rel="noopener">AgentOS FAQ</a></li>
        <li><a href="https://frame.dev/faq" target="_blank" rel="noopener">Frame.dev FAQ</a></li>
        <li><a href="https://manic.agency" target="_blank" rel="noopener">Manic Agency</a></li>
        <li><a href="https://manic.agency/blog" target="_blank" rel="noopener">The Looking Glass — AI newsletter & blog</a></li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const canonicalUrl = () => {
  // Basic canonical computation; adjust if you deploy under subpaths
  const base = 'https://vca.chat'
  const locale = (route.params?.locale as string) || 'en'
  return `${base}/${locale}/faq`
}

function upsertMeta(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function upsertProperty(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', rel)
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

onMounted(() => {
  const title = 'FAQ - VCA.Chat'
  const description =
    'Answers about VCA.Chat voice assistants, privacy, languages, and how it connects to AgentOS and Frame.dev.'
  const url = canonicalUrl()

  document.title = title
  upsertMeta('description', description)
  upsertLink('canonical', url)

  // Open Graph / Twitter
  upsertProperty('og:title', title)
  upsertProperty('og:description', description)
  upsertProperty('og:type', 'website')
  upsertProperty('og:url', url)
  upsertProperty('og:site_name', 'VCA.Chat')
  upsertMeta('twitter:card', 'summary')
  upsertMeta('twitter:title', title)
  upsertMeta('twitter:description', description)

  // JSON-LD FAQPage
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is VCA.Chat?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'VCA.Chat is a voice-first assistant and agent marketplace that helps you talk to specialized agents and automate workflows.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is my data handled?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'We follow strict retention and access controls and you can delete your data anytime from Settings.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does VCA relate to AgentOS?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'VCA runs on AgentOS — an adaptive orchestration layer that manages tools, guardrails, memory, and multi‑agent collaboration.',
        },
      },
    ],
  }
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.text = JSON.stringify(ld)
  document.head.appendChild(script)
})
</script>

<style scoped>
/* keep styles minimal; inherit site theme */
</style>


