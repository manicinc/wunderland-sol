/**
 * Supertags Page - Redirects to unified Tags view
 * @module app/app/supertags/page
 */

import { redirect } from 'next/navigation'

export default function SupertagsPage() {
  redirect('/app/tags')
}
