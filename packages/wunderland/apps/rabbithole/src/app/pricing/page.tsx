import '@/styles/landing.scss';
import LandingNav from '@/components/LandingNav';
import { PricingSection } from '@/components/PricingSection';

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
        <PricingSection />
      </main>
    </>
  );
}
