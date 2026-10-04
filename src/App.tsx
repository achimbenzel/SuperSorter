import { ITEM_IMAGE } from './assets';
import { ITEM_TYPES } from './game/items';

/** Platzhalter bis die Spiel-UI steht (Schritt 4). */
export default function App() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 320, justifyContent: 'center' }}>
        {ITEM_TYPES.map((t) => (
          <img key={t} src={ITEM_IMAGE[t]} alt={t} width={64} height={64} />
        ))}
      </div>
    </main>
  );
}
