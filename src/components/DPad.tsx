import { Direction } from '../game/maze';

interface Props {
  onMove: (dir: Direction) => void;
}

/** Touch-/Klick-D-Pad für Mobilgeräte (auch auf Desktop nutzbar). */
export function DPad({ onMove }: Props) {
  const btn = (dir: Direction, label: string, aria: string, extra?: string) => (
    <button
      type="button"
      className={`dpad-btn ${extra ?? ''}`}
      aria-label={aria}
      onPointerDown={(e) => {
        e.preventDefault();
        onMove(dir);
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="dpad" role="group" aria-label="Steuerung (Touch)">
      {btn('up', '↑', 'Nach oben')}
      <div className="dpad-row">
        {btn('left', '←', 'Nach links')}
        <div className="dpad-center" aria-hidden="true" />
        {btn('right', '→', 'Nach rechts')}
      </div>
      {btn('down', '↓', 'Nach unten')}
    </div>
  );
}
