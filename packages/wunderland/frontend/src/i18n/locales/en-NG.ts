import en from './en';

const enNG = {
  ...en,
  common: {
    ...en.common,
    welcome: 'How far! Welcome to Voice Chat Assistant'
  },
  onboarding: {
    ...en.onboarding,
    tour: {
      ...en.onboarding?.tour,
      heading: 'Welcome back, {name}!',
      subtitle: 'Here’s a quick gist so you can start shipping agencies and personas without stress.',
      defaultName: 'friend',
      steps: {
        seed: {
          title: 'Sort personas & secrets',
          description: 'Pick a marketplace persona (or bring your own) and drop the required API keys inside the credentials panel.',
          badge: '5 min'
        },
        agency: {
          title: 'Set up your first agency',
          description: 'Use Agency Manager to assign personas to roles, link their workflows, and agree on the squad goal.',
          badge: 'Roles & guardrails'
        },
        workflow: {
          title: 'Fire up a workflow',
          description: 'Launch automations from the workflow launcher or via API and watch the telemetry stream live.',
          badge: 'Streaming ready'
        }
      },
      ctaPrimary: 'Start guided setup',
      ctaSecondary: 'Maybe later'
    },
    tutorials: {
      ...en.onboarding?.tutorials,
      eyebrow: 'Guided tutorials',
      heading: 'Master agencies, workflows, and local-first tooling',
      description: 'Hand-picked markdown guides from the AgentOS docs—read them here or jump to the repo.',
      hide: 'Hide tutorials',
      nowReading: 'Now reading',
      close: 'Close tutorial'
    }
  }
};

export default enNG;
