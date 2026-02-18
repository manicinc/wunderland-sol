import { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import FAQAccordion from '@/components/faq-accordion'
import { MessageSquare } from 'lucide-react'
import { FRAME_BASE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'FAQ - Quarry, Quarry Codex & Frame.dev | Frequently Asked Questions',
  description: 'Frequently asked questions about Quarry (free open source PKM), Quarry Codex digital garden, Frame.dev, OpenStrand, and how you can contribute. Learn about our AI-native notes app and knowledge management system.',
  keywords: [
    'Quarry FAQ',
    'Quarry Codex FAQ',
    'Frame.dev FAQ',
    'Quarry notes help',
    'Quarry PKM questions',
    'OpenStrand FAQ',
    'free PKM software',
    'Quarry by Frame.dev',
    'Quarry.space',
    'quarry space',
    'framers ai quarry',
    'how to use Quarry',
    'Quarry vs Obsidian',
    'Quarry vs Notion',
    'is Quarry free',
    'Quarry offline',
    'Quarry encryption',
    'best free notetaking app',
  ],
  authors: [{ name: 'Frame.dev', url: FRAME_BASE_URL }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    title: 'FAQ - Quarry & Frame.dev | Frequently Asked Questions',
    description: 'Get answers about Quarry (free open source PKM), Quarry Codex, Frame.dev, and our AI-native knowledge management tools.',
    url: `${FRAME_BASE_URL}/faq`,
    siteName: 'Frame.dev',
    type: 'website',
    images: [`${FRAME_BASE_URL}/og-image.png`],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@framersai',
    creator: '@framersai',
    title: 'FAQ - Quarry & Frame.dev',
    description: 'Get answers about Quarry, our free open source AI notes app.',
    images: [`${FRAME_BASE_URL}/og-image.png`],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/faq`,
  },
}

const faqs = [
  {
    question: 'What is Frame.dev?',
    answer: 'Frame.dev is building the AI infrastructure for superintelligence. We provide the OS for humans, the codex of humanity, and the foundation for open source SAFE superintelligence. Our ecosystem includes specialized operating systems, knowledge management tools, and AI runtimes—all designed to empower the next generation of intelligent systems.'
  },
  {
    question: 'What is your mission with superintelligence?',
    answer: 'We believe superintelligence should be open, safe, and aligned with human values. We\'re building the infrastructure to ensure AGI and superintelligence remain transparent, auditable, and beneficial to all humanity. This includes Quarry Codex (knowledge repository), OpenStrand (AI-native infrastructure), and AgentOS (adaptive AI runtime).'
  },
  {
    question: 'Is Frame open source?',
    answer: 'Yes! We demand and build infrastructure for open source SAFE superintelligence. All Frame projects are available under MIT or Apache 2.0 licenses. We believe that the path to safe superintelligence requires transparency, collaboration, and community oversight.'
  },
  {
    question: 'What is Quarry Codex?',
    answer: 'Quarry Codex is "the codex of humanity"—a structured repository of human knowledge designed for LLM ingestion. It organizes information as strands (atomic units), looms (curated groups), and weaves (complete collections). The Codex powers our API and is freely available on GitHub for AI training and research.'
  },
  {
    question: 'How does OpenStrand fit into the vision?',
    answer: 'OpenStrand is our AI-native knowledge infrastructure that adds computational intelligence on top of Quarry Codex. It enables local-first knowledge management, semantic search, and knowledge graphs—all designed to help AI systems understand and navigate human knowledge effectively.'
  },
  {
    question: 'Which products are currently available?',
    answer: 'AgentOS (AI runtime) and OpenStrand are currently live. Quarry Codex is accessible at frame.dev/codex, and our API is in beta. WebOS, HomeOS, SafeOS, WorkOS, and MyOS are in development. The Superintelligence Computer is our long-term vision currently in research phase.'
  },
  {
    question: 'How can I contribute to the mission?',
    answer: 'We\'re looking for collaborators and experts who share our vision of open source SAFE superintelligence. You can contribute code on GitHub, add knowledge to Quarry Codex, build on our APIs, or join our community discussions. Every contribution helps build safer AI infrastructure.'
  },
  {
    question: 'What makes Frame different from other AI platforms?',
    answer: 'Frame is building adaptive AI intelligence that is emergent and permanent. We\'re not just creating tools—we\'re building the foundation for superintelligence. Our focus on openness, safety, and human-aligned values sets us apart. We\'re denoising the web and creating infrastructure that will serve humanity for generations.'
  },
  {
    question: 'How does Frame ensure AI safety?',
    answer: 'Safety is built into our architecture: open source for transparency, local-first for control, structured knowledge for alignment, and community governance for oversight. Our infrastructure is designed to be auditable, interpretable, and aligned with human values by default.'
  },
  {
    question: 'What about data privacy and sovereignty?',
    answer: 'Frame is built with privacy and data sovereignty at its core. Our local-first architecture means you control your data. The infrastructure supports end-to-end encryption, zero-knowledge proofs, and decentralized storage options. You choose where your data lives and who can access it.'
  },
  {
    question: 'Is my data encrypted?',
    answer: 'Yes! All your data in Quarry is automatically encrypted using AES-256-GCM, the same encryption standard used by banks and governments. A unique encryption key is generated for your device on first use and stored securely in your browser. No passphrase needed—it just works.'
  },
  {
    question: 'How does end-to-end encryption work?',
    answer: 'When you save data, it\'s encrypted on your device before storage. The encryption key never leaves your device. This means even if someone accessed your stored data, they couldn\'t read it without your device\'s key. Check Settings → Security to see your encryption status and device ID.'
  },
  {
    question: 'What happens to my encrypted data if I clear browser data?',
    answer: 'Important: Your encryption key is stored in your browser. Clearing browser data (including IndexedDB) will delete your key, making previously encrypted data permanently unreadable. Always export your data from Settings before clearing browser storage.'
  },
  {
    question: 'Can Frame employees read my data?',
    answer: 'No. With end-to-end encryption, your data is encrypted on your device before it leaves. We only see encrypted ciphertext that we cannot decrypt. Even if we wanted to, we couldn\'t read your notes, tasks, or any other content. Your privacy is guaranteed by math, not policy.'
  },
  {
    question: 'Can I password-protect my Quarry instance?',
    answer: 'Yes! Quarry includes built-in password protection with SHA-256 hashing. Enable it in Settings → Security to lock your entire Quarry UI behind a password. The system includes auto-lock on inactivity, failed attempt lockout (5 attempts triggers a 5-minute cooldown), and an optional security question for password hints. All credentials are stored locally and never transmitted.'
  },
  {
    question: 'What is Public Access Mode?',
    answer: 'Public Access Mode (NEXT_PUBLIC_PUBLIC_ACCESS=true) locks down your Quarry deployment for public sharing. When enabled, visitors cannot install/remove plugins or modify security settings. This is ideal for public documentation sites, demos, or shared team environments. Security settings are locked to prevent unauthorized modifications.'
  },
  {
    question: 'Is my self-hosted Quarry deployment secure?',
    answer: 'By default, self-hosted Quarry (like GitHub Pages) has no access control—anyone with the URL can access it. For security: 1) Enable password protection in Settings → Security, 2) Use Public Access Mode for public sites, or 3) Deploy behind authentication (Cloudflare Access, Vercel Auth, etc.). See our Security Guide for detailed recommendations.'
  },
  {
    question: 'How do I search the web from Quarry Codex?',
    answer: 'Press Cmd+Shift+R (or Ctrl+Shift+R on Windows/Linux) to open the Web Research panel. You can search using DuckDuckGo (free, no setup), or configure premium providers like Brave Search, Serper, or Google Custom Search in Settings. The panel supports time filters, research sessions, and automatic academic paper detection.'
  },
  {
    question: 'What are Research Sessions?',
    answer: 'Research Sessions let you organize your web searches by topic. Create a session, and all your queries and saved results are automatically tracked. Sessions persist across browser sessions using local storage, so you can continue your research anytime. Access sessions from the History icon in the Research Panel.'
  },
  {
    question: 'How do I add citations from academic papers?',
    answer: 'When you find an academic paper in search results (arXiv, DOI, PubMed, etc.), click the "Cite" button to resolve it as a formal citation. You can also press Cmd+Shift+C to open the citation modal and paste any DOI, arXiv ID, or URL. Quarry Codex automatically fetches metadata from CrossRef and arXiv, and you can insert citations in multiple formats.'
  },
  {
    question: 'What is Semantic Scholar integration?',
    answer: 'When you save academic papers to your research session, Quarry Codex can fetch personalized paper recommendations from Semantic Scholar. Click "Find Similar Papers" in the Research Panel to discover related research based on the papers you\'ve saved. This helps you explore the academic literature around your topics of interest.'
  },
  {
    question: 'What is Deep Focus Mode?',
    answer: 'Deep Focus Mode is our immersive productivity workspace designed for distraction-free work sessions. It transforms your entire screen into a calming environment with ambient soundscapes (rain, café, forest, ocean, fireplace, lo-fi, white noise), beautiful animated backgrounds, and floating widgets. Enter Deep Focus with Cmd+Shift+F (or Ctrl+Shift+F). It includes a Pomodoro timer, quick capture for notes, stats tracking, and AI copilot—all designed to maximize your productivity and flow state.'
  },
  {
    question: 'How does the Pomodoro timer work?',
    answer: 'The Pomodoro timer uses the proven focus technique: 25 minutes of focused work followed by a 5-minute break. After 4 sessions, take a longer 15-minute break. You can access the timer from the sidebar (always visible at the bottom) or as a floating widget in the Meditation page. Start/pause with one click, track your sessions, and optionally auto-start breaks. The timer integrates with ambient soundscapes—sounds can fade when breaks begin for a seamless experience.'
  },
  {
    question: 'Can I customize the ambient backgrounds?',
    answer: 'Yes! The background slideshow automatically matches your selected soundscape with curated images from Pexels, Unsplash, and Pixabay. You can customize: transition interval (15s-5min), transition style (crossfade, blur-fade, slide), shuffle order, and which specific images appear. Images blur subtly when you interact with widgets to reduce distraction. You can also download any background image with proper attribution.'
  }
]

export default function FAQPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-4xl pt-20 pb-20">
        <h1 className="text-5xl font-bold mb-12 heading-gradient">Frequently Asked Questions</h1>
        
        <FAQAccordion items={faqs} />

        {/* Call to Action */}
        <div className="mt-16 paper-card p-8 bg-gradient-to-br from-cyan-50 to-green-50 dark:from-cyan-900/10 dark:to-green-900/10">
          <h2 className="text-2xl font-bold mb-4">Join the Mission</h2>
          <p className="body-text mb-6">
            We&apos;re building the infrastructure for open source SAFE superintelligence. 
            Join our community of researchers, developers, and thinkers working towards a future 
            where AI amplifies human potential.
          </p>
          <div className="flex flex-wrap gap-4">
            <a 
              href="https://github.com/framersai/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Join Discussions
            </a>
            <a 
              href="https://github.com/framersai"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-2"
            >
              Contribute on GitHub
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}