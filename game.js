// ============================================================
//  BASKETBALL BOSS BATTLE  —  Mason's Game
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");
const W = canvas.width  = 800;
const H = canvas.height = 590;

// ─── WORLD & BOSS DATA ───────────────────────────────────────
const WORLDS = [
  {
    id: 0, name: "The Gym", emoji: "🏀",
    bg: "#1a3a5c", floor: "#b5651d",
    trophiesNeeded: 0, trophiesToNext: 1, pointsToWin: 5, trophyReward: 10,
    boss: { name: "Coach Brick", emoji: "😤", color: "#c0392b", size: 52, shotChance: 0.38, taunt: "Is that all you got?" },
  },
  {
    id: 1, name: "City Rooftop", emoji: "🏙️",
    bg: "#1c2833", floor: "#717d7e",
    trophiesNeeded: 1000, trophiesToNext: 5000, pointsToWin: 7, trophyReward: 1,
    boss: { name: "Rooftop Rex", emoji: "😠", color: "#d35400", size: 60, shotChance: 0.52, taunt: "Get off my court!" },
  },
  {
    id: 2, name: "Outer Space", emoji: "🚀",
    bg: "#050510", floor: "#2c2c5a",
    trophiesNeeded: 5000, trophiesToNext: 15000, pointsToWin: 9, trophyReward: 1,
    boss: { name: "Alien Slam", emoji: "👽", color: "#1abc9c", size: 68, shotChance: 0.65, taunt: "Earthlings can't ball!" },
  },
  {
    id: 3, name: "Volcano Court", emoji: "🌋",
    bg: "#2d0000", floor: "#7b241c",
    trophiesNeeded: 15000, trophiesToNext: 20000, pointsToWin: 11, trophyReward: 1,
    boss: { name: "Lava King", emoji: "👹", color: "#e74c3c", size: 76, shotChance: 0.78, taunt: "You'll burn for this!" },
  },
  {
    id: 4, name: "Arctic Court", emoji: "❄️",
    bg: "#0a1628", floor: "#a8d8ea",
    trophiesNeeded: 20000, trophiesToNext: 50000, pointsToWin: 13, trophyReward: 1,
    boss: { name: "Frost Giant", emoji: "🧊", color: "#74b9ff", size: 84, shotChance: 0.83, taunt: "You'll freeze before you score!" },
  },
  {
    id: 5, name: "Haunted Court", emoji: "👻",
    bg: "#0d0015", floor: "#2d1b4e",
    trophiesNeeded: 50000, trophiesToNext: 100000, pointsToWin: 15, trophyReward: 1,
    boss: { name: "Ghost Guard", emoji: "💀", color: "#a29bfe", size: 90, shotChance: 0.88, taunt: "No one escapes my court!" },
  },
  {
    id: 6, name: "Dragon's Lair", emoji: "🐉",
    bg: "#1a0000", floor: "#4a0000",
    trophiesNeeded: 100000, trophiesToNext: Infinity, pointsToWin: 17, trophyReward: 1,
    boss: { name: "Dragon King", emoji: "🔥", color: "#ff7675", size: 96, shotChance: 0.93, taunt: "NONE shall defeat the Dragon King!" },
  },
];

// ─── GAME STATE ──────────────────────────────────────────────
let trophies   = 0;
let screen     = "worldMap";   // "worldMap" | "match" | "matchEnd"
let world      = null;
let playerScore = 0;
let bossScore   = 0;
// turn: "player" | "animating" | "bossWait" | "ending"
let turn       = "player";
let matchWon   = false;

// Shot meter
let meter = { active: false, pos: 0, dir: 1, speed: 0.016 };

// Ball arc animation
let ball = { active: false, frames: [], idx: 0, scored: false, byPlayer: true };

// Popup message
let popup = { text: "", color: "#fff", life: 0 };

// Boss "thinking" timer (frames before boss shoots)
let bossWaitTimer = 0;

// ─── LAYOUT CONSTANTS ────────────────────────────────────────
const FLOOR_Y   = 400;
const HOOP_R    = { cx: 645, ry: 195, half: 22 };  // right hoop  – player scores here
const HOOP_L    = { cx: 155, ry: 195, half: 22 };  // left  hoop  – boss  scores here
const PLAYER_X  = 130;
const BOSS_X    = 670;

