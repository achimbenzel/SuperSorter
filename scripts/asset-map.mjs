// Zentrale Zuordnung: Original in assets-src/ -> optimierte Datei in public/assets/.
// Diese Tabelle ist die einzige Quelle für das Optimierungs-Script und wird in
// docs/ASSETS.md dokumentiert. Neue Assets: Original nach assets-src/ legen,
// hier eine Zeile ergänzen, `npm run assets:optimize` ausführen und den Pfad in
// src/assets.ts eintragen.
//
// Felder:
//   src     Dateiname in assets-src/
//   out     Zielpfad relativ zu public/assets/ (ohne Endung, .webp wird angehängt)
//   kind    Verarbeitungsart (siehe optimize-assets.mjs)
//   size    Zielgröße in px (Kantenlänge bei "sprite", Breite bei "wide")
//   crop    optionaler Ausschnitt {left, top, width, height} im Original

/** Bounding-Box des Kartons (aus dem Alpha-Kanal von Background_Box.png ermittelt).
 *  Front und Maske werden mit exakt demselben Ausschnitt beschnitten, damit sich die
 *  Ebenen im Spiel pixelgenau überlagern. */
const BOX_CROP = { left: 61, top: 156, width: 902, height: 718 };

export const ASSET_MAP = [
  // Waren: werden auf 56-72 CSS-px angezeigt -> 216 px reicht für 3x-Retina.
  { src: 'Item_01_Cola_Red.png', out: 'items/cola-can', kind: 'sprite', size: 216 },
  { src: 'Item_02_Energy_Green.png', out: 'items/green-can', kind: 'sprite', size: 216 },
  { src: 'Item_03_Orange_Juice.png', out: 'items/orange-juice', kind: 'sprite', size: 216 },
  { src: 'Item_04_Chips_Blue.png', out: 'items/chips', kind: 'sprite', size: 216 },
  { src: 'Item_05_Apple.png', out: 'items/apple', kind: 'sprite', size: 216 },
  { src: 'Item_06_Bread.png', out: 'items/bread', kind: 'sprite', size: 216 },
  { src: 'Item_07_Cheese.png', out: 'items/cheese', kind: 'sprite', size: 216 },
  { src: 'Item_08_Milk.png', out: 'items/milk', kind: 'sprite', size: 216 },

  // Mystery-Verpackungen (gleiche Darstellungsgröße wie Waren).
  { src: 'Mystery_01_Paperbag.png', out: 'mystery/paper-wrap', kind: 'sprite', size: 216 },
  { src: 'Mystery_01_Paperbag_Gold.png', out: 'mystery/paper-gold', kind: 'sprite', size: 216 },
  { src: 'Mystery_01_Paperbag_Ripped.png', out: 'mystery/paper-shreds', kind: 'sprite', size: 216 },

  // Spielfeld
  { src: 'Background_Box.png', out: 'board/delivery-box', kind: 'wide', size: 720, crop: BOX_CROP },
  { src: 'Background_Box_Front.png', out: 'board/delivery-box-front', kind: 'wide', size: 720, crop: BOX_CROP },
  { src: 'Background_Box_Alpha.png', out: 'board/delivery-box-mask', kind: 'wide', size: 360, crop: BOX_CROP },
  // Komplettes Regal: grüner Freistellungs-Schleier wird entfernt (cleanAlpha).
  { src: 'Background_Shelf.png', out: 'board/shelf', kind: 'wide', size: 470, cleanAlpha: 40 },
  // Ein einzelnes Fach (Rückwand + Regalbrett mit Preisschild) als Kachel pro Regalfach.
  {
    src: 'Background_Shelf.png',
    out: 'board/shelf-slot',
    kind: 'wide',
    size: 334,
    crop: { left: 70, top: 204, width: 334, height: 150 },
    noTrim: true,
  },

  // UI
  { src: 'UI_01_Lock.png', out: 'ui/lock', kind: 'sprite', size: 128 },
  { src: 'UI_02_Coin_Gold.png', out: 'ui/coin', kind: 'sprite', size: 128 },
  { src: 'UI_03_Star.png', out: 'ui/star', kind: 'sprite', size: 128 },
  { src: 'UI_04_confetti.png', out: 'ui/confetti', kind: 'sprite', size: 384 },
  { src: 'UI_05_Undo.png', out: 'ui/booster-undo', kind: 'sprite', size: 192 },
  { src: 'UI_06_Extra_Slot.png', out: 'ui/booster-extra-slot', kind: 'sprite', size: 192 },
  { src: 'UI_07_Xray.png', out: 'ui/booster-peek', kind: 'sprite', size: 192 },
  { src: 'UI_08_Shuffle.png', out: 'ui/booster-shuffle', kind: 'sprite', size: 192 },
  { src: 'UI_09_Panel.png', out: 'ui/panel', kind: 'wide', size: 900 },
  { src: 'Button_01_Square.png', out: 'ui/button-square-green', kind: 'sprite', size: 192 },
  { src: 'Button_02_Square_Red.png', out: 'ui/button-square-red', kind: 'sprite', size: 192 },
  { src: 'Button_03_Wide.png', out: 'ui/button-wide-green', kind: 'wide', size: 600 },
  { src: 'Button_04_Wide.png', out: 'ui/button-wide-red', kind: 'wide', size: 600 },
  { src: 'Button_05_Checkmark.png', out: 'ui/icon-check', kind: 'sprite', size: 128 },
  { src: 'Button_06_Cross.png', out: 'ui/icon-cross', kind: 'sprite', size: 128 },
];

/** App-Icon-Quelle für scripts/generate-icons.mjs */
export const APP_ICON_SRC = 'AppIcon.png';
