// MOTORE DI GIOCO v2: Planisfero Stile Rìsiko SVG + Animazioni + 6 / 10 Giocatori

const state = {
  victoryGoal: 15,
  playerCount: 6,
  mapMode: 'risk-svg',
  round: 1,
  phase: 'DAY',
  players: [],
  turnOrder: [],
  currentTurnPos: 0,
  continents: [],
  territories: [],
  marketTiles: [],
  interactionMode: null, // null | 'monument' | 'move_from' | 'move_to' | 'recruit'
  selectedTerritoryId: null,
  moveStepsLeft: 0,
  battleContext: null,
  animatedTerritories: {}, // { [terrId]: 'monument-anim' | 'battle-shake' }
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStart: { x: 0, y: 0 }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('player-count').addEventListener('change', () => {
    const cnt = parseInt(document.getElementById('player-count').value, 10);
    if (cnt >= 10) {
      document.getElementById('victory-goal').value = '25';
    }
    renderPlayerSetupSlots();
  });
  renderPlayerSetupSlots();

  document.getElementById('start-game-btn').addEventListener('click', startGame);
  document.getElementById('btn-rules').addEventListener('click', showRulesModal);
  document.getElementById('btn-toggle-view').addEventListener('click', () => {
    state.mapMode = state.mapMode === 'risk-svg' ? 'cards' : 'risk-svg';
    renderMap();
  });
  document.getElementById('close-info-modal').addEventListener('click', () => {
    document.getElementById('info-modal').classList.add('hidden');
  });

  document.getElementById('zoom-in-btn').addEventListener('click', () => {
    state.zoom = Math.min(2.2, +(state.zoom + 0.2).toFixed(2));
    applyMapTransform();
  });
  document.getElementById('zoom-out-btn').addEventListener('click', () => {
    state.zoom = Math.max(0.75, +(state.zoom - 0.2).toFixed(2));
    applyMapTransform();
  });
  document.getElementById('zoom-reset-btn').addEventListener('click', () => {
    state.zoom = 1; state.panX = 0; state.panY = 0;
    applyMapTransform();
  });
});

