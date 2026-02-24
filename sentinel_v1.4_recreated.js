  // Global speed multiplier for delta time scaling
  const SPEED_MULTIPLIER = 120; // Increase for faster game, decrease for slower
  // Load mine sprite for mines
  const mineImg = new window.Image();
  mineImg.src = "mine.png";
// Sentinel v1.4 Recreated
// Core game logic

window.onload = function () {
            function drawWaveAnnouncement() {
              if (waveAnnouncementTimer > 0) {
                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "bold 44px sans-serif";
                ctx.fillStyle = "#00ffdd";
                ctx.shadowColor = "#222";
                ctx.shadowBlur = 18;
                // Animation: quick fade-in (first 20 frames), slower fade-out (last 40 frames)
                let alpha = 1;
                if (waveAnnouncementTimer > WAVE_ANNOUNCE_DURATION - 20) {
                  // Fade in
                  alpha = 1 - ((WAVE_ANNOUNCE_DURATION - waveAnnouncementTimer) / 20);
                } else {
                  // Fade out
                  alpha = waveAnnouncementTimer / (WAVE_ANNOUNCE_DURATION - 20);
                }
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                ctx.fillText("Wave " + wave, canvas.width / 2, canvas.height / 2 - 22);
                ctx.restore();
                if (!paused) waveAnnouncementTimer--;
              }
            }
          let waveAnnouncementTimer = 60; // Show announcement at game start
          const WAVE_ANNOUNCE_DURATION = 660; // 1 second
        // Load HUD overlay image
        const hudImg = new window.Image();
        hudImg.src = "liphud_slim2.png";
      // Load background image
      const backgroundImg = new window.Image();
      backgroundImg.src = "background4.png";
    // For smooth player rotation
    let playerVisualAngle = 0;
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  let keys = {}, paused = false, gameOver = false;
  // Load player sprite
  const playerImg = new window.Image();
  playerImg.src = "player_drone.png";
  // Load grunt sprite for magenta enemy
  const gruntImg = new window.Image();
  gruntImg.src = "grunt.png";
  // Load brute sprite for brute enemy
  const bruteImg = new window.Image();
  bruteImg.src = "brute.png";
  // Load slinger sprite for slinger enemy
  const slingerImg = new window.Image();
  slingerImg.src = "slinger.png";

  // Load kamikaze sprite for kamikaze enemy
  const kamikazeImg = new window.Image();
  kamikazeImg.src = "kamikaze.png";






  /////////////-========= GAME STATE =========-/////////////////
  let wave = 14, xp = 0, xpToLevel = 84, level = 14, statPoints = 32; // Start at wave 1
  let playerHurtTimer = 0;
  let playerLevelUpTimer = 0;
  let showStats = false, gameStarted = false;
  let startTime = Date.now();
  let mouseX = 512, mouseY = 425;
  let followMouse = false;


  let burstCount = 3, burstIndex = 0, burstTimer = 0;
  // Burst interval in frames (higher = longer pause between bursts)
  let burstInterval = 120; // Increased from 60 for a bigger cooldown
  // For future: burstInterval can be scaled for difficulty
  let enemiesToSpawn = 0;

  const player = {
    x: 512, y: 425, radius: 20,
    baseSpeed: 2, speed: 2,
    health: 10, maxHealth: 10,
    damage: 1,
    attackCooldown: 0, cooldownBase: 20,
    range: 80,
    stats: { Range: 0, Power: 0, AttackSpeed: 0, Movement: 0, Vitality: 0, Pickup: 0 },
    pickupRadius: 48
  };

  const enemies = [], projectiles = [], healthDrops = [], xpDrops = [], slingerDrops = [], bruteDrops = [], particles = [], mines = [];
  // Update mines: explode when player enters zone, remove after explosion
  function updateMines(delta) {
    for (let i = mines.length - 1; i >= 0; i--) {
      const m = mines[i];
      // Check if player is in explosion zone
      const distToPlayer = Math.hypot(player.x - m.x, player.y - m.y);
      if (!m.exploded && distToPlayer < 52 + player.radius) {
        m.exploded = true;
        // Damage player
        player.health -= 2;
        playerHurtTimer = 44;
        // Draw explosion ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(m.x, m.y, 52, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 187, 0, 0.55)";
        ctx.lineWidth = 8;
        ctx.shadowColor = "#ffbb00";
        ctx.shadowBlur = 32;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        // Dramatic explosion particles (like kamikaze)
        for (let j = 0; j < 32; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3.2 + Math.random() * 2.2;
          const color = ["#ffbb00","#fff200","#ff4444"][Math.floor(Math.random()*3)];
          const size = 3 + Math.random() * 4;
          const life = 32 + Math.random() * 18;
          const decay = 0.89 + Math.random() * 0.04;
          particles.push({
            x: m.x,
            y: m.y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life,
            color,
            decay,
            size,
            type: "enemyDeath"
          });
        }
        mines.splice(i, 1);
        continue;
      }
      // Remove mine after timer runs out
      m.timer -= delta * SPEED_MULTIPLIER;
      if (m.timer <= 0) {
        // Mine explodes visually and damages player if in range
        const distToPlayer = Math.hypot(player.x - m.x, player.y - m.y);
        if (distToPlayer < 52 + player.radius) {
          player.health -= 2;
          playerHurtTimer = 44;
        }
        // Draw explosion ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(m.x, m.y, 52, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 187, 0, 0.55)";
        ctx.lineWidth = 8;
        ctx.shadowColor = "#ffbb00";
        ctx.shadowBlur = 32;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        // Dramatic explosion particles (like kamikaze)
        for (let j = 0; j < 32; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3.2 + Math.random() * 2.2;
          const color = ["#ffbb00","#fff200","#ff4444"][Math.floor(Math.random()*3)];
          const size = 3 + Math.random() * 4;
          const life = 32 + Math.random() * 18;
          const decay = 0.89 + Math.random() * 0.04;
          particles.push({
            x: m.x,
            y: m.y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life,
            color,
            decay,
            size,
            type: "enemyDeath"
          });
        }
        mines.splice(i, 1);
      }
    }
  }

  // Draw mines with visible trigger zone
  function drawMines() {
    for (let m of mines) {
      ctx.save();
      // Draw trigger zone ring
      ctx.beginPath();
      ctx.arc(m.x, m.y, 52, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 187, 0, 0.28)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.shadowColor = "#ffbb00";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Draw soft shadow under mine
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + m.radius * 0.55, m.radius * 1.05, m.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(40, 40, 40, 1)';
      ctx.filter = 'blur(2.5px)';
      ctx.fill();
      ctx.filter = 'none';
      ctx.restore();

      // Draw mine image core (larger)
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.translate(m.x, m.y);
      ctx.drawImage(mineImg, -m.radius * 1.50, -m.radius * 1.50, m.radius * 3, m.radius * 3);
      ctx.restore();

      ctx.restore();
    }
  }

  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === "r" && gameOver) restartGame();
    if (k === "e") { showStats = !showStats; paused = showStats; }
    if (statPoints > 0 && ["1", "2", "3", "4", "5", "6"].includes(k)) applyStatPoint(k);
  });

  document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener("mousedown", (e) => { if (e.button === 2) followMouse = true; });
  canvas.addEventListener("mouseup", (e) => { if (e.button === 2) followMouse = false; });
  // Hide cursor when holding right-click, show when released
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) canvas.style.cursor = "crosshair";
  });
  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 2) canvas.style.cursor = "default";
  });
  // Also reset cursor if context menu is triggered (failsafe)
  canvas.addEventListener("contextmenu", (e) => {
    canvas.style.cursor = "default";
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function applyStatPoint(k) {
    const statKeys = ["Range", "Power", "AttackSpeed", "Movement", "Vitality", "Pickup"];
    const stat = statKeys[parseInt(k) - 1];
    if (stat) {
      // Enforce max stat value per stat to match current level
      if (player.stats[stat] < level+1) {
        player.stats[stat]++;
        statPoints--;
        applyStats();
      }
    }
  }

  function applyStats() {
    player.range = 80 + player.stats.Range * 5;
    player.damage = 1 + player.stats.Power;
    player.speed = player.baseSpeed + player.stats.Movement * 0.5;
    player.cooldownBase = 20 - player.stats.AttackSpeed;
    player.maxHealth = 10 + player.stats.Vitality * 2;
    player.pickupRadius = 48 + player.stats.Pickup * 8;
    if (player.health > player.maxHealth) player.health = player.maxHealth;
  }

  function constrainPlayer() {
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
  }

  function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      particles.push({
        x, y,
        dx: (Math.random() - 0.5) * 3,
        dy: (Math.random() - 0.5) * 3,
        life: 18 + Math.floor(Math.random() * 72),
        color,
        type: "generic"
      });
    }
  }

  function drawParticles() {
    for (let p of particles) {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      const s = p.size || 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw only particles of a specific type
  function drawParticlesOfType(type) {
    for (let p of particles) {
      if (p.type === type) {
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        const s = p.size || 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function updatePlayer(delta) {
    if (followMouse) {
    }
    // Track previous position for dust
    if (typeof player._prevX === 'undefined') player._prevX = player.x;
    if (typeof player._prevY === 'undefined') player._prevY = player.y;
    let moved = false;
    if (followMouse) {
      const dx = mouseX - player.x;
      const dy = mouseY - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        player.x += dirX * player.speed * delta * SPEED_MULTIPLIER;
        player.y += dirY * player.speed * delta * SPEED_MULTIPLIER;
        moved = true;
      }
    }
    // Dust particles disabled for performance
    player._prevX = player.x;
    player._prevY = player.y;
    constrainPlayer();
    if (player.attackCooldown > 0) player.attackCooldown -= delta * SPEED_MULTIPLIER;
    if (playerHurtTimer > 0) playerHurtTimer -= delta * SPEED_MULTIPLIER;
    if (playerLevelUpTimer > 0) playerLevelUpTimer -= delta * SPEED_MULTIPLIER;
  }

  function autoAttack() {
    let nearest = null, minDist = Infinity;
    for (let e of enemies) {
      if (e.health <= 0) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    // Store nearest and angle globally for use in drawing
    window._nearestEnemy = nearest;
    let targetAngle = 0;
    if (nearest) {
      targetAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }
    // Smoothly interpolate the visual angle toward the target
    const angleDiff = ((targetAngle - playerVisualAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    playerVisualAngle += angleDiff * 0.15; // 0.15 = smoothing factor
    window._playerToEnemyAngle = playerVisualAngle;
    // Draw the attack line for the entire cooldown period after an attack
    if (nearest && minDist < player.range + nearest.radius && player.attackCooldown > 0) {
      // Burning red laser effect with 3 skinny, color-shifting lines
      const laserColors = ["#ff2a00", "#ff7a00", "#fff200"];
      const offsets = [-1, 0, 1]; // skinnier spacing
      const colorShift = Math.floor(Date.now() / 60) % 3;
      // Calculate direction and edge of enemy for both laser and particles
      const dx = nearest.x - player.x;
      const dy = nearest.y - player.y;
      const dist = Math.hypot(dx, dy);
      const dirX = dx / dist;
      const dirY = dy / dist;
      const edgeX = nearest.x - dirX * nearest.radius;
      const edgeY = nearest.y - dirY * nearest.radius;
      for (let l = 0; l < 3; l++) {
        // Cycle the colors for a dynamic effect
        const color = laserColors[(l + colorShift) % 3];
        const offX = -offsets[l] * (nearest.y - player.y) / Math.hypot(dx, dy);
        const offY = offsets[l] * (nearest.x - player.x) / Math.hypot(dx, dy);
        ctx.save();
        ctx.lineWidth = 2;
        drawLine(player.x + offX, player.y + offY, edgeX + offX, edgeY + offY, color);
        ctx.restore();
      }
        // Attack line oval shadow behind player (fixed size)
        ctx.save();
        const shadowDirX = -dirX;
        const shadowDirY = -dirY;
        const ovalCenterX = player.x + shadowDirX * (player.radius * 1.2);
        const ovalCenterY = player.y + shadowDirY * (player.radius * 1.2);
        const ovalLength = player.radius * 1.8;
        const ovalWidth = player.radius * 0.7;
        const ovalAngle = Math.atan2(shadowDirY, shadowDirX);
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.translate(ovalCenterX, ovalCenterY);
        ctx.rotate(ovalAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, ovalLength, ovalWidth, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Laser light emission effect along the attack line
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const glowSteps = Math.max(8, Math.floor(dist / 18));
        for (let i = 0; i <= glowSteps; i++) {
          const t = i / glowSteps;
          const px = player.x + (edgeX - player.x) * t;
          const py = player.y + (edgeY - player.y) * t;
          const glowRadius = 22 + 18 * (1 - Math.abs(t - 0.5) * 1.5); // Brighter in the middle
          const grad = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
          grad.addColorStop(0, 'rgba(255, 120, 0, 0.02)');
          grad.addColorStop(0.4, 'rgba(255, 220, 0, 0.03)');
          grad.addColorStop(1, 'rgba(255, 42, 0, 0.0)');
          ctx.beginPath();
          ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
        
      // Emit burning laser particles: red, orange, yellow, white
      const steps = Math.floor(Math.hypot(edgeX - player.x, edgeY - player.y) / 65); // Greatly reduce particles
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = player.x + (edgeX - player.x) * t;
        const py = player.y + (edgeY - player.y) * t;
        const palette = [
          "rgba(43, 43, 43, 0.7)",   // orange
          "rgba(255, 255, 255, 0.6)",   // yellow
          "rgba(37, 37, 37, 0.65)"  // white hot
        ];
        const color = palette[Math.floor(Math.random() * palette.length)];
        const speed = 1.2 + Math.random() * .5;
        particles.push({
          x: px,
          y: py,
          dx: dirX * speed + (Math.random() - 0.2) * 1,
          dy: dirY * speed + (Math.random() - 0.2) * 1,
          life: 4 + Math.floor(Math.random() * 8),
          color: color,
          decay: 0.92 + Math.random() * 0.04,
          size: 2.2 + Math.random() * 2,
          type: "laser"
        });
      }
    }
    
    // Only attack if not on cooldown
    if (nearest && minDist < player.range + nearest.radius && player.attackCooldown <= 0) {
      drawLine(player.x, player.y, nearest.x, nearest.y, "LightBlue");
      nearest.health -= player.damage;
      // Fiery sparks when hitting enemies
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 5;
        const speed = 2.2 + Math.random() * 2.2;
        const color = [
          "rgba(255,42,0,0.85)",   // intense red
          "rgba(255,120,0,0.7)",   // orange
          "rgba(255,220,0,0.6)",   // yellow
          "rgb(248, 144, 144)"  // white hot
        ][Math.floor(Math.random() * 4)];
        particles.push({
          x: nearest.x,
          y: nearest.y,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          life: 18 + Math.floor(Math.random() * 32),
          color: color,
          decay: 0.92 + Math.random() * 0.04,
          size: 2.2 + Math.random() * 2.2,
          type: "enemyHit"
        });
      }
      player.attackCooldown = player.cooldownBase;
      if (nearest.health <= 0) {
                if (nearest.type === "gruntBoss") {
                  gainXP(xpToLevel);
                }
        if (nearest.type === "grunt" && wave !== 5) {
          xpDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (nearest.type === "slinger") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (nearest.type === "brute") {
          bruteDrops.push({ x: nearest.x + 3, y: nearest.y + 5 });
        }
         if (Math.random() < 0.05) {
          healthDrops.push({ x: nearest.x + 4, y: nearest.y + 6 });
        }
      }
    }
  }

  const MAX_LEVEL = 50;
  function gainXP(amount) {
    if (level >= MAX_LEVEL) return;
    xp += amount;
    while (xp >= xpToLevel && level < MAX_LEVEL) {
      xp -= xpToLevel;
      level++;
      statPoints += 2;
      // Restore health to max on level up
      player.health = player.maxHealth;
      // XP curve: fast early, slow late
      // Example: quadratic scaling
      xpToLevel = Math.floor(10 + Math.pow(level, 1.8));
      playerLevelUpTimer = 24; // 24 frames of level up flash
      // Level up particles: denser close, looser far, more total
      const total = 68;
      for (let i = 0; i < total; i++) {
        // Cluster more particles near the player, fewer far out
        const angle = Math.random() * Math.PI * 2;
        // Use a squared random for radius: more close, fewer far
        const t = Math.random();
        const speed = 1.5 + 8.5 * Math.pow(t, 2); // 1.5 to ~7.0, denser close, further spread
        particles.push({
          x: player.x,
          y: player.y,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          life: 60 + Math.floor(Math.random() * 240),
          color: ["#FFA500", "#ffb84d", "#ff9900", "#ffcc80", "#8b5b00"][Math.floor(Math.random() * 5)],
          decay: 0.88 + Math.random() * 0.04,
          type: "levelUp"
        });
      }
    }
    // Cap at max level
    if (level >= MAX_LEVEL) {
      xp = 0;
      xpToLevel = Infinity;
    }
  }
const droplifelenght = 280;

  function updateXPDrops() {
    for (let i = xpDrops.length - 1; i >= 0; i--) {
      const d = xpDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        gainXP(1);
        // XP pickup feedback: explode into persistent blue pieces
        // Grunt tones
        const palette = ["#FF00FF", "#910091", "#d900ff", "#c800b0", "#b800e0"];
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8;
          let size = 2;
          if (j < 4) size = 4;
          if (j < 2) size = 7;
          const color = palette[Math.floor(Math.random() * palette.length)];
          particles.push({
            x: d.x,
            y: d.y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: 60 + Math.floor(Math.random() * 240),
            color: color,
            decay: 0.88 + Math.random() * 0.04,
            size: size,
            type: "xpDrop"
          });
        }
        xpDrops.splice(i, 1);
      }
    }
    
  }
    function updateslingerDrops() {
    for (let i = slingerDrops.length - 1; i >= 0; i--) {
      const d = slingerDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        gainXP(2);
        // XP pickup feedback: explode into persistent blue pieces
        // Slinger tones
        const palette = ["#FFA500", "#ffb84d", "#ff9900", "#ffcc80", "#8b5b00"];
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8;
          let size = 2;
          if (j < 4) size = 4;
          if (j < 2) size = 7;
          const color = palette[Math.floor(Math.random() * palette.length)];
          particles.push({
            x: d.x,
            y: d.y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: 60 + Math.floor(Math.random() * 240),
            color: color,
            decay: 0.88 + Math.random() * 0.04,
            size: size,
            type: "slingerDrop"
          });
        }
        slingerDrops.splice(i, 1);
      }
    }
  }

  function updateBruteDrops() {
    for (let i = bruteDrops.length - 1; i >= 0; i--) {
      const d = bruteDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        gainXP(1);
        player.health = Math.min(player.maxHealth, player.health + 1);
        // XP pickup feedback: explode into persistent red pieces
        // Brute tones
        const palette = ["#8B0000", "#b22222", "#a52a2a", "#d11717", "#c80000"];
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8;
          let size = 2;
          if (j < 4) size = 4;
          if (j < 2) size = 7;
          const color = palette[Math.floor(Math.random() * palette.length)];
          particles.push({
            x: d.x,
            y: d.y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: 60 + Math.floor(Math.random() * 240),
            color: color,
            decay: 0.88 + Math.random() * 0.04,
            size: size,
            type: "bruteDrop"
          });
        }
        bruteDrops.splice(i, 1);
      }
    }
  }

  function updateHealthDrops() {
    for (let i = healthDrops.length - 1; i >= 0; i--) {
      const d = healthDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        player.health = Math.min(player.maxHealth, player.health + 1);
        // Health pickup feedback: explode into persistent green pieces
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8; // fast start
          particles.push({
            x: d.x,
            y: d.y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: 60 + Math.floor(Math.random() * 240),
            color: Math.random() < 0.5 ? "#b11717" : "#d43636",
            decay: 0.88 + Math.random() * 0.04, // quick deceleration
            type: "healthDrop"
          });
        }
        healthDrops.splice(i, 1);
      }
    }
  }










  ///////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////-========= WAVE =========-//////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////

    // GRUNT BOSS
    // Spawns a grunt boss at a random edge
    function spawnGruntBoss() {
      // Add properties for spawning grunts
      let gruntSpawnTimer = 0;
      let gruntSpawnInterval = 420; // 7 sec at 60 FPS (slower)
      let gruntSpawnCount = 1 + Math.floor(Math.random() * 2); // 1-2 grunts per spawn (fewer)
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = -30; y = Math.random() * 600; }
      else if (side === 1) { x = 1054; y = Math.random() * 768; }
      else if (side === 2) { x = Math.random() * 1024; y = -30; }
      else { x = Math.random() * 1024; y = 798; }
      // Match grunt appearance and stats, but keep boss health and magenta color
      let radius = 26, collisionRadius = 30, speed = 0.4, health = 300, damage = 1, attackRange = 20, color = "magenta";
      const spinAngle = Math.random() * Math.PI * 2;
      const spinSpeed = (Math.random() - 0.5) * 0.02;
      enemies.push({ x, y, radius, collisionRadius, speed, health, damage, attackCooldown: 0, attackRange, color, type: "gruntBoss", spinAngle, spinSpeed, sprite: gruntImg,
        projectileCooldown: 0,
        projectileInterval: 120, // 2 sec at 60 FPS (slower than slinger)
        projectileRadius: 22, // bigger projectile
        burstMode: false, // false = single shot, true = 3-round burst
        burstShotsLeft: 0,
        burstTimer: 0
      });
      enemies[enemies.length - 1].gruntSpawnTimer = gruntSpawnTimer;
      enemies[enemies.length - 1].gruntSpawnInterval = gruntSpawnInterval;
      enemies[enemies.length - 1].gruntSpawnCount = gruntSpawnCount;
    }
    // GRUNT BOSS MINOR
    // Spawns a grunt boss minor at a random edge (weaker, more common)
    function spawnGruntBossMinor() {
      let gruntSpawnTimer = 0;
      let gruntSpawnInterval = 420; // 7 sec at 60 FPS (slower)
      let gruntSpawnCount = 1 + Math.floor(Math.random() * 2); // 1-2 grunts per spawn (fewer)
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = -30; y = Math.random() * 600; }
      else if (side === 1) { x = 1054; y = Math.random() * 768; }
      else if (side === 2) { x = Math.random() * 1024; y = -30; }
      else { x = Math.random() * 1024; y = 798; }
      // Weaker stats: less health, smaller radius, slower, but still magenta
      let radius = 22, collisionRadius = 24, speed = 0.32, health = 150 + (wave*1.5), damage = 1, attackRange = 20, color = "magenta";
      const spinAngle = Math.random() * Math.PI * 2;
      const spinSpeed = (Math.random() - 0.5) * 0.02;
      enemies.push({ x, y, radius, collisionRadius, speed, health, damage, attackCooldown: 0, attackRange, color, type: "gruntBossMinor", spinAngle, spinSpeed, sprite: gruntImg });
      enemies[enemies.length - 1].gruntSpawnTimer = gruntSpawnTimer;
      enemies[enemies.length - 1].gruntSpawnInterval = gruntSpawnInterval;
      enemies[enemies.length - 1].gruntSpawnCount = gruntSpawnCount;
    }

  // GRUNTS
  // Spawns the requested number of grunts at random edges
  function spawnBurst(count) {
    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = -30; y = Math.random() * 600; }
      else if (side === 1) { x = 1054; y = Math.random() * 768; }
      else if (side === 2) { x = Math.random() * 1024; y = -30; }
      else { x = Math.random() * 1024; y = 798; }
      let radius = 14, collisionRadius = 16, speed = 1.5, health = 6 + (wave*1.6), damage = 1, attackRange = 20, color = "magenta";
      const spinAngle = Math.random() * Math.PI * 2;
      const spinSpeed = (Math.random() - 0.5) * 0.02;
      enemies.push({ x, y, radius, collisionRadius, speed, health, damage, attackCooldown: 0, attackRange, color, type: "grunt", spinAngle, spinSpeed });
    }
    }

    // Spawns the requested number of kamikaze mobs at random edges
    function spawnKamikazeBurst(count) {
      for (let i = 0; i < count; i++) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = -30; y = Math.random() * 600; }
        else if (side === 1) { x = 1054; y = Math.random() * 768; }
        else if (side === 2) { x = Math.random() * 1024; y = -30; }
        else { x = Math.random() * 1024; y = 798; }
        let radius = 16, collisionRadius = 18, speed = 2, color = "#ff4444", damage = 3, health = 12 + (wave * 1.2);
        enemies.push({
          x, y, radius, collisionRadius, speed, color, damage, health,
          type: "kamikaze",
          timer: 60, // 1 second per mine
          exploded: false,
          minesPlaced: 0,
          mineInterval: 60, // 1 second
          nextMineTime: 60 // countdown to next mine
        });
      }
  }

  // SLINGERS
  // Spawns the requested number of slingers at random edges
  function spawnSlingerBurst(count) {
    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = -30; y = Math.random() * 600; }
      else if (side === 1) { x = 1054; y = Math.random() * 768; }
      else if (side === 2) { x = Math.random() * 1024; y = -30; }
      else { x = Math.random() * 1024; y = 798; }
      let radius = 18, collisionRadius = 20, speed = 0.8, health = 18 + (wave*1.5), damage = 1, attackRange = 240, color = "orange";
      const spinAngle = Math.random() * Math.PI * 2;
      const spinSpeed = (Math.random() - 0.5) * 0.02;
      enemies.push({ x, y, radius, collisionRadius, speed, health, damage, attackCooldown: 0, attackRange, color, type: "slinger", spinAngle, spinSpeed, sprite: slingerImg });
    }
  }

  // Spawns the requested number of grunt boss minors at random edges
  function spawnBossMinorBurst(count) {
    for (let i = 0; i < count; i++) {
      spawnGruntBossMinor();
    }
  }

  // Main function to spawn waves based on the current wave number, with custom logic for each wave
  function spawnWave() {
    waveAnnouncementTimer = WAVE_ANNOUNCE_DURATION;
    // Only custom wave logic for waves 1-5 (and infinite for wave 5)
    if (wave === 1) {
      burstCount = 5;
      burstInterval = 330; // 3 sec at 60 FPS
      window._customBursts = [1, 2, 3, 4, 5];
    } else if (wave === 2) {
      burstCount = 5;
      burstInterval = 240; // 4 sec at 60 FPS
      window._customBursts = Array.from({length: 5}, () => 2 + Math.floor(Math.random() * 3)); // 2-4 grunts
    } else if (wave === 3) {
      burstCount = 5;
      burstInterval = 240; // 4 sec at 60 FPS
      window._customBursts = Array.from({length: 5}, () => 3 + Math.floor(Math.random() * 3)); // 3-5 grunts
    } else if (wave === 4) {
      burstCount = 5;
      burstInterval = 240;
      window._customBursts = [3, 4, 5, 6, 7, 8].slice(0, 5); // 3-7 grunts, +1 per burst
    } else if (wave === 5) {
      burstCount = Infinity;
      burstInterval = 300; // 5 sec
      // For infinite, just pick a new random for each burst in handleWaveSpawning
      window._customBursts = null;
      spawnGruntBoss();
    } else if (wave === 6) {
      burstCount = 6;
      burstInterval = 300; // 5 sec
      window._customBursts = null;
      window._customSlingers = [1, 0, 1, 1, 0, 2];
    } else if (wave === 7) {
      burstCount = 7;
      burstInterval = 300; // 5 sec
      window._customBursts = null;
      window._customSlingers = [2, 0, 2, 0, 1, 3];
    } else if (wave === 8) {
      burstCount = 7;
      burstInterval = 300; // 5 sec
      window._customBursts = null;
      window._customSlingers = [2, 0, 2, 0, 1, 3];
      spawnGruntBossMinor();
    } else if (wave === 9) {
      burstCount = 8;
      burstInterval = 300; // 5 sec
      window._customBursts = null;
      window._customSlingers = [2, 0, 2, 1, 1, 3];
      spawnGruntBossMinor();
      setTimeout(() => spawnGruntBossMinor(), 10000);
    } else if (wave === 10) {
      burstCount = Infinity;
      burstInterval = 300; // 5 sec
      window._customBursts = null;
      window._customSlingers = null;
      window._bossMinorBursts = null;
      // Spawn exactly 3 gruntBossMinors at the start of wave 10
      if (!window._wave10MinorsSpawned) {
        spawnBossMinorBurst(3);
        window._wave10MinorsSpawned = true;
      }
    } else if (wave === 11) {
      burstCount = 15;
      burstInterval = 250; // 5 sec
      window._customBursts = null;
      window._customSlingers = null;
      window._customKamikazes = [1, 1, 2, 2, 3, 3, 1, 2, 3, 4, 4, 2, 3, 4, 5];

    } else if (wave === 12) {
      burstCount = 15;
      burstInterval = 300; // 5 sec
      window._customBursts = null;
      window._customSlingers = [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0];
      window._customKamikazes = [0, 1, 0, 2, 0, 3, 0, 2, 0, 4, 0, 2, 0, 2, 3];
      window._customBossMinors = [2, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0];

    } else if (wave === 13) {
      burstCount = 15;
      burstInterval = 300; // 5 sec
      window._customBursts = null;
      window._customSlingers = [0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0];
      window._customKamikazes = [0, 1, 0, 2, 0, 3, 0, 2, 0, 4, 0, 2, 0, 2, 3];
      window._customBossMinors = [2, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0];
    } else if (wave === 14) {
      burstCount = 12;
      burstInterval = 320; // 5.33 sec
      // Combo bursts: slingers first, then kamikazes, then boss minors, then mixed
      window._customSlingers = [2, 0, 0, 1, 0, 0, 1, 0, 0, 2, 0, 1];
      window._customKamikazes = [0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 1];
      window._customBossMinors = [0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2];
      // In mixed bursts, slingers and kamikazes overlap, forcing movement and dodging
    } else if (wave === 15) {
      burstCount = 14;
      burstInterval = 300; // 5 sec
      // Pincer and crossfire: slingers and kamikazes together, boss minors in the middle
      window._customSlingers = [1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2];
      window._customKamikazes = [2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1];
      window._customBossMinors = [0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0];
      // Some bursts have all three, requiring target prioritization
    } else if (wave === 16) {
      burstCount = 16;
      burstInterval = 300; // 4.67 sec
      // Advanced combos: more grunts, fewer boss minors
      window._customBursts = [4, 5, 6, 7, 8, 9, 10, 10, 9, 8, 7, 6, 5, 4, 6, 8];
      window._customSlingers = [2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 2, 2, 3];
      window._customKamikazes = [0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 2, 2, 3, 3];
      window._customBossMinors = [0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0];
      // Final bursts: more grunts, moderate boss minors, still challenging
    } else {
      // For now, do nothing for later waves (old system removed)
      burstCount = 0;
      burstInterval = 300;
    }
    burstIndex = 0;
    burstTimer = 0;
    window._bossMinorCount = 0;

  }
  


  function handleWaveSpawning() {
    // Custom burst logic for waves 1-4, infinite for wave 5, and controlled bursts for waves 6-10
    // Prevent further spawning after wave 10 ends
    if (window._wave10MinorsSpawned && wave > 10) return;
    // For wave 10, set burstCount to number of alive gruntBossMinors
    if (wave === 10) {
      burstCount = enemies.filter(en => en.type === "gruntBossMinor").length;
    }
    if ((wave >= 1 && wave <= 4 && burstIndex < burstCount) || (wave === 5) || (wave >= 6 && wave <= 10 && burstIndex < burstCount) || (wave >= 11 && wave <= 16)) {
          burstTimer++;
          if (burstTimer >= burstInterval) {
            burstTimer = 0;
            let grunts = 0;
            let slingers = 0;
            // Only assign grunts for specific waves
            if (wave === 1 || wave === 2 || wave === 3 || wave === 4) {
              grunts = window._customBursts[burstIndex] || 0;
            } else if (wave === 5) {
              grunts = 2 + Math.floor(Math.random() * 3); // 2-4 grunts
            } else if (wave >= 6 && wave <= 9) {
              grunts = 2 + Math.floor(Math.random() * 3); // 2-4 grunts
              if (window._customSlingers) {
                slingers = window._customSlingers[burstIndex] || 0;
              }
            }
            // For wave 10, spawn only slingers and boss minors
            if (wave === 10) {
              const slingerCount = 1 + Math.floor(Math.random() * 2);
              spawnSlingerBurst(slingerCount);
            } else {
              if (grunts > 0) spawnBurst(grunts);
              if (slingers > 0) spawnSlingerBurst(slingers);
            }
            if (wave === 11) {
              // Only kamikazes, handled here
              if (window._customKamikazes && window._customKamikazes[burstIndex]) {
                spawnKamikazeBurst(window._customKamikazes[burstIndex]);
              }
            }
            if (wave === 12 || wave === 13 || wave === 14 || wave === 15 || wave === 16) {
              grunts = 1 + Math.floor(Math.random() * 2); 
              if (window._customSlingers && window._customSlingers[burstIndex]) {
                spawnSlingerBurst(window._customSlingers[burstIndex]);
              }
              if (window._customKamikazes && window._customKamikazes[burstIndex]) {
                spawnKamikazeBurst(window._customKamikazes[burstIndex]);
              }
              if (window._customBossMinors && window._customBossMinors[burstIndex]) {
                for (let i = 0; i < window._customBossMinors[burstIndex]; i++) {
                  spawnGruntBossMinor();
                }
              }
              if (grunts > 0) spawnBurst(grunts);
            }


        burstIndex++;
      }
    }
    // No fallback/default system for later waves

    
  }






  ////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////-========= MISC FUNCTIONS =========-////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////
  function drawLine(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawHUD() {
    // ...existing code...
    if (showStats) {
      // ...existing code for stats panel...
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#152c16';
      ctx.fillRect(0, 240, 280, 200);
      // Green glowing border
      ctx.globalAlpha = 1.0;
      ctx.shadowColor = '#00ffdd';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00ffdd';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 240, 280, 200);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.restore();
      ctx.fillStyle = "#00ffdd";
      ctx.textAlign = "left";
      ctx.fillText("Level: " + level + " (" + xp + "/" + xpToLevel + ")", 90, 260);
      ctx.fillText("Stat Points: " + statPoints, 90, 280);
      ctx.fillText("Stat Max: " + (level+1), 90, 300);
      // Draw clickable stat labels and store their bounding boxes
      window._statButtonBoxes = [];
      const statLabels = [
        { label: "[1]-> Range (" + player.stats.Range + ")", stat: 1 },
        { label: "[2]-> Power (" + player.stats.Power + ")", stat: 2 },
        { label: "[3]-> Atk Speed (" + player.stats.AttackSpeed + ")", stat: 3 },
        { label: "[4]-> Movement (" + player.stats.Movement + ")", stat: 4 },
        { label: "[5]-> Vitality (" + player.stats.Vitality + ")", stat: 5 },
        { label: "[6]-> Pickup Range (" + player.stats.Pickup + ")", stat: 6 }
      ];
      let y = 320;
      for (let i = 0; i < statLabels.length; i++) {
        const text = statLabels[i].label;
        ctx.fillText(text, 90, y);
        // Measure text for bounding box
        const metrics = ctx.measureText(text);
        // Store bounding box for click detection
        window._statButtonBoxes.push({
          x: 90,
          y: y - 16, // approx top
          w: metrics.width,
          h: 22, // approx height
          stat: statLabels[i].stat
        });
        y += 20;
      }
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#152c16';
        ctx.fillRect(canvas.width / 2 - 330, canvas.height - 110, 660, 110);
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = '#00ffdd';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#00ffdd';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 330, canvas.height - 110, 660, 110);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#00ffdd";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("[1]-> Range  [2]-> Power  [3]-> Atk Speed  [4]-> Movement  [5]-> Vitality  [6]-> Pickup", canvas.width / 2, canvas.height - 85);
        ctx.restore();


    // ...existing code for drawing stat labels and storing bounding boxes...
    // Stat button click-and-release logic (register only once)
    if (!window._statButtonListenersAdded) {
      window._statButtonPressed = null;
      canvas.addEventListener("mousedown", function(e) {
        if (!showStats || statPoints <= 0) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const boxes = window._statButtonBoxes || [];
        for (let box of boxes) {
          if (
            mx >= box.x &&
            mx <= box.x + box.w &&
            my >= box.y &&
            my <= box.y + box.h
          ) {
            window._statButtonPressed = box.stat;
            break;
          }
        }
      });
      canvas.addEventListener("mouseup", function(e) {
        if (!showStats || statPoints <= 0 || window._statButtonPressed == null) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const boxes = window._statButtonBoxes || [];
        for (let box of boxes) {
          if (
            box.stat === window._statButtonPressed &&
            mx >= box.x &&
            mx <= box.x + box.w &&
            my >= box.y &&
            my <= box.y + box.h
          ) {
            applyStatPoint(String(box.stat));
            break;
          }
        }
        window._statButtonPressed = null;
      });
      window._statButtonListenersAdded = true;
    }
    }
    // Draw HUD overlay image
    if (hudImg.complete && hudImg.naturalWidth > 0) {
      ctx.drawImage(hudImg, 0, 0, canvas.width, canvas.height);
    }
    // Draw wave and stat point H122030UD above HUD overlay
    ctx.save();
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 4;
    const q1 = canvas.width * 0.125;
    const q2 = canvas.width * 0.375;
    const q3 = canvas.width * 0.625;
    const q4 = canvas.width * 0.875;
    ctx.textAlign = "center";


    // Prominent Wave label
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#00ffdd";
    ctx.shadowColor = '#00ffdd';
    ctx.shadowBlur = 18;
    const wavetext = "Wave " + wave;
    const wavetextWidth = ctx.measureText(wavetext).wi3dth;
    ctx.fillText(wavetext, canvas.width / 2, 35);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  

  function restartGame() {
      waveAnnouncementTimer = WAVE_ANNOUNCE_DURATION;
    Object.assign(player, {
      x: 500, y: 360, health: 10, attackCooldown: 0,
      stats: { Range: 0, Power: 0, AttackSpeed: 0, Movement: 0, Vitality: 0, Pickup: 0 }
    });
    applyStats();
    xp = 0; xpToLevel = 10; level = 1;
    statPoints = 5; // TEMP: Start with 25 stat points
    wave = 1;
    enemies.length = 0;
    healthDrops.length = 0;
    xpDrops.length = 0;
    slingerDrops.length = 0;
    bruteDrops.length = 0;
    particles.length = 0;
    projectiles.length = 0;
    gameOver = false;
    showStats = false;
    paused = false;
    gameStarted = false;
    startTime = Date.now();
  }

  function updateEnemies(delta) {
                        // Decrease noBossCollision timer for grunts
                        for (let e of enemies) {
                          if (e.type === "grunt" && e.noBossCollision > 0) {
                            e.noBossCollision--;
                          }
                        }
                        // Grunt boss and grunt boss minor spawn grunts at interval
                        for (let e of enemies) {
                          if ((e.type === "gruntBoss" || e.type === "gruntBossMinor") && e.health > 0) {
                            e.gruntSpawnTimer = (e.gruntSpawnTimer || 0) + 1;
                            if (e.gruntSpawnTimer >= e.gruntSpawnInterval) {
                              e.gruntSpawnTimer = 0;
                              // Spawn grunts in a nova (evenly spaced circle) around the boss
                              const count = e.gruntSpawnCount;
                              const baseAngle = Math.random() * Math.PI * 2; // randomize starting angle
                              // Emit novaFlare-style particles from the boss, not each grunt
                              for (let p = 0; p < 42; p++) {
                                const flare = p < 10;
                                const partAngle = Math.random() * Math.PI * 2;
                                const partRadius = e.radius + 8 + Math.random() * 10;
                                const partSpeed = flare ? 2.2 + Math.random() * 1.2 : 1.2 + Math.random() * 0.8;
                                const color = flare ? "#ff66ff" : ["#ff33ff", "#ff00ff", "#e040ff", "#d900ff"][Math.floor(Math.random()*4)];
                                const size = flare ? 7 + Math.random() * 3 : 4 + Math.random() * 2;
                                const life = flare ? 22 + Math.random() * 12 : 16 + Math.random() * 8;
                                const decay = flare ? 0.91 : 0.95;
                                particles.push({
                                  x: e.x + Math.cos(partAngle) * partRadius,
                                  y: e.y + Math.sin(partAngle) * partRadius,
                                  dx: Math.cos(partAngle) * partSpeed * (flare ? 1.8 : 1),
                                  dy: Math.sin(partAngle) * partSpeed * (flare ? 1.8 : 1),
                                  life,
                                  color,
                                  decay,
                                  size,
                                  type: "novaFlare"
                                });
                              }
                              for (let i = 0; i < count; i++) {
                                const angle = baseAngle + (Math.PI * 2 / count) * i;
                                const distance = e.radius + 24;
                                const x = e.x + Math.cos(angle) * distance;
                                const y = e.y + Math.sin(angle) * distance;
                                let radius = 14, collisionRadius = 16, speed = .6, health = 6 + (wave*1.5), damage = 1, attackRange = 20, color = "magenta";
                                const spinAngle = angle; // make them spin outward
                                const spinSpeed = (Math.random() - 0.5) * 0.02;
                                // Give each grunt an outward velocity for the nova effect
                                const novaSpeed = 2.2 + Math.random() * 0.8;
                                enemies.push({
                                  x, y, radius, collisionRadius, speed, health, damage, attackCooldown: 0, attackRange, color, type: "grunt", spinAngle, spinSpeed, noBossCollision: 120,
                                  vx: Math.cos(angle) * novaSpeed,
                                  vy: Math.sin(angle) * novaSpeed,
                                  novaTimer: 18 // frames to move outward before normal AI
                                });
                              }
                              // Optionally randomize next spawn count
                              if (e.type === "gruntBoss") {
                                e.gruntSpawnCount = 2 + Math.floor(Math.random() * 3);
                              } else {
                                e.gruntSpawnCount = 1 + Math.floor(Math.random() * 2);
                              }
                            }
                          }
                          // GruntBoss projectile attack
                          if (e.type === "gruntBoss" && e.health > 0) {
                            // Handle burst logic
                            if (e.burstMode) {
                              // In burst mode, fire 3 shots with short delay
                              if (e.burstShotsLeft > 0) {
                                e.burstTimer = (e.burstTimer || 0) + 1;
                                if (e.burstTimer >= 12) { // 0.2 sec between shots
                                  e.burstTimer = 0;
                                  e.burstShotsLeft--;
                                  // Fire single projectile
                                  const dx = player.x - e.x;
                                  const dy = player.y - e.y;
                                  const dist = Math.hypot(dx, dy);
                                  if (dist > 0) {
                                    const angle = Math.atan2(dy, dx);
                                    const speed = 2.2;
                                    projectiles.push({
                                      x: e.x,
                                      y: e.y,
                                      dx: Math.cos(angle) * speed,
                                      dy: Math.sin(angle) * speed,
                                      damage: 2,
                                      radius: e.projectileRadius,
                                      color: "#ff33ff",
                                      type: "gruntBossProjectile"
                                    });
                                  }
                                }
                              } else {
                                // Burst finished, reset for next interval
                                e.burstMode = false;
                                e.projectileCooldown = 0;
                              }
                            } else {
                              e.projectileCooldown = (e.projectileCooldown || 0) + 1;
                              if (e.projectileCooldown >= e.projectileInterval) {
                                // Always start burst mode (rifle 3-round burst)
                                e.burstMode = true;
                                e.burstShotsLeft = 3;
                                e.burstTimer = 0;
                              }
                            }
                          }
                        }
                // Brute nova visual particles
                for (let e of enemies) {
                  if (e.type === "brute") {
                    let particleCount = 6;
                    if (e.novaState !== "growing" && e.novaState !== "shrinking") {
                      particleCount = 1; // Reduce only in 'else' (idle) state
                    }
                    for (let p = 0; p < particleCount; p++) {
                      const angle = Math.random() * Math.PI * 2;
                      const radius = Math.random() * (e.novaRadius - e.radius - 8) + (e.radius + 8);
                      const flare = radius > e.novaRadius - 12;
                      // Different behavior for growing vs shrinking
                      let speed, color, size, life, decay;
                      if (e.novaState === "growing") {
                        speed = 2.2 + Math.random() * 1.2;
                        color = flare ? "#ffae00" : ["#ff6600","#ffaa00","#ff3300"][Math.floor(Math.random()*3)];
                        size = flare ? 7 + Math.random() * 3 : 4 + Math.random() * 2;
                        life = flare ? 22 + Math.random() * 12 : 16 + Math.random() * 8;
                        decay = flare ? 0.91 : 0.95;
                      } else if (e.novaState === "shrinking") {
                        speed = 0.8 + Math.random() * 0.8;
                        color = flare ? "#ff3300" : ["#ff6600","#ffaa00","#ffbb33"][Math.floor(Math.random()*3)];
                        size = flare ? 5 + Math.random() * 2 : 2 + Math.random() * 2;
                        life = flare ? 14 + Math.random() * 8 : 8 + Math.random() * 6;
                        decay = flare ? 0.97 : 0.98;
                      } else {
                        speed = 0.2 + Math.random() * 0.2;
                        color = flare ? "#ffbb33" : ["#ff6600","#ffaa00","#ff3300"][Math.floor(Math.random()*3)];
                        size = flare ? 6 + Math.random() * 3 : 3 + Math.random() * 2;
                        life = flare ? 18 + Math.random() * 12 : 12 + Math.random() * 8;
                        decay = flare ? 0.92 : 0.96;
                      }
                      particles.push({
                        x: e.x + Math.cos(angle) * radius,
                        y: e.y + Math.sin(angle) * radius,
                        dx: Math.cos(angle) * speed * (flare ? 1.8 : 1),
                        dy: Math.sin(angle) * speed * (flare ? 1.8 : 1),
                        life,
                        color,
                        decay,
                        size,
                        type: "novaFlare"
                      });
                    }
                  }
                }
            // Brute nova visual and collision
            for (let e of enemies) {
              if (e.type === "brute") {
                // Nova animation states
                const minRadius = e.radius + 20; // slightly bigger than brute
                const maxRadius = e.radius * 3.2;
                if (typeof e.novaRadius === "undefined") e.novaRadius = minRadius;
                if (typeof e.novaState === "undefined") e.novaState = "growing";
                if (typeof e.novaCooldown === "undefined") e.novaCooldown = 0;

                // Animate nova
                    if (e.novaState === "growing") {
                      e.novaRadius += 2.2;
                      if (e.novaRadius >= maxRadius) {
                        e.novaRadius = maxRadius;
                        e.novaState = "maxPause";
                        e.novaCooldown = 120; // 2 sec pause at max
                      }
                    } else if (e.novaState === "maxPause") {
                      e.novaCooldown--;
                      e.novaCue = false;
                      if (e.novaCooldown <= 0) {
                        e.novaState = "shrinking";
                      }
                    } else if (e.novaState === "shrinking") {
                      e.novaRadius -= 2.2;
                      if (e.novaRadius <= minRadius) {
                        e.novaRadius = minRadius;
                        e.novaState = "minPause";
                        e.novaCooldown = 240; // 4 sec pause at min
                      }
                    } else if (e.novaState === "minPause") {
                      e.novaCooldown--;
                      // Visual cue: pulse color as nova is about to attack (growing)
                      e.novaCue = e.novaCooldown < 60 && e.novaCooldown % 8 < 4;
                      if (e.novaCooldown <= 0) {
                        e.novaState = "growing";
                        e.novaCue = false;
                      }
                    }

                // Nova damage: tick on entry, then every 60 frames (1s)
                const dist = Math.hypot(player.x - e.x, player.y - e.y);
                if (typeof e.novaPlayerInside === 'undefined') e.novaPlayerInside = false;
                if (typeof e.novaPlayerTick === 'undefined') e.novaPlayerTick = 0;
                if (dist < e.novaRadius + player.radius) {
                    if (!e.novaPlayerInside || e.novaPlayerTick <= 0) {
                      player.health -= 1; // Nova damage per tick
                      playerHurtTimer = 44;
                      e.novaPlayerTick = 60; // 1 second cooldown
                    }
                  e.novaPlayerInside = true;
                } else {
                  e.novaPlayerInside = false;
                  e.novaPlayerTick = 0;
                }
                if (e.novaPlayerTick > 0) e.novaPlayerTick -= delta * SPEED_MULTIPLIER;;
              }
            }
            
        // Enhanced dust emission for moving enemies
      // Dust particles disabled for performance
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
          if (e.health <= 0) {
            // Create colored particles on enemy death with different tones
            if (e.type === "gruntBoss" || e.type === "gruntBossMinor") {
              // Boss death nova: emit a ring of magenta particles
              const novaCount = 36;
              // Make gruntBossMinor's nova radius smaller
              const novaRadius = e.type === "gruntBossMinor" ? e.radius + 22 : e.radius + 32;
              for (let j = 0; j < novaCount; j++) {
                const angle = (Math.PI * 2 * j) / novaCount;
                const speed = 3.2 + Math.random() * 1.8;
                const color = ["#b800e0", "#d900ff", "#ff33ff", "#910091"][Math.floor(Math.random()*4)];
                const size = 7 + Math.random() * 3;
                const life = 32 + Math.random() * 24;
                const decay = 0.92 + Math.random() * 0.04;
                particles.push({
                  x: e.x + Math.cos(angle) * novaRadius,
                  y: e.y + Math.sin(angle) * novaRadius,
                  dx: Math.cos(angle) * speed,
                  dy: Math.sin(angle) * speed,
                  life,
                  color,
                  decay,
                  size,
                  type: "enemyDeath"
                });
              }
              // Scatter 5 xpDrops around gruntBossMinor's location
              if (e.type === "gruntBossMinor") {
                for (let k = 0; k < 5; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = 18 + Math.random() * 22;
                  xpDrops.push({
                    x: e.x + Math.cos(angle) * dist,
                    y: e.y + Math.sin(angle) * dist
                  });
                }
              }
              // End wave if gruntBoss dies
              if (e.type === "gruntBoss") {
                wave++;
                spawnWave();
              }
              // End wave 10 only if all three gruntBossMinors are dead
              if (e.type === "gruntBossMinor" && wave === 10) {
                // Check if all gruntBossMinors are gone
                const remainingMinors = enemies.filter(en => en.type === "gruntBossMinor").length;
                if (remainingMinors === 0) {
                  wave++;
                  burstCount = 0;
                  burstIndex = 0;
                  spawnWave();
                }
              }
              // Scatter 5 xpDrops around gruntBossMinor's location
              if (e.type === "gruntBossMinor") {
                for (let k = 0; k < 5; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = 18 + Math.random() * 22;
                  xpDrops.push({
                    x: e.x + Math.cos(angle) * dist,
                    y: e.y + Math.sin(angle) * dist
                  });
                }
              }
            } else if (e.type === "brute") {
              // Brute death burst: mimic nova 'growing' burst
              for (let j = 0; j < 24; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2.2 + Math.random() * 1.2;
                const flare = j < 4;
                const color = flare ? "#fff200" : ["#ff6600","#ffaa00","#ff3300"][Math.floor(Math.random()*3)];
                const size = flare ? 7 + Math.random() * 3 : 4 + Math.random() * 2;
                const life = flare ? 22 + Math.random() * 12 : 16 + Math.random() * 8;
                const decay = flare ? 0.91 : 0.95;
                particles.push({
                  x: e.x,
                  y: e.y,
                  dx: Math.cos(angle) * speed * (flare ? 1.8 : 1),
                  dy: Math.sin(angle) * speed * (flare ? 1.8 : 1),
                  life,
                  color,
                  decay,
                  size,
                  type: "enemyDeath"
                });
              }
            } else {
              let palette;
              if (e.type === "grunt") {
                palette = ["#FF00FF", "#910091", "#d900ff", "#c800b0", "#b800e0"];
              } else if (e.type === "slinger") {
                palette = ["#FFA500", "#ffb84d", "#ff9900", "#ffcc80", "#8b5b00"];
              } else {
                palette = [e.color];
              }
              for (let j = 0; j < 18; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2.5 + Math.random() * 1.8;
                let size = 2;
                if (j < 4) size = 4;
                if (j < 2) size = 7;
                const color = palette[Math.floor(Math.random() * palette.length)];
                particles.push({
                  x: e.x,
                  y: e.y,
                  dx: Math.cos(angle) * speed,
                  dy: Math.sin(angle) * speed,
                  life: 60 + Math.floor(Math.random() * 240),
                  color: color,
                  decay: 0.88 + Math.random() * 0.04,
                  size: size,
                  type: "enemyDeath"
                });
              }
            }
            enemies.splice(i, 1);
            continue;
          }

      // Grunt nova movement: if novaTimer > 0, move outward using vx/vy
      if (e.type === "grunt" && e.novaTimer > 0) {
        e.x += e.vx * delta * SPEED_MULTIPLIER;
        e.y += e.vy * delta * SPEED_MULTIPLIER;
        e.novaTimer -= delta * SPEED_MULTIPLIER;
        // Slow down nova velocity for a smooth stop
        e.vx *= 0.92;
        e.vy *= 0.92;
      } else {
        const dx = player.x - e.x, dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < (e.attackRange || (e.radius > 20 ? 40 : 20)) + player.radius) {
          if (e.attackCooldown <= 0) {
            if (e.type === "slinger") {
              const angle = Math.atan2(player.y - e.y, player.x - e.x);
              const speed = 1.5;
              projectiles.push({ x: e.x, y: e.y, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, damage: e.damage });
            } else {
              player.health -= e.damage;
              playerHurtTimer = 44; // 14 frames of red flash
            }
            e.attackCooldown = 60;
          }
            if (e.type !== "slinger") drawLine(e.x, e.y, player.x, player.y, "gray");
        } else {
            if (e.type === "kamikaze" && !e.exploded) {
              // Draw visible explosion zone
              ctx.save();
              ctx.beginPath();
              ctx.arc(e.x, e.y, e.radius + 52, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(255, 68, 68, 0.35)";
              ctx.lineWidth = 3;
              ctx.setLineDash([8, 8]);
              ctx.shadowColor = "#ff4444";
              ctx.shadowBlur = 12;
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.shadowBlur = 0;
              ctx.restore();

              // Move toward player
              e.x += (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
              e.y += (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;

              // Handle mine placement and explosion timing
              if (typeof e.minesPlaced === 'undefined') e.minesPlaced = 0;
              if (typeof e.mineInterval === 'undefined') e.mineInterval = 60;
              if (typeof e.nextMineTime === 'undefined') e.nextMineTime = 60;
              if (typeof e.timer === 'undefined') e.timer = 60;

              e.timer -= delta * SPEED_MULTIPLIER;
              if (e.minesPlaced < 3) {
                e.nextMineTime -= delta * SPEED_MULTIPLIER;
                if (e.nextMineTime <= 0) {
                  // Place a mine at current position
                  mines.push({ x: e.x, y: e.y, radius: 18, timer: 360, color: '#ffbb00', active: true });
                  e.minesPlaced++;
                  e.nextMineTime = e.mineInterval;
                  e.timer = e.mineInterval; // reset timer for next mine/explosion
                }
              } else if (e.timer <= 0) {
                // Explode!
                e.exploded = true;
                // Damage player if in range
                const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
                if (distToPlayer < e.radius + player.radius + 52) {
                  player.health -= e.damage;
                  playerHurtTimer = 44;
                }
                // Explosion effect
                for (let j = 0; j < 24; j++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = 5.2 + Math.random() * 1.8;
                  const color = ["#ff3c00","#fd8700","#fff200"][Math.floor(Math.random()*3)];
                  const size = 3 + Math.random() * 4;
                  const life = 42 + Math.random() * 2;
                  const decay = 0.91 + Math.random() * 0.02;
                  particles.push({
                    x: e.x,
                    y: e.y,
                    dx: Math.cos(angle) * speed,
                    dy: Math.sin(angle) * speed,
                    life,
                    color,
                    decay,
                    size,
                    type: "enemyDeath"
                  });
                }
                enemies.splice(i, 1);
                continue;
              }
            } else {
              e.x += (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
              e.y += (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;
            }
        }
      }
      // Only decrement attackCooldown for mobs, not playerHurtTimer
      if (typeof e.attackCooldown === "number") e.attackCooldown--;

      // Prevent enemy overlap and update spin
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        // Prevent overlap
        for (let j = 0; j < enemies.length; j++) {
          if (i === j) continue;
          const o = enemies[j];
          // Skip boss-grunt collision for a couple seconds after spawn
          if (
            (e.type === "grunt" && o.type === "gruntBoss" && e.noBossCollision > 0) ||
            (o.type === "grunt" && e.type === "gruntBoss" && o.noBossCollision > 0)
          ) {
            continue;
          }
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const d = Math.hypot(ox, oy);
          // Use collisionRadius for overlap, fallback to radius if missing
          const r1 = typeof e.collisionRadius === 'number' ? e.collisionRadius : e.radius;
          const r2 = typeof o.collisionRadius === 'number' ? o.collisionRadius : o.radius;
          const minDist = r1 + r2;
          if (d < minDist && d > 0) {
            const overlap = (minDist - d) / 2;
            // Reduce push factor for all enemies for gentler separation
            let pushFactorE = 0.25, pushFactorO = 0.25;
            if (e.type === "gruntBoss") pushFactorE = 0.08;
            else if (e.type === "brute") pushFactorE = 0.18;
            if (o.type === "gruntBoss") pushFactorO = 0.08;
            else if (o.type === "brute") pushFactorO = 0.18;
            // Each enemy moves by its push factor
            e.x += (ox / d) * overlap * pushFactorE * delta * SPEED_MULTIPLIER;
            e.y += (oy / d) * overlap * pushFactorE * delta * SPEED_MULTIPLIER;
            o.x -= (ox / d) * overlap * pushFactorO * delta * SPEED_MULTIPLIER;
            o.y -= (oy / d) * overlap * pushFactorO * delta * SPEED_MULTIPLIER;
          }
        }
        // Consistent spin speed for all enemies
        if (typeof e.spinAngle === "undefined") e.spinAngle = Math.random() * Math.PI * 2;
        e.spinAngle += 0.003 * delta * SPEED_MULTIPLIER;
        // Slinger hover effect (visual only)
        let hoverY = e.y;
        if (e.type === "slinger") {
          if (typeof e.baseY === "undefined") e.baseY = e.y;
          if (typeof e.hoverOffset === "undefined") e.hoverOffset = Math.random() * Math.PI * 2;
          e.hoverOffset += 0.04 * delta * SPEED_MULTIPLIER;
          hoverY = e.y + Math.sin(e.hoverOffset) * 0.2;
        }
      }
    }
  }

  function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      let moved = false;
      // Store previous positions for trail
      if (!p.trail) p.trail = [];
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 12) p.trail.shift();
      p.x += p.dx;
      p.y += p.dy;

      const dist = Math.hypot(player.x - p.x, player.y - p.y);
      if (dist < player.radius + 4) {
        player.health -= p.damage;
        playerHurtTimer = 44; // 14 frames of red flash
        projectiles.splice(i, 1);
        continue;
      }

      if (p.x < -20 || p.x > canvas.width + 20 || p.y < -20 || p.y > canvas.height + 20) {
        projectiles.splice(i, 1);
      }
    }
  }

  function updateParticles() {
    for (let p of particles) {
      p.x += p.dx;
      p.y += p.dy;
      if (p.decay) {
        p.dx *= p.decay;
        p.dy *= p.decay;
      }
      p.life--;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
  }

  function drawProjectiles() {
    for (let p of projectiles) {
      // Draw trail
      if (p.trail && p.trail.length > 1) {
        ctx.save();
        for (let i = 1; i < p.trail.length; i++) {
          const prev = p.trail[i - 1];
          const curr = p.trail[i];
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          const alpha = 0.12 + 0.18 * (i / p.trail.length);
          ctx.strokeStyle = `rgba(255, 180, 60, ${alpha})`;
          ctx.lineWidth = 2.2 - 1.2 * (i / p.trail.length);
          ctx.stroke();
        }
        ctx.restore();
      }
      // Pulsing glow
      ctx.save();
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 120 + p.x + p.y);
      ctx.globalAlpha = 0.7 * pulse;
      ctx.shadowColor = "orange";
      ctx.shadowBlur = 18 * pulse;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "orange";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      // Inner core
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff6b0";
      ctx.fill();
      ctx.restore();
    }
  }











//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  
//-==-=-=-=-=-=-=-=-=-=-=-=-=main game loop and drawing=-=-=-=-=-=-=-=-=-=-=-=-=-=- 
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  


  let lastTimestamp = performance.now();

  function gameLoop(currentTimestamp) {
    // Calculate delta time in seconds
    const delta = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;
        // Draw wave announcement if timer is active
        // (waveAnnouncementTimer update will be made delta-based in next step)
        if (waveAnnouncementTimer > 0) {
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "bold 44px sans-serif";
          ctx.fillStyle = "#00eaff";
          ctx.shadowColor = "#222";
          ctx.shadowBlur = 18;
          ctx.globalAlpha = Math.min(1, waveAnnouncementTimer / WAVE_ANNOUNCE_DURATION);
          ctx.fillText("Wave " + wave, canvas.width / 2, canvas.height / 2);
          ctx.restore();
          waveAnnouncementTimer -= delta * 60; // 60 = original FPS
        }
    if (!followMouse && !gameOver) {
      paused = true;
      showStats = true;
    } else if (followMouse) {
      paused = false;
      showStats = false;
    }

    // Draw background image, fallback to clear if not loaded
    if (backgroundImg.complete && backgroundImg.naturalWidth > 0) {
      ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Draw 8 small rectangular lights matching the blue panels
    // Lights configuration: edit each light's properties here
    const lights = [
      // Example: {x, y, w, h, color, intensity, border, beamColor}
      {x: 115, y: 220, w: 8, h: 45, color: "rgba(50, 211, 255, 0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: 115, y: canvas.height -310, w: 8, h: 45, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: 340, y: canvas.height - 130, w: 45, h: 8, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: canvas.width - 390, y: canvas.height - 130, w: 45, h: 8, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: canvas.width - 120, y: canvas.height -310, w: 8, h: 45, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: canvas.width - 120, y: 220, w: 8, h: 45, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: 340, y: 90, w: 45, h: 8, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"},
      {x: canvas.width - 390, y: 90, w: 45, h: 8, color: "rgba(0,200,255,0)", intensity: 0.28, border: "#00bfff00", beamColor: "rgba(0,200,255,0.28)"}
    ];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    lights.forEach(light => {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = light.color;
      ctx.fillRect(light.x, light.y, light.w, light.h);
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 3;
      ctx.strokeStyle = light.border;
      ctx.strokeRect(light.x, light.y, light.w, light.h);
      ctx.restore();

      // Draw a radial glow centered on the light
      ctx.save();
      const lx = light.x + light.w / 2;
      const ly = light.y + light.h / 2;
      const glowRadius = Math.max(light.w, light.h) * 4.2;
      const grad = ctx.createRadialGradient(lx, ly, Math.max(light.w, light.h) * 0.5, lx, ly, glowRadius);
      grad.addColorStop(0, light.beamColor);
      grad.addColorStop(0.3, `rgba(0,200,255,${light.intensity * 0.36})`);
      grad.addColorStop(1, "rgba(0,0,0,0.0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(lx, ly, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    });
    if (gameStarted) {
      // ...existing code...
    }

    if (!gameStarted && Date.now() - startTime < 2000) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("Sentinel v2.0", canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("Prepare for battle...", canvas.width / 2, canvas.height / 2 + 20);
      drawWaveAnnouncement();
    } else {
      drawWaveAnnouncement();
      if (!gameStarted) {
        spawnWave();
        gameStarted = true;
      }

      if (!paused && !gameOver) {
        updateHealthDrops();
        updateXPDrops();
        updateslingerDrops();
        updateBruteDrops();
        updateMines(delta);
        updateParticles();
        updatePlayer(delta);
        updateEnemies(delta);
        updateProjectiles();
        autoAttack();
        handleWaveSpawning();
        if (enemies.length === 0 && burstIndex >= burstCount) {
          wave++;
          spawnWave();
        }
      }



      //-======================DROPS, MINES, AND PARTICLES======================-
      // Draw drops with glow (drawn before player/enemies for z-index effect)
      xpDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ff33ff";
        ctx.shadowBlur = 18;
        const grad = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 5);
        grad.addColorStop(0, "#ff87ff");
        grad.addColorStop(0.4, "#ff31ff");
        grad.addColorStop(1, "#910091");
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });
      // Slinger drop glow
      slingerDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ffc250";
        ctx.shadowBlur = 18;
        const grad = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 5);
        grad.addColorStop(0, "#fcea64");
        grad.addColorStop(0.4, "#ffd700");
        grad.addColorStop(1, "#ff9900");
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });
      // Brute drop glow
      bruteDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 18;
        const grad = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 5);
        grad.addColorStop(0, "#ff4949");
        grad.addColorStop(0.4, "#ff1717");
        grad.addColorStop(1, "#8B0000");
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });
      // Health drop glow
      healthDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 18;
        const grad = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 6);
        grad.addColorStop(0, "#ff4949");
        grad.addColorStop(0.4, "#ff1717");
        grad.addColorStop(1, "#b11717");
        ctx.beginPath();
        ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      // Draw mines before player/enemies for proper z-index
      drawMines();

      //laser, enemyHit, levelUp, xpDrop, slingerDrop, bruteDrop, healthDrop, enemyDeath, 
      drawParticlesOfType("xpDrop")
      drawParticlesOfType("slingerDrop")
      drawParticlesOfType("bruteDrop")
      drawParticlesOfType("healthDrop")
      drawParticlesOfType("enemyDeath")
      drawParticlesOfType("dust")
      drawParticlesOfType("novaFlare")
      drawParticlesOfType("gruntNova")






      //-======================PLAYER AND ENEMIES======================-
      // Draw health bar and XP bar above the player (no numbers)
      function drawPlayerBars() {
          // Draw pickup circle border
          ctx.save();
          ctx.globalAlpha = 0.05;
          ctx.strokeStyle = '#00eaff';
          ctx.fillStyle = 'rgb(1, 133, 145)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(player.x, player.y, player.pickupRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        const barWidth = player.radius * 2.2;
        const barHeight = 4; // Skinnier bars
        const barX = player.x - barWidth / 2;
        let barY = player.y - player.radius - 18;

        // Health bar
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#222";
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.rect(barX, barY, barWidth, barHeight);
        ctx.stroke();
        ctx.fillRect(barX, barY, barWidth * (player.health / player.maxHealth), barHeight);
        ctx.restore();

        // XP bar (drawn above health bar)
        barY -= barHeight + 3; // Slightly less gap for skinnier bars
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#222";
        ctx.fillStyle = "#0cf";
        ctx.beginPath();
        ctx.rect(barX, barY, barWidth, barHeight);
        ctx.stroke();
        ctx.fillRect(barX, barY, barWidth * (xp / xpToLevel), barHeight);
        ctx.restore();
      }

      // Player feedback: red flash when hurt, green flash when level up
      let feedbackColor = null;
      let feedbackAlpha = 0;
      if (playerHurtTimer > 0) {
        feedbackColor = "#b6bee9"; // blue shield effect
        feedbackAlpha = 0.38 * (playerHurtTimer / 14);
      } else if (playerLevelUpTimer > 0) {
        feedbackColor = "#00ffdd";
        feedbackAlpha = 0.35 * (playerLevelUpTimer / 24);
      }

      if (playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(player.x, player.y);
        // Laser shadow behind player when laser is active
        const nearest = window._nearestEnemy;
        const minDist = typeof window._minDist !== 'undefined' ? window._minDist : Infinity;
        if (nearest && minDist < player.range + nearest.radius && player.attackCooldown > 0) {
          // Shadow direction: away from laser
          const dx = nearest.x - player.x;
          const dy = nearest.y - player.y;
          const dist = Math.hypot(dx, dy);
          const dirX = dx / dist;
          const dirY = dy / dist;
          const shadowOffset = player.radius * 1.8;
          const shadowX = -dirX * shadowOffset;
          const shadowY = -dirY * shadowOffset;
          const shadowLength = player.radius * 2.8;
          ctx.save();
          ctx.globalAlpha = 0.38;
          ctx.fillStyle = 'rgba(0,0,0,0.38)';
          ctx.translate(shadowX, shadowY);
          ctx.beginPath();
          ctx.ellipse(0, 0, shadowLength, player.radius * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // For each light, cast a shadow on the player, fading with distance
        lights.forEach(light => {
          // Calculate direction from light to player
          const lx = light.x + light.w / 2;
          const ly = light.y + light.h / 2;
          const dx = player.x - lx;
          const dy = player.y - ly;
          const dist = Math.hypot(dx, dy);
          // Fade shadow: max opacity when close, fades out as distance increases
          const fadeStart = Math.max(light.w, light.h) * 1.2;
          const fadeEnd = Math.max(light.w, light.h) * 6.5;
          let shadowAlpha = 0;
          if (dist < fadeStart) {
            shadowAlpha = 0.38;
          } else if (dist < fadeEnd) {
            shadowAlpha = 0.38 * (1 - (dist - fadeStart) / (fadeEnd - fadeStart));
          }
          if (shadowAlpha > 0.01) {
            // Normalize direction
            const dirX = dx / dist;
            const dirY = dy / dist;
            // Shadow offset: away from light
            const shadowOffset = player.radius * 1.2;
            const shadowX = dirX * shadowOffset;
            const shadowY = dirY * shadowOffset;
            // Shadow length and angle
            const shadowLength = player.radius * 2.2;
            const shadowAngle = Math.atan2(dirY, dirX);
            ctx.save();
            ctx.globalAlpha = shadowAlpha * 0.98;
            ctx.fillStyle = "rgba(0,0,0,0.38)";
            ctx.translate(shadowX, shadowY);
            ctx.rotate(shadowAngle);
            ctx.beginPath();
            ctx.ellipse(0, 0, shadowLength, player.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        // Gold glow if stat points available
        let angle = window._playerToEnemyAngle || 0;
        if (statPoints > 0) {
          ctx.shadowColor = "#00ffdd";
          ctx.shadowBlur = 32;
        } else {
          ctx.shadowColor = "#222";
          ctx.shadowBlur = 12;
        }
        // Rotate so the bottom of the image faces the nearest enemy
        // The image's bottom is at -Math.PI/2 from its default orientation
        ctx.rotate(angle - Math.PI / 2);
        ctx.drawImage(
          playerImg,
          -player.radius * 1.5,
          -player.radius * 1.5,
          player.radius * 3,
          player.radius * 3
        );
        // Overlay feedback color if needed
        if (feedbackColor) {
          ctx.globalAlpha = feedbackAlpha;
          // Create a radial gradient for a blurry, bubble-like shield
          const r = player.radius * 1.5;
          const grad = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r);
          grad.addColorStop(0, feedbackColor + '55'); // more transparent center
          grad.addColorStop(0.7, feedbackColor + '66');
          grad.addColorStop(1, feedbackColor + '00'); // fully transparent edge
          ctx.save();
          ctx.shadowColor = feedbackColor;
          ctx.shadowBlur = 32;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1.0;
        }
        ctx.restore();
      } else {
        ctx.save();
        // Gold glow if stat points available
        if (statPoints > 0) {
          ctx.shadowColor = "gold";
          ctx.shadowBlur = 32;
        } else {
          ctx.shadowColor = "#00000071";
          ctx.shadowBlur = 12;
        }
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
        // Overlay feedback color if needed
        if (feedbackColor) {
          ctx.globalAlpha = feedbackAlpha;
          // Create a radial gradient for a blurry, bubble-like shield
          const r = player.radius;
          const grad = ctx.createRadialGradient(player.x, player.y, r * 0.4, player.x, player.y, r);
          grad.addColorStop(0, feedbackColor + '55');
          grad.addColorStop(0.5, feedbackColor + '66');
          grad.addColorStop(1, feedbackColor + '00');
          ctx.save();
          ctx.shadowColor = feedbackColor;
          ctx.shadowBlur = 32;
          ctx.beginPath();
          ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1.0;
        }
        ctx.restore();
      }
      drawPlayerBars();
      // (Removed health number on player)

      enemies.forEach(e => {
                // Draw boss health bar above boss
                if (e.type === "gruntBoss") {
                  const barWidth = 80;
                  const barHeight = 8;
                  const barX = e.x - barWidth / 2;
                  const barY = e.y - e.radius - 24;
                  ctx.save();
                  ctx.globalAlpha = 0.92;
                  ctx.lineWidth = 3;
                  ctx.strokeStyle = "#222";
                  ctx.fillStyle = "#e00000";
                  ctx.beginPath();
                  ctx.rect(barX, barY, barWidth, barHeight);
                  ctx.stroke();
                  ctx.fillRect(barX, barY, barWidth * (e.health / 300), barHeight);
                  // Draw boss label
                  ctx.font = "bold 13px sans-serif";
                  ctx.fillStyle = "#fff";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "bottom";
                  ctx.fillText("Shard Major", e.x, barY - 2);
                  ctx.restore();
                }
        // Slinger hover effect (visual only)
        let hoverY = e.y;
        if (e.type === "slinger") {
          if (typeof e.baseY === "undefined") e.baseY = e.y;
          if (typeof e.hoverOffset === "undefined") e.hoverOffset = Math.random() * Math.PI * 2;
          e.hoverOffset += 0.04;
          hoverY = e.y + Math.sin(e.hoverOffset) * 0.2;
        }

        // Draw fading shadows from each light
        ctx.save();
        ctx.translate(e.x, e.y);
        lights.forEach(light => {
          const lx = light.x + light.w / 2;
          const ly = light.y + light.h / 2;
          const dx = e.x - lx;
          const dy = e.y - ly;
          const dist = Math.hypot(dx, dy);
          const fadeStart = Math.max(light.w, light.h) * 1.2;
          const fadeEnd = Math.max(light.w, light.h) * 6.5;
          let shadowAlpha = 0;
          if (dist < fadeStart) {
            shadowAlpha = 0.38;
          } else if (dist < fadeEnd) {
            shadowAlpha = 0.38 * (1 - (dist - fadeStart) / (fadeEnd - fadeStart));
          }
          if (shadowAlpha > 0.01) {
            const dirX = dx / dist;
            const dirY = dy / dist;
            const shadowOffset = (e.radius > 20 ? 1.5 : 1.2) * e.radius;
            const shadowX = dirX * shadowOffset;
            const shadowY = dirY * shadowOffset;
            // Make brute shadow larger from lights
            let shadowLength, shadowWidth;
            if (e.type === "brute") {
              shadowLength = e.radius * 2.7;
              shadowWidth = e.radius * 1.1;
            } else {
              shadowLength = (e.radius > 20 ? 2.8 : 2.2) * e.radius;
              shadowWidth = e.radius * 0.7;
            }
            const shadowAngle = Math.atan2(dirY, dirX);
            ctx.save();
            ctx.globalAlpha = shadowAlpha * 0.58;
            ctx.fillStyle = "rgba(0,0,0,0.38)";
            ctx.translate(shadowX, shadowY);
            ctx.rotate(shadowAngle);
            ctx.beginPath();
            ctx.ellipse(0, 0, shadowLength, shadowWidth, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
        ctx.restore();

        ctx.save();
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(e.x, e.y, (e.radius > 20 ? 40 : 20), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 80, 80, 0.0)";
        ctx.lineWidth = 1; ctx.stroke();
        // Draw magenta grunt, grunt boss, and grunt boss minor with grunt image
        if ((e.type === "grunt" && e.color === "magenta") || e.type === "gruntBoss" || e.type === "gruntBossMinor") {
          ctx.save();
          ctx.shadowColor = "#00000071";
          ctx.shadowBlur = 12;
          ctx.translate(e.x, e.y);
          ctx.rotate(e.spinAngle);
          ctx.drawImage(gruntImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        } else if (e.type === "brute") {
          ctx.save();
          ctx.shadowColor = "#0000009f";
          ctx.shadowBlur = 12;
          ctx.translate(e.x, e.y);
          ctx.drawImage(bruteImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
          // Draw nova circle with cue
          ctx.save();
          ctx.globalAlpha = 0.32;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.novaRadius || (e.radius + 8), 0, Math.PI * 2);
          ctx.strokeStyle = e.novaCue ? "#fff200" : "#ff6600";
          ctx.shadowColor = e.novaCue ? "#fff200" : "#ff6600";
          ctx.shadowBlur = e.novaCue ? 24 : 12;
          ctx.stroke();
          ctx.restore();
        } else if (e.type === "slinger") {
          ctx.save();
          ctx.shadowColor = "#00000071";
          ctx.shadowBlur = 12;
          ctx.translate(e.x, hoverY);
          ctx.drawImage(slingerImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        } else if (e.type === "kamikaze") {
          ctx.save();
          ctx.shadowColor = "#ff4444";
          ctx.shadowBlur = 12;
          ctx.translate(e.x, e.y);
          ctx.drawImage(kamikazeImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        } else {
          ctx.fillStyle = e.color;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
          // Draw health number for other enemies
          ctx.fillStyle = "white";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(Math.ceil(e.health), e.x, e.y);
        }
        ctx.restore();
      });

      //laser, enemyHit, levelUp, xpDrop, slingerDrop, bruteDrop, healthDrop, enemyDeath, 
      drawParticlesOfType("laser")
      drawParticlesOfType("enemyHit")
      drawParticlesOfType("levelUp")

      drawProjectiles();




      //-======================HUD AND STAT ALLOCATION======================-
      // Draw stat allocation warning box under HUD overlay
      if (statPoints > 0 && !showStats) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#152c16';
        ctx.fillRect(canvas.width / 2 - 170, -10, 340, 110);
        ctx.globalAlpha = 0.75;
        ctx.shadowColor = '#00ffdd';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#00ffdd';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 170, -10, 340, 110);
        ctx.shadowBlur = 0;
        ctx.restore();
        ctx.fillStyle = "#00ffdd";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("LEVEL UP!", canvas.width / 2, 80);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#152c16';
        ctx.fillRect(canvas.width / 2 - 330, canvas.height - 110, 660, 110);
        ctx.globalAlpha = 0.75;
        ctx.shadowColor = '#00ffdd';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#00ffdd';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 330, canvas.height - 110, 660, 110);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#00ffdd";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("[1]-> Range  [2]-> Power  [3]-> Atk Speed  [4]-> Movement  [5]-> Vitality  [6]-> Pickup", canvas.width / 2, canvas.height - 85);
      }
      // Draw HUD overlay image after stat allocation boxes
      if (hudImg.complete && hudImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(hudImg, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      drawHUD();
      if (gameStarted && !gameOver && !followMouse) {
        ctx.save();
        ctx.fillStyle = "white";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Hold RIGHT-CLICK to play", canvas.width / 2, canvas.height / 2 - 80);
        ctx.restore();
      }
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      
      
      

      if (player.health <= 0 && !gameOver) {
        gameOver = true;
      }

      if (gameOver) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "red";
        ctx.font = "bold 40px sans-serif";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 40);
        requestAnimationFrame(gameLoop);
        return;
      }
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

}