// World-map card layout  (2 rows: 4 cards on top, 3 on bottom)
const CARD_W = 160, CARD_H = 178, CARD_GAP = 12, CARD_ROW_GAP = 14;
const CARDS_Y = 122;
const ROW1_X = (W - (CARD_W * 4 + CARD_GAP * 3)) / 2;
const ROW2_X = (W - (CARD_W * 3 + CARD_GAP * 2)) / 2;

function cardPos(i) {
  const row = i < 4 ? 0 : 1;
  const col = i < 4 ? i : i - 4;
  return {
    x: (row === 0 ? ROW1_X : ROW2_X) + col * (CARD_W + CARD_GAP),
    y: CARDS_Y + row * (CARD_H + CARD_ROW_GAP),
  };
}

// ─── INPUT ───────────────────────────────────────────────────
let mouse = { x: 0, y: 0 };

canvas.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top)  * (H / r.height);
});

canvas.addEventListener("click", handleClick);
window.addEventListener("keydown", e => {
  if (e.code === "Space") { e.preventDefault(); handleClick(); }
});

function handleClick() {
  if (screen === "worldMap") {
    WORLDS.forEach((w, i) => {
      const { x: cx, y: cy } = cardPos(i);
      if (mouse.x >= cx && mouse.x <= cx + CARD_W &&
          mouse.y >= cy && mouse.y <= cy + CARD_H &&
          trophies >= w.trophiesNeeded) {
        startMatch(w);
      }
    });
    return;
  }
  if (screen === "matchEnd") { screen = "worldMap"; return; }
  if (screen === "match" && turn === "player") {
    if (!meter.active) {
      meter.active = true;
      meter.pos    = 0;
      meter.dir    = 1;
    } else {
      firePlayerShot();
    }
  }
}

// ─── MATCH LOGIC ─────────────────────────────────────────────
function startMatch(w) {
  world       = w;
  playerScore = 0;
  bossScore   = 0;
  turn        = "player";
  meter.active = false;
  ball.active  = false;
  popup.life   = 0;
  screen       = "match";
}

function firePlayerShot() {
  const p = meter.pos;
  meter.active = false;
  // Green zone 0.42–0.58 = definite score; yellow 0.33–0.65 = 60%; else miss
  let scored;
  if (p >= 0.42 && p <= 0.58)      scored = true;
  else if (p >= 0.33 && p <= 0.65) scored = Math.random() < 0.6;
  else                              scored = false;
  launchBall(PLAYER_X, FLOOR_Y - 30, HOOP_R, scored, true);
}

function bossTakesShot() {
  const scored = Math.random() < world.boss.shotChance;
  launchBall(BOSS_X, FLOOR_Y - 30, HOOP_L, scored, false);
}

// Build a quadratic-bezier arc and store it as pre-computed frames
function launchBall(sx, sy, hoop, scored, byPlayer) {
  const ex = scored ? hoop.cx : hoop.cx + (Math.random() * 70 - 35);
  const ey = scored ? hoop.ry : hoop.ry + (Math.random() * 30 + 10);
  const peakY = Math.min(sy, ey) - 130;
  const midX  = (sx + ex) / 2;
  const FRAMES = 55;
  const frames = [];
  for (let i = 0; i <= FRAMES; i++) {
    const t  = i / FRAMES;
    const mt = 1 - t;
    frames.push({
      x: mt * mt * sx + 2 * mt * t * midX + t * t * ex,
      y: mt * mt * sy + 2 * mt * t * peakY + t * t * ey,
    });
  }
  ball = { active: true, frames, idx: 0, scored, byPlayer };
  turn = "animating";
}

function finishShot() {
  if (ball.byPlayer) {
    if (ball.scored) { playerScore++; showPopup("SWISH! +1", "#f1c40f"); }
    else              showPopup("Missed!", "#e74c3c");
  } else {
    if (ball.scored) { bossScore++; showPopup(world.boss.name + " scores!", "#e74c3c"); }
    else              showPopup("Boss missed!", "#2ecc71");
  }

  // Check for match end
  if (playerScore >= world.pointsToWin || bossScore >= world.pointsToWin) {
    matchWon = playerScore >= world.pointsToWin;
    if (matchWon) trophies += world.trophyReward;
    turn = "ending";
    setTimeout(() => { screen = "matchEnd"; }, 1400);
    return;
  }

  // Next turn
  if (ball.byPlayer) {
    turn = "bossWait";
    bossWaitTimer = 80;
  } else {
    turn = "player";
    meter.active = false;
  }
}

