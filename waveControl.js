// Global debug function to print wave state and burst arrays
window.printWaveDebug = function() {
};
window.SentinelWaveControl = (function () {
  const CODE_WAVE_MIN = 1;
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

  // Global per-wave health modifier curve.
  // 0 at wave 1, 20 at wave 30. Adjust these values directly in the JS file.
  const GLOBAL_MOB_HEALTH_PER_WAVE_MODIFIER_CURVE_TARGET = 50;
  const GLOBAL_MOB_HEALTH_PER_WAVE_MODIFIER_CURVE_MAX_WAVE = 100;

  // Enemy health balance settings. Modify these values to tune enemy durability.
  const ENEMY_HEALTH_SETTINGS = {
    gruntBoss: { base: 150, perWave: 50 },
    gruntBossMinor: { base: 120, perWave: 25 },
    grunt: { base: 5, perWave: 1 },
    kamikaze: { base: 20, perWave: 10 },
    slinger: { base: 10, perWave: 5 },
    slingerBoss: { base: 3000, perWave: 75 },
    brute: { base: 300, perWave: 50 },
    bruteBoss: { base: 5000, perWave: 75 },
    stalker: { base: 75, perWave: 5 },
    beamer: { base: 150, perWave: 30 },
    shielder: { base: 75, perWave: 25 },
    stalkerBoss: { base: 9000, perWave: 75 }
  };

  function getEnemyHealthForType(type, wave) {
    const settings = ENEMY_HEALTH_SETTINGS[type];
    if (!settings) {
      return getEnemyHealthWithGlobalWaveModifier(100, 2, wave);
    }
    return getEnemyHealthWithGlobalWaveModifier(settings.base, settings.perWave, wave);
  }

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

  function getGlobalMobHealthPerWaveModifier(wave) {
    if (!Number.isFinite(wave) || wave <= 1) return 0;
    const maxWave = GLOBAL_MOB_HEALTH_PER_WAVE_MODIFIER_CURVE_MAX_WAVE;
    const target = GLOBAL_MOB_HEALTH_PER_WAVE_MODIFIER_CURVE_TARGET;
    if (wave >= maxWave) return target;
    const ratio = (wave - 1) / (maxWave - 1);
    return target * Math.pow(ratio, 1.5);
  }

  function getEnemyHealthWithGlobalWaveModifier(baseHealth, perWaveFactor, wave) {
    const modifier = getGlobalMobHealthPerWaveModifier(wave);
    return baseHealth + wave * (perWaveFactor + modifier);
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

  // Paste future editor code strings into these wave slots (1-50).
  const DEFAULT_WAVE_EDITOR_CODES = {
    1: "SWC3:eyJ2IjozLCJvIjp7IjEiOnsidCI6dHJ1ZSwibCI6eyJkIjo2LCJlIjoiZHVyYXRpb24iLCJtIjp7ImciOltbMS41LDJdLFszLDNdLFs0LjUsNF0sWzYsNV0sWzAsMV1dfX19fX0=",
    2: "SWC3:eyJ2IjozLCJvIjp7IjIiOnsidCI6dHJ1ZSwibCI6eyJkIjo4LCJlIjoiZHVyYXRpb24iLCJtIjp7ImciOltbMiwzXSxbNCwzXSxbNiwzXSxbOCwzXSxbMCwzXSxbMSwxXSxbMywxXSxbNSwxXSxbNywxXV19fX19fQ==",
    3: "SWC3:eyJ2IjozLCJvIjp7IjMiOnsidCI6dHJ1ZSwibCI6eyJkIjo4LCJlIjoiZHVyYXRpb24iLCJtIjp7ImciOltbMC41LDNdLFsxLDJdLFs0LjUsMV0sWzAsMV0sWzcuNSwyXSxbNSwyXSxbNS41LDJdLFsyLDFdLFsyLjUsMl0sWzMsMl0sWzYuNSwxXSxbNywyXSxbOCwyXSxbNCwxXV19fX19fQ==",
    4: "SWC3:eyJ2IjozLCJvIjp7IjQiOnsidCI6dHJ1ZSwibCI6eyJkIjoyMCwiZSI6ImR1cmF0aW9uIiwibSI6eyJnIjpbWzE1LDFdLFswLDFdLFsyLjUsMV0sWzcuNSwxXSxbMTIuNSwxXSxbMTcuNSwxXSxbMTgsMV0sWzAuNSwxXSxbMTYsMV0sWzE0LjUsMV0sWzQsMV0sWzIsMV0sWzEsMV0sWzExLjUsMV0sWzE4LjUsMV0sWzguNSwxXSxbNiwxXSxbMTMuNSwxXSxbNywxXSxbMywxXSxbMTAuNSwxXSxbMTYuNSwxXSxbNSwxXSxbOS41LDFdLFsxOS45OSwxXSxbMTkuNSwxXSxbNS41LDFdLFsxMiwxXSxbMTEsMV0sWzksMV1dfX19fX0=",
    5: "SWC3:eyJ2IjozLCJvIjp7IjUiOnsidCI6dHJ1ZSwibCI6eyJkIjoxMjAsImUiOiJib3NzIiwibSI6eyJnIjpbWzQsMl0sWzgsMl0sWzEyLDJdLFsxNiwzXSxbMjAsM10sWzI0LDNdLFsyOCwzXSxbMzIsM10sWzM2LDNdLFs0MCwzXSxbNDQsM10sWzQ4LDNdLFs1MiwzXSxbNTYsM10sWzYwLDNdLFs2NCw0XSxbNjgsNF0sWzcyLDRdLFs3Niw0XSxbODAsNV0sWzg0LDVdLFs4OCw2XSxbOTIsNl0sWzk2LDddLFsxMDAsN10sWzEwNCw4XSxbMTA4LDhdLFsxMTIsOV0sWzExNiw5XSxbMTIwLDldLFsxMjQsM10sWzEyOCwzXSxbMTMyLDNdLFsxMzYsM10sWzE0MCwzXSxbMTQ0LDNdLFsxNDgsM10sWzE1MiwzXSxbMTU2LDNdLFsxNjAsM10sWzE2NCwzXSxbMTY4LDNdLFsxNzIsM10sWzE3NiwzXSxbMTgwLDRdLFsxODQsNF0sWzE4OCw0XSxbMTkyLDRdLFsxOTYsNF0sWzIwMCw0XSxbMjA0LDRdLFsyMDgsNF0sWzIxMiw0XSxbMjE2LDRdLFsyMjAsNF0sWzIyNCw0XSxbMjI4LDRdLFsyMzIsNF0sWzIzNiw0XSxbMjQwLDVdLFsyNDQsNV0sWzI0OCw1XSxbMjUyLDVdLFsyNTYsNV0sWzI2MCw1XSxbMjY0LDVdLFsyNjgsNV0sWzI3Miw1XSxbMjc2LDVdLFsyODAsNV0sWzI4NCw1XSxbMjg4LDJdLFsyOTIsMl0sWzI5NiwyXSxbMzAwLDJdLFswLDJdLFsyODksMV0sWzI4OC41LDFdLFsyODcuNSw1XV0sImdiIjpbWzAsMV1dfX19fX0=",
    6: "SWC3:eyJ2IjozLCJvIjp7IjYiOnsidCI6dHJ1ZSwibCI6eyJkIjoyMCwiZSI6ImR1cmF0aW9uIiwibSI6eyJzIjpbWzMsMV0sWzYsMl0sWzEyLDNdLFsxOCwzXSxbMCwxXV19fX19fQ==",
    7: "SWC3:eyJ2IjozLCJvIjp7IjciOnsidCI6dHJ1ZSwibCI6eyJkIjoyMCwiZSI6ImR1cmF0aW9uIiwibSI6eyJnIjpbWzIsMV0sWzQsMV0sWzYsMV0sWzgsMV0sWzEwLDFdLFsxMiwxXSxbMTQsMV0sWzE2LDFdLFsxOCwxXSxbMjAsMV0sWzAsMV1dLCJzIjpbWzMsMV0sWzYsMl0sWzEyLDNdLFsxOCwzXSxbMCwxXV19fX19fQ==",
    8: "SWC3:eyJ2IjozLCJvIjp7IjgiOnsidCI6dHJ1ZSwibCI6eyJkIjoyMCwiZSI6ImR1cmF0aW9uIiwibSI6eyJnIjpbWzEsMV0sWzIsMV0sWzMsMV0sWzQsMV0sWzUsMV0sWzYsMV0sWzcsMV0sWzgsMV0sWzksMV0sWzEwLDFdLFsxMSwxXSxbMTIsMV0sWzEzLDFdLFsxNCwxXSxbMTUsMV0sWzE2LDFdLFsxNywxXSxbMTgsMV0sWzE5LDFdLFsyMCwxXSxbMCwxXV0sInMiOltbMywxXSxbNiwxXSxbMTIsMV0sWzE4LDFdLFswLDNdXX19fX19",
    9: "SWC3:eyJ2IjozLCJvIjp7IjkiOnsidCI6dHJ1ZSwibCI6eyJkIjoyMCwiZSI6ImFsbEVsaW1pbmF0ZWQiLCJtIjp7ImciOltbMiwxXSxbNiwyXSxbMTAsMl0sWzE0LDJdLFsxOCwyXSxbMCwxXSxbMC41LDFdLFsxLDFdLFsxLjUsMV0sWzQsMV0sWzgsMV0sWzEyLDFdLFsxNiwxXSxbMjAsMV1dLCJzIjpbWzMsMl0sWzYsMl0sWzEyLDFdLFsxOCwxXSxbMCwxXV0sImdibSI6W1swLDFdXX19fX19",
    10: "SWC3:eyJ2IjozLCJvIjp7IjEwIjp7InQiOnRydWUsImwiOnsiZCI6MTcsImUiOiJib3NzIiwibSI6eyJzYiI6W1swLDFdXX19fX19",
    11: "SWC3:eyJ2IjozLCJvIjp7IjExIjp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiayI6W1syLDFdLFs0LDFdLFs2LDJdLFs3LDJdLFs4LDJdLFsxMCwxXSxbMTEsMV0sWzEzLDFdLFsxNCwxXSxbMTcsMl0sWzE4LDJdLFswLDFdLFsxMC41LDJdLFsxMy41LDJdLFsxMiwyXSxbMTYsMl0sWzE5LDJdLFsyMCwyXV19fX19fQ==",
    12: "SWC3:eyJ2IjozLCJvIjp7IjEyIjp7InQiOnRydWUsImwiOnsiZCI6MjUsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1s5LDFdLFs5LjUsMV0sWzEwLjUsMV0sWzEwLDFdLFsxNC41LDFdLFsxNSwxXSxbMTUuNSwxXSxbMTYsMV0sWzE2LjUsMV0sWzguNSwxXV0sImsiOltbMSwxXSxbMiwxXSxbNy41LDFdLFsxMy41LDFdLFsxOSwxXSxbMjAsMV0sWzIyLDFdLFsyMywxXSxbMCwxXSxbOCwxXSxbNywxXSxbMTMsMV0sWzE0LDFdLFsxOS41LDFdLFsyMi41LDFdXX19fX19",
    13: "SWC3:eyJ2IjozLCJvIjp7IjEzIjp7InQiOnRydWUsImwiOnsiZCI6MjUsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1s5LDFdLFs5LjUsMV0sWzEwLjUsMV0sWzEwLDFdLFsxNC41LDFdLFsxNSwxXSxbMTUuNSwxXSxbMTYsMV0sWzE2LjUsMV0sWzguNSwxXV0sInMiOltbNy41LDFdLFsxMy41LDFdLFsxOS41LDFdLFswLDFdLFswLjUsMV0sWzgsMV0sWzE0LDFdLFsyMCwxXV0sImsiOltbMSwxXSxbMiwxXSxbNy41LDFdLFsxMy41LDFdLFsxOSwxXSxbMjAsMV0sWzIyLDFdLFsyMywxXSxbMCwxXSxbOCwxXSxbNywxXSxbMTMsMV0sWzE0LDFdLFsxOS41LDFdLFsyMi41LDFdXX19fX19",
    14: "SWC3:eyJ2IjozLCJvIjp7IjE0Ijp7InQiOnRydWUsImwiOnsiZCI6MjUsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1s5LDFdLFs5LjUsMV0sWzEwLjUsMV0sWzEwLDFdLFsxNC41LDFdLFsxNSwxXSxbMTUuNSwxXSxbMTYsMV0sWzE2LjUsMV0sWzguNSwxXSxbMCwxXSxbMSwyXSxbMiwyXSxbMywxXV0sImsiOltbMSwyXSxbMiwxXSxbNy41LDFdLFsxMy41LDFdLFsxOSwxXSxbMjAsMV0sWzIyLDFdLFsyMywxXSxbMCwxXSxbOCwxXSxbNywxXSxbMTMsMV0sWzE0LDFdLFsxOS41LDFdLFsyMi41LDFdLFszLDFdLFs0LDFdXSwiZ2JtIjpbWzAsMV0sWzcsMV0sWzEzLjUsMV1dfX19fX0=",
    15: "SWC3:eyJ2IjozLCJvIjp7IjE1Ijp7InQiOnRydWUsImwiOnsiZCI6MjEsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDNdLFszLDNdLFs2LDNdLFs5LDNdLFsxMiwzXSxbMTUsM10sWzE4LDNdXSwiYiI6W1swLDJdLFs2LDJdLFsxMiwyXSxbMTgsMl1dLCJzIjpbWzMsMV0sWzksMV0sWzE1LDFdXSwic2giOltbMiwxXSxbOCwxXSxbMTQsMV0sWzIwLDFdXSwiayI6W1s1LDFdLFsxMSwxXSxbMTcsMV1dfX19fX0=",
    16: "SWC3:eyJ2IjozLCJvIjp7IjE2Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDNdLFszLDNdLFs2LDNdLFs5LDNdLFsxMiwzXSxbMTUsM10sWzE4LDNdXSwiYiI6W1swLDJdLFsxMiwyXV0sInMiOltbMywxXSxbOSwxXSxbMTUsMV1dfX19fX0=",
    17: "SWC3:eyJ2IjozLCJvIjp7IjE3Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDNdLFszLDNdLFs2LDNdLFs5LDNdLFsxMiwzXSxbMTUsM10sWzE4LDNdXSwiYiI6W1swLDJdLFsxMiwyXV0sInMiOltbMywxXSxbOSwxXSxbMTUsMV1dLCJrIjpbWzIsMV0sWzMsMV0sWzgsMV0sWzksMV0sWzE0LjUsMV0sWzE1LjUsMV1dfX19fX0=",
    18: "SWC3:eyJ2IjozLCJvIjp7IjE4Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDNdLFszLDNdLFs2LDNdLFs5LDNdLFsxMiwzXSxbMTUsM10sWzE4LDNdXSwiYiI6W1swLDJdLFsxMiwyXV0sInMiOltbMywxXSxbOSwxXSxbMTUsMV1dLCJrIjpbWzIsMl0sWzMsMV0sWzgsMl0sWzksMV0sWzE0LjUsMl0sWzE1LjUsMV0sWzQsMV0sWzEwLDFdLFsxNi41LDFdXX19fX19",
    19: "SWC3:eyJ2IjozLCJvIjp7IjE5Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDNdLFszLDNdLFs2LDNdLFs5LDNdLFsxMiwzXSxbMTUsM10sWzE4LDNdXSwiYiI6W1swLDJdLFsxMiwyXV0sInMiOltbMywxXSxbOSwxXSxbMTUsMV1dLCJrIjpbWzIsMl0sWzMsMV0sWzgsMl0sWzksMV0sWzE0LjUsMl0sWzE1LjUsMV0sWzQsMV0sWzEwLDFdLFsxNi41LDFdLFs2LDFdLFsxMi41LDFdLFsxOC41LDFdXX19fX19",
    20: "SWC3:eyJ2IjozLCJvIjp7IjIwIjp7InQiOnRydWUsImwiOnsiZCI6MzAsImUiOiJib3NzIiwibSI6eyJiYiI6W1swLDFdXX19fX19",
    21: "SWC3:eyJ2IjozLCJvIjp7IjIxIjp7InQiOnRydWUsImwiOnsiZCI6NDIsImUiOiJkdXJhdGlvbiIsIm0iOnsic3QiOltbMCwxXSxbNCwxXSxbOCwxXSxbMTIsMV0sWzE2LDFdLFsyMCwxXSxbMjQsMV0sWzI4LDFdLFszMiwxXSxbMzYsMV1dfX19fX0=",
    22: "SWC3:eyJ2IjozLCJvIjp7IjIyIjp7InQiOnRydWUsImwiOnsiZCI6NDIsImUiOiJkdXJhdGlvbiIsIm0iOnsiYiI6W1swLDNdXSwic3QiOltbNCwyXSxbOCwxXSxbMTIsMV0sWzE2LDFdLFsyMCwxXSxbMjQsMV0sWzI4LDFdLFszMiwxXSxbMzYsMV1dLCJnYm0iOltbMCwzXV19fX19fQ==",
    23: "SWC3:eyJ2IjozLCJvIjp7IjIzIjp7InQiOnRydWUsImwiOnsiZCI6NDIsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFs0LDJdLFs4LDJdLFsxMiwyXSxbMTYsMl0sWzIwLDJdLFsyNCwyXSxbMjgsMl0sWzMyLDJdLFszNiwyXV0sImIiOltbMCwzXV0sImsiOltbMCwxXSxbNCwxXSxbOCwxXSxbMTIsMV0sWzE2LDFdLFsyMCwxXSxbMjQsMV0sWzI4LDFdLFszMiwxXSxbMzYsMV1dLCJzdCI6W1s0LDJdLFsxMiwyXSxbMjAsMl0sWzI4LDJdXX19fX19",
    24: "SWC3:eyJ2IjozLCJvIjp7IjI0Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJhbGxFbGltaW5hdGVkIiwibSI6eyJnIjpbWzIsNF0sWzQsNF0sWzYsNF0sWzgsNF0sWzEwLDRdLFsxMiw0XSxbMTQsNF0sWzE2LDRdLFsxOCw0XSxbMjAsNF0sWzAsNF0sWzEsMl0sWzMsMl0sWzUsMl0sWzcsMl0sWzksMl0sWzExLDJdLFsxMywyXSxbMTUsMl0sWzE3LDJdLFsxOSwyXV0sInNoIjpbWzIuNSwxXV19fX19fQ==",
    25: "SWC3:eyJ2IjozLCJvIjp7IjI1Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJhbGxFbGltaW5hdGVkIiwibSI6eyJnIjpbWzIsNF0sWzQsNF0sWzYsNF0sWzgsNF0sWzEwLDRdLFsxMiw0XSxbMTQsNF0sWzE2LDRdLFsxOCw0XSxbMjAsNF0sWzAsNF0sWzEsMl0sWzUsMl0sWzcsMl0sWzksMl0sWzExLDJdLFsxMywyXSxbMTUsMl0sWzE3LDJdLFsxOSwyXSxbMywyXV0sImIiOltbMi41LDJdXSwic2giOltbMi41LDJdLFs3LjUsMV0sWzEyLjUsMV1dfX19fX0=",
    26: "SWC3:eyJ2IjozLCJvIjp7IjI2Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJhbGxFbGltaW5hdGVkIiwibSI6eyJnIjpbWzEsMl0sWzIsMl0sWzMsMl0sWzQsMl0sWzUsMl0sWzYsMl0sWzcsMl0sWzgsMl0sWzksMl0sWzEwLDJdLFsxMSwyXSxbMTIsMl0sWzEzLDJdLFsxNCwyXSxbMTUsMl0sWzE2LDJdLFsxNywyXSxbMTgsMl0sWzE5LDJdLFsyMCwyXSxbMCwyXV0sImIiOltbMi41LDJdXSwic2giOltbMi41LDJdLFs3LjUsMV0sWzEyLjUsMV1dLCJnYm0iOltbMiwxXV19fX19fQ==",
    27: "SWC3:eyJ2IjozLCJvIjp7IjI3Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJhbGxFbGltaW5hdGVkIiwibSI6eyJnIjpbWzAsM10sWzAuNSwzXSxbMSwzXSxbMS41LDNdLFsyLDNdLFsyLjUsM11dLCJiIjpbWzEuNSwzXV0sInNoIjpbWzIuNSwyXSxbNy41LDJdLFsxMi41LDJdXSwic3QiOltbNCwyXSxbMTMsMV0sWzguNSwxXSxbMTcuNSwxXV0sImdibSI6W1syLDFdXX19fX19",
    28: "SWC3:eyJ2IjozLCJvIjp7IjI4Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFswLjUsM10sWzEsMl0sWzEuNSwzXSxbMiwyXSxbMi41LDNdXSwic2giOltbMi41LDJdLFs3LjUsMl0sWzEyLjUsMl1dLCJrIjpbWzE1LDFdLFsxOCwxXSxbMCwxXSxbMC41LDFdLFsxLDFdLFszLjUsMV0sWzExLjUsMV0sWzE0LjUsMV0sWzE3LjUsMV0sWzE4LjUsMV0sWzQsMV0sWzcsMV0sWzQuNSwxXSxbNy41LDFdLFs4LDFdLFsxMC41LDFdLFsxMSwxXSxbMTQsMV1dLCJzdCI6W1s1LDFdLFsxNSwxXSxbNy41LDFdLFsyLjUsMV0sWzEwLDFdLFsxMi41LDFdXX19fX19",
    29: "SWC3:eyJ2IjozLCJvIjp7IjI5Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1swLDJdLFswLjUsM10sWzEsMl0sWzEuNSwzXSxbMiwyXSxbMi41LDNdXSwicyI6W1s0LDFdLFs2LDFdLFs4LDFdLFsxMCwxXSxbMTIsMV0sWzE0LDFdXSwic2giOltbMi41LDJdLFs3LjUsMl0sWzEyLjUsMl0sWzUsMV0sWzEwLDFdLFsxNC41LDFdXSwic3QiOltbNSwxXSxbMTUsMV0sWzcuNSwxXSxbMi41LDFdLFsxMCwxXSxbMTIuNSwxXV19fX19fQ==",
    30: "SWC3:eyJ2IjozLCJvIjp7IjMwIjp7InQiOnRydWUsImwiOnsiZCI6MzAsImUiOiJib3NzIiwibSI6eyJzdGIiOltbMCwxXV19fX19fQ==",
    31: "SWC3:eyJ2IjozLCJvIjp7IjMxIjp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1sxLDRdLFsyLDRdLFszLDRdLFs0LDRdLFs1LDRdLFs2LDRdLFs3LDRdLFs4LDRdLFs5LDRdLFsxMCw0XSxbMTEsNF0sWzEyLDRdLFsxMyw0XSxbMTQsNF0sWzE1LDRdLFsxNiw0XSxbMTcsNF0sWzE4LDRdLFsxOSw0XSxbMjAsNF0sWzAsNF1dLCJnYm0iOltbNCw0XSxbOCw0XSxbMTIsNF0sWzE2LDRdLFsyMCw0XSxbMCw0XV19fX19fQ==",
    32: "SWC3:eyJ2IjozLCJvIjp7IjMyIjp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1sxLDRdLFsyLDRdLFszLDRdLFs0LDRdLFs1LDRdLFs2LDRdLFs3LDRdLFs4LDRdLFs5LDRdLFsxMCw0XSxbMTEsNF0sWzEyLDRdLFsxMyw0XSxbMTQsNF0sWzE1LDRdLFsxNiw0XSxbMTcsNF0sWzE4LDRdLFsxOSw0XSxbMjAsNF0sWzAsNF1dLCJzaCI6W1sxMCwxXV0sImdibSI6W1s0LDNdLFs4LDNdLFsxMiwzXSxbMTYsM10sWzIwLDNdLFswLDNdXX19fX19",
    33: "SWC3:eyJ2IjozLCJvIjp7IjMzIjp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1syLDNdLFs0LDNdLFs2LDNdLFs4LDNdLFsxMCwzXSxbMTIsM10sWzE0LDNdLFsxNiwzXSxbMTgsM10sWzIwLDNdLFswLDNdXSwiYiI6W1s1LDJdLFsxNCwyXSxbMiwyXSxbOCwyXSxbMTEsMl0sWzE3LDJdXSwic2giOltbNSwxXSxbMTQsMV1dLCJnYm0iOltbNCwyXSxbOCwyXSxbMTIsMl0sWzE2LDJdLFsyMCwyXSxbMCwyXV19fX19fQ==",
    34: "SWC3:eyJ2IjozLCJvIjp7IjM0Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1syLDJdLFs0LDJdLFs2LDJdLFs4LDJdLFsxMCwyXSxbMTIsMl0sWzE0LDJdLFsxNiwyXSxbMTgsMl0sWzIwLDJdLFswLDJdXSwiYiI6W1s1LDJdLFsxNCwyXSxbMiwyXSxbOCwyXSxbMTEsMl0sWzE3LDJdXSwic2giOltbNSwxXSxbMTQsMV1dLCJiZSI6W1s4LDFdXSwiZ2JtIjpbWzQsMl0sWzgsMl0sWzEyLDJdLFsxNiwyXSxbMjAsMl0sWzAsMl1dfX19fQ==",
    35: "SWC3:eyJ2IjozLCJvIjp7IjM1Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiZyI6W1sxLDFdLFsyLDFdLFszLDFdLFs0LDFdLFs1LDFdLFs2LDFdLFs3LDFdLFs4LDFdLFs5LDFdLFsxMCwxXSxbMTEsMV0sWzEyLDFdLFsxMywxXSxbMTQsMV0sWzE1LDFdLFsxNiwxXSxbMTcsMV0sWzE4LDFdLFsxOSwxXSxbMjAsMV0sWzAsMV1dLCJiIjpbWzUsMl0sWzE0LDJdLFsyLDJdLFs4LDJdLFsxMSwyXSxbMTcsMl1dLCJzaCI6W1s1LDFdLFsxNCwxXV0sImJlIjpbWzgsMl0sWzIsMV1dLCJnYm0iOltbNCwyXSxbOCwyXSxbMTIsMl0sWzE2LDJdLFsyMCwyXSxbMCwyXV19fX19fQ==",
    36: "SWC3:eyJ2IjozLCJvIjp7IjM2Ijp7InQiOnRydWUsImwiOnsiZCI6MjAsImUiOiJkdXJhdGlvbiIsIm0iOnsiYiI6W1s1LDJdLFsxNCwyXSxbMiwyXSxbOCwyXSxbMTEsMl0sWzE3LDJdXSwic2giOltbNSwxXSxbMS41LDFdLFs4LjUsMV0sWzEyLDFdLFsxNS41LDFdLFsxOSwxXV0sImJlIjpbWzguNSwyXSxbMy41LDJdLFsxMy41LDJdLFs2LDFdLFsxMSwxXSxbMTYsMV1dfX19fQ==",
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

  // Pre-decode all wave codes into _editorWaveOverride at startup.
  // This must happen here (before Editor.js runs) so Editor.js's initializeCodeWaves()
  // cannot overwrite with its bad raw-wrapper format.
  function preloadAllWaveTimelines() {
    if (!window.SentinelEditor || typeof window.SentinelEditor.decodeWaveCode !== "function") {
      // SentinelEditor not ready yet - will be handled by spawnWave() instead
      return;
    }
    window._editorWaveOverride = window._editorWaveOverride || {};
    for (const [waveNumStr, code] of Object.entries(DEFAULT_WAVE_EDITOR_CODES)) {
      const waveNum = parseInt(waveNumStr, 10);
      if (!code) continue;
      try {
        const decoded = window.SentinelEditor.decodeWaveCode(code);
        const waveCfg = decoded[waveNum];
        if (waveCfg && waveCfg.t && waveCfg.l) {
          window._editorWaveOverride[waveNum] = {
            timelineMode: true,
            timeline: { ...waveCfg.l, endCondition: waveCfg.e || 'duration' },
            _source: 'preload'
          };
        }
      } catch (_) {}
    }
    preloadAllWaveTimelines();
  }

  function getEditorWaveCode(waveNumber) {
    if (window.SentinelWaveEditorCodes && typeof window.SentinelWaveEditorCodes[waveNumber] === "string") {
      return window.SentinelWaveEditorCodes[waveNumber];
    }
    return null;
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
    // Use grunt heavy.png for brute heavy (gruntBossMinor)
    let bruteHeavyImg = window._bruteHeavyImg;
    if (!bruteHeavyImg) {
      bruteHeavyImg = new window.Image();
      bruteHeavyImg.src = encodeURI("grunt heavy.png");
      window._bruteHeavyImg = bruteHeavyImg;
    }

    let gruntSpawnTimer = 0;
    let gruntSpawnInterval = 420;
    let gruntSpawnCount = 1 + Math.floor(Math.random() * 2);
    const { x, y } = randomEdgeSpawn();
    let radius = 34, collisionRadius = 40, speed = 0.4, health = getEnemyHealthForType('gruntBoss', wave), damage = 1, attackRange = 20, color = "magenta";
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
    let radius = 28, collisionRadius = 30, speed = 0.32, health = getEnemyHealthForType('gruntBossMinor', wave), damage = 1, attackRange = 20, color = "magenta";
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
      let radius = 14, collisionRadius = 16, speed = 1.5, health = getEnemyHealthForType('grunt', wave), damage = 1, attackRange = 22, color = "magenta";
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
      let radius = 16, collisionRadius = 18, speed = 2, color = "#ff4444", damage = 3, health = getEnemyHealthForType('kamikaze', wave);
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
      let radius = 18, collisionRadius = 20, speed = 0.8, health = getEnemyHealthForType('slinger', wave), damage = 1, attackRange = 240, color = "orange";
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
    enemy.speed = 0.65;
    enemy.health = getEnemyHealthForType('slingerBoss', wave);
    // Reduced damage to make the slinger boss less punishing
    enemy.damage = 1;
    enemy.attackCooldown = 0;
    enemy.attackRange = 5000;
    enemy.color = "#ff9f1a";
    enemy.type = "slingerBoss";
    enemy.spinAngle = Math.random() * Math.PI * 2;
    enemy.spinSpeed = (Math.random() - 0.5) * 0.02;
    enemy.sprite = slingerImg;
    enemy.slingerBossEntering = false;
    enemy.slingerBossEntryStage = undefined;
    enemy.slingerBossFragCooldown = 0;
    enemy.slingerBossEdgePaddingX = 110;
    enemy.slingerBossEdgePaddingY = 150;
    ctx.applyWaveEnemyModifiers(enemy);
    enemy.slingerBossEntryStage = undefined;
    enemy.maxHealth = enemy.health;
  }

  function spawnBruteBurst(ctx, count) {
    const enemies = ctx.getEnemies();
    const wave = ctx.getWave();

    for (let i = 0; i < count; i++) {
      const { x, y } = randomEdgeSpawn();
      let radius = 24, collisionRadius = 26, speed = 0.62, health = getEnemyHealthForType('brute', wave), damage = 2, attackRange = 28, color = "#ff7a00";
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
    enemy.health = getEnemyHealthForType('bruteBoss', wave);
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
      let radius = 18, collisionRadius = 18, speed = 0.75, health = getEnemyHealthForType('stalker', wave), damage = 1, attackRange = 210, color = "#000000";
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
      let radius = 19, collisionRadius = 20, speed = 0.68, health = getEnemyHealthForType('beamer', wave), damage = 4, attackRange = 420, color = "#4bc7ff";
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
      let radius = 26, collisionRadius = 17, speed = 0.64, health = getEnemyHealthForType('shielder', wave), damage = 0, attackRange = 0, color = "#78ffd6";
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
    enemy.health = getEnemyHealthForType('stalkerBoss', wave);
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

    // CRITICAL: Clear timeline state when starting new wave to prevent old timeline from bleeding through
    if (window._timelineWaveState && window._timelineWaveState.wave !== newWave) {
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

    // If editor override is present and explicitly in preview mode, use it for the preview wave only.
    if (window._editorPreviewOverride && window._editorSessionActive) {
      window._bossMinorCount = 0;
      if (window._editorPreviewWave === wave) {
        return;
      }
      window._editorPreviewOverride = null;
      window._editorPreviewWave = null;
    }
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

    // Decode wave code and create timeline override for this wave.
    // Always overwrites to ensure correct format (Editor.js may have stored bad data).
    if (wave >= 1 && window.SentinelWaveEditorCodes && window.SentinelWaveEditorCodes[wave]) {
      if (window.SentinelEditor && typeof window.SentinelEditor.decodeWaveCode === "function") {
        try {
          const decoded = window.SentinelEditor.decodeWaveCode(window.SentinelWaveEditorCodes[wave]);
          const waveCfg = decoded[wave];
          let timeline = null;
          if (waveCfg) {
            if (waveCfg.t && waveCfg.l) {
              // Compressed format: t=timelineMode, l=timeline data, e=endCondition
              timeline = { ...waveCfg.l, endCondition: waveCfg.e || 'duration' };
            } else if (waveCfg.timelineMode && waveCfg.timeline) {
              // Already decompressed format
              timeline = waveCfg.timeline;
            }
          }
          if (timeline) {
            window._editorWaveOverride = window._editorWaveOverride || {};
            window._editorWaveOverride[wave] = { timelineMode: true, timeline, _source: 'spawnWave' };
          } else {
          }
        } catch (err) {
        }
      }
    } else {
      if (!window.SentinelWaveEditorCodes?.[wave]) {
      }
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
      return false;  // Signal no new action, let main loop handle advancement
    }
    
    // CRITICAL: Only initialize state if wave actually changed OR state doesn't exist yet
    const waveChanged = !window._timelineWaveState || window._timelineWaveState.wave !== wave;
    if (waveChanged && (!window._timelineWaveState || window._timelineWaveState.wave < wave)) {
      // Only reinit if transitioning to a NEW/higher wave, not if state was just cleared for same wave
      if (window._timelineWaveState) {
      }
      window._timelineWaveState = {
        wave,
        elapsedTime: 0,
        spawnedEventKeys: new Set(),  // Track spawned events by mobType_index key
        endCondition: timeline.endCondition || 'duration'  // Store end condition for access in main loop
      };
    } else if (!window._timelineWaveState) {
      // State was cleared but we're still on same wave - this wave is done
      window._timelineCompletedWaves[wave] = true;
      return false;
    }

    const state = window._timelineWaveState;
    state.elapsedTime += (delta * SPEED_MULTIPLIER) / 100;
    
    // DEBUG: Log elapsed time progression every 1 second
    if (Math.floor(state.elapsedTime) !== Math.floor(state.elapsedTime - (delta * SPEED_MULTIPLIER) / 100) || state.elapsedTime < 0.05) {
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

    // Apocalypse difficulty: spawn 1-3 extra kamikazes alongside each burst event
    if (anyEventSpawned && window.sentinelDifficulty === "Apocalypse") {
      const kamikazeCount = 1 + Math.floor(Math.random() * 3);
      spawnKamikazeBurst(ctx, kamikazeCount);
    }

    // Wave complete based on endCondition setting
    const endCondition = timeline.endCondition || 'duration';
    let waveComplete = false;

    if (endCondition === 'duration') {
      // Wave ends when duration expires (regardless of mobs alive)
      if (!anyEventRemaining && state.elapsedTime >= timeline.duration) {
        waveComplete = true;
      }
    } else if (endCondition === 'allEliminated') {
      // Wave ends when all spawned enemies are eliminated (ignores duration timer)
      const enemies = ctx.getEnemies();  // Gets ALL enemies regardless of mob type
      // Check if all enemies are dead (health <= 0) - returns true only if every single enemy is dead
      waveComplete = enemies.length > 0 && enemies.every(e => e.health <= 0);
      if (waveComplete) {
      }
    } else if (endCondition === 'boss') {
      // Wave ends when all boss-type enemies are eliminated (no XP drops on completion)
      const enemies = ctx.getEnemies();
      // Boss types: gruntBossMinor, gruntBoss, slingerBoss, bruteBoss, stalkerBoss
      const bossTypes = ['gruntBossMinor', 'gruntBoss', 'slingerBoss', 'bruteBoss', 'stalkerBoss'];
      
      // Find all boss enemies
      const bossEnemies = enemies.filter(e => bossTypes.includes(e.type));
      
      // Wave is complete if:
      // 1. There are/were boss enemies AND all are dead, OR
      // 2. Events have all spawned and no bosses were ever spawned (shouldn't happen in practice)
      if (bossEnemies.length > 0) {
        waveComplete = bossEnemies.every(e => e.health <= 0);
        if (waveComplete) {
        }
      }
    }

    if (waveComplete) {
      // Mark this wave as completed so we don't reinitialize it
      window._timelineCompletedWaves[wave] = true;
      window._timelineWaveState = null;
      return true;  // Signal wave is complete
    }

    return false;  // Wave still in progress
  }

  function loadTimelineForWave(wave) {
    // Try user override first (from editor), then fall back to default codes
    const sources = [
      window.waveEditorOverrides && window.waveEditorOverrides[wave],  // user-saved override
      window._editorWaveOverride && window._editorWaveOverride[wave],  // editor session
    ];

    for (const src of sources) {
      if (!src) continue;
      // Already decoded into correct format
      if (src.timelineMode && src.timeline) return src;
      // Encoded wave code string stored as override
      if (typeof src === 'string') {
        try {
          const decoded = window.SentinelEditor.decodeWaveCode(src);
          const waveCfg = decoded[wave];
          if (waveCfg && waveCfg.t && waveCfg.l) {
            return { timelineMode: true, timeline: { ...waveCfg.l, endCondition: waveCfg.e || 'duration' } };
          }
        } catch (_) {}
      }
      // Raw decoded wrapper (e.g. from Editor.js initializeCodeWaves)
      const waveCfg = src[wave] || src;
      if (waveCfg && waveCfg.t && waveCfg.l) {
        return { timelineMode: true, timeline: { ...waveCfg.l, endCondition: waveCfg.e || 'duration' } };
      }
    }

    // Fall back to DEFAULT_WAVE_EDITOR_CODES
    const code = window.SentinelWaveEditorCodes && window.SentinelWaveEditorCodes[wave];
    if (code && window.SentinelEditor && typeof window.SentinelEditor.decodeWaveCode === 'function') {
      try {
        const decoded = window.SentinelEditor.decodeWaveCode(code);
        const waveCfg = decoded[wave];
        if (waveCfg && waveCfg.t && waveCfg.l) {
          const result = { timelineMode: true, timeline: { ...waveCfg.l, endCondition: waveCfg.e || 'duration' }, _source: 'default' };
          // Cache it so next frame is instant
          window._editorWaveOverride = window._editorWaveOverride || {};
          window._editorWaveOverride[wave] = result;
          return result;
        }
      } catch (_) {}
    }
    return null;
  }

  function handleWaveSpawning(ctx, delta) {
    if (!ctx) return;

    const wave = ctx.getWave();
    
    const override = loadTimelineForWave(wave);
    
    if (override && override.timelineMode && override.timeline) {
      // Clear stale timeline state on wave change
      if (window._timelineWaveState && window._timelineWaveState.wave !== wave) {
        window._timelineWaveState = null;
      }
      const isComplete = handleTimelineWaveSpawning(ctx, delta, override.timeline);
      if (isComplete) {
        ctx.setBurstIndex(ctx.getBurstCount());
      }
      return;
    }
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
    getWaveEditorCodes: () => window.SentinelWaveEditorCodes
  };
})();
