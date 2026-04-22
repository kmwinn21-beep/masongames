// ============================================================
//  Mason's Game — starter template
//  Change anything you want! This is YOUR game.
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");

// --- Player ---
// Change the color, size, or starting position!
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 30,
  color: "#e94560",
  speed: 4,
};

// --- Star (the thing to collect) ---
let star = spawnStar();
let score = 0;

function spawnStar() {
  // Pick a random spot inside the canvas for the star to appear
  return {
    x: Math.random() * (canvas.width - 20) + 10,
    y: Math.random() * (canvas.height - 20) + 10,
    size: 15,
    color: "#f5a623",
  };
}

// --- Keyboard input ---
// We track which keys are currently held down
const keys = {};
document.addEventListener("keydown", (e) => (keys[e.key] = true));
document.addEventListener("keyup", (e) => (keys[e.key] = false));

// --- Update: move the player and check for collecting the star ---
function update() {
  // Move left
  if ((keys["ArrowLeft"] || keys["a"]) && player.x - player.size / 2 > 0) {
    player.x -= player.speed;
  }
  // Move right
  if ((keys["ArrowRight"] || keys["d"]) && player.x + player.size / 2 < canvas.width) {
    player.x += player.speed;
  }
  // Move up
  if ((keys["ArrowUp"] || keys["w"]) && player.y - player.size / 2 > 0) {
    player.y -= player.speed;
  }
  // Move down
  if ((keys["ArrowDown"] || keys["s"]) && player.y + player.size / 2 < canvas.height) {
    player.y += player.speed;
  }

  // Check if the player touched the star
  const dx = player.x - star.x;
  const dy = player.y - star.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < player.size / 2 + star.size / 2) {
    score += 1;
    scoreDisplay.textContent = "Score: " + score;
    star = spawnStar(); // Move the star to a new spot
  }
}

// --- Draw: clear the screen and paint everything ---
function draw() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the star
  ctx.fillStyle = star.color;
  ctx.beginPath();
  ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Draw the player
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

// --- Game loop: runs update + draw ~60 times per second ---
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start the game!
gameLoop();
