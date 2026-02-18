/**
 * Supertags Page - Redirects to unified Tags view
 * @module app/quarry/supertags/page
 */

import { redirect } from 'next/navigation'

export default function SupertagsPage() {
  redirect('/quarry/tags')
}
