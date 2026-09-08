import logoWordmark from '../assets/logo-wordmark.png'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <div className="particle-field absolute inset-0">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="relative text-center z-10">
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #ff2d95, #00f0ff, #b14eff, #ff2d95)',
              animation: 'spin 1.6s linear infinite',
              filter: 'blur(2px)',
            }}
          />
          <div className="absolute inset-1.5 rounded-full bg-black flex items-center justify-center overflow-hidden">
            <img src={logoWordmark} alt="NeonLights" className="w-[92%] h-[92%] rounded-full object-cover" />
          </div>
        </div>
        <div className="neon-banner-text text-2xl tracking-widest mb-2">NEONLIGHTS.CAM</div>
        <div className="text-gray-500 text-sm animate-pulse">Loading…</div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