function renderPlayerSetupSlots() {
  const count = parseInt(document.getElementById('player-count').value, 10);
  const container = document.getElementById('players-config');
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const civ = CIVILIZATIONS[i % CIVILIZATIONS.length];
    const isBotDefault = i > 0;
    const card = document.createElement('div');
    card.className = 'player-slot-card';
    card.innerHTML = `
      <h4 style="color:${civ.color}">Giocatore ${i + 1}</h4>
      <div class="form-group" style="margin-bottom:6px;">
        <label>Civiltà &amp; Comandante</label>
        <select id="civ-select-${i}">
          ${CIVILIZATIONS.map((c, idx) => `<option value="${idx}" ${idx === (i % CIVILIZATIONS.length) ? 'selected' : ''}>${c.name} (${c.commander})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Controllo</label>
        <select id="type-select-${i}">
          <option value="human" ${!isBotDefault ? 'selected' : ''}>Umano</option>
          <option value="bot" ${isBotDefault ? 'selected' : ''}>Bot IA</option>
        </select>
      </div>
    `;
    container.appendChild(card);
  }
}

function startGame() {
  state.victoryGoal = parseInt(document.getElementById('victory-goal').value, 10);
  state.playerCount = parseInt(document.getElementById('player-count').value, 10);
  state.mapMode = document.getElementById('map-mode').value;

  const world = buildWorldMap(state.playerCount);
  state.continents = world.continents;
  state.territories = world.territories.map(t => ({
    ...t,
    ownerId: null,
    troops: 1,
    monument: null // { color: 'red'|'white'|'blue', level: 1..4 }
  }));

  state.players = [];
  for (let i = 0; i < state.playerCount; i++) {
    const civIdx = parseInt(document.getElementById(`civ-select-${i}`).value, 10);
    const isBot = document.getElementById(`type-select-${i}`).value === 'bot';
    const civ = CIVILIZATIONS[civIdx];

    state.players.push({
      id: i,
      name: `G${i + 1} - ${civ.name}`,
      civ,
      isBot,
      gold: 4,
      permanentVP: 0,
      tokensLeft: 5,
      occupiedSlots: [],
      occupiedLevels: new Set(),
      tiles: [],
      battleHand: JSON.parse(JSON.stringify(BASE_BATTLE_CARDS))
    });
  }

  // Distribuzione iniziale equilibrata (es. 7 territori a testa su 42 per 6G, o 6 a testa su 60 per 10G)
  const indices = state.territories.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const perPlayer = Math.floor(state.territories.length / state.playerCount);
  for (let p = 0; p < state.playerCount; p++) {
    for (let k = 0; k < perPlayer; k++) {
      const tIdx = indices[p * perPlayer + k];
      if (tIdx !== undefined) {
        state.territories[tIdx].ownerId = p;
        state.territories[tIdx].troops = k === 0 ? 2 : 1;
      }
    }
  }

  state.marketTiles = JSON.parse(JSON.stringify(POWER_TILES));
  state.turnOrder = state.players.map(p => p.id);
  state.currentTurnPos = 0;
  state.round = 1;
  state.phase = 'DAY';
  state.zoom = 1; state.panX = 0; state.panY = 0;

  document.getElementById('setup-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');

  addLog(`Partita avviata! ${state.playerCount} giocatori su planisfero da ${state.territories.length} territori e ${state.continents.length} continenti (Obiettivo: ${state.victoryGoal} PV).`);
  renderAll();
  checkBotTurn();
}

function getControlledContinents(playerId) {
  const owned = [];
  state.continents.forEach(c => {
    const list = state.territories.filter(t => t.cont === c.id);
    if (list.length > 0 && list.every(t => t.ownerId === playerId)) {
      owned.push(c);
    }
  });
  return owned;
}

function getPlayerTotalVP(player) {
  let tempVP = 0;
  state.territories.forEach(t => {
    if (t.ownerId === player.id) {
      if (t.tag === 'bastion') tempVP += 1;
      if (t.monument && t.monument.level >= 4) tempVP += 1;
    }
  });
  const contBonusVP = getControlledContinents(player.id).reduce((s, c) => s + c.bonusVP, 0);
  return player.permanentVP + tempVP + contBonusVP;
}

function getActivePlayer() {
  return state.players[state.turnOrder[state.currentTurnPos]];
}

// ANIMAZIONI & EFFETTI VOLANTI
function triggerTerritoryAnim(terrId, animClass, fxText = null) {
  state.animatedTerritories[terrId] = animClass;
  const t = state.territories.find(x => x.id === terrId);
  if (fxText && t) {
    spawnFloatingFx(t.x, t.y, fxText);
  }
  renderMap();
  setTimeout(() => {
    delete state.animatedTerritories[terrId];
    renderMap();
  }, 650);
}

function spawnFloatingFx(svgX, svgY, text) {
  const layer = document.getElementById('floating-fx-layer');
  if (!layer) return;
  const pctX = Math.max(8, Math.min(92, (svgX / 1000) * 100));
  const pctY = Math.max(10, Math.min(90, (svgY / 520) * 100));
  const el = document.createElement('div');
  el.className = 'floating-fx';
  el.style.left = `${pctX}%`;
  el.style.top = `${pctY}%`;
  el.textContent = text;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// RENDERING
function renderAll() {
  const activePlayer = getActivePlayer();

  document.getElementById('round-badge').textContent = `Turno ${state.round}`;
  const phaseBadge = document.getElementById('phase-badge');
  phaseBadge.textContent = state.phase === 'DAY' ? 'FASE DI GIORNO' : 'FASE NOTTURNA';
  phaseBadge.className = `badge ${state.phase === 'DAY' ? 'badge-day' : 'badge-night'}`;
  document.getElementById('goal-badge').textContent = `Obiettivo: ${state.victoryGoal} PV`;
  document.getElementById('world-stats-badge').textContent = `${state.territories.length} Territori • ${state.continents.length} Continenti`;

  const turnBar = document.getElementById('turn-order-bar');
  turnBar.innerHTML = '<span style="font-size:0.72rem;color:#94a3b8;">Ordine:</span>' +
    state.turnOrder.map((pid, idx) => {
      const p = state.players[pid];
      return `<span class="turn-pill ${idx === state.currentTurnPos ? 'active' : ''}" style="border-color:${p.civ.color}">${p.name} (${p.tokensLeft})</span>`;
    }).join('');

  renderActivePlayerPanel(activePlayer);
  renderMap();
  renderSidebar();
}

function renderActivePlayerPanel(player) {
  const header = document.getElementById('active-player-header');
  const totalVP = getPlayerTotalVP(player);
  const conts = getControlledContinents(player.id);
  header.style.borderLeftColor = player.civ.color;
  header.innerHTML = `
    <div style="font-weight:700;font-size:0.95rem;color:${player.civ.color}">${player.name} ${player.isBot ? '🤖' : '👤'}</div>
    <div style="font-size:0.74rem;color:#cbd5e1;margin-top:2px;"><strong>${player.civ.commander}</strong>: ${player.civ.passive}</div>
    <div class="stats-row">
      <span class="stat-gold">🪙 Oro: ${player.gold}</span>
      <span class="stat-vp">🏆 PV: ${totalVP}</span>
      <span style="font-size:0.74rem;color:#cbd5e1;">🌍 Continenti: ${conts.length}</span>
    </div>
  `;

  const tokensBar = document.getElementById('tokens-bar');
  let dots = '';
  for (let i = 0; i < 5; i++) {
    dots += `<span class="token-dot ${i >= player.tokensLeft ? 'used' : ''}"></span>`;
  }
  tokensBar.innerHTML = `<span>Segnalini: <strong>${player.tokensLeft}/5</strong></span> ${dots}`;

  const actionBoard = document.getElementById('action-board');
  actionBoard.innerHTML = '';

  ACTION_LEVELS.forEach(lvl => {
    const hasLevel = player.occupiedLevels.has(lvl.level);
    const mustForceLevel = mustPickMissingLevel(player, lvl.level);

    const lvlDiv = document.createElement('div');
    lvlDiv.className = `action-level ${hasLevel ? 'satisfied' : ''}`;
    lvlDiv.innerHTML = `
      <div class="level-header">
        <span>${lvl.name}</span>
        <span>${hasLevel ? '✅ Coperto' : '⚠️ Richiesto'}</span>
      </div>
      <div class="action-slots"></div>
    `;

    const slotsContainer = lvlDiv.querySelector('.action-slots');
    lvl.slots.forEach(slot => {
      const isOccupied = player.occupiedSlots.includes(slot.id);
      const disabled = isOccupied || player.tokensLeft <= 0 || player.isBot || state.phase !== 'DAY' || !mustForceLevel;
      const btn = document.createElement('button');
      btn.className = `action-slot ${isOccupied ? 'occupied' : ''}`;
      btn.disabled = disabled;
      btn.innerHTML = `
        <span class="slot-title">${slot.title}</span>
        <span class="slot-desc">${isOccupied ? 'Occupata' : slot.desc}</span>
      `;
      btn.onclick = () => selectActionSlot(player, lvl.level, slot);
      slotsContainer.appendChild(btn);
    });

    actionBoard.appendChild(lvlDiv);
  });

  const ownedEl = document.getElementById('owned-tiles');
  if (player.tiles.length === 0) {
    ownedEl.innerHTML = '<span class="hint">Nessuna tessera potere acquistata.</span>';
  } else {
    ownedEl.innerHTML = player.tiles.map(t => `
      <div class="power-tile ${t.color}">
        <strong>${t.name}</strong> (Lv.${t.level} • ${t.phase === 'night' ? '🌙' : '☀️'})<br/>
        <span style="color:#94a3b8">${t.desc}</span>
      </div>
    `).join('');
  }
}

function mustPickMissingLevel(player, candidateLevel) {
  const missingLevels = [1, 2, 3].filter(l => !player.occupiedLevels.has(l));
  if (player.tokensLeft <= missingLevels.length) {
    return missingLevels.includes(candidateLevel);
  }
  return true;
}

function renderMap() {
  document.getElementById('board-title').textContent = `Planisfero — ${state.continents.length} Continenti (${state.territories.length} Territori)`;
  document.getElementById('continent-legend').innerHTML = state.continents.map(c =>
    `<span class="cont-pill"><span class="cont-dot" style="background:${c.color}"></span>${c.name} (+${c.bonusVP} PV)</span>`
  ).join('');

  const container = document.getElementById('map-container');
  const activePlayer = getActivePlayer();

  if (state.mapMode === 'cards') {
    container.innerHTML = `<div class="cards-grid">${state.territories.map(t => {
      const owner = t.ownerId !== null ? state.players[t.ownerId] : null;
      const cont = state.continents.find(c => c.id === t.cont);
      const sel = isTerritorySelectable(t, activePlayer);
      const isSelId = state.selectedTerritoryId === t.id;
      const monHtml = t.monument ? `<div class="mon-badge mon-${t.monument.color}">Mon. ${colorNameIt(t.monument.color)} Lv.${t.monument.level}</div>` : '';
      const tagBadge = t.tag === 'bastion' ? ' [Bastione]' : t.tag === 'port' ? ' [Porto]' : t.tag === 'monument' ? ' [Sito Mon.]' : '';
      return `
        <div class="territory-card ${sel ? 'selectable' : ''} ${isSelId ? 'selected' : ''}" onclick="handleTerritoryClickById('${t.id}')">
          <div class="terr-name">${t.name}${tagBadge}</div>
          <div class="terr-cont" style="color:${cont ? cont.color : '#94a3b8'}">${cont ? cont.name : ''}</div>
          <div class="terr-owner" style="color:${owner ? owner.civ.color : '#64748b'}">${owner ? owner.name : 'Neutrale'}</div>
          <div class="terr-troops">⚔️ Truppe: <strong>${t.troops}</strong></div>
          ${monHtml}
        </div>
      `;
    }).join('')}</div>`;
    return;
  }

  // MAPPA SVG STILE RÌSIKO
  const byId = Object.fromEntries(state.territories.map(t => [t.id, t]));
  const drawnEdges = new Set();
  const linesSvg = [];

  state.territories.forEach(t => {
    t.neighbors.forEach(nid => {
      const nb = byId[nid];
      if (!nb) return;
      const key = [t.id, nid].sort().join('--');
      if (drawnEdges.has(key)) return;
      drawnEdges.add(key);
      const isSea = t.cont !== nb.cont || t.tag === 'port' || nb.tag === 'port';
      linesSvg.push(`<line x1="${t.x}" y1="${t.y}" x2="${nb.x}" y2="${nb.y}" class="route-line ${isSea ? 'sea-route' : ''}" />`);
    });
  });

  const nodesSvg = state.territories.map(t => {
    const owner = t.ownerId !== null ? state.players[t.ownerId] : null;
    const cont = state.continents.find(c => c.id === t.cont);
    const fill = owner ? owner.civ.color : '#1e293b';
    const stroke = cont ? cont.color : '#64748b';
    const sel = isTerritorySelectable(t, activePlayer);
    const isSelId = state.selectedTerritoryId === t.id;
    const animCls = state.animatedTerritories[t.id] || '';
    const radius = t.tag === 'bastion' ? 19 : 16;

    const monColorMap = { red: '#ef4444', white: '#f8fafc', blue: '#3b82f6' };
    const monumentSvg = t.monument ? `
      <g class="monument-anim" transform="translate(${t.x + 12}, ${t.y - 14})">
        <polygon points="0,-9 8,5 -8,5" fill="${monColorMap[t.monument.color]}" stroke="#0f172a" stroke-width="1.5"/>
        <text x="0" y="14" text-anchor="middle" font-size="9" font-weight="800" fill="#fde047">L${t.monument.level}</text>
      </g>
    ` : '';

    const bastionRing = t.tag === 'bastion'
      ? `<circle cx="${t.x}" cy="${t.y}" r="${radius + 4}" fill="none" stroke="#f5b942" stroke-width="1.5" stroke-dasharray="3 2"/>`
      : '';

    return `
      <g class="terr-node ${sel ? 'selectable' : ''} ${isSelId ? 'selected' : ''} ${animCls}" onclick="handleTerritoryClickById('${t.id}')">
        ${bastionRing}
        <circle cx="${t.x}" cy="${t.y}" r="${radius}" fill="${fill}" stroke="${stroke}" class="terr-circle"/>
        <text x="${t.x}" y="${t.y + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="#ffffff">${t.troops}</text>
        <text x="${t.x}" y="${t.y + radius + 12}" text-anchor="middle" font-size="9" font-weight="600" fill="#e2e8f0">${t.name}</text>
        ${monumentSvg}
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <div class="risk-svg-wrap" id="risk-svg-wrap">
      <svg id="risk-svg" viewBox="0 0 1000 520">
        <g id="map-transform-group">
          ${linesSvg.join('')}
          ${nodesSvg}
        </g>
      </svg>
    </div>
  `;

  setupPanListeners();
  applyMapTransform();
}

function applyMapTransform() {
  const g = document.getElementById('map-transform-group');
  if (g) {
    g.setAttribute('transform', `translate(${state.panX}, ${state.panY}) scale(${state.zoom})`);
  }
}

function setupPanListeners() {
  const wrap = document.getElementById('risk-svg-wrap');
  if (!wrap) return;
  wrap.onmousedown = e => {
    if (e.target.closest('.terr-node')) return;
    state.isPanning = true;
    state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
  };
  window.onmousemove = e => {
    if (!state.isPanning) return;
    state.panX = e.clientX - state.panStart.x;
    state.panY = e.clientY - state.panStart.y;
    applyMapTransform();
  };
  window.onmouseup = () => {
    state.isPanning = false;
  };
}

function renderSidebar() {
  const sb = document.getElementById('scoreboard');
  sb.innerHTML = state.players.map(p => `
    <div class="score-row">
      <span style="color:${p.civ.color};font-weight:700;">${p.name}</span>
      <span>🪙 ${p.gold} | 🏆 <strong>${getPlayerTotalVP(p)}/${state.victoryGoal}</strong></span>
    </div>
  `).join('');

  const market = document.getElementById('tile-market');
  const activePlayer = getActivePlayer();
  market.innerHTML = state.marketTiles.map(tile => {
    const canBuy = state.interactionMode === 'buy_tile' && canPlayerBuyTile(activePlayer, tile);
    return `
      <div class="power-tile ${tile.color}" style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <div>
          <strong>${tile.name}</strong> (${colorNameIt(tile.color)} Lv.${tile.level}) — 🪙 ${getTileCost(activePlayer, tile)}<br/>
          <span style="color:#94a3b8">${tile.desc}</span>
        </div>
        ${canBuy ? `<button class="btn btn-gold btn-small" onclick="buyMarketTile('${tile.id}')">Compra</button>` : ''}
      </div>
    `;
  }).join('');
}

// AZIONI GIOCATORE
function selectActionSlot(player, level, slot) {
  player.tokensLeft -= 1;
  player.occupiedSlots.push(slot.id);
  player.occupiedLevels.add(level);

  addLog(`${player.name} piazza un segnalino su "${slot.title}" (Livello ${level}).`);

  if (slot.type === 'tax') {
    const civTaxBonus = player.civ.bonusType === 'tax_bonus' ? player.civ.bonusValue : 0;
    const totalTax = 2 + civTaxBonus;
    player.gold += totalTax;
    const ownedTerr = state.territories.find(t => t.ownerId === player.id);
    if (ownedTerr) spawnFloatingFx(ownedTerr.x, ownedTerr.y, `+${totalTax} Oro`);
    addLog(`${player.name} riscuote ${totalTax} Oro.`);
    finishPlayerAction();
  } else if (slot.type === 'recruit') {
    state.interactionMode = 'recruit';
    setInstruction('Clicca un tuo territorio sul planisfero per reclutare unità (1 Oro per unità, max 3).');
    renderAll();
  } else if (slot.type === 'monument') {
    state.interactionMode = 'monument';
    setInstruction('Clicca un tuo territorio per costruire o elevare un Monumento (Rosso, Bianco, Blu).');
    renderAll();
  } else if (slot.type === 'buy_tile') {
    state.interactionMode = 'buy_tile';
    setInstruction('Compra una Tessera Potere dal Mercato a destra (serve Monumento stesso colore e lv >= tessera).');
    renderMapControls(`<button class="btn btn-secondary btn-small" onclick="cancelOrFinishAction()">Termina Azione</button>`);
    renderAll();
  } else if (slot.type === 'move_attack') {
    const bonusMove = player.tiles.filter(t => t.effect === 'move_bonus').reduce((s, t) => s + t.value, 0);
    state.moveStepsLeft = 1 + bonusMove;
    state.interactionMode = 'move_from';
    setInstruction(`Muovi & Attacca (Passi: ${state.moveStepsLeft}): seleziona un tuo territorio con truppe.`);
    renderMapControls(`<button class="btn btn-secondary btn-small" onclick="cancelOrFinishAction()">Termina Movimento</button>`);
    renderAll();
  }
}

function isTerritorySelectable(t, player) {
  if (player.isBot || state.phase !== 'DAY') return false;
  if (state.interactionMode === 'recruit') return t.ownerId === player.id;
  if (state.interactionMode === 'monument') return t.ownerId === player.id;
  if (state.interactionMode === 'move_from') return t.ownerId === player.id && t.troops > 0;
  if (state.interactionMode === 'move_to') {
    const origin = state.territories.find(x => x.id === state.selectedTerritoryId);
    if (!origin) return false;
    const isNeighbor = origin.neighbors.includes(t.id);
    const monumentToPort = Boolean(origin.monument) && t.tag === 'port';
    return t.id !== origin.id && (isNeighbor || monumentToPort);
  }
  return false;
}

window.handleTerritoryClickById = function(terrId) {
  const player = getActivePlayer();
  const t = state.territories.find(x => x.id === terrId);
  if (!t || !isTerritorySelectable(t, player)) return;

  if (state.interactionMode === 'recruit') {
    const maxRecruit = Math.min(3, player.gold);
    if (maxRecruit <= 0) {
      addLog(`${player.name} non ha Oro sufficiente per reclutare.`);
      return cancelOrFinishAction();
    }
    const bonus = player.civ.bonusType === 'recruit_bonus' ? player.civ.bonusValue : 0;
    const gained = maxRecruit + bonus;
    player.gold -= maxRecruit;
    t.troops += gained;
    triggerTerritoryAnim(t.id, 'monument-anim', `+${gained} Unità`);
    addLog(`${player.name} spende ${maxRecruit} Oro e schiera ${gained} unità a ${t.name}.`);
    return cancelOrFinishAction();
  }

  if (state.interactionMode === 'monument') {
    if (!t.monument) {
      renderMapControls(`
        <button class="btn btn-danger btn-small" onclick="buildOrUpgradeMonument('${t.id}', 'red')">Monumento Rosso (Lv.1)</button>
        <button class="btn btn-secondary btn-small" onclick="buildOrUpgradeMonument('${t.id}', 'white')">Monumento Bianco (Lv.1)</button>
        <button class="btn btn-primary btn-small" onclick="buildOrUpgradeMonument('${t.id}', 'blue')">Monumento Blu (Lv.1)</button>
        <button class="btn btn-secondary btn-small" onclick="cancelOrFinishAction()">Annulla</button>
      `);
    } else if (t.monument.level < 4) {
      renderMapControls(`
        <button class="btn btn-gold btn-small" onclick="buildOrUpgradeMonument('${t.id}', '${t.monument.color}')">Eleva a Livello ${t.monument.level + 1}</button>
        <button class="btn btn-secondary btn-small" onclick="cancelOrFinishAction()">Annulla</button>
      `);
    } else {
      setInstruction('Questo Monumento è già al livello massimo (4).');
    }
    return;
  }

  if (state.interactionMode === 'move_from') {
    state.selectedTerritoryId = t.id;
    state.interactionMode = 'move_to';
    setInstruction(`Partenza: ${t.name} (${t.troops} unità). Clicca una destinazione collegata o un Porto (se hai un Monumento).`);
    renderAll();
    return;
  }

  if (state.interactionMode === 'move_to') {
    const origin = state.territories.find(x => x.id === state.selectedTerritoryId);
    executeMoveOrAttack(player, origin, t);
  }
};

window.buildOrUpgradeMonument = function(terrId, color) {
  const player = getActivePlayer();
  const t = state.territories.find(x => x.id === terrId);
  const nextLevel = t.monument ? t.monument.level + 1 : 1;
  const discount = (player.civ.bonusType === 'monument_discount' ? 1 : 0) +
    player.tiles.filter(x => x.effect === 'monument_discount').reduce((s, x) => s + x.value, 0);
  const cost = Math.max(1, nextLevel - discount);

  if (player.gold < cost) {
    addLog(`${player.name} non ha ${cost} Oro per il Monumento.`);
    return cancelOrFinishAction();
  }

  player.gold -= cost;
  t.monument = { color, level: nextLevel };
  triggerTerritoryAnim(t.id, 'monument-anim', `Mon. Lv.${nextLevel}`);
  addLog(`${player.name} eleva un Monumento ${colorNameIt(color)} al Livello ${nextLevel} a ${t.name} (costo ${cost} Oro).`);
  cancelOrFinishAction();
};

function getTileCost(player, tile) {
  const discount = player.civ.bonusType === 'tile_discount' ? 1 : 0;
  return Math.max(1, tile.cost - discount);
}

function canPlayerBuyTile(player, tile) {
  const cost = getTileCost(player, tile);
  if (player.gold < cost) return false;
  return state.territories.some(t =>
    t.ownerId === player.id && t.monument && t.monument.color === tile.color && t.monument.level >= tile.level
  );
}

window.buyMarketTile = function(tileId) {
  const player = getActivePlayer();
  const idx = state.marketTiles.findIndex(t => t.id === tileId);
  if (idx === -1) return;
  const tile = state.marketTiles[idx];
  const cost = getTileCost(player, tile);
  player.gold -= cost;
  player.tiles.push(tile);
  state.marketTiles.splice(idx, 1);
  addLog(`${player.name} ottiene la tessera "${tile.name}" per ${cost} Oro.`);
  cancelOrFinishAction();
};

function executeMoveOrAttack(player, origin, target) {
  const movingTroops = origin.troops > 1 ? origin.troops - 1 : origin.troops;
  origin.troops -= movingTroops;
  if (origin.troops === 0) origin.ownerId = null;

  if (target.ownerId === null || target.ownerId === player.id) {
    target.ownerId = player.id;
    target.troops += movingTroops;
    triggerTerritoryAnim(target.id, 'monument-anim', `+${movingTroops} Truppe`);
    addLog(`${player.name} sposta ${movingTroops} unità da ${origin.name} a ${target.name}.`);
    afterMoveStep(target);
  } else {
    const defender = state.players[target.ownerId];
    startBattle(player, defender, target, movingTroops);
  }
}

function afterMoveStep(newOrigin) {
  state.moveStepsLeft -= 1;
  if (state.moveStepsLeft > 0 && newOrigin.troops > 0) {
    state.selectedTerritoryId = newOrigin.id;
    state.interactionMode = 'move_to';
    setInstruction(`Passo extra disponibile! Puoi muovere ancora da ${newOrigin.name} o terminare.`);
    renderAll();
  } else {
    cancelOrFinishAction();
  }
}

// BATTAGLIA
function startBattle(attacker, defender, territory, attackingTroops) {
  state.battleContext = {
    attacker, defender, territory, attackingTroops,
    attPicked: [], defPicked: []
  };
  if (attacker.isBot) state.battleContext.attPicked = pickBotBattleCards(attacker);
  if (defender.isBot) state.battleContext.defPicked = pickBotBattleCards(defender);

  if (attacker.isBot && defender.isBot) {
    resolveBattle();
  } else {
    openBattleModal();
  }
}

function pickBotBattleCards(bot) {
  const hand = [...bot.battleHand].sort((a, b) => b.strength - a.strength);
  return [hand[0], hand[hand.length - 1]];
}

function openBattleModal() {
  const ctx = state.battleContext;
  const modal = document.getElementById('battle-modal');
  modal.classList.remove('hidden');

  document.getElementById('battle-summary').innerHTML = `
    <strong>${ctx.attacker.name}</strong> (${ctx.attackingTroops} unità) invade <strong>${ctx.territory.name}</strong> difeso da <strong>${ctx.defender.name}</strong> (${ctx.territory.troops} unità)!
  `;

  const currentChooser = ctx.attPicked.length < 2 ? ctx.attacker : ctx.defender;
  const currentList = ctx.attPicked.length < 2 ? ctx.attPicked : ctx.defPicked;

  document.getElementById('battle-stage').innerHTML = `
    <p>Tocca a <strong>${currentChooser.name}</strong>: scegli <strong>2 carte</strong> (la 1ª viene <u>GIOCATA</u>, la 2ª viene <u>SCARTATA</u>).</p>
    <div class="battle-cards-grid">
      ${currentChooser.battleHand.map(c => {
        const idx = currentList.findIndex(x => x.id === c.id);
        const label = idx === 0 ? '✅ GIOCATA' : idx === 1 ? '🗑️ SCARTATA' : 'Seleziona';
        return `
          <div class="battle-card ${idx !== -1 ? 'picked' : ''}" onclick="selectBattleCard('${c.id}')">
            <strong>${c.name}</strong><br/>
            <span>⚔️ Forza: +${c.strength}</span><br/>
            <span>💥 Danno: ${c.damage} | 🛡️ Prot: ${c.shield}</span><br/>
            <small style="color:#f5b942">${label}</small>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.selectBattleCard = function(cardId) {
  const ctx = state.battleContext;
  const isAtt = ctx.attPicked.length < 2;
  const list = isAtt ? ctx.attPicked : ctx.defPicked;
  const player = isAtt ? ctx.attacker : ctx.defender;
  if (list.some(c => c.id === cardId)) return;
  list.push(player.battleHand.find(c => c.id === cardId));

  if (ctx.attPicked.length === 2 && ctx.defPicked.length === 2) {
    document.getElementById('battle-modal').classList.add('hidden');
    resolveBattle();
  } else {
    openBattleModal();
  }
};

function resolveBattle() {
  const ctx = state.battleContext;
  const [attPlayed, attDiscarded] = ctx.attPicked;
  const [defPlayed, defDiscarded] = ctx.defPicked;

  [ctx.attacker, ctx.defender].forEach((p, idx) => {
    const used = idx === 0 ? [attPlayed.id, attDiscarded.id] : [defPlayed.id, defDiscarded.id];
    p.battleHand = p.battleHand.filter(c => !used.includes(c.id));
    if (p.battleHand.length < 2) p.battleHand = JSON.parse(JSON.stringify(BASE_BATTLE_CARDS));
  });

  const attCivBonus = (ctx.attacker.civ.bonusType === 'attack_strength' ? 1 : 0) +
    (ctx.attacker.civ.bonusType === 'bastion_attack' && ctx.territory.tag === 'bastion' ? 1 : 0);
  const attTileBonus = ctx.attacker.tiles.filter(t => t.effect === 'attack_bonus').reduce((s, t) => s + t.value, 0);
  const attTotal = ctx.attackingTroops + attPlayed.strength + attCivBonus + attTileBonus;
  const defTotal = ctx.territory.troops + defPlayed.strength;

  const attExtraDmg = ctx.attacker.tiles.filter(t => t.effect === 'damage_bonus').reduce((s, t) => s + t.value, 0);
  const attShieldBonus = (ctx.attacker.civ.bonusType === 'shield_all' ? 1 : 0) +
    ctx.attacker.tiles.filter(t => t.effect === 'shield_bonus').reduce((s, t) => s + t.value, 0);
  const defShieldBonus = (ctx.defender.civ.bonusType === 'defense_shield' ? 1 : 0) +
    (ctx.defender.civ.bonusType === 'shield_all' ? 1 : 0) +
    ctx.defender.tiles.filter(t => t.effect === 'shield_bonus').reduce((s, t) => s + t.value, 0);

  const attLosses = Math.max(0, defPlayed.damage - (attPlayed.shield + attShieldBonus));
  const defLosses = Math.max(0, (attPlayed.damage + attExtraDmg) - (defPlayed.shield + defShieldBonus));

  const survivingAtt = Math.max(0, ctx.attackingTroops - attLosses);
  const survivingDef = Math.max(0, ctx.territory.troops - defLosses);

  addLog(`BATTAGLIA a ${ctx.territory.name}: ${ctx.attacker.name} [${attTotal}] vs ${ctx.defender.name} [${defTotal}] (Perdite: Att -${attLosses}, Dif -${defLosses}).`);

  if (attTotal > defTotal && survivingAtt > 0) {
    ctx.territory.ownerId = ctx.attacker.id;
    ctx.territory.troops = survivingAtt;
    triggerTerritoryAnim(ctx.territory.id, 'battle-shake', `CONQUISTA!`);
    addLog(`🏆 ${ctx.attacker.name} conquista ${ctx.territory.name} (${survivingAtt} unità rimaste)!`);
  } else {
    ctx.territory.troops = survivingDef;
    if (survivingDef === 0) ctx.territory.ownerId = null;
    triggerTerritoryAnim(ctx.territory.id, 'battle-shake', `DIFESA!`);
    addLog(`🛡️ ${ctx.defender.name} respinge l’invasione a ${ctx.territory.name}!`);
  }

  state.battleContext = null;
  cancelOrFinishAction();
}

window.cancelOrFinishAction = function() {
  state.interactionMode = null;
  state.selectedTerritoryId = null;
  state.moveStepsLeft = 0;
  renderMapControls('');
  setInstruction('Seleziona un’azione sulla tua plancia.');
  finishPlayerAction();
};

function finishPlayerAction() {
  if (checkVictory()) return;
  const totalPlayers = state.players.length;
  for (let step = 1; step <= totalPlayers; step++) {
    const nextPos = (state.currentTurnPos + step) % totalPlayers;
    const candidate = state.players[state.turnOrder[nextPos]];
    if (candidate.tokensLeft > 0) {
      state.currentTurnPos = nextPos;
      renderAll();
      checkBotTurn();
      return;
    }
  }
  endDayPhase();
}

function endDayPhase() {
  addLog('--- FINE GIORNO: Rendite Bastioni & Continenti ---');
  state.players.forEach(p => {
    let bastions = 0;
    state.territories.forEach(t => {
      if (t.ownerId === p.id && t.tag === 'bastion') bastions++;
    });
    const conts = getControlledContinents(p.id);
    const contGold = conts.reduce((s, c) => s + c.bonusGold, 0);

    if (bastions > 0 || contGold > 0) {
      p.gold += bastions + contGold;
      p.permanentVP += bastions;
      addLog(`${p.name} ottiene +${bastions + contGold} Oro e +${bastions} PV permanenti.`);
    }
  });

  if (checkVictory()) return;
  startNightPhase();
}

function startNightPhase() {
  state.phase = 'NIGHT';
  addLog('=== FASE NOTTURNA ===');

  state.players.forEach(p => {
    const civNightGold = p.civ.bonusType === 'night_gold' ? p.civ.bonusValue : 0;
    let tileNightGold = 2;
    p.tiles.filter(t => t.phase === 'night').forEach(t => {
      if (t.effect === 'night_gold') tileNightGold += t.value;
      if (t.effect === 'night_vp') p.permanentVP += t.value;
      if (t.effect === 'night_vp_bastion') {
        if (state.territories.some(terr => terr.ownerId === p.id && terr.tag === 'bastion')) p.permanentVP += t.value;
      }
      if (t.effect === 'night_troop') {
        const myTerr = state.territories.find(terr => terr.ownerId === p.id);
        if (myTerr) myTerr.troops += t.value;
      }
    });

    if (p.civ.bonusType === 'night_nyx_vp' && state.round % 2 === 0) {
      const cnt = state.territories.filter(terr => terr.ownerId === p.id).length;
      if (cnt >= 2) p.permanentVP += 1;
    }

    p.gold += 2 + civNightGold + tileNightGold;
    p.tokensLeft = 5;
    p.occupiedSlots = [];
    p.occupiedLevels = new Set();
  });

  if (checkVictory()) return;

  const sortedByLowestVP = [...state.players].sort((a, b) => getPlayerTotalVP(a) - getPlayerTotalVP(b));
  const chooser = sortedByLowestVP[0];

  if (chooser.isBot) {
    state.turnOrder = sortedByLowestVP.map(p => p.id);
    addLog(`${chooser.name} (meno PV) imposta l’ordine del nuovo Giorno.`);
    startNewDay();
  } else {
    openNightOrderModal(chooser, sortedByLowestVP);
  }
}

function openNightOrderModal(chooser, sortedPlayers) {
  const modal = document.getElementById('night-order-modal');
  modal.classList.remove('hidden');
  document.getElementById('night-order-desc').textContent =
    `${chooser.name} ha il minor numero di PV (${getPlayerTotalVP(chooser)}) e decide l’ordine del prossimo Giorno.`;

  document.getElementById('night-order-controls').innerHTML = `
    <button class="btn btn-primary" onclick="confirmNightOrder('asc')">Dal meno PV al più PV</button>
    <button class="btn btn-secondary" onclick="confirmNightOrder('reverse')">Ordine Inverso</button>
  `;
  window._nightSorted = sortedPlayers;
}

window.confirmNightOrder = function(mode) {
  document.getElementById('night-order-modal').classList.add('hidden');
  const list = window._nightSorted;
  state.turnOrder = (mode === 'asc' ? list : [...list].reverse()).map(p => p.id);
  startNewDay();
};

function startNewDay() {
  state.round += 1;
  state.phase = 'DAY';
  state.currentTurnPos = 0;
  addLog(`☀️ INIZIO GIORNO ${state.round}!`);
  renderAll();
  checkBotTurn();
}

function checkBotTurn() {
  const player = getActivePlayer();
  if (!player || !player.isBot || state.phase !== 'DAY') return;

  setTimeout(() => {
    const availableActions = [];
    ACTION_LEVELS.forEach(lvl => {
      if (!mustPickMissingLevel(player, lvl.level)) return;
      lvl.slots.forEach(slot => {
        if (!player.occupiedSlots.includes(slot.id)) availableActions.push({ level: lvl.level, slot });
      });
    });
    if (availableActions.length === 0) return;

    const chosen = availableActions[Math.floor(Math.random() * availableActions.length)];
    player.tokensLeft -= 1;
    player.occupiedSlots.push(chosen.slot.id);
    player.occupiedLevels.add(chosen.level);
    addLog(`🤖 ${player.name} gioca "${chosen.slot.title}" (Lv.${chosen.level}).`);

    const myTerrs = state.territories.filter(t => t.ownerId === player.id);

    if (chosen.slot.type === 'tax') {
      player.gold += 2 + (player.civ.bonusType === 'tax_bonus' ? 1 : 0);
      finishPlayerAction();
    } else if (chosen.slot.type === 'recruit' && myTerrs.length > 0 && player.gold > 0) {
      const qty = Math.min(2, player.gold);
      player.gold -= qty;
      const gained = qty + (player.civ.bonusType === 'recruit_bonus' ? 1 : 0);
      myTerrs[0].troops += gained;
      triggerTerritoryAnim(myTerrs[0].id, 'monument-anim', `+${gained}`);
      finishPlayerAction();
    } else if (chosen.slot.type === 'monument' && myTerrs.length > 0 && player.gold >= 2) {
      const targetMon = myTerrs.find(t => !t.monument || t.monument.level < 4);
      if (targetMon) {
        const colors = ['red', 'white', 'blue'];
        const col = targetMon.monument ? targetMon.monument.color : colors[Math.floor(Math.random() * 3)];
        const lvl = targetMon.monument ? targetMon.monument.level + 1 : 1;
        player.gold -= 1;
        targetMon.monument = { color: col, level: lvl };
        triggerTerritoryAnim(targetMon.id, 'monument-anim', `Lv.${lvl}`);
      }
      finishPlayerAction();
    } else if (chosen.slot.type === 'buy_tile') {
      const affordable = state.marketTiles.find(tile => canPlayerBuyTile(player, tile));
      if (affordable) window.buyMarketTile(affordable.id);
      else finishPlayerAction();
    } else if (chosen.slot.type === 'move_attack') {
      const armyTerr = myTerrs.find(t => t.troops >= 2);
      if (armyTerr) {
        const nid = armyTerr.neighbors[Math.floor(Math.random() * armyTerr.neighbors.length)];
        const target = state.territories.find(t => t.id === nid);
        if (target) {
          executeMoveOrAttack(player, armyTerr, target);
          return;
        }
      }
      finishPlayerAction();
    } else {
      finishPlayerAction();
    }
  }, 450);
}

function checkVictory() {
  const winner = state.players.find(p => getPlayerTotalVP(p) >= state.victoryGoal);
  if (!winner) return false;
  const modal = document.getElementById('info-modal');
  document.getElementById('info-modal-title').textContent = '🏆 VITTORIA!';
  document.getElementById('info-modal-body').innerHTML = `
    <p style="font-size:1.05rem;"><strong>${winner.name}</strong> (${winner.civ.commander}) raggiunge <strong>${getPlayerTotalVP(winner)} PV</strong> e conquista il planisfero!</p>
    <button class="btn btn-primary" style="margin-top:10px;" onclick="location.reload()">Nuova Partita</button>
  `;
  modal.classList.remove('hidden');
  return true;
}

function showRulesModal() {
  const modal = document.getElementById('info-modal');
  document.getElementById('info-modal-title').textContent = 'Regole — Imperia: Giorno & Notte';
  document.getElementById('info-modal-body').innerHTML = `
    <ul style="padding-left:18px;line-height:1.5;font-size:0.88rem;">
      <li><strong>Planisfero:</strong> 42 territori in 6 continenti (6 giocatori) oppure 60 territori in 7 continenti (10 giocatori).</li>
      <li><strong>Bastioni (cerchio dorato tratteggiato):</strong> +1 PV e +1 Oro a fine Giorno.</li>
      <li><strong>Monumenti &amp; Porti:</strong> Eleva un Monumento (Rosso, Bianco, Blu, lv. 1–4; lv. 4 = +1 PV). Da un territorio con Monumento puoi spostarti verso un Porto.</li>
      <li><strong>Battaglie:</strong> Scegli 2 carte (1 giocata, 1 scartata). Vince chi ha Forza Totale maggiore. Perdite = Danno avversario - Protezione propria.</li>
      <li><strong>Notte:</strong> +2 Oro base, +2 Oro da tessere, effetti Notte e ordine turno deciso da chi ha meno PV.</li>
    </ul>
  `;
  modal.classList.remove('hidden');
}

function setInstruction(text) {
  document.getElementById('map-instruction').textContent = text;
}
function renderMapControls(html) {
  document.getElementById('map-controls').innerHTML = html;
}
function addLog(msg) {
  const log = document.getElementById('game-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = msg;
  log.prepend(entry);
}
function colorNameIt(c) {
  return { red: 'Rosso', white: 'Bianco', blue: 'Blu' }[c] || c;
}
