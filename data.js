// DATI DI GIOCO: Civiltà, Comandanti, Carte Battaglia, Tessere Potere e Planisferi (42T/6C e 60T/7C)

const CIVILIZATIONS = [
  { id: 'solari', name: 'Impero Solare', color: '#ef4444', commander: 'Aurelio il Conquistatore', passive: '+1 Forza totale in battaglia quando attacchi.', bonusType: 'attack_strength', bonusValue: 1 },
  { id: 'marittimi', name: 'Repubblica Marittima', color: '#3b82f6', commander: 'Ammiraglio Nerissa', passive: '+1 Oro extra all’inizio di ogni Fase Notturna.', bonusType: 'night_gold', bonusValue: 1 },
  { id: 'pietra', name: 'Ordine della Pietra', color: '#10b981', commander: 'Custode Thrain', passive: '+1 Protezione in battaglia quando difendi.', bonusType: 'defense_shield', bonusValue: 1 },
  { id: 'ombra', name: 'Legione d’Ombra', color: '#a855f7', commander: 'Vespera la Stratega', passive: 'Sconto di 1 Oro quando acquisti Tessere Potere.', bonusType: 'tile_discount', bonusValue: 1 },
  { id: 'aurore', name: 'Regno dell’Aurora', color: '#f59e0b', commander: 'Regina Lyra', passive: 'Sconto di 1 Oro quando elevi un Monumento.', bonusType: 'monument_discount', bonusValue: 1 },
  { id: 'ferro', name: 'Cittadella di Ferro', color: '#94a3b8', commander: 'Generale Kael', passive: '+1 unità bonus ogni volta che recluti.', bonusType: 'recruit_bonus', bonusValue: 1 },
  { id: 'boreali', name: 'Clan del Nord', color: '#06b6d4', commander: 'Jarl Ragnar', passive: '+1 Forza quando attacchi un Bastione.', bonusType: 'bastion_attack', bonusValue: 1 },
  { id: 'aurei', name: 'Dinastia d’Oro', color: '#eab308', commander: 'Satrapo Darius', passive: '+1 Oro extra quando riscuoti le tasse.', bonusType: 'tax_bonus', bonusValue: 1 },
  { id: 'silvani', name: 'Protettorato Verde', color: '#22c55e', commander: 'Signora Sylva', passive: '+1 Protezione base in ogni battaglia.', bonusType: 'shield_all', bonusValue: 1 },
  { id: 'crepuscolo', name: 'Ordine del Crepuscolo', color: '#ec4899', commander: 'Oracolo Nyx', passive: '+1 PV permanente ogni 2 Notturne se controlli almeno 2 territori.', bonusType: 'night_nyx_vp', bonusValue: 1 }
];

const BASE_BATTLE_CARDS = [
  { id: 'c1', name: 'Assalto Furioso', strength: 4, damage: 3, shield: 0 },
  { id: 'c2', name: 'Falange Corazzata', strength: 2, damage: 1, shield: 3 },
  { id: 'c3', name: 'Carica Equilibrata', strength: 3, damage: 2, shield: 1 },
  { id: 'c4', name: 'Agguato Rapido', strength: 3, damage: 3, shield: 0 },
  { id: 'c5', name: 'Muro di Scudi', strength: 1, damage: 0, shield: 3 },
  { id: 'c6', name: 'Manovra Tattica', strength: 2, damage: 2, shield: 2 }
];

