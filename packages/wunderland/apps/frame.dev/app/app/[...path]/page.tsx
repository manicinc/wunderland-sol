/**
 * Catch-all route for /app/* paths on quarry.space
 * Re-exports the quarry catch-all handler
 */
export { default, generateStaticParams, generateMetadata, dynamicParams } from '@/app/quarry/[...path]/page'
