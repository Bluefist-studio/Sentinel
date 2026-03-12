// Global debug function to print wave state and burst arrays
window.printWaveDebug = function() {
  console.log('--- Sentinel Wave Debug ---');
  console.log('window._sentinelWaveState:', window._sentinelWaveState);
  console.log('window._customBursts:', window._customBursts);
  console.log('window._customBrutes:', window._customBrutes);
  console.log('window._customSlingers:', window._customSlingers);
  console.log('window._customShielders:', window._customShielders);
  console.log('window._customBeamers:', window._customBeamers);
  console.log('window._customKamikazes:', window._customKamikazes);
  console.log('window._customStalkers:', window._customStalkers);
  console.log('window._customBossMinors:', window._customBossMinors);
  console.log('window._customBosses:', window._customBosses);
  console.log('window._customSlingerBosses:', window._customSlingerBosses);
  console.log('window._customBruteBosses:', window._customBruteBosses);
  console.log('window._customStalkerBosses:', window._customStalkerBosses);
  console.log('---------------------------');
};
window.SentinelWaveControl = (function () {
  const CODE_WAVE_MIN = 16;
  const CODE_WAVE_MAX = 50;
  const MOB_INTERVAL_KEYS = ["grunts", "slingers", "shielders", "beamers", "stalkers", "brutes", "kamikazes", "gruntbossminor", "gruntboss", "slingerboss", "bruteboss", "stalkerBoss"];
  const MOB_INTERVAL_KEY_ALIASES = {
    bossMinors: "gruntbossminor",
    bosses: "gruntboss",
    gruntBossMinor: "gruntbossminor",
    gruntBoss: "gruntboss",
    slingerBoss: "slingerboss",
    bruteBoss: "bruteboss",
    stalkerBoss: "stalkerBoss"
  };

  // Timeline wave data storage: { waveNum: { duration, mobs: { mobType: [{time, amount}, ...] } } }
  const timelineWaveData = {};

  function resolveMobIntervalKey(key) {
    if (typeof key !== "string") return key;
    if (MOB_INTERVAL_KEYS.includes(key)) return key;
    if (MOB_INTERVAL_KEY_ALIASES[key]) return MOB_INTERVAL_KEY_ALIASES[key];
    const lower = key.toLowerCase();
    if (MOB_INTERVAL_KEYS.includes(lower)) return lower;
    return MOB_INTERVAL_KEY_ALIASES[lower] || key;
  }

  function normalizeMobIntervals(intervals) {
    if (!intervals || typeof intervals !== "object") return null;
    const normalized = {};
    for (const [inputKey, inputValue] of Object.entries(intervals)) {
      const key = resolveMobIntervalKey(inputKey);
      if (!MOB_INTERVAL_KEYS.includes(key)) continue;
      const raw = inputValue;
      if (raw === undefined || raw === null) continue;
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        normalized[key] = parsed;
      }
    }
    return Object.keys(normalized).length ? normalized : null;
  }

  // Returns the correct interval for a mob type, using user logic
  function getMobIntervalFor(key, baseInterval, burstCount) {
    const resolvedKey = resolveMobIntervalKey(key);
    const custom = window._customMobBurstIntervals;
    if (custom && typeof custom === "object") {
      const value = Number(custom[resolvedKey]);
      // If y = 0, use wave burst interval (x)
      if (Number.isFinite(value) && value === 0) return baseInterval;
      if (Number.isFinite(value) && value > 0) return value;
    }
    return baseInterval;
  }

  function ensureMobElapsedState(wave) {
    if (!window._mobBurstElapsed || window._mobBurstElapsedWave !== wave) {
      window._mobBurstElapsedWave = wave;
      window._mobBurstElapsed = {
        grunts: 0,
        slingers: 0,
        shielders: 0,
        beamers: 0,
        stalkers: 0,
        brutes: 0,
        kamikazes: 0,
        gruntbossminor: 0,
        gruntboss: 0,
        slingerboss: 0,
        bruteboss: 0,
        stalkerBoss: 0
      };
    }
    return window._mobBurstElapsed;
  }

  function canSpawnByMobInterval(elapsedState, key, interval) {
    const resolvedKey = resolveMobIntervalKey(key);
    if (!elapsedState || !resolvedKey || !Number.isFinite(interval) || interval <= 0) return true;
    if ((elapsedState[resolvedKey] || 0) < interval) return false;
    elapsedState[resolvedKey] -= interval;
    return true;
  }

  // Paste future editor code strings into these wave slots (16-50).
  const DEFAULT_WAVE_EDITOR_CODES = {
    16: "SWC3:eyJ2IjozLCJvIjp7IjE2Ijp7InQiOnRydWUsImwiOnsiZCI6MTgsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFsyLDJdLFs0LDNdLFs2LDNdLFs4LDRdLFsxMCw0XSxbMTIsMl0sWzE0LDJdXSwiYiI6W1swLDFdLFsyLDFdLFs0LDFdLFs2LDJdXX19fX19",
    17: "SWC3:eyJ2IjozLCJvIjp7IjE3Ijp7InQiOnRydWUsImwiOnsiZCI6MTgsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFsyLDJdLFs0LDNdLFs2LDNdLFs4LDRdLFsxMCw0XSxbMTIsMl0sWzE0LDJdLFsxNiwyXSxbMTgsMl1dLCJiIjpbWzAsMl0sWzIsMV0sWzQsMV0sWzYsMl1dLCJnYm0iOltbMiwxXSxbNywxXSxbMTIsMV1dfX19fX0=",
    18: "SWC3:eyJ2IjozLCJvIjp7IjE4Ijp7InQiOnRydWUsImwiOnsiZCI6MTgsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFsyLDJdLFs0LDNdLFs2LDNdLFs4LDRdLFsxMCw0XSxbMTIsMl0sWzE0LDJdLFsxNiwyXSxbMTgsMl1dLCJiIjpbWzEsMl1dLCJrIjpbWzIsMV0sWzMsMV0sWzcsMV0sWzcuNSwxXSxbOCwxXSxbMTMsMV0sWzEyLDFdLFsxMi41LDFdLFsyLjUsMV1dLCJnYm0iOltbMiwzXV19fX19fQ==",
    19: "SWC3:eyJ2IjozLCJvIjp7IjE5Ijp7InQiOnRydWUsImwiOnsiZCI6MTgsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFsyLDJdLFs0LDNdLFs2LDNdLFs4LDJdLFsxMCwyXSxbMTIsMl0sWzE0LDJdXSwiYiI6W1swLDFdLFsyLDFdLFs0LDFdLFs2LDJdXSwicyI6W1swLDFdLFsyLDFdLFs1LDFdLFs3LDFdLFsxMCwxXSxbMTIsMV1dLCJrIjpbWzIsMV0sWzcsMV0sWzEyLDFdXSwiZ2JtIjpbWzIsMV0sWzcsMV0sWzEyLDFdXX19fX19",
    20: null, //Brute boss wave - no preset, must be configured in editor
    21: "SWC3:eyJ2IjozLCJvIjp7IjIxIjp7InQiOnRydWUsImwiOnsiZCI6NDIsImUiOiJkdXJhdGlvbiIsIm0iOnsic3QiOltbMCwxXSxbNCwxXSxbOCwxXSxbMTIsMV0sWzE2LDFdLFsyMCwxXSxbMjQsMV0sWzI4LDFdLFszMiwxXSxbMzYsMV1dfX19fX0=",
    22: "SWC3:eyJ2IjozLCJvIjp7IjIyIjp7InQiOnRydWUsImwiOnsiZCI6NDIsImUiOiJkdXJhdGlvbiIsIm0iOnsiYiI6W1swLDNdXSwic3QiOltbNCwyXSxbOCwxXSxbMTIsMV0sWzE2LDFdLFsyMCwxXSxbMjQsMV0sWzI4LDFdLFszMiwxXSxbMzYsMV1dLCJnYm0iOltbMCwzXV19fX19fQ==",
    23: "SWC3:eyJ2IjozLCJvIjp7IjIzIjp7InQiOnRydWUsImwiOnsiZCI6NDIsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFs0LDJdLFs4LDJdLFsxMiwyXSxbMTYsMl0sWzIwLDJdLFsyNCwyXSxbMjgsMl0sWzMyLDJdLFszNiwyXV0sImIiOltbMCwzXV0sImsiOltbMCwxXSxbNCwxXSxbOCwxXSxbMTIsMV0sWzE2LDFdLFsyMCwxXSxbMjQsMV0sWzI4LDFdLFszMiwxXSxbMzYsMV1dLCJzdCI6W1s0LDJdLFsxMiwyXSxbMjAsMl0sWzI4LDJdXX19fX19",
    24: "SWC3:eyJ2IjozLCJvIjp7IjI0Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJhbGxFbGltaW5hdGVkIiwibSI6eyJnIjpbWzIsNF0sWzQsNF0sWzYsNF0sWzgsNF0sWzEwLDRdLFsxMiw0XSxbMTQsNF0sWzE2LDRdLFsxOCw0XSxbMjAsNF0sWzAsNF0sWzEsMl0sWzMsMl0sWzUsMl0sWzcsMl0sWzksMl0sWzExLDJdLFsxMywyXSxbMTUsMl0sWzE3LDJdLFsxOSwyXV0sInNoIjpbWzIuNSwxXV19fX19fQ==",
    25: "SWC3:eyJ2IjozLCJvIjp7IjI1Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJhbGxFbGltaW5hdGVkIiwibSI6eyJnIjpbWzIsNF0sWzQsNF0sWzYsNF0sWzgsNF0sWzEwLDRdLFsxMiw0XSxbMTQsNF0sWzE2LDRdLFsxOCw0XSxbMjAsNF0sWzAsNF0sWzEsMl0sWzUsMl0sWzcsMl0sWzksMl0sWzExLDJdLFsxMywyXSxbMTUsMl0sWzE3LDJdLFsxOSwyXSxbMywyXV0sImIiOltbMi41LDJdXSwic2giOltbMi41LDJdLFs3LjUsMV0sWzEyLjUsMV1dfX19fX0=",
    26: "SWC3:eyJ2IjozLCJvIjp7IjI2Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJhbGxFbGltaW5hdGVkIiwibSI6eyJnIjpbWzEsMl0sWzIsMl0sWzMsMl0sWzQsMl0sWzUsMl0sWzYsMl0sWzcsMl0sWzgsMl0sWzksMl0sWzEwLDJdLFsxMSwyXSxbMTIsMl0sWzEzLDJdLFsxNCwyXSxbMTUsMl0sWzE2LDJdLFsxNywyXSxbMTgsMl0sWzE5LDJdLFsyMCwyXSxbMCwyXV0sImIiOltbMi41LDJdXSwic2giOltbMi41LDJdLFs3LjUsMV0sWzEyLjUsMV1dLCJnYm0iOltbMiwxXV19fX19fQ==",
    27: "SWC3:eyJ2IjozLCJvIjp7IjI3Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJhbGxFbGltaW5hdGVkIiwibSI6eyJnIjpbWzAsM10sWzAuNSwzXSxbMSwzXSxbMS41LDNdLFsyLDNdLFsyLjUsM11dLCJiIjpbWzEuNSwzXV0sInNoIjpbWzIuNSwyXSxbNy41LDJdLFsxMi41LDJdXSwic3QiOltbNCwyXSxbMTMsMV0sWzguNSwxXSxbMTcuNSwxXV0sImdibSI6W1syLDFdXX19fX19",
    28: "SWC3:eyJ2IjozLCJvIjp7IjI4Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFswLjUsM10sWzEsMl0sWzEuNSwzXSxbMiwyXSxbMi41LDNdXSwic2giOltbMi41LDJdLFs3LjUsMl0sWzEyLjUsMl1dLCJrIjpbWzE1LDFdLFsxOCwxXSxbMCwxXSxbMC41LDFdLFsxLDFdLFszLjUsMV0sWzExLjUsMV0sWzE0LjUsMV0sWzE3LjUsMV0sWzE4LjUsMV0sWzQsMV0sWzcsMV0sWzQuNSwxXSxbNy41LDFdLFs4LDFdLFsxMC41LDFdLFsxMSwxXSxbMTQsMV1dLCJzdCI6W1s1LDFdLFsxNSwxXSxbNy41LDFdLFsyLjUsMV0sWzEwLDFdLFsxMi41LDFdXX19fX19",
    29: "SWC3:eyJ2IjozLCJvIjp7IjI5Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFswLjUsM10sWzEsMl0sWzEuNSwzXSxbMiwyXSxbMi41LDNdXSwicyI6W1s0LDFdLFs2LDFdLFs4LDFdLFsxMCwxXSxbMTIsMV0sWzE0LDFdXSwic2giOltbMi41LDJdLFs3LjUsMl0sWzEyLjUsMl0sWzUsMV0sWzEwLDFdLFsxNC41LDFdXSwic3QiOltbNSwxXSxbMTUsMV0sWzcuNSwxXSxbMi41LDFdLFsxMCwxXSxbMTIuNSwxXV19fX19fQ==",
    30: "SWC3:eyJ2IjozLCJvIjp7IjMwIjp7InQiOnRydWUsImwiOnsiZCI6MzAsImUiOiJhbGxFbGltaW5hdGVkIn19fX0=",
    31: null,
    32: null,
    33: null,
    34: null,
    35: null,
    36: null,
    37: null,
    38: null,
    39: null,
    40: null,
    41: null,
    42: null,
    43: null,
    44: null,
    45: null,
    46: null,
    47: null,
    48: null,
    49: null,
    50: null
  };

  if (!window.SentinelWaveEditorCodes || typeof window.SentinelWaveEditorCodes !== "object") {
    window.SentinelWaveEditorCodes = { ...DEFAULT_WAVE_EDITOR_CODES };
  }
  for (let waveNumber = CODE_WAVE_MIN; waveNumber <= CODE_WAVE_MAX; waveNumber++) {
    if (!(waveNumber in window.SentinelWaveEditorCodes)) {
      window.SentinelWaveEditorCodes[waveNumber] = DEFAULT_WAVE_EDITOR_CODES[waveNumber] || null;
    }
  }

  function getEditorWaveCode(waveNumber) {
    if (window.SentinelWaveEditorCodes && typeof window.SentinelWaveEditorCodes[waveNumber] === "string") {
      return window.SentinelWaveEditorCodes[waveNumber];
    }
    return null;
  }

  function getCodeWaveFallbackPreset(waveNumber) {
    const index = Math.max(0, waveNumber - 16);
    const nullWaveIndex = Math.max(0, waveNumber - 22);
    const isRecoveryWave = waveNumber % 5 === 0;

    const burstCount = Math.min(12, 6 + Math.floor(nullWaveIndex * 0.5));
    const burstInterval = Math.max(300, 520 - (nullWaveIndex * 10) - (isRecoveryWave ? -20 : 0));

    const makeRamp = (base, growth, min, max, unlockAt = 0) => {
      if (nullWaveIndex < unlockAt) {
        return Array.from({ length: burstCount }, () => 0);
      }
      const wavePressure = isRecoveryWave ? 0.82 : 1;
      return Array.from({ length: burstCount }, (_, i) => {
        const value = (base + Math.floor(i * growth)) * wavePressure;
        return Math.max(min, Math.min(max, Math.floor(value)));
      });
    };

    return {
      burstCount,
      burstInterval,
      customBursts: makeRamp(2 + Math.floor(nullWaveIndex * 0.18), 0.24, 1, 6),
      customBrutes: makeRamp(nullWaveIndex >= 2 ? 1 : 0, 0.08, 0, 2, 2),
      customSlingers: makeRamp(1 + Math.floor(nullWaveIndex * 0.12), 0.1, 0, 3),
      customShielders: makeRamp(nullWaveIndex >= 6 ? 1 : 0, 0.05, 0, 2, 6),
      customBeamers: makeRamp(nullWaveIndex >= 9 ? 1 : 0, 0.04, 0, 2, 9),
      customKamikazes: makeRamp(Math.floor(nullWaveIndex * 0.16), 0.12, 0, 3),
      customStalkers: makeRamp(nullWaveIndex >= 11 ? 1 : 0, 0.04, 0, 2, 11),
      customBossMinors: makeRamp(nullWaveIndex >= 14 ? 1 : 0, 0.03, 0, 1, 14),
      customBosses: makeRamp(nullWaveIndex >= 24 ? 1 : 0, 0.02, 0, 1, 24),
      customSlingerBosses: makeRamp(0, 0, 0, 0),
      customBruteBosses: makeRamp(0, 0, 0, 0),
      customStalkerBosses: makeRamp(0, 0, 0, 0)
    };
  }

  function applyCodeWaveConfig(ctx, config) {
    ctx.setBurstCount(config.burstCount);
    ctx.setBurstInterval(config.burstInterval);
    window._customBursts = Array.isArray(config.customBursts) ? config.customBursts.slice() : null;
    window._customBrutes = Array.isArray(config.customBrutes) ? config.customBrutes.slice() : null;
    window._customSlingers = Array.isArray(config.customSlingers) ? config.customSlingers.slice() : null;
    window._customShielders = Array.isArray(config.customShielders) ? config.customShielders.slice() : null;
    window._customBeamers = Array.isArray(config.customBeamers) ? config.customBeamers.slice() : null;
    window._customKamikazes = Array.isArray(config.customKamikazes) ? config.customKamikazes.slice() : null;
    window._customStalkers = Array.isArray(config.customStalkers) ? config.customStalkers.slice() : null;
    window._customBossMinors = Array.isArray(config.customGruntBossMinors)
      ? config.customGruntBossMinors.slice()
      : (Array.isArray(config.customBossMinors) ? config.customBossMinors.slice() : null);
    window._customBosses = Array.isArray(config.customGruntBosses)
      ? config.customGruntBosses.slice()
      : (Array.isArray(config.customBosses) ? config.customBosses.slice() : null);
    window._customSlingerBosses = Array.isArray(config.customSlingerBosses) ? config.customSlingerBosses.slice() : null;
    window._customBruteBosses = Array.isArray(config.customBruteBosses) ? config.customBruteBosses.slice() : null;
    window._customStalkerBosses = Array.isArray(config.customStalkerBosses) ? config.customStalkerBosses.slice() : null;
    window._customMobBurstIntervals = normalizeMobIntervals(config.mobIntervals);
  }

  function configureCodeWave(ctx, waveNumber) {
    let config = null;
    const waveCode = getEditorWaveCode(waveNumber);

    if (waveCode && window.SentinelEditor && typeof window.SentinelEditor.getWaveConfigFromCode === "function") {
      try {
        config = window.SentinelEditor.getWaveConfigFromCode(waveCode, waveNumber);
      } catch (_) {}
    }

    if (!config) {
      config = getCodeWaveFallbackPreset(waveNumber);
    }

    applyCodeWaveConfig(ctx, config);
  }

  function randomEdgeSpawn(width = 1024, height = 768, pad = 30) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: -pad, y: Math.random() * height };
    if (side === 1) return { x: width + pad, y: Math.random() * height };
    if (side === 2) return { x: Math.random() * width, y: -pad };
    return { x: Math.random() * width, y: height + pad };
  }

  function spawnGruntBoss(ctx) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();
    // Use brute heavy.png for brute heavy (gruntBossMinor)
    let bruteHeavyImg = window._bruteHeavyImg;
    if (!bruteHeavyImg) {
      bruteHeavyImg = new window.Image();
      bruteHeavyImg.src = "brute heavy.png";
      window._bruteHeavyImg = bruteHeavyImg;
    }

    let gruntSpawnTimer = 0;
    let gruntSpawnInterval = 420;
    let gruntSpawnCount = 1 + Math.floor(Math.random() * 2);
    const { x, y } = randomEdgeSpawn();
    let radius = 34, collisionRadius = 40, speed = 0.4, health = 300 + (wave * 2), damage = 1, attackRange = 20, color = "magenta";
    const spinAngle = Math.random() * Math.PI * 2;
    const spinSpeed = (Math.random() - 0.5) * 0.02;

    const enemy = ctx.spawnEnemy();
    enemy.x = x;
    enemy.y = y;
    enemy.radius = radius;
    enemy.collisionRadius = collisionRadius;
    enemy.speed = speed;
    enemy.health = health;
    enemy.damage = damage;
    enemy.attackCooldown = 90;
    enemy.attackRange = attackRange;
    enemy.color = color;
    enemy.type = "gruntBoss";
    enemy.spinAngle = spinAngle;
    enemy.spinSpeed = spinSpeed;
    enemy.sprite = bruteHeavyImg;
    enemy.projectileCooldown = 0;
    enemy.projectileInterval = 120;
    enemy.projectileRadius = 8; // Match slinger projectile size
    enemy.burstMode = false;
    enemy.burstShotsLeft = 0;
    enemy.burstTimer = 0;
    enemy.gruntBossEntering = true;
    enemy.gruntBossEntryStage = "padding";
    enemy.gruntBossEdgePaddingX = 110;
    enemy.gruntBossEdgePaddingY = 150;
    enemy.gruntBossNormalSpeed = enemy.speed;
    enemy.gruntBossEntrySpeed = enemy.speed * 1.9;
    ctx.applyWaveEnemyModifiers(enemy);
    enemy.gruntBossNormalSpeed = enemy.speed;
    enemy.gruntBossEntrySpeed = enemy.speed * 1.9;
    enemy.maxHealth = enemy.health;

    enemies[enemies.length - 1].gruntSpawnTimer = gruntSpawnTimer;
    enemies[enemies.length - 1].gruntSpawnInterval = gruntSpawnInterval;
    enemies[enemies.length - 1].gruntSpawnCount = gruntSpawnCount;
  }

  function spawnGruntBossMinor(ctx) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();
    const gruntImg = ctx.getGruntSprite();
    let gruntSpawnTimer = 0;
    let gruntSpawnInterval = 420;
    let gruntSpawnCount = 1 + Math.floor(Math.random() * 2);
    const { x, y } = randomEdgeSpawn();
    let radius = 28, collisionRadius = 30, speed = 0.32, health = 150 + (wave * 2.5), damage = 1, attackRange = 20, color = "magenta";
    const spinAngle = Math.random() * Math.PI * 2;
    const spinSpeed = (Math.random() - 0.5) * 0.02;

    const enemy = ctx.spawnEnemy();
    enemy.x = x;
    enemy.y = y;
    enemy.radius = radius;
    enemy.collisionRadius = collisionRadius;
    enemy.speed = speed;
    enemy.health = health;
    enemy.damage = damage;
    enemy.attackCooldown = 0;
    enemy.attackRange = attackRange;
    enemy.color = color;
    enemy.type = "gruntBossMinor";
    enemy.spinAngle = spinAngle;
    enemy.spinSpeed = spinSpeed;
    enemy.sprite = gruntImg;
    ctx.applyWaveEnemyModifiers(enemy);

    enemies[enemies.length - 1].gruntSpawnTimer = gruntSpawnTimer;
    enemies[enemies.length - 1].gruntSpawnInterval = gruntSpawnInterval;
    enemies[enemies.length - 1].gruntSpawnCount = gruntSpawnCount;
  }

  function spawnBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 14, collisionRadius = 16, speed = 1.5, health = 6 + (wave * 1.3), damage = 1, attackRange = 22, color = "magenta";
      const spinAngle = Math.random() * Math.PI * 2;
      const spinSpeed = (Math.random() - 0.5) * 0.02;
      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.health = health;
      enemy.damage = damage;
      enemy.attackCooldown = 0;
      enemy.attackRange = attackRange;
      enemy.color = color;
      enemy.type = "grunt";
      enemy.spinAngle = spinAngle;
      enemy.spinSpeed = spinSpeed;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnKamikazeBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 16, collisionRadius = 18, speed = 2, color = "#ff4444", damage = 3, health = 20 + (wave * 1.2);
      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.color = color;
      enemy.damage = damage;
      enemy.health = health;
      enemy.type = "kamikaze";
      enemy.timer = 60;
      enemy.exploded = false;
      enemy.minesPlaced = 0;
      enemy.mineInterval = 60;
      enemy.nextMineTime = 60;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnSlingerBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();
    const slingerImg = ctx.getSlingerSprite();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 18, collisionRadius = 20, speed = 0.8, health = 18 + (wave * 1.5), damage = 1, attackRange = 240, color = "orange";
      const spinAngle = Math.random() * Math.PI * 2;
      const spinSpeed = (Math.random() - 0.5) * 0.02;
      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.health = health;
      enemy.damage = damage;
      enemy.attackCooldown = 0;
      enemy.attackRange = attackRange;
      enemy.color = color;
      enemy.type = "slinger";
      enemy.spinAngle = spinAngle;
      enemy.spinSpeed = spinSpeed;
      enemy.sprite = slingerImg;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnSlingerBoss(ctx) {
    const wave = ctx.getWave();
    const slingerImg = ctx.getSlingerSprite();
    const { x, y } = randomEdgeSpawn();
    const enemy = ctx.spawnEnemy();
    enemy.x = x;
    enemy.y = y;
    enemy.radius = 28;
    enemy.collisionRadius = 30;
    enemy.speed = 0.75;
    enemy.health = 2600 + (wave * 16);
    enemy.damage = 2;
    enemy.attackCooldown = 0;
    enemy.attackRange = 5000;
    enemy.color = "#ff9f1a";
    enemy.type = "slingerBoss";
    enemy.spinAngle = Math.random() * Math.PI * 2;
    enemy.spinSpeed = (Math.random() - 0.5) * 0.02;
    enemy.sprite = slingerImg;
    enemy.slingerBossEntering = true;
    enemy.slingerBossEntryStage = "padding";
    enemy.slingerBossEntrySpeed = enemy.speed * 1.9;
    enemy.slingerBossFragCooldown = 150;
    enemy.slingerBossEdgePaddingX = 110;
    enemy.slingerBossEdgePaddingY = 150;
    ctx.applyWaveEnemyModifiers(enemy);
    enemy.slingerBossEntrySpeed = enemy.speed * 1.9;
    enemy.slingerBossEntryStage = "padding";
    enemy.maxHealth = enemy.health;
  }

  function spawnBruteBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 24, collisionRadius = 26, speed = 0.62, health = 300 + (wave * 2), damage = 2, attackRange = 28, color = "#ff7a00";
      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.health = health;
      enemy.damage = damage;
      enemy.attackCooldown = 0;
      enemy.attackRange = attackRange;
      enemy.color = color;
      enemy.type = "brute";
      enemy.novaRadius = radius + 20;
      enemy.novaState = "minPause";
      enemy.novaCooldown = 120;
      enemy.novaCue = false;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnBruteBoss(ctx) {
    const wave = ctx.getWave();
    const canvasWidth = (ctx && typeof ctx.getCanvasWidth === "function") ? ctx.getCanvasWidth() : 1024;
    const canvasHeight = (ctx && typeof ctx.getCanvasHeight === "function") ? ctx.getCanvasHeight() : 768;
    const { x, y } = randomEdgeSpawn(canvasWidth, canvasHeight, 220);
    const enemy = ctx.spawnEnemy();
    enemy.x = x;
    enemy.y = y;
    enemy.radius = 34;
    enemy.collisionRadius = 32;
    enemy.speed = 0.48;
    enemy.health = 3800 + (wave * 16);
    enemy.damage = 4;
    enemy.attackCooldown = 0;
    enemy.attackRange = 34;
    enemy.color = "#ff7a00";
    enemy.type = "bruteBoss";
    enemy.novaMinRadius = enemy.radius + 56;
    enemy.novaRadius = enemy.novaMinRadius;
    enemy.novaState = "minPause";
    enemy.novaCooldown = 100;
    enemy.novaCue = false;
    enemy.novaGrowthSpeed = 2.8;
    enemy.novaShrinkSpeed = 2.8;
    enemy.novaMaxMultiplier = 6.6;
    enemy.novaDamage = 2;
    enemy.bruteBossEdgePaddingX = 90;
    enemy.bruteBossEdgePaddingY = 135;
    enemy.bruteBossEntering = true;
    enemy.bruteBossNormalSpeed = enemy.speed;
    enemy.bruteBossEntrySpeed = enemy.speed * 2.3;
    ctx.applyWaveEnemyModifiers(enemy);
    enemy.bruteBossNormalSpeed = enemy.speed;
    enemy.bruteBossEntrySpeed = enemy.speed * 2.3;
    enemy.maxHealth = enemy.health;
  }

  function spawnStalkerBurst(ctx, count) {
    const wave = ctx.getWave();
    const canvasWidth = (ctx && typeof ctx.getCanvasWidth === "function") ? ctx.getCanvasWidth() : 1024;
    const canvasHeight = (ctx && typeof ctx.getCanvasHeight === "function") ? ctx.getCanvasHeight() : 768;
    const edgePadding = 150;

    for (let i = 0; i < count; i++) {
      let radius = 18, collisionRadius = 18, speed = 0.75, health = 75 + (wave * 1.9), damage = 1, attackRange = 210, color = "#000000";
      const stalkerPreferredDistance = 160 + Math.random() * 130;
      const { x, y } = randomEdgeSpawn(canvasWidth, canvasHeight, edgePadding);

      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.health = health;
      enemy.damage = damage;
      enemy.attackCooldown = 0;
      enemy.attackRange = attackRange;
      enemy.color = color;
      enemy.type = "stalker";
      enemy.blinkCooldown = 0; // Ready to blink immediately on spawn
      enemy.blinkCastTimer = 0;
      enemy.blinkRecoverTimer = 0;
      enemy.burstsLeft = 0;
      enemy.burstTimer = 0;
      enemy.burstShotsLeft = 0;
      enemy.pendingBursts = 0;
      enemy.stalkerRoutineActive = false;
      enemy.stalkerInitialBurstDone = false;
      enemy.stalkerPreferredDistance = stalkerPreferredDistance;
      enemy.stalkerEdgePaddingX = edgePadding;
      enemy.stalkerEdgePaddingY = edgePadding;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnBeamerBurst(ctx, count) {
    const wave = ctx.getWave();
    const canvasWidth = (ctx && typeof ctx.getCanvasWidth === "function") ? ctx.getCanvasWidth() : 1024;
    const canvasHeight = (ctx && typeof ctx.getCanvasHeight === "function") ? ctx.getCanvasHeight() : 768;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const edgePaddingX = 72;
    const edgePaddingY = 120;

    for (let i = 0; i < count; i++) {
      let radius = 19, collisionRadius = 20, speed = 0.68, health = 52 + (wave * 2.2), damage = 1, attackRange = 420, color = "#4bc7ff";
      const beamerPreferredDistance = 190 + Math.random() * 140;

      let x = edgePaddingX + Math.random() * Math.max(1, canvasWidth - edgePaddingX * 2);
      let y = edgePaddingY + Math.random() * Math.max(1, canvasHeight - edgePaddingY * 2);
      const maxRingRadius = Math.min(canvasWidth * 0.5 - edgePaddingX, canvasHeight * 0.5 - edgePaddingY);
      const minRingRadius = Math.min(beamerPreferredDistance + 12, Math.max(20, maxRingRadius - 14));
      if (maxRingRadius > 16) {
        for (let attempt = 0; attempt < 12; attempt++) {
          const angle = Math.random() * Math.PI * 2;
          const ringRadius = minRingRadius + Math.random() * Math.max(1, maxRingRadius - minRingRadius);
          const candidateX = centerX + Math.cos(angle) * ringRadius;
          const candidateY = centerY + Math.sin(angle) * ringRadius;
          const clampedX = Math.max(edgePaddingX, Math.min(canvasWidth - edgePaddingX, candidateX));
          const clampedY = Math.max(edgePaddingY, Math.min(canvasHeight - edgePaddingY, candidateY));
          const distFromCenter = Math.hypot(clampedX - centerX, clampedY - centerY);
          if (distFromCenter >= beamerPreferredDistance) {
            x = clampedX;
            y = clampedY;
            break;
          }
        }
      }

      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.health = health;
      enemy.damage = damage;
      enemy.attackCooldown = 0;
      enemy.attackRange = attackRange;
      enemy.color = color;
      enemy.type = "beamer";
      enemy.beamerPreferredDistance = beamerPreferredDistance;
      enemy.beamerEdgePaddingX = edgePaddingX;
      enemy.beamerEdgePaddingY = edgePaddingY;
      enemy.beamCooldown = 110 + Math.floor(Math.random() * 70);
      enemy.beamCastTimer = 0;
      enemy.beamCastDuration = 0;
      enemy.beamActiveTimer = 0;
      enemy.beamDuration = 0;
      enemy.beamAngle = 0;
      enemy.beamLength = 460;
      enemy.beamTravelHead = 0;
      enemy.beamTravelTail = 0;
      enemy.beamTravelSpeed = 0;
      enemy.beamSegmentLength = Math.max(120, enemy.beamLength * 0.32);
      enemy.beamTickTimer = 0;
      enemy.beamGlow = 0;
      enemy.beamerAlpha = 0;
      enemy.beamerFacingAngle = 0;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnShielderBurst(ctx, count) {
    const wave = ctx.getWave();
    const canvasWidth = (ctx && typeof ctx.getCanvasWidth === "function") ? ctx.getCanvasWidth() : 1024;
    const canvasHeight = (ctx && typeof ctx.getCanvasHeight === "function") ? ctx.getCanvasHeight() : 768;
    const edgePaddingX = 72;
    const edgePaddingY = 120;

    for (let i = 0; i < count; i++) {
      let radius = 26, collisionRadius = 17, speed = 0.64, health = 60 + (wave * 1.8), damage = 0, attackRange = 0, color = "#78ffd6";
      const shielderPreferredDistance = 170 + Math.random() * 120;
      const { x, y } = randomEdgeSpawn(canvasWidth, canvasHeight);

      const enemy = ctx.spawnEnemy();
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.collisionRadius = collisionRadius;
      enemy.speed = speed;
      enemy.health = health;
      enemy.damage = damage;
      enemy.attackCooldown = 0;
      enemy.attackRange = attackRange;
      enemy.color = color;
      enemy.type = "shielder";
      enemy.shielderPreferredDistance = shielderPreferredDistance;
      enemy.shielderEdgePaddingX = edgePaddingX;
      enemy.shielderEdgePaddingY = edgePaddingY;
      enemy.shieldRange = 230;
      enemy.shieldMaxLinks = 2;
      enemy.shieldReductionAmount = 0.75;
      enemy.shieldPersistDuration = 180;
      enemy.shielderAlpha = 0;
      ctx.applyWaveEnemyModifiers(enemy);
    }
  }

  function spawnStalkerBoss(ctx) {
    const wave = ctx.getWave();
    const canvasWidth = (ctx && typeof ctx.getCanvasWidth === "function") ? ctx.getCanvasWidth() : 1024;
    const canvasHeight = (ctx && typeof ctx.getCanvasHeight === "function") ? ctx.getCanvasHeight() : 768;
    const enemy = ctx.spawnEnemy();
    enemy.x = canvasWidth / 2;
    enemy.y = canvasHeight / 2;
    enemy.radius = 32;
    enemy.collisionRadius = 32;
    enemy.speed = 0.72;
    enemy.health = 6600 + (wave * 42);
    enemy.damage = .5;
    enemy.attackCooldown = 0;
    enemy.attackRange = 280;
    enemy.color = "#1a1a1a";
    enemy.type = "stalkerBoss";
    // Blink/Teleport properties
    enemy.blinkCooldown = 180;
    enemy.blinkCastTimer = 0;
    enemy.blinkRecoverTimer = 0;
    enemy.burstsLeft = 0;
    enemy.burstTimer = 0;
    enemy.burstShotsLeft = 0;
    enemy.pendingBursts = 0;
    enemy.stalkerRoutineActive = false;
    enemy.stalkerInitialBurstDone = false;
    enemy.stalkerPreferredDistance = 120 + Math.random() * 150;
    enemy.stalkerEdgePaddingX = 150;
    enemy.stalkerEdgePaddingY = 150;
    enemy.stalkerBossEntering = false;
    enemy.stalkerBossEntryStage = "padding";
    enemy.stalkerBossEdgePaddingX = 120;
    enemy.stalkerBossEdgePaddingY = 160;
    enemy.stalkerBossNormalSpeed = enemy.speed;
    enemy.stalkerBossEntrySpeed = enemy.speed * 2.1;
    enemy.stalkerBurstInterval = 120;
    enemy.stalkerBurstCooldown = 18 + Math.floor(Math.random() * 22);
    enemy.castFxCooldown = 0;
    enemy.stalkerAlpha = 0;
    enemy.spawnFadeTimer = 0;
    enemy.spawnFadeDuration = 120;
    enemy.currentBlinkZone = 5;
    enemy.isCooldownBurst = false;
    enemy.maxHealth = enemy.health;
    ctx.applyWaveEnemyModifiers(enemy);
    enemy.stalkerBossNormalSpeed = enemy.speed;
    enemy.stalkerBossEntrySpeed = enemy.speed * 2.1;
    enemy.maxHealth = enemy.health;
  }

  function spawnBossMinorBurst(ctx, count) {
    for (let i = 0; i < count; i++) {
      spawnGruntBossMinor(ctx);
    }
  }

  function spawnBossBurst(ctx, count) {
    for (let i = 0; i < count; i++) {
      spawnGruntBoss(ctx);
    }
  }

  function spawnSlingerBossBurst(ctx, count) {
    for (let i = 0; i < count; i++) {
      spawnSlingerBoss(ctx);
    }
  }

  function spawnBruteBossBurst(ctx, count) {
    for (let i = 0; i < count; i++) {
      spawnBruteBoss(ctx);
    }
  }

  function spawnStalkerBossBurst(ctx, count) {
    for (let i = 0; i < count; i++) {
      spawnStalkerBoss(ctx);
    }
  }

  function spawnWave(ctx) {
    if (!ctx) return;

    const newWave = ctx.getWave();
    console.log(`[SpawnWave] Initializing wave ${newWave}`);

    // CRITICAL: Clear timeline state when starting new wave to prevent old timeline from bleeding through
    if (window._timelineWaveState && window._timelineWaveState.wave !== newWave) {
      console.log(`[SpawnWave] Clearing old timeline state from wave ${window._timelineWaveState.wave}`);
      window._timelineWaveState = null;
    }
    
    // Clear completion marker for previous wave so it can be reloaded if needed
    if (window._timelineCompletedWaves && window._timelineCompletedWaves[newWave - 1]) {
      delete window._timelineCompletedWaves[newWave - 1];
    }

    // Always reset burstIndex and burstTimer for new wave, but NOT burstCount
    if (window._sentinelWaveState) {
      window._sentinelWaveState.burstIndex = 0;
      window._sentinelWaveState.burstTimer = 0;
    }
    ctx.resetBurstProgress();
    window._forceBurstExhausted = false;

    const wave = ctx.getWave();
    ctx.setWaveAnnouncementTimer();

    // If editor override is present and explicitly in preview mode, use it, otherwise always clear it for play mode
    if (window._editorPreviewOverride && window._editorSessionActive) {
      window._bossMinorCount = 0;
      return;
    }

    window._editorPreviewOverride = null;
    window._editorPreviewWave = null;
    window._customBursts = null;
    window._customBrutes = null;
    window._customSlingers = null;
    window._customShielders = null;
    window._customBeamers = null;
    window._customKamikazes = null;
    window._customStalkers = null;
    window._customBossMinors = null;
    window._customBosses = null;
    window._customSlingerBosses = null;
    window._customBruteBosses = null;
    window._customStalkerBosses = null;
    window._customMobBurstIntervals = null;
    window._bossMinorBursts = null;
    window._mobBurstElapsed = null;
    window._mobBurstElapsedWave = null;

    if (wave !== 10) {
      window._wave10MinorsSpawned = false;
    }

    if (wave === 1) {
      ctx.setBurstCount(5);
      ctx.setBurstInterval(330);
      window._customBursts = [1, 2, 3, 4, 5];
      window._customBrutes = null;
    } else if (wave === 2) {
      ctx.setBurstCount(5);
      ctx.setBurstInterval(240);
      window._customBursts = Array.from({ length: 5 }, () => 2 + Math.floor(Math.random() * 3));
      window._customBrutes = null;
    } else if (wave === 3) {
      ctx.setBurstCount(5);
      ctx.setBurstInterval(240);
      window._customBursts = Array.from({ length: 5 }, () => 3 + Math.floor(Math.random() * 3));
      window._customBrutes = null;
    } else if (wave === 4) {
      ctx.setBurstCount(5);
      ctx.setBurstInterval(240);
      window._customBursts = [3, 3, 4, 4, 5, 7].slice(0, 5);
      window._customBrutes = null;
    } else if (wave === 5) {
      ctx.setBurstCount(Infinity);
      ctx.setBurstInterval(400);
      window._customBursts = null;
      window._customBrutes = null;
      spawnGruntBoss(ctx);
    } else if (wave === 6) {
      ctx.setBurstCount(6);
      ctx.setBurstInterval(150);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = [1, 0, 0, 1, 0, 1];
    } else if (wave === 7) {
      ctx.setBurstCount(7);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = [2, 0, 0, 2, 0, 3, 0];
    } else if (wave === 8) {
      ctx.setBurstCount(7);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = [3, 0, 0, 2, 0, 3, 0];
      spawnGruntBossMinor(ctx);
    } else if (wave === 9) {
      ctx.setBurstCount(8);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = [2, 1, 1, 1, 2, 1, 1, 2];
      spawnGruntBossMinor(ctx);
      setTimeout(() => spawnGruntBossMinor(ctx), 10000);
    } else if (wave === 10) {
      ctx.setBurstCount(Infinity);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = null;
      window._customShielders = null;
      window._customBeamers = null;
      window._customKamikazes = null;
      window._customStalkers = null;
      window._customBossMinors = null;
      window._customBosses = null;
      window._customSlingerBosses = null;
      window._customBruteBosses = null;
      window._customStalkerBosses = null;
      spawnSlingerBoss(ctx);
    } else if (wave === 11) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(250);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = null;
      window._customKamikazes = [1, 1, 2, 2, 3, 3, 1, 2, 3, 4, 4, 2, 3, 4, 5];
    } else if (wave === 12) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      window._customBrutes = null;
      window._customSlingers = [0, 2, 0, 1, 0, 0, 2, 0, 1, 0, 0, 2, 0, 2, 0];
      window._customKamikazes = [0, 0, 0, 1, 0, 2, 0, 1, 0, 1, 0, 2, 0, 1, 2];
      window._customBossMinors = [2, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0];
    } else if (wave === 13) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      window._customBursts = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      window._customBrutes = null;
      window._customSlingers = [0, 2, 0, 1, 0, 0, 2, 0, 1, 0, 0, 2, 0, 2, 0];
      window._customKamikazes = [3,3,3,3,2,1,0,1,0,1,0,3,3,3,3];
      window._customBossMinors = [2, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0];
    } else if (wave === 14) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      ctx.setBurstCount(30);
      ctx.setBurstInterval(120);
      window._customBursts = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
      window._customBrutes = null;
      window._customSlingers = [0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0];
      window._customKamikazes = [0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1];
      window._customBossMinors = [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0];
    } else if (wave === 15) {
      ctx.setBurstCount(15);
      ctx.setBurstInterval(300);
      ctx.setBurstCount(30);
      ctx.setBurstInterval(120);
      window._customBursts = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
      window._customBrutes = null;
      window._customSlingers = [0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0];
      window._customKamikazes = [0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1];
      window._customBossMinors = [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0];
    } else if (wave === 20) {
      ctx.setBurstCount(Infinity);
      ctx.setBurstInterval(300);
      window._customBursts = null;
      window._customBrutes = null;
      window._customSlingers = null;
      window._customShielders = null;
      window._customBeamers = null;
      window._customKamikazes = null;
      window._customStalkers = null;
      window._customBossMinors = null;
      window._customBosses = null;
      window._customSlingerBosses = null;
      window._customBruteBosses = null;
      window._customStalkerBosses = null;
      spawnBruteBoss(ctx);
    } else if (wave >= 16) {
      configureCodeWave(ctx, wave);
    } else {
      ctx.setBurstCount(0);
      ctx.setBurstInterval(300);
      window._customBrutes = null;
    }

    if ((wave === 1 || wave === 2 || wave === 3 || wave === 4) && !Array.isArray(window._customBursts)) {
      window._customBursts = [2, 3, 4, 5];
    }

    ctx.resetBurstProgress();
    window._bossMinorCount = 0;
  }

  function handleTimelineWaveSpawning(ctx, delta, timeline) {
    const wave = ctx.getWave();
    if (!timeline || !timeline.mobs) return false;

    const SPEED_MULTIPLIER = ctx.getSpeedMultiplier();
    
    // Track which wave just completed to prevent reinit loops
    if (!window._timelineCompletedWaves) {
      window._timelineCompletedWaves = {};
    }
    
    // If this wave already completed, don't process timeline anymore
    if (window._timelineCompletedWaves[wave]) {
      console.log(`[Timeline] Wave ${wave} already completed, skipping processing`);
      return false;  // Signal no new action, let main loop handle advancement
    }
    
    // CRITICAL: Only initialize state if wave actually changed OR state doesn't exist yet
    const waveChanged = !window._timelineWaveState || window._timelineWaveState.wave !== wave;
    if (waveChanged && (!window._timelineWaveState || window._timelineWaveState.wave < wave)) {
      // Only reinit if transitioning to a NEW/higher wave, not if state was just cleared for same wave
      if (window._timelineWaveState) {
        console.log(`[Timeline] Wave transition detected: ${window._timelineWaveState.wave} -> ${wave}. Reinitializing timeline state.`);
      }
      window._timelineWaveState = {
        wave,
        elapsedTime: 0,
        spawnedEventKeys: new Set()  // Track spawned events by mobType_index key
      };
      console.log(`[Timeline] Initialized wave ${wave}, duration: ${timeline.duration}s, ending: ${timeline.endCondition}`, timeline.mobs);
    } else if (!window._timelineWaveState) {
      // State was cleared but we're still on same wave - this wave is done
      console.log(`[Timeline] Timeline state cleared for wave ${wave} but still on same wave - wave complete`);
      window._timelineCompletedWaves[wave] = true;
      return false;
    }

    const state = window._timelineWaveState;
    state.elapsedTime += (delta * SPEED_MULTIPLIER) / 100;
    
    // DEBUG: Log elapsed time progression every 1 second
    if (Math.floor(state.elapsedTime) !== Math.floor(state.elapsedTime - (delta * SPEED_MULTIPLIER) / 100) || state.elapsedTime < 0.05) {
      console.log(`[Timeline] Elapsed: ${state.elapsedTime.toFixed(2)}s (delta: ${((delta * SPEED_MULTIPLIER) / 100).toFixed(4)}s, speedMult: ${SPEED_MULTIPLIER})`);
    }

    // Spawn functions mapping
    const spawnFunctions = {
      grunts: spawnBurst,
      brutes: spawnBruteBurst,
      slingers: spawnSlingerBurst,
      shielders: spawnShielderBurst,
      beamers: spawnBeamerBurst,
      kamikazes: spawnKamikazeBurst,
      stalkers: spawnStalkerBurst,
      gruntbossminor: spawnBossMinorBurst,
      gruntboss: spawnBossBurst,
      slingerboss: spawnSlingerBossBurst,
      bruteboss: spawnBruteBossBurst,
      stalkerBoss: spawnStalkerBossBurst
    };

    // Process spawn events for each mob type
    let anyEventRemaining = false;
    let anyEventSpawned = false;

    // Don't process any more events if duration has expired
    if (state.elapsedTime >= timeline.duration) {
      console.log(`[Timeline] Wave ${wave} duration expired at ${state.elapsedTime.toFixed(2)}s (duration: ${timeline.duration}s). Marking as complete.`);
      // Mark this wave as completed so we don't reinitialize it
      window._timelineCompletedWaves[wave] = true;
      // Return true to signal wave should end
      window._timelineWaveState = null;
      return true;
    }

    if (timeline.mobs) {
      for (const [mobType, events] of Object.entries(timeline.mobs)) {
        if (!Array.isArray(events) || events.length === 0) continue;

        const spawnFn = spawnFunctions[mobType];
        if (!spawnFn) continue;

        for (let i = 0; i < events.length; i++) {
          const evt = events[i];
          if (!evt || typeof evt.time !== "number" || typeof evt.amount !== "number") continue;

          const eventKey = `${mobType}_${i}`;
          const hasSpawned = state.spawnedEventKeys.has(eventKey);
          const timeReached = state.elapsedTime >= evt.time;

          // Spawn when time reached and not yet spawned
          if (timeReached && !hasSpawned) {
            console.log(`[Timeline] SPAWN: ${mobType} x${evt.amount} at time ${evt.time}s (elapsed: ${state.elapsedTime.toFixed(2)}s)`);
            spawnFn(ctx, evt.amount);
            state.spawnedEventKeys.add(eventKey);
            anyEventSpawned = true;
          }

          // Track if there are pending events
          if (!hasSpawned && state.elapsedTime < timeline.duration) {
            anyEventRemaining = true;
          }
        }
      }
    }

    // Wave complete based on endCondition setting
    const endCondition = timeline.endCondition || 'duration';
    let waveComplete = false;

    if (endCondition === 'duration') {
      // Wave ends when duration expires (original behavior)
      if (!anyEventRemaining && state.elapsedTime >= timeline.duration) {
        waveComplete = true;
      }
    } else if (endCondition === 'allEliminated') {
      // Wave ends when all spawned enemies are eliminated
      const enemies = ctx.getEnemies();
      waveComplete = enemies.length === 0;
      
      // Only check wave duration if this is the first time we're declaring it complete
      // (Give it at least 0.5s minimum to ensure events had a chance to spawn)
      if (waveComplete && state.elapsedTime < timeline.duration * 0.5) {
        waveComplete = false;
      }
    }

    if (waveComplete) {
      console.log(`[Timeline] Wave ${wave} complete (condition: ${endCondition}) at ${state.elapsedTime.toFixed(2)}s`);
      // Mark this wave as completed so we don't reinitialize it
      window._timelineCompletedWaves[wave] = true;
      window._timelineWaveState = null;
      return true;  // Signal wave is complete
    }

    return false;  // Wave still in progress
  }

  function handleWaveSpawning(ctx, delta) {
    if (!ctx) return;

    let wave = ctx.getWave();
    console.log(`[WaveSpawning] Frame check - wave: ${wave}, burstCount: ${ctx.getBurstCount()}, burstIndex: ${ctx.getBurstIndex()}`);
    
    // Check if this wave has timeline data
    // Priority: _editorWaveOverride (editor session) > waveEditorOverrides (from localStorage)
    // IMPORTANT: Waves 1-15 should NEVER use timeline overrides - only code waves (16+) can be timeline-based
    let override = null;
    if (wave >= 16) {
      override = (window._editorWaveOverride && window._editorWaveOverride[wave]) 
                 || (window.waveEditorOverrides && window.waveEditorOverrides[wave]);
    }
    
    // If no override exists but there IS a code wave for this wave, try to auto-convert it
    // IMPORTANT: Only do this for code waves (wave 16+), never for normal waves (1-15)
    if (!override && wave >= 16 && window.SentinelEditor && typeof window.SentinelEditor.getWaveConfigFromCode === "function" && window.SentinelWaveEditorCodes && window.SentinelWaveEditorCodes[wave]) {
      try {
        const code = window.SentinelWaveEditorCodes[wave];
        
        // First check if the code is already a timeline-based code (contains timeline mode flag)
        // Try to decode it to see if it's already timelineMode
        if (window.SentinelEditor && typeof window.SentinelEditor.decodeWaveCode === "function") {
          try {
            const decoded = window.SentinelEditor.decodeWaveCode(code);
            const waveCfg = decoded[wave];
            if (waveCfg && waveCfg.timelineMode && waveCfg.timeline) {
              console.log(`[Timeline] Code wave ${wave} is already timeline-based. Loading directly.`);
              window._editorWaveOverride = window._editorWaveOverride || {};
              window._editorWaveOverride[wave] = {
                timelineMode: true,
                timeline: waveCfg.timeline,
                _source: 'defaultCodeWave'
              };
              override = window._editorWaveOverride[wave];
              // Don't return - let it fall through to timeline processing below
            }
          } catch (decodeErr) {
            // If decode fails, try the burst config approach
            console.log(`[Timeline] First decode attempt failed for wave ${wave}, trying burst approach`);
          }
        }
        
        // If not timeline mode, try to get burst config
        const config = window.SentinelEditor.getWaveConfigFromCode(code, wave);
        
        if (config) {
          console.log(`[Timeline] Auto-converting code wave ${wave} to timeline format...`);
          
          // Convert code wave to timeline
          const burstIntervalSeconds = config.burstIntervalSeconds || (config.burstInterval ? config.burstInterval / 100 : 0.3);
          const burstCount = config.burstCount || 30;
          const duration = (burstCount * burstIntervalSeconds) + 2;
          
          const timeline = {
            duration,
            endCondition: 'duration',
            mobs: {
              grunts: [],
              brutes: [],
              slingers: [],
              shielders: [],
              beamers: [],
              kamikazes: [],
              stalkers: [],
              gruntbossminor: [],
              gruntboss: [],
              slingerboss: [],
              bruteboss: []
            }
          };
          
          // Map config to timeline events
          const mobMapping = {
            customBursts: 'grunts',
            customBrutes: 'brutes',
            customSlingers: 'slingers',
            customShielders: 'shielders',
            customBeamers: 'beamers',
            customKamikazes: 'kamikazes',
            customStalkers: 'stalkers',
            customBossMinors: 'gruntbossminor',
            customBosses: 'gruntboss',
            customSlingerBosses: 'slingerboss',
            customBruteBosses: 'bruteboss'
          };
          
          for (const [configKey, mobType] of Object.entries(mobMapping)) {
            const burstArray = config[configKey];
            if (Array.isArray(burstArray)) {
              for (let idx = 0; idx < burstArray.length; idx++) {
                const amount = burstArray[idx];
                if (amount > 0) {
                  const time = Math.round((idx * burstIntervalSeconds) * 100) / 100;  // Snap to nearest 1ms
                  timeline.mobs[mobType].push({ time, amount, mode: 'event' });
                }
              }
            }
          }
          
          // Create override for this wave
          window._editorWaveOverride = window._editorWaveOverride || {};
          window._editorWaveOverride[wave] = {
            timelineMode: true,
            timeline
          };
          override = window._editorWaveOverride[wave];
          console.log(`[Timeline] Wave ${wave} auto-converted. Timeline:`, timeline);
        }
      } catch (err) {
        console.error(`[Timeline] Failed to auto-convert code wave ${wave}:`, err);
      }
    }
    
    if (override && override.timelineMode && override.timeline) {
      // CRITICAL: Verify the override is actually for the current wave
      const timelineWave = window._timelineWaveState ? window._timelineWaveState.wave : null;
      if (timelineWave !== null && timelineWave !== wave) {
        console.error(`[Timeline] MISMATCH DETECTED: handleWaveSpawning using wave ${wave} but timeline state is for wave ${timelineWave}. Clearing old state.`);
        window._timelineWaveState = null;
      }
      
      console.log(`[Timeline] Using timeline override for wave ${wave}, duration: ${override.timeline.duration}s, source: ${override._source || 'unknown'}`);
      const isComplete = handleTimelineWaveSpawning(ctx, delta, override.timeline);
      if (isComplete) {
        // Timeline wave complete - trigger next wave
        console.log(`[Timeline] Signaling wave ${wave} complete to main game loop`);
        ctx.setBurstIndex(ctx.getBurstCount());
      }
      return;
    }
    
    // Debug: Log when no timeline override found
    if (!override) {
      const hasEditorOverride = !!(window._editorWaveOverride && window._editorWaveOverride[wave]);
      const hasStoredOverride = !!(window.waveEditorOverrides && window.waveEditorOverrides[wave]);
      if (wave <= 21) {  // Only log for first 21 waves to avoid spam
        console.log(`[Timeline] No override for wave ${wave} (editorOverride: ${hasEditorOverride}, stored: ${hasStoredOverride}). Using default wave logic.`);
      }
    } else if (!override.timelineMode) {
      console.log(`[Timeline] Override found for wave ${wave} but not in timeline mode. Using default wave logic.`);
    }

    let burstCount = ctx.getBurstCount();
    const burstInterval = ctx.getBurstInterval();
    let burstIndex = ctx.getBurstIndex();

    let burstTimer = ctx.getBurstTimer();
    const enemies = ctx.getEnemies();
    const SPEED_MULTIPLIER = ctx.getSpeedMultiplier();
    const elapsedState = ensureMobElapsedState(wave);
    const elapsedDelta = delta * SPEED_MULTIPLIER;
    for (const key of MOB_INTERVAL_KEYS) {
      elapsedState[key] += elapsedDelta;
    }

    const commit = () => {
      ctx.setBurstCount(burstCount);
      if (!window._forceBurstExhausted) {
        ctx.setBurstIndex(burstIndex);
      }
      ctx.setBurstTimer(burstTimer);
    };

    const getBurstValue = (list, index) => {
      if (!Array.isArray(list) || list.length === 0) return 0;
      if (index < list.length) return list[index] || 0;
      return 0;
    };

    // Helper to calculate number of bursts for a mob type
    function calculateMobBurstCount(waveBurstInterval, waveBurstCount, mobBurstInterval) {
      if (mobBurstInterval === 0) return waveBurstCount;
      if (mobBurstInterval > 0) return Math.floor((waveBurstInterval * waveBurstCount) / mobBurstInterval);
      return waveBurstCount;
    }

    const previewOverride = (window._editorPreviewOverride && window._editorPreviewWave === wave)
      ? window._editorPreviewOverride
      : null;

    if (previewOverride) {
      // For each mob, maintain its own timer and index
      if (!window._mobPreviewTimers) window._mobPreviewTimers = {};
      const mobTypes = [
        ["grunts", "customBursts", spawnBurst],
        ["brutes", "customBrutes", spawnBruteBurst],
        ["slingers", "customSlingers", spawnSlingerBurst],
        ["shielders", "customShielders", spawnShielderBurst],
        ["beamers", "customBeamers", spawnBeamerBurst],
        ["kamikazes", "customKamikazes", spawnKamikazeBurst],
        ["stalkers", "customStalkers", spawnStalkerBurst],
        ["gruntbossminor", "customBossMinors", spawnBossMinorBurst],
        ["gruntboss", "customBosses", spawnBossBurst],
        ["slingerboss", "customSlingerBosses", spawnSlingerBossBurst],
        ["bruteboss", "customBruteBosses", spawnBruteBossBurst]
      ];
      let allDone = true;
      for (const [mobKey, burstField, spawnFn] of mobTypes) {
        if (!window._mobPreviewTimers[mobKey]) window._mobPreviewTimers[mobKey] = {timer: 0, index: 0};
        const mobTimer = window._mobPreviewTimers[mobKey];
        const burstList = previewOverride[burstField];
        const mobInterval = getMobIntervalFor(mobKey, burstInterval, burstCount);
        mobTimer.timer += delta * SPEED_MULTIPLIER;
        while (mobTimer.index < burstList.length) {
          const count = burstList[mobTimer.index];
          if (mobTimer.timer >= mobInterval) {
            mobTimer.timer -= mobInterval;
            if (count > 0) {
              spawnFn(ctx, count);
            }
            mobTimer.index++;
          } else {
            break;
          }
        }
        if (mobTimer.index < burstList.length && burstList[mobTimer.index] !== 0) allDone = false;
      }
      if (allDone) {
        window._editorPreviewOverride = null;
        window._editorPreviewWave = null;
        window._mobPreviewTimers = null;
      }
      commit();
      return;
    }

    // Check if all coma code arrays are exhausted (all relevant arrays are empty, or burstIndex is at or past their end, or ends with 0)
    const comaArrays = [
      window._customBursts, window._customBrutes, window._customSlingers, window._customShielders,
      window._customBeamers, window._customKamikazes, window._customStalkers, window._customBossMinors,
      window._customBosses, window._customSlingerBosses, window._customBruteBosses
    ];
    let allExhausted = true;
    for (const arr of comaArrays) {
      if (Array.isArray(arr) && arr.length > 0) {
        // Only end when burstIndex reaches the end of the array
        if (burstIndex < arr.length) {
          allExhausted = false;
          break;
        }
      }
    }
    // Patch: Always set burstIndex to burstCount if all bursts are exhausted (for normal waves)
    if (allExhausted && burstCount !== Infinity) {
      if (window.debugWaveTransition) {
        console.log('[WaveTransition] All bursts exhausted. Forcing burstIndex to burstCount:', burstCount);
      }
      // Force burstIndex to burstCount in all places
      if (window._sentinelWaveState) {
        window._sentinelWaveState.burstIndex = burstCount;
        window._sentinelWaveState.burstCount = burstCount;
      }
      ctx.setBurstIndex(burstCount);
      window._forceBurstExhausted = true;
      commit();
      return;
    } else if (!allExhausted && window.debugWaveTransition) {
      // Print which mob burst is blocking transition
      comaArrays.forEach((arr, idx) => {
        if (Array.isArray(arr) && arr.length > 0) {
          let endIdx = arr.indexOf(0);
          if (endIdx === -1) endIdx = arr.length;
          if (burstIndex < endIdx) {
            const mobNames = [
              'grunts','brutes','slingers','shielders','beamers','kamikazes','stalkers',
              'bossMinors','bosses','slingerBosses','bruteBosses']
            console.log(`[WaveTransition] Mob type '${mobNames[idx]}' not exhausted: burstIndex=${burstIndex}, endIdx=${endIdx}, arr=`, arr);
          }
        }
      });
    }

    if ((wave >= 1 && wave <= 4 && burstIndex < burstCount) || (wave === 5) || (wave >= 6 && wave <= 9 && burstIndex < burstCount) || (wave >= 11 && burstIndex < burstCount)) {
      burstTimer += delta * SPEED_MULTIPLIER;
      if (burstTimer >= burstInterval) {
        burstTimer = 0;
        let grunts = 0;
        let brutes = 0;
        let slingers = 0;
        if (wave === 1 || wave === 2 || wave === 3 || wave === 4) {
          grunts = getBurstValue(window._customBursts, burstIndex);
        } else if (wave === 5) {
          grunts = 1 + Math.floor(Math.random() * 2);
        } else if (wave >= 6 && wave <= 9) {
          grunts = 2 + Math.floor(Math.random() * 3);
          slingers = getBurstValue(window._customSlingers, burstIndex);
          brutes = getBurstValue(window._customBrutes, burstIndex);
        }
        if (window.sentinelDifficulty === "Apocalypse" && !(wave >= 11)) {
          spawnKamikazeBurst(ctx, 1);
        }
        if (slingers > 0 && canSpawnByMobInterval(elapsedState, "slingers", getMobIntervalFor("slingers", burstInterval))) spawnSlingerBurst(ctx, slingers);
        if (brutes > 0 && canSpawnByMobInterval(elapsedState, "brutes", getMobIntervalFor("brutes", burstInterval))) spawnBruteBurst(ctx, brutes);
        if (wave === 11) {
          const wave11KamikazeCount = getBurstValue(window._customKamikazes, burstIndex);
          if (wave11KamikazeCount > 0 && canSpawnByMobInterval(elapsedState, "kamikazes", getMobIntervalFor("kamikazes", burstInterval))) spawnKamikazeBurst(ctx, wave11KamikazeCount);
        }
        if (wave >= 12) {
          grunts = getBurstValue(window._customBursts, burstIndex);
          const waveSlingerCount = getBurstValue(window._customSlingers, burstIndex);
          const waveShielderCount = getBurstValue(window._customShielders, burstIndex);
          const waveBeamerCount = getBurstValue(window._customBeamers, burstIndex);
          const waveBruteCount = getBurstValue(window._customBrutes, burstIndex);
          const waveKamikazeCount = getBurstValue(window._customKamikazes, burstIndex);
          const waveStalkerCount = getBurstValue(window._customStalkers, burstIndex);
          if (waveSlingerCount > 0 && canSpawnByMobInterval(elapsedState, "slingers", getMobIntervalFor("slingers", burstInterval))) spawnSlingerBurst(ctx, waveSlingerCount);
          if (waveShielderCount > 0 && canSpawnByMobInterval(elapsedState, "shielders", getMobIntervalFor("shielders", burstInterval))) spawnShielderBurst(ctx, waveShielderCount);
          if (waveBeamerCount > 0 && canSpawnByMobInterval(elapsedState, "beamers", getMobIntervalFor("beamers", burstInterval))) spawnBeamerBurst(ctx, waveBeamerCount);
          if (waveBruteCount > 0 && canSpawnByMobInterval(elapsedState, "brutes", getMobIntervalFor("brutes", burstInterval))) spawnBruteBurst(ctx, waveBruteCount);
          if (waveKamikazeCount > 0 && canSpawnByMobInterval(elapsedState, "kamikazes", getMobIntervalFor("kamikazes", burstInterval))) spawnKamikazeBurst(ctx, waveKamikazeCount);
          if (waveStalkerCount > 0 && canSpawnByMobInterval(elapsedState, "stalkers", getMobIntervalFor("stalkers", burstInterval))) spawnStalkerBurst(ctx, waveStalkerCount);
        }
        const bossMinorCount = getBurstValue(window._customBossMinors, burstIndex);
        if (bossMinorCount > 0 && canSpawnByMobInterval(elapsedState, "gruntbossminor", getMobIntervalFor("gruntbossminor", burstInterval))) {
          for (let i = 0; i < bossMinorCount; i++) {
            spawnGruntBossMinor(ctx);
          }
        }
        const bossCount = getBurstValue(window._customBosses, burstIndex);
        if (bossCount > 0 && canSpawnByMobInterval(elapsedState, "gruntboss", getMobIntervalFor("gruntboss", burstInterval))) {
          for (let i = 0; i < bossCount; i++) {
            spawnGruntBoss(ctx);
          }
        }
        const slingerBossCount = getBurstValue(window._customSlingerBosses, burstIndex);
        if (slingerBossCount > 0 && canSpawnByMobInterval(elapsedState, "slingerboss", getMobIntervalFor("slingerboss", burstInterval))) {
          for (let i = 0; i < slingerBossCount; i++) {
            spawnSlingerBoss(ctx);
          }
        }
        const bruteBossCount = getBurstValue(window._customBruteBosses, burstIndex);
        if (bruteBossCount > 0 && canSpawnByMobInterval(elapsedState, "bruteboss", getMobIntervalFor("bruteboss", burstInterval))) {
          for (let i = 0; i < bruteBossCount; i++) {
            spawnBruteBoss(ctx);
          }
        }
        const stalkerBossCount = getBurstValue(window._customStalkerBosses, burstIndex);
        if (stalkerBossCount > 0 && canSpawnByMobInterval(elapsedState, "stalkerBoss", getMobIntervalFor("stalkerBoss", burstInterval))) {
          for (let i = 0; i < stalkerBossCount; i++) {
            spawnStalkerBoss(ctx);
          }
        }
        if (grunts > 0 && canSpawnByMobInterval(elapsedState, "grunts", getMobIntervalFor("grunts", burstInterval))) spawnBurst(ctx, grunts);
        burstIndex++;
      }
    }

    commit();
  }

  return {
    spawnWave,
    handleWaveSpawning,
    setMobBurstIntervals: (intervals) => {
      window._customMobBurstIntervals = normalizeMobIntervals(intervals);
      return !!window._customMobBurstIntervals;
    },
    clearMobBurstIntervals: () => {
      window._customMobBurstIntervals = null;
      window._mobBurstElapsed = null;
      window._mobBurstElapsedWave = null;
    },
    setTimelineWaveData: (waveNum, timelineData) => {
      if (!Number.isFinite(waveNum) || waveNum < 1) return false;
      if (!timelineData || typeof timelineData !== "object") return false;
      timelineWaveData[waveNum] = JSON.parse(JSON.stringify(timelineData));
      window._editorWaveOverride = window._editorWaveOverride || {};
      window._editorWaveOverride[waveNum] = {
        timelineMode: true,
        timeline: timelineWaveData[waveNum]
      };
      return true;
    },
    setWaveEditorCode: (waveNumber, code) => {
      const parsed = parseInt(waveNumber, 10);
      if (!Number.isFinite(parsed) || parsed < CODE_WAVE_MIN || parsed > CODE_WAVE_MAX) return false;
      if (code !== null && typeof code !== "string") return false;
      window.SentinelWaveEditorCodes[parsed] = (typeof code === "string" && code.trim().length > 0) ? code.trim() : null;
      return true;
    },
    getWaveEditorCodes: () => ({ ...window.SentinelWaveEditorCodes })
  };
})();