const POWER_TILES = [
  { id: 't_r1', name: 'Furia Bellica', color: 'red', level: 1, cost: 2, phase: 'day', effect: 'attack_bonus', value: 2, desc: 'Giorno: +2 Forza quando attacchi.' },
  { id: 't_r2', name: 'Lame d’Acciaio', color: 'red', level: 2, cost: 3, phase: 'day', effect: 'damage_bonus', value: 1, desc: 'Giorno: +1 Danno inflitto in battaglia.' },
  { id: 't_r3', name: 'Egemone della Guerra', color: 'red', level: 3, cost: 4, phase: 'night', effect: 'night_vp_bastion', value: 1, desc: 'Notte: +1 PV se controlli almeno 1 Bastione.' },

  { id: 't_w1', name: 'Decima Reale', color: 'white', level: 1, cost: 2, phase: 'night', effect: 'night_gold', value: 2, desc: 'Notte: Ottieni +2 Oro extra.' },
  { id: 't_w2', name: 'Architetti Sacri', color: 'white', level: 2, cost: 3, phase: 'day', effect: 'monument_discount', value: 1, desc: 'Giorno: Elevare Monumenti costa 1 Oro in meno.' },
  { id: 't_w3', name: 'Gloria Eterna', color: 'white', level: 3, cost: 5, phase: 'night', effect: 'night_vp', value: 1, desc: 'Notte: Ottieni +1 PV permanente.' },

  { id: 't_b1', name: 'Venti Favorevoli', color: 'blue', level: 1, cost: 2, phase: 'day', effect: 'move_bonus', value: 1, desc: 'Giorno: +1 passo extra durante Muovi & Attacca.' },
  { id: 't_b2', name: 'Armatura Runica', color: 'blue', level: 2, cost: 3, phase: 'day', effect: 'shield_bonus', value: 1, desc: 'Giorno: +1 Protezione in ogni battaglia.' },
  { id: 't_b3', name: 'Flotta Imperiale', color: 'blue', level: 3, cost: 4, phase: 'night', effect: 'night_troop', value: 1, desc: 'Notte: Genera +1 unità gratuita in un tuo territorio.' }
];

const ACTION_LEVELS = [
  {
    level: 1,
    name: 'Livello I — Base',
    slots: [
      { id: 'tax_1', type: 'tax', title: 'Riscuoti Tasse', desc: 'Ottieni immediatamente +2 Oro.' },
      { id: 'recruit_1', type: 'recruit', title: 'Reclutamento', desc: 'Paga 1 Oro per unità (max 3).' }
    ]
  },
  {
    level: 2,
    name: 'Livello II — Sviluppo',
    slots: [
      { id: 'monument_2', type: 'monument', title: 'Eleva Monumento', desc: 'Costruisci o alza Monumento (Rosso/Bianco/Blu).' },
      { id: 'tile_2', type: 'buy_tile', title: 'Acquista Tessera Potere', desc: 'Richiede Monumento stesso colore e lv >= tessera.' }
    ]
  },
  {
    level: 3,
    name: 'Livello III — Guerra & Comando',
    slots: [
      { id: 'move_3', type: 'move_attack', title: 'Muovi & Attacca', desc: 'Sposta truppe (anche Monumento -> Porto) e invadi.' },
      { id: 'march_3', type: 'move_attack', title: 'Marcia Imperiale', desc: 'Sposta truppe e invadi territori collegati.' }
    ]
  }
];

// 6 Continenti base (42 territori totali = 7 per continente) per 6 giocatori
const CONTINENTS_6 = [
  { id: 'na', name: 'Nord America', color: '#f59e0b', bonusVP: 1, bonusGold: 1 },
  { id: 'sa', name: 'Sud America', color: '#10b981', bonusVP: 1, bonusGold: 1 },
  { id: 'eu', name: 'Europa', color: '#3b82f6', bonusVP: 1, bonusGold: 1 },
  { id: 'af', name: 'Africa', color: '#eab308', bonusVP: 1, bonusGold: 1 },
  { id: 'as', name: 'Asia', color: '#ef4444', bonusVP: 2, bonusGold: 1 },
  { id: 'oc', name: 'Oceania', color: '#a855f7', bonusVP: 1, bonusGold: 1 }
];

// 7 Continenti estesi (60 territori totali) per 10 giocatori
const CONTINENTS_10 = [
  ...CONTINENTS_6,
  { id: 'po', name: 'Terre Polari & Arcipelaghi', color: '#06b6d4', bonusVP: 1, bonusGold: 2 }
];

