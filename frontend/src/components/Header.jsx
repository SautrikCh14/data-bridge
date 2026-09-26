export default function Header() {
  return (
    <header className="header" id="app-header">
      <div className="header-left">
        <div className="header-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </div>
        <span className="header-title">DataBridge</span>
        <span className="header-badge">Data Analytics</span>
      </div>
      <div className="header-right">
        <span className="header-tagline-star">✦</span>
        <span>From messy data to clean insights.</span>
      </div>
    </header>
  )
}
