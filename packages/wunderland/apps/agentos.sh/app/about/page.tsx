import { redirect } from 'next/navigation';
import { defaultLocale } from '../../i18n';

export default function AboutRootPage() {
  // During build/export, this will emit the correct static HTML that triggers a redirect.
  redirect(defaultLocale === 'en' ? '/en/about' : `/${defaultLocale}/about`);
}