function showPopup(text, color) { popup = { text, color, life: 110 }; }

// ─── UPDATE ──────────────────────────────────────────────────
function update() {
  // Meter oscillation
  if (meter.active) {
    meter.pos += meter.dir * meter.speed;
    if (meter.pos >= 1) { meter.pos = 1; meter.dir = -1; }
    if (meter.pos <= 0) { meter.pos = 0; meter.dir =  1; }
  }

  // Ball animation
  if (ball.active) {
    ball.idx++;
    if (ball.idx >= ball.frames.length) {
      ball.active = false;
      finishShot();
    }
  }

  // Boss wait countdown
  if (turn === "bossWait") {
    bossWaitTimer--;
    if (bossWaitTimer <= 0) bossTakesShot();
  }

  // Popup fade
  if (popup.life > 0) popup.life--;
}

// ─── DRAW ────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);
  if (screen === "worldMap") drawWorldMap();
  else if (screen === "match")    drawMatch();
  else if (screen === "matchEnd") drawMatchEnd();
}

// ── World Map ─────────────────────────────────────────────────
function drawWorldMap() {
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = "#f1c40f";
  ctx.font = "bold 30px 'Courier New'";
  ctx.textAlign = "center";
  ctx.fillText("🏀 BASKETBALL BOSS BATTLE 🏆", W / 2, 48);

  ctx.fillStyle = "#ecf0f1";
  ctx.font = "17px 'Courier New'";
  ctx.fillText("Trophies: " + trophies + " 🏆", W / 2, 80);

  ctx.fillStyle = "#888";
  ctx.font = "12px 'Courier New'";
  ctx.fillText("Click a world to play  •  beat the boss to earn trophies", W / 2, 106);

  WORLDS.forEach((w, i) => {
    const { x: cx, y: cy } = cardPos(i);
    const locked  = trophies < w.trophiesNeeded;
    const hovered = !locked && mouse.x >= cx && mouse.x <= cx + CARD_W
                            && mouse.y >= cy && mouse.y <= cy + CARD_H;

    ctx.fillStyle = locked ? "#1a1a2a" : w.bg;
    rrect(cx, cy, CARD_W, CARD_H, 12); ctx.fill();
    ctx.strokeStyle = hovered ? "#f1c40f" : (locked ? "#333" : "#555");
    ctx.lineWidth   = hovered ? 3 : 2;
    rrect(cx, cy, CARD_W, CARD_H, 12); ctx.stroke();

    ctx.globalAlpha = locked ? 0.35 : 1;

    ctx.font = "34px serif";
    ctx.textAlign = "center";
    ctx.fillText(w.emoji, cx + CARD_W / 2, cy + 46);

    ctx.fillStyle = "#ecf0f1";
    ctx.font = "bold 12px 'Courier New'";
    ctx.fillText(w.name, cx + CARD_W / 2, cy + 70);

    // Boss icon (colored circle + emoji)
    ctx.fillStyle = w.boss.color;
    ctx.beginPath();
    ctx.arc(cx + CARD_W / 2, cy + 112, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "22px serif";
    ctx.fillText(w.boss.emoji, cx + CARD_W / 2, cy + 120);

    ctx.fillStyle = w.boss.color;
    ctx.font = "10px 'Courier New'";
    ctx.fillText(w.boss.name, cx + CARD_W / 2, cy + 148);

    ctx.fillStyle = locked ? "#aaa" : "#2ecc71";
    ctx.font = "10px 'Courier New'";
    ctx.fillText(locked ? "🔒 Need " + w.trophiesNeeded + " 🏆" : "▶ PLAY", cx + CARD_W / 2, cy + 166);

    ctx.globalAlpha = 1;
  });
}

// ── Match ─────────────────────────────────────────────────────
function drawMatch() {
  const w = world;

  // Background + floor
  ctx.fillStyle = w.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = w.floor;
  ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);

  // Court markings
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2, FLOOR_Y); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, FLOOR_Y, 75, 0, Math.PI); ctx.stroke();

  // Hoops
  drawHoop(HOOP_L, true);
  drawHoop(HOOP_R, false);

  // Characters
  drawPlayer(PLAYER_X, FLOOR_Y);
  drawBoss(BOSS_X, FLOOR_Y, w.boss);

  // Scoreboard
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  rrect(W / 2 - 105, 8, 210, 54, 8); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 26px 'Courier New'";
  ctx.textAlign = "center";
  ctx.fillText(playerScore + "  —  " + bossScore, W / 2, 44);
  ctx.fillStyle = "#888";
  ctx.font = "11px 'Courier New'";
  ctx.fillText("first to " + w.pointsToWin + " wins", W / 2, 58);

  // Turn label (top-left)
  const isPlayerTurn = (turn === "player") ||
                       (turn === "animating" && ball.byPlayer);
  ctx.textAlign = "left";
  ctx.fillStyle = isPlayerTurn ? "#3498db" : w.boss.color;
  ctx.font = "bold 15px 'Courier New'";
  ctx.fillText(isPlayerTurn ? "YOUR TURN" : w.boss.name + "'s TURN", 14, 28);

  // World label (top-right)
  ctx.textAlign = "right";
  ctx.fillStyle = "#999";
  ctx.font = "13px 'Courier New'";
  ctx.fillText(w.emoji + " " + w.name, W - 12, 28);

  // Ball
  if (ball.active) {
    const f = ball.frames[Math.min(ball.idx, ball.frames.length - 1)];
    drawBall(f.x, f.y);
  }

  // Shot meter
  if (turn === "player" || (turn === "animating" && ball.byPlayer)) {
    if (turn === "player") drawShotMeter();
  }

  // Boss taunt while waiting
  if (turn === "bossWait") {
    ctx.fillStyle = w.boss.color;
    ctx.font = "italic 15px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText('"' + w.boss.taunt + '"', W / 2, H - 18);
  }

  // Popup
  if (popup.life > 0) {
    ctx.globalAlpha = Math.min(1, popup.life / 25);
    ctx.fillStyle = popup.color;
    ctx.font = "bold 30px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(popup.text, W / 2, H / 2 - 10);
    ctx.globalAlpha = 1;
  }
}

