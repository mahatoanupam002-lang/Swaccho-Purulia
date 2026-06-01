export default function Header({ tab, onTab }) {
  return (
    <header className="header">
      <div className="brand">
        <div className="logo" aria-hidden>♻️</div>
        <div>
          <h1>Swaccho Purulia</h1>
          <p className="tag">Crowdsourced civic issue tracking</p>
        </div>
      </div>
      <nav className="tabs">
        <button
          className={tab === 'report' ? 'active' : ''}
          onClick={() => onTab('report')}
        >
          Report
        </button>
        <button
          className={tab === 'map' ? 'active' : ''}
          onClick={() => onTab('map')}
        >
          Map
        </button>
        <button
          className={tab === 'leaderboard' ? 'active' : ''}
          onClick={() => onTab('leaderboard')}
        >
          Wards
        </button>
      </nav>
    </header>
  );
}
