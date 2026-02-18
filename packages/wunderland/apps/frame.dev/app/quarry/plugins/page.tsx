/**
 * Plugins Page - Manage Quarry plugins and extensions
 * Browse, install, and configure plugins from framersai/quarry-plugins
 * @module quarry/plugins
 */

import { Metadata } from 'next'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import PluginManagerClient from './PluginManagerClient'

export const metadata: Metadata = {
    title: 'Plugins – Quarry',
    description: 'Extend Quarry with community plugins. Browse, install, and manage extensions from the official plugin repository.',
}

export default function PluginsPage() {
    return (
        <QuarryPageLayout
            title="Plugins"
            description="Extend Quarry with community plugins"
        >
            <PluginManagerClient />
        </QuarryPageLayout>
    )
}