function drawHoop(hoop, isLeft) {
  const { cx, ry, half } = hoop;
  const boardX = isLeft ? cx - half - 10 : cx + half + 2;

  // Backboard
  ctx.fillStyle = "#dcdde1";
  ctx.fillRect(boardX, ry - 52, 8, 68);

  // Rim
  ctx.strokeStyle = "#e67e22";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - half, ry);
  ctx.lineTo(cx + half, ry);
  ctx.stroke();

  // Net lines
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const nx = cx - half + (half * 2 * i / 4);
    ctx.beginPath();
    ctx.moveTo(nx, ry);
    ctx.lineTo(cx - half / 2 + half * i / 2, ry + 28);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - half / 2, ry + 28);
  ctx.lineTo(cx + half / 2, ry + 28);
  ctx.stroke();
}

function drawPlayer(groundX, groundY) {
  const size = 50;
  const headR = 16;
  const legH  = 22;
  const bodyH = 24;
  const bodyW = 28;
  const by    = groundY - legH;

  ctx.fillStyle = "#3498db";
  // legs
  ctx.fillRect(groundX - bodyW / 2,      by, bodyW * 0.38, legH);
  ctx.fillRect(groundX + bodyW * 0.12,   by, bodyW * 0.38, legH);
  // body
  ctx.fillRect(groundX - bodyW / 2, by - bodyH, bodyW, bodyH);
  // head
  ctx.beginPath();
  ctx.arc(groundX, by - bodyH - headR, headR, 0, Math.PI * 2);
  ctx.fill();
  // face
  ctx.font = "18px serif";
  ctx.textAlign = "center";
  ctx.fillText("😊", groundX, by - bodyH - headR + 7);
}

