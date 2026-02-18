/**
 * Atlas Page - Infinite canvas visualization of knowledge base
 * Pan, zoom, and explore strands in a visual graph layout
 * @module quarry/atlas
 */

import { Metadata } from 'next'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import AtlasClient from './AtlasClient'

export const metadata: Metadata = {
    title: 'Atlas – Quarry',
    description: 'Explore your entire knowledge base as an infinite canvas. Navigate, zoom, and discover connections between your strands.',
}

export default function AtlasPage() {
    return (
        <QuarryPageLayout
            title="Atlas"
            description="Visual map of your knowledge base"
        >
            <AtlasClient />
        </QuarryPageLayout>
    )
}
