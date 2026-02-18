export default function Head() {
  return (
    <>
      {/* Performance hints for first external calls (stars, downloads, etc.) */}
      <link rel="preconnect" href="https://api.github.com" crossOrigin="" />
      <link rel="preconnect" href="https://api.npmjs.org" crossOrigin="" />
    </>
  )
}