function drawBoss(groundX, groundY, boss) {
  const s     = boss.size;
  const headR = s * 0.30;
  const bodyH = s * 0.42;
  const bodyW = s * 0.55;
  const legH  = s * 0.35;
  const by    = groundY - legH;

  ctx.fillStyle = boss.color;
  // legs
  ctx.fillRect(groundX - bodyW / 2,      by, bodyW * 0.38, legH);
  ctx.fillRect(groundX + bodyW * 0.12,   by, bodyW * 0.38, legH);
  // body
  ctx.fillRect(groundX - bodyW / 2, by - bodyH, bodyW, bodyH);
  // head
  ctx.beginPath();
  ctx.arc(groundX, by - bodyH - headR, headR, 0, Math.PI * 2);
  ctx.fill();
  // face emoji
  ctx.font = `${Math.round(headR * 1.4)}px serif`;
  ctx.textAlign = "center";
  ctx.fillText(boss.emoji, groundX, by - bodyH - headR + headR * 0.45);

  // Name label below
  ctx.fillStyle = boss.color;
  ctx.font = "11px 'Courier New'";
  ctx.fillText(boss.name, groundX, groundY + 14);
}

function drawBall(x, y) {
  // Shadow on floor
  const shadowScale = Math.max(0, 1 - (FLOOR_Y - y) / 400);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, FLOOR_Y + 4, 16 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball
  ctx.fillStyle = "#e67e22";
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c0392b";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // seams
  ctx.beginPath(); ctx.arc(x, y, 13, 0.4, Math.PI + 0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y); ctx.stroke();
}

function drawShotMeter() {
  const mx = W / 2 - 155;
  const my = H - 52;
  const mw = 310;
  const mh = 22;

  // Miss zone (red)
  ctx.fillStyle = "#e74c3c";
  rrect(mx, my, mw, mh, 5); ctx.fill();

  // Good zone (yellow) 33%–67%
  ctx.fillStyle = "#f39c12";
  ctx.fillRect(mx + mw * 0.33, my, mw * 0.34, mh);

  // Perfect zone (green) 42%–58%
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(mx + mw * 0.42, my, mw * 0.16, mh);

  // Cursor
  if (meter.active) {
    const cursorX = mx + meter.pos * mw;
    ctx.fillStyle = "#fff";
    ctx.fillRect(cursorX - 3, my - 6, 6, mh + 12);
  }

  // Instruction label
  ctx.fillStyle = "#ddd";
  ctx.font = "13px 'Courier New'";
  ctx.textAlign = "center";
  ctx.fillText(
    meter.active ? "Click or SPACE to stop the meter!" : "Click or SPACE to start your shot!",
    W / 2, H - 60
  );
}

// ── Match End ─────────────────────────────────────────────────
function drawMatchEnd() {
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";

  if (matchWon) {
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 50px 'Courier New'";
    ctx.fillText("🏆  YOU WIN!  🏆", W / 2, 175);

    ctx.fillStyle = "#ecf0f1";
    ctx.font = "22px 'Courier New'";
    ctx.fillText("+" + world.trophyReward + " trophies! Total: " + trophies + " 🏆", W / 2, 232);

    // Check what just got unlocked
    const justUnlocked = WORLDS.find(w => w.trophiesNeeded === trophies);
    if (justUnlocked) {
      ctx.fillStyle = "#2ecc71";
      ctx.font = "18px 'Courier New'";
      ctx.fillText("🔓 " + justUnlocked.name + " is now unlocked!", W / 2, 278);
    }

    ctx.fillStyle = "#aaa";
    ctx.font = "14px 'Courier New'";
    ctx.fillText("Score: You " + playerScore + " – " + bossScore + " " + world.boss.name, W / 2, 330);
  } else {
    ctx.fillStyle = "#e74c3c";
    ctx.font = "bold 50px 'Courier New'";
    ctx.fillText("💀  YOU LOSE!", W / 2, 175);

    ctx.fillStyle = "#ecf0f1";
    ctx.font = "22px 'Courier New'";
    ctx.fillText("Better luck next time!", W / 2, 232);

    ctx.fillStyle = "#aaa";
    ctx.font = "14px 'Courier New'";
    ctx.fillText("Score: You " + playerScore + " – " + bossScore + " " + world.boss.name, W / 2, 285);
  }

  ctx.fillStyle = "#888";
  ctx.font = "15px 'Courier New'";
  ctx.fillText("Click anywhere to return to the world map", W / 2, H - 30);
}

// ─── UTILITY ─────────────────────────────────────────────────
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── GAME LOOP ───────────────────────────────────────────────
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
