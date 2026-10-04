import { useRef } from 'react';
import { Board } from './components/Board';
import { HUD } from './components/HUD';
import { useFlip } from './hooks/useFlip';
import { useFxAnimations } from './hooks/useFxAnimations';
import { useGame } from './hooks/useGame';
import './styles/game.css';

export default function App() {
  const game = useGame();
  const { state, dispatch } = game;
  const rootRef = useRef<HTMLDivElement>(null);
  const layoutKey = `${state.config.level}-${game.attempt}`;

  useFlip(rootRef, layoutKey);
  useFxAnimations(rootRef, state.fx, state.fxSeq);

  return (
    <div className="app" ref={rootRef}>
      <HUD level={state.config.level} reward={state.config.reward} coins={game.displayCoins} onRestart={game.restart} />
      <Board key={layoutKey} state={state} dispatch={dispatch} hint={null} xray={false} />
    </div>
  );
}
