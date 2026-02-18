'use client'

import dynamic from 'next/dynamic'

const QuarryViewer = dynamic(() => import('@framers/codex-viewer').then((mod) => mod.QuarryViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
      Booting Codex viewer…
    </div>
  ),
})

export default function EmbeddedCodex() {
  return (
    <div className="rounded-2xl bg-paper shadow-xl">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-white via-[#fdfbf6] to-[#f9f5ec]">
        <QuarryViewer
          isOpen={true}
          mode="page"
          initialPath="weaves"
          onClose={() => undefined}
        />
      </div>
    </div>
  )
}

