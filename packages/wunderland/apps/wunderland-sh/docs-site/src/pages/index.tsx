import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import EcosystemCarousel from '@site/src/components/EcosystemCarousel';
import IntegrationsCatalog from '@site/src/components/IntegrationsCatalog';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/quickstart">
            Get Started
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/docs/api/overview"
            style={{marginLeft: '1rem'}}>
            API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Documentation"
      description="WUNDERLAND — Free open-source OpenClaw fork. Secure npm CLI for autonomous AI agents with 5-tier prompt-injection defense, AgentOS integrations, sandboxed permissions, and HEXACO personalities.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <EcosystemCarousel />
        <IntegrationsCatalog />
      </main>
    </Layout>
  );
}
