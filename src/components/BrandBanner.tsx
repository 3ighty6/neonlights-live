/** Slim glowing banner spanning the full width, sits above the sidebar + content. */
export default function BrandBanner() {
  return (
    <div className="sticky top-0 left-0 right-0 z-[60] h-9 md:h-10 flex items-center justify-center bg-black/90 backdrop-blur border-b border-pink-500/20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-cyan-500/10" />
      <span className="relative neon-banner-text text-sm md:text-lg tracking-widest">NEONLIGHTS.CAM</span>
    </div>
  )
}
