import { redirect } from 'next/navigation'

/**
 * Quarry Root Page
 *
 * Redirects to landing page.
 * The app is at /quarry/app
 */
export default function QuarryHomePage() {
  redirect('/quarry/landing')
}
