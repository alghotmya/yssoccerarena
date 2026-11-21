export function ControlsGuide() {
  return (
    <div className="controls-guide">
      <div className="controls-card controls-p1">
        <h3>Player 1 — Red (default)</h3>
        <ul>
          <li>
            <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> Move
          </li>
          <li>
            <kbd>Space</kbd> Kick
          </li>
        </ul>
      </div>
      <div className="controls-card controls-p2">
        <h3>Player 2 — Blue (local join)</h3>
        <ul>
          <li>
            <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> Move
          </li>
          <li>
            <kbd>Enter</kbd> Kick
          </li>
        </ul>
      </div>
    </div>
  )
}