function buildWorldMap(playerCount) {
  const isTenPlayers = playerCount >= 10;
  const continents = isTenPlayers ? CONTINENTS_10 : CONTINENTS_6;

  // Coordinate (x, y) su viewBox 1000x520 in stile planisfero Rìsiko
  const base42 = [
    // Nord America (7) - x: 90..260, y: 80..210
    { id: 'na_1', name: 'Alaska', cont: 'na', tag: 'port', x: 95, y: 85, neighbors: ['na_2', 'na_4', 'as_1'] },
    { id: 'na_2', name: 'Territori del Nord-Ovest', cont: 'na', tag: 'monument', x: 170, y: 85, neighbors: ['na_1', 'na_3', 'na_4'] },
    { id: 'na_3', name: 'Groenlandia', cont: 'na', tag: 'bastion', x: 265, y: 72, neighbors: ['na_2', 'na_4', 'eu_1'] },
    { id: 'na_4', name: 'Alberta', cont: 'na', tag: 'normal', x: 155, y: 135, neighbors: ['na_1', 'na_2', 'na_3', 'na_5'] },
    { id: 'na_5', name: 'Stati Occidentali', cont: 'na', tag: 'port', x: 135, y: 185, neighbors: ['na_4', 'na_6', 'na_7'] },
    { id: 'na_6', name: 'Stati Orientali', cont: 'na', tag: 'monument', x: 205, y: 185, neighbors: ['na_3', 'na_4', 'na_5', 'na_7'] },
    { id: 'na_7', name: 'America Centrale', cont: 'na', tag: 'normal', x: 165, y: 235, neighbors: ['na_5', 'na_6', 'sa_1'] },

    // Sud America (7) - x: 210..330, y: 275..455
    { id: 'sa_1', name: 'Venezuela', cont: 'sa', tag: 'port', x: 235, y: 280, neighbors: ['na_7', 'sa_2', 'sa_3'] },
    { id: 'sa_2', name: 'Perù', cont: 'sa', tag: 'normal', x: 215, y: 340, neighbors: ['sa_1', 'sa_3', 'sa_4'] },
    { id: 'sa_3', name: 'Brasile', cont: 'sa', tag: 'bastion', x: 285, y: 335, neighbors: ['sa_1', 'sa_2', 'sa_4', 'af_1'] },
    { id: 'sa_4', name: 'Argentina', cont: 'sa', tag: 'monument', x: 245, y: 405, neighbors: ['sa_2', 'sa_3'] },
    { id: 'sa_5', name: 'Patagonia', cont: 'sa', tag: 'port', x: 235, y: 465, neighbors: ['sa_4', 'sa_6'] },
    { id: 'sa_6', name: 'Ande Australi', cont: 'sa', tag: 'normal', x: 295, y: 455, neighbors: ['sa_3', 'sa_4', 'sa_5', 'sa_7'] },
    { id: 'sa_7', name: 'Amazzonia Est', cont: 'sa', tag: 'monument', x: 335, y: 390, neighbors: ['sa_3', 'sa_6'] },

    // Europa (7) - x: 420..580, y: 80..220
    { id: 'eu_1', name: 'Islanda', cont: 'eu', tag: 'port', x: 415, y: 95, neighbors: ['na_3', 'eu_2', 'eu_3'] },
    { id: 'eu_2', name: 'Scandinavia', cont: 'eu', tag: 'monument', x: 495, y: 82, neighbors: ['eu_1', 'eu_3', 'eu_6'] },
    { id: 'eu_3', name: 'Gran Bretagna', cont: 'eu', tag: 'port', x: 430, y: 145, neighbors: ['eu_1', 'eu_2', 'eu_4', 'eu_5'] },
    { id: 'eu_4', name: 'Europa Occidentale', cont: 'eu', tag: 'normal', x: 435, y: 205, neighbors: ['eu_3', 'eu_5', 'af_1'] },
    { id: 'eu_5', name: 'Europa Meridionale', cont: 'eu', tag: 'bastion', x: 495, y: 210, neighbors: ['eu_3', 'eu_4', 'eu_6', 'af_1', 'af_2'] },
    { id: 'eu_6', name: 'Europa Settentrionale', cont: 'eu', tag: 'normal', x: 505, y: 145, neighbors: ['eu_2', 'eu_3', 'eu_5', 'eu_7'] },
    { id: 'eu_7', name: 'Ucraina', cont: 'eu', tag: 'monument', x: 575, y: 145, neighbors: ['eu_2', 'eu_6', 'as_1', 'as_2'] },

    // Africa (7) - x: 430..600, y: 255..455
    { id: 'af_1', name: 'Africa del Nord', cont: 'af', tag: 'port', x: 445, y: 275, neighbors: ['sa_3', 'eu_4', 'eu_5', 'af_2', 'af_3'] },
    { id: 'af_2', name: 'Egitto', cont: 'af', tag: 'monument', x: 525, y: 275, neighbors: ['eu_5', 'af_1', 'af_3', 'as_2'] },
    { id: 'af_3', name: 'Africa Centrale', cont: 'af', tag: 'normal', x: 505, y: 340, neighbors: ['af_1', 'af_2', 'af_4', 'af_5'] },
    { id: 'af_4', name: 'Africa Orientale', cont: 'af', tag: 'bastion', x: 575, y: 335, neighbors: ['af_2', 'af_3', 'af_5', 'af_6', 'as_2'] },
    { id: 'af_5', name: 'Africa del Sud', cont: 'af', tag: 'normal', x: 525, y: 420, neighbors: ['af_3', 'af_4', 'af_6'] },
    { id: 'af_6', name: 'Madagascar', cont: 'af', tag: 'port', x: 605, y: 415, neighbors: ['af_4', 'af_5'] },
    { id: 'af_7', name: 'Costa d’Avorio', cont: 'af', tag: 'monument', x: 440, y: 365, neighbors: ['af_1', 'af_3', 'af_5'] },

    // Asia (7) - x: 630..855, y: 80..295
    { id: 'as_1', name: 'Urali', cont: 'as', tag: 'normal', x: 645, y: 115, neighbors: ['na_1', 'eu_7', 'as_2', 'as_3'] },
    { id: 'as_2', name: 'Medio Oriente', cont: 'as', tag: 'bastion', x: 615, y: 225, neighbors: ['eu_7', 'af_2', 'af_4', 'as_1', 'as_4'] },
    { id: 'as_3', name: 'Siberia', cont: 'as', tag: 'monument', x: 725, y: 105, neighbors: ['as_1', 'as_4', 'as_5'] },
    { id: 'as_4', name: 'India', cont: 'as', tag: 'port', x: 705, y: 235, neighbors: ['as_1', 'as_2', 'as_3', 'as_5', 'as_6'] },
    { id: 'as_5', name: 'Cina', cont: 'as', tag: 'monument', x: 785, y: 185, neighbors: ['as_3', 'as_4', 'as_6', 'as_7'] },
    { id: 'as_6', name: 'Siam', cont: 'as', tag: 'port', x: 775, y: 270, neighbors: ['as_4', 'as_5', 'oc_1'] },
    { id: 'as_7', name: 'Giappone', cont: 'as', tag: 'bastion', x: 860, y: 165, neighbors: ['as_5', 'oc_2'] },

    // Oceania (7) - x: 765..935, y: 315..465
    { id: 'oc_1', name: 'Indonesia', cont: 'oc', tag: 'port', x: 795, y: 335, neighbors: ['as_6', 'oc_2', 'oc_3'] },
    { id: 'oc_2', name: 'Nuova Guinea', cont: 'oc', tag: 'monument', x: 875, y: 325, neighbors: ['as_7', 'oc_1', 'oc_4'] },
    { id: 'oc_3', name: 'Australia Occidentale', cont: 'oc', tag: 'normal', x: 815, y: 410, neighbors: ['oc_1', 'oc_4', 'oc_5'] },
    { id: 'oc_4', name: 'Australia Orientale', cont: 'oc', tag: 'bastion', x: 895, y: 410, neighbors: ['oc_2', 'oc_3', 'oc_5', 'oc_6'] },
    { id: 'oc_5', name: 'Nuova Zelanda', cont: 'oc', tag: 'port', x: 935, y: 460, neighbors: ['oc_3', 'oc_4'] },
    { id: 'oc_6', name: 'Arcipelago del Corallo', cont: 'oc', tag: 'monument', x: 940, y: 355, neighbors: ['oc_2', 'oc_4', 'oc_7'] },
    { id: 'oc_7', name: 'Polinesia', cont: 'oc', tag: 'normal', x: 875, y: 475, neighbors: ['oc_3', 'oc_4', 'oc_6'] }
  ];

  if (!isTenPlayers) {
    return { continents, territories: base42 };
  }

  // +18 territori (7 nel continente Terre Polari & Arcipelaghi + 11 espansioni regionali) = 60 territori totali
  const extra18 = [
    // Continente Polare & Arcipelaghi (7)
    { id: 'po_1', name: 'Artide Occidentale', cont: 'po', tag: 'port', x: 340, y: 55, neighbors: ['na_2', 'na_3', 'po_2'] },
    { id: 'po_2', name: 'Svalbard', cont: 'po', tag: 'monument', x: 455, y: 48, neighbors: ['eu_1', 'eu_2', 'po_1', 'po_3'] },
    { id: 'po_3', name: 'Mar Glaciale', cont: 'po', tag: 'bastion', x: 585, y: 52, neighbors: ['eu_2', 'as_1', 'po_2', 'po_4'] },
    { id: 'po_4', name: 'Tundra Artica', cont: 'po', tag: 'monument', x: 745, y: 52, neighbors: ['as_1', 'as_3', 'po_3', 'po_5'] },
    { id: 'po_5', name: 'Stretto di Bering', cont: 'po', tag: 'port', x: 865, y: 75, neighbors: ['na_1', 'as_3', 'as_7', 'po_4'] },
    { id: 'po_6', name: 'Antartide Occidentale', cont: 'po', tag: 'monument', x: 365, y: 488, neighbors: ['sa_5', 'sa_6', 'po_7'] },
    { id: 'po_7', name: 'Antartide Orientale', cont: 'po', tag: 'bastion', x: 675, y: 488, neighbors: ['af_5', 'oc_5', 'po_6'] },

    // Espansioni continenti (11) per portare il totale a 60 territori
    { id: 'na_8', name: 'Quebec', cont: 'na', tag: 'monument', x: 245, y: 135, neighbors: ['na_3', 'na_4', 'na_6'] },
    { id: 'sa_8', name: 'Guiana', cont: 'sa', tag: 'port', x: 315, y: 275, neighbors: ['sa_1', 'sa_3'] },
    { id: 'eu_8', name: 'Balcani', cont: 'eu', tag: 'monument', x: 545, y: 205, neighbors: ['eu_5', 'eu_6', 'eu_7', 'as_2'] },
    { id: 'af_8', name: 'Corno d’Africa', cont: 'af', tag: 'port', x: 595, y: 280, neighbors: ['af_2', 'af_4', 'as_2'] },
    { id: 'as_8', name: 'Mongolia', cont: 'as', tag: 'bastion', x: 785, y: 125, neighbors: ['as_3', 'as_5', 'as_7'] },
    { id: 'as_9', name: 'Anatolia', cont: 'as', tag: 'monument', x: 645, y: 175, neighbors: ['eu_7', 'as_1', 'as_2', 'as_4'] },
    { id: 'as_10', name: 'Filippine', cont: 'as', tag: 'port', x: 835, y: 255, neighbors: ['as_5', 'as_6', 'as_7', 'oc_2'] },
    { id: 'oc_8', name: 'Tasmania', cont: 'oc', tag: 'monument', x: 845, y: 455, neighbors: ['oc_3', 'oc_4', 'oc_7'] },
    { id: 'na_9', name: 'Golfo del Messico', cont: 'na', tag: 'port', x: 215, y: 235, neighbors: ['na_6', 'na_7', 'sa_1'] },
    { id: 'sa_9', name: 'Mato Grosso', cont: 'sa', tag: 'monument', x: 295, y: 380, neighbors: ['sa_3', 'sa_4', 'sa_6', 'sa_7'] },
    { id: 'af_9', name: 'Sahara Occidentale', cont: 'af', tag: 'bastion', x: 415, y: 315, neighbors: ['sa_3', 'af_1', 'af_7'] }
  ];

  // Collega bidirezionalmente i nuovi territori ai loro vicini
  const all = [...base42, ...extra18];
  const byId = Object.fromEntries(all.map(t => [t.id, t]));
  extra18.forEach(ext => {
    ext.neighbors.forEach(nid => {
      if (byId[nid] && !byId[nid].neighbors.includes(ext.id)) {
        byId[nid].neighbors.push(ext.id);
      }
    });
  });

  return { continents, territories: all };
}
