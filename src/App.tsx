import { useEffect, useRef, useState } from 'react';
import { PRELOAD_IMAGES } from './assets';
import { Board } from './components/Board';
import { BoosterBar } from './components/BoosterBar';
import { DebugPanel } from './components/DebugPanel';
import { HUD } from './components/HUD';
import { LoseScreen } from './components/LoseScreen';
import { WinScreen } from './components/WinScreen';
import { DEBUG, TIMING } from './config';
import { LEVEL_TIPS, PEEK_TIP } from './game/levels';
import type { Move } from './game/types';
import { useDelayedFlag } from './hooks/useDelayedFlag';
import { useFlip } from './hooks/useFlip';
import { useFxAnimations } from './hooks/useFxAnimations';
import { useGame } from './hooks/useGame';
import './styles/game.css';
import './styles/screens.css';

export default function App() {
  const game = useGame();
  const { state, dispatch, progress } = game;
  const rootRef = useRef<HTMLDivElement>(null);
  const layoutKey = `${state.config.level}-${game.attempt}`;
  const [hint, setHint] = useState<Move | null>(null);
  const [xray, setXray] = useState(false);

  useFlip(rootRef, layoutKey);
  useFxAnimations(rootRef, state.fx, state.fxSeq);

  // Bilder vorladen, damit Reveal und Screens nicht flackern.
  useEffect(() => {
    PRELOAD_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // End-Screens erst zeigen, wenn Flug- und Lock-Animation durch sind.
  const showWin = useDelayedFlag(state.status === 'won', TIMING.endScreenDelay);
  const showLose = useDelayedFlag(state.status === 'lost', TIMING.endScreenDelay);

  const tip = state.peekArmed ? PEEK_TIP : state.moves === 0 ? LEVEL_TIPS[state.config.level] : undefined;

  return (
    <div className="app" ref={rootRef}>
      <HUD level={state.config.level} reward={state.config.reward} coins={game.displayCoins} onRestart={game.restart} />
      {DEBUG && (
        <DebugPanel
          state={state}
          dispatch={dispatch}
          generated={game.generated}
          loadLevel={game.loadLevel}
          hint={hint}
          setHint={setHint}
          xray={xray}
          setXray={setXray}
          onResetProgress={() => {
            game.setProgress({ level: 1, coins: 0, highest: 1 });
            game.loadLevel(1);
          }}
        />
      )}
      <Board key={layoutKey} state={state} dispatch={dispatch} hint={hint} xray={xray} tip={tip} />
      <BoosterBar state={state} dispatch={dispatch} />
      {showWin && state.status === 'won' && <WinScreen state={state} onNext={() => game.loadLevel(progress.level)} />}
      {showLose && state.status === 'lost' && <LoseScreen state={state} dispatch={dispatch} onRetry={game.restart} />}
    </div>
  );
}
