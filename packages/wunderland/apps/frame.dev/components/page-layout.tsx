import Navigation from './navigation'
import Footer from './footer'
import ScrollToTop from './scroll-to-top'

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen paper-bg relative overflow-hidden">
      <Navigation />
      <main id="main-content" className="pt-20" role="main">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}
