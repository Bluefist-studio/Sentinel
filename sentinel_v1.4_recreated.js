  // Reset all progression: bytes, protocols, milestones
  window.resetAllProgression = function() {
    window.resetBytes();
    window.resetAllProtocolDiscovery();
    window.lockAllMilestones();
    window.resetCompletedTrialRuns();
    console.log("All progression reset: bytes, protocols, milestones, and trial runs cleared.");
  };

  window.resetTutorial = function() {
    localStorage.removeItem('sentinel_tutorialDone');
    localStorage.removeItem('sentinel_tutorialDone_v2');
    console.log("Tutorial reset. Refresh to run it again.");
  };

  // Expose byte reset and set to console
  window.resetBytes = function() {
    window.totalCollectedBytes = 0;
    localStorage.setItem('sentinel.collectedBytes.v1', '0');
  };

  window.giveBytes100 = function() {
    window.totalCollectedBytes = 100;
    localStorage.setItem('sentinel.collectedBytes.v1', '100');
  };

  // God mode - player takes no damage
  window.godMode = false;
  window.toggleGodMode = function() {
    window.godMode = !window.godMode;
  };

  // Wave unlock system console commands
  window.showUnlockedWaves = function() {
    const unlockedWaves = typeof getUnlockedWaves === 'function' ? getUnlockedWaves() : [1];
  };

  window.unlockAllWaves = function() {
    localStorage.setItem('sentinel.unlockedWaves.v1', JSON.stringify(Array.from({length: 30}, (_, i) => i + 1)));
  };

  window.resetWaveProgress = function() {
    localStorage.setItem('sentinel.unlockedWaves.v1', JSON.stringify([1]));
  };

  // Milestone wave controls (independent of difficulty)
  const MILESTONE_WAVES = [1, 5, 15, 25, 35, 45];

  window.unlockAllMilestones = function() {
    MILESTONE_WAVES.forEach(wave => {
      const unlocked = JSON.parse(localStorage.getItem('sentinel.unlockedWaves.v1') || '[1]');
      if (!unlocked.includes(wave)) {
        unlocked.push(wave);
      }
      localStorage.setItem('sentinel.unlockedWaves.v1', JSON.stringify(unlocked.sort((a,b) => a-b)));
    });
  };

  window.lockAllMilestones = function() {
    let unlocked = JSON.parse(localStorage.getItem('sentinel.unlockedWaves.v1') || '[1]');
    unlocked = unlocked.filter(wave => !MILESTONE_WAVES.includes(wave) || wave === 1);
    localStorage.setItem('sentinel.unlockedWaves.v1', JSON.stringify(unlocked));
  };

  window.unlockMilestone = function(wave) {
    if (!MILESTONE_WAVES.includes(wave)) {
      return;
    }
    const unlocked = JSON.parse(localStorage.getItem('sentinel.unlockedWaves.v1') || '[1]');
    if (!unlocked.includes(wave)) {
      unlocked.push(wave);
      localStorage.setItem('sentinel.unlockedWaves.v1', JSON.stringify(unlocked.sort((a,b) => a-b)));
    }
  };

  window.lockMilestone = function(wave) {
    if (!MILESTONE_WAVES.includes(wave)) {
      return;
    }
    if (wave === 1) {
      return;
    }
    let unlocked = JSON.parse(localStorage.getItem('sentinel.unlockedWaves.v1') || '[1]');
    unlocked = unlocked.filter(w => w !== wave);
    localStorage.setItem('sentinel.unlockedWaves.v1', JSON.stringify(unlocked));
  };

  const MUSIC_MASTER_VOLUME_KEY = "sentinel.musicMasterVolume.v1";
  let initialMusicMasterVolume = 1;
  try {
    const storedMusicMasterVolume = localStorage.getItem(MUSIC_MASTER_VOLUME_KEY);
    if (storedMusicMasterVolume !== null && Number.isFinite(Number(storedMusicMasterVolume))) {
      initialMusicMasterVolume = Math.min(1, Math.max(0, Number(storedMusicMasterVolume)));
    }
  } catch (error) {
    console.warn("Music volume setting could not be loaded.", error);
  }
  window.sentinelMusicMasterVolume = initialMusicMasterVolume;

  function setMusicLevel(audio, level) {
    if (!audio || !Number.isFinite(level)) return;
    const boundedLevel = Math.min(1, Math.max(0, level));
    audio._sentinelMusicLevel = boundedLevel;
    audio.volume = boundedLevel * window.sentinelMusicMasterVolume;
  }

  function setMusicMasterVolume(volume) {
    if (!Number.isFinite(volume)) return;
    const masterVolume = Math.min(1, Math.max(0, volume));
    window.sentinelMusicMasterVolume = masterVolume;
    [
      window._menuMusicAudio,
      window._gameMusicAudio,
      window._bossMusicAudio,
      window._victoryMusicAudio,
      window._cinematicMusicAudio
    ].forEach(audio => {
      if (audio && Number.isFinite(audio._sentinelMusicLevel)) {
        audio.volume = audio._sentinelMusicLevel * masterVolume;
      }
    });
    try {
      localStorage.setItem(MUSIC_MASTER_VOLUME_KEY, String(masterVolume));
    } catch (error) {
      console.warn("Music volume setting could not be saved.", error);
    }
  }

  // Play looping menu chiptune music
  function playMenuMusic() {
    try {
      // Already playing — don't restart
      if (window._menuMusicAudio && !window._menuMusicAudio.paused) return;
      if (window._menuMusicAudio) {
        window._menuMusicAudio.pause();
        window._menuMusicAudio.currentTime = 0;
        window._menuMusicAudio = null;
      }
      let music = new Audio(encodeURI('nickpanekaiassets-356-8-bit-chiptune-game-music-357518.mp3'));
      setMusicLevel(music, window.sentinelVolume && window.sentinelVolume.menuMusic !== undefined
        ? window.sentinelVolume.menuMusic
        : 0.4);
      music.loop = true;
      let playPromise = music.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      window._menuMusicAudio = music;
    } catch (e) {}
  }

  // Fade out and stop menu chiptune music
  function fadeOutMenuMusic(duration = 1000) {
    const music = window._menuMusicAudio;
    if (!music) return;
    const startVol = music._sentinelMusicLevel;
    const start = Date.now();
    function step() {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      setMusicLevel(music, startVol * (1 - t));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        music.pause();
        setMusicLevel(music, startVol);
        window._menuMusicAudio = null;
      }
    }
    step();
  }

  // ============================================================
  // GAME MUSIC PLAYLIST
  // Add or remove filenames here to change the in-game tracks.
  // They play in order, looping back to the first when finished.
  // ============================================================
  const GAME_MUSIC_PLAYLIST = [
    'musicinmedia-chiptune-symphony-8bit-game-theme-music-381366.mp3',
    'nickpanekaiassets-chiptune-boss-fight-music-265080.mp3',
    'nickpanekaiassets-chiptune-nu-metal-216243.mp3',
    'nickpanekaiassets-80s-video-game-battle-chiptune-216255.mp3',
  ];

  window._gameMusicIndex = 0;

  // Start the playlist from the beginning (or a specific index)
  function playGameMusic(index = 0) {
    stopGameMusic();
    window._gameMusicIndex = index % GAME_MUSIC_PLAYLIST.length;
    _playGameTrack(window._gameMusicIndex);
  }

  // Internal: load and play a single track, advance to next when it ends
  function _playGameTrack(index) {
    try {
      if (window._gameMusicContext) {
        window._gameMusicContext.close();
        window._gameMusicContext = null;
        window._gameMusicFilter = null;
      }
      const filename = GAME_MUSIC_PLAYLIST[index];
      const music = new Audio(encodeURI(filename));
      setMusicLevel(music, window.sentinelVolume && window.sentinelVolume.gameMusic !== undefined
        ? window.sentinelVolume.gameMusic
        : 0.4);
      music.loop = false;
      // Web Audio chain: source → lowpass filter → output (for muffling)
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Resume the context if suspended (required on some browsers for autoplay)
      if (ctx.state === 'suspended') ctx.resume();
      const source = ctx.createMediaElementSource(music);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 20000; // Always start clear on any transition; right-click events handle muffling
      source.connect(filter);
      filter.connect(ctx.destination);
      window._gameMusicContext = ctx;
      window._gameMusicFilter = filter;
      window._gameMusicAudio = music;
      // Advance to next track when this one ends
      music.addEventListener('ended', () => {
        const next = (index + 1) % GAME_MUSIC_PLAYLIST.length;
        window._gameMusicIndex = next;
        _playGameTrack(next);
      });
      const playPromise = music.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    } catch (e) {}
  }

  // Apply low-pass muffle to game music (right-click released / passive)
  function muffleGameMusic() {
    if (window._gameMusicFilter && window._gameMusicContext) {
      window._gameMusicFilter.frequency.setTargetAtTime(400, window._gameMusicContext.currentTime, 0.08);
    }
  }

  // Remove muffle from game music (right-click held / active play)
  function unmuffleGameMusic() {
    if (window._gameMusicFilter && window._gameMusicContext) {
      window._gameMusicFilter.frequency.setTargetAtTime(20000, window._gameMusicContext.currentTime, 0.15);
    }
  }

  // Stop in-game BGM and close the audio context
  function stopGameMusic() {
    const music = window._gameMusicAudio;
    if (music) {
      music.pause();
      music.currentTime = 0;
      window._gameMusicAudio = null;
    }
    if (window._gameMusicContext) {
      window._gameMusicContext.close();
      window._gameMusicContext = null;
      window._gameMusicFilter = null;
    }
  }

  // Fade out game music, then run an optional callback
  function fadeOutGameMusic(duration = 1200, callback) {
    const music = window._gameMusicAudio;
    if (!music) { if (callback) callback(); return; }
    const startVol = music._sentinelMusicLevel;
    const start = Date.now();
    function step() {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      setMusicLevel(music, startVol * (1 - t));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        stopGameMusic();
        if (callback) callback();
      }
    }
    step();
  }

  function stopVictoryMusic() {
    const music = window._victoryMusicAudio;
    if (!music) return;
    music.pause();
    music.currentTime = 0;
    window._victoryMusicAudio = null;
  }

  function playVictoryMusic(duration = 1600) {
    stopVictoryMusic();
    try {
      const music = new Audio(encodeURI("nocopyrightsound633-8-bit-music-no-copyright-background-instrumental-pixel-party-322342.mp3"));
      const targetVolume = window.sentinelVolume && window.sentinelVolume.gameMusic !== undefined
        ? window.sentinelVolume.gameMusic
        : 0.4;
      music.loop = true;
      setMusicLevel(music, 0);
      window._victoryMusicAudio = music;
      const playPromise = music.play();
      if (playPromise) {
        playPromise.catch(error => {
          if (window._victoryMusicAudio === music) {
            console.warn("Victory music could not be played.", error);
          }
        });
      }

      const fadeStartedAt = performance.now();
      function fadeIn() {
        if (window._victoryMusicAudio !== music) return;
        const progress = Math.min(1, (performance.now() - fadeStartedAt) / duration);
        setMusicLevel(music, targetVolume * progress);
        if (progress < 1) requestAnimationFrame(fadeIn);
      }
      fadeIn();
    } catch (error) {
      console.warn("Victory music could not be started.", error);
    }
  }

  function fadeOutVictoryMusic(duration = 1200, callback) {
    const music = window._victoryMusicAudio;
    if (!music) {
      if (callback) callback();
      return;
    }
    const startVolume = music._sentinelMusicLevel;
    const fadeStartedAt = performance.now();
    function fadeOut() {
      if (window._victoryMusicAudio !== music) return;
      const progress = Math.min(1, (performance.now() - fadeStartedAt) / duration);
      setMusicLevel(music, startVolume * (1 - progress));
      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        stopVictoryMusic();
        if (callback) callback();
      }
    }
    fadeOut();
  }
  // ============================================================
  // BOSS MUSIC
  // Plays over the game playlist during boss waves, then fades
  // back to the playlist when the boss is defeated.
  // ============================================================
  const BOSS_MUSIC_FILE = 'nickpanekaiassets-fast-paced-chiptune-song-for-video-games-227123.mp3';
  const BEAMER_BOSS_MUSIC_FILE = 'nickpanek-chiptune-hard-boss-mode-218071.mp3';
  const BEAMER_BOSS_BEAM_SOUND_FILE = 'fronbondi_skegs-sfx-alien-spaceship-tractor-beam-excitor-sound-effect-358492.mp3';
  window._bossMusicallyActive = false;
  window._beamerBossMusicActive = false;
  window._bossSoundsStoppedForEndState = false;

  function playBossMusic(filename = BOSS_MUSIC_FILE, targetVolume = 0.45) {
    try {
      // Game music keeps playing (already silenced by _silenceGameMusicForBoss)
      if (window._bossMusicContext) {
        window._bossMusicContext.close();
        window._bossMusicContext = null;
        window._bossMusicFilter = null;
      }
      const music = new Audio(encodeURI(filename));
      setMusicLevel(music, 0);
      music.loop = true;
      const bCtx = new (window.AudioContext || window.webkitAudioContext)();
      // Resume the context if suspended (required on some browsers for autoplay)
      if (bCtx.state === 'suspended') bCtx.resume();
      const source = bCtx.createMediaElementSource(music);
      const filter = bCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 20000; // Always start clear; muffle events take over from here
      source.connect(filter);
      filter.connect(bCtx.destination);
      window._bossMusicContext = bCtx;
      window._bossMusicFilter = filter;
      window._bossMusicAudio = music;
      const playPromise = music.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
      // Fade in over 1.5s
      const target = Math.min(1, Math.max(0, targetVolume));
      const duration = 1500;
      const start = Date.now();
      function fadeIn() {
        const t = Math.min(1, (Date.now() - start) / duration);
        if (window._bossMusicAudio === music) setMusicLevel(music, target * t);
        if (t < 1 && window._bossMusicAudio === music) requestAnimationFrame(fadeIn);
      }
      fadeIn();
    } catch (e) {}
  }

  // Pause game music for boss (keeps position in track)
  function _silenceGameMusicForBoss(callback) {
    const music = window._gameMusicAudio;
    if (music) music.pause();
    if (callback) callback();
  }

  // Resume game music after boss with a fade-in
  function _restoreGameMusicFromBoss(duration = 800) {
    const music = window._gameMusicAudio;
    if (!music) return;
    setMusicLevel(music, 0);
    const target = (window.sentinelVolume && window.sentinelVolume.gameMusic) || 0.4;
    const start = Date.now();
    const resumePromise = music.play();
    if (resumePromise) resumePromise.catch(() => {});
    function step() {
      const t = Math.min(1, (Date.now() - start) / duration);
      if (window._gameMusicAudio === music) setMusicLevel(music, target * t);
      if (t < 1 && window._gameMusicAudio === music) requestAnimationFrame(step);
    }
    step();
  }

  function mufleBossMusic() {
    if (window._bossMusicFilter && window._bossMusicContext) {
      window._bossMusicFilter.frequency.setTargetAtTime(400, window._bossMusicContext.currentTime, 0.08);
    }
  }

  function unmufleBossMusic() {
    if (window._bossMusicFilter && window._bossMusicContext) {
      window._bossMusicFilter.frequency.setTargetAtTime(20000, window._bossMusicContext.currentTime, 0.15);
    }
  }

  function stopBossMusic() {
    const music = window._bossMusicAudio;
    if (music) { music.pause(); music.currentTime = 0; window._bossMusicAudio = null; }
    if (window._bossMusicContext) {
      window._bossMusicContext.close();
      window._bossMusicContext = null;
      window._bossMusicFilter = null;
    }
  }

  function stopAllMusic(preserveVictoryMusic = false) {
    const menuMusic = window._menuMusicAudio;
    if (menuMusic) {
      menuMusic.pause();
      menuMusic.currentTime = 0;
      window._menuMusicAudio = null;
    }
    stopGameMusic();
    stopBossMusic();
    if (!preserveVictoryMusic) stopVictoryMusic();
  }

  const BEAMER_BOSS_SFX_FILES = [
    "freesound_community-rikochet-v1-light-2-47347.mp3",
    "yodguard-energy-beam-blast-4-482514.mp3",
    "freesound_community-057967_power-charge-88127.mp3",
    "freesound_community-beam-8-43831.mp3",
    "sparky_laser.wav"
  ];

  function stopBossSounds(preserveMusic = false) {
    if (window._bossSoundsStoppedForEndState) return;
    window._bossSoundsStoppedForEndState = true;
    const beamLoop = window._audioPool && window._audioPool[BEAMER_BOSS_BEAM_SOUND_FILE];
    if (beamLoop) {
      beamLoop.pause();
    }
    for (const filename of BEAMER_BOSS_SFX_FILES) {
      const pool = _freshAudioPool[filename];
      if (!pool) continue;
      for (const audio of pool) {
        audio.pause();
      }
    }
    window._bossMusicallyActive = false;
    window._beamerBossMusicActive = false;
    if (!preserveMusic) stopAllMusic(!!window._victoryTriggered);
  }

  function fadeOutBossMusic(duration = 1200, callback) {
    const music = window._bossMusicAudio;
    if (!music) { if (callback) callback(); return; }
    const startVol = music._sentinelMusicLevel;
    const start = Date.now();
    function step() {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      if (window._bossMusicAudio === music) setMusicLevel(music, startVol * (1 - t));
      if (t < 1) { requestAnimationFrame(step); }
      else { stopBossMusic(); if (callback) callback(); }
    }
    step();
  }

  function transitionToMenuMusic(duration = 1200) {
    const activeFades = [];
    if (window._gameMusicAudio) activeFades.push(done => fadeOutGameMusic(duration, done));
    if (window._bossMusicAudio) activeFades.push(done => fadeOutBossMusic(duration, done));
    if (window._victoryMusicAudio) activeFades.push(done => fadeOutVictoryMusic(duration, done));
    if (activeFades.length === 0) {
      playMenuMusic();
      return;
    }

    let remaining = activeFades.length;
    const fadeComplete = () => {
      remaining -= 1;
      if (remaining === 0) playMenuMusic();
    };
    activeFades.forEach(fade => fade(fadeComplete));
  }

  function transitionToVictoryMusic(duration = 1600) {
    window._bossMusicallyActive = false;
    window._beamerBossMusicActive = false;
    fadeOutGameMusic(duration);
    fadeOutBossMusic(duration);
    playVictoryMusic(duration);
  }

  // Speed multiplier for game timing (higher = faster, lower = slower)
  const SPEED_MULTIPLIER = 120;

  // Audio pooling to prevent "too many WebMediaPlayers" errors
  window._audioPool = {};
  function playSound(filename, volume = 1.0, loop = false) {
    try {
      if (!window._audioPool[filename]) {
        window._audioPool[filename] = new Audio(encodeURI(filename));
        window._audioPool[filename].loop = loop;
      }
      const audio = window._audioPool[filename];
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise) playPromise.catch(() => {});
      return audio;
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // Play a fresh Audio instance each time (for overlapping one-shot SFX).
  // Uses a small per-filename pool of reusable Audio objects to avoid
  // allocating a new HTMLAudioElement (and browser media stack entry) on every call.
  const _freshAudioPool = {};
  const _FRESH_POOL_MAX = 6;
  function playSoundFresh(filename, volume = 1.0) {
    try {
      let pool = _freshAudioPool[filename];
      if (!pool) { pool = []; _freshAudioPool[filename] = pool; }
      let audio = null;
      for (let i = 0; i < pool.length; i++) {
        if (pool[i].ended || pool[i].paused) { audio = pool[i]; break; }
      }
      if (!audio) {
        if (pool.length < _FRESH_POOL_MAX) {
          audio = new Audio(encodeURI(filename));
          pool.push(audio);
        } else {
          // All slots in use — reuse the oldest one
          audio = pool[0];
          audio.pause();
          audio.currentTime = 0;
        }
      } else {
        audio.currentTime = 0;
      }
      audio.volume = Math.min(1, Math.max(0, volume));
      const playPromise = audio.play();
      if (playPromise) playPromise.catch(() => {});
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // Player hit sound — throttled to avoid spam from continuous damage sources
  window._playerHitSoundLastTime = 0;
  window._orbPickupSoundLastTime = 0;
  function playOrbPickupSound() {
    const now = Date.now();
    if (now - window._orbPickupSoundLastTime < 120) return;
    window._orbPickupSoundLastTime = now;
    playSoundFresh('47313572-8-bit-game-sfx-sound-3-269968.mp3', (window.sentinelVolume && window.sentinelVolume.orbPickup) || 0.8);
  }
  window._protocolPickupSoundLastTime = 0;
  function playProtocolPickupSound() {
    const now = Date.now();
    if (now - window._protocolPickupSoundLastTime < 120) return;
    window._protocolPickupSoundLastTime = now;
    playSoundFresh('47313572-8-bit-game-sfx-sound-7-269973.mp3', (window.sentinelVolume && window.sentinelVolume.protocolPickup) || 0.9);
  }
  function playPlayerHitSound() {
    const now = Date.now();
    if (now - window._playerHitSoundLastTime < 350) return;
    window._playerHitSoundLastTime = now;
    playSoundFresh('47313572-8bit-sound-4-270297.mp3', (window.sentinelVolume && window.sentinelVolume.playerHit) || 0.6);
    if (window.player) window.player.hitFlashTimer = 120; // ~2 seconds at 60fps
  }

  // Low health warning loop — plays when player is at or below 10% max health
  window._lowHealthAudio = null;
  window._lowHealthAudioContext = null;
  function startLowHealthSound() {
    // Create the element once, then try to resume each frame until it plays
    if (!window._lowHealthAudio) {
      const audio = new Audio(encodeURI('freesound_community-success_02-68338.mp3'));
      audio.loop = true;
      audio.playbackRate = 2;
      audio.volume = 1;
      // Boost via Web Audio gain node (same pattern as click sound)
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();
        gain.gain.value = (window.sentinelVolume && window.sentinelVolume.lowHealthBoost) || 2.5;
        source.connect(gain);
        gain.connect(ctx.destination);
        window._lowHealthAudioContext = ctx;
      } catch (e) {}
      window._lowHealthAudio = audio;
    }
    if (window._lowHealthAudio.paused) {
      const p = window._lowHealthAudio.play();
      if (p) p.catch(() => {});
    }
  }
  function stopLowHealthSound() {
    if (!window._lowHealthAudio) return;
    window._lowHealthAudio.pause();
    window._lowHealthAudio.currentTime = 0;
    window._lowHealthAudio = null;
    if (window._lowHealthAudioContext) {
      window._lowHealthAudioContext.close();
      window._lowHealthAudioContext = null;
    }
  }

  // Global click sound: plays on any button click anywhere in the UI
  document.addEventListener('click', (e) => {
    const tag = e.target.tagName;
    if (tag === 'BUTTON' || tag === 'A') {
      playSoundFresh('47313572-8-bit-game-sfx-sound-6-269965.mp3', (window.sentinelVolume && window.sentinelVolume.click) || 1.0);
    }
  }, true);


  // Mine sprite
  const mineImg = new window.Image();
  mineImg.src = "mine.png";
  // Grunt Boss sprite
  const gruntBossImg = new window.Image();
  gruntBossImg.src = encodeURI("grunt boss.png");
  // Grunt Heavy sprite
  const gruntHeavyImg = new window.Image();
  gruntHeavyImg.src = encodeURI("grunt heavy.png");
  // Slinger Boss sprite
  const slingerBossImg = new window.Image();
  slingerBossImg.src = encodeURI("slinger boss.png");
// Sentinel v1.4 Recreated - Core game logic

// Expose protocol reset to console
window.resetAllProtocolDiscovery = function() {
  if (window.ProtocolSystem && typeof window.ProtocolSystem.resetDiscovery === 'function') {
    window.ProtocolSystem.resetDiscovery();
  } else if (typeof ProtocolSystem !== 'undefined' && typeof ProtocolSystem.resetDiscovery === 'function') {
    ProtocolSystem.resetDiscovery();
  }
};

window.debugFramerateEnabled = false;
window._debugKeyDown = false;
window.addEventListener('keydown', function(e) {
  // Toggle framerate debug with 'P' (only on initial press, not repeat)
  if ((e.key === 'p' || e.key === 'P') && !window._debugKeyDown) {
    window.debugFramerateEnabled = !window.debugFramerateEnabled;
    window._debugKeyDown = true;
    e.preventDefault();
  }
});
window.addEventListener('keyup', function(e) {
  if (e.key === 'p' || e.key === 'P') {
    window._debugKeyDown = false;
    e.preventDefault();
  }
});

window.onload = function () {
  const uiSelectionStyle = document.createElement("style");
  uiSelectionStyle.id = "sentinelUiStyle";
  uiSelectionStyle.textContent = `
    body, body * {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    input, textarea, [contenteditable="true"] {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
    *, *:hover {
      cursor: url('crosshair4m.png') 16 16, crosshair !important;
    }
    button {
      transition: transform 0.08s ease, filter 0.12s ease, box-shadow 0.12s ease;
      will-change: transform;
    }
    button:hover {
      filter: brightness(1.08);
    }
    button:active {
      transform: translateY(1px) scale(0.98);
      filter: brightness(0.94);
    }
    .protocol-database-card .upgrade-btn,
    .protocol-database-card .downgrade-btn,
    .protocol-database-card .upgrade-btn:active,
    .protocol-database-card .downgrade-btn:active {
      transform: none !important;
      transition: none !important;
      will-change: auto;
    }
    .protocol-database-card .upgrade-btn:hover,
    .protocol-database-card .downgrade-btn:hover {
      filter: none !important;
    }
    button:focus-visible {
      outline: 2px solid #00ffdd;
      outline-offset: 2px;
    }
    .protocol-database-card:focus-visible {
      outline: 2px solid #00ffdd;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(uiSelectionStyle);

  // Loading/Menu screen state
  let showLoadingScreen = true;
  let showMenuScreen = false;
  const MENU_FADE_DURATION = 220;
  const LOOT_XRAY_SIDE_DISTANCE = 35;
  const LOOT_XRAY_TOP_DISTANCE = 80;
  const LOOT_XRAY_BOTTOM_DISTANCE = 58;
  const LOOT_XRAY_CORNER_SIDE_DISTANCE = 110;
  const LOOT_XRAY_CORNER_TOP_DISTANCE = 150;
  const LOOT_XRAY_CORNER_BOTTOM_DISTANCE = 120;
  const GAME_CANVAS_WIDTH = 1024;
  const GAME_CANVAS_HEIGHT = 768;
  const GAME_DISPLAY_VERTICAL_MARGIN = 30;
  const GAME_DISPLAY_WIDTH = GAME_CANVAS_WIDTH - LOOT_XRAY_CORNER_SIDE_DISTANCE * 2;
  const GAME_DISPLAY_HEIGHT = GAME_CANVAS_HEIGHT - LOOT_XRAY_TOP_DISTANCE - LOOT_XRAY_BOTTOM_DISTANCE - GAME_DISPLAY_VERTICAL_MARGIN * 2;
  const GAME_DISPLAY_OFFSET_Y = LOOT_XRAY_TOP_DISTANCE + GAME_DISPLAY_VERTICAL_MARGIN + GAME_DISPLAY_HEIGHT / 2 - GAME_CANVAS_HEIGHT / 2;
  const GAME_STAGE_WIDTH = 1365;
  const GAME_STAGE_HEIGHT = 768;
  const TITLE_SCREEN_IMAGE_SRC = "titlescreen_img2.png";
  const TOOLTIP_HOVER_DELAY_MS = 2000;
  const SENTINEL_TITLE_STYLE = "position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:2;margin:0;color:#eaffff;font-size:48px;font-weight:800;letter-spacing:.16em;text-align:center;text-shadow:0 0 24px #00d9ff,0 3px 8px #000;pointer-events:none;white-space:nowrap;";
  const SELECTION_TITLE_STYLE = "position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:2;margin:0;color:#eaffff;font-size:30px;font-weight:800;letter-spacing:.16em;text-align:center;text-shadow:0 0 24px #00d9ff,0 3px 8px #000;pointer-events:none;white-space:nowrap;";

  function configureDisplayOverlay(element, zIndex = 10) {
    element.style.position = "fixed";
    element.style.left = "50%";
    element.style.top = "calc(50% + var(--game-display-offset-y, 0px))";
    element.style.width = `${GAME_DISPLAY_WIDTH}px`;
    element.style.height = `${GAME_DISPLAY_HEIGHT}px`;
    element.style.transform = "translate(-50%, -50%) scale(var(--game-stage-scale, 1))";
    element.style.transformOrigin = "center";
    element.style.boxSizing = "border-box";
    element.style.overflow = "hidden";
    element.style.zIndex = String(zIndex);
  }

  const QUICK_LOADING_FLASH_DURATION = 320;
  const MENU_LOADING_FLASH_DURATION = 1000;
  let loadingFlashElement = null;
  let loadingFlashTimer = null;
  let loadingFlashPulseTimer = null;
  let loadingFlashPersistent = false;

  function ensureLoadingFlashElement() {
    if (!loadingFlashElement) {
      loadingFlashElement = document.createElement("img");
      loadingFlashElement.id = "sentinelCinematicLoadingFlash";
      loadingFlashElement.src = encodeURI("lidhud2_16x9_flash.png");
      loadingFlashElement.alt = "";
      loadingFlashElement.setAttribute("aria-hidden", "true");
      loadingFlashElement.style.cssText = `position:fixed;left:50%;top:50%;width:${GAME_STAGE_WIDTH}px;height:${GAME_STAGE_HEIGHT}px;transform:translate(-50%,-50%) scale(var(--game-stage-scale,1));transform-origin:center;object-fit:contain;display:block;pointer-events:none;user-select:none;z-index:2147483647;`;
      document.body.appendChild(loadingFlashElement);
    }
  }

  function scheduleLoadingFlashPulse() {
    loadingFlashPulseTimer = window.setTimeout(() => {
      if (!loadingFlashElement) return;
      loadingFlashElement.style.opacity = "1";
      loadingFlashPulseTimer = window.setTimeout(() => {
        if (!loadingFlashElement) return;
        loadingFlashElement.style.opacity = "0.15";
        scheduleLoadingFlashPulse();
      }, 110 + Math.random() * 120);
    }, 15 + Math.random() * 20);
  }

  function triggerLoadingFlash(persistent = false, duration = QUICK_LOADING_FLASH_DURATION) {
    ensureLoadingFlashElement();
    if (loadingFlashTimer !== null) {
      clearTimeout(loadingFlashTimer);
      loadingFlashTimer = null;
    }
    if (loadingFlashPulseTimer !== null) {
      clearTimeout(loadingFlashPulseTimer);
      loadingFlashPulseTimer = null;
    }
    loadingFlashPersistent = loadingFlashPersistent || persistent;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      loadingFlashElement.style.opacity = "1";
      return;
    }
    loadingFlashElement.style.opacity = "0.15";
    scheduleLoadingFlashPulse();
    if (!loadingFlashPersistent) {
      const flashDuration = Number.isFinite(duration) ? Math.max(0, duration) : QUICK_LOADING_FLASH_DURATION;
      loadingFlashTimer = window.setTimeout(() => {
        if (loadingFlashPulseTimer !== null) {
          clearTimeout(loadingFlashPulseTimer);
          loadingFlashPulseTimer = null;
        }
        loadingFlashElement.style.opacity = "1";
        loadingFlashTimer = null;
        loadingFlashPersistent = false;
      }, flashDuration);
    }
  }

  function stopLoadingFlash() {
    if (loadingFlashTimer !== null) {
      clearTimeout(loadingFlashTimer);
      loadingFlashTimer = null;
    }
    if (loadingFlashElement) {
      loadingFlashElement.style.opacity = "1";
    }
    if (loadingFlashPulseTimer !== null) {
      clearTimeout(loadingFlashPulseTimer);
      loadingFlashPulseTimer = null;
    }
    loadingFlashPersistent = false;
  }

  window._triggerLoadingFlash = (duration = QUICK_LOADING_FLASH_DURATION) => {
    triggerLoadingFlash(false, duration);
  };
  if (window._sentinelPendingStorageFlash) {
    delete window._sentinelPendingStorageFlash;
    window._triggerLoadingFlash();
  }

  ensureLoadingFlashElement();

  function fadeMenuElementsIn(elements) {
    elements.forEach((element) => {
      element.style.pointerEvents = "";
      element.dataset.fadingOut = "false";
    });
    requestAnimationFrame(() => {
      elements.forEach((element) => {
        element.style.opacity = "1";
      });
    });
  }

  function fadeMenuElementsOut(elements, onComplete) {
    if (elements.some((element) => element.dataset.fadingOut === "true")) return;
    elements.forEach((element) => {
      element.dataset.fadingOut = "true";
      element.style.pointerEvents = "none";
      element.style.opacity = "0";
    });
    window.setTimeout(onComplete, MENU_FADE_DURATION);
  }

  // Create loading overlay elements
  const loadingOverlay = document.createElement("div");
  loadingOverlay.id = "loadingOverlay";
  configureDisplayOverlay(loadingOverlay);
  loadingOverlay.style.background = "transparent";
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.flexDirection = "column";
  loadingOverlay.style.justifyContent = "center";
  loadingOverlay.style.alignItems = "center";
  const titleScreenImage = document.createElement("img");
  titleScreenImage.src = TITLE_SCREEN_IMAGE_SRC;
  titleScreenImage.alt = "";
  titleScreenImage.style.cssText = "position:absolute;left:50%;top:50%;width:50%;height:50%;transform:translate(-50%,-50%);object-fit:contain;object-position:center;pointer-events:none;z-index:0;";
  titleScreenImage.style.opacity = "0.85";
  loadingOverlay.appendChild(titleScreenImage);
  const loadingTitle = document.createElement("h1");
  loadingTitle.textContent = "SENTINEL";
  loadingTitle.style.cssText = SENTINEL_TITLE_STYLE;
  loadingOverlay.appendChild(loadingTitle);
  // Continue button (bottom, subtle)
  const continueBtn = document.createElement("div");
  continueBtn.textContent = "Click to continue";
  continueBtn.style.position = "absolute";
  continueBtn.style.bottom = "40px";
  continueBtn.style.left = "50%";
  continueBtn.style.transform = "translateX(-50%)";
  continueBtn.style.fontSize = "1.2rem";
  continueBtn.style.padding = "0.5rem 1.5rem";
  continueBtn.style.background = "transparent";
  continueBtn.style.color = "#fff";
  continueBtn.style.borderRadius = "8px";
  continueBtn.style.opacity = "0.7";
  continueBtn.style.transition = `opacity ${MENU_FADE_DURATION}ms ease`;
  continueBtn.style.zIndex = 2;
  continueBtn.style.pointerEvents = "none";
  loadingOverlay.appendChild(continueBtn);
  document.body.appendChild(loadingOverlay);
  // Continue on any click
  loadingOverlay.addEventListener("click", function() {
    loadingOverlay.style.pointerEvents = "none";
    fadeMenuElementsOut([continueBtn], () => {
      loadingOverlay.remove();
      showLoadingScreen = false;
      showMenuScreen = true;
      playMenuMusic();
      showMenu();
    });
  });
  const introCinematicSlides = [
    {
      text: "SENTINEL INITIALIZATION // 01\nBoot sequence .......... COMPLETED\nSystem Diagnostic ...... PASS\nCombat Subsystems ...... READY",
      duration: 3500
    },
    {
      text: "OPERATOR CONFIGURATION // 02\nRun parameters .......... ACCEPTED\nCombat profile .......... LOADING\nAwaiting protocol manifest...",
      duration: 3500
    },
    {
      text: "",
      protocolManifest: true,
      duration: 3500
    },
    {
      text: "",
      trialFinale: true,
      duration: 3500
    }
  ];

  function showIntroCinematic(onComplete) {
    let currentSlide = 0;
    let currentText = "";
    const cinematicAudio = new Audio(encodeURI("samuelfjohanns-computer-processing-sound-effect-01-122131.mp3"));
    cinematicAudio.loop = true;
    setMusicLevel(cinematicAudio, window.sentinelVolume && window.sentinelVolume.cinematic !== undefined
      ? window.sentinelVolume.cinematic
      : 0.35);
    window._cinematicMusicAudio = cinematicAudio;
    let timerId;
    let transitionId;
    let typewriterId;
    let progressFrameId;
    let finished = false;
    let transitionPending = false;
    let writingComplete = false;

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Sentinel opening cinematic");
    configureDisplayOverlay(overlay, 11);
    overlay.style.cssText += "background:transparent;color:#e8fbff;font-family:Arial,sans-serif;";
    const cinematicBackdrop = document.createElement("div");
    cinematicBackdrop.style.cssText = "position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity 700ms ease;z-index:10;";
    const cinematicFont = "'Cascadia Code','Cascadia Mono','Lucida Console',Consolas,monospace";

    const header = document.createElement("div");
    header.style.cssText = `position:absolute;top:24px;left:24px;right:24px;box-sizing:border-box;padding:10px 12px;border-radius:4px;background:transparent;box-shadow:none;display:flex;justify-content:space-between;align-items:center;gap:16px;color:#8cecff;font-family:${cinematicFont};font-size:13px;font-weight:bold;letter-spacing:.16em;text-shadow:0 0 8px rgba(0,191,255,.7);`;
    header.style.transition = "opacity 450ms ease";
    const designation = document.createElement("span");
    designation.textContent = "SENTINEL // SYSTEM INITIALIZATION";
    const slideNumber = document.createElement("span");
    header.append(designation, slideNumber);
    overlay.appendChild(header);

    const caption = document.createElement("div");
    caption.style.cssText = "position:absolute;left:10%;right:10%;top:92px;bottom:120px;box-sizing:border-box;padding:16px 18px;border-radius:0;background:transparent;box-shadow:none;text-shadow:0 2px 14px rgba(0,0,0,.95);display:flex;flex-direction:column;overflow:hidden;";
    const consoleCursorStyle = document.createElement("style");
    consoleCursorStyle.textContent = "@keyframes sentinelCinematicCursor{50%{opacity:0}}#sentinelCinematicText::after{content:'_';color:#00d9ff;animation:sentinelCinematicCursor .8s steps(1) infinite;}";
    document.head.appendChild(consoleCursorStyle);
    const eyebrow = document.createElement("div");
    eyebrow.textContent = "COMBAT SYSTEMS DIVISION";
    eyebrow.style.cssText = `margin-bottom:14px;color:#72e8ef;font-family:${cinematicFont};font-size:13px;font-weight:bold;letter-spacing:.14em;text-shadow:0 0 7px rgba(66,231,255,.45);`;
    const text = document.createElement("div");
    text.id = "sentinelCinematicText";
    text.setAttribute("aria-live", "polite");
    text.style.cssText = `flex:1;min-height:0;overflow:hidden;color:#d2f7f0;font-family:${cinematicFont};font-size:11.5px;font-weight:500;line-height:1.55;letter-spacing:.025em;text-shadow:0 0 7px rgba(0,217,255,.32);white-space:pre-wrap;`;
    caption.append(eyebrow, text);
    overlay.appendChild(caption);
    let currentParagraph = null;

    const footer = document.createElement("div");
    footer.style.cssText = "position:absolute;left:24px;right:24px;bottom:24px;box-sizing:border-box;padding:8px 10px;border-radius:0;background:transparent;box-shadow:none;display:flex;align-items:center;gap:18px;";
    footer.style.transition = "opacity 450ms ease";
    const progressTrack = document.createElement("div");
    progressTrack.style.cssText = "height:2px;flex:1;background:rgba(180,230,245,.35);";
    const progress = document.createElement("div");
    progress.style.cssText = "height:100%;width:0;background:#39eaff;box-shadow:0 0 12px #00cfff;";
    progressTrack.appendChild(progress);

    const skipButton = document.createElement("button");
    skipButton.type = "button";
    skipButton.setAttribute("aria-label", "Hold to skip to the launch sequence");
    skipButton.style.cssText = `position:relative;overflow:hidden;padding:12px 12px 14px;border:0;background:transparent;color:rgba(230,248,255,.86);font-family:${cinematicFont};font-size:12px;font-weight:bold;letter-spacing:.1em;cursor:pointer;`;
    const skipLabel = document.createElement("span");
    skipLabel.textContent = "Skip";
    const skipHoldProgress = document.createElement("span");
    skipHoldProgress.style.cssText = "position:absolute;left:0;bottom:0;width:0;height:2px;background:#39eaff;box-shadow:0 0 10px #00cfff;pointer-events:none;";
    skipButton.append(skipLabel, skipHoldProgress);
    footer.append(progressTrack, skipButton);
    overlay.appendChild(footer);

    let skipHoldTimer;
    let skipHoldActive = false;
    let skipHoldSource = null;
    const SKIP_HOLD_DURATION = 900;

    const clearTimers = () => {
      clearTimeout(timerId);
      clearTimeout(transitionId);
      clearTimeout(skipHoldTimer);
      clearInterval(typewriterId);
      cancelAnimationFrame(progressFrameId);
      skipHoldTimer = null;
      skipHoldActive = false;
      skipHoldSource = null;
    };

    const cancelSkipHold = (source) => {
      if (!skipHoldActive || skipHoldSource !== source) return;
      clearTimeout(skipHoldTimer);
      skipHoldTimer = null;
      skipHoldActive = false;
      skipHoldSource = null;
      skipHoldProgress.style.transition = "none";
      skipHoldProgress.style.width = "0";
    };

    const startSkipHold = (source, event) => {
      event.preventDefault();
      event.stopPropagation();
      if (finished || skipHoldActive) return;

      skipHoldActive = true;
      skipHoldSource = source;
      skipHoldProgress.style.transition = "none";
      skipHoldProgress.style.width = "0";
      skipButton.offsetWidth;
      skipHoldProgress.style.transition = `width ${SKIP_HOLD_DURATION}ms linear`;
      skipHoldProgress.style.width = "100%";

      if (source === "pointer" && skipButton.setPointerCapture) {
        skipButton.setPointerCapture(event.pointerId);
      }

      skipHoldTimer = setTimeout(() => {
        skipHoldTimer = null;
        skipHoldActive = false;
        skipHoldSource = null;
        finish();
      }, SKIP_HOLD_DURATION);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimers();
      cinematicAudio.pause();
      if (window._cinematicMusicAudio === cinematicAudio) window._cinematicMusicAudio = null;
      stopLoadingFlash();
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("click", handleAdvanceInteraction);
      consoleCursorStyle.remove();
      cinematicBackdrop.style.transition = "opacity 350ms ease";
      cinematicBackdrop.style.opacity = "0";
      overlay.style.transition = "opacity 350ms ease";
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.remove();
        cinematicBackdrop.remove();
        onComplete();
        runMenuTouchButtonReady = true;
      }, 350);
    };

    const completeWriting = () => {
      if (writingComplete || !currentParagraph) return;
      clearInterval(typewriterId);
      currentParagraph.textContent = `> ${currentText}`;
      text.scrollTop = text.scrollHeight;
      writingComplete = true;
    };

    const renderSlide = () => {
      const slide = introCinematicSlides[currentSlide];
      if (finished || !slide) return;
      const trialLabel = String(completedTrialRuns + 1).padStart(2, "0");
      const selectedProtocols = Array.isArray(window._pendingStarterProtocols)
        ? window._pendingStarterProtocols.filter(name => typeof name === "string").slice(0, 2)
        : [];
      const protocolLoadLines = selectedProtocols.length
        ? selectedProtocols.map((name, index) =>
          `SLOT ${String(index + 1).padStart(2, "0")} // ${name}\n     LOAD STATUS ........ INITIALIZED`
        ).join("\n")
        : "STARTER SLOTS ......... EMPTY\nPROTOCOL BUS .......... STANDBY";
      const slideText = slide.trialFinale
        ? `DEPLOYMENT AUTHORIZATION // 04\nTrial ${trialLabel} commencing.\nCombat systems ........ ONLINE\nDeployment status ..... AUTHORIZED`
        : slide.protocolManifest
        ? `PROTOCOL MANIFEST // 03 (LOADING)\n${protocolLoadLines}\nStat modifiers ......... APPLIED\nCombat link ............ ONLINE`
        : slide.text;
      clearInterval(typewriterId);
      currentText = slideText;
      writingComplete = false;
      currentParagraph = document.createElement("div");
      currentParagraph.style.flex = "0 0 auto";
      currentParagraph.style.marginBottom = "16px";
      text.appendChild(currentParagraph);
      text.scrollTop = text.scrollHeight;
      slideNumber.textContent = `BOOT SEQUENCE ${String(currentSlide + 1).padStart(2, "0")} / ${String(introCinematicSlides.length).padStart(2, "0")}`;
      const slideStart = (currentSlide / introCinematicSlides.length) * 100;
      const slideEnd = ((currentSlide + 1) / introCinematicSlides.length) * 100;
      progress.style.transition = "none";
      progress.style.width = `${slideStart}%`;
      progressTrack.offsetWidth;
      cancelAnimationFrame(progressFrameId);
      progressFrameId = requestAnimationFrame(() => {
        progress.style.transition = `width ${slide.duration}ms linear`;
        progress.style.width = `${slideEnd}%`;
      });
      let typedCharacters = 0;
      const typingInterval = Math.min(42, Math.max(12, (slide.duration * 0.45) / slideText.length));
      currentParagraph.textContent = "> ";
      typewriterId = setInterval(() => {
        typedCharacters += 1;
        currentParagraph.textContent = `> ${slideText.slice(0, typedCharacters)}`;
        text.scrollTop = text.scrollHeight;
        if (typedCharacters >= slideText.length) {
          clearInterval(typewriterId);
          writingComplete = true;
        }
      }, typingInterval);

      timerId = setTimeout(advance, slide.duration);
    };

    const advance = () => {
      if (finished || transitionPending) return;
      clearTimeout(timerId);
      clearInterval(typewriterId);
      if (currentSlide === introCinematicSlides.length - 1) {
        finish();
        return;
      }
      transitionPending = true;
      transitionId = setTimeout(() => {
        transitionId = null;
        if (finished) return;
        currentSlide += 1;
        transitionPending = false;
        renderSlide();
      }, 80);
    };

    function handleAdvanceInteraction() {
      if (finished || transitionPending) return;
      if (!writingComplete) {
        completeWriting();
      } else {
        advance();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      } else if (event.target === skipButton && (event.key === "Enter" || event.key === " ")) {
        startSkipHold("keyboard", event);
      } else if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
        event.preventDefault();
        handleAdvanceInteraction();
      }
    }

    function handleKeyUp(event) {
      if (event.key === "Enter" || event.key === " ") cancelSkipHold("keyboard");
    }

    skipButton.addEventListener("pointerdown", event => startSkipHold("pointer", event));
    skipButton.addEventListener("pointerup", () => cancelSkipHold("pointer"));
    skipButton.addEventListener("pointercancel", () => cancelSkipHold("pointer"));
    skipButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
    });
    setTimeout(() => {
      if (finished) return;
      document.addEventListener("click", handleAdvanceInteraction);
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
    }, 0);
    document.body.appendChild(cinematicBackdrop);
    document.body.appendChild(overlay);
    triggerLoadingFlash(true);
    cinematicAudio.play().catch(error => console.warn("Cinematic audio playback failed:", error));
    requestAnimationFrame(() => {
      if (!finished) cinematicBackdrop.style.opacity = "0.92";
    });
    renderSlide();
    skipButton.focus();
  }

  // Menu screen
  function startGame(difficulty, startStatPoints, startHealth) {
    runMenuTouchButtonReady = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.visibility = "visible";
    hudXrayCtx.clearRect(0, 0, hudXrayCanvas.width, hudXrayCanvas.height);
    hudXrayCanvas.style.visibility = "visible";
    setHudStatus("INITIALIZING", 3, "initializing");
    fadeOutMenuMusic();
    showIntroCinematic(() => beginGame(difficulty, startStatPoints, startHealth));
  }

  function beginGame(difficulty, startStatPoints, startHealth) {
    stopVictoryMusic();
    window._editorSessionActive = false;
    window.sentinelDifficulty = difficulty;
    // Reset tutorial in-game hooks so they re-fire on each new run
    window._tutFirstLevelUpFired = false;
    window._tutFirstProtPickupFired = false;
    window._tutStatPanelAutoOpened = false;
    window._tutFirstProtActivatedFired = false;
    window._newlyPickedProtocols = new Set();
    window._seenProtocols = new Set();
    runDeathCounted = false;
    const isRestrictedDifficulty = difficulty === "Hardcore";
    if (!isRestrictedDifficulty) {
      ProtocolSystem.setStarters(window._pendingStarterProtocols || []);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.visibility = "visible";
    hudXrayCanvas.style.visibility = "visible";
    showMenuScreen = false;
    window._bossMusicallyActive = false;
    stopBossMusic();
    stopLowHealthSound();
    playGameMusic();
    restartGame();
    statPoints = startStatPoints;
    player.health = player.maxHealth = startHealth;
    
    // Initialize timeline codes for waves 1-15 from default codes
    if (window.SentinelWaveControl && typeof window.SentinelWaveControl.getWaveEditorCodes === "function") {
      const allCodes = window.SentinelWaveControl.getWaveEditorCodes();
      if (window.SentinelEditor && typeof window.SentinelEditor.decodeWaveCode === "function") {
        for (let w = 1; w <= 15; w++) {
          const code = allCodes[w];
          if (code && !window._editorWaveOverride?.[w]) {
            try {
              const decoded = window.SentinelEditor.decodeWaveCode(code);
              const waveCfg = decoded[w];
              if (waveCfg && waveCfg.timelineMode && waveCfg.timeline) {
                window._editorWaveOverride = window._editorWaveOverride || {};
                window._editorWaveOverride[w] = {
                  timelineMode: true,
                  timeline: waveCfg.timeline,
                  _source: 'gameStartup'
                };
              }
            } catch (err) {
            }
          }
        }
      }
    }
    
    // Set starting wave and level based on player selection
    if (window._selectedStartWave !== undefined) {
      wave = window._selectedStartWave;
      runWavesCleared = Math.max(0, wave - 1);
      runStartWaves = runWavesCleared;
      if (window._selectedStartLevel !== undefined) {
        level = window._selectedStartLevel;
        // Calculate xpToLevel based on current level using the game formula
        xpToLevel = Math.floor(10 + Math.pow(level, 1.8));
        statPoints = Math.max(0, startStatPoints + (level - 1) * 2);
      }
    }
    
    spawnWave();
    gameStarted = true;
    hudFrameOverlay.style.display = "block";
    hudWaveDisplay.style.display = "block";
    // Intro animation phase
    window._introPhase = "animating";
    window._introStartTime = performance.now();
    window._introBaseX = player.x;
    window._introBaseY = player.y;
    window._introParticles = [];
    followMouse = false;
    paused = true;
    showStats = false;
    // Play teleport sound
    try {
      const _introSfx = new Audio('yodguard-energy-beam-blast-4-482514.mp3');
      _introSfx.volume = window.sentinelVolume && window.sentinelVolume.teleport !== undefined ? window.sentinelVolume.teleport : 0.7;
      _introSfx.play().catch(() => {});
    } catch (e) {}
  }
  function getProtocolRarityColor(rarity, tier) {
    if (rarity === "Common") {
      if (tier === "Lower")    return "#c8c8c8";
      if (tier === "Standard") return "#44ee66";
      if (tier === "Higher")   return "#4499ff";
      return "#44ee66";
    }
    if (rarity === "Rare") {
      if (tier === "Lower")    return "#4499ff";
      if (tier === "Standard") return "#aa44ff";
      if (tier === "Higher")   return "#ff8833";
      return "#aa44ff";
    }
    return "#c8c8c8";
  }
  function getProtocolRarityBackgroundColor(rarity, tier) {
    const color = getProtocolRarityColor(rarity, tier).slice(1);
    const red = parseInt(color.slice(0, 2), 16);
    const green = parseInt(color.slice(2, 4), 16);
    const blue = parseInt(color.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, 0.32)`;
  }
  function getProtocolRarityName(rarity, tier) {
    const rarityNames = {
      Common: { Lower: "Lesser", Standard: "Common", Higher: "Uncommon" },
      Rare: { Lower: "Rare", Standard: "Epic", Higher: "Legendary" }
    };
    return rarityNames[rarity]?.[tier] || `${rarity} ${tier}`;
  }
  function getProtocolRarityEdgeColor(rarity, tier) {
    if (rarity === "Common") {
      if (tier === "Lower")    return "#666666";
      if (tier === "Standard") return "#1a6630";
      if (tier === "Higher")   return "#1a3388";
      return "#1a6630";
    }
    if (rarity === "Rare") {
      if (tier === "Lower")    return "#1a3388";
      if (tier === "Standard") return "#551188";
      if (tier === "Higher")   return "#884400";
      return "#551188";
    }
    return "#666666";
  }
  function showStarterProtocolModal(difficulty, startStatPoints, startHealth, source = "wave") {
    triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
    const discoveredProtocols = ProtocolSystem.getDiscovered();
    const isProtocolDatabase = source === "mainMenu";
    const starterOverlay = document.createElement("div");
    starterOverlay.id = "starterProtocolOverlay";
    configureDisplayOverlay(starterOverlay);
    const protocolPanelHeight = GAME_DISPLAY_HEIGHT + GAME_DISPLAY_VERTICAL_MARGIN - 15;
    const protocolPanelOffset = GAME_DISPLAY_OFFSET_Y + (protocolPanelHeight - GAME_DISPLAY_HEIGHT) / 2;
    starterOverlay.style.height = `${protocolPanelHeight}px`;
    starterOverlay.style.top = `calc(50% + ${protocolPanelOffset}px)`;
    starterOverlay.style.background = "transparent";
    starterOverlay.style.display = "flex";
    starterOverlay.style.flexDirection = "column";
    starterOverlay.style.justifyContent = "center";
    starterOverlay.style.alignItems = "center";
    const panel = document.createElement("div");
    panel.style.width = "100%";
    panel.style.maxWidth = `${GAME_DISPLAY_WIDTH}px`;
    panel.style.height = "100%";
    panel.style.maxHeight = "none";
    panel.style.background = "transparent";
    panel.style.border = "0";
    panel.style.borderRadius = "0";
    panel.style.boxShadow = "none";
    panel.style.position = "absolute";
    panel.style.top = "0";
    panel.style.bottom = "auto";
    panel.style.left = "50%";
    panel.style.transform = "translateX(-50%)";
    panel.style.boxSizing = "border-box";
    panel.style.zIndex = 2;
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.padding = "4px 12px 0";
    starterOverlay.appendChild(panel);

    const title = document.createElement("h2");
    title.textContent = source === "mainMenu" ? "PROTOCOLS DATABASE" : "SELECT YOUR STARTER PROTOCOLS";
    title.style.cssText = SELECTION_TITLE_STYLE;
    title.style.fontSize = "26px";
    title.style.position = "relative";
    title.style.top = "auto";
    title.style.left = "auto";
    title.style.right = "auto";
    title.style.width = "100%";
    title.style.transform = "none";
    title.style.flex = "0 0 auto";
    title.style.margin = "0 0 4px";
    title.style.lineHeight = "1.2";
    title.style.willChange = "transform";
    title.style.overflowAnchor = "none";
    title.style.textShadow = "0 0 8px #00d9ff, 0 3px 8px #000";
    panel.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.textContent = "Choose up to 2 discovered protocols to start your run with.";
    subtitle.setAttribute('data-protocol-subtitle', 'true');
    subtitle.style.color = "#aaf6ff";
    subtitle.style.fontSize = "0.85rem";
    subtitle.style.textAlign = "center";
    subtitle.style.marginBottom = "4px";
    panel.appendChild(subtitle);

    const statusRow = document.createElement("div");
    statusRow.style.display = "flex";
    statusRow.style.justifyContent = "space-between";
    statusRow.style.alignItems = "center";
    statusRow.style.gap = "12px";
    statusRow.style.marginBottom = "4px";
    panel.appendChild(statusRow);

    // Add bytes display
    const bytesDisplay = document.createElement("div");
    bytesDisplay.style.color = "#00d9ff";
    bytesDisplay.style.textAlign = "left";
    bytesDisplay.style.fontSize = "0.82rem";
    bytesDisplay.style.fontWeight = "bold";
    const updateProtocolDataDisplays = () => {
      bytesDisplay.textContent = `Data: ${formatByteAmount(totalCollectedBytes || 0)} / ${formatByteAmount(ProtocolSystem.getTotalUpgradeData())}`;
    };
    updateProtocolDataDisplays();
    statusRow.appendChild(bytesDisplay);

    const selectionCount = document.createElement("div");
    selectionCount.style.color = "#00d9ff";
    selectionCount.style.textAlign = "right";
    selectionCount.style.fontSize = "0.82rem";
    statusRow.appendChild(selectionCount);

    // Add total stat change display
    const totalStatDiv = document.createElement("div");
    totalStatDiv.style.color = "#aaf6ff";
    totalStatDiv.style.textAlign = "center";
    totalStatDiv.style.marginBottom = "4px";
    totalStatDiv.style.fontSize = "0.78rem";
    totalStatDiv.style.whiteSpace = "nowrap";
    totalStatDiv.style.overflow = "hidden";
    totalStatDiv.style.textOverflow = "ellipsis";
    totalStatDiv.setAttribute('data-stat-total', 'true');
    panel.appendChild(totalStatDiv);

    const content = document.createElement("div");
    content.style.flex = "1";
    content.style.minWidth = "0";
    content.style.minHeight = "0";
    content.style.overflowY = "auto";
    content.style.scrollbarGutter = "stable";
    content.style.overflowAnchor = "none";
    content.style.border = "0";
    content.style.borderRadius = "0";
    content.style.padding = "6px 4px";
    content.classList.add("scrollbar-themed");
    panel.appendChild(content);

    // Modal helper functions
    function showUpgradeConfirmModal(message, onConfirm, isDowngrade = false) {
      const confirmOverlay = document.createElement("div");
      configureDisplayOverlay(confirmOverlay, 15);
      confirmOverlay.style.background = "rgba(0, 0, 0, 0.74)";
      confirmOverlay.style.display = "flex";
      confirmOverlay.style.alignItems = "center";
      confirmOverlay.style.justifyContent = "center";

      const confirmPanel = document.createElement("div");
      confirmPanel.style.width = "min(460px, calc(100% - 48px))";
      confirmPanel.style.background = "rgba(0, 20, 30, 0.98)";
      confirmPanel.style.border = "1px solid rgba(0, 217, 255, 0.45)";
      confirmPanel.style.borderRadius = "4px";
      confirmPanel.style.boxShadow = "0 0 20px rgba(0, 217, 255, 0.16)";
      confirmPanel.style.padding = "16px";
      confirmPanel.style.color = "#c8ffff";
      confirmPanel.style.fontFamily = "sans-serif";
      confirmOverlay.appendChild(confirmPanel);

      const confirmMsg = document.createElement("div");
      confirmMsg.textContent = message;
      confirmMsg.style.color = "#aaf6ff";
      confirmMsg.style.fontSize = "0.95rem";
      confirmMsg.style.lineHeight = "1.4";
      confirmMsg.style.marginBottom = "14px";
      confirmPanel.appendChild(confirmMsg);

      const actionRow = document.createElement("div");
      actionRow.style.display = "flex";
      actionRow.style.justifyContent = "flex-end";
      actionRow.style.gap = "8px";
      confirmPanel.appendChild(actionRow);

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.padding = "0.5rem 0.85rem";
      cancelBtn.style.borderRadius = "6px";
      cancelBtn.style.border = "1px solid rgba(0,217,255,0.55)";
      cancelBtn.style.background = "rgba(0,20,30,0.72)";
      cancelBtn.style.color = "#8cecff";
      cancelBtn.style.cursor = "pointer";
      actionRow.appendChild(cancelBtn);

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.textContent = isDowngrade ? "Downgrade" : "Upgrade";
      confirmBtn.style.padding = "0.5rem 0.85rem";
      confirmBtn.style.borderRadius = "6px";
      confirmBtn.style.border = "1px solid rgba(0,217,255,0.7)";
      confirmBtn.style.background = "rgba(0,20,30,0.72)";
      confirmBtn.style.color = "#8cecff";
      confirmBtn.style.cursor = "pointer";
      actionRow.appendChild(confirmBtn);

      let resolved = false;
      const closeModal = (confirmed) => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener("keydown", onKeyDown);
        confirmOverlay.remove();
        if (confirmed && typeof onConfirm === "function") {
          onConfirm();
        }
      };

      const onKeyDown = (evt) => {
        if (evt.key === "Escape") {
          closeModal(false);
        }
      };

      cancelBtn.addEventListener("click", () => closeModal(false));
      confirmBtn.addEventListener("click", () => closeModal(true));
      confirmOverlay.addEventListener("click", (evt) => {
        if (evt.target === confirmOverlay) {
          closeModal(false);
        }
      });
      document.addEventListener("keydown", onKeyDown);
      document.body.appendChild(confirmOverlay);
    }

    function showUpgradeInfoModal(titleText, message) {
      const infoOverlay = document.createElement("div");
      configureDisplayOverlay(infoOverlay, 15);
      infoOverlay.style.background = "rgba(0, 0, 0, 0.74)";
      infoOverlay.style.display = "flex";
      infoOverlay.style.alignItems = "center";
      infoOverlay.style.justifyContent = "center";

      const infoPanel = document.createElement("div");
      infoPanel.style.width = "min(460px, calc(100% - 48px))";
      infoPanel.style.background = "rgba(0, 20, 30, 0.98)";
      infoPanel.style.border = "1px solid rgba(0, 217, 255, 0.45)";
      infoPanel.style.borderRadius = "4px";
      infoPanel.style.boxShadow = "0 0 20px rgba(0, 217, 255, 0.16)";
      infoPanel.style.padding = "16px";
      infoPanel.style.color = "#c8ffff";
      infoPanel.style.fontFamily = "sans-serif";
      infoOverlay.appendChild(infoPanel);

      const infoTitle = document.createElement("div");
      infoTitle.textContent = titleText;
      infoTitle.style.color = "#00d9ff";
      infoTitle.style.fontWeight = "bold";
      infoTitle.style.fontSize = "1.05rem";
      infoTitle.style.marginBottom = "10px";
      infoPanel.appendChild(infoTitle);

      const infoMessage = document.createElement("div");
      infoMessage.textContent = message;
      infoMessage.style.color = "#aaf6ff";
      infoMessage.style.fontSize = "0.95rem";
      infoMessage.style.lineHeight = "1.4";
      infoMessage.style.marginBottom = "14px";
      infoPanel.appendChild(infoMessage);

      const actionRow = document.createElement("div");
      actionRow.style.display = "flex";
      actionRow.style.justifyContent = "flex-end";
      actionRow.style.gap = "8px";
      infoPanel.appendChild(actionRow);

      const okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.textContent = "OK";
      okBtn.style.padding = "0.5rem 0.85rem";
      okBtn.style.borderRadius = "6px";
      okBtn.style.border = "1px solid rgba(0,217,255,0.7)";
      okBtn.style.background = "rgba(0,20,30,0.72)";
      okBtn.style.color = "#8cecff";
      okBtn.style.cursor = "pointer";
      actionRow.appendChild(okBtn);

      let resolved = false;
      const closeModal = () => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener("keydown", onKeyDown);
        infoOverlay.remove();
      };

      const onKeyDown = (evt) => {
        if (evt.key === "Escape" || evt.key === "Enter") {
          closeModal();
        }
      };

      okBtn.addEventListener("click", closeModal);
      infoOverlay.addEventListener("click", (evt) => {
        if (evt.target === infoOverlay) {
          closeModal();
        }
      });
      document.addEventListener("keydown", onKeyDown);
      document.body.appendChild(infoOverlay);
    }

    let selected = Array.isArray(ProtocolSystem.starterProtocols)
      ? ProtocolSystem.starterProtocols.filter(name => discoveredProtocols.includes(name)).slice(0, 2)
      : [];
    const refreshCount = () => {
      selectionCount.textContent = `Selected: ${selected.length}/2`;
      // Hide subtitle once 2 protocols are selected (unless tutorial forces it visible)
      const subtitleEl = panel.querySelector('[data-protocol-subtitle]');
      if (subtitleEl) subtitleEl.style.visibility = (selected.length >= 2 && !window._tutSubtitleForce) ? 'hidden' : 'visible';
      // Calculate and display total stat change for selected starters, with color
      const statTotals = { Range: 0, Power: 0, Intensity: 0, Movement: 0, Health: 0, Pickup: 0 };
      selected.forEach(protocolName => {
        const mods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
          ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
          : (PROTOCOLS[protocolName]?.statMods || {});
        Object.entries(mods).forEach(([stat, value]) => {
          if (statTotals.hasOwnProperty(stat)) statTotals[stat] += value;
        });
      });
      // Format the stat totals for display with color
      const statOrder = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
      const statStrings = statOrder.map(stat => {
        const v = statTotals[stat];
        let sign = v > 0 ? "+" : (v < 0 ? "" : "");
        return `<span style='color:#8cecff; font-weight:bold;'>${sign}${v} ${stat}</span>`;
      });
      totalStatDiv.innerHTML = `${statStrings.join(", ")}`;
    };

    if (discoveredProtocols.length === 0 && !isProtocolDatabase) {
      const noneMsg = document.createElement("div");
      noneMsg.textContent = "No protocols discovered yet. You will start your run with 0 starter protocols.";
      noneMsg.style.color = "#aaf6ff";
      noneMsg.style.textAlign = "center";
      noneMsg.style.padding = "24px";
      content.appendChild(noneMsg);
    } else {
      const rarityOrder = ["Lesser", "Common", "Uncommon", "Rare", "Epic", "Legendary"];
      const familyGroups = Object.fromEntries(
        ["Targeting", "Overdrive", "Utility"].map(family => [
          family,
          Object.fromEntries(rarityOrder.map(rarity => [rarity, []]))
        ])
      );
      const protocolNames = isProtocolDatabase ? Object.keys(PROTOCOLS) : discoveredProtocols;
      protocolNames.forEach(protocolName => {
        const proto = PROTOCOLS[protocolName];
        const rarityName = proto && getProtocolRarityName(proto.rarity, proto.tier);
        const rarityGroup = proto && familyGroups[proto.family]?.[rarityName];
        if (rarityGroup) {
          rarityGroup.push(
            isProtocolDatabase && !discoveredProtocols.includes(protocolName)
              ? null
              : protocolName
          );
        }
      });
      const raritySlotCounts = Object.fromEntries(rarityOrder.map(rarity => [
        rarity,
        Math.max(...Object.values(familyGroups).map(group => group[rarity].length))
      ]));
      const totalGridRows = 1 + rarityOrder.reduce((sum, rarity) => sum + raritySlotCounts[rarity], 0);

      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.width = "100%";
      grid.style.gridTemplateColumns = `repeat(${Object.keys(familyGroups).length}, minmax(0, 1fr))`;
      grid.style.gridTemplateRows = `repeat(${totalGridRows}, auto)`;
      grid.style.gridAutoFlow = "column";
      grid.style.alignItems = "stretch";
      grid.style.alignContent = "start";
      grid.style.height = "auto";
      grid.style.boxSizing = "border-box";
      grid.style.columnGap = "8px";
      grid.style.rowGap = "2px";
      content.appendChild(grid);

      Object.entries(familyGroups).forEach(([familyName, protocolsByRarity]) => {
        const familyColumn = document.createElement("div");
        familyColumn.style.display = "contents";
        grid.appendChild(familyColumn);

        const familyHeader = document.createElement("div");
        familyHeader.textContent = familyName;
        familyHeader.style.color = "#8cecff";
        familyHeader.style.fontSize = "0.78rem";
        familyHeader.style.fontWeight = "bold";
        familyHeader.style.letterSpacing = "0.08em";
        familyHeader.style.padding = "0 2px 3px";
        familyHeader.style.borderBottom = "1px solid rgba(0,217,255,0.35)";
        familyColumn.appendChild(familyHeader);

        rarityOrder.forEach(rarityName => {
          const protocols = protocolsByRarity[rarityName];
          for (let slot = 0; slot < raritySlotCounts[rarityName]; slot++) {
            const protocolName = protocols[slot];
            if (!protocolName) {
              const rarityGap = document.createElement("div");
              rarityGap.textContent = "MISSING DATA";
              rarityGap.setAttribute("role", "note");
              rarityGap.style.display = "flex";
              rarityGap.style.alignItems = "center";
              rarityGap.style.justifyContent = "center";
              rarityGap.style.minHeight = "84px";
              rarityGap.style.padding = "5px";
              rarityGap.style.boxSizing = "border-box";
              rarityGap.style.borderRadius = "4px";
              rarityGap.style.border = "1px dashed rgba(0, 217, 255, 0.28)";
              rarityGap.style.background = "rgba(4, 25, 42, 0.45)";
              rarityGap.style.color = "#66818a";
              rarityGap.style.fontSize = "0.72rem";
              rarityGap.style.fontWeight = "bold";
              rarityGap.style.letterSpacing = "0.12em";
              rarityGap.style.textAlign = "center";
              familyColumn.appendChild(rarityGap);
              continue;
            }
          const proto = PROTOCOLS[protocolName];
          const rawUpgradeTier = ProtocolSystem.protocolBoard[protocolName]?.upgradeTier;
          const upgradeTier = (typeof ProtocolSystem.normalizeUpgradeTier === "function")
            ? ProtocolSystem.normalizeUpgradeTier(rawUpgradeTier)
            : (rawUpgradeTier || (ProtocolSystem.upgradeTiers?.[0] || "Trivial"));
          const effectiveStarterMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
            ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
            : proto.statMods;
          const rarityBackgroundColor = getProtocolRarityBackgroundColor(proto.rarity, proto.tier);
          const card = document.createElement("div");
          card.classList.add("protocol-database-card");
          card.setAttribute("role", "button");
          card.setAttribute("aria-pressed", "false");
          card.tabIndex = 0;
          card.style.position = "relative";
          card.style.textAlign = "left";
          card.style.padding = "5px";
          card.style.borderRadius = "4px";
          card.style.border = "1px solid rgba(0, 217, 255, 0.38)";
          card.style.background = rarityBackgroundColor;
          card.style.color = "#c8f7ff";
          card.style.cursor = "pointer";
          card.style.transition = "border-color 0.15s ease, box-shadow 0.15s ease";
          card.style.minHeight = "84px";
          card.style.flex = "0 0 auto";
          card.style.minWidth = "0";
          card.style.display = "flex";
          card.style.flexDirection = "column";
          card.style.width = "100%";
          card.style.boxSizing = "border-box";

          const currentTierIndex = (typeof ProtocolSystem.getUpgradeTierIndex === "function")
            ? ProtocolSystem.getUpgradeTierIndex(upgradeTier)
            : 0;
          const totalTierCount = (Array.isArray(ProtocolSystem.upgradeTiers) && ProtocolSystem.upgradeTiers.length > 0)
            ? ProtocolSystem.upgradeTiers.length
            : 6;
          const nextUpgradeCost = (typeof ProtocolSystem.getNextUpgradeCost === "function")
            ? ProtocolSystem.getNextUpgradeCost(protocolName)
            : null;
          
          // Calculate downgrade refund: it's the cost to upgrade from previous tier to current
          let downgradeRefund = null;
          if (currentTierIndex > 0 && typeof ProtocolSystem.getNextUpgradeCost === "function") {
            const protocolState = ProtocolSystem.protocolBoard[protocolName];
            if (protocolState) {
              const currentTier = protocolState.upgradeTier;
              const prevTier = ProtocolSystem.upgradeTiers[currentTierIndex - 1];
              // Temporarily set to previous tier, get cost to upgrade from it
              protocolState.upgradeTier = prevTier;
              downgradeRefund = ProtocolSystem.getNextUpgradeCost(protocolName);
              // Restore original tier
              protocolState.upgradeTier = currentTier;
            }
          }

          const mods = Object.entries(effectiveStarterMods)
            .map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${k}`)
            .join(", ");

          card.innerHTML = `<div style="font-weight:bold; margin-bottom:2px; padding-right:40px; color:#8cecff; font-size:0.9rem; line-height:1.15;">${protocolName}</div>
                            <div style="display:flex; flex-direction:column; align-items:flex-start; gap:1px; padding-right:34px; min-height:28px; font-size:0.68rem; margin-bottom:2px;">
                              <span style="color:#8cecff;">${getProtocolRarityName(proto.rarity, proto.tier)}</span>
                              <span style="color:#aaf6ff; white-space:nowrap;" data-tier-info>${upgradeTier} (${currentTierIndex + 1}/${totalTierCount})</span>
                            </div>
                            <div style="font-size:0.75rem; color:#aaf6ff; line-height:1.15; min-height:1.15em; max-height:2.3em; overflow:hidden; margin-bottom:2px;">${proto.intent || "Unknown"}</div>
                            <div style="color:#8cecff; font-size:0.72rem; line-height:1.1; min-height:1.1em; max-height:2.2em; overflow:hidden; margin-bottom:3px;" data-mods>${mods || "No mods"}</div>
                            <div style="display:flex; gap:4px; margin-top:0;">
                              <button class="upgrade-btn" style="flex:1; min-width:0; min-height:34px; padding:2px 0.2rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; border-radius:3px; border:1px solid ${nextUpgradeCost === null ? "#34525c" : "rgba(0,217,255,0.7)"}; background:rgba(0,20,30,0.72); color:${nextUpgradeCost === null ? "#66818a" : "#8cecff"}; font-size:0.68rem; line-height:1.05; cursor:${nextUpgradeCost === null ? "default" : "pointer"}; opacity:${nextUpgradeCost === null ? "0.65" : "1"};"><span>Upgrade</span><span data-upgrade-cost>${nextUpgradeCost === null ? "MAX" : `-${formatByteAmount(nextUpgradeCost)}`}</span></button>
                              <button class="downgrade-btn" style="flex:1; min-width:0; min-height:34px; padding:2px 0.2rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; border-radius:3px; border:1px solid ${currentTierIndex > 0 ? "rgba(0,217,255,0.55)" : "#34525c"}; background:rgba(0,20,30,0.72); color:${currentTierIndex > 0 ? "#8cecff" : "#66818a"}; font-size:0.68rem; line-height:1.05; cursor:${currentTierIndex > 0 ? "pointer" : "default"}; opacity:${currentTierIndex > 0 ? "1" : "0.65"};"><span>Downgrade</span><span data-downgrade-refund>${currentTierIndex > 0 && downgradeRefund !== null ? `+${formatByteAmount(downgradeRefund)}` : "—"}</span></button>
                            </div>`;

          // Add button event listeners after setting innerHTML
          const upgradeBtn = card.querySelector(".upgrade-btn");
          const downgradeBtn = card.querySelector(".downgrade-btn");

          if (upgradeBtn) {
            upgradeBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              const currentUpgradeCost = ProtocolSystem.getNextUpgradeCost(protocolName);
              if (currentUpgradeCost === null) return;
              if (totalCollectedBytes < currentUpgradeCost) {
                showUpgradeInfoModal(
                  "INSUFFICIENT DATA",
                  `Not enough data. You need ${formatByteAmount(currentUpgradeCost)}, you have ${formatByteAmount(totalCollectedBytes)}.`
                );
                return;
              }
              const nextTierName = ProtocolSystem.getNextUpgradeTierName(protocolName);
              showUpgradeConfirmModal(
                `Upgrade ${protocolName} to ${nextTierName} for ${formatByteAmount(currentUpgradeCost)}?`,
                () => {
                  const result = ProtocolSystem.upgradeProtocol(protocolName, totalCollectedBytes);
                  if (!result.success) {
                    if (result.reason === "insufficient") {
                      showUpgradeInfoModal(
                        "INSUFFICIENT DATA",
                        `Not enough data. You need ${formatByteAmount(result.cost)}, you have ${formatByteAmount(totalCollectedBytes)}.`
                      );
                    }
                    return;
                  }
                  if (result.success) {
                    triggerLoadingFlash();
                    totalCollectedBytes = Math.max(0, totalCollectedBytes - result.cost);
                    saveCollectedBytes();
                    updateHudDataDisplay();
                    window.dispatchEvent(new CustomEvent('tut:protocolUpgraded'));
                    updateProtocolDataDisplays();
                    // Update the card with new tier info
                    const newTierIndex = ProtocolSystem.getUpgradeTierIndex(result.newTier);
                    const totalTierCount = ProtocolSystem.upgradeTiers.length;
                    const newNextUpgradeCost = ProtocolSystem.getNextUpgradeCost(protocolName);
                    card.querySelector('[data-tier-info]').textContent = `${result.newTier} (${newTierIndex + 1}/${totalTierCount})`;
                    // Update mods based on new tier
                    const newEffectiveMods = ProtocolSystem.getProtocolEffectiveMods(protocolName);
                    const newModsText = Object.entries(newEffectiveMods)
                      .map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${k}`)
                      .join(", ");
                    card.querySelector('[data-mods]').textContent = newModsText || "No mods";
                    const upgradeBtnEl = card.querySelector('.upgrade-btn');
                    if (upgradeBtnEl) {
                      upgradeBtnEl.querySelector('[data-upgrade-cost]').textContent = newNextUpgradeCost === null ? 'MAX' : `-${formatByteAmount(newNextUpgradeCost)}`;
                      upgradeBtnEl.style.color = newNextUpgradeCost === null ? '#66818a' : '#8cecff';
                      upgradeBtnEl.style.border = `1px solid ${newNextUpgradeCost === null ? '#34525c' : 'rgba(0,217,255,0.7)'}`;
                      upgradeBtnEl.style.opacity = newNextUpgradeCost === null ? '0.65' : '1';
                      upgradeBtnEl.style.cursor = newNextUpgradeCost === null ? 'default' : 'pointer';
                      upgradeBtnEl.disabled = newNextUpgradeCost === null;
                    }
                    // Update downgrade button to become available if upgraded from Trivial
                    const newDowngradeRefund = (newTierIndex > 0 && typeof ProtocolSystem.getNextUpgradeCost === 'function') 
                      ? (() => {
                          const state = ProtocolSystem.protocolBoard[protocolName];
                          const prevTier = ProtocolSystem.upgradeTiers[newTierIndex - 1];
                          state.upgradeTier = prevTier;
                          const refund = ProtocolSystem.getNextUpgradeCost(protocolName);
                          state.upgradeTier = result.newTier;
                          return refund;
                        })()
                      : null;
                    const downgradeBtnEl = card.querySelector('.downgrade-btn');
                    if (downgradeBtnEl) {
                      downgradeBtnEl.querySelector('[data-downgrade-refund]').textContent = newTierIndex > 0 && newDowngradeRefund !== null ? `+${formatByteAmount(newDowngradeRefund)}` : '—';
                      downgradeBtnEl.style.color = newTierIndex > 0 ? '#8cecff' : '#66818a';
                      downgradeBtnEl.style.border = `1px solid ${newTierIndex > 0 ? 'rgba(0,217,255,0.55)' : '#34525c'}`;
                      downgradeBtnEl.style.opacity = newTierIndex > 0 ? '1' : '0.65';
                      downgradeBtnEl.style.cursor = newTierIndex > 0 ? 'pointer' : 'default';
                      downgradeBtnEl.disabled = newTierIndex <= 0;
                    }
                    // Update total stat display
                    const statTotalDiv = document.querySelector('[data-stat-total]');
                    if (statTotalDiv && typeof selected !== 'undefined') {
                      const statTotals = { Range: 0, Power: 0, Intensity: 0, Movement: 0, Health: 0, Pickup: 0 };
                      selected.forEach(pName => {
                        const mods = (typeof ProtocolSystem.getProtocolEffectiveMods === 'function')
                          ? ProtocolSystem.getProtocolEffectiveMods(pName)
                          : (PROTOCOLS[pName]?.statMods || {});
                        Object.entries(mods).forEach(([stat, value]) => {
                          if (statTotals.hasOwnProperty(stat)) statTotals[stat] += value;
                        });
                      });
                      const statOrder = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
                      const statStrings = statOrder.map(stat => {
                        const v = statTotals[stat];
                        let sign = v > 0 ? "+" : (v < 0 ? "" : "");
                        return `<span style='color:#8cecff; font-weight:bold;'>${sign}${v} ${stat}</span>`;
                      });
                      statTotalDiv.innerHTML = `${statStrings.join(", ")}`;
                    }
                  }
                }
              );
            });
          }

          if (downgradeBtn) {
            downgradeBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              const state = ProtocolSystem.protocolBoard[protocolName];
              const currentTierIndex = ProtocolSystem.getUpgradeTierIndex(
                state?.upgradeTier || ProtocolSystem.getDefaultUpgradeTier()
              );
              if (currentTierIndex <= 0) return;
              const previousTier = ProtocolSystem.upgradeTiers[currentTierIndex - 1];
              const currentTier = state.upgradeTier;
              state.upgradeTier = previousTier;
              const currentDowngradeRefund = ProtocolSystem.getNextUpgradeCost(protocolName);
              state.upgradeTier = currentTier;
              showUpgradeConfirmModal(
                `Downgrade ${protocolName} to ${previousTier} and refund ${currentDowngradeRefund ? formatByteAmount(currentDowngradeRefund) : "last upgrade cost"}?`,
                () => {
                  const result = ProtocolSystem.downgradeProtocol(protocolName);
                  if (result.success) {
                    triggerLoadingFlash();
                    totalCollectedBytes += result.refund || 0;
                    saveCollectedBytes();
                    updateHudDataDisplay();
                    updateProtocolDataDisplays();
                    // Update the card with new tier info
                    const newTierIndex = ProtocolSystem.getUpgradeTierIndex(result.newTier);
                    const totalTierCount = ProtocolSystem.upgradeTiers.length;
                    const newNextUpgradeCost = ProtocolSystem.getNextUpgradeCost(protocolName);
                    card.querySelector('[data-tier-info]').textContent = `${result.newTier} (${newTierIndex + 1}/${totalTierCount})`;
                    // Update mods based on new tier
                    const newEffectiveModsDowngrade = ProtocolSystem.getProtocolEffectiveMods(protocolName);
                    const newModsTextDowngrade = Object.entries(newEffectiveModsDowngrade)
                      .map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${k}`)
                      .join(", ");
                    card.querySelector('[data-mods]').textContent = newModsTextDowngrade || "No mods";
                    const downgradeRefundNew = (newTierIndex > 0 && typeof ProtocolSystem.getNextUpgradeCost === 'function') 
                      ? (() => {
                          const state = ProtocolSystem.protocolBoard[protocolName];
                          const prevTier = ProtocolSystem.upgradeTiers[newTierIndex - 1];
                          state.upgradeTier = prevTier;
                          const refund = ProtocolSystem.getNextUpgradeCost(protocolName);
                          state.upgradeTier = result.newTier;
                          return refund;
                        })()
                      : null;
                    // Update downgrade button display
                    const downgradeBtnEl = card.querySelector('.downgrade-btn');
                    if (downgradeBtnEl) {
                      downgradeBtnEl.querySelector('[data-downgrade-refund]').textContent = newTierIndex > 0 && downgradeRefundNew !== null ? `+${formatByteAmount(downgradeRefundNew)}` : '—';
                      downgradeBtnEl.style.color = newTierIndex > 0 ? '#8cecff' : '#66818a';
                      downgradeBtnEl.style.border = `1px solid ${newTierIndex > 0 ? 'rgba(0,217,255,0.55)' : '#34525c'}`;
                      downgradeBtnEl.style.opacity = newTierIndex > 0 ? '1' : '0.65';
                      downgradeBtnEl.style.cursor = newTierIndex > 0 ? 'pointer' : 'default';
                      downgradeBtnEl.disabled = newTierIndex <= 0;
                    }
                    const upgradeBtnEl = card.querySelector('.upgrade-btn');
                    if (upgradeBtnEl) {
                      upgradeBtnEl.querySelector('[data-upgrade-cost]').textContent = newNextUpgradeCost === null ? 'MAX' : `-${formatByteAmount(newNextUpgradeCost)}`;
                      upgradeBtnEl.style.color = newNextUpgradeCost === null ? '#66818a' : '#8cecff';
                      upgradeBtnEl.style.border = `1px solid ${newNextUpgradeCost === null ? '#34525c' : 'rgba(0,217,255,0.7)'}`;
                      upgradeBtnEl.style.opacity = newNextUpgradeCost === null ? '0.65' : '1';
                      upgradeBtnEl.style.cursor = newNextUpgradeCost === null ? 'default' : 'pointer';
                      upgradeBtnEl.disabled = newNextUpgradeCost === null;
                    }
                    // Update total stat display
                    const statTotalDiv = document.querySelector('[data-stat-total]');
                    if (statTotalDiv && typeof selected !== 'undefined') {
                      const statTotals = { Range: 0, Power: 0, Intensity: 0, Movement: 0, Health: 0, Pickup: 0 };
                      selected.forEach(pName => {
                        const mods = (typeof ProtocolSystem.getProtocolEffectiveMods === 'function')
                          ? ProtocolSystem.getProtocolEffectiveMods(pName)
                          : (PROTOCOLS[pName]?.statMods || {});
                        Object.entries(mods).forEach(([stat, value]) => {
                          if (statTotals.hasOwnProperty(stat)) statTotals[stat] += value;
                        });
                      });
                      const statOrder = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
                      const statStrings = statOrder.map(stat => {
                        const v = statTotals[stat];
                        let sign = v > 0 ? "+" : (v < 0 ? "" : "");
                        return `<span style='color:#8cecff; font-weight:bold;'>${sign}${v} ${stat}</span>`;
                      });
                      statTotalDiv.innerHTML = `${statStrings.join(", ")}`;
                    }
                  }
                },
                true
              );
            });
          }

          // Tooltip: compare stat change if selected vs unselected
          card.addEventListener("pointerenter", (event) => {
            // Show stat difference using: (x - a) + y and (x - b) + y
            const statOrder = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
            const statShort = { Range: "Rng:", Power: "Pwr:", Intensity: "Int:", Movement: "Mov:", Health: "HP:", Pickup: "Pick:" };
            const hoveredMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
              ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
              : (PROTOCOLS[protocolName]?.statMods || {});
            let html = `<div style='min-width:220px; max-width:340px; font-family:sans-serif; font-size:1em; background:rgba(4,25,42,0.98); border-radius:4px; border:1px solid rgba(0,217,255,0.55); box-shadow:0 0 18px rgba(0,217,255,0.18); padding:12px 14px;'>`;
            if (selected.length === 0) {
              html += `<div style='color:#8cecff; font-size:1.01em; font-weight:bold; margin-bottom:4px;'>No protocol selected</div>`;
            } else if (selected.length === 1) {
              // Only one selected: show (x - a) + y, where x = a
              const aName = selected[0];
              const aMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(aName)
                : (PROTOCOLS[aName]?.statMods || {});
              // x = a
              // (x - a) + y = y
              html += `<div style='color:#8cecff; font-size:1.01em; margin-bottom:2px;'><div style='font-weight:normal;'>If you replace</div><div style='font-weight:bold;'>${aName}</div><div style='font-weight:normal;'>with</div><div style='font-weight:bold;'>${protocolName}</div></div>`;
              html += `<div style='font-size:0.97em; margin-bottom:6px;'>`;
              html += `<div style='display:flex; flex-direction:column; gap:2px;'>`;
              html += statOrder.map(stat => {
                const x = Number(aMods[stat]) || 0;
                const c = Number(hoveredMods[stat]) || 0;
                let color = c > x ? "#00ff88" : c < x ? "#ff4444" : "#bbbbbb";
                let cStr = c < 0 ? c.toString() : c.toString();
                return `<div style='display:flex; align-items:center;'><span style='width:70px; display:inline-block;'>${statShort[stat]}</span> <span style='color:#bbbbbb; min-width:18px; display:inline-block; text-align:right;'>${x}</span> <span style='margin:0 4px;'>→</span> <span style='color:${color}; min-width:18px; display:inline-block; text-align:right;'>${cStr}</span></div>`;
              }).join("");
              html += `</div>`;
              html += `</div>`;
            } else if (selected.length === 2) {
              // Two selected: show (x - a) + y and (x - b) + y side by side
              const aName = selected[0];
              const bName = selected[1];
              const aMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(aName)
                : (PROTOCOLS[aName]?.statMods || {});
              const bMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(bName)
                : (PROTOCOLS[bName]?.statMods || {});
              // x = a + b
              // (x - a) + y = c
              html += `<div style='display:grid; grid-template-columns:1fr 1fr; gap:12px;'>`;
              
              // Column 1: Protocol A
              html += `<div>`;
              html += `<div style='color:#8cecff; font-size:0.95em; margin-bottom:2px;'><div style='font-weight:normal;'>If you replace</div><div style='font-weight:bold;'>${aName}</div><div style='font-weight:normal;'>with</div><div style='font-weight:bold;'>${protocolName}</div></div>`;
              html += `<div style='font-size:0.92em;'>`;
              html += `<div style='display:flex; flex-direction:column; gap:2px;'>`;
              html += statOrder.map(stat => {
                const a = Number(aMods[stat]) || 0;
                const b = Number(bMods[stat]) || 0;
                const y = Number(hoveredMods[stat]) || 0;
                const x = a + b;
                const c = b + y;
                let color = c > x ? "#00ff88" : c < x ? "#ff4444" : "#bbbbbb";
                let cStr = c < 0 ? c.toString() : c.toString();
                return `<div style='display:flex; align-items:center;'><span style='width:60px; display:inline-block; font-size:0.9em;'>${statShort[stat]}</span> <span style='color:#bbbbbb; min-width:16px; display:inline-block; text-align:right;'>${x}</span> <span style='margin:0 3px;'>→</span> <span style='color:${color}; min-width:16px; display:inline-block; text-align:right;'>${cStr}</span></div>`;
              }).join("");
              html += `</div>`;
              html += `</div>`;
              html += `</div>`;
              
              // Column 2: Protocol B
              html += `<div>`;
              html += `<div style='color:#8cecff; font-size:0.95em; margin-bottom:2px;'><div style='font-weight:normal;'>If you replace</div><div style='font-weight:bold;'>${bName}</div><div style='font-weight:normal;'>with</div><div style='font-weight:bold;'>${protocolName}</div></div>`;
              html += `<div style='font-size:0.92em;'>`;
              html += `<div style='display:flex; flex-direction:column; gap:2px;'>`;
              html += statOrder.map(stat => {
                const a = Number(aMods[stat]) || 0;
                const b = Number(bMods[stat]) || 0;
                const y = Number(hoveredMods[stat]) || 0;
                const x = a + b;
                const d = a + y;
                let color = d > x ? "#00ff88" : d < x ? "#ff4444" : "#bbbbbb";
                let dStr = d < 0 ? d.toString() : d.toString();
                return `<div style='display:flex; align-items:center;'><span style='width:60px; display:inline-block; font-size:0.9em;'>${statShort[stat]}</span> <span style='color:#bbbbbb; min-width:16px; display:inline-block; text-align:right;'>${x}</span> <span style='margin:0 3px;'>→</span> <span style='color:${color}; min-width:16px; display:inline-block; text-align:right;'>${dStr}</span></div>`;
              }).join("");
              html += `</div>`;
              html += `</div>`;
              html += `</div>`;
              
              html += `</div>`;
            }
            html += `</div>`;
            let tooltip = null;
            let lastTooltipEvent = event;
            let tooltipMoveFrame = null;
            const trackTooltipPointer = (pointerEvent) => {
              lastTooltipEvent = pointerEvent;
            };
            card._tooltipCleanup = () => {
              if (card._tooltipTimer) {
                clearTimeout(card._tooltipTimer);
                card._tooltipTimer = null;
              }
              if (card._tooltipPointerHandler) {
                card.removeEventListener("pointermove", card._tooltipPointerHandler);
                card._tooltipPointerHandler = null;
              }
              if (tooltipMoveFrame !== null) {
                window.cancelAnimationFrame(tooltipMoveFrame);
                tooltipMoveFrame = null;
              }
              if (card._tooltip) {
                card._tooltip.remove();
                card._tooltip = null;
              }
              if (card._tooltipMoveHandler) {
                card.removeEventListener("pointermove", card._tooltipMoveHandler);
                card._tooltipMoveHandler = null;
              }
              tooltip = null;
              card._tooltipCleanup = null;
            };
            function moveTooltip(e) {
              lastTooltipEvent = e;
              if (!tooltip || tooltipMoveFrame !== null) return;
              tooltipMoveFrame = window.requestAnimationFrame(() => {
                tooltipMoveFrame = null;
                if (!tooltip) return;
                const rect = starterOverlay.getBoundingClientRect();
                const scale = rect.width / GAME_DISPLAY_WIDTH;
                const left = (lastTooltipEvent.clientX - rect.left) / scale + 18;
                const top = (lastTooltipEvent.clientY - rect.top) / scale + 8;
                const boundedLeft = Math.max(8, Math.min(left, GAME_DISPLAY_WIDTH - tooltip.offsetWidth - 8));
                const boundedTop = Math.max(8, Math.min(top, GAME_DISPLAY_HEIGHT - tooltip.offsetHeight - 8));
                tooltip.style.transform = `translate3d(${boundedLeft}px, ${boundedTop}px, 0)`;
              });
            }
            card._tooltipMoveHandler = moveTooltip;
            card._tooltipPointerHandler = trackTooltipPointer;
            card.addEventListener("pointermove", trackTooltipPointer);
            card._tooltipTimer = window.setTimeout(() => {
              if (!card.matches(":hover")) return;
              tooltip = document.createElement("div");
              tooltip.innerHTML = html;
              tooltip.style.position = "absolute";
              tooltip.style.zIndex = 29;
              tooltip.style.pointerEvents = "none";
              tooltip.style.left = "0";
              tooltip.style.top = "0";
              tooltip.style.willChange = "transform";
              tooltip.style.backfaceVisibility = "hidden";
              tooltip.style.maxWidth = "calc(100% - 16px)";
              tooltip.style.maxHeight = "calc(100% - 16px)";
              tooltip.style.overflow = "auto";
              tooltip.style.boxSizing = "border-box";
              tooltip.style.background = "rgba(4, 17, 28, 0.98)";
              starterOverlay.appendChild(tooltip);
              card._tooltip = tooltip;
              moveTooltip(lastTooltipEvent);
              card.removeEventListener("pointermove", trackTooltipPointer);
              card._tooltipPointerHandler = null;
              card.addEventListener("pointermove", moveTooltip);
              card._tooltipTimer = null;
            }, TOOLTIP_HOVER_DELAY_MS);
          });
          card.addEventListener("pointerleave", () => {
            if (card._tooltipCleanup) card._tooltipCleanup();
          });

          const favoriteBadge = document.createElement("div");
          favoriteBadge.textContent = "✶";
          favoriteBadge.title = "Toggle favorite";
          favoriteBadge.style.position = "absolute";
          favoriteBadge.style.top = "8px";
          favoriteBadge.style.right = "8px";
          favoriteBadge.style.width = "20px";
          favoriteBadge.style.height = "20px";
          favoriteBadge.style.boxSizing = "border-box";
          favoriteBadge.style.borderRadius = "50%";
          favoriteBadge.style.border = "1px solid rgba(0,217,255,0.7)";
          favoriteBadge.style.background = "rgba(0, 20, 30, 0.92)";
          favoriteBadge.style.fontWeight = "bold";
          favoriteBadge.style.fontSize = "1.1rem";
          favoriteBadge.style.lineHeight = "1";
          favoriteBadge.style.display = "flex";
          favoriteBadge.style.alignItems = "center";
          favoriteBadge.style.justifyContent = "center";
          favoriteBadge.style.boxShadow = "0 0 8px rgba(0,217,255,0.3)";
          favoriteBadge.style.cursor = "pointer";
          card.appendChild(favoriteBadge);

          const selectedBadge = document.createElement("div");
          selectedBadge.textContent = "✓";
          selectedBadge.title = "Starter protocol selected";
          selectedBadge.style.position = "absolute";
          selectedBadge.style.top = "8px";
          selectedBadge.style.right = "32px";
          selectedBadge.style.width = "18px";
          selectedBadge.style.height = "18px";
          selectedBadge.style.borderRadius = "50%";
          selectedBadge.style.border = "1px solid rgba(0,217,255,0.7)";
          selectedBadge.style.background = "rgba(0, 20, 30, 0.92)";
          selectedBadge.style.color = "#8cecff";
          selectedBadge.style.fontWeight = "bold";
          selectedBadge.style.fontSize = "0.85rem";
          selectedBadge.style.lineHeight = "1";
          selectedBadge.style.display = "none";
          selectedBadge.style.alignItems = "center";
          selectedBadge.style.justifyContent = "center";
          selectedBadge.style.boxShadow = "0 0 8px rgba(0,217,255,0.3)";
          selectedBadge.style.pointerEvents = "none";
          card.appendChild(selectedBadge);

          const applyFavoriteBadgeState = () => {
            const isFavorite = typeof ProtocolSystem.isFavorite === "function"
              ? ProtocolSystem.isFavorite(protocolName)
              : false;
            favoriteBadge.style.color = isFavorite ? "#ffd84d" : "#4e696f";
            favoriteBadge.style.textShadow = isFavorite ? "0 0 8px rgba(255,216,77,0.85)" : "none";
          };
          applyFavoriteBadgeState();

          favoriteBadge.addEventListener("click", (evt) => {
            evt.stopPropagation();
            if (typeof ProtocolSystem.toggleFavorite === "function") {
              ProtocolSystem.toggleFavorite(protocolName);
              playSoundFresh("47313572-8-bit-game-sfx-sound-6-269965.mp3", (window.sentinelVolume && window.sentinelVolume.click) || 1.0);
              triggerLoadingFlash();
              applyFavoriteBadgeState();
            }
          });

          const renderCardState = () => {
            const isSelected = selected.includes(protocolName);
            card.setAttribute("aria-pressed", String(isSelected));
            card.style.background = rarityBackgroundColor;
            card.style.borderColor = isSelected ? "#00d9ff" : "rgba(0,217,255,0.38)";
            card.style.boxShadow = isSelected ? "0 0 14px rgba(0,217,255,0.3)" : "none";
            selectedBadge.style.display = isSelected ? "flex" : "none";
          };
          renderCardState();

          card.addEventListener("click", () => {

            const idx = selected.indexOf(protocolName);
            if (idx >= 0) {
              // Deselect if already selected
              selected.splice(idx, 1);
              triggerLoadingFlash();
              if (typeof ProtocolSystem.setStarters === "function") {
                ProtocolSystem.setStarters([...selected]);
              } else {
                ProtocolSystem.starterProtocols = [...selected];
              }
              playProtocolPickupSound();
              renderCardState();
              refreshCount();
              return;
            }
            if (selected.length < 2) {
              // Add if under limit
              selected.push(protocolName);
              triggerLoadingFlash();
              playProtocolPickupSound();
              if (typeof ProtocolSystem.setStarters === "function") {
                ProtocolSystem.setStarters([...selected]);
              } else {
                ProtocolSystem.starterProtocols = [...selected];
              }
              renderCardState();
              refreshCount();
              return;
            }
            // If already 2 selected, prompt to replace
            const modal = document.createElement("div");
            configureDisplayOverlay(modal, 15);
            modal.style.background = "rgba(0,0,0,0.7)";
            modal.style.display = "flex";
            modal.style.alignItems = "center";
            modal.style.justifyContent = "center";
            const box = document.createElement("div");
            box.style.background = "#061525";
            box.style.border = "1px solid rgba(0,217,255,0.55)";
            box.style.borderRadius = "4px";
            box.style.padding = "28px 32px";
            box.style.display = "flex";
            box.style.flexDirection = "column";
            box.style.alignItems = "center";
            box.style.boxShadow = "0 0 18px rgba(0,217,255,0.2)";
            const msg = document.createElement("div");
            msg.textContent = "Starter limit reached. Replace which starter?";
            msg.style.color = "#8cecff";
            msg.style.fontWeight = "bold";
            msg.style.fontSize = "1.1rem";
            msg.style.marginBottom = "18px";
            box.appendChild(msg);
            const btnRow = document.createElement("div");
            btnRow.style.display = "flex";
            btnRow.style.gap = "18px";
            btnRow.style.marginBottom = "10px";
            selected.forEach(selName => {
              // Button container for name and stat change
              const btnContainer = document.createElement("div");
              btnContainer.style.display = "flex";
              btnContainer.style.flexDirection = "column";
              btnContainer.style.alignItems = "center";
              btnContainer.style.minWidth = "160px";
              btnContainer.style.maxWidth = "220px";
              btnContainer.style.margin = "0 2px";

              // Protocol name button
              const btn = document.createElement("button");
              btn.textContent = selName;
              btn.style.padding = "0.6rem 1.2rem";
              btn.style.background = "rgba(0,20,30,0.82)";
              btn.style.color = "#8cecff";
              btn.style.border = "1px solid rgba(0,217,255,0.7)";
              btn.style.borderRadius = "4px";
              btn.style.fontSize = "1rem";
              btn.style.cursor = "pointer";
              btn.style.marginBottom = "6px";
              btn.addEventListener("click", () => {
                // Replace selected starter in-place and update UI
                const idxToReplace = selected.indexOf(selName);
                if (idxToReplace !== -1) {
                  selected.splice(idxToReplace, 1, protocolName);
                  triggerLoadingFlash();
                  if (typeof ProtocolSystem.setStarters === "function") {
                    ProtocolSystem.setStarters([...selected]);
                  } else {
                    ProtocolSystem.starterProtocols = [...selected];
                  }
                  document.body.removeChild(modal);
                  // Re-render all protocol cards' state and selection count
                  const allCards = content.querySelectorAll('.protocol-database-card');
                  allCards.forEach(cardBtn => {
                    if (typeof cardBtn.renderCardState === 'function') cardBtn.renderCardState();
                  });
                  refreshCount();
                }
              });

              // --- Stat comparison below protocol name, 2-column layout ---
              const statOrder = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
              const statShort = { Range: "Rng:", Power: "Pwr:", Intensity: "Int:", Movement: "Mov:", Health: "HP:", Pickup: "Pick:" };
              const aName = selName;
              const bName = selected.find(n => n !== selName);
              const aMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(aName)
                : (PROTOCOLS[aName]?.statMods || {});
              const bMods = bName && ((typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(bName)
                : (PROTOCOLS[bName]?.statMods || {}));
              const hoveredMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
                ? ProtocolSystem.getProtocolEffectiveMods(protocolName)
                : (PROTOCOLS[protocolName]?.statMods || {});
              // x = a + b
              // (x - a) + y = c
              let statHtml = `<div style='margin-bottom:2px; font-size:0.97em; background:rgba(4,25,42,0.92); border-radius:4px; border:1px solid rgba(0,217,255,0.4); box-shadow:0 0 8px rgba(0,217,255,0.12); padding:7px 10px; width:100%;'>`;
              statHtml += `<div style='color:#8cecff; font-weight:bold; margin-bottom:2px; text-align:center;'>Result if replaced:</div>`;
              statHtml += `<div style='display:flex; flex-direction:column; gap:2px;'>`;
              statOrder.forEach((stat, i) => {
                const a = Number(aMods[stat]) || 0;
                const b = bMods ? (Number(bMods[stat]) || 0) : 0;
                const y = Number(hoveredMods[stat]) || 0;
                const x = a + b;
                const c = b + y;
                let color = c > x ? "#00ff88" : c < x ? "#ff4444" : "#bbbbbb";
                let cStr = c < 0 ? c.toString() : c.toString();
                statHtml += `<div style='display:flex; align-items:center;'><span style='width:54px; display:inline-block;'>${statShort[stat]}</span> <span style='color:#bbbbbb; min-width:16px; display:inline-block; text-align:right;'>${x}</span> <span style='margin:0 3px;'>→</span> <span style='color:${color}; min-width:16px; display:inline-block; text-align:right;'>${cStr}</span></div>`;
              });
              statHtml += `</div></div>`;
              btnContainer.appendChild(btn);
              btnContainer.insertAdjacentHTML('beforeend', statHtml);
              btnRow.appendChild(btnContainer);
            });
            box.appendChild(btnRow);
            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancel";
            cancelBtn.style.padding = "0.5rem 1.1rem";
            cancelBtn.style.background = "rgba(0,0,0,0.5)";
            cancelBtn.style.color = "#8cecff";
            cancelBtn.style.border = "1px solid rgba(0,217,255,0.55)";
            cancelBtn.style.borderRadius = "4px";
            cancelBtn.style.fontSize = "1rem";
            cancelBtn.style.marginTop = "8px";
            cancelBtn.style.cursor = "pointer";
            cancelBtn.addEventListener("click", () => {
              document.body.removeChild(modal);
            });
            box.appendChild(cancelBtn);
            modal.appendChild(box);
            document.body.appendChild(modal);
          });
          card.addEventListener("keydown", (event) => {
            if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
            event.preventDefault();
            card.click();
          });

          // Attach renderCardState to card for external refresh
          card.renderCardState = renderCardState;
          familyColumn.appendChild(card);
          }
        });
      });
    }

    refreshCount();

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "center";
    actions.style.alignItems = "center";
    actions.style.gap = "12px";
    actions.style.marginTop = "11px";
    actions.style.marginBottom = "15px";
    actions.style.flexShrink = "0";
    panel.appendChild(actions);

    const backBtn2 = document.createElement("button");
    backBtn2.textContent = "Back";
    backBtn2.style.width = "130px"; 
    backBtn2.style.fontSize = "0.88rem";
    backBtn2.style.padding = "0.45rem 0.8rem";
    backBtn2.style.background = "rgba(0,20,30,0.82)";
    backBtn2.style.color = "#8cecff";
    backBtn2.style.border = "1px solid rgba(0,217,255,0.7)";
    backBtn2.style.borderRadius = "4px";
    backBtn2.style.cursor = "pointer";
    backBtn2.style.boxShadow = "inset 0 0 10px rgba(0,217,255,0.08)";
    actions.appendChild(backBtn2);

    const startBtn = document.createElement("button");
    startBtn.textContent = source === "mainMenu" ? "Play" : "Start Run";
    startBtn.style.width = "130px"; 
    startBtn.style.fontSize = "0.88rem";
    startBtn.style.padding = "0.45rem 0.8rem";
    startBtn.style.background = "rgba(0,20,30,0.82)";
    startBtn.style.color = "#8cecff";
    startBtn.style.border = "1px solid rgba(0,217,255,0.7)";
    startBtn.style.borderRadius = "4px";
    startBtn.style.cursor = "pointer";
    startBtn.style.boxShadow = "0 0 14px rgba(0,217,255,0.18), inset 0 0 10px rgba(0,217,255,0.08)";
    actions.appendChild(startBtn);

    backBtn2.addEventListener("click", () => {
      starterOverlay.remove();
      if (source === "mainMenu") {
        showMenu();
      } else {
        showDifficultyMenu();
      }
    });

    startBtn.addEventListener("click", () => {
      window._pendingStarterProtocols = [...selected];
      starterOverlay.remove();
      if (source === "mainMenu") {
        showDifficultyMenu();
      } else {
        startGame(difficulty, startStatPoints, startHealth);
      }
    });

    document.body.appendChild(starterOverlay);
  }
  function showMenu(playMusic = true) {
    triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
    canvas.style.visibility = "hidden";
    hudXrayCanvas.style.visibility = "hidden";
    setHudStatus("AWAITING COMMAND", 2, "menu");
    const previousMenuOverlay = document.getElementById("menuOverlay");
    if (previousMenuOverlay) previousMenuOverlay.remove();
    const ENEMY_GLOSSARY = {
      factionName: "UNCLASSIFIED HOSTILES",
      factionDescription: "Faction designation pending. This index summarizes observed hostile combat roles and behavior patterns.",
      entries: [
        { name: "Shard", role: "Frontline", image: "grunt.png", description: "Basic close-range attacker that pushes directly toward the player." },
        { name: "Kamikaze", role: "Suicide Diver", image: "kamikaze.png", description: "Fast suicide unit that pressures with explosives and mine drops." },
        { name: "Slinger", role: "Ranged Harasser", image: "slinger.png", description: "Maintains distance and fires projectile shots at medium-to-long range." },
        { name: "Shielder", role: "Support", image: "shielder.png", description: "Defensive support unit that protects nearby enemies with shielding links." },
        { name: "Beamer", role: "Artillery", image: "beamer.png", description: "Charges and fires sweeping beam attacks while holding preferred spacing." },
        { name: "Stalker", role: "Skirmisher", image: "stalker.png", description: "Disruptive mobile attacker that repositions aggressively around the player." },
        { name: "Brute", role: "Heavy", image: "brute.png", description: "Durable close-range unit with high pressure in short-to-mid range fights." },
        { name: "Shard Heavy", role: "Mini-Boss", image: "grunt heavy.png", description: "Minor boss variant with elevated durability and elite pressure patterns." },
        { name: "Shard Major", role: "Boss", image: "grunt boss.png", description: "Elite grunt leader with shard-based attacks and advanced threat patterns." },
        { name: "Slinger Major", role: "Boss", image: "slinger boss.png", description: "Advanced ranged boss with burst projectile patterns and fragmentation fire." },
        { name: "Brute Major", role: "Boss", image: "brute boss.png", description: "Heavy boss focused on area denial, nova pressure, and close-range punishment." },
        { name: "Stalker Major", role: "Boss", image: "stalker.png", description: "Elite mobile leader with enhanced blinking, burst projectiles, and aggressive tactical repositioning." }
      ]
    };

    function showEnemyGlossary() {
      triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
      const glossaryOverlay = document.createElement("div");
      glossaryOverlay.id = "enemyGlossaryOverlay";
      configureDisplayOverlay(glossaryOverlay);
      glossaryOverlay.style.background = "transparent";
      glossaryOverlay.style.display = "flex";
      glossaryOverlay.style.flexDirection = "column";
      glossaryOverlay.style.justifyContent = "center";
      glossaryOverlay.style.alignItems = "center";
      const panel = document.createElement("div");
      panel.style.position = "relative";
      panel.style.zIndex = 2;
      panel.style.width = "calc(100% - 24px)";
      panel.style.height = "calc(100% - 24px)";
      panel.style.boxSizing = "border-box";
      panel.style.background = "transparent";
      panel.style.padding = "14px 18px";
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      glossaryOverlay.appendChild(panel);

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.alignItems = "center";
      topRow.style.justifyContent = "space-between";
      topRow.style.marginBottom = "12px";
      panel.appendChild(topRow);

      const title = document.createElement("h2");
      title.textContent = "ENEMY GLOSSARY";
      title.style.color = "#eaffff";
      title.style.margin = "0";
      title.style.fontSize = "1.8rem";
      title.style.letterSpacing = "2px";
      title.style.textShadow = "0 0 14px rgba(0,217,255,0.65)";
      topRow.appendChild(title);

      const backBtn = document.createElement("button");
      backBtn.textContent = "← Back to Menu";
      backBtn.style.fontSize = "0.95rem";
      backBtn.style.padding = "0.45rem 0.95rem";
      backBtn.style.background = "rgba(0,20,30,0.82)";
      backBtn.style.color = "#8cecff";
      backBtn.style.border = "1px solid rgba(0,217,255,0.7)";
      backBtn.style.borderRadius = "4px";
      backBtn.style.cursor = "pointer";
      backBtn.style.boxShadow = "inset 0 0 10px rgba(0,217,255,0.08)";
      backBtn.addEventListener("mouseover", () => backBtn.style.background = "rgba(0,45,58,0.94)");
      backBtn.addEventListener("mouseout", () => backBtn.style.background = "rgba(0,20,30,0.82)");
      topRow.appendChild(backBtn);

      const factionBlock = document.createElement("div");
      factionBlock.style.borderLeft = "2px solid rgba(0,217,255,0.65)";
      factionBlock.style.padding = "8px 12px";
      factionBlock.style.marginBottom = "10px";
      factionBlock.style.background = "rgba(0, 35, 55, 0.28)";
      panel.appendChild(factionBlock);

      const factionName = document.createElement("div");
      factionName.textContent = `Faction: ${ENEMY_GLOSSARY.factionName}`;
      factionName.style.color = "#8cecff";
      factionName.style.fontWeight = "bold";
      factionName.style.marginBottom = "4px";
      factionBlock.appendChild(factionName);

      const factionDesc = document.createElement("div");
      factionDesc.textContent = ENEMY_GLOSSARY.factionDescription;
      factionDesc.style.color = "#c8f7ff";
      factionDesc.style.fontSize = "0.9rem";
      factionBlock.appendChild(factionDesc);

      const listWrap = document.createElement("div");
      listWrap.style.flex = "1";
      listWrap.style.minHeight = "0";
      listWrap.style.overflowY = "auto";
      listWrap.style.padding = "4px";
      listWrap.classList.add("scrollbar-themed");
      panel.appendChild(listWrap);

      const entryGrid = document.createElement("div");
      entryGrid.style.display = "grid";
      entryGrid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
      entryGrid.style.gap = "8px";
      listWrap.appendChild(entryGrid);

      ENEMY_GLOSSARY.entries.forEach((entry) => {
        const card = document.createElement("div");
        card.style.display = "grid";
        card.style.gridTemplateColumns = "56px minmax(0, 1fr)";
        card.style.columnGap = "12px";
        card.style.alignItems = "start";
        card.style.borderLeft = "2px solid rgba(0,217,255,0.32)";
        card.style.padding = "8px";
        card.style.background = "rgba(0, 35, 55, 0.34)";
        entryGrid.appendChild(card);

        const spriteWrap = document.createElement("div");
        spriteWrap.style.width = "56px";
        spriteWrap.style.height = "56px";
        spriteWrap.style.background = "rgba(0, 217, 255, 0.06)";
        spriteWrap.style.display = "flex";
        spriteWrap.style.alignItems = "center";
        spriteWrap.style.justifyContent = "center";
        spriteWrap.style.overflow = "hidden";
        card.appendChild(spriteWrap);

        const sprite = document.createElement("img");
        sprite.src = entry.image || "";
        sprite.alt = entry.name;
        sprite.style.maxWidth = "52px";
        sprite.style.maxHeight = "52px";
        sprite.style.objectFit = "contain";
        sprite.addEventListener("error", () => {
          sprite.remove();
          const fallback = document.createElement("div");
          fallback.textContent = entry.name.slice(0, 2).toUpperCase();
          fallback.style.color = "#8cecff";
          fallback.style.fontSize = "0.82rem";
          fallback.style.fontWeight = "bold";
          spriteWrap.appendChild(fallback);
        });
        spriteWrap.appendChild(sprite);

        const textCol = document.createElement("div");
        textCol.style.display = "flex";
        textCol.style.flexDirection = "column";
        card.appendChild(textCol);

        const name = document.createElement("div");
        name.textContent = entry.name;
        name.style.color = "#8cecff";
        name.style.fontWeight = "bold";
        name.style.fontSize = "0.98rem";
        textCol.appendChild(name);

        const role = document.createElement("div");
        role.textContent = `Role: ${entry.role}`;
        role.style.color = "#79cfdf";
        role.style.fontSize = "0.82rem";
        role.style.marginTop = "2px";
        textCol.appendChild(role);

        const desc = document.createElement("div");
        desc.textContent = entry.description;
        desc.style.color = "#c8f7ff";
        desc.style.fontSize = "0.82rem";
        desc.style.marginTop = "5px";
        textCol.appendChild(desc);
      });

      backBtn.addEventListener("click", () => {
        glossaryOverlay.remove();
        showMenu();
      });

      document.body.appendChild(glossaryOverlay);
    }

    function showLeaderboardOverlay() {
      triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
      const DIFFICULTIES = ["Normal", "Hardcore", "Apocalypse"];
      const DIFF_COLORS = { Normal: "#00d9ff", Hardcore: "#00d9ff", Apocalypse: "#00d9ff" };
      const COLS = "42px minmax(0, 1fr) 120px 90px";

      const lbOverlay = document.createElement("div");
      configureDisplayOverlay(lbOverlay);
      lbOverlay.style.cssText += "background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;";

      const panel = document.createElement("div");
      panel.style.cssText = "position:relative;z-index:2;width:calc(100% - 24px);height:calc(100% - 24px);box-sizing:border-box;background:transparent;padding:16px 18px;display:flex;flex-direction:column;gap:12px;";
      lbOverlay.appendChild(panel);

      const topRow = document.createElement("div");
      topRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;";
      panel.appendChild(topRow);

      const lbTitle = document.createElement("h2");
      lbTitle.textContent = "LEADERBOARDS";
      lbTitle.style.cssText = "color:#eaffff;margin:0;font-size:2rem;letter-spacing:3px;text-shadow:0 0 14px rgba(0,217,255,0.6);";
      topRow.appendChild(lbTitle);

      const backBtn = document.createElement("button");
      backBtn.textContent = "← Back to Menu";
      backBtn.style.cssText = "font-size:0.95rem;padding:0.45rem 0.95rem;background:rgba(0,20,30,0.82);color:#8cecff;border:1px solid rgba(0,217,255,0.7);border-radius:4px;cursor:pointer;box-shadow:inset 0 0 10px rgba(0,217,255,0.08);";
      backBtn.addEventListener("click", () => { lbOverlay.remove(); showMenu(); });
      topRow.appendChild(backBtn);

      // Tabs
      let activeTab = "Normal";
      const tabRow = document.createElement("div");
      tabRow.style.cssText = "display:flex;gap:8px;flex-shrink:0;";
      panel.appendChild(tabRow);

      // Headers + table
      const lbHeaders = document.createElement("div");
      lbHeaders.style.cssText = `width:100%;display:grid;grid-template-columns:${COLS};gap:4px;padding:0 8px;box-sizing:border-box;`;
      [("#"), "Name", "Score", "Waves"].forEach((t, idx) => {
        const h = document.createElement("div");
        h.textContent = t;
        h.style.cssText = `color:#79b9c9;font-size:0.82rem;letter-spacing:1px;text-transform:uppercase;text-align:${idx >= 2 ? "right" : "left"};`;
        lbHeaders.appendChild(h);
      });
      panel.appendChild(lbHeaders);

      const lbTable = document.createElement("div");
      lbTable.style.cssText = "width:100%;display:flex;flex:1;flex-direction:column;gap:6px;min-height:0;overflow-y:auto;";
      lbTable.classList.add("scrollbar-themed");
      panel.appendChild(lbTable);

      const emptyNote = document.createElement("div");
      emptyNote.style.cssText = "color:#8cecff;font-size:1rem;text-align:center;padding:24px 0;display:none;";
      emptyNote.textContent = "No entries yet.";
      lbTable.appendChild(emptyNote);

      function renderTab(diff) {
        const color = DIFF_COLORS[diff];
        tabRow.querySelectorAll("button").forEach(b => {
          const isSel = b.dataset.diff === diff;
          b.style.background = isSel ? "rgba(0,45,58,0.94)" : "rgba(0,20,30,0.7)";
          b.style.color = isSel ? color : "#8cecff";
          b.style.borderColor = isSel ? color : "rgba(0,217,255,0.28)";
        });
        lbHeaders.querySelectorAll("div").forEach(h => h.style.color = "#79b9c9");

        function renderRows(entries) {
          lbTable.innerHTML = "";
          if (!entries.length) {
            const note = document.createElement("div");
            note.textContent = "No entries yet.";
            note.style.cssText = "color:#8cecff;font-size:1rem;text-align:center;padding:24px 0;";
            lbTable.appendChild(note);
            return;
          }
          entries.forEach((entry, i) => {
            const row = document.createElement("div");
            row.style.cssText = `display:grid;grid-template-columns:${COLS};gap:8px;align-items:center;padding:9px 10px;background:rgba(0,35,55,0.38);border-left:2px solid rgba(0,217,255,0.34);`;
            const rank = document.createElement("div");
            rank.textContent = `#${i + 1}`;
            rank.style.cssText = `color:${i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#79b9c9"};font-weight:bold;font-size:0.95rem;`;
            const nameEl = document.createElement("div");
            nameEl.textContent = entry.name || "???";
            nameEl.style.cssText = "color:#d8f7ff;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
            const sc = document.createElement("div");
            sc.textContent = entry.score;
            sc.style.cssText = "color:#8cecff;font-weight:bold;font-size:0.95rem;text-align:right;";
            const wv = document.createElement("div");
            wv.textContent = `W${entry.waves}`;
            wv.style.cssText = "color:#aaf6ff;font-size:0.9rem;text-align:right;";
            row.appendChild(rank); row.appendChild(nameEl); row.appendChild(sc); row.appendChild(wv);
            lbTable.appendChild(row);
          });
        }

        lbTable.innerHTML = `<div style="color:#555;font-size:0.9rem;text-align:center;padding:24px 0;">Loading…</div>`;
        if (window.fbLB) {
          window.fbLB.load(diff).then(renderRows).catch(() => {
            const local = (() => { try { return JSON.parse(localStorage.getItem("sentinel.leaderboard." + diff)) || []; } catch { return []; } })();
            renderRows(local);
          });
        } else {
          const local = (() => { try { return JSON.parse(localStorage.getItem("sentinel.leaderboard." + diff)) || []; } catch { return []; } })();
          renderRows(local);
        }
      }

      DIFFICULTIES.forEach(diff => {
        const color = DIFF_COLORS[diff];
        const tab = document.createElement("button");
        tab.textContent = diff;
        tab.dataset.diff = diff;
        tab.style.cssText = `font-size:0.95rem;padding:0.5rem 1.2rem;border-radius:4px;border:1px solid rgba(0,217,255,0.28);cursor:pointer;color:#8cecff;background:rgba(0,20,30,0.72);`;
        tab.addEventListener("click", () => { activeTab = diff; renderTab(diff); });
        tabRow.appendChild(tab);
      });

      renderTab("Normal");
      document.body.appendChild(lbOverlay);
    }

    const menuOverlay = document.createElement("div");
    menuOverlay.id = "menuOverlay";
    configureDisplayOverlay(menuOverlay);
    menuOverlay.style.background = "transparent";
    menuOverlay.style.display = "flex";
    menuOverlay.style.flexDirection = "column";
    menuOverlay.style.justifyContent = "center";
    menuOverlay.style.alignItems = "center";
    // Game title
    const title = document.createElement("h1");
    title.textContent = "SENTINEL";
    title.style.cssText = SENTINEL_TITLE_STYLE;
    menuOverlay.appendChild(title);
    // Main menu buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.id = "mainMenuButtons";
    buttonContainer.style.display = "flex";
    buttonContainer.style.flexDirection = "column";
    buttonContainer.style.gap = "0.5rem";
    buttonContainer.style.marginTop = "1rem";
    buttonContainer.style.position = "relative";
    buttonContainer.style.zIndex = 1;
    buttonContainer.style.opacity = "0";
    buttonContainer.style.transition = `opacity ${MENU_FADE_DURATION}ms ease`;

    function makeMenuButton(label, color) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.fontSize = "1.2rem";
      btn.style.padding = "0.4rem 1.5rem";
      btn.style.background = "rgba(0,20,30,0.82)";
      btn.style.color = color;
      btn.style.border = `2px solid ${color}`;
      btn.style.borderRadius = "4px";
      btn.style.cursor = "pointer";
      btn.style.boxShadow = "0 0 14px rgba(0,217,255,0.18), inset 0 0 10px rgba(0,217,255,0.08)";
      btn.style.transition = "background 0.2s, color 0.2s";
      btn.addEventListener("mouseover",()=>{btn.style.background="rgba(0,45,58,0.94)";});
      btn.addEventListener("mouseout",()=>{btn.style.background="rgba(0,20,30,0.82)";});
      return btn;
    }

    // Add main menu buttons (Play and Protocols)
    const playBtn = makeMenuButton("Play", "#8cecff");
    const waveEditorBtn = makeMenuButton("Wave Editor", "#8cecff");
    waveEditorBtn.hidden = true;
    window.showWaveEditorButton = () => {
      waveEditorBtn.hidden = false;
    };
    const protocolBtn = makeMenuButton("Protocols", "#8cecff");
    const enemyGlossaryBtn = makeMenuButton("Enemy Glossary", "#8cecff");
    const leaderboardBtn = makeMenuButton("Leaderboards", "#8cecff");
    const exitBtn = makeMenuButton("Exit", "#8cecff");
    buttonContainer.appendChild(playBtn);
    buttonContainer.appendChild(waveEditorBtn);
    buttonContainer.appendChild(protocolBtn);
    buttonContainer.appendChild(leaderboardBtn);
    buttonContainer.appendChild(enemyGlossaryBtn);
    buttonContainer.appendChild(exitBtn);
    menuOverlay.appendChild(buttonContainer);
    document.body.appendChild(menuOverlay);
    fadeMenuElementsIn([buttonContainer]);
    if (playMusic) playMenuMusic();

    // Store reference to main menu for back button
    window._showMainMenu = () => {
      menuOverlay.style.display = "flex";
      fadeMenuElementsIn([buttonContainer]);
    };

    // Play button: show difficulty selection
    playBtn.addEventListener("click", function() {
      fadeMenuElementsOut([buttonContainer], () => {
        menuOverlay.style.display = "none";
        showDifficultyMenu();
      });
    });

    waveEditorBtn.addEventListener("click", function() {
      if (!window.SentinelEditor || typeof window.SentinelEditor.showWaveEditor !== "function") {
        console.error("Wave editor is unavailable.");
        return;
      }
      triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
      menuOverlay.remove();
      window._showMainMenu = () => showMenu();
      window.SentinelEditor.showWaveEditor();
    });

    // Protocols button: show starter protocol modal (new database)
    protocolBtn.addEventListener("click", function() {
      menuOverlay.remove();
      showStarterProtocolModal(null, null, null, "mainMenu");
      window._showMainMenu = () => {
        showMenu();
      };
    });

    enemyGlossaryBtn.addEventListener("click", function() {
      menuOverlay.remove();
      showEnemyGlossary();
      window._showMainMenu = () => {
        showMenu();
      };
    });

    leaderboardBtn.addEventListener("click", function() {
      menuOverlay.remove();
      showLeaderboardOverlay();
    });

    exitBtn.addEventListener("click", function() {
      showExitConfirmation();
    });
    return menuOverlay;
  }

  function showExitConfirmation() {
    triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
    const exitOverlay = document.createElement("div");
    configureDisplayOverlay(exitOverlay, 15);
    exitOverlay.style.background = "rgba(0, 0, 0, 0.75)";
    exitOverlay.style.display = "flex";
    exitOverlay.style.alignItems = "center";
    exitOverlay.style.justifyContent = "center";

    const exitPanel = document.createElement("div");
    exitPanel.style.width = "min(460px, calc(100% - 48px))";
    exitPanel.style.background = "rgba(0, 20, 30, 0.98)";
    exitPanel.style.border = "2px solid #00d9ff";
    exitPanel.style.borderRadius = "10px";
    exitPanel.style.boxShadow = "0 0 28px rgba(0, 217, 255, 0.25)";
    exitPanel.style.padding = "16px";
    exitPanel.style.color = "#c8ffff";
    exitPanel.style.fontFamily = "sans-serif";
    exitOverlay.appendChild(exitPanel);

    const exitTitle = document.createElement("div");
    exitTitle.textContent = "EXIT APPLICATION";
    exitTitle.style.color = "#00d9ff";
    exitTitle.style.fontWeight = "bold";
    exitTitle.style.fontSize = "1.05rem";
    exitTitle.style.marginBottom = "10px";
    exitPanel.appendChild(exitTitle);

    const exitMessage = document.createElement("div");
    exitMessage.textContent = "Are you sure you want to quit?";
    exitMessage.style.color = "#aaf6ff";
    exitMessage.style.fontSize = "0.95rem";
    exitMessage.style.lineHeight = "1.4";
    exitMessage.style.marginBottom = "14px";
    exitPanel.appendChild(exitMessage);

    const actionRow = document.createElement("div");
    actionRow.style.display = "flex";
    actionRow.style.justifyContent = "flex-end";
    actionRow.style.gap = "8px";
    exitPanel.appendChild(actionRow);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.padding = "0.5rem 0.85rem";
    cancelBtn.style.borderRadius = "6px";
    cancelBtn.style.border = "1px solid #2f9cad";
    cancelBtn.style.background = "rgba(0,0,0,0.45)";
    cancelBtn.style.color = "#c8ffff";
    cancelBtn.style.cursor = "pointer";
    actionRow.appendChild(cancelBtn);

    const exitBtnConfirm = document.createElement("button");
    exitBtnConfirm.type = "button";
    exitBtnConfirm.textContent = "Exit";
    exitBtnConfirm.style.padding = "0.5rem 0.85rem";
    exitBtnConfirm.style.borderRadius = "6px";
    exitBtnConfirm.style.border = "1px solid #00d9ff";
    exitBtnConfirm.style.background = "rgba(0,0,0,0.55)";
    exitBtnConfirm.style.color = "#8cecff";
    exitBtnConfirm.style.cursor = "pointer";
    actionRow.appendChild(exitBtnConfirm);

    const closeExitModal = () => {
      exitOverlay.remove();
    };

    cancelBtn.addEventListener("click", closeExitModal);
    exitOverlay.addEventListener("click", (evt) => {
      if (evt.target === exitOverlay) {
        closeExitModal();
      }
    });
    exitBtnConfirm.addEventListener("click", () => {
      closeExitModal();
      if (typeof window !== 'undefined' && typeof window.close === 'function') {
        window.close();
      }
    });

    document.body.appendChild(exitOverlay);
  }

  // Difficulty selection menu
  function showDifficultyMenu() {
    triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
    const diffOverlay = document.createElement("div");
    diffOverlay.id = "difficultyOverlay";
    configureDisplayOverlay(diffOverlay);
    diffOverlay.style.background = "transparent";
    diffOverlay.style.display = "flex";
    diffOverlay.style.flexDirection = "column";
    diffOverlay.style.justifyContent = "center";
    diffOverlay.style.alignItems = "center";
    // Back button - positioned absolutely inside the menu area
    const backBtn = document.createElement("button");
    backBtn.textContent = "← Back";
    backBtn.style.position = "absolute";
    backBtn.style.top = "auto";
    backBtn.style.bottom = "24px";
    backBtn.style.left = "24px";
    backBtn.style.transform = "none";
    backBtn.style.fontSize = "1.2rem";
    backBtn.style.padding = "0.5rem 1.5rem";
    backBtn.style.background = "rgba(0,20,30,0.82)";
    backBtn.style.color = "#8cecff";
    backBtn.style.border = "1px solid rgba(0,217,255,0.7)";
    backBtn.style.borderRadius = "4px";
    backBtn.style.cursor = "pointer";
    backBtn.style.zIndex = 2;
    backBtn.style.transition = "background 0.2s";
    backBtn.addEventListener("mouseover", () => backBtn.style.background = "rgba(0,45,58,0.94)");
    backBtn.addEventListener("mouseout", () => backBtn.style.background = "rgba(0,20,30,0.82)");
    diffOverlay.appendChild(backBtn);

    // Title
    const title = document.createElement("h2");
    title.textContent = "SELECT DIFFICULTY";
    title.style.cssText = SELECTION_TITLE_STYLE;
    title.style.opacity = "0";
    title.style.transition = `opacity ${MENU_FADE_DURATION}ms ease`;
    diffOverlay.appendChild(title);

    // Difficulty buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.flexDirection = "column";
    buttonContainer.style.gap = "1.2rem";
    buttonContainer.style.position = "relative";
    buttonContainer.style.zIndex = 1;
    buttonContainer.style.opacity = "0";
    buttonContainer.style.transition = `opacity ${MENU_FADE_DURATION}ms ease`;
    backBtn.style.transition = "background 0.2s";

    function makeButton(label, color) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.fontSize = "2rem";
      btn.style.padding = "1rem 2.5rem";
      btn.style.background = "rgba(0,20,30,0.82)";
      btn.style.color = color;
      btn.style.border = `2px solid ${color}`;
      btn.style.borderRadius = "4px";
      btn.style.cursor = "pointer";
      btn.style.boxShadow = "0 0 14px rgba(0,217,255,0.18), inset 0 0 10px rgba(0,217,255,0.08)";
      btn.style.transition = "background 0.2s";
      btn.addEventListener("mouseover",()=>{btn.style.background="rgba(0,45,58,0.94)";});
      btn.addEventListener("mouseout",()=>{btn.style.background="rgba(0,20,30,0.82)";});
      return btn;
    }

    const normalBtn = makeButton("Normal", "#8cecff");
    const hardcoreBtn = makeButton("Hardcore", "#8cecff");
    const apocalypseBtn = makeButton("Apocalypse", "#8cecff");
    buttonContainer.appendChild(normalBtn);
    buttonContainer.appendChild(hardcoreBtn);
    buttonContainer.appendChild(apocalypseBtn);
    diffOverlay.appendChild(buttonContainer);
    document.body.appendChild(diffOverlay);
    fadeMenuElementsIn([title, buttonContainer]);

    const difficultyTitle = title;
    const difficultyButtons = buttonContainer;

    function showWaveSelectionMenu(difficulty, startStatPoints, startHealth) {
      triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
      const waveOverlay = document.createElement("div");
      waveOverlay.id = "waveSelectionOverlay";
      configureDisplayOverlay(waveOverlay);
      waveOverlay.style.background = "transparent";
      waveOverlay.style.display = "flex";
      waveOverlay.style.flexDirection = "column";
      waveOverlay.style.justifyContent = "center";
      waveOverlay.style.alignItems = "center";
      // Back button
      const backBtn = document.createElement("button");
      backBtn.textContent = "← Back";
      backBtn.style.position = "absolute";
      backBtn.style.top = "auto";
      backBtn.style.bottom = "24px";
      backBtn.style.left = "24px";
      backBtn.style.fontSize = "1.2rem";
      backBtn.style.padding = "0.5rem 1.5rem";
      backBtn.style.background = "rgba(0,20,30,0.82)";
      backBtn.style.color = "#8cecff";
      backBtn.style.border = "1px solid rgba(0,217,255,0.7)";
      backBtn.style.borderRadius = "4px";
      backBtn.style.cursor = "pointer";
      backBtn.style.zIndex = 2;
      backBtn.style.transition = "background 0.2s";
      backBtn.style.boxShadow = "inset 0 0 10px rgba(0,217,255,0.08)";
      backBtn.addEventListener("mouseover", () => backBtn.style.background = "rgba(0,45,58,0.94)");
      backBtn.addEventListener("mouseout", () => backBtn.style.background = "rgba(0,20,30,0.82)");
      waveOverlay.appendChild(backBtn);

      // Title
      const title = document.createElement("h2");
      title.textContent = "SELECT START WAVE";
      title.style.cssText = SELECTION_TITLE_STYLE;
      title.style.opacity = "0";
      title.style.transition = `opacity ${MENU_FADE_DURATION}ms ease`;
      waveOverlay.appendChild(title);

      // Wave buttons container
      const buttonContainer = document.createElement("div");
      buttonContainer.style.display = "flex";
      buttonContainer.style.flexDirection = "column";
      buttonContainer.style.gap = "0.45rem";
      buttonContainer.style.position = "relative";
      buttonContainer.style.zIndex = 1;
      buttonContainer.style.opacity = "0";
      buttonContainer.style.transition = `opacity ${MENU_FADE_DURATION}ms ease`;

      function makeWaveButton(waveNum, playerLevel, isUnlocked) {
        const btn = document.createElement("button");
        const label = `Wave ${waveNum}`;
        btn.textContent = label;
        btn.style.fontSize = "1.1rem";
        btn.style.padding = "0.35rem 1.2rem";
        btn.style.background = isUnlocked ? "rgba(0,20,30,0.82)" : "rgba(0,14,22,0.64)";
        btn.style.color = isUnlocked ? "#dffcff" : "#52646c";
        btn.style.border = `1px solid ${isUnlocked ? "rgba(0,217,255,0.7)" : "#28404a"}`;
        btn.style.borderRadius = "4px";
        btn.style.cursor = isUnlocked ? "pointer" : "not-allowed";
        btn.style.boxShadow = isUnlocked ? "0 0 14px rgba(0,217,255,0.16), inset 0 0 10px rgba(0,217,255,0.08)" : "none";
        btn.style.transition = "background 0.2s";
        btn.style.opacity = isUnlocked ? 1 : 0.5;
        
        if (isUnlocked) {
          btn.addEventListener("mouseover", () => btn.style.background = "rgba(0,45,58,0.94)");
          btn.addEventListener("mouseout", () => btn.style.background = "rgba(0,20,30,0.82)");
          btn.addEventListener("click", () => {
            fadeMenuElementsOut([title, buttonContainer], () => {
              waveOverlay.remove();
              diffOverlay.remove();
              window._selectedStartWave = waveNum;
              window._selectedStartLevel = playerLevel;
              if (difficulty === "Hardcore" || difficulty === "Apocalypse") {
                startGame(difficulty, startStatPoints, startHealth);
              } else {
                showStarterProtocolModal(difficulty, startStatPoints, startHealth);
              }
            });
          });
        }
        return btn;
      }

      const unlockedWaves = getUnlockedWaves();
      
      // Display all milestone waves
      MILESTONE_WAVES.forEach(waveInfo => {
        const isUnlocked = unlockedWaves.includes(waveInfo.wave);
        const btn = makeWaveButton(waveInfo.wave, waveInfo.level, isUnlocked);
        buttonContainer.appendChild(btn);
      });

      waveOverlay.appendChild(buttonContainer);
      document.body.appendChild(waveOverlay);
      fadeMenuElementsIn([title, buttonContainer]);

      backBtn.addEventListener("click", () => {
        triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
        fadeMenuElementsOut([title, buttonContainer], () => {
          waveOverlay.remove();
          fadeMenuElementsIn([difficultyTitle, difficultyButtons]);
        });
      });
    }

    function showDifficultyConfirmModal(difficulty, onConfirm) {
      triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
      const descriptions = {
        Hardcore: [
          "All protocols are at Trivial quality.",
          "No Starter Protocols.",
          "Skips wave selection and starts directly at wave 1.",
        ],
        Apocalypse: [
          "Skips wave selection and starts directly at wave 1.",
          "Kamikaze surge — spawn 1 to 3 extra Kamikazes every 2 to 3 seconds.",
        ]
      };

      const color = "#00d9ff";
      const lines = descriptions[difficulty] || [];

      const overlay = document.createElement("div");
      configureDisplayOverlay(overlay, 15);
      overlay.style.cssText += "background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;";

      const panel = document.createElement("div");
      panel.style.cssText = `width:min(480px,calc(100% - 48px));background:rgba(0,15,20,0.98);border:2px solid ${color};border-radius:10px;box-shadow:0 0 28px ${color}55;padding:24px;font-family:sans-serif;`;
      overlay.appendChild(panel);

      const titleEl = document.createElement("div");
      titleEl.textContent = difficulty.toUpperCase();
      titleEl.style.cssText = `color:${color};font-size:1.6rem;font-weight:bold;letter-spacing:2px;margin-bottom:14px;text-shadow:0 0 12px ${color}88;`;
      panel.appendChild(titleEl);

      const introEl = document.createElement("div");
      introEl.textContent = "This mode changes the following rules:";
      introEl.style.cssText = "color:#aaf6ff;font-size:0.95rem;margin-bottom:10px;";
      panel.appendChild(introEl);

      const list = document.createElement("ul");
      list.style.cssText = "margin:0 0 18px 18px;padding:0;";
      lines.forEach(line => {
        const li = document.createElement("li");
        li.textContent = line;
        li.style.cssText = "color:#e0ffff;font-size:0.95rem;margin-bottom:6px;line-height:1.45;";
        list.appendChild(li);
      });
      panel.appendChild(list);

      const question = document.createElement("div");
      question.textContent = "Are you sure you want to continue?";
      question.style.cssText = "color:#ffffff;font-weight:bold;font-size:1rem;margin-bottom:18px;";
      panel.appendChild(question);

      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:flex-end;gap:10px;";
      panel.appendChild(row);

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Back";
      cancelBtn.style.cssText = "padding:0.55rem 1.1rem;border-radius:6px;border:1px solid #ffffff;background:rgba(0,0,0,0.55);color:#ffffff;font-size:0.95rem;cursor:pointer;";
      row.appendChild(cancelBtn);

      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "Continue";
      confirmBtn.style.cssText = `padding:0.55rem 1.1rem;border-radius:6px;border:1px solid ${color};background:rgba(0,0,0,0.55);color:${color};font-size:0.95rem;cursor:pointer;font-weight:bold;`;
      row.appendChild(confirmBtn);

      let resolved = false;
      const close = (confirmed) => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener("keydown", onKey);
        overlay.remove();
        if (confirmed) onConfirm();
      };
      const onKey = (e) => { if (e.key === "Escape") close(false); };
      cancelBtn.addEventListener("click", () => close(false));
      confirmBtn.addEventListener("click", () => close(true));
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(overlay);
    }

    normalBtn.addEventListener("click", () => {
      fadeMenuElementsOut([title, buttonContainer], () => {
        showWaveSelectionMenu("Normal", 0, 15);
      });
    });
    hardcoreBtn.addEventListener("click", () => {
      showDifficultyConfirmModal("Hardcore", () => {
        diffOverlay.remove();
        window._selectedStartWave = 1;
        window._selectedStartLevel = 1;
        startGame("Hardcore", 0, 15);
      });
    });
    apocalypseBtn.addEventListener("click", () => {
      showDifficultyConfirmModal("Apocalypse", () => {
        diffOverlay.remove();
        window._selectedStartWave = 1;
        window._selectedStartLevel = 1;
        window._pendingStarterProtocols = [];
        showStarterProtocolModal("Apocalypse", 0, 15);
      });
    });

      // Back button
      backBtn.addEventListener("click", () => {
        fadeMenuElementsOut([title, buttonContainer], () => {
          diffOverlay.remove();
          showMenu();
        });
    });
  }

  // Draw jagged lightning bolt between two points
  function drawLightningBolt(x1, y1, x2, y2, color, segments = 8, jaggedness = 16) {
    bytesBadge.style.fontSize = "1rem";
    bytesBadge.style.background = "rgba(0, 0, 0, 0)";
    bytesBadge.style.borderRadius = "6px";
    bytesBadge.style.padding = "6px 20px";
    headerSection.appendChild(bytesBadge);

    menuOverlay.appendChild(headerSection);

    // Scrollable content area
    const scrollContent = document.createElement("div");
    scrollContent.style.flex = "1";
    scrollContent.style.width = "100%";
    menuOverlay.appendChild(scrollContent);
    document.body.appendChild(menuOverlay);

    // Back button functionality
    backBtn.addEventListener("click", () => {
      menuOverlay.remove();
      showMenu();
    });

  }

  // Draw jagged lightning bolt between two points
  function drawLightningBolt(x1, y1, x2, y2, color, segments = 8, jaggedness = 16) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    // Removed shadowColor and shadowBlur for mobs
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      // Linear interpolation
      let nx = x1 + (x2 - x1) * t;
      let ny = y1 + (y2 - y1) * t;
      // Add random jaggedness perpendicular to the main direction
      const dx = y2 - y1;
      const dy = x1 - x2;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0) {
        nx += (dx / mag) * (Math.random() - 0.5) * jaggedness;
        ny += (dy / mag) * (Math.random() - 0.5) * jaggedness;
      }
      ctx.lineTo(nx, ny);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Draw jagged lightning bolt between two points
            function drawLightningBolt(x1, y1, x2, y2, color, segments = 8, jaggedness = 16) {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                // Removed shadowColor and shadowBlur for mobs
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                for (let i = 1; i < segments; i++) {
                  const t = i / segments;
                  // Linear interpolation
                  let nx = x1 + (x2 - x1) * t;
                  let ny = y1 + (y2 - y1) * t;
                  // Add random jaggedness perpendicular to the main direction
                  const dx = y2 - y1;
                  const dy = x1 - x2;
                  const mag = Math.sqrt(dx * dx + dy * dy);
                  if (mag > 0) {
                    nx += (dx / mag) * (Math.random() - 0.5) * jaggedness;
                    ny += (dy / mag) * (Math.random() - 0.5) * jaggedness;
                  }
                  ctx.lineTo(nx, ny);
                }
                ctx.lineTo(x2, y2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.restore();
              }
            // Draw wave announcement with fade animation
            function drawWaveAnnouncement(delta) {
              if (waveAnnouncementTimer > 0) {
                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "bold 34px monospace";
                ctx.fillStyle = "#8cecff";
                ctx.shadowColor = "#00d9ff";
                ctx.shadowBlur = 16;
                // Animation: quick fade-in (first 20 frames), slower fade-out (last 40 frames)
                let alpha = 1;
                if (waveAnnouncementTimer > WAVE_ANNOUNCE_DURATION - 20) {
                  alpha = 1 - ((WAVE_ANNOUNCE_DURATION - waveAnnouncementTimer) / 20);
                } else {
                  alpha = waveAnnouncementTimer / (WAVE_ANNOUNCE_DURATION - 20);
                }
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                ctx.fillText("WAVE " + wave, canvas.width / 2, canvas.height / 2 - 22);
                ctx.restore();
                if (!paused) waveAnnouncementTimer -= delta * 60;
              }
            }
          let waveAnnouncementTimer = 60; // Show announcement at game start
          const WAVE_ANNOUNCE_DURATION = 660; // Duration for wave announcement
      // Game background image
      const backgroundImg = new window.Image();
      backgroundImg.src = "background4.png";
    // For smooth player rotation
    let playerVisualAngle = Math.PI / 2; // Start facing down
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const gameStage = document.getElementById("gameStage");

  function updateGameStageScale() {
    const viewportScaleX = window.innerWidth / GAME_STAGE_WIDTH;
    const viewportScaleY = window.innerHeight / GAME_STAGE_HEIGHT;
    const viewportAspect = window.innerWidth / window.innerHeight;
    const stageAspect = GAME_STAGE_WIDTH / GAME_STAGE_HEIGHT;
    const scale = viewportAspect < 4 / 3 || viewportAspect > stageAspect
      ? Math.min(viewportScaleX, viewportScaleY)
      : Math.max(viewportScaleX, viewportScaleY);
    document.documentElement.style.setProperty("--game-stage-scale", String(scale));
    document.documentElement.style.setProperty("--game-display-offset-y", `${GAME_DISPLAY_OFFSET_Y * scale}px`);
    document.documentElement.style.setProperty("--game-display-width", `${GAME_DISPLAY_WIDTH}px`);
    document.documentElement.style.setProperty("--game-display-height", `${GAME_DISPLAY_HEIGHT}px`);
    gameStage.style.setProperty("--game-stage-scale", String(scale));
  }

  updateGameStageScale();
  window.addEventListener("resize", updateGameStageScale);

  const mobileLandscapePrompt = document.createElement("div");
  mobileLandscapePrompt.setAttribute("role", "alert");
  mobileLandscapePrompt.setAttribute("aria-live", "assertive");
  mobileLandscapePrompt.style.cssText = "position:fixed;inset:0;z-index:25000;display:none;align-items:center;justify-content:center;box-sizing:border-box;padding:24px;background:rgba(1,8,14,0.98);color:#c8ffff;font:bold 20px monospace;text-align:center;letter-spacing:.08em;text-shadow:0 0 12px rgba(0,217,255,.7);";
  mobileLandscapePrompt.textContent = "ROTATE YOUR DEVICE TO LANDSCAPE";
  document.body.appendChild(mobileLandscapePrompt);

  const isTouchDevice = () => navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  const updateMobileOrientationPrompt = () => {
    mobileLandscapePrompt.style.display = isTouchDevice() && window.innerHeight > window.innerWidth
      ? "flex"
      : "none";
  };
  let landscapeLockWarningLogged = false;
  const requestLandscapeLock = () => {
    if (!isTouchDevice() || window.innerHeight <= window.innerWidth) return;
    const orientation = window.screen && window.screen.orientation;
    if (!orientation || typeof orientation.lock !== "function") return;
    orientation.lock("landscape").catch(error => {
      if (!landscapeLockWarningLogged) {
        landscapeLockWarningLogged = true;
        console.warn("Landscape orientation lock is unavailable; rotate the device manually.", error);
      }
    });
  };
  updateMobileOrientationPrompt();
  window.addEventListener("resize", updateMobileOrientationPrompt);
  if (window.screen && window.screen.orientation) {
    window.screen.orientation.addEventListener("change", updateMobileOrientationPrompt);
  }
  if ("PointerEvent" in window) {
    window.addEventListener("pointerdown", requestLandscapeLock);
  } else {
    window.addEventListener("touchstart", requestLandscapeLock, { passive: true });
  }

  const hudFrameOverlay = document.createElement("img");
  hudFrameOverlay.src = "lidhud2_16x9.png";
  hudFrameOverlay.alt = "";
  hudFrameOverlay.style.cssText = "position:fixed;left:50%;top:50%;width:1365px;height:768px;transform:translate(-50%,-50%) scale(var(--game-stage-scale,1));transform-origin:center;z-index:20;display:block;pointer-events:none;user-select:none;";
  document.body.appendChild(hudFrameOverlay);
  const hudStageOverlay = document.createElement("div");
  hudStageOverlay.style.cssText = "position:fixed;left:50%;top:50%;width:1365px;height:768px;transform:translate(-50%,-50%) scale(var(--game-stage-scale,1));transform-origin:center;z-index:21;pointer-events:none;user-select:none;";
  document.body.appendChild(hudStageOverlay);
  const musicVolumeControlStyle = document.createElement("style");
  musicVolumeControlStyle.textContent = "#sentinelMusicVolumeControl{position:relative;}#sentinelMusicVolumeTrack{display:none;}#sentinelMusicVolumeThumb{position:absolute;left:50%;bottom:calc(var(--music-volume,100%) - 1.5px);width:30px;height:3px;transform:translateX(-50%);border-radius:999px;background:#d9ffff;box-shadow:0 0 8px 2px #00d9ff;pointer-events:none;}#sentinelMusicVolumeSlider{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;appearance:none;-webkit-appearance:none;background:transparent;opacity:0;cursor:pointer;touch-action:none;writing-mode:vertical-lr;direction:rtl;user-select:none;-webkit-user-select:none;}#sentinelMusicVolumeControl:focus-within #sentinelMusicVolumeThumb{background:#fff;box-shadow:0 0 10px 3px #00d9ff;}";
  document.head.appendChild(musicVolumeControlStyle);
  const musicVolumeControl = document.createElement("div");
  musicVolumeControl.id = "sentinelMusicVolumeControl";
  musicVolumeControl.style.cssText = "position:absolute;left:40px;bottom:120px;width:62px;height:110px;display:flex;align-items:center;justify-content:center;pointer-events:auto;user-select:none;-webkit-user-select:none;z-index:10;";
  const musicVolumeTrack = document.createElement("div");
  musicVolumeTrack.id = "sentinelMusicVolumeTrack";
  const musicVolumeThumb = document.createElement("div");
  musicVolumeThumb.id = "sentinelMusicVolumeThumb";
  const musicVolumeSlider = document.createElement("input");
  musicVolumeSlider.id = "sentinelMusicVolumeSlider";
  musicVolumeSlider.type = "range";
  musicVolumeSlider.min = "0";
  musicVolumeSlider.max = "100";
  musicVolumeSlider.step = "1";
  musicVolumeSlider.value = String(Math.round(window.sentinelMusicMasterVolume * 100));
  musicVolumeSlider.setAttribute("aria-label", "Music volume");
  function updateMusicVolumeDisplay() {
    const percent = Number(musicVolumeSlider.value);
    musicVolumeThumb.style.setProperty("--music-volume", `${percent}%`);
    musicVolumeSlider.setAttribute("aria-valuetext", `${percent}%`);
  }
  musicVolumeSlider.addEventListener("input", () => {
    setMusicMasterVolume(Number(musicVolumeSlider.value) / 100);
    updateMusicVolumeDisplay();
  });
  musicVolumeControl.addEventListener("pointerdown", event => event.stopPropagation());
  musicVolumeSlider.addEventListener("pointerdown", () => musicVolumeControl.classList.add("is-dragging"));
  const finishMusicVolumeDrag = () => musicVolumeControl.classList.remove("is-dragging");
  window.addEventListener("pointerup", finishMusicVolumeDrag);
  window.addEventListener("pointercancel", finishMusicVolumeDrag);
  musicVolumeControl.append(musicVolumeTrack, musicVolumeThumb, musicVolumeSlider);
  updateMusicVolumeDisplay();
  hudStageOverlay.appendChild(musicVolumeControl);
  const runMenuTouchOverlay = document.createElement("div");
  runMenuTouchOverlay.style.cssText = "position:fixed;left:50%;top:50%;width:1365px;height:768px;transform:translate(-50%,-50%) scale(var(--game-stage-scale,1));transform-origin:center;z-index:30;pointer-events:none;user-select:none;";
  document.body.appendChild(runMenuTouchOverlay);
  const runMenuTouchPulseStyle = document.createElement("style");
  runMenuTouchPulseStyle.textContent = "@keyframes sentinelRunMenuTouchPulse{0%,100%{border-color:rgba(0,156,207,.5);box-shadow:0 0 0 1px rgba(0,156,207,.2),0 0 8px 1px rgba(0,156,207,.2)}50%{border-color:rgba(0,205,255,1);box-shadow:0 0 0 1px rgba(0,205,255,.62),0 0 14px 0 rgba(0,205,255,.7),0 0 22px 1px rgba(0,205,255,.38)}}#sentinelRunMenuTouchButton{border:0;animation:none}#sentinelRunMenuTouchButton::before{content:'';position:absolute;inset:7.5px;border:1px solid rgba(0,156,207,.5);border-radius:50%;pointer-events:none;animation:sentinelRunMenuTouchPulse 1.6s ease-in-out infinite;}";
  document.head.appendChild(runMenuTouchPulseStyle);
  let runMenuTouchButtonReady = false;
  const runMenuTouchButton = document.createElement("button");
  runMenuTouchButton.id = "sentinelRunMenuTouchButton";
  runMenuTouchButton.type = "button";
  runMenuTouchButton.setAttribute("aria-label", "Open run menu, Escape");
  runMenuTouchButton.title = "Open run menu (Escape)";
  runMenuTouchButton.style.cssText = "position:absolute;left:1271.55px;top:515.78px;width:42px;height:41px;padding:0;border:0;border-radius:50%;background:transparent;transform:none;touch-action:manipulation;pointer-events:auto;display:none;z-index:5;cursor:pointer;";
  runMenuTouchButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showReturnToMenuModal();
  });
  runMenuTouchOverlay.appendChild(runMenuTouchButton);
  function updateRunMenuTouchButtonVisibility() {
    const shouldShow = runMenuTouchButtonReady && gameStarted && !showMenuScreen && !showLoadingScreen && !gameOver;
    runMenuTouchButton.style.display = shouldShow ? "block" : "none";
  }
  const hudWaveOverlay = document.createElement("div");
  hudWaveOverlay.style.cssText = "position:fixed;left:50%;top:50%;width:1365px;height:768px;transform:translate(-50%,-50%) scale(var(--game-stage-scale,1));transform-origin:center;z-index:23;pointer-events:none;user-select:none;";
  document.body.appendChild(hudWaveOverlay);
  const hudXrayCanvas = document.createElement("canvas");
  hudXrayCanvas.width = canvas.width;
  hudXrayCanvas.height = canvas.height;
  hudXrayCanvas.style.cssText = `position:absolute;left:${(GAME_STAGE_WIDTH - canvas.width) / 2}px;top:0;width:${canvas.width}px;height:${canvas.height}px;z-index:0;pointer-events:none;user-select:none;background:transparent;`;
  hudStageOverlay.appendChild(hudXrayCanvas);
  const hudXrayCtx = hudXrayCanvas.getContext("2d");
  const hudWaveDisplay = document.createElement("div");
  hudWaveDisplay.id = "hudWaveDisplay";
  hudWaveDisplay.style.cssText = "position:absolute;top:24px;left:50%;width:1365px;height:30px;transform:translateX(-50%);z-index:1;display:flex;align-items:center;justify-content:center;color:#00d9ff;font:bold 14px monospace;text-align:center;line-height:30px;white-space:nowrap;text-shadow:0 0 18px #00d9ff,0 0 4px #000;pointer-events:none;user-select:none;";
  hudWaveDisplay.setAttribute("aria-label", "Initializing");
  const hudInitializingLabel = document.createElement("span");
  hudInitializingLabel.textContent = "INITIALIZING";
  const hudInitializingDots = Array.from({ length: 3 }, (_, index) => {
    const dot = document.createElement("span");
    dot.className = "sentinel-initializing-dot";
    dot.textContent = ".";
    dot.style.animationDelay = `${index * 0.18}s`;
    return dot;
  });
  const hudInitializingStyle = document.createElement("style");
  hudInitializingStyle.textContent = "@keyframes sentinelInitializingDot{0%,20%{opacity:.25}45%,100%{opacity:1}}.sentinel-initializing-dot{display:inline-block;animation:sentinelInitializingDot 2.4s infinite;}";
  document.head.appendChild(hudInitializingStyle);
  function setHudStatus(label, dotCount, mode) {
    hudInitializingLabel.textContent = label;
    hudWaveDisplay.replaceChildren(hudInitializingLabel, ...hudInitializingDots.slice(0, dotCount));
    hudWaveDisplay.style.top = "24px";
    hudWaveDisplay.style.height = "30px";
    hudWaveDisplay.style.lineHeight = "30px";
    hudWaveDisplay.style.font = "bold 14px monospace";
    hudWaveDisplay.setAttribute("aria-label", `${label}${".".repeat(dotCount)}`);
    hudWaveDisplay.dataset.displayMode = mode;
    hudWaveDisplay.style.display = "flex";
  }
  setHudStatus("SENTINEL ONLINE", 3, "title");
  hudWaveOverlay.appendChild(hudWaveDisplay);
  const hudSignalDisplay = document.createElement("div");
  hudSignalDisplay.id = "hudSignalDisplay";
  hudSignalDisplay.style.cssText = "position:absolute;top:24px;left:calc(50% - 150px);height:30px;display:flex;align-items:center;gap:6px;color:#00d9ff;font:10px sans-serif;text-shadow:0 0 6px #00d9ff;pointer-events:none;user-select:none;";
  hudSignalDisplay.setAttribute("aria-label", "Frame rate");
  hudSignalDisplay.title = "Frame rate";
  const hudSignalBars = document.createElement("div");
  hudSignalBars.style.cssText = "height:20px;display:flex;align-items:flex-end;gap:2px;";
  const hudSignalBarHeights = [7, 11, 15, 19];
  const hudSignalBarElements = hudSignalBarHeights.map((height) => {
    const bar = document.createElement("div");
    bar.style.cssText = `width:4px;height:${height}px;background:rgba(0,217,255,0.22);box-shadow:0 0 4px rgba(0,217,255,0.45);`;
    hudSignalBars.appendChild(bar);
    return bar;
  });
  const hudFpsValue = document.createElement("span");
  hudFpsValue.textContent = "-- FPS";
  hudFpsValue.style.cssText = "min-width:40px;font-weight:bold;white-space:nowrap;";
  hudSignalDisplay.appendChild(hudSignalBars);
  hudSignalDisplay.appendChild(hudFpsValue);
  hudStageOverlay.appendChild(hudSignalDisplay);

  const hudDataDisplay = document.createElement("div");
  hudDataDisplay.id = "hudDataDisplay";
  hudDataDisplay.style.cssText = "position:absolute;top:24px;right:calc(50% - 160px);width:80px;height:30px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;color:#00d9ff;font:bold 10px monospace;line-height:11px;text-align:center;text-shadow:0 0 6px #00d9ff;pointer-events:none;user-select:none;white-space:nowrap;";
  hudDataDisplay.setAttribute("aria-label", "Collected data: 0 KB");
  hudDataDisplay.title = "Collected data: 0 KB";
  const hudDataLabel = document.createElement("span");
  hudDataLabel.textContent = "DATA";
  const hudDataValue = document.createElement("span");
  hudDataValue.textContent = "0 KB";
  hudDataValue.style.cssText = "max-width:100%;overflow:hidden;text-overflow:ellipsis;text-align:center;";
  hudDataDisplay.appendChild(hudDataLabel);
  hudDataDisplay.appendChild(hudDataValue);
  hudStageOverlay.appendChild(hudDataDisplay);

  let hudFpsFrameCount = 0;
  let hudFpsSampleStart = performance.now();
  function updateHudSignal(timestamp) {
    hudFpsFrameCount += 1;
    const elapsed = timestamp - hudFpsSampleStart;
    if (elapsed >= 1000) {
      const fps = Math.round((hudFpsFrameCount * 1000) / elapsed);
      const activeBars = fps >= 55 ? 4 : fps >= 40 ? 3 : fps >= 25 ? 2 : fps > 0 ? 1 : 0;
      const signalColor = fps < 20 ? "#ffb347" : "#00d9ff";
      hudFpsValue.textContent = `${fps} FPS`;
      hudSignalDisplay.title = `Frame rate: ${fps} FPS`;
      hudSignalDisplay.setAttribute("aria-label", `Frame rate: ${fps} FPS`);
      hudSignalBarElements.forEach((bar, index) => {
        const active = index < activeBars;
        bar.style.background = active ? signalColor : "rgba(0,217,255,0.22)";
        bar.style.boxShadow = active ? `0 0 5px ${signalColor}` : "0 0 4px rgba(0,217,255,0.25)";
      });
      hudFpsFrameCount = 0;
      hudFpsSampleStart = timestamp;
    }
  }

  function getCanvasMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const offsetX = (rect.width - canvas.width * scale) / 2;
    const offsetY = (rect.height - canvas.height * scale) / 2;
    return {
      x: (e.clientX - rect.left - offsetX) / scale,
      y: (e.clientY - rect.top - offsetY) / scale
    };
  }

  let keys = {}, paused = false, gameOver = false, tutorialModalPause = false;
  // Player sprite
  const playerImg = new window.Image();
  playerImg.src = "player_drone.png";
  // Enemy sprites
  const gruntImg = new window.Image();
  gruntImg.src = "grunt.png";
  const bruteImg = new window.Image();
  bruteImg.src = "brute.png";
  const bruteBossImg = new window.Image();
  bruteBossImg.src = encodeURI("brute boss.png");
  const slingerImg = new window.Image();
  slingerImg.src = "slinger.png";
  const kamikazeImg = new window.Image();
  kamikazeImg.src = "kamikaze.png";
  const stalkerImg = new window.Image();
  stalkerImg.src = "stalker.png";
  const stalkerBossImg = new window.Image();
  stalkerBossImg.src = encodeURI("stalker boss.png");
  const beamerBossImg = new window.Image();
  beamerBossImg.src = encodeURI("Beamer boss .png");
  const beamerImg = new window.Image();
  beamerImg.src = "beamer.png";
  const shielderImg = new window.Image();
  shielderImg.src = "shielder.png";






  //========= GAME STATE =========//
  let wave = 1, xp = 0, xpToLevel = 10, level = 1, statPoints = 5; // Start at wave 1
  const COLLECTED_BYTES_STORAGE_KEY = "sentinel.collectedBytes.v1";
  const UNLOCKED_WAVES_STORAGE_KEY = "sentinel.unlockedWaves.v1";
  const COMPLETED_TRIAL_RUNS_STORAGE_KEY = "sentinel.completedTrialRuns.v1";
  const BYTE_REWARD_MULTIPLIER = 10;
  let completedTrialRuns = 0;
  let runDeathCounted = false;
  let runCollectedBytes = 0;
  let totalCollectedBytes = 0;
  let runBytesFinalized = false;
  let runHealthLost = 0;
  let runWavesCleared = 0;
  let runStartWaves = 0;
  const bytePickupNotifications = [];

  try {
    const storedTrialRuns = localStorage.getItem(COMPLETED_TRIAL_RUNS_STORAGE_KEY);
    if (storedTrialRuns !== null) {
      const parsedTrialRuns = Number(storedTrialRuns);
      if (Number.isSafeInteger(parsedTrialRuns) && parsedTrialRuns >= 0) {
        completedTrialRuns = parsedTrialRuns;
      } else {
        console.warn("Ignoring invalid saved trial run count.");
      }
    }
  } catch (error) {
    console.error("Unable to load saved trial run count.", error);
  }

  function recordCompletedTrialRun() {
    completedTrialRuns += 1;
    try {
      localStorage.setItem(COMPLETED_TRIAL_RUNS_STORAGE_KEY, String(completedTrialRuns));
    } catch (error) {
      console.error("Unable to save trial run count.", error);
    }
  }

  window.resetCompletedTrialRuns = function() {
    completedTrialRuns = 0;
    try {
      localStorage.setItem(COMPLETED_TRIAL_RUNS_STORAGE_KEY, String(completedTrialRuns));
    } catch (error) {
      console.error("Unable to reset saved trial run count.", error);
    }
  };

  function formatByteAmount(amount) {
    const units = ["KB", "MB", "GB", "TB", "PB"];
    let value = Math.max(0, Number(amount) || 0);
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    const formattedValue = unitIndex === 0
      ? Math.floor(value).toLocaleString()
      : value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return `${formattedValue} ${units[unitIndex]}`;
  }

  let lastHudDataDisplayValue = null;
  function updateHudDataDisplay() {
    const displayedBytes = totalCollectedBytes + (runBytesFinalized ? 0 : runCollectedBytes);
    const formattedBytes = formatByteAmount(displayedBytes);
    if (formattedBytes === lastHudDataDisplayValue) return;
    lastHudDataDisplayValue = formattedBytes;
    hudDataValue.textContent = formattedBytes;
    hudDataDisplay.title = `Collected data, including current run: ${formattedBytes}`;
    hudDataDisplay.setAttribute("aria-label", hudDataDisplay.title);
  }

  // Milestone waves available across all difficulties: 1, 5, 15, 25, 35, 45
  const MILESTONE_WAVES = [
    { wave: 1, level: 1 },
    { wave: 5, level: 5 },
    { wave: 15, level: 9 },
    { wave: 25, level: 13 },
    { wave: 35, level: 17 },
    { wave: 45, level: 21 }
  ];

  function getUnlockedWaves() {
    try {
      const raw = localStorage.getItem(UNLOCKED_WAVES_STORAGE_KEY);
      if (!raw) {
        // First run: only wave 1 is available
        return [1];
      }
      
      const parsed = JSON.parse(raw);
      
      // FIX: If we have old format [1, 5, 10, 20], upgrade to [1]
      if (Array.isArray(parsed) && parsed.length <= 4 && parsed[0] === 1) {
        const isOldFormat = parsed.every(w => [1, 5, 10, 20].includes(w));
        if (isOldFormat) {
          const newFormat = [1];
          localStorage.setItem(UNLOCKED_WAVES_STORAGE_KEY, JSON.stringify(newFormat));
          return newFormat;
        }
      }
      
      return parsed;
    } catch (err) {
      return [1];
    }
  }

  function unlockWave(waveNum) {
    const unlocked = getUnlockedWaves();
    if (!unlocked.includes(waveNum)) {
      unlocked.push(waveNum);
      unlocked.sort((a, b) => a - b);
      localStorage.setItem(UNLOCKED_WAVES_STORAGE_KEY, JSON.stringify(unlocked));
    }
  }

  function isWaveUnlocked(waveNum) {
    return getUnlockedWaves().includes(waveNum);
  }

  function lockWave(waveNum) {
    const unlocked = getUnlockedWaves();
    const index = unlocked.indexOf(waveNum);
    if (index > -1) {
      unlocked.splice(index, 1);
      localStorage.setItem(UNLOCKED_WAVES_STORAGE_KEY, JSON.stringify(unlocked));
    }
  }

  function loadCollectedBytes() {
    try {
      const raw = localStorage.getItem(COLLECTED_BYTES_STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch (err) {
      return 0;
    }
  }

  function saveCollectedBytes() {
    try {
      localStorage.setItem(COLLECTED_BYTES_STORAGE_KEY, String(Math.max(0, Math.floor(totalCollectedBytes))));
    } catch (err) {}
  }

  function collectRunBytes(amount) {
    const value = Math.max(0, Math.floor(amount || 0));
    if (value <= 0) return;
    runCollectedBytes += value;
    updateHudDataDisplay();
    bytePickupNotifications.push({
      amount: value,
      timer: 80,
      maxTimer: 80
    });
    while (bytePickupNotifications.length > 6) {
      bytePickupNotifications.shift();
    }
  }

  function finalizeRunBytes() {
    if (runBytesFinalized) return;
    runBytesFinalized = true;
    if (runCollectedBytes > 0) {
      totalCollectedBytes += runCollectedBytes;
      saveCollectedBytes();
    }
    updateHudDataDisplay();
  }

  function endRunWithGameOver() {
    gameOver = true;
    window._gameOverTime = undefined;
    window._gameOverFinalTime = undefined;
    window._gameOverExplosionDone = false;
    window._gameOverBurstDone = false;
    window._gameOverDeathPos = null;
    window._playerUsedContinue = true;
    window._secondDeathPending = false;
    window._victoryTriggered = false;
    clearVictoryConsole();
    followMouse = false;
    paused = false;
    showStats = false;
    stopLowHealthSound();
    deactivateAttack();
  }

  totalCollectedBytes = loadCollectedBytes();
  updateHudDataDisplay();
  let playerLevelUpTimer = 0;
  let showStats = false, gameStarted = false;
  let statsMenuAnimationProgress = 0;
  let returnToMenuModalOpen = false;
  window._editorSessionActive = false;
  const protocolWarnings = [];
  // Tutorial hook: expose warnings array so tutorial.js can inject persistent entries
  window._tutProtocolWarningsRef = protocolWarnings;
  // Tutorial hook: push a warning into the in-game warning system
  window._tutPushWarning = (text, color, timer) => {
    protocolWarnings.push({ text: text, color: color || '#00ffdd', timer: timer || 180 });
    while (protocolWarnings.length > 4) protocolWarnings.shift();
  };
  window._getTotalBytes = () => totalCollectedBytes;
  let selectedProtocol = -1;
  let hoveredProtocol = -1;
  let lastHoveredProtocol = -1;
  let hoveredProtocolSince = 0;
  // Block game loop if loading/menu is active
  function isGameBlocked() {
    return showLoadingScreen || showMenuScreen;
  }
  let startTime = Date.now();
  let mouseX = 512, mouseY = 425;
  let followMouse = false;

  function showReturnToMenuModal() {
    if (returnToMenuModalOpen || !gameStarted || showMenuScreen) return;
    triggerLoadingFlash(false, MENU_LOADING_FLASH_DURATION);
    returnToMenuModalOpen = true;

    const previousFollowMouse = followMouse;
    const previousPaused = paused;
    const previousShowStats = showStats;
    const previousCanvasVisibility = canvas.style.visibility;
    const previousXrayVisibility = hudXrayCanvas.style.visibility;
    const previousWaveDisplay = hudWaveDisplay.style.display;

    canvas.style.visibility = "hidden";
    hudXrayCanvas.style.visibility = "hidden";
    hudWaveDisplay.style.display = "none";
    followMouse = false;
    paused = true;
    showStats = true;

    const confirmOverlay = document.createElement("div");
    configureDisplayOverlay(confirmOverlay, 15);
    confirmOverlay.style.background = "transparent";
    confirmOverlay.style.display = "flex";
    confirmOverlay.style.alignItems = "center";
    confirmOverlay.style.justifyContent = "center";

    const confirmPanel = document.createElement("div");
    confirmPanel.style.width = "min(560px, calc(100% - 48px))";
    confirmPanel.style.background = "transparent";
    confirmPanel.style.border = "0";
    confirmPanel.style.boxShadow = "none";
    confirmPanel.style.padding = "12px";
    confirmPanel.style.color = "#c8ffff";
    confirmPanel.style.fontFamily = "sans-serif";
    confirmPanel.style.textAlign = "center";
    confirmOverlay.appendChild(confirmPanel);

    const confirmTitle = document.createElement("div");
    confirmTitle.textContent = "END RUN";
    confirmTitle.style.color = "#eaffff";
    confirmTitle.style.fontWeight = "bold";
    confirmTitle.style.fontSize = "1.3rem";
    confirmTitle.style.letterSpacing = "0.08em";
    confirmTitle.style.textShadow = "0 0 14px rgba(0, 217, 255, 0.65)";
    confirmTitle.style.marginBottom = "10px";
    confirmPanel.appendChild(confirmTitle);

    const confirmMessage = document.createElement("div");
    confirmMessage.textContent = "End this run and view your results?";
    confirmMessage.style.color = "#aaf6ff";
    confirmMessage.style.fontSize = "1rem";
    confirmMessage.style.lineHeight = "1.4";
    confirmMessage.style.marginBottom = "14px";
    confirmPanel.appendChild(confirmMessage);

    const actionRow = document.createElement("div");
    actionRow.style.display = "flex";
    actionRow.style.justifyContent = "center";
    actionRow.style.gap = "8px";
    confirmPanel.appendChild(actionRow);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.padding = "0.5rem 0.85rem";
    cancelBtn.style.borderRadius = "0";
    cancelBtn.style.border = "1px solid rgba(0,217,255,0.5)";
    cancelBtn.style.background = "transparent";
    cancelBtn.style.color = "#8cecff";
    cancelBtn.style.cursor = "pointer";
    actionRow.appendChild(cancelBtn);

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.textContent = "End Run";
    confirmBtn.style.padding = "0.5rem 0.85rem";
    confirmBtn.style.borderRadius = "0";
    confirmBtn.style.border = "1px solid rgba(0,217,255,0.8)";
    confirmBtn.style.background = "transparent";
    confirmBtn.style.color = "#8cecff";
    confirmBtn.style.cursor = "pointer";
    actionRow.appendChild(confirmBtn);

    const closeModal = (confirmed) => {
      if (!returnToMenuModalOpen) return;
      returnToMenuModalOpen = false;
      document.removeEventListener("keydown", onModalKeyDown);
      confirmOverlay.remove();
      canvas.style.visibility = previousCanvasVisibility;
      hudXrayCanvas.style.visibility = previousXrayVisibility;
      hudWaveDisplay.style.display = previousWaveDisplay;
      if (confirmed) {
        endRunWithGameOver();
      } else {
        followMouse = previousFollowMouse;
        paused = previousPaused;
        showStats = previousShowStats;
      }
    };

    const onModalKeyDown = (evt) => {
      if (evt.key === "Escape") {
        evt.preventDefault();
        closeModal(false);
      } else if (evt.key === "Enter") {
        evt.preventDefault();
        closeModal(true);
      }
    };

    cancelBtn.addEventListener("click", () => closeModal(false));
    confirmBtn.addEventListener("click", () => closeModal(true));
    confirmOverlay.addEventListener("click", (evt) => {
      if (evt.target === confirmOverlay) {
        closeModal(false);
      }
    });

    document.addEventListener("keydown", onModalKeyDown);
    document.body.appendChild(confirmOverlay);
  }

  window._sentinelWaveState = window._sentinelWaveState || { burstCount: 3, burstIndex: 0, burstTimer: 0 };
  let burstCount = window._sentinelWaveState.burstCount;
  let burstIndex = window._sentinelWaveState.burstIndex;
  let burstTimer = window._sentinelWaveState.burstTimer;
  // Burst interval in frames (higher = longer pause between bursts)
  let burstInterval = 120; // Increased for bigger cooldown
  const INTER_WAVE_DELAY_SECONDS = 8;
  const FINAL_CAMPAIGN_WAVE = 45;
  let interWaveDelayTimer = 0;
  let interWavePending = false;

  function clearVictoryConsole() {
    clearInterval(window._victoryConsoleTypewriter);
    clearTimeout(window._victoryConsoleFadeTimer);
    if (window._victoryConsoleKeyHandler) {
      document.removeEventListener("keydown", window._victoryConsoleKeyHandler, true);
    }
    window._victoryConsoleOverlay?.remove();
    window._victoryConsoleOverlay = null;
    window._victoryConsoleTypewriter = null;
    window._victoryConsoleKeyHandler = null;
    window._victoryConsoleFadeTimer = null;
    window._victoryAwaitingAcknowledgment = false;
  }

  function showVictoryConsole(onComplete) {
    clearVictoryConsole();
    window._victoryAwaitingAcknowledgment = true;
    let writingComplete = false;
    let acknowledged = false;

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Victory protocol acknowledgment");
    configureDisplayOverlay(overlay, 25);
    overlay.style.top = "50%";
    overlay.style.cssText += "display:flex;align-items:center;justify-content:center;padding:24px;background:transparent;pointer-events:auto;";

    const panel = document.createElement("div");
    panel.style.cssText = "width:min(680px,100%);box-sizing:border-box;padding:28px 32px;background:linear-gradient(145deg,rgba(5,24,38,.78),rgba(2,10,19,.78));border:1px solid rgba(0,217,255,.82);box-shadow:0 0 26px rgba(0,180,255,.28),inset 0 0 22px rgba(0,180,255,.1);color:#eaffff;font-family:'Cascadia Code','Cascadia Mono','Lucida Console',Consolas,monospace;text-align:center;";
    const heading = document.createElement("div");
    heading.textContent = "COMBAT SYSTEMS DIVISION // VICTORY PROTOCOL";
    heading.style.cssText = "margin-bottom:18px;color:#8cecff;font-size:13px;font-weight:700;letter-spacing:.12em;text-shadow:0 0 9px rgba(0,217,255,.6);";
    const message = document.createElement("div");
    message.style.cssText = "min-height:3em;color:#eaffff;font-size:18px;font-weight:500;line-height:1.55;letter-spacing:.025em;text-shadow:0 0 5px rgba(83,200,255,.3);white-space:pre-wrap;";
    const acknowledgeButton = document.createElement("button");
    acknowledgeButton.type = "button";
    acknowledgeButton.textContent = "ACKNOWLEDGE";
    acknowledgeButton.disabled = true;
    acknowledgeButton.style.cssText = "display:block;margin:24px auto 0;padding:10px 24px;background:rgba(0,30,44,.8);border:1px solid rgba(0,217,255,.8);color:#b8f5ff;font:700 13px 'Cascadia Code','Cascadia Mono','Lucida Console',Consolas,monospace;letter-spacing:.12em;cursor:pointer;box-shadow:0 0 14px rgba(0,180,255,.18);";
    panel.append(heading, message, acknowledgeButton);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    window._victoryConsoleOverlay = overlay;

    const acknowledge = () => {
      if (!writingComplete || acknowledged) return;
      acknowledged = true;
      window._victoryAwaitingAcknowledgment = false;
      if (window._victoryConsoleKeyHandler) {
        document.removeEventListener("keydown", window._victoryConsoleKeyHandler, true);
        window._victoryConsoleKeyHandler = null;
      }
      overlay.style.transition = "opacity 220ms ease";
      overlay.style.opacity = "0";
      window._victoryConsoleFadeTimer = setTimeout(() => {
        overlay.remove();
        if (window._victoryConsoleOverlay === overlay) {
          window._victoryConsoleOverlay = null;
        }
        window._victoryConsoleFadeTimer = null;
        onComplete();
      }, 220);
    };
    acknowledgeButton.addEventListener("click", acknowledge);
    window._victoryConsoleKeyHandler = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Enter" || event.code === "Space") acknowledge();
    };
    document.addEventListener("keydown", window._victoryConsoleKeyHandler, true);

    const fullMessage = "Trial completed.\nAuto-destruction sequence activated.";
    let typedCharacters = 0;
    window._victoryConsoleTypewriter = setInterval(() => {
      typedCharacters = Math.min(typedCharacters + 1, fullMessage.length);
      message.textContent = fullMessage.slice(0, typedCharacters) + (typedCharacters < fullMessage.length ? "_" : "");
      if (typedCharacters >= fullMessage.length) {
        clearInterval(window._victoryConsoleTypewriter);
        window._victoryConsoleTypewriter = null;
        writingComplete = true;
        acknowledgeButton.disabled = false;
        acknowledgeButton.focus();
      }
    }, 30);
  }

  function triggerVictoryIfFinalWaveCleared() {
    if (!window._victoryTriggered && !gameOver && wave > FINAL_CAMPAIGN_WAVE) {
      wave = FINAL_CAMPAIGN_WAVE;
      interWavePending = false;
      interWaveDelayTimer = 0;
      window._victoryTriggered = true;
      window._victoryTime = undefined;
      transitionToVictoryMusic();
      showVictoryConsole(() => {
        if (window._victoryTriggered && !gameOver) {
          window._victoryTime = Date.now();
        }
      });
    }
    return !!window._victoryTriggered;
  }

  window.testVictorySequence = function() {
    const previousStartWave = window._selectedStartWave;
    const previousStartLevel = window._selectedStartLevel;
    loadingOverlay.remove();
    document.getElementById("menuOverlay")?.remove();
    showLoadingScreen = false;
    showMenuScreen = false;
    fadeOutMenuMusic();
    window._selectedStartWave = FINAL_CAMPAIGN_WAVE;
    window._selectedStartLevel = 1;
    beginGame("Normal", 0, 15);
    if (previousStartWave === undefined) delete window._selectedStartWave;
    else window._selectedStartWave = previousStartWave;
    if (previousStartLevel === undefined) delete window._selectedStartLevel;
    else window._selectedStartLevel = previousStartLevel;

    clearVictoryConsole();
    window._gameOverOverlay?.remove();
    window._gameOverOverlay = null;
    window._victoryTriggered = false;
    window._victoryTime = undefined;
    window._victorySecondBurstDone = false;
    window._secondDeathPending = false;
    window._playerUsedContinue = false;
    window._gameOverTime = undefined;
    window._gameOverExplosionDone = false;
    window._gameOverBurstDone = false;
    window._editorSessionActive = false;
    window._timelineWaveState = null;
    window._sentinelWaveState = { burstCount: 0, burstIndex: 0, burstTimer: 0 };
    burstCount = 0;
    burstIndex = 0;
    burstTimer = 0;
    enemies.length = 0;
    mines.length = 0;
    wave = FINAL_CAMPAIGN_WAVE + 1;
    runWavesCleared = FINAL_CAMPAIGN_WAVE;
    runStartWaves = 0;
    gameOver = false;
    followMouse = true;
    paused = false;
    showStats = false;
    window._introPhase = null;
    triggerVictoryIfFinalWaveCleared();
    return "Victory sequence started. Victory should be displayed at Wave 45.";
  };
  // For future: burstInterval can be scaled for difficulty
  let enemiesToSpawn = 0;
  const KAMIKAZE_MINE_PARTICLE_COUNT = 12;
  const KAMIKAZE_DEATH_PARTICLE_COUNT = 8;
  const MAX_PARTICLES = 400;
  const MAX_XPDROP_PARTICLES = 80;

  if (typeof window.SentinelWaveEnemyHealthModifier !== "number") {
    window.SentinelWaveEnemyHealthModifier = 1.3;
  }
  if (typeof window.SentinelWaveEnemyDamageModifier !== "number") {
    window.SentinelWaveEnemyDamageModifier = 3;
  }

  function applyWaveEnemyModifiers(enemy) {
    if (!enemy) return enemy;
    const healthMod = Number(window.SentinelWaveEnemyHealthModifier);
    const damageMod = Number(window.SentinelWaveEnemyDamageModifier);
    const resolvedHealthMod = Number.isFinite(healthMod) ? healthMod : 1;
    const resolvedDamageMod = Number.isFinite(damageMod) ? damageMod : 1;

    if (typeof enemy.health === "number") {
      enemy.health = Math.max(0, enemy.health * resolvedHealthMod);
    }
    if (typeof enemy.damage === "number") {
      enemy.damage = Math.max(0, enemy.damage * resolvedDamageMod);
    }
    return enemy;
  }

  const player = {
    x: canvas.width / 2, y: 425, radius: 20,
    baseSpeed: 2, speed: 2,
    health: 10, maxHealth: 10,
    damage: 1,
    attackCooldown: 0, cooldownBase: 20,
    attackAnimationTimer: 0,
    range: 80,
    stats: { Range: 0, Power: 0, AttackSpeed: 0, Movement: 0, Vitality: 0, Pickup: 0 },
    pickupRadius: 48
  };
  window.player = player;

  const enemies = [], projectiles = [], healthDrops = [], xpDrops = [], slingerDrops = [], bruteDrops = [], protocolOrbs = [], particles = [], mines = [];
  const enemyPool = [], projectilePool = [], particlePool = [];

  function clearPooledObject(obj) {
    for (const key in obj) delete obj[key];
    return obj;
  }

  function removeAtSwap(array, index) {
    const lastIndex = array.length - 1;
    const item = array[index];
    if (index !== lastIndex) array[index] = array[lastIndex];
    array.pop();
    return item;
  }

  function spawnEnemy() {
    const enemy = enemyPool.length ? clearPooledObject(enemyPool.pop()) : {};
    enemies.push(enemy);
    return enemy;
  }

  function releaseEnemyAt(index) {
    const enemy = removeAtSwap(enemies, index);
    enemyPool.push(clearPooledObject(enemy));
  }

  function spawnProjectile(x, y, dx, dy, damage, radius, color, type) {
    const projectile = projectilePool.length ? projectilePool.pop() : { trail: [] };
    clearPooledObject(projectile);
    projectile.x = x;
    projectile.y = y;
    projectile.dx = dx;
    projectile.dy = dy;
    projectile.damage = damage;
    projectile.radius = typeof radius === "number" ? radius : 4;
    projectile.color = color || "#ff8844";
    projectile.type = type || "enemyProjectile";
    if (!projectile.trail) projectile.trail = [];
    projectile.trail.length = 0;
    projectiles.push(projectile);
    return projectile;
  }

  function releaseProjectileAt(index) {
    const projectile = removeAtSwap(projectiles, index);
    if (projectile.trail) projectile.trail.length = 0;
    projectilePool.push(clearPooledObject(projectile));
  }

  function spawnBurningArea(x, y, options = {}) {
    const radius = typeof options.radius === "number" ? options.radius : 72;
    const duration = typeof options.duration === "number" ? options.duration : 360;
    const tickInterval = typeof options.tickInterval === "number" ? options.tickInterval : 36;
    const damagePerTick = typeof options.damage === "number" ? options.damage : 1;
    const overlapDistance = radius * 0.8;
    const nearbyBurnZones = [];

    for (let mineIndex = 0; mineIndex < mines.length; mineIndex++) {
      const mine = mines[mineIndex];
      if (!mine || mine.type !== "burn") continue;
      const dist = Math.hypot(x - mine.x, y - mine.y);
      if (dist <= overlapDistance) {
        nearbyBurnZones.push(mine);
      }
    }

    if (nearbyBurnZones.length >= 2) {
      let strongestZone = nearbyBurnZones[0];
      for (let zoneIndex = 1; zoneIndex < nearbyBurnZones.length; zoneIndex++) {
        if ((nearbyBurnZones[zoneIndex].timer || 0) > (strongestZone.timer || 0)) {
          strongestZone = nearbyBurnZones[zoneIndex];
        }
      }
      strongestZone.timer = Math.max(strongestZone.timer || 0, duration);
      strongestZone.radius = Math.max(strongestZone.radius || 0, radius);
      strongestZone.tickInterval = Math.min(strongestZone.tickInterval || tickInterval, tickInterval);
      strongestZone.damagePerTick = Math.max(strongestZone.damagePerTick || 0, damagePerTick);
      return;
    }

    mines.push({
      type: "burn",
      x,
      y,
      radius,
      _fullRadius: radius,
      _growRadius: 0,
      timer: duration,
      tickInterval,
      tickTimer: 0,
      damagePerTick,
      active: true
    });
  }

  function spawnParticle(x, y, dx, dy, life, color, decay, size, type) {
    const particle = particlePool.length ? particlePool.pop() : {};
    particle.x = x;
    particle.y = y;
    particle.dx = dx;
    particle.dy = dy;
    particle.life = life;
    particle.color = color;
    particle.decay = typeof decay === "number" ? decay : 1;
    particle.size = typeof size === "number" ? size : 2;
    particle.type = type || "generic";
    particles.push(particle);
    return particle;
  }

  function emitBruteBossInfernoParticles(enemy, step) {
    enemy.bruteBossInfernoParticleCooldown =
      (enemy.bruteBossInfernoParticleCooldown || 0) - step;
    if (enemy.bruteBossInfernoParticleCooldown > 0) return;
    enemy.bruteBossInfernoParticleCooldown = 1;

    const range = Math.max(enemy.radius, enemy.bruteBossInfernoRange || 0);
    for (const coneAngle of enemy.bruteBossInfernoAngles || []) {
      for (let particleIndex = 0; particleIndex < 6; particleIndex++) {
        const angle = coneAngle + (Math.random() - 0.5) * (Math.PI / 7);
        const distance = Math.random() * range;
        const speed = 1.5 + Math.random() * 2;
        const color = ["#ff6600", "#ffaa00", "#ff3300", "#ffd07a"][Math.floor(Math.random() * 4)];
        spawnParticle(
          enemy.x + Math.cos(angle) * distance,
          enemy.y + Math.sin(angle) * distance,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          24 + Math.floor(Math.random() * 20),
          color,
          0.91 + Math.random() * 0.04,
          4 + Math.random() * 4,
          "novaFlare"
        );
      }
    }
  }

  function detonateKamikaze(enemy, index) {
    if (enemy.exploded) return;
    enemy.exploded = true;
    const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (distToPlayer < enemy.radius + player.radius + 52) {
      if (!window.godMode) {
        player.health -= enemy.damage;
        runHealthLost += enemy.damage;
        playPlayerHitSound();
      }
    }

    for (let particleIndex = 0; particleIndex < 24; particleIndex++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5.2 + Math.random() * 1.8;
      const color = ["#ff3c00", "#fd8700", "#fff200"][Math.floor(Math.random() * 3)];
      const size = 3 + Math.random() * 4;
      const life = 42 + Math.random() * 2;
      const decay = 0.91 + Math.random() * 0.02;
      spawnParticle(
        enemy.x,
        enemy.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        life,
        color,
        decay,
        size,
        "enemyDeath"
      );
    }

    playSoundFresh("lumora_studios-pixel-explosion-319166.mp3", (window.sentinelVolume && window.sentinelVolume.enemyDeath) || 0.5);
    releaseEnemyAt(index);
  }

  function releaseParticleAt(index) {
    const particle = removeAtSwap(particles, index);
    particlePool.push(particle);
  }

  function spawnPlayerDeathSmoke(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 0.15 + Math.random() * 0.5;
      const offsetX = (Math.random() - 0.5) * 18;
      const offsetY = (Math.random() - 0.5) * 18;
      const grey = Math.floor(80 + Math.random() * 100);
      spawnParticle(
        x + offsetX,
        y + offsetY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        60 + Math.random() * 90,
        `rgba(${grey},${grey},${grey},0.55)`,
        0.992 + Math.random() * 0.006,
        6 + Math.random() * 18,
        "playerSmoke"
      );
    }
  }

  function spawnPlayerDeathBurst(x, y, particleType = "playerDeath") {
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 2.2;
      const colors = ["#ff3c3c", "#ff8800", "#ffdd00", "#ffffff", "#ff4466"];
      spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        90 + Math.random() * 120,
        colors[Math.floor(Math.random() * colors.length)],
        0.97 + Math.random() * 0.025,
        2 + Math.random() * 6,
        particleType
      );
    }
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.9;
      spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        150 + Math.random() * 180,
        ["#ff6600", "#ff3300", "#ffaa00", "#ff2200"][Math.floor(Math.random() * 4)],
        0.985 + Math.random() * 0.012,
        2 + Math.random() * 8,
        particleType
      );
    }
  }

  function triggerBossPhaseEffect(enemy, phase) {
    enemy._bossPhaseEffectStage = "smoke";
    enemy._bossPhaseEffectTimer = 12;
    enemy._bossPhaseEffectSmokeCount = Math.max(1, phase - 1);
    enemy._bossPhaseEffectX = enemy.x;
    enemy._bossPhaseEffectY = enemy.y;
    enemy._bossPhaseStunTimer = 180;
    playSoundFresh("sparky_laser.wav", (window.sentinelVolume && window.sentinelVolume.laser) || 0.3);
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2;
      const color = ["#8deaff", "#c9f8ff", "#ffffff"][Math.floor(Math.random() * 3)];
      spawnParticle(
        enemy.x,
        enemy.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        8 + Math.random() * 12,
        color,
        0.88,
        1.5 + Math.random() * 2,
        "enemyHit"
      );
    }
  }

  function updateBossPhaseEffect(enemy, step) {
    if (enemy._bossPhaseEffectStage === "smoke" || enemy._bossPhaseEffectStage === "deathBurst") {
      enemy._bossPhaseEffectTimer -= step;
      if (enemy._bossPhaseEffectTimer <= 0) {
        if (enemy._bossPhaseEffectStage === "smoke") {
          spawnPlayerDeathSmoke(enemy._bossPhaseEffectX, enemy._bossPhaseEffectY, enemy._bossPhaseEffectSmokeCount);
          enemy._bossPhaseEffectStage = "deathBurst";
          enemy._bossPhaseEffectTimer = 10;
        } else {
          playSoundFresh("lumora_studios-pixel-explosion-319166.mp3", (window.sentinelVolume && window.sentinelVolume.enemyDeath) || 0.5);
          spawnPlayerDeathBurst(enemy._bossPhaseEffectX, enemy._bossPhaseEffectY, "enemyHit");
          enemy._bossPhaseEffectStage = null;
          enemy._bossPhaseEffectTimer = 0;
        }
      }
    }
    if (enemy._bossPhaseStunTimer > 0) {
      enemy._bossPhaseStunTimer = Math.max(0, enemy._bossPhaseStunTimer - step);
      return enemy._bossPhaseStunTimer > 0;
    }
    return false;
  }

  function getSlingerBossStage(healthRatio) {
    if (healthRatio <= 1 / 3) return 3;
    if (healthRatio <= 2 / 3) return 2;
    return 1;
  }

  function getStalkerBossStage(healthRatio) {
    if (healthRatio <= 1 / 3) return 3;
    if (healthRatio <= 2 / 3) return 2;
    return 1;
  }

  const STALKER_BOSS_TELEPORT_COUNTS = { 1: 3, 2: 5, 3: 7 };
  const STALKER_BOSS_ILLUSION_COUNTS = { 1: 3, 2: 4, 3: 5 };
  const STALKER_BOSS_ILLUSION_DURATIONS = { 1: 12 * 60, 2: 14 * 60, 3: 16 * 60 };
  const STALKER_BOSS_PHASE_PAUSE = 3 * 60;
  const STALKER_BOSS_PHASE1_FAN_INTERVAL = 4 * 60;
  const STALKER_BOSS_PHASE1_SALVO_INTERVAL = 30;
  const STALKER_BOSS_EDGE_MARGIN = 48;
  const STALKER_BOSS_PHASE2_TELEPORT_DELAY = 60;
  const STALKER_BOSS_PHASE1_TELEPORT_RECOVERY = 18;
  const STALKER_BOSS_PHASE3_REVEAL_DURATION = 18;

  const SLINGER_BOSS_PHASE_PAUSE = 60;
  const SLINGER_BOSS_LINE_DURATION = 16 * 60;
  const SLINGER_BOSS_GRENADE_DURATION = 10 * 60;
  const SLINGER_BOSS_LINE_INTERVAL = 8;
  const SLINGER_BOSS_GRENADE_INTERVAL = 120;
  const SLINGER_BOSS_NOVA_INTERVALS = { 1: 120, 2: 90, 3: 60 };

  const BRUTE_BOSS_ATTACK_PHASE_DURATION = 12 * 60;
  const BRUTE_BOSS_KAMIKAZE_INTERVALS = { 1: 180, 2: 120, 3: 60 };
  const BRUTE_BOSS_INFERNO_EXPANSION_DURATION = 5 * 60;
  const BRUTE_BOSS_INFERNO_SPIN_DURATION = 18 * 60;
  const BRUTE_BOSS_INFERNO_SPIN_START_RATIO = 0.75;
  const BRUTE_BOSS_INFERNO_SPIN_RATE = 0.2;
  function setBruteBossAttackPhase(enemy, stage, phase) {
    enemy.bruteBossStage = stage;
    enemy.bruteBossAttackPhase = phase;
    enemy.bruteBossAttackPhaseTimer = phase === 1
      ? 0
      : phase === 3
        ? (BRUTE_BOSS_INFERNO_EXPANSION_DURATION * BRUTE_BOSS_INFERNO_SPIN_START_RATIO) + BRUTE_BOSS_INFERNO_SPIN_DURATION
        : BRUTE_BOSS_ATTACK_PHASE_DURATION;
    enemy.bruteBossKamikazeCooldown = BRUTE_BOSS_KAMIKAZE_INTERVALS[stage];
    enemy.bruteBossInfernoDamageTimer = 0;
    enemy.bruteBossInfernoAngles = [];
    enemy.bruteBossInfernoRange = 0;
    enemy.bruteBossInfernoBaseAngle = 0;
    enemy.bruteBossInfernoParticleCooldown = 0;
    enemy.novaPlayerInside = false;
    enemy.novaPlayerTick = 0;
    enemy.novaCue = false;

    if (phase === 1) {
      enemy.bruteBossPhase1NovaCount = 0;
      enemy.novaHoldAtMax = false;
      enemy.novaRadius = enemy.novaMinRadius;
      enemy.novaState = "minPause";
      enemy.novaCooldown = 100;
    } else if (phase === 2) {
      enemy.novaHoldAtMax = false;
      enemy.novaRadius = enemy.novaMinRadius;
      enemy.novaState = "inactive";
      enemy.novaCooldown = 0;
    } else {
      enemy.novaHoldAtMax = false;
      const coneCount = stage;
      const firstAngle = Math.random() * Math.PI * 2;
      enemy.bruteBossInfernoBaseAngle = firstAngle;
      enemy.bruteBossInfernoRotationDirection = Math.random() < 0.5 ? -1 : 1;
      enemy.bruteBossInfernoAngles = Array.from(
        { length: coneCount },
        (_, index) => firstAngle + (Math.PI * 2 * index) / coneCount
      );
      enemy.novaState = "inactive";
      enemy.novaCooldown = 0;
    }
  }

  function detonateMine(m, playSound = true) {
    if (!m) return;
    if (playSound) {
      playSoundFresh('u_b32baquv5u-explosion-9-340460.mp3', (window.sentinelVolume && window.sentinelVolume.mineExplosion) || 0.8);
    }
    const distToPlayer = Math.hypot(player.x - m.x, player.y - m.y);
    if (distToPlayer < 52 + player.radius) {
      if (!window.godMode) { player.health -= 2; runHealthLost += 2; playPlayerHitSound(); }
    }
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
    for (let j = 0; j < KAMIKAZE_MINE_PARTICLE_COUNT; j++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.1 + Math.random() * 1.5;
      const color = ["#ffbb00","#fff200","#ff4444"][Math.floor(Math.random()*3)];
      const size = 2 + Math.random() * 2.5;
      const life = 20 + Math.random() * 14;
      const decay = 0.89 + Math.random() * 0.04;
      spawnParticle(
        m.x,
        m.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        life,
        color,
        decay,
        size,
        "enemyDeath"
      );
    }
  }

  // Update mines: explode when player enters zone, remove after explosion
  function updateMines(delta) {
    for (let i = mines.length - 1; i >= 0; i--) {
      const m = mines[i];
      if (m.type === "burn") {
        m.timer -= delta * SPEED_MULTIPLIER;
        m.tickTimer = (m.tickTimer || 0) - delta * SPEED_MULTIPLIER;
        m.particleTimer = (m.particleTimer || 0) - delta * SPEED_MULTIPLIER;
        // Grow radius from 0 to full over ~20 ticks
        if (typeof m._growRadius === "number" && typeof m._fullRadius === "number" && m._growRadius < m._fullRadius) {
          m._growRadius = Math.min(m._fullRadius, m._growRadius + m._fullRadius / 10 * delta * SPEED_MULTIPLIER);
        }
        const burnRadius = typeof m._growRadius === "number" ? m._growRadius : (typeof m.radius === "number" ? m.radius : 72);
        const tickInterval = typeof m.tickInterval === "number" ? m.tickInterval : 36;
        const burnDamage = typeof m.damagePerTick === "number" ? m.damagePerTick : 1;
        const distToPlayer = Math.hypot(player.x - m.x, player.y - m.y);
        if (distToPlayer < burnRadius + player.radius && m.tickTimer <= 0) {
          if (!window.godMode) { player.health -= burnDamage; runHealthLost += burnDamage; playPlayerHitSound(); }
          m.tickTimer = tickInterval;
        }
        if (m.particleTimer <= 0) {
          m.particleTimer = 10;
          const particleCount = 4;
          for (let particleIndex = 0; particleIndex < particleCount; particleIndex++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * burnRadius * 0.9;
            const px = m.x + Math.cos(angle) * radius;
            const py = m.y + Math.sin(angle) * radius;
            const driftAngle = Math.random() * Math.PI * 2;
            const driftSpeed = 0.25 + Math.random() * 0.45;
            spawnParticle(
              px,
              py,
              Math.cos(driftAngle) * driftSpeed,
              Math.sin(driftAngle) * driftSpeed,
              10 + Math.floor(Math.random() * 12),
              ["#ff5a00", "#ff9a2f", "#ffd26a", "#ff3f00"][Math.floor(Math.random() * 4)],
              0.93 + Math.random() * 0.03,
              1.8 + Math.random() * 1.8,
              "burnZone"
            );
          }
        }
        if (m.timer <= 0) {
          mines.splice(i, 1);
        }
        continue;
      }
      if (typeof m.vx === 'number' || typeof m.vy === 'number') {
        m.vx = typeof m.vx === 'number' ? m.vx * 0.96 : 0;
        m.vy = typeof m.vy === 'number' ? m.vy * 0.96 : 0;
        m.x += (m.vx || 0) * delta * SPEED_MULTIPLIER;
        m.y += (m.vy || 0) * delta * SPEED_MULTIPLIER;
      }
      // Check if player is in explosion zone
      const distToPlayer = Math.hypot(player.x - m.x, player.y - m.y);
      if (distToPlayer < 52 + player.radius) {
        detonateMine(m);
        mines.splice(i, 1);
        continue;
      }
      if (!m.contactOnly) {
        m.timer = (typeof m.timer === 'number' ? m.timer : 0) - delta * SPEED_MULTIPLIER;
        if (m.timer <= 0) {
          detonateMine(m);
          mines.splice(i, 1);
          continue;
        }
      }
    }
  }

  // Draw mines with visible trigger zone
  function drawMines() {
    for (let m of mines) {
      if (m.type === "burn") {
        const burnRadius = typeof m._growRadius === "number" ? m._growRadius : (typeof m.radius === "number" ? m.radius : 72);
        const burnTimer = m.timer || 0;
        const fadeWindow = 40; // ticks over which it fades out
        const burnAlpha = burnTimer < fadeWindow ? burnTimer / fadeWindow : 1;
        ctx.save();
        // Cache the gradient per mine, update if position or radius changes
        if (!m._scorchGradient || m._scorchGradientParams === undefined ||
            m._scorchGradientParams.x !== m.x ||
            m._scorchGradientParams.y !== m.y ||
            m._scorchGradientParams.radius !== burnRadius) {
          m._scorchGradient = ctx.createRadialGradient(m.x, m.y, burnRadius * 0.2, m.x, m.y, burnRadius);
          m._scorchGradient.addColorStop(0, "rgba(35, 20, 15, 0.45)");
          m._scorchGradient.addColorStop(0.7, "rgba(22, 14, 12, 0.28)");
          m._scorchGradient.addColorStop(1, "rgba(8, 6, 6, 0.08)");
          m._scorchGradientParams = { x: m.x, y: m.y, radius: burnRadius };
        }
        ctx.globalAlpha = 0.65 * burnAlpha;
        ctx.fillStyle = m._scorchGradient;
        ctx.beginPath();
        ctx.arc(m.x, m.y, burnRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.58 * burnAlpha;
        ctx.strokeStyle = "#ff8a00";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(m.x, m.y, burnRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        continue;
      }
      ctx.save();
      // Draw trigger zone ring
      ctx.beginPath();
      ctx.arc(m.x, m.y, 52, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 187, 0, 0.28)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      // Removed shadowColor and shadowBlur for mobs
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw soft shadow under mine
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(30, 30, 30, 0.85)';
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + m.radius * 0.55, m.radius * 1.05, m.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
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
    if (k === "escape" && gameStarted && !showMenuScreen) {
      e.preventDefault();
      showReturnToMenuModal();
      return;
    }
    if (k === "e") { showStats = !showStats; paused = showStats; }
    if (k === "o") {
      if (window._editorSessionActive && window.SentinelEditor && typeof window.SentinelEditor.showWaveEditor === "function") {
        window.SentinelEditor.showWaveEditor();
      }
    }
    if (statPoints > 0 && ["1", "2", "3", "4", "5", "6"].includes(k)) applyStatPoint(k);
  });

  document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

  canvas.addEventListener("mousemove", (e) => {
    const pos = getCanvasMousePos(e);
    mouseX = Math.max(0, Math.min(canvas.width, pos.x));
    mouseY = Math.max(0, Math.min(canvas.height, pos.y));
  });
  let firstRightClickDone = false;
  // Freeze logic: 2s freeze on right click press (not hold)
  let freezeActive = false;
  let freezeTimer = 0;

  function activateAttack() {
    if (window._introPhase === "animating") return; // block input until animation finishes
    if (window._secondDeathPending || gameOver) return; // block during second death smoke or game over
    if (window._activateUnpauseTimeout) clearTimeout(window._activateUnpauseTimeout);
    window._activateUnpauseStart = performance.now();
    window._activateUnpauseTimeout = setTimeout(() => {
      window._activateUnpauseTimeout = null;
      window._activateUnpauseStart = null;
      if (window._introPhase === "waiting") {
        window._introPhase = null;
      }
      followMouse = true;
      if (window._playContinueReviveSound) {
        window._playContinueReviveSound = false;
        try {
          const _resumeSfx = new Audio('dragon-studio-lightning-spell-386163.mp3');
          _resumeSfx.volume = window.sentinelVolume && window.sentinelVolume.continueRevive !== undefined ? window.sentinelVolume.continueRevive : 1.0;
          _resumeSfx.play().catch(() => {});
        } catch (e) {}
      }
      unmuffleGameMusic();
      unmufleBossMusic();
      if (!firstRightClickDone && wave === 1 && gameStarted) {
        firstRightClickDone = true;
        try {
          if (!window._warnAudioPool) window._warnAudioPool = [];
          let warnAudio = window._warnAudioPool.length > 0 ? window._warnAudioPool.pop() : new Audio('warning.wav');
          warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 1.0;
          warnAudio.playbackRate = 0.7;
          warnAudio.currentTime = 0;
          let playPromise = warnAudio.play();
          if (playPromise) playPromise.catch(() => {});
          setTimeout(() => window._warnAudioPool.push(warnAudio), 2000);
        } catch (e) {}
      }
    }, 500);
  }

  function stopAttackSound() {
    if (window.laserAudio && !window.laserAudio.paused) {
      window.laserAudio.pause();
      window.laserAudio.currentTime = 0;
    }
  }

  function deactivateAttack() {
    if (window._activateUnpauseTimeout) {
      clearTimeout(window._activateUnpauseTimeout);
      window._activateUnpauseTimeout = null;
      window._activateUnpauseStart = null;
    }
    stopAttackSound();
    if (window._secondDeathPending || gameOver) return; // block during second death smoke or game over
    followMouse = false;
    // Tutorial: auto-open stat panel on first release after gaining a level
    if (window._tutFirstLevelUpFired && !window._tutStatPanelAutoOpened && statPoints > 0) {
      window._tutStatPanelAutoOpened = true;
      showStats = true;
      paused = true;
    }
    muffleGameMusic();
    mufleBossMusic();
  }

  let attackHeld = false;
  let rightMouseHeld = false;
  let spaceHeld = false;

  function updateAttackHold() {
    const desiredHold = rightMouseHeld || spaceHeld;
    if (desiredHold === attackHeld) return;
    attackHeld = desiredHold;
    if (attackHeld) {
      activateAttack();
    } else {
      deactivateAttack();
    }
  }

  canvas.style.touchAction = "none";
  canvas.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    event.preventDefault();
    const gameMusic = window._gameMusicAudio;
    if (gameStarted && !showMenuScreen && !gameOver && !window._bossMusicallyActive && gameMusic && gameMusic.paused) {
      const musicContext = window._gameMusicContext;
      if (musicContext && musicContext.state === "suspended") {
        musicContext.resume().catch(error => console.warn("Unable to resume game audio context:", error));
      }
      const playPromise = gameMusic.play();
      if (playPromise) {
        playPromise.catch(error => console.warn("Unable to resume game music from touch input:", error));
      }
    }
    const position = getCanvasMousePos(touch);
    mouseX = Math.max(0, Math.min(canvas.width, position.x));
    mouseY = Math.max(0, Math.min(canvas.height, position.y));

    if (showStats || window._protocolReplaceMode) {
      rightMouseHeld = true;
      updateAttackHold();
      canvas.dispatchEvent(new MouseEvent("mousedown", {
        bubbles: true,
        button: 0,
        clientX: touch.clientX,
        clientY: touch.clientY
      }));
      return;
    }

    if (gameOver) {
      canvas.dispatchEvent(new MouseEvent("mousedown", {
        bubbles: true,
        button: 2,
        clientX: touch.clientX,
        clientY: touch.clientY
      }));
      return;
    }

    rightMouseHeld = true;
    updateAttackHold();
  }, { passive: false });
  canvas.addEventListener("touchmove", (event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    event.preventDefault();
    const position = getCanvasMousePos(touch);
    mouseX = Math.max(0, Math.min(canvas.width, position.x));
    mouseY = Math.max(0, Math.min(canvas.height, position.y));
  }, { passive: false });
  const releaseTouchAttack = (event) => {
    event.preventDefault();
    if (event.touches.length > 0) return;
    rightMouseHeld = false;
    updateAttackHold();
  };
  canvas.addEventListener("touchend", releaseTouchAttack, { passive: false });
  canvas.addEventListener("touchcancel", releaseTouchAttack, { passive: false });

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      rightMouseHeld = true;
      updateAttackHold();
    } else if (e.button === 0) {
      playSoundFresh('47313572-8-bit-game-sfx-sound-6-269965.mp3', window.sentinelVolume.click || 1.0);
    }
  });
  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 2) {
      if (window._secondDeathPending || gameOver) return;
      rightMouseHeld = false;
      updateAttackHold();
    }
  });

  // Spacebar as alternative to right-click
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!spaceHeld) {
        spaceHeld = true;
        updateAttackHold();
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (window._secondDeathPending || gameOver) return;
      if (spaceHeld) {
        spaceHeld = false;
        updateAttackHold();
      }
    }
  });

  // Crosshair cursor always active on canvas
  let crosshairImg = new window.Image();
  crosshairImg.src = "crosshair4m.png";
  crosshairImg.onload = function() {
    const w = crosshairImg.width;
    const h = crosshairImg.height;
    const hx = Math.floor(w / 2);
    const hy = Math.floor(h / 2);
    const cursorValue = `url('crosshair4m.png') ${hx} ${hy}, crosshair`;
    canvas.style.cursor = cursorValue;
    document.body.style.cursor = cursorValue;
    // Patch the global CSS rule so hover states also use the correct hotspot
    const styleEl = document.getElementById("sentinelUiStyle");
    if (styleEl) {
      styleEl.textContent = styleEl.textContent.replace(
        /cursor:\s*url\('crosshair4m\.png'\)\s+\d+\s+\d+,\s*crosshair\s*!important/,
        `cursor: url('crosshair4m.png') ${hx} ${hy}, crosshair !important`
      );
    }
  };

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      // cursor stays as crosshair — no change needed
    }
  });
  canvas.addEventListener("mouseup", (e) => {
    // cursor stays as crosshair — no change needed
  });
  // Reset cursor if context menu is triggered (failsafe)
  canvas.addEventListener("contextmenu", (e) => {
    const w = crosshairImg.width;
    const h = crosshairImg.height;
    if (w && h) canvas.style.cursor = `url('crosshair4m.png') ${Math.floor(w/2)} ${Math.floor(h/2)}, crosshair`;
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Game Over right-click handler (continue)
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2 && gameOver && window._gameOverTime !== undefined) {
      const elapsedSeconds = (Date.now() - window._gameOverTime) / 1000;
      // Second death - always return to menu on right click
      if (window._playerUsedContinue) {
        if (!window._gameOverOverlay) return; // block until result board is shown
        if (window._editorSessionActive) {
          return;
        }
        finalizeRunBytes();
        showMenuScreen = true;
        showMenu(false);
        gameOver = false;
        window._gameOverTime = undefined;
        window._playerUsedContinue = false;
        followMouse = false;
        window._bossMusicallyActive = false;
        stopBossMusic();
        stopLowHealthSound();
        transitionToMenuMusic(1200);
      }
      // First death - continue with full health if right clicked before 5 seconds
      else if (elapsedSeconds < 5 && !window._victoryTriggered) {
        if (window._gameOverOverlay) { window._gameOverOverlay.remove(); window._gameOverOverlay = null; }
        // Restoration burst — cyan/teal
        const rp = window._gameOverDeathPos || player;
        for (let i = particles.length - 1; i >= 0; i--) {
          if (particles[i].type === "playerSmoke" || particles[i].type === "playerDeath") releaseParticleAt(i);
        }
        for (let i = 0; i < 60; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5 + Math.random() * 3.5;
          const colors = ["#00ffdd", "#00ffaa", "#aaffee", "#ffffff", "#66ffdd"];
          spawnParticle(rp.x, rp.y,
            Math.cos(angle) * speed, Math.sin(angle) * speed,
            40 + Math.random() * 60,
            colors[Math.floor(Math.random() * colors.length)],
            0.96 + Math.random() * 0.03,
            3 + Math.random() * 8,
            "playerRevive");
        }
        player.health = player.maxHealth;
        stopLowHealthSound();
        gameOver = false;
        window._bossSoundsStoppedForEndState = false;
        window._gameOverTime = undefined;
        window._playerUsedContinue = true;
        window._playContinueReviveSound = true;
        window._gameOverDeathPos = null;
        window._gameOverExplosionDone = false;
        window._gameOverBurstDone = false;
        followMouse = true;
      }
    }
  });

  function applyStatPoint(k) {
    const statKeys = ["Range", "Power", "AttackSpeed", "Movement", "Vitality", "Pickup"];
    const stat = statKeys[parseInt(k) - 1];
    if (stat) {
      // Enforce max stat value per stat (max = current level + 1)
      if (player.stats[stat] < level+1) {
        const oldMaxHealth = player.maxHealth;
        const oldHealth = player.health;
        player.stats[stat]++;
        statPoints--;
        applyStats();
        triggerLoadingFlash();
        if (stat === "Vitality") {
          const maxHealthDelta = player.maxHealth - oldMaxHealth;
          player.health = Math.max(0, Math.min(player.maxHealth, oldHealth + maxHealthDelta));
        }
      }
    }
  }

  function applyStats() {
    const previousMaxHealth = player.maxHealth;
    const wasFullHealth = player.health >= previousMaxHealth;
    const previousHealthRatio = previousMaxHealth > 0 ? (player.health / previousMaxHealth) : 1;

    // Get protocol stat modifiers from ProtocolSystem
    const protocolMods = ProtocolSystem.getStatMods();
    
    // Update player stats based on level upgrades + protocols
    // Range: +5 per level point, +protocol mod
    player.range = 80 + (player.stats.Range + protocolMods.Range) * 5;
    
    // Power (Attack Power): +1 per level point, +protocol mod
    player.damage = 1 + (player.stats.Power + protocolMods.Power);
    
    // Movement: +0.2 per level point, +protocol mod
    player.speed = player.baseSpeed + (player.stats.Movement + protocolMods.Movement) * 0.25;
    
    // AttackSpeed (Intensity): base 20 - level points - protocol mod
    player.cooldownBase = 20 - (player.stats.AttackSpeed + protocolMods.Intensity);
    
    // Vitality (Health): +2 per level point, +protocol mod
    player.maxHealth = 10 + (player.stats.Vitality + protocolMods.Health) * 2;

    if (player.maxHealth !== previousMaxHealth) {
      if (wasFullHealth) {
        player.health = player.maxHealth;
      } else {
        player.health = previousHealthRatio * player.maxHealth;
      }
    }
    
    // Pickup: +8 per level point, +protocol mod
    player.pickupRadius = 48 + (player.stats.Pickup + protocolMods.Pickup) * 8;
    
    if (player.health > player.maxHealth) player.health = player.maxHealth;
  }

  window.SentinelEditorBridge = {
    isGameActive: () => gameStarted && !showMenuScreen && !showLoadingScreen,
    getPaused: () => paused,
    setPaused: (value) => {
      paused = !!value;
    },
    setTutorialModalPause: (value) => {
      tutorialModalPause = !!value;
      if (tutorialModalPause) paused = true;
    },
    openTutorialStatsMenu: () => {
      rightMouseHeld = false;
      spaceHeld = false;
      attackHeld = false;
      deactivateAttack();
      showStats = true;
      paused = true;
    },
    getEditorSessionActive: () => !!window._editorSessionActive,
    setEditorSessionActive: (value) => {
      window._editorSessionActive = !!value;
    },
    getEditorDiscoverAllProtocols: () => {
      if (typeof ProtocolSystem.isEditorDiscoverAllEnabled === "function") {
        return !!ProtocolSystem.isEditorDiscoverAllEnabled();
      }
      return false;
    },
    setEditorDiscoverAllProtocols: (value) => {
      if (typeof ProtocolSystem.setEditorDiscoverAllEnabled === "function") {
        ProtocolSystem.setEditorDiscoverAllEnabled(!!value);
      }
    },
    getWaveEditorState: () => ({
      wave,
      burstCount,
      burstInterval,
      customBursts: window._customBursts,
      customBrutes: window._customBrutes,
      customSlingers: window._customSlingers,
      customShielders: window._customShielders,
      customBeamers: window._customBeamers,
      customKamikazes: window._customKamikazes,
      customStalkers: window._customStalkers,
      customBossMinors: window._customBossMinors,
      customBosses: window._customBosses,
      customSlingerBosses: window._customSlingerBosses,
      customBruteBosses: window._customBruteBosses,
      mobIntervals: window._customMobBurstIntervals
    }),
    getWavePresetConfig: (targetWave) => {
      const waveNumber = parseInt(targetWave, 10);
      if (!Number.isFinite(waveNumber) || waveNumber < 1) return null;

      const savedState = {
        wave,
        burstCount,
        burstInterval,
        burstIndex,
        burstTimer,
        waveAnnouncementTimer,
        customBursts: Array.isArray(window._customBursts) ? window._customBursts.slice() : window._customBursts,
        customBrutes: Array.isArray(window._customBrutes) ? window._customBrutes.slice() : window._customBrutes,
        customSlingers: Array.isArray(window._customSlingers) ? window._customSlingers.slice() : window._customSlingers,
        customShielders: Array.isArray(window._customShielders) ? window._customShielders.slice() : window._customShielders,
        customBeamers: Array.isArray(window._customBeamers) ? window._customBeamers.slice() : window._customBeamers,
        customKamikazes: Array.isArray(window._customKamikazes) ? window._customKamikazes.slice() : window._customKamikazes,
        customStalkers: Array.isArray(window._customStalkers) ? window._customStalkers.slice() : window._customStalkers,
        customBossMinors: Array.isArray(window._customBossMinors) ? window._customBossMinors.slice() : window._customBossMinors,
        customBosses: Array.isArray(window._customBosses) ? window._customBosses.slice() : window._customBosses,
        customSlingerBosses: Array.isArray(window._customSlingerBosses) ? window._customSlingerBosses.slice() : window._customSlingerBosses,
        customBruteBosses: Array.isArray(window._customBruteBosses) ? window._customBruteBosses.slice() : window._customBruteBosses,
        customMobBurstIntervals: window._customMobBurstIntervals ? { ...window._customMobBurstIntervals } : null,
        bossMinorBursts: Array.isArray(window._bossMinorBursts) ? window._bossMinorBursts.slice() : window._bossMinorBursts,
        bossMinorCount: window._bossMinorCount,
        wave10MinorsSpawned: window._wave10MinorsSpawned,
        editorPreviewWave: window._editorPreviewWave,
        editorPreviewOverride: window._editorPreviewOverride,
        enemies: enemies.slice(),
        mines: mines.slice()
      };

      const originalSetTimeout = window.setTimeout;
      window.setTimeout = function () { return 0; };

      try {
        wave = waveNumber;
        enemies.length = 0;
        mines.length = 0;
        spawnWave();

        return {
          burstCount,
          burstInterval,
          customBursts: Array.isArray(window._customBursts) ? window._customBursts.slice() : window._customBursts,
          customBrutes: Array.isArray(window._customBrutes) ? window._customBrutes.slice() : window._customBrutes,
          customSlingers: Array.isArray(window._customSlingers) ? window._customSlingers.slice() : window._customSlingers,
          customShielders: Array.isArray(window._customShielders) ? window._customShielders.slice() : window._customShielders,
          customBeamers: Array.isArray(window._customBeamers) ? window._customBeamers.slice() : window._customBeamers,
          customKamikazes: Array.isArray(window._customKamikazes) ? window._customKamikazes.slice() : window._customKamikazes,
          customStalkers: Array.isArray(window._customStalkers) ? window._customStalkers.slice() : window._customStalkers,
          customBossMinors: Array.isArray(window._customBossMinors) ? window._customBossMinors.slice() : window._customBossMinors,
          customBosses: Array.isArray(window._customBosses) ? window._customBosses.slice() : window._customBosses,
          customSlingerBosses: Array.isArray(window._customSlingerBosses) ? window._customSlingerBosses.slice() : window._customSlingerBosses,
          customBruteBosses: Array.isArray(window._customBruteBosses) ? window._customBruteBosses.slice() : window._customBruteBosses,
          mobIntervals: window._customMobBurstIntervals ? { ...window._customMobBurstIntervals } : undefined
        };
      } catch (_) {
        return null;
      } finally {
        window.setTimeout = originalSetTimeout;

        wave = savedState.wave;
        burstCount = savedState.burstCount;
        burstInterval = savedState.burstInterval;
        burstIndex = savedState.burstIndex;
        burstTimer = savedState.burstTimer;
        waveAnnouncementTimer = savedState.waveAnnouncementTimer;
        window._customBursts = savedState.customBursts;
        window._customBrutes = savedState.customBrutes;
        window._customSlingers = savedState.customSlingers;
        window._customShielders = savedState.customShielders;
        window._customBeamers = savedState.customBeamers;
        window._customKamikazes = savedState.customKamikazes;
        window._customStalkers = savedState.customStalkers;
        window._customBossMinors = savedState.customBossMinors;
        window._customBosses = savedState.customBosses;
        window._customSlingerBosses = savedState.customSlingerBosses;
        window._customBruteBosses = savedState.customBruteBosses;
        window._customMobBurstIntervals = savedState.customMobBurstIntervals;
        window._bossMinorBursts = savedState.bossMinorBursts;
        window._bossMinorCount = savedState.bossMinorCount;
        window._wave10MinorsSpawned = savedState.wave10MinorsSpawned;
        window._editorPreviewWave = savedState.editorPreviewWave;
        window._editorPreviewOverride = savedState.editorPreviewOverride;
        enemies.length = 0;
        enemies.push(...savedState.enemies);
        mines.length = 0;
        mines.push(...savedState.mines);
      }
    },
    getPlayer: () => player,
    getLevel: () => level,
    setLevel: (value) => {
      const maxLevel = Number.isFinite(MAX_LEVEL) ? MAX_LEVEL : 50;
      const parsed = parseInt(value, 10);
      if (!Number.isFinite(parsed)) return;
      level = Math.max(1, Math.min(maxLevel, parsed));
      xp = 0;
      xpToLevel = level >= maxLevel ? Infinity : Math.floor(10 + Math.pow(level, 1.8));
    },
    getStatPoints: () => statPoints,
    setStatPoints: (value) => {
      statPoints = value;
    },
    clearLoots: () => {
      xpDrops.length = 0;
      slingerDrops.length = 0;
      bruteDrops.length = 0;
      healthDrops.length = 0;
      protocolOrbs.length = 0;
    },
    applyStats,
    spawnWaveNow: (targetWave, previewOverride) => {
      if (!gameStarted || showMenuScreen || showLoadingScreen) {
        document.getElementById("menuOverlay")?.remove();
        if (typeof window.sentinelDifficulty !== "string") {
          window.sentinelDifficulty = "Normal";
        }
        showLoadingScreen = false;
        showMenuScreen = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.visibility = "visible";
        hudXrayCtx.clearRect(0, 0, hudXrayCanvas.width, hudXrayCanvas.height);
        hudXrayCanvas.style.visibility = "visible";
        hudFrameOverlay.style.display = "block";
        hudWaveDisplay.style.display = "block";
        restartGame();
        gameStarted = true;
      }

      gameOver = false;
      window._bossSoundsStoppedForEndState = false;
      window._gameOverTime = undefined;
      window._playerUsedContinue = false;
      followMouse = false;
      paused = false;
      showStats = false;
      player.health = player.maxHealth;

      wave = targetWave;
      enemies.length = 0;
      mines.length = 0;

      if (previewOverride && typeof previewOverride === "object") {
        window._editorSessionActive = true;
        window._editorPreviewWave = targetWave;
        window._editorPreviewOverride = {
          burstCount: previewOverride.burstCount,
          burstInterval: previewOverride.burstInterval,
          customBursts: Array.isArray(previewOverride.customBursts) ? previewOverride.customBursts.slice() : undefined,
          customBrutes: Array.isArray(previewOverride.customBrutes) ? previewOverride.customBrutes.slice() : undefined,
          customSlingers: Array.isArray(previewOverride.customSlingers) ? previewOverride.customSlingers.slice() : undefined,
          customShielders: Array.isArray(previewOverride.customShielders) ? previewOverride.customShielders.slice() : undefined,
          customBeamers: Array.isArray(previewOverride.customBeamers) ? previewOverride.customBeamers.slice() : undefined,
          customKamikazes: Array.isArray(previewOverride.customKamikazes) ? previewOverride.customKamikazes.slice() : undefined,
          customStalkers: Array.isArray(previewOverride.customStalkers) ? previewOverride.customStalkers.slice() : undefined,
          customBossMinors: Array.isArray(previewOverride.customBossMinors) ? previewOverride.customBossMinors.slice() : undefined,
          customBosses: Array.isArray(previewOverride.customBosses) ? previewOverride.customBosses.slice() : undefined,
          customSlingerBosses: Array.isArray(previewOverride.customSlingerBosses) ? previewOverride.customSlingerBosses.slice() : undefined,
          customBruteBosses: Array.isArray(previewOverride.customBruteBosses) ? previewOverride.customBruteBosses.slice() : undefined
        };
        burstCount = previewOverride.burstCount;
        burstInterval = previewOverride.burstInterval;
      }

      spawnWave();
    }
  };

  function tryDiscoverProtocolFromEnemy(enemyType, x, y, options = {}) {
    const forceDrop = !!(options && options.forceDrop);
    const forcedRarity = options && typeof options.rarity === "string" ? options.rarity : null;
    const forcedTier = options && typeof options.tier === "string" ? options.tier : null;
    const waveProgress = Number.isFinite(wave) ? Math.max(0, wave - 1) : 0;
    const waveDropBonus = Math.min(0.15, waveProgress * 0.003);
    const specialPoolBaseChance = Math.min(0.2, 0.05 + waveProgress * 0.0025);
    const specialPoolEnemyMultipliers = {
      stalker: 1.5,
      shielder: 1.5,
      beamer: 2
    };
    const dropRules = {
      grunt: { chance: 0.08 },
      kamikaze: { chance: 0.1 },
      stalker: { chance: 0.2 },
      shielder: { chance: 0.18 },
      beamer: { chance: 0.22 },
      slinger: { chance: 0.18 },
      brute: { chance: 0.22 },
      bruteBoss: { chance: 1.0 },
      gruntBossMinor: { chance: 0.35 },
      gruntBoss: { chance: 1.0 }
    };

    const rule = dropRules[enemyType] || { chance: 0.1 };
    const dropChance = Math.min(1, rule.chance + waveDropBonus);
    if (!forceDrop && Math.random() > dropChance) return;

    // Allow duplicates: protocols can drop even if another orb of the same protocol is already on-screen.
    const droppableProtocols = Object.keys(PROTOCOLS);
    if (droppableProtocols.length === 0) return;

    const getPool = (rarity, tiers = null) => {
      return droppableProtocols.filter(name => {
        const proto = PROTOCOLS[name];
        if (proto.rarity !== rarity) return false;
        if (!tiers || tiers.length === 0) return true;
        return tiers.includes(proto.tier);
      });
    };

    const chooseRandom = (pool) => pool[Math.floor(Math.random() * pool.length)];

    const targetedPools = [
      getPool("Common", ["Higher"]),
      getPool("Rare", ["Lower"]),
      getPool("Rare", ["Standard"])
    ].filter(pool => pool.length > 0);
    const specialPoolChance = Math.min(
      0.3,
      specialPoolBaseChance * (specialPoolEnemyMultipliers[enemyType] || 1)
    );

    let pool = [];
    if (forcedRarity === "Rare" || forcedRarity === "Common") {
      pool = getPool(forcedRarity, forcedTier ? [forcedTier] : null);
    } else if (targetedPools.length > 0 && Math.random() < specialPoolChance) {
      pool = chooseRandom(targetedPools);
    } else if (enemyType === "grunt") {
      // Common lower only
      pool = getPool("Common", ["Lower"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "kamikaze") {
      // Common lower only
      pool = getPool("Common", ["Lower"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "slinger") {
      // Any common
      pool = getPool("Common");
    } else if (enemyType === "stalker") {
      // Common standard/higher, fallback to any common
      pool = getPool("Common", ["Standard", "Higher"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "beamer") {
      // Common higher, small chance for rare lower
      if (Math.random() < 0.15) {
        pool = getPool("Rare", ["Lower"]);
      }
      if (pool.length === 0) pool = getPool("Common", ["Higher"]);
      if (pool.length === 0) pool = getPool("Common", ["Standard", "Higher"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "shielder") {
      pool = getPool("Common", ["Standard", "Higher"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "brute") {
      // Any common
      pool = getPool("Common");
    } else if (enemyType === "bruteBoss") {
      // Guaranteed rare from any tier
      pool = getPool("Rare");
    } else if (enemyType === "gruntBossMinor") {
      // Common standard / higher, low chance rare lower
      if (Math.random() < 0.2) {
        pool = getPool("Rare", ["Lower"]);
      }
      if (pool.length === 0) pool = getPool("Common", ["Standard", "Higher"]);
      if (pool.length === 0) pool = getPool("Common");
    } else if (enemyType === "gruntBoss") {
      // Guaranteed rare
      pool = getPool("Rare");
    }

    if (pool.length === 0) pool = droppableProtocols;

    const droppedProtocol = chooseRandom(pool);
    if (!droppedProtocol) return;

    const rarity = PROTOCOLS[droppedProtocol].rarity;
    const tier = PROTOCOLS[droppedProtocol].tier;
    const requiredSeconds =
      rarity === "Rare"   && tier === "Higher"   ? 5 :
      rarity === "Rare"   && tier === "Standard" ? 4 :
      rarity === "Rare"   && tier === "Lower"    ? 3.5 :
      rarity === "Common" && tier === "Higher"   ? 3 :
      rarity === "Common" && tier === "Standard" ? 2.5 : 2;
    const radius = rarity === "Rare" ? 12 : 10;
    const spawnPosition = findProtocolOrbSpawnPosition(x, y, radius);
    protocolOrbs.push({
      ...spawnPosition,
      radius,
      type: "protocolOrb",
      protocolName: droppedProtocol,
      rarity,
      requiredFrames: requiredSeconds * 60,
      progressFrames: 0
    });
  }

  function findProtocolOrbSpawnPosition(x, y, radius) {
    const minX = Math.min(radius + 8, canvas.width / 2);
    const maxX = Math.max(canvas.width - radius - 8, canvas.width / 2);
    const minY = Math.min(radius + 8, canvas.height / 2);
    const maxY = Math.max(canvas.height - radius - 8, canvas.height / 2);
    const originX = Math.max(minX, Math.min(maxX, x));
    const originY = Math.max(minY, Math.min(maxY, y));

    for (let ring = 0; ring <= 12; ring++) {
      const positionsInRing = ring === 0 ? 1 : ring * 12;
      const distance = ring * (radius * 2 + 20);
      for (let i = 0; i < positionsInRing; i++) {
        const angle = (Math.PI * 2 * i) / positionsInRing;
        const candidateX = Math.max(minX, Math.min(maxX, originX + Math.cos(angle) * distance));
        const candidateY = Math.max(minY, Math.min(maxY, originY + Math.sin(angle) * distance));
        const hasSpace = protocolOrbs.every(orb =>
          Math.hypot(candidateX - orb.x, candidateY - orb.y) >= radius + orb.radius + 20
        );
        if (hasSpace) return { x: candidateX, y: candidateY };
      }
    }

    return { x: originX, y: originY };
  }

  function completeProtocolOrb(orb) {
    if (!orb) return;
    const useRunOnlyDiscovery = !!window._editorSessionActive;
    const wasPermanentlyDiscovered = !!(ProtocolSystem.protocolBoard && ProtocolSystem.protocolBoard[orb.protocolName] && ProtocolSystem.protocolBoard[orb.protocolName].discovered);
    const wasRunDiscovered = typeof ProtocolSystem.isRunDiscovered === "function"
      ? ProtocolSystem.isRunDiscovered(orb.protocolName)
      : Array.isArray(ProtocolSystem.runDiscoveredProtocols) && ProtocolSystem.runDiscoveredProtocols.includes(orb.protocolName);
    const isFavoriteProtocol = typeof ProtocolSystem.isFavorite === "function"
      ? ProtocolSystem.isFavorite(orb.protocolName)
      : false;
    const favoriteWarningColor = "#ffd84d";
    const protocolInfluence = Math.max(1, Math.floor((PROTOCOLS[orb.protocolName]?.influence) || 0));
    if (!useRunOnlyDiscovery) {
      collectRunBytes(protocolInfluence * BYTE_REWARD_MULTIPLIER);
    }
    const discovered = useRunOnlyDiscovery && typeof ProtocolSystem.discoverRunOnly === "function"
      ? ProtocolSystem.discoverRunOnly(orb.protocolName)
      : ProtocolSystem.discover(orb.protocolName);
    playProtocolPickupSound();
    triggerLoadingFlash();
    // Tutorial hook: first in-game protocol orb pickup
    // Track newly picked protocol for persistent card highlight
    if (!window._newlyPickedProtocols) window._newlyPickedProtocols = new Set();
    if (!window._seenProtocols) window._seenProtocols = new Set();
    const alreadyActive0 = ProtocolSystem.activeProtocols.includes(orb.protocolName);
    if (!alreadyActive0 && !window._seenProtocols.has(orb.protocolName)) window._newlyPickedProtocols.add(orb.protocolName);
    if (!window._tutFirstProtPickupFired) {
      const alreadyActive = ProtocolSystem.activeProtocols.includes(orb.protocolName);
      if (!alreadyActive) {
        window._tutFirstProtPickupFired = true;
        window._tutLastPickedProtocol = orb.protocolName;
        window.dispatchEvent(new CustomEvent('tut:firstProtocolPickup'));
        // Tutorial bonus: reward the player for picking up their first protocol
        const firstProtocolBonus = 35 * BYTE_REWARD_MULTIPLIER;
        runCollectedBytes += firstProtocolBonus;
        updateHudDataDisplay();
        protocolWarnings.push({ text: `+${formatByteAmount(firstProtocolBonus).toUpperCase()} — FIRST PROTOCOL BONUS`, color: '#00ffaa', timer: 240 });
        while (protocolWarnings.length > 4) protocolWarnings.shift();
      }
    }
    if (discovered) {
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        spawnParticle(
          orb.x,
          orb.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          35 + Math.floor(Math.random() * 35),
          getProtocolRarityColor(orb.rarity, (PROTOCOLS[orb.protocolName] && PROTOCOLS[orb.protocolName].tier) || "Standard"),
          0.9 + Math.random() * 0.05,
          2 + Math.random() * 2,
          "enemyDeath"
        );
      }
      if (useRunOnlyDiscovery) {
      } else {
      }
      if (!wasRunDiscovered) {
        protocolWarnings.push({
          text: `NEW PROTOCOL ACQUIRED: ${orb.protocolName}`,
          favorite: isFavoriteProtocol,
          color: isFavoriteProtocol ? favoriteWarningColor : getProtocolRarityColor(PROTOCOLS[orb.protocolName]?.rarity || "Common", PROTOCOLS[orb.protocolName]?.tier || "Standard"),
          timer: 210
        });
      }
      if (!useRunOnlyDiscovery && !wasPermanentlyDiscovered) {
        protocolWarnings.push({
          text: `NEW PROTOCOL UNLOCKED (DISCOVERED): ${orb.protocolName}`,
          favorite: isFavoriteProtocol,
          color: isFavoriteProtocol ? favoriteWarningColor : getProtocolRarityColor(PROTOCOLS[orb.protocolName]?.rarity || "Common", PROTOCOLS[orb.protocolName]?.tier || "Standard"),
          timer: 230
        });
      }
      while (protocolWarnings.length > 4) {
        protocolWarnings.shift();
      }
      if (!useRunOnlyDiscovery) {
      }
    }
  }

  function drawProtocolWarnings() {
    if (!protocolWarnings.length) return;

    for (let i = protocolWarnings.length - 1; i >= 0; i--) {
      const warning = protocolWarnings[i];
      if (!paused && warning.timer !== Infinity) warning.timer -= 1;
      if (warning.timer <= 0) {
        protocolWarnings.splice(i, 1);
      }
    }

    if (!protocolWarnings.length) return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < protocolWarnings.length; i++) {
      const warning = protocolWarnings[i];
      const alpha = Math.max(0, Math.min(1, warning.timer / 40));
      const y = 128 + (i * 30);

      if (!warning.transparent) {
        ctx.globalAlpha = 0.62 * alpha;
        ctx.fillStyle = "#00161d";
        ctx.fillRect(canvas.width / 2 - 305, y - 12, 610, 24);

        ctx.globalAlpha = 0.95 * alpha;
        ctx.strokeStyle = warning.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(canvas.width / 2 - 305, y - 12, 610, 24);
      }

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = warning.color;
      ctx.shadowColor = warning.color;
      ctx.shadowBlur = 10;
      ctx.fillText(warning.text, canvas.width / 2, y);

      if (warning.favorite) {
        const textWidth = ctx.measureText(warning.text).width;
        const rightLimit = (canvas.width / 2 + 305) - 16;
        const starX = Math.min(rightLimit, (canvas.width / 2) + (textWidth / 2) + 12);
        ctx.fillStyle = "#ffd84d";
        ctx.shadowColor = "#ffd84d";
        ctx.shadowBlur = 12;
        ctx.fillText("✶", starX, y);
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }



  function constrainPlayer() {
    // Keep player within canvas bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
  }

  function createParticles(x, y, color) {
    // Create generic particles at (x, y)
    for (let i = 0; i < 10; i++) {
      spawnParticle(
        x,
        y,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        18 + Math.floor(Math.random() * 72),
        color,
        1,
        2,
        "generic"
      );
    }
  }

  function drawParticles() {
    // Draw all particles
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

  // Batched particle draw: single pass over particles[], grouped by color.
  // Dramatically reduces ctx.save/restore and shadowBlur state changes vs calling
  // drawParticlesOfType() once per type.
  const _particleBatchMap = new Map();
  function drawParticlesBatched(types) {
    _particleBatchMap.clear();
    const len = types.length;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      let matched = false;
      for (let t = 0; t < len; t++) {
        if (p.type === types[t]) { matched = true; break; }
      }
      if (!matched) continue;
      let arr = _particleBatchMap.get(p.color);
      if (!arr) { arr = []; _particleBatchMap.set(p.color, arr); }
      arr.push(p);
    }
    for (const [color, pts] of _particleBatchMap) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const r = (p.size || 2) / 2;
        ctx.moveTo(p.x + r, p.y);
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  function updatePlayer(delta) {
    if (typeof player._prevX === 'undefined') player._prevX = player.x;
    if (typeof player._prevY === 'undefined') player._prevY = player.y;
    if (typeof player._followVX !== 'number') player._followVX = 0;
    if (typeof player._followVY !== 'number') player._followVY = 0;
    if (typeof player._hoverPhase !== 'number') player._hoverPhase = Math.random() * Math.PI * 2;
    if (typeof player._cursorStillTime !== 'number') player._cursorStillTime = 0;
    if (typeof player._lastMouseX !== 'number') player._lastMouseX = mouseX;
    if (typeof player._lastMouseY !== 'number') player._lastMouseY = mouseY;

    const frameScale = delta * SPEED_MULTIPLIER;
    const mouseDeltaX = mouseX - player._lastMouseX;
    const mouseDeltaY = mouseY - player._lastMouseY;
    const mouseDelta = Math.hypot(mouseDeltaX, mouseDeltaY);
    if (mouseDelta < 0.25) player._cursorStillTime += frameScale;
    else player._cursorStillTime = 0;
    player._lastMouseX = mouseX;
    player._lastMouseY = mouseY;

    if (followMouse) {
      let targetX = mouseX;
      let targetY = mouseY;
      if (player._cursorStillTime > 4) {
        player._hoverPhase += 0.07 * frameScale;
        const hoverRadius = Math.min(6, Math.max(2.2, player.speed * 0.95));
        targetX += Math.cos(player._hoverPhase) * hoverRadius;
        targetY += Math.sin(player._hoverPhase * 0.93) * (hoverRadius * 0.58);
      }

      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const dist = Math.hypot(dx, dy);

      let desiredVX = 0;
      let desiredVY = 0;
      if (dist > 0.001) {
        const arriveRadius = 26;
        const speedScale = dist < arriveRadius ? (dist / arriveRadius) : 1;
        const desiredSpeed = player.speed * speedScale;
        desiredVX = (dx / dist) * desiredSpeed;
        desiredVY = (dy / dist) * desiredSpeed;
      }

      const smoothing = Math.min(0.28, 0.12 + frameScale * 0.018);
      player._followVX += (desiredVX - player._followVX) * smoothing;
      player._followVY += (desiredVY - player._followVY) * smoothing;

      if (dist < 0.85 && player._cursorStillTime > 4) {
        player._followVX *= 0.78;
        player._followVY *= 0.78;
      }

      player.x += player._followVX * frameScale;
      player.y += player._followVY * frameScale;
    } else {
      player._followVX *= 0.78;
      player._followVY *= 0.78;
      player._cursorStillTime = 0;
    }

    player._prevX = player.x;
    player._prevY = player.y;
    constrainPlayer();
    if (player.attackCooldown > 0) player.attackCooldown -= delta * SPEED_MULTIPLIER;
    if (player.attackAnimationTimer > 0) player.attackAnimationTimer -= delta * SPEED_MULTIPLIER;
    if (playerLevelUpTimer > 0) playerLevelUpTimer -= delta * SPEED_MULTIPLIER;
    if (player.hitFlashTimer > 0) player.hitFlashTimer -= delta * SPEED_MULTIPLIER;
  }

  // Persistent laser sound for player attack
  let laserAudio = null;
  window.laserAudio = null;






  ///////////////////////////////********************///////////////////////////////
  ///////////////////////////////     VOLLUME        ///////////////////////////////
  ///////////////////////////////********************///////////////////////////////
  // Volume mixer variables (edit outside game to adjust)
  window.sentinelVolume = {
    laser: .3, // sparky_laser.wav
    click: 1.0, // 47313572-8-bit-game-sfx-sound-6-269965.mp3
    //clickBoost: 2.5, // Extra gain for click.wav (Web Audio API)
    warning: 0.2, // warning.wav volume
    enemyProjectile: 1.0, // laser.wav volume
    protocolPickup: 0.9, // 47313572-8-bit-game-sfx-sound-7-269973.mp3
    enemyDeath: 0.5, // lumora_studios-pixel-explosion-319166.mp3
    orbPickup: 0.8, // 47313572-8-bit-game-sfx-sound-3-269968.mp3
    playerHit: 1, // 47313572-8bit-sound-4-270297.mp3
    levelUp: 0.9, // floraphonic-classic-game-action-positive-13-224394.mp3
    lowHealth: 1, // freesound_community-success_02-68338.mp3 (base volume, always 1 — use lowHealthBoost to amplify)
    lowHealthBoost: 2.5, // Web Audio gain multiplier for low health alarm
    mineExplosion: 0.25, // u_b32baquv5u-explosion-9-340460.mp3
    stalkerWarp: 0.6, // u_wzgyzo3pae-warp-306033.mp3
    bruteNova: 0.3, // djartmusic-short-fire-whoosh_1-317280.mp3
    beamerBossBeam: 1.0, // looping Beamer Boss beam sound
    beamerBossBeamStart: .15, // one-shot when the Beamer Boss beams start
    beamerBossNova: 1, // yodguard-energy-beam-blast-4-482514.mp3
    kamikazeCharge: 0.15, // dragon-studio-fire-spell-impact-393921.mp3
    shielderShield: 0.6, // freesound_community-energy-90321.mp3
    beamerShot: 0.7, // freesound_community-beam-8-43831.mp3
    gameMusic: 0.5, // in-game playlist volume
    beamerBossMusic: 0.5, // nickpanek-chiptune-hard-boss-mode-218071.mp3
    menuMusic: 0.4, // menu chiptune volume
    cinematic: 0.35, // samuelfjohanns-computer-processing-sound-effect-01-122131.mp3
    teleport: 0.7, // yodguard-energy-beam-blast-4-482514.mp3 (intro teleport)
    continueRevive: 0.5, // dragon-studio-lightning-spell-386163.mp3 (continue after first death)
    healthPickup: 0.2 // ribhavagrawal-energy-drink-effect-230559.mp3
    // Add more as needed
  };







  function autoAttack() {
    let nearest = null, minDist = Infinity;
    for (let e of enemies) {
      const stalkerBossNotFullyRevealed =
        e.type === "stalkerBoss" &&
        !e.stalkerBossPhase3RevealComplete &&
        (e.stalkerBossIllusion || e.stalkerBossIllusionPhaseActive);
      if (e.health <= 0 || e.stalkerBossPhase3Hidden || stalkerBossNotFullyRevealed || !isEnemyInPlayArea(e)) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }

    window._nearestEnemy = nearest;
    let targetAngle = playerVisualAngle;
    if (nearest) {
      targetAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      player._scanSnapCooldown = 0;
      player._scanTargetAngle = targetAngle;
    } else {
      if (typeof player._scanTargetAngle !== "number") player._scanTargetAngle = playerVisualAngle;
      if (typeof player._scanSnapCooldown !== "number") player._scanSnapCooldown = 0;
      player._scanSnapCooldown--;
      if (player._scanSnapCooldown <= 0) {
        player._scanTargetAngle = Math.random() * Math.PI * 2;
        player._scanSnapCooldown = 28 + Math.floor(Math.random() * 53);
      }
      targetAngle = player._scanTargetAngle;
    }
    const angleDiff = ((targetAngle - playerVisualAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    playerVisualAngle += angleDiff * (nearest ? 0.15 : 0.32);
    window._playerToEnemyAngle = playerVisualAngle;

    let isAttacking = nearest && minDist < player.range + nearest.radius && player.attackAnimationTimer > 0 && followMouse;
    const enemyInRange = nearest && minDist < player.range + nearest.radius;
    if (isAttacking) {
      if (!laserAudio) {
        laserAudio = new Audio(encodeURI('freesound_community-laser-weld-103309.mp3'));
        laserAudio.loop = true;
        laserAudio.volume = window.sentinelVolume.laser;
        laserAudio.playbackRate = 2.0;
        window.laserAudio = laserAudio;
      }
      laserAudio.volume = window.sentinelVolume.laser;
      if (laserAudio.paused) {
        laserAudio.currentTime = 0;
        laserAudio.play();
      }

      const laserColors = ["#00bfff", "#00e6ff", "#aaf6ff"];
      const offsets = [-1, 0, 1];
      const colorShift = Math.floor(Date.now() / 60) % 3;
      const dx = nearest.x - player.x;
      const dy = nearest.y - player.y;
      const dist = Math.hypot(dx, dy);
      const dirX = dx / dist;
      const dirY = dy / dist;
      const edgeX = nearest.x - dirX * nearest.radius;
      const edgeY = nearest.y - dirY * nearest.radius;

      for (let l = 0; l < 3; l++) {
        const color = laserColors[(l + colorShift) % 3];
        const offX = -offsets[l] * (nearest.y - player.y) / dist;
        const offY = offsets[l] * (nearest.x - player.x) / dist;
        ctx.save();
        ctx.lineWidth = 2;
        drawLine(player.x + offX, player.y + offY, edgeX + offX, edgeY + offY, color);
        ctx.restore();
      }

      const sparkCount = 1 + Math.floor(Math.random() * 2);
      for (let s = 0; s < sparkCount; s++) {
        const t = 0.2 + Math.random() * 0.6;
        const baseX = player.x + (edgeX - player.x) * t;
        const baseY = player.y + (edgeY - player.y) * t;
        const angle = Math.atan2(edgeY - player.y, edgeX - player.x) + (Math.random() - 0.5) * 1.2;
        const length = 12 + Math.random() * 20;
        const endX = baseX + Math.cos(angle) * length;
        const endY = baseY + Math.sin(angle) * length;
        const sparkColor = ["#aaf6ff", "#e0f7ff", "#00e6ff", "#ffffff"][Math.floor(Math.random() * 4)];
        drawLightningBolt(baseX, baseY, endX, endY, sparkColor, 6 + Math.floor(Math.random() * 3), 10 + Math.random() * 10);
      }

      // Laser volumetric glow — radial gradient blobs along beam create player shadow effect
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glowSteps = Math.max(8, Math.floor(dist / 18));
      for (let i = 0; i < glowSteps; i++) {
        const t = i / Math.max(1, glowSteps - 1);
        const gx = player.x + (edgeX - player.x) * t;
        const gy = player.y + (edgeY - player.y) * t;
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 22);
        grad.addColorStop(0, 'rgba(0, 200, 255, 0.18)');
        grad.addColorStop(1, 'rgba(0, 200, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(gx, gy, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      const steps = Math.max(1, Math.floor(Math.hypot(edgeX - player.x, edgeY - player.y) / 130));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = player.x + (edgeX - player.x) * t;
        const py = player.y + (edgeY - player.y) * t;
        const palette = [
          "rgba(0, 191, 255, 0.7)",
          "rgba(173, 216, 230, 0.6)",
          "rgba(0, 255, 255, 0.65)"
        ];
        const color = palette[Math.floor(Math.random() * palette.length)];
        const speed = 1.2 + Math.random() * .5;
        spawnParticle(
          px,
          py,
          dirX * speed + (Math.random() - 0.2) * 1,
          dirY * speed + (Math.random() - 0.2) * 1,
          4 + Math.floor(Math.random() * 8),
          color,
          0.92 + Math.random() * 0.04,
          2.2 + Math.random() * 2,
          "laser"
        );
      }
    }

    if (!enemyInRange && laserAudio && !laserAudio.paused) {
      laserAudio.pause();
      laserAudio.currentTime = 0;
    }

    let isAttackFrame = nearest && minDist < player.range + nearest.radius && player.attackCooldown <= 0 && followMouse;
    if (isAttackFrame) {
      drawLine(player.x, player.y, nearest.x, nearest.y, "LightBlue");
      const shieldReduction = Math.max(0, Math.min(0.8, Number(nearest.shieldReduction) || 0));
      if (!nearest.unkillable) {
        nearest.health -= player.damage * (1 - shieldReduction);
      }
      if (
        nearest.type === "stalkerBoss" &&
        !nearest.stalkerBossIllusion &&
        nearest.stalkerBossAttackPhase === 1 &&
        nearest.stalkerBossPhaseState === "single" &&
        !nearest.stalkerBossPhase1TeleportRequested &&
        !nearest.stalkerBossPhase1TransitionTeleportRequested
      ) {
        if (
          nearest.stalkerBossTeleportsThisPhase < STALKER_BOSS_TELEPORT_COUNTS[
            getStalkerBossStage(nearest.health / Math.max(1, nearest.maxHealth || nearest.health))
          ]
        ) {
          nearest.stalkerBossPhase1TeleportRequested = true;
        } else {
          nearest.stalkerBossPhase1TransitionTeleportRequested = true;
        }
      }

      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 5;
        const speed = 2.2 + Math.random() * 2.2;
        const color = [
          "rgba(255,42,0,0.85)",
          "rgba(255,120,0,0.7)",
          "rgba(255,220,0,0.6)",
          "rgb(248, 144, 144)"
        ][Math.floor(Math.random() * 4)];
        spawnParticle(
          nearest.x,
          nearest.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          18 + Math.floor(Math.random() * 32),
          color,
          0.92 + Math.random() * 0.04,
          2.2 + Math.random() * 2.2,
          "enemyHit"
        );
      }

      player.attackCooldown = player.cooldownBase;
      player.attackAnimationTimer = 14;
      if (nearest.health <= 0) {
        const noLootDrop = !!(nearest.noLoot || nearest.noXP);
        // Check if wave end condition is "boss" - suppress XP drops in that case
        const isBossWaveEndCondition = window._timelineWaveState && window._timelineWaveState.endCondition === 'boss';
        
        if (nearest.type === "gruntBoss") {
          // Don't award direct XP if using boss wave end condition
          if (!isBossWaveEndCondition) {
            gainXP(xpToLevel);
          }
        }
        if (!noLootDrop && nearest.type === "grunt" && wave !== 5) {
          if (!nearest.noXP && !isBossWaveEndCondition) {
            xpDrops.push({ x: nearest.x, y: nearest.y + 2 });
          }
        }
        if (!noLootDrop && nearest.type === "slinger") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (!noLootDrop && nearest.type === "stalker") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (!noLootDrop && nearest.type === "beamer") {
          for (let i = 0; i < 2; i++) {
            slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
          }
        }
        if (!noLootDrop && nearest.type === "shielder") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2, xp: 4 });
        }
        if (!noLootDrop && nearest.type === "kamikaze") {
          slingerDrops.push({ x: nearest.x, y: nearest.y + 2 });
        }
        if (!noLootDrop && nearest.type === "brute") {
          slingerDrops.push({ x: nearest.x + 3, y: nearest.y + 5 });
        }
        const isFullBoss = ["gruntBoss", "bruteBoss", "slingerBoss", "stalkerBoss", "beamerBoss"].includes(nearest.type);
        if (!noLootDrop && (isFullBoss || Math.random() < 0.15)) {
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
      triggerLoadingFlash();
      // Restore health to max on level up
      player.health = player.maxHealth;
      // XP curve: fast early, slow late (quadratic scaling)
      xpToLevel = Math.floor(10 + Math.pow(level, 1.8));
      playerLevelUpTimer = 300; // 300 frames (~5 seconds) of level up blink
      // Tutorial hook: first level-up
      if (!window._tutFirstLevelUpFired) {
        window._tutFirstLevelUpFired = true;
        window.dispatchEvent(new CustomEvent('tut:firstLevelUp'));
      }
      playSoundFresh('floraphonic-classic-game-action-positive-13-224394.mp3', (window.sentinelVolume && window.sentinelVolume.levelUp) || 0.7);
      // Level up particles: denser close, looser far, more total
      const total = 68;
      for (let i = 0; i < total; i++) {
        // Cluster more particles near player, fewer far out
        const angle = Math.random() * Math.PI * 2;
        // Use squared random for radius: more close, fewer far
        const t = Math.random();
        const speed = 1.5 + 8.5 * Math.pow(t, 2); // 1.5 to ~7.0, denser close, further spread
        spawnParticle(
          player.x,
          player.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          60 + Math.floor(Math.random() * 240),
          ["#FFA500", "#ffb84d", "#ff9900", "#ffcc80", "#8b5b00"][Math.floor(Math.random() * 5)],
          0.88 + Math.random() * 0.04,
          2,
          "levelUp"
        );
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
        playOrbPickupSound();
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
          spawnParticle(
            d.x,
            d.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            60 + Math.floor(Math.random() * 240),
            color,
            0.88 + Math.random() * 0.04,
            size,
            "xpDrop"
          );
        }
        xpDrops.splice(i, 1);
      }
    }
    
  }
    function updateslingerDrops() {
    for (let i = slingerDrops.length - 1; i >= 0; i--) {
      const d = slingerDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        playOrbPickupSound();
        gainXP(typeof d.xp === "number" ? d.xp : 2);
        // XP pickup feedback: explode into persistent blue pieces
        // Slinger drop tones
        const palette = ["#FFA500", "#ffb84d", "#ff9900", "#ffcc80", "#8b5b00"];
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8;
          let size = 2;
          if (j < 4) size = 4;
          if (j < 2) size = 7;
          const color = palette[Math.floor(Math.random() * palette.length)];
          spawnParticle(
            d.x,
            d.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            60 + Math.floor(Math.random() * 240),
            color,
            0.88 + Math.random() * 0.04,
            size,
            "slingerDrop"
          );
        }
        slingerDrops.splice(i, 1);
      }
    }
  }

  function updateBruteDrops() {
    for (let i = bruteDrops.length - 1; i >= 0; i--) {
      const d = bruteDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        playSound('ribhavagrawal-energy-drink-effect-230559.mp3', (window.sentinelVolume && window.sentinelVolume.healthPickup !== undefined) ? window.sentinelVolume.healthPickup : 0.7);
        gainXP(1);
        player.health = Math.min(player.maxHealth, player.health + 1);
        // Health pickup feedback: explode into persistent red pieces
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8;
          let size = 2;
          if (j < 4) size = 4;
          if (j < 2) size = 7;
          const color = Math.random() < 0.5 ? "#b11717" : "#d43636";
          spawnParticle(
            d.x,
            d.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            60 + Math.floor(Math.random() * 240),
            color,
            0.88 + Math.random() * 0.04,
            size,
            "healthDrop"
          );
        }
        bruteDrops.splice(i, 1);
      }
    }
  }

  function updateHealthDrops() {
    for (let i = healthDrops.length - 1; i >= 0; i--) {
      const d = healthDrops[i];
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.pickupRadius) {
        playSound('ribhavagrawal-energy-drink-effect-230559.mp3', (window.sentinelVolume && window.sentinelVolume.healthPickup !== undefined) ? window.sentinelVolume.healthPickup : 0.7);
        player.health = Math.min(player.maxHealth, player.health + 1);
        // Health pickup feedback: explode into persistent green pieces
        for (let j = 0; j < 18; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 1.8; // fast start
          spawnParticle(
            d.x,
            d.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            60 + Math.floor(Math.random() * 240),
            Math.random() < 0.5 ? "#b11717" : "#d43636",
            0.88 + Math.random() * 0.04,
            2,
            "healthDrop"
          );
        }
        healthDrops.splice(i, 1);
      }
    }
  }

  function updateProtocolOrbs(delta) {
    const regressRate = 0.35;
    const pickupMod = (typeof ProtocolSystem !== "undefined" && ProtocolSystem.getStatMods)
      ? (ProtocolSystem.getStatMods().Pickup || 0)
      : 0;
    const effectivePickupStat = player.stats.Pickup + pickupMod;
    const pickupCaptureRate = Math.max(0.25, 1 + (effectivePickupStat * 0.12));

    for (let i = protocolOrbs.length - 1; i >= 0; i--) {
      const orb = protocolOrbs[i];
      const distToPlayer = Math.hypot(player.x - orb.x, player.y - orb.y);
      if (distToPlayer <= player.pickupRadius) {
        orb.progressFrames = Math.min(orb.requiredFrames, orb.progressFrames + (delta * SPEED_MULTIPLIER * pickupCaptureRate));
        if (orb.progressFrames >= orb.requiredFrames) {
          completeProtocolOrb(orb);
          protocolOrbs.splice(i, 1);
        }
      } else {
        orb.progressFrames = Math.max(0, orb.progressFrames - (delta * SPEED_MULTIPLIER * regressRate));
      }
    }
  }

  function isEnemyInPlayArea(enemy) {
    return enemy.x >= 0 &&
      enemy.x <= canvas.width &&
      enemy.y >= 0 &&
      enemy.y <= canvas.height;
  }

  function isInLootXrayCorner(x, y, isRight, isBottom) {
    const xFromSide = isRight ? canvas.width - x : x;
    const yFromEdge = isBottom ? canvas.height - y : y;
    const verticalEdgeDistance = isBottom
      ? LOOT_XRAY_BOTTOM_DISTANCE
      : LOOT_XRAY_TOP_DISTANCE;
    const cornerVerticalDistance = isBottom
      ? LOOT_XRAY_CORNER_BOTTOM_DISTANCE
      : LOOT_XRAY_CORNER_TOP_DISTANCE;
    if (
      xFromSide < LOOT_XRAY_SIDE_DISTANCE ||
      xFromSide > LOOT_XRAY_CORNER_SIDE_DISTANCE ||
      yFromEdge < verticalEdgeDistance ||
      yFromEdge > cornerVerticalDistance
    ) {
      return false;
    }

    const diagonalProgress = (yFromEdge - verticalEdgeDistance) /
      (cornerVerticalDistance - verticalEdgeDistance);
    const diagonalBoundaryX = LOOT_XRAY_CORNER_SIDE_DISTANCE +
      (LOOT_XRAY_SIDE_DISTANCE - LOOT_XRAY_CORNER_SIDE_DISTANCE) * diagonalProgress;
    return xFromSide <= diagonalBoundaryX;
  }

  function isInLootXrayArea(x, y) {
    return x <= LOOT_XRAY_SIDE_DISTANCE ||
      x >= canvas.width - LOOT_XRAY_SIDE_DISTANCE ||
      y <= LOOT_XRAY_TOP_DISTANCE ||
      y >= canvas.height - LOOT_XRAY_BOTTOM_DISTANCE ||
      isInLootXrayCorner(x, y, false, false) ||
      isInLootXrayCorner(x, y, true, false) ||
      isInLootXrayCorner(x, y, false, true) ||
      isInLootXrayCorner(x, y, true, true);
  }

  function drawLootXray(shakeOffsetX, shakeOffsetY) {
    hudXrayCtx.clearRect(0, 0, hudXrayCanvas.width, hudXrayCanvas.height);
    if (
      !gameStarted ||
      gameOver ||
      showMenuScreen ||
      showLoadingScreen ||
      showStats ||
      window._protocolReplaceMode ||
      window._introPhase === "animating" ||
      hudFrameOverlay.style.display !== "block"
    ) {
      return;
    }

    if (window.debugFramerateEnabled) {
      hudXrayCtx.save();
      hudXrayCtx.strokeStyle = "rgba(255,235,90,0.95)";
      hudXrayCtx.lineWidth = 2;
      hudXrayCtx.setLineDash([8, 6]);
      hudXrayCtx.beginPath();
      hudXrayCtx.moveTo(LOOT_XRAY_CORNER_SIDE_DISTANCE, LOOT_XRAY_TOP_DISTANCE);
      hudXrayCtx.lineTo(canvas.width - LOOT_XRAY_CORNER_SIDE_DISTANCE, LOOT_XRAY_TOP_DISTANCE);
      hudXrayCtx.lineTo(canvas.width - LOOT_XRAY_SIDE_DISTANCE, LOOT_XRAY_CORNER_TOP_DISTANCE);
      hudXrayCtx.lineTo(canvas.width - LOOT_XRAY_SIDE_DISTANCE, canvas.height - LOOT_XRAY_CORNER_BOTTOM_DISTANCE);
      hudXrayCtx.lineTo(canvas.width - LOOT_XRAY_CORNER_SIDE_DISTANCE, canvas.height - LOOT_XRAY_BOTTOM_DISTANCE);
      hudXrayCtx.lineTo(LOOT_XRAY_CORNER_SIDE_DISTANCE, canvas.height - LOOT_XRAY_BOTTOM_DISTANCE);
      hudXrayCtx.lineTo(LOOT_XRAY_SIDE_DISTANCE, canvas.height - LOOT_XRAY_CORNER_BOTTOM_DISTANCE);
      hudXrayCtx.lineTo(LOOT_XRAY_SIDE_DISTANCE, LOOT_XRAY_CORNER_TOP_DISTANCE);
      hudXrayCtx.closePath();
      hudXrayCtx.stroke();

      hudXrayCtx.setLineDash([]);
      hudXrayCtx.strokeStyle = "rgba(90,235,255,0.9)";
      hudXrayCtx.fillStyle = "rgba(180,250,255,0.95)";
      hudXrayCtx.lineWidth = 1;
      hudXrayCtx.font = "10px monospace";
      for (let px = 0; px <= 200; px += 10) {
        const isMajorTick = px % 50 === 0;
        const tickLength = isMajorTick ? 8 : 4;

        hudXrayCtx.beginPath();
        hudXrayCtx.moveTo(px, 0);
        hudXrayCtx.lineTo(px, tickLength);
        hudXrayCtx.stroke();
        hudXrayCtx.beginPath();
        hudXrayCtx.moveTo(0, px);
        hudXrayCtx.lineTo(tickLength, px);
        hudXrayCtx.stroke();

        if (isMajorTick) {
          hudXrayCtx.fillText(String(px), px + 2, 20);
          hudXrayCtx.fillText(String(px), 12, Math.max(10, px - 2));
        }
      }
      hudXrayCtx.fillText("px", 226, 20);
      hudXrayCtx.restore();
    }

    const drawMarker = (x, y, color, radius) => {
      if (!isInLootXrayArea(x, y)) return;
      hudXrayCtx.save();
      hudXrayCtx.globalAlpha = 0.82;
      hudXrayCtx.shadowColor = color;
      hudXrayCtx.shadowBlur = 12;
      hudXrayCtx.fillStyle = color;
      hudXrayCtx.strokeStyle = "rgba(230,255,255,0.95)";
      hudXrayCtx.lineWidth = 1.5;
      hudXrayCtx.beginPath();
      hudXrayCtx.arc(x, y, radius, 0, Math.PI * 2);
      hudXrayCtx.fill();
      hudXrayCtx.stroke();
      hudXrayCtx.restore();
    };

    hudXrayCtx.save();
    hudXrayCtx.translate(shakeOffsetX, shakeOffsetY);
    xpDrops.forEach(drop => drawMarker(drop.x, drop.y, "#ff31ff", 5));
    slingerDrops.forEach(drop => drawMarker(drop.x, drop.y, "#ffd700", 5));
    bruteDrops.forEach(drop => drawMarker(drop.x, drop.y, "#ff1717", 9));
    healthDrops.forEach(drop => drawMarker(drop.x, drop.y, "#ff1717", 9));
    protocolOrbs.forEach(orb => {
      if (!isInLootXrayArea(orb.x, orb.y)) return;
      const tier = (PROTOCOLS[orb.protocolName] && PROTOCOLS[orb.protocolName].tier) || "Standard";
      drawMarker(orb.x, orb.y, getProtocolRarityColor(orb.rarity, tier), orb.radius);
      const progress = orb.requiredFrames > 0
        ? Math.min(1, orb.progressFrames / orb.requiredFrames)
        : 0;
      if (progress > 0) {
        hudXrayCtx.save();
        hudXrayCtx.lineWidth = 2;
        hudXrayCtx.strokeStyle = "#e8ffff";
        hudXrayCtx.beginPath();
        hudXrayCtx.arc(
          orb.x,
          orb.y,
          orb.radius + 4,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.PI * 2 * progress)
        );
        hudXrayCtx.stroke();
        hudXrayCtx.restore();
      }
    });
    hudXrayCtx.restore();
  }




//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  
//-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=     WAVE     =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  

  function getWaveControlContext() {
    return {
      getWave: () => wave,
      getBurstCount: () => window._sentinelWaveState.burstCount,
      setBurstCount: (value) => {
        window._sentinelWaveState.burstCount = value;
        burstCount = value;
      },
      getBurstInterval: () => burstInterval,
      setBurstInterval: (value) => {
        burstInterval = value;
      },
      getBurstIndex: () => window._sentinelWaveState.burstIndex,
      setBurstIndex: (value) => {
        window._sentinelWaveState.burstIndex = value;
        burstIndex = value;
      },
      getBurstTimer: () => window._sentinelWaveState.burstTimer,
      setBurstTimer: (value) => {
        window._sentinelWaveState.burstTimer = value;
        burstTimer = value;
      },
      getEnemies: () => enemies,
      spawnEnemy: () => spawnEnemy(),
      applyWaveEnemyModifiers,
      getCanvasWidth: () => canvas.width,
      getCanvasHeight: () => canvas.height,
      getSpeedMultiplier: () => SPEED_MULTIPLIER,
      setWaveAnnouncementTimer: () => {
        waveAnnouncementTimer = WAVE_ANNOUNCE_DURATION;
      },
      getGruntSprite: () => gruntImg,
      getSlingerSprite: () => slingerImg,
      resetBurstProgress: () => {
        window._sentinelWaveState.burstIndex = 0;
        window._sentinelWaveState.burstTimer = 0;
        burstIndex = 0;
        burstTimer = 0;
      }
    };
  }

  // Main function to spawn waves based on the current wave number, with custom logic for each wave
  function spawnWave() {
    if (window._victoryTriggered) return;
    if (!window.SentinelWaveControl || typeof window.SentinelWaveControl.spawnWave !== "function") {
      return;
    }
    window.SentinelWaveControl.spawnWave(getWaveControlContext());

  }
  


  function handleWaveSpawning(delta) {
    if (window._victoryTriggered) return;
    if (!window.SentinelWaveControl || typeof window.SentinelWaveControl.handleWaveSpawning !== "function") {
      return;
    }
    window.SentinelWaveControl.handleWaveSpawning(getWaveControlContext(), delta);

    
  }




//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  
//-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=MISC FUNCTIONS=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  

  function drawLine(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawDisplayPrompt(text, centerX, centerY, color = "#00d9ff") {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.font = "bold 14px monospace";
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillText(text, centerX, centerY);
    ctx.restore();
  }

  function drawHUD() {
    hudWaveDisplay.textContent = "Wave " + wave;
    hudWaveDisplay.dataset.displayMode = "wave";
    hudWaveDisplay.style.display = "flex";
    hudWaveDisplay.style.top = "24px";
    hudWaveDisplay.style.height = "30px";
    hudWaveDisplay.style.lineHeight = "30px";
    hudWaveDisplay.style.font = "bold 28px sans-serif";
    hudWaveDisplay.setAttribute("aria-label", "Wave " + wave);
    // ...existing code...
    const menuSlideProgress = 1 - Math.pow(1 - statsMenuAnimationProgress, 3);
    const statsSlideX = -330 * (1 - menuSlideProgress);
    const protocolsSlideX = 330 * (1 - menuSlideProgress);
    const hotkeySlideY = 110 * (1 - menuSlideProgress);
    const isStatsMenuVisible = showStats || statsMenuAnimationProgress > 0;
    if (window._editorSessionActive && gameStarted && !gameOver) {
      drawDisplayPrompt("PRESS O TO OPEN EDITOR", canvas.width / 2, 78);
    }
    if (isStatsMenuVisible) {
      // ...existing code for stats panel...
      const statsPanelWidth = 320;
      const statsPanelHeight = 370;
      const statsPanelX = 10;
      const statsPanelY = 190;
      const statsPanelCenterX = statsPanelX + statsPanelWidth / 2;

      ctx.save();
      ctx.translate(statsSlideX, 0);
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#0b1b2b';
      ctx.shadowColor = 'rgba(0, 217, 255, 0.22)';
      ctx.shadowBlur = 12;
      ctx.fillRect(statsPanelX, statsPanelY, statsPanelWidth, statsPanelHeight);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = "rgba(0, 217, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#00d9ff";
      ctx.shadowBlur = 8;
      ctx.strokeRect(statsPanelX, statsPanelY, statsPanelWidth, statsPanelHeight);
      ctx.restore();
      ctx.fillStyle = "#00d9ff";
      ctx.textAlign = "left";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Level: " + level + " (" + xp + "/" + xpToLevel + ")", statsPanelCenterX, 220);
      ctx.fillText("Hit Points: " + Math.round(player.health) + "/" + Math.round(player.maxHealth), statsPanelCenterX, 240);
      ctx.fillText("Power Allocation Points: " + statPoints, statsPanelCenterX, 260);
      ctx.fillText("Base Power Allocation Max: " + (level+1), statsPanelCenterX, 280);
      ctx.textAlign = "left";
      // Draw clickable stat labels with -/+ buttons and store their bounding boxes
      window._statButtonBoxes = [];
      window._statMinusButtonBoxes = [];
      window._statPlusButtonBoxes = [];
      const protocolModsForDisplay = ProtocolSystem.getStatMods();
      const statLabels = [
        { label: "Range", base: player.stats.Range, protocol: protocolModsForDisplay.Range, stat: 1 },
        { label: "Atk Power", base: player.stats.Power, protocol: protocolModsForDisplay.Power, stat: 2 },
        { label: "Atk Intensity", base: player.stats.AttackSpeed, protocol: protocolModsForDisplay.Intensity, stat: 3 },
        { label: "Movement", base: player.stats.Movement, protocol: protocolModsForDisplay.Movement, stat: 4 },
        { label: "Health", base: player.stats.Vitality, protocol: protocolModsForDisplay.Health, stat: 5 },
        { label: "Pickup Range", base: player.stats.Pickup, protocol: protocolModsForDisplay.Pickup, stat: 6 }
      ];
      for (let i = 0; i < statLabels.length; i++) {
        const stat = statLabels[i];
        const totalValue = stat.base + stat.protocol;
        const protocolValue = stat.protocol >= 0 ? `+${stat.protocol}` : `${stat.protocol}`;
        const bpValue = `B:${stat.base} P:${protocolValue}`;
        const totalText = `${totalValue}`;

        const col = i % 2;
        const row = Math.floor(i / 2);
        const panelCenter = col === 0
          ? statsPanelX + statsPanelWidth * 0.27
          : statsPanelX + statsPanelWidth * 0.73;
        const y = 320 + row * 74;

        ctx.font = "bold 16px sans-serif";
        ctx.font = "16px sans-serif";
        const totalTextWidth = ctx.measureText(totalText).width;
        const buttonWidth = 18;
        const buttonHeight = 16;
        const groupWidth = 18 + 8 + totalTextWidth + 8 + 18;
        // Stat name centered
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#00d9ff";
        ctx.fillText(stat.label, panelCenter, y);
        // Base / Protocol line
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#aaf6ff";
        ctx.fillText(bpValue, panelCenter, y + 12);
        // - button
        const minusX = panelCenter - (groupWidth / 2);
        ctx.fillStyle = stat.base > 0 ? "#00d9ff" : "#555";
        ctx.fillRect(minusX, y + 18, 18, 16);
        ctx.fillStyle = "#061525";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("-", minusX + 9, y + 31);
        window._statMinusButtonBoxes.push({
          x: minusX,
          y: y + 18,
          w: 18,
          h: 16,
          stat: stat.stat
        });
        // Total value centered between buttons
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#00d9ff";
        ctx.textAlign = "center";
        const valueX = panelCenter;
        ctx.fillText(totalText, valueX, y + 31);
        window._statButtonBoxes.push({
          x: valueX - (totalTextWidth / 2),
          y: y + 18,
          w: totalTextWidth,
          h: 16,
          stat: stat.stat
        });
        // + button
        const plusX = panelCenter + (groupWidth / 2) - 18;
        ctx.fillStyle = statPoints > 0 && stat.base < (level + 1) ? "#00d9ff" : "#555";
        ctx.fillRect(plusX, y + 18, 18, 16);
        ctx.fillStyle = "#061525";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("+", plusX + 9, y + 31);
        window._statPlusButtonBoxes.push({
          x: plusX,
          y: y + 18,
          w: 18,
          h: 16,
          stat: stat.stat
        });
      }
      // Tutorial draw hook — draws directly on the game ctx in the same coordinate space
      if (typeof window._tutDrawOnStats === 'function') {
        window._tutDrawOnStats(ctx, window._statPlusButtonBoxes, statPoints,
          statsPanelX, statsPanelY, statsPanelWidth);
      }
      // Persistent: pulse + buttons whenever stat points are available
      if (statPoints > 0 && window._tutDrawOnStats === null || (statPoints > 0 && typeof window._tutDrawOnStats !== 'function')) {
        const pulse = 0.35 + 0.55 * Math.abs(Math.sin(Date.now() / 400));
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = '#00d9ff';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 2;
        for (const box of window._statPlusButtonBoxes) {
          ctx.strokeRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
        }
        ctx.restore();
      }
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#aaf6ff";
      ctx.textAlign = "center";
      ctx.fillText("B: Base   P: Protocol   T: Total", statsPanelCenterX, statsPanelY + statsPanelHeight - 10);
      for (const boxes of [window._statButtonBoxes, window._statMinusButtonBoxes, window._statPlusButtonBoxes]) {
        for (const box of boxes) box.x += statsSlideX;
      }
      ctx.restore();

      ctx.save();
      ctx.translate(0, hotkeySlideY);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#0b1b2b';
        ctx.shadowColor = 'rgba(0, 217, 255, 0.22)';
        ctx.shadowBlur = 12;
        ctx.fillRect(canvas.width / 2 - 330, canvas.height - 110, 660, 110);
        ctx.save();
        ctx.strokeStyle = "rgba(0, 217, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#00d9ff";
        ctx.shadowBlur = 8;
        ctx.strokeRect(canvas.width / 2 - 330, canvas.height - 110, 660, 110);
        ctx.restore();
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#00d9ff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("[1]-> Range  [2]-> Power  [3]-> Atk Speed  [4]-> Movement  [5]-> Vitality  [6]-> Pickup", canvas.width / 2, canvas.height - 85);
        ctx.restore();

    // Protocol Selection Panel (right side, wider with scrolling, organized by families)
    if (isStatsMenuVisible) {
      const panelWidth = 320;
      const panelHeight = 370;
      const panelX = canvas.width - panelWidth - 10;
      const panelY = 190;
      const contentY = panelY + 45;
      const contentHeight = panelHeight - 55;
      
      ctx.save();
      ctx.translate(protocolsSlideX, 0);
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#0b1b2b';
      ctx.shadowColor = 'rgba(0, 217, 255, 0.22)';
      ctx.shadowBlur = 12;
      ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = "rgba(0, 217, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#00d9ff";
      ctx.shadowBlur = 8;
      ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
      ctx.restore();
      
      ctx.fillStyle = "#00d9ff";
      ctx.textAlign = "center";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("Active Protocols", panelX + panelWidth / 2, panelY + 20);
      
      // Display active protocol count
      ctx.fillStyle = "#aaf6ff";
      ctx.font = "16px sans-serif";
      const activeCount = ProtocolSystem.activeProtocols.length;
      ctx.fillText(`${activeCount}/6`, panelX + panelWidth / 2, panelY + 42);
      
      // Initialize scroll offset
      if (typeof window._protocolScrollOffset === 'undefined') {
        window._protocolScrollOffset = 0;
      }
      const discoveredSet = new Set(ProtocolSystem.getRunDiscovered());
      
      // Organize ALL protocols by family (discovered and undiscovered)
      const familyGroups = { "Targeting": [], "Overdrive": [], "Utility": [] };
      const globalIndex = {};
      let globalIdx = 0;
      Object.keys(PROTOCOLS).forEach(protocolName => {
        const proto = PROTOCOLS[protocolName];
        if (familyGroups[proto.family]) {
          familyGroups[proto.family].push(protocolName);
          globalIndex[protocolName] = globalIdx++;
        }
      });
      
      // Apply clipping before rendering scrollable content
      ctx.save();
      ctx.beginPath();
      ctx.rect(panelX, contentY, panelWidth, contentHeight);
      ctx.clip();
      
      // Render protocol selector boxes with family headers
      window._protocolSelectorBoxes = [];
      let y = contentY - window._protocolScrollOffset;
      
      Object.entries(familyGroups).forEach(([family, protocols]) => {
        if (protocols.length === 0) return;
        
        // Family header
        ctx.save();
        ctx.fillStyle = "#00d9ff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(family, panelX + panelWidth / 2, y + 15);
        ctx.restore();
        y += 22;
        
        // Protocol boxes for this family
        protocols.forEach(protocolName => {
          const cardWidth = 240;
          const cardX = panelX + (panelWidth - cardWidth) / 2;
          const isDiscovered = discoveredSet.has(protocolName);
          const isActive = ProtocolSystem.activeProtocols.includes(protocolName);
          const isFavorite = typeof ProtocolSystem.isFavorite === "function"
            ? ProtocolSystem.isFavorite(protocolName)
            : false;

          const inView = !(y + 26 < contentY || y > contentY + contentHeight);
          if (!inView) {
            // Still register the box for scroll targeting and click detection
            window._protocolSelectorBoxes.push({
              x: cardX, y: y, w: cardWidth, h: 26,
              index: globalIndex[protocolName], name: protocolName,
              discovered: isDiscovered,
              favoriteX: cardX + cardWidth - 20, favoriteY: y, favoriteW: 20, favoriteH: 14
            });
            y += 27;
            return;
          }
          const _prc = PROTOCOLS[protocolName] && (isDiscovered || isActive)
            ? getProtocolRarityColor(PROTOCOLS[protocolName].rarity, PROTOCOLS[protocolName].tier)
            : "#4a5a56";
          ctx.save();
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = isActive ? _prc : (isDiscovered ? "#222" : "#1a1a1a");
          ctx.fillRect(cardX, y, cardWidth, 26);
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = isActive ? "#061525" : (isDiscovered ? _prc : "#7f8f8b");
          ctx.textAlign = "center";
          ctx.fillText(protocolName.substr(0, 28), cardX + cardWidth / 2, y + 16);

          const starCenterX = cardX + cardWidth - 11;
          const starCenterY = y + 8;
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = isFavorite ? "#ffd84d" : "#4a5a56";
          ctx.fillText("✶", starCenterX, starCenterY);
          ctx.restore();
          
          window._protocolSelectorBoxes.push({
            x: cardX,
            y: y,
            w: cardWidth,
            h: 26,
            index: globalIndex[protocolName],
            name: protocolName,
            discovered: isDiscovered,
            favoriteX: cardX + cardWidth - 20,
            favoriteY: y,
            favoriteW: 20,
            favoriteH: 14
          });
          y += 27;
        });
        y += 6;
      });
      
      // Restore from clipping
      ctx.restore();

      // Draw newly-picked protocol highlights ON TOP of all cards
      if (window._newlyPickedProtocols && window._newlyPickedProtocols.size > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX, contentY, panelWidth, contentHeight);
        ctx.clip();
        (window._protocolSelectorBoxes || []).forEach(box => {
          if (window._newlyPickedProtocols.has(box.name)) {
            const np = 0.4 + 0.5 * Math.abs(Math.sin(Date.now() / 450));
            ctx.globalAlpha = np;
            ctx.shadowColor = '#00d9ff';
            ctx.shadowBlur = 18;
            ctx.fillStyle = 'rgba(0, 217, 255, 0.22)';
            ctx.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
          }
        });
        ctx.restore();
      }

      // Scrollbar indicator
      const totalContentHeight = Object.values(familyGroups).reduce((sum, arr) => sum + (arr.length > 0 ? 22 + arr.length * 27 + 6 : 0), 0);
      const maxProtocolScroll = Math.max(0, totalContentHeight - contentHeight);
      window._protocolScrollOffset = Math.max(0, Math.min(window._protocolScrollOffset, maxProtocolScroll));
      if (totalContentHeight > contentHeight) {
        const scrollRatio = contentHeight / totalContentHeight;
        const scrollbarHeight = Math.max(20, contentHeight * scrollRatio);
        const scrollbarY = contentY + (window._protocolScrollOffset / totalContentHeight) * contentHeight;
        
        ctx.fillStyle = "rgba(0, 217, 255, 0.5)";
        ctx.fillRect(panelX + 2, scrollbarY, 6, scrollbarHeight);
      }

      // Tutorial protocol panel draw hook
      if (typeof window._tutDrawOnProtocols === 'function') {
        window._tutDrawOnProtocols(ctx, window._protocolSelectorBoxes, panelX, panelY, panelWidth, panelHeight, contentY, contentHeight);
      }
      // Tutorial auto-scroll: bring the picked-up protocol card into view
      if (window._tutScrollToProtocol) {
        const targetName = window._tutScrollToProtocol;
        const box = (window._protocolSelectorBoxes || []).find(b => b.name === targetName);
        if (box) {
          // Target: card centered in the visible area
          // box.y is relative to the unclipped canvas, so offset within total content
          // = box.y - contentY + _protocolScrollOffset
          const cardOffsetInContent = box.y - contentY + window._protocolScrollOffset;
          const targetScroll = cardOffsetInContent - (contentHeight / 2) + (box.h / 2);
          const clampedTarget = Math.max(0, Math.min(maxProtocolScroll, targetScroll));
          const diff = clampedTarget - window._protocolScrollOffset;
          if (Math.abs(diff) < 1) {
            window._protocolScrollOffset = clampedTarget;
            window._tutScrollToProtocol = null;
          } else {
            // Smooth step toward target
            window._protocolScrollOffset += diff * 0.18;
          }
        }
      }

      window._protocolPanelX = panelX + protocolsSlideX;
      for (const box of window._protocolSelectorBoxes) {
        box.x += protocolsSlideX;
        box.favoriteX += protocolsSlideX;
      }
      ctx.restore();
      
      // Display hovered protocol details following mouse cursor
      if (!window._protocolReplaceMode && hoveredProtocol >= 0) {
        const hoveredBox = (window._protocolSelectorBoxes || []).find(box => box.index === hoveredProtocol);
        if (hoveredBox && hoveredBox.name) {
          const proto = PROTOCOLS[hoveredBox.name];
          const tooltipWidth = 285;
          const contentWidth = tooltipWidth - 16;

          const wrapText = (text, maxWidth, font) => {
            ctx.font = font;
            const words = text.split(" ");
            const lines = [];
            let line = "";
            for (let i = 0; i < words.length; i++) {
              const testLine = line ? line + " " + words[i] : words[i];
              if (ctx.measureText(testLine).width <= maxWidth) {
                line = testLine;
              } else {
                if (line) lines.push(line);
                line = words[i];
              }
            }
            if (line) lines.push(line);
            return lines;
          };

          const positiveColor = "#66ff99";
          const negativeColor = "#ff6b6b";
          const neutralColor = "#b5d2d8";
          const bodyColor = hoveredBox.discovered ? "#d6f8ff" : "#8ea6a0";
          const tokenColor = (value) => value > 0 ? positiveColor : value < 0 ? negativeColor : neutralColor;

          const buildTokenLines = (tokens, maxWidth, font) => {
            if (!tokens || tokens.length === 0) return [];
            ctx.font = font;
            const lines = [];
            let currentItems = [];
            let currentWidth = 0;
            tokens.forEach((token, idx) => {
              const drawText = idx < tokens.length - 1 ? token.text + "  " : token.text;
              const width = ctx.measureText(drawText).width;
              if (currentItems.length > 0 && currentWidth + width > maxWidth) {
                lines.push({ items: currentItems, width: currentWidth });
                currentItems = [];
                currentWidth = 0;
              }
              currentItems.push({ text: drawText, color: token.color, width });
              currentWidth += width;
            });
            if (currentItems.length > 0) {
              lines.push({ items: currentItems, width: currentWidth });
            }
            return lines;
          };

          const estimateTokenLines = (tokens, maxWidth, font) => {
            const lines = buildTokenLines(tokens, maxWidth, font);
            return lines.length || 1;
          };

          const drawTokenLines = (tokens, x, y, maxWidth, font, lineHeight, align = "left", centerX = 0) => {
            const lines = buildTokenLines(tokens, maxWidth, font);
            if (lines.length === 0) return y + lineHeight;
            ctx.font = font;
            const previousAlign = ctx.textAlign;
            ctx.textAlign = "left";
            let cursorY = y;
            lines.forEach(line => {
              let cursorX = align === "center" ? centerX - (line.width / 2) : x;
              line.items.forEach(item => {
                ctx.fillStyle = item.color;
                ctx.fillText(item.text, cursorX, cursorY);
                cursorX += item.width;
              });
              cursorY += lineHeight;
            });
            ctx.textAlign = previousAlign;
            return cursorY;
          };

          const titleLines = wrapText(hoveredBox.name, contentWidth, "900 14px sans-serif");
          const familyLine = proto.family + " • " + getProtocolRarityName(proto.rarity, proto.tier);
          const orderedStats = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
          const statShort = {
            Range: "Rng:",
            Power: "Pwr:",
            Intensity: "Int:",
            Movement: "Mov:",
            Health: "HP:",
            Pickup: "Pick:"
          };
          const formatSignedValue = (num) => `${num > 0 ? "+" : num < 0 ? "-" : " "}${Math.abs(num)}`;
          const hoveredEffectiveMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
            ? ProtocolSystem.getProtocolEffectiveMods(hoveredBox.name)
            : proto.statMods;

          const protocolModTokens = orderedStats.map(stat => {
            const value = hoveredEffectiveMods[stat] || 0;
            return {
              text: `${statShort[stat]}${formatSignedValue(value)}`,
              color: tokenColor(value)
            };
          });

          const formatDiffTokens = (hoveredMods, activeMods) => {
            return orderedStats.map(stat => {
              const diff = (hoveredMods[stat] || 0) - (activeMods[stat] || 0);
              return {
                text: `${statShort[stat]}${formatSignedValue(diff)}`,
                color: tokenColor(diff)
              };
            });
          };

          const hoveredIsActive = ProtocolSystem.activeProtocols.includes(hoveredBox.name);
          const showComparison = !hoveredIsActive;
          const activeProtocolNames = showComparison
            ? ProtocolSystem.activeProtocols.filter(name => name !== hoveredBox.name)
            : [];
          const compareHeaderLines = showComparison
            ? wrapText(
                activeProtocolNames.length ? "1:1 Comparison" : "1:1 Comparison: none",
                contentWidth,
                "bold 11px sans-serif"
              )
            : [];
          const compareRows = [];
          activeProtocolNames.forEach(activeName => {
            const activeProto = PROTOCOLS[activeName];
            if (!activeProto) return;
            const activeEffectiveMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
              ? ProtocolSystem.getProtocolEffectiveMods(activeName)
              : activeProto.statMods;
            const nameLines = wrapText(`${activeName}`, contentWidth, "900 12px sans-serif");
            const diffTokens = formatDiffTokens(hoveredEffectiveMods, activeEffectiveMods);
            compareRows.push({ nameLines, diffTokens, activeName, activeProto });
          });

          const titleLineHeight = 17;
          const bodyLineHeight = 14;
          const sectionGap = 10;
          const protocolTokenLineCount = estimateTokenLines(protocolModTokens, contentWidth, "11px sans-serif");
          let compareTokenLineCount = 0;
          let compareNameLineCount = 0;
          compareRows.forEach(row => {
            compareNameLineCount += row.nameLines.length;
            compareTokenLineCount += estimateTokenLines(row.diffTokens, contentWidth, "11px sans-serif");
          });

          const tooltipHeight =
            12 +
            (titleLines.length * titleLineHeight) +
            bodyLineHeight +
            (protocolTokenLineCount * bodyLineHeight) +
            (showComparison ? sectionGap : 0) +
            (showComparison ? (compareHeaderLines.length * bodyLineHeight) : 0) +
            (showComparison ? (compareNameLineCount * bodyLineHeight) : 0) +
            (showComparison ? (compareTokenLineCount * bodyLineHeight) : 0) +
            10;
          // Center tooltip statically in the viewport
          const tooltipX = (canvas.width - tooltipWidth) / 2;
          const tooltipY = (canvas.height - tooltipHeight) / 2;
          
          ctx.save();
          ctx.save();
          ctx.globalAlpha = 0.93;
          ctx.fillStyle = '#0b1b2b';
          ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
          ctx.strokeStyle = hoveredBox.discovered ? getProtocolRarityColor(proto.rarity, proto.tier) : "#7f8f8b";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
          // Reinforce tooltip z-index by drawing last and using a high overlay
          if (window._protocolTooltipOverlay) {
            window._protocolTooltipOverlay.style.zIndex = 9999;
          }
          
          ctx.font = "900 14px sans-serif";
          ctx.fillStyle = hoveredBox.discovered ? getProtocolRarityColor(proto.rarity, proto.tier) : "#7f8f8b";
          ctx.textAlign = "center";
          let textY = tooltipY + 18;
          titleLines.forEach(line => {
            ctx.fillText(line, tooltipX + tooltipWidth / 2, textY);
            textY += titleLineHeight;
          });

          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = hoveredBox.discovered ? getProtocolRarityColor(proto.rarity, proto.tier) : "#7f8f8b";
          ctx.fillText(familyLine, tooltipX + tooltipWidth / 2, textY);
          textY += bodyLineHeight;
          
          ctx.font = "11px sans-serif";
          ctx.fillStyle = bodyColor;
          ctx.textAlign = "center";
          const bodyTextX = tooltipX + 8;
          textY = drawTokenLines(protocolModTokens, bodyTextX, textY, contentWidth, "11px sans-serif", bodyLineHeight, "center", tooltipX + tooltipWidth / 2);

          if (showComparison) {
            textY += sectionGap;
            ctx.font = "bold 11px sans-serif";
            ctx.fillStyle = hoveredBox.discovered ? "#c8ffff" : "#90a8a0";
            compareHeaderLines.forEach(line => {
              ctx.fillText(line, tooltipX + tooltipWidth / 2, textY);
              textY += bodyLineHeight;
            });

            compareRows.forEach(row => {
              ctx.font = "900 12px sans-serif";
              const nameColor = row.activeProto
                ? getProtocolRarityColor(row.activeProto.rarity, row.activeProto.tier)
                : (hoveredBox.discovered ? "#9fffe0" : "#8ea6a0");
              ctx.fillStyle = hoveredBox.discovered ? nameColor : "#8ea6a0";
              row.nameLines.forEach(line => {
                ctx.fillText(line, tooltipX + tooltipWidth / 2, textY);
                textY += bodyLineHeight;
              });
              ctx.font = "11px sans-serif";
              textY = drawTokenLines(row.diffTokens, bodyTextX, textY, contentWidth, "11px sans-serif", bodyLineHeight, "center", tooltipX + tooltipWidth / 2);
            });
          }
          ctx.restore();
        }
      }
    }
    ctx.restore();

    // Replace protocol — centered tooltip panel
    if (window._protocolReplaceMode && window._protocolReplaceCandidate) {
      const candName = window._protocolReplaceCandidate;
      const candProto = PROTOCOLS[candName];
      const activeList = ProtocolSystem.activeProtocols;
      const cardH = 26;
      const panelW = 320;
      const pad = 14;
      const titleLineHeight = 17;
      const bodyLineHeight = 14;
      const sectionGap = 8;
      const centerX = canvas.width / 2;
      window._protocolReplacePanelBoxes = [];

      // helpers
      const _wrap = (text, maxW, font) => {
        ctx.font = font;
        const words = text.split(" ");
        const lines = [];
        let line = "";
        for (const word of words) {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width <= maxW) { line = test; }
          else { if (line) lines.push(line); line = word; }
        }
        if (line) lines.push(line);
        return lines;
      };
      const _buildTok = (tokens, maxW, font) => {
        if (!tokens || !tokens.length) return [];
        ctx.font = font;
        const lines = []; let cur = [], curW = 0;
        tokens.forEach((tok, idx) => {
          const drawn = idx < tokens.length - 1 ? tok.text + "  " : tok.text;
          const w = ctx.measureText(drawn).width;
          if (cur.length && curW + w > maxW) { lines.push({ items: cur, width: curW }); cur = []; curW = 0; }
          cur.push({ text: drawn, color: tok.color, width: w }); curW += w;
        });
        if (cur.length) lines.push({ items: cur, width: curW });
        return lines;
      };
      const _drawTok = (tokens, x, y, maxW, font, lh, cx) => {
        const lines = _buildTok(tokens, maxW, font);
        if (!lines.length) return y + lh;
        ctx.font = font; ctx.textAlign = "left"; let curY = y;
        lines.forEach(line => {
          let curX = cx - (line.width / 2);
          line.items.forEach(item => { ctx.fillStyle = item.color; ctx.fillText(item.text, curX, curY); curX += item.width; });
          curY += lh;
        });
        return curY;
      };
      const _estTok = (tokens, maxW, font) => _buildTok(tokens, maxW, font).length || 1;

      const orderedStats = ["Range", "Power", "Intensity", "Movement", "Health", "Pickup"];
      const statShort = { Range: "Rng:", Power: "Pwr:", Intensity: "Int:", Movement: "Mov:", Health: "HP:", Pickup: "Pick:" };
      const fmtS = (n) => `${n > 0 ? "+" : n < 0 ? "-" : " "}${Math.abs(n)}`;
      const tkCol = (v) => v > 0 ? "#66ff99" : v < 0 ? "#ff6b6b" : "#b5d2d8";

      const contentW = panelW - pad * 2;
      const candMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
        ? ProtocolSystem.getProtocolEffectiveMods(candName) : (candProto ? candProto.statMods : {});
      const candTokens = orderedStats.map(s => ({ text: `${statShort[s]}${fmtS(candMods[s] || 0)}`, color: tkCol(candMods[s] || 0) }));

      const titleLines = candProto ? _wrap(candName, contentW, "900 14px sans-serif") : [candName];
      const familyLine = candProto ? (candProto.family + " • " + getProtocolRarityName(candProto.rarity, candProto.tier)) : "";
      const candTokLines = _estTok(candTokens, contentW, "11px sans-serif");

      const hov = window._protocolReplaceHovered;

      // Fixed comparison section height — always reserved so panel never resizes on hover.
      // 1 label line + up to 2 token lines (6 stats, generous wrap budget).
      const cmpH = sectionGap + 3 * bodyLineHeight;

      const panelH =
        pad +
        titleLines.length * titleLineHeight +
        bodyLineHeight + // family line
        candTokLines * bodyLineHeight +
        sectionGap + bodyLineHeight + // section header "Select protocol to replace:"
        activeList.length * (cardH + 4) +
        cmpH + // always-reserved comparison section
        sectionGap + cardH + // cancel button
        pad;

      const panelX = centerX - panelW / 2;
      const panelY = (canvas.height - panelH) / 2;

      ctx.save();

      // Panel bg + border
      ctx.globalAlpha = 0.96;
      ctx.fillStyle = "#081a2b";
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.globalAlpha = 1;
      ctx.shadowColor = "#00d9ff"; ctx.shadowBlur = 18;
      ctx.strokeStyle = "#00d9ff"; ctx.lineWidth = 2;
      ctx.strokeRect(panelX, panelY, panelW, panelH);
      ctx.shadowBlur = 0;

      let ty = panelY + pad + titleLineHeight;

      // Candidate name & family
      ctx.font = "900 14px sans-serif"; ctx.fillStyle = "#00d9ff"; ctx.textAlign = "center";
      titleLines.forEach(line => { ctx.fillText(line, centerX, ty); ty += titleLineHeight; });
      ctx.font = "bold 11px sans-serif"; ctx.fillStyle = candProto ? getProtocolRarityColor(candProto.rarity, candProto.tier) : "#aaf6ff";
      ctx.fillText(familyLine, centerX, ty); ty += bodyLineHeight;

      // Candidate stat tokens
      ty = _drawTok(candTokens, panelX + pad, ty, contentW, "11px sans-serif", bodyLineHeight, centerX);
      ty += sectionGap;

      // Section header
      ctx.font = "bold 12px sans-serif"; ctx.fillStyle = "#c8ffff"; ctx.textAlign = "center";
      ctx.fillText("Select protocol to replace:", centerX, ty); ty += bodyLineHeight;

      // Active protocol cards
      for (let i = 0; i < activeList.length; i++) {
        const name = activeList[i];
        const isHov = name === hov;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = isHov ? "#123a56" : "#0d263b";
        ctx.fillRect(panelX + pad, ty, contentW, cardH);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isHov ? "#00d9ff" : "#287ca3"; ctx.lineWidth = 1.5;
        ctx.strokeRect(panelX + pad, ty, contentW, cardH);
        ctx.fillStyle = isHov ? "#00d9ff" : "#c8ffff";
        ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(name, centerX, ty + 17);
        window._protocolReplacePanelBoxes.push({ x: panelX + pad, y: ty, w: contentW, h: cardH, name, cancel: false });
        ty += cardH + 4;
      }

      // Hovered comparison — drawn in always-reserved area
      ty += sectionGap;
      if (hov) {
        const hovProto = PROTOCOLS[hov];
        const hovMods = (typeof ProtocolSystem.getProtocolEffectiveMods === "function")
          ? ProtocolSystem.getProtocolEffectiveMods(hov) : (hovProto ? hovProto.statMods : {});
        const diffTok = orderedStats.map(s => { const d = (candMods[s] || 0) - (hovMods[s] || 0); return { text: `${statShort[s]}${fmtS(d)}`, color: tkCol(d) }; });
        ctx.font = "bold 11px sans-serif"; ctx.fillStyle = "#c8ffff"; ctx.textAlign = "center";
        ctx.fillText("Replacing: " + hov, centerX, ty); ty += bodyLineHeight;
        _drawTok(diffTok, panelX + pad, ty, contentW, "11px sans-serif", bodyLineHeight, centerX);
      } else {
        ctx.font = "11px sans-serif"; ctx.fillStyle = "rgba(180,220,220,0.35)"; ctx.textAlign = "center";
        ctx.fillText("Hover a protocol to compare", centerX, ty + bodyLineHeight);
      }

      // Cancel button — anchored to panel bottom
      const cancelY = panelY + panelH - pad - cardH;
      const cancelW = 110;
      const cancelX = centerX - cancelW / 2;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#0b2033";
      ctx.fillRect(cancelX, cancelY, cancelW, cardH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#287ca3"; ctx.lineWidth = 1.5;
      ctx.strokeRect(cancelX, cancelY, cancelW, cardH);
      ctx.fillStyle = "#c8ffff"; ctx.font = "13px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Cancel", centerX, cancelY + 17);
      window._protocolReplacePanelBoxes.push({ x: cancelX, y: cancelY, w: cancelW, h: cardH, name: null, cancel: true });

      ctx.restore();
    }

    // ...existing code for drawing stat labels and storing bounding boxes...
    // Stat button click-and-release logic (register only once)
    if (!window._statButtonListenersAdded) {
      // Stat button click logic for -/+ buttons
      canvas.addEventListener("mousedown", function(e) {
        if (!showStats || e.button === 2) return;
        const { x: mx, y: my } = getCanvasMousePos(e);
        // Check minus buttons
        const minusBoxes = window._statMinusButtonBoxes || [];
        for (let box of minusBoxes) {
          if (
            mx >= box.x &&
            mx <= box.x + box.w &&
            my >= box.y &&
            my <= box.y + box.h
          ) {
            // Decrement stat if possible
            const statKeys = ["Range", "Power", "AttackSpeed", "Movement", "Vitality", "Pickup"];
            const stat = statKeys[box.stat - 1];
            if (player.stats[stat] > 0) {
              const oldMaxHealth = player.maxHealth;
              const oldHealth = player.health;
              player.stats[stat]--;
              statPoints++;
              applyStats();
              if (stat === "Vitality") {
                const maxHealthDelta = player.maxHealth - oldMaxHealth;
                player.health = Math.max(0, Math.min(player.maxHealth, oldHealth + maxHealthDelta));
              }
            }
            return;
          }
        }
        // Check plus buttons
        const plusBoxes = window._statPlusButtonBoxes || [];
        for (let box of plusBoxes) {
          if (
            mx >= box.x &&
            mx <= box.x + box.w &&
            my >= box.y &&
            my <= box.y + box.h
          ) {
            // Increment stat if possible
            if (statPoints > 0) {
              applyStatPoint(String(box.stat));
            }
            return;
          }
        }
      });
      // Protocol selector click handler
      canvas.addEventListener("mousedown", function(e) {
        if (!showStats || e.button === 2) return;
        const { x: mx, y: my } = getCanvasMousePos(e);
        // Handle replace mode clicks first
        if (window._protocolReplaceMode) {
          const replaceBoxes = window._protocolReplacePanelBoxes || [];
          for (let box of replaceBoxes) {
            if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
              if (box.cancel) {
                window._protocolReplaceMode = false;
                window._protocolReplaceCandidate = null;
              } else {
                ProtocolSystem.swap(box.name, window._protocolReplaceCandidate);
                applyStats();
                triggerLoadingFlash();
                playProtocolPickupSound();
                window._protocolReplaceMode = false;
                window._protocolReplaceCandidate = null;
              }
              return;
            }
          }
          // Click outside panel cancels
          window._protocolReplaceMode = false;
          window._protocolReplaceCandidate = null;
          return;
        }
        const boxes = window._protocolSelectorBoxes || [];
        for (let box of boxes) {
          if (
            mx >= box.x &&
            mx <= box.x + box.w &&
            my >= box.y &&
            my <= box.y + box.h
          ) {
            if (
              typeof ProtocolSystem.toggleFavorite === "function" &&
              mx >= box.favoriteX &&
              mx <= box.favoriteX + box.favoriteW &&
              my >= box.favoriteY &&
              my <= box.favoriteY + box.favoriteH
            ) {
              ProtocolSystem.toggleFavorite(box.name);
              triggerLoadingFlash();
              return;
            }
            if (box.discovered) {
              if (ProtocolSystem.activeProtocols.includes(box.name)) {
                ProtocolSystem.deactivate(box.name);
                if (selectedProtocol === box.index) selectedProtocol = -1;
                applyStats();
                triggerLoadingFlash();
                playProtocolPickupSound();
              } else if (ProtocolSystem.activeProtocols.length >= 6) {
                window._protocolReplaceMode = true;
                window._protocolReplaceCandidate = box.name;
              } else {
                const activated = ProtocolSystem.activate(box.name);
                if (activated) {
                  selectedProtocol = box.index;
                  applyStats();
                  triggerLoadingFlash();
                  playProtocolPickupSound();
                  // Remove new-protocol highlight on activation
                  if (window._newlyPickedProtocols) {
                    window._newlyPickedProtocols.delete(box.name);
                  }
                  // Tutorial hook: first protocol activation
                  if (!window._tutFirstProtActivatedFired) {
                    window._tutFirstProtActivatedFired = true;
                    window.dispatchEvent(new CustomEvent('tut:firstProtocolActivated'));
                  }
                }
              }
            }
            return;
          }
        }
      });
      // Protocol scroll wheel handler
      canvas.addEventListener("wheel", function(e) {
        if (!showStats) return;
        const { x: mx, y: my } = getCanvasMousePos(e);
        // Check if mouse is over protocol panel (right side)
        const protocolPanelX = typeof window._protocolPanelX === "number"
          ? window._protocolPanelX
          : canvas.width - 330;
        if (mx >= protocolPanelX && mx <= protocolPanelX + 320 && my > 190 && my < 560) {
          e.preventDefault();
          const protocolCountsByFamily = { "Targeting": 0, "Overdrive": 0, "Utility": 0 };
          Object.keys(PROTOCOLS).forEach(protocolName => {
            const family = PROTOCOLS[protocolName].family;
            if (protocolCountsByFamily[family] !== undefined) {
              protocolCountsByFamily[family]++;
            }
          });
          const protocolContentHeight = Object.values(protocolCountsByFamily)
            .reduce((sum, count) => sum + (count > 0 ? 22 + count * 27 + 6 : 0), 0);
          const protocolViewportHeight = 370 - 55;
          const maxProtocolScroll = Math.max(0, protocolContentHeight - protocolViewportHeight);
          window._protocolScrollOffset = Math.max(
            0,
            Math.min(maxProtocolScroll, window._protocolScrollOffset + (e.deltaY > 0 ? 30 : -30))
          );
        }
      }, { passive: false });
      window._statButtonListenersAdded = true;
    }
    }
  }

  

  function restartGame() {
      clearVictoryConsole();
      window._bossSoundsStoppedForEndState = false;
      waveAnnouncementTimer = WAVE_ANNOUNCE_DURATION;
    Object.assign(player, {
      x: 500, y: 430, health: 10, attackCooldown: 0,
      stats: { Range: 1, Power: 2, AttackSpeed: 1, Movement: 1, Vitality: 0, Pickup: 0 }
    });
    player._followVX = 0;
    player._followVY = 0;
    player._hoverPhase = 0;
    player._cursorStillTime = 0;
    player._lastMouseX = mouseX;
    player._lastMouseY = mouseY;
    player.hitFlashTimer = 0;
    player._scanTargetAngle = Math.PI / 2;
    player._scanSnapCooldown = 0;
    if (window.sentinelDifficulty === "Hardcore") {
      const savedStarters = ProtocolSystem.starterProtocols;
      ProtocolSystem.starterProtocols = [];
      ProtocolSystem.initializeRun();
      ProtocolSystem.starterProtocols = savedStarters;
    } else {
      ProtocolSystem.initializeRun();
    }
    playerVisualAngle = Math.PI / 2; // Start facing south
    window._playerToEnemyAngle = Math.PI / 2;
    applyStats();
    xp = 0; xpToLevel = 10; level = 1;
    runCollectedBytes = 0;
    runBytesFinalized = false;
    updateHudDataDisplay();
    runHealthLost = 0;
    runWavesCleared = 0;
    runStartWaves = 0;
    if (window._gameOverMenuBtn) { window._gameOverMenuBtn.remove(); window._gameOverMenuBtn = null; }
    if (window._gameOverOverlay) { window._gameOverOverlay.remove(); window._gameOverOverlay = null; }
    window._gameOverConfirmDone = false;
    window._gameOverExplosionDone = false;
    window._gameOverBurstDone = false;
    window._gameOverFinalTime = undefined;
    window._gameOverDeathPos = null;
    window._victoryTriggered = false;
    window._victoryTime = undefined;
    window._victorySecondBurstDone = false;
    window._secondDeathPending = false;
    window._secondDeathTime = undefined;
    statPoints = 0; // Starting points pre-allocated into Range/Power/AttackSpeed/Movement
    selectedProtocol = -1; // Reset selected protocol
    hoveredProtocol = -1; // Reset hovered protocol
    wave = 1;
    enemies.length = 0;
    healthDrops.length = 0;
    xpDrops.length = 0;
    slingerDrops.length = 0;
    bruteDrops.length = 0;
    protocolOrbs.length = 0;
    particles.length = 0;
    projectiles.length = 0;
    mines.length = 0;
    // Reset wave spawn state
    burstCount = 3;
    burstIndex = 0;
    burstTimer = 0;
    interWaveDelayTimer = 0;
    interWavePending = false;
    window._customBursts = null;
    window._customBrutes = null;
    window._customSlingers = null;
    window._customShielders = null;
    window._customBeamers = null;
    window._customKamikazes = null;
    window._customStalkers = null;
    window._customBossMinors = null;
    window._customBosses = null;
    window._bossMinorBursts = null;
    window._wave10MinorsSpawned = false;
    window._editorSessionActive = false;
    window._timelineWaveState = null;
    window._timelineCompletedWaves = {};
    gameOver = false;
    showStats = false;
    paused = false;
    gameStarted = false;
    startTime = Date.now();
    window._playerUsedContinue = false;
  }

  function updateEnemies(delta) {
                        for (let e of enemies) {
                          if (typeof e.shieldPersistTimer !== "number") e.shieldPersistTimer = 0;
                          if (e.shieldedBy && e.shieldedBy.type === "shielder" && e.shieldedBy.health <= 0) {
                            e.shieldPersistTimer = 0;
                          }
                          if (e.shieldPersistTimer > 0) {
                            e.shieldPersistTimer -= delta * SPEED_MULTIPLIER;
                            if (e.shieldPersistTimer <= 0) {
                              e.shieldPersistTimer = 0;
                              e.shielded = false;
                              e.shieldReduction = 0;
                              e.shieldedBy = null;
                            } else {
                              e.shielded = true;
                            }
                          } else {
                            e.shielded = false;
                            e.shieldReduction = 0;
                            e.shieldedBy = null;
                          }
                          if (Array.isArray(e.activeShieldTargets)) e.activeShieldTargets.length = 0;
                        }
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
                                spawnParticle(
                                  e.x + Math.cos(partAngle) * partRadius,
                                  e.y + Math.sin(partAngle) * partRadius,
                                  Math.cos(partAngle) * partSpeed * (flare ? 1.8 : 1),
                                  Math.sin(partAngle) * partSpeed * (flare ? 1.8 : 1),
                                  life,
                                  color,
                                  decay,
                                  size,
                                  "novaFlare"
                                );
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
                                const spawnedEnemy = spawnEnemy();
                                spawnedEnemy.x = x;
                                spawnedEnemy.y = y;
                                spawnedEnemy.radius = radius;
                                spawnedEnemy.collisionRadius = collisionRadius;
                                spawnedEnemy.speed = speed;
                                spawnedEnemy.health = health;
                                spawnedEnemy.damage = damage;
                                spawnedEnemy.attackCooldown = 0;
                                spawnedEnemy.attackRange = attackRange;
                                spawnedEnemy.color = color;
                                spawnedEnemy.type = "grunt";
                                spawnedEnemy.spinAngle = spinAngle;
                                spawnedEnemy.spinSpeed = spinSpeed;
                                spawnedEnemy.noBossCollision = 120;
                                spawnedEnemy.vx = Math.cos(angle) * novaSpeed;
                                spawnedEnemy.vy = Math.sin(angle) * novaSpeed;
                                spawnedEnemy.novaTimer = 18;
                                spawnedEnemy.noXP = true;
                                spawnedEnemy.noLoot = true;
                                applyWaveEnemyModifiers(spawnedEnemy);
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
                                    spawnProjectile(
                                      e.x,
                                      e.y,
                                      Math.cos(angle) * speed,
                                      Math.sin(angle) * speed,
                                      2,
                                      e.projectileRadius,
                                      "#ffb347", // Slinger projectile color
                                      "slingerProjectile" // Slinger projectile type
                                    );
                                    // Play laser sound for enemy projectile
                                    playSound('laser.wav', (window.sentinelVolume && window.sentinelVolume.enemyProjectile) || 1.0);
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

                          if (e.type === "bruteBoss" && e.health > 0) {
                            if (typeof e.fireballCooldown !== "number") e.fireballCooldown = 80;
                            if (typeof e.fireballInterval !== "number") e.fireballInterval = 280;
                            if (typeof e.fireballRadius !== "number") e.fireballRadius = 15;
                            if (typeof e.fireballLifetime !== "number") e.fireballLifetime = 300;
                            if (typeof e.fireballBurnRadius !== "number") e.fireballBurnRadius = 88;
                            if (typeof e.fireballBurnDuration !== "number") e.fireballBurnDuration = 420;
                            if (typeof e.fireballBurnTickInterval !== "number") e.fireballBurnTickInterval = 32;
                            if (typeof e.fireballBurnDamage !== "number") e.fireballBurnDamage = 1;

                            const maxHealth = Math.max(1, typeof e.maxHealth === "number" ? e.maxHealth : e.health);
                            const missingHealthRatio = Math.max(0, Math.min(1, 1 - (e.health / maxHealth)));
                            const phaseProgress = Math.max(0, Math.min(1, missingHealthRatio / 0.68));
                            e.bruteBossPhaseProgress = phaseProgress;
                            const healthRatio = 1 - missingHealthRatio;
                            const stage = healthRatio <= 0.33 ? 3 : healthRatio <= 0.67 ? 2 : 1;
                            if (typeof e.bruteBossStage !== "number") {
                              e.bruteBossStage = stage;
                              e.bruteBossAttackPhase = 1;
                              e.bruteBossAttackPhaseTimer = 0;
                              e.bruteBossPhase1NovaCount = 0;
                              e.bruteBossKamikazeCooldown = BRUTE_BOSS_KAMIKAZE_INTERVALS[stage];
                              e.bruteBossInfernoAngles = [];
                              e.bruteBossInfernoDamageTimer = 0;
                            }
                            if (stage !== e.bruteBossStage) {
                              setBruteBossAttackPhase(e, stage, 1);
                              triggerBossPhaseEffect(e, stage);
                              continue;
                            }
                            if (e._bossPhaseStunTimer > 0) continue;
                            if (e.bruteBossAttackPhase !== 1) {
                              e.bruteBossAttackPhaseTimer -= delta * SPEED_MULTIPLIER;
                              if (e.bruteBossAttackPhaseTimer <= 0) {
                                const nextAttackPhase = (e.bruteBossAttackPhase % 3) + 1;
                                setBruteBossAttackPhase(e, stage, nextAttackPhase);
                              }
                            }

                            if (e.bruteBossAttackPhase === 1) {
                              const volleyShots = stage + 1;
                              if (e.fireballCooldown <= 0) {
                                for (let shotIndex = 0; shotIndex < volleyShots; shotIndex++) {
                                  const shotAngle = Math.random() * Math.PI * 2;
                                  const projectileSpeed = 1.12;
                                  const fireball = spawnProjectile(
                                    e.x,
                                    e.y,
                                    Math.cos(shotAngle) * projectileSpeed,
                                    Math.sin(shotAngle) * projectileSpeed,
                                    e.damage,
                                    e.fireballRadius,
                                    "#ff6a00",
                                    "bruteBossFireball"
                                  );
                                  fireball.lifeTimer = e.fireballLifetime;
                                  fireball.burnRadius = e.fireballBurnRadius;
                                  fireball.burnDuration = e.fireballBurnDuration;
                                  fireball.burnTickInterval = e.fireballBurnTickInterval;
                                  fireball.burnDamage = e.fireballBurnDamage;
                                  fireball.particleCooldown = Math.floor(Math.random() * 3);
                                }
                                const acceleratedInterval = Math.max(170, e.fireballInterval - Math.floor(phaseProgress * 90));
                                e.fireballCooldown = acceleratedInterval;
                              } else {
                                e.fireballCooldown -= delta * SPEED_MULTIPLIER;
                              }
                            } else if (e.bruteBossAttackPhase === 2) {
                              const spawnInterval = BRUTE_BOSS_KAMIKAZE_INTERVALS[stage];
                              e.bruteBossKamikazeCooldown -= delta * SPEED_MULTIPLIER;
                              while (e.bruteBossKamikazeCooldown <= 0) {
                                window.SentinelWaveControl.spawnBruteBossKamikaze(
                                  getWaveControlContext(),
                                  e.x,
                                  e.y,
                                  Math.atan2(player.y - e.y, player.x - e.x)
                                );
                                e.bruteBossKamikazeCooldown += spawnInterval;
                              }
                            } else if (e.bruteBossAttackPhase === 3) {
                              const step = delta * SPEED_MULTIPLIER;
                              const fullRange = Math.hypot(canvas.width, canvas.height);
                              if (e.bruteBossInfernoRange < fullRange) {
                                e.bruteBossInfernoRange = Math.min(
                                  fullRange,
                                  e.bruteBossInfernoRange + (fullRange * step) / BRUTE_BOSS_INFERNO_EXPANSION_DURATION
                                );
                              }
                              if (e.bruteBossInfernoRange >= fullRange * BRUTE_BOSS_INFERNO_SPIN_START_RATIO) {
                                e.bruteBossInfernoBaseAngle +=
                                  e.bruteBossInfernoRotationDirection * BRUTE_BOSS_INFERNO_SPIN_RATE * (step / 60);
                                e.bruteBossInfernoAngles = Array.from(
                                  { length: stage },
                                  (_, index) => e.bruteBossInfernoBaseAngle + (Math.PI * 2 * index) / stage
                                );
                              }
                              emitBruteBossInfernoParticles(e, step);
                            }
                          }
                        }
                // Brute nova and boss aura particles
                for (let e of enemies) {
                  if (e.type === "brute" || e.type === "bruteBoss" || e.type === "stalkerBoss") {
                    if (e.type === "bruteBoss" && e._bossPhaseStunTimer > 0) continue;
                    if (e.type === "bruteBoss" && e.bruteBossAttackPhase === 2) continue;
                    if (
                      e.type === "stalkerBoss" &&
                      (e.stalkerBossPhase3Hidden ||
                        (e.stalkerBossIllusion && !e.stalkerBossPhase3RevealComplete) ||
                        (e.stalkerBossIllusionPhaseActive && !e.stalkerBossPhase3RevealComplete))
                    ) continue;
                    if (typeof e.fxCooldown !== "number") e.fxCooldown = Math.floor(Math.random() * 3);
                    if (e.fxCooldown > 0) {
                      e.fxCooldown--;
                      continue;
                    }
                    const isActiveNova = e.novaState === "growing" || e.novaState === "shrinking";
                    const isBossParticleAura = e.type === "bruteBoss" || e.type === "stalkerBoss";
                    if (!isActiveNova && !isBossParticleAura) continue;
                    e.fxCooldown = isBossParticleAura ? 2 : 3;
                    let particleCount = isActiveNova ? 1 : 0;
                    if (isBossParticleAura) {
                      particleCount = isActiveNova ? 6 : 2;
                    }
                    for (let p = 0; p < particleCount; p++) {
                      const angle = Math.random() * Math.PI * 2;
                      const minRingRadius = e.radius + 8;
                      const maxRingRadius = Math.max(minRingRadius + 1, (e.novaRadius || (e.radius + 24)) - 6);
                      const isBossAuraParticle = isBossParticleAura;
                      const radius = isBossAuraParticle
                        ? (Math.random() * (maxRingRadius - minRingRadius) + minRingRadius)
                        : (isActiveNova
                          ? (Math.random() * (maxRingRadius - minRingRadius) + minRingRadius)
                          : (maxRingRadius - Math.random() * 10));
                      const flare = radius > e.novaRadius - 12;
                      // Different behavior for growing vs shrinking
                      let speed, color, size, life, decay;
                      if (e.novaState === "growing") {
                        speed = 2.6 + Math.random() * 1.5;
                        color = flare ? "#ffae00" : ["#ff6600","#ffaa00","#ff3300"][Math.floor(Math.random()*3)];
                        size = flare ? 9 + Math.random() * 4 : 5 + Math.random() * 3;
                        life = flare ? 20 + Math.random() * 10 : 15 + Math.random() * 8;
                        decay = flare ? 0.91 : 0.95;
                      } else if (e.novaState === "shrinking") {
                        speed = 1 + Math.random() * 1;
                        color = flare ? "#ff3300" : ["#ff6600","#ffaa00","#ffbb33"][Math.floor(Math.random()*3)];
                        size = flare ? 6 + Math.random() * 3 : 3 + Math.random() * 3;
                        life = flare ? 14 + Math.random() * 8 : 10 + Math.random() * 6;
                        decay = flare ? 0.97 : 0.98;
                      } else if (isBossParticleAura) {
                        speed = 0.35 + Math.random() * 0.65;
                        color = e.type === "bruteBoss"
                          ? ["#ff6a00", "#ff9c33", "#ff4000", "#ffd07a"][Math.floor(Math.random() * 4)]
                          : ["#66e8ff", "#b7f6ff", "#4a8aaa", "#d9fbff"][Math.floor(Math.random() * 4)];
                        size = 2.6 + Math.random() * 2.6;
                        life = 12 + Math.random() * 11;
                        decay = 0.95 + Math.random() * 0.02;
                      } else {
                        continue;
                      }
                      spawnParticle(
                        e.x + Math.cos(angle) * radius,
                        e.y + Math.sin(angle) * radius,
                        Math.cos(angle) * speed * (flare ? 1.8 : 1),
                        Math.sin(angle) * speed * (flare ? 1.8 : 1),
                        life,
                        color,
                        decay,
                        size,
                        "novaFlare"
                      );
                    }
                  }
                }
            // Brute nova visual and collision
            for (let e of enemies) {
              if (e.type === "brute" || e.type === "bruteBoss") {
                if (e.type === "bruteBoss" && e._bossPhaseStunTimer > 0) continue;
                // Nova animation states
                const minRadius = typeof e.novaMinRadius === "number" ? e.novaMinRadius : (e.radius + 20); // slightly bigger than brute
                let maxRadius = e.radius * (typeof e.novaMaxMultiplier === "number" ? e.novaMaxMultiplier : 3.2);
                let novaGrowthSpeed = typeof e.novaGrowthSpeed === "number" ? e.novaGrowthSpeed : 2.2;
                const novaShrinkSpeed = typeof e.novaShrinkSpeed === "number" ? e.novaShrinkSpeed : 2.2;
                if (e.type === "bruteBoss") {
                  const phaseProgress = Math.max(0, Math.min(1, typeof e.bruteBossPhaseProgress === "number" ? e.bruteBossPhaseProgress : 0));
                  maxRadius *= (1 + (phaseProgress * 0.18));
                  novaGrowthSpeed *= (1 + (phaseProgress * 0.25));
                }
                if (typeof e.novaRadius === "undefined") e.novaRadius = minRadius;
                if (typeof e.novaState === "undefined") e.novaState = "growing";
                if (typeof e.novaCooldown === "undefined") e.novaCooldown = 0;

                // Animate nova
                    if (e.novaState === "growing") {
                      e.novaRadius += novaGrowthSpeed;
                      if (e.novaRadius >= maxRadius) {
                        e.novaRadius = maxRadius;
                        e.novaState = "maxPause";
                        e.novaCooldown = 120; // 2 sec pause at max
                      }
                    } else if (e.novaState === "maxPause") {
                      e.novaCue = false;
                      if (e.type !== "bruteBoss" || !e.novaHoldAtMax) {
                        e.novaCooldown--;
                        if (e.novaCooldown <= 0) {
                          e.novaState = "shrinking";
                        }
                      }
                    } else if (e.novaState === "shrinking") {
                      e.novaRadius -= novaShrinkSpeed;
                      if (e.novaRadius <= minRadius) {
                        e.novaRadius = minRadius;
                        e.novaState = "minPause";
                        e.novaCooldown = 240; // 4 sec pause at min
                        if (e.type === "bruteBoss" && e.bruteBossAttackPhase === 1) {
                          e.bruteBossPhase1NovaCount = (e.bruteBossPhase1NovaCount || 0) + 1;
                          if (e.bruteBossPhase1NovaCount >= 3) {
                            setBruteBossAttackPhase(e, e.bruteBossStage, 2);
                          }
                        }
                      }
                    } else if (e.novaState === "minPause") {
                      e.novaCooldown--;
                      // Visual cue: pulse color as nova is about to attack (growing)
                      e.novaCue = e.novaCooldown < 60 && e.novaCooldown % 8 < 4;
                      if (e.novaCooldown === 120) {
                        playSoundFresh('djartmusic-short-fire-whoosh_1-317280.mp3', (window.sentinelVolume && window.sentinelVolume.bruteNova) || 0.7);
                      }
                      if (e.novaCooldown <= 0) {
                        e.novaState = "growing";
                        e.novaCue = false;
                      }
                    }

                // Nova damage: tick on entry, then every 60 frames (1s)
                const dist = Math.hypot(player.x - e.x, player.y - e.y);
                if (typeof e.novaPlayerInside === 'undefined') e.novaPlayerInside = false;
                if (typeof e.novaPlayerTick === 'undefined') e.novaPlayerTick = 0;
                const novaAttackActive = e.type !== "bruteBoss" || e.bruteBossAttackPhase === 1;
                if (novaAttackActive && dist < e.novaRadius + player.radius) {
                    const novaDamage = typeof e.novaDamage === "number" ? e.novaDamage : 1;
                    if (!e.novaPlayerInside || e.novaPlayerTick <= 0) {
                      if (!window.godMode) { player.health -= novaDamage; runHealthLost += novaDamage; playPlayerHitSound(); } // Nova damage per tick
                      e.novaPlayerTick = 60; // 1 second cooldown
                    }
                  e.novaPlayerInside = true;
                } else {
                  e.novaPlayerInside = false;
                  e.novaPlayerTick = 0;
                }
                if (e.novaPlayerTick > 0) e.novaPlayerTick -= delta * SPEED_MULTIPLIER;;

                if (e.type === "bruteBoss" && e.bruteBossAttackPhase === 3) {
                  const dx = player.x - e.x;
                  const dy = player.y - e.y;
                  const playerAngle = Math.atan2(dy, dx);
                  const coneRange = e.bruteBossInfernoRange || 0;
                  const insideCone = dist <= coneRange + player.radius &&
                    (e.bruteBossInfernoAngles || []).some(coneAngle => {
                      const angleDifference = Math.atan2(
                        Math.sin(playerAngle - coneAngle),
                        Math.cos(playerAngle - coneAngle)
                      );
                      return Math.abs(angleDifference) <= Math.PI / 7;
                    });
                  if (insideCone) {
                    if (e.bruteBossInfernoDamageTimer <= 0) {
                      const coneDamage = typeof e.novaDamage === "number" ? e.novaDamage : 1;
                      if (!window.godMode) {
                        player.health -= coneDamage;
                        runHealthLost += coneDamage;
                        playPlayerHitSound();
                      }
                      e.bruteBossInfernoDamageTimer = 60;
                    }
                    e.bruteBossInfernoDamageTimer = Math.max(
                      0,
                      e.bruteBossInfernoDamageTimer - delta * SPEED_MULTIPLIER
                    );
                  } else {
                    e.bruteBossInfernoDamageTimer = 0;
                  }
                }
              }
            }
            
        // Enhanced dust emission for moving enemies
      // Dust particles disabled for performance
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
        if (e.health > 0 && updateBossPhaseEffect(e, delta * SPEED_MULTIPLIER)) continue;
            if (e.health <= 0) {
            if (SCREEN_SHAKE_ENEMY_TYPES.has(e.type)) {
              screenShake = Math.max(
                screenShake,
                SCREEN_SHAKE_BOSS_TYPES.has(e.type) && !e.stalkerBossIllusion ? 16 : 9
              );
            }
            const isBossType = ["gruntBoss", "gruntBossMinor", "bruteBoss", "slingerBoss", "stalkerBoss", "beamerBoss", "brute", "shielder"].includes(e.type) && !e.stalkerBossIllusion;
            playSoundFresh(
              isBossType ? 'lumora_studios-pixel-explosion-319166.mp3' : 'freesound_community-8-bit-explosion-95847.mp3',
              (window.sentinelVolume && window.sentinelVolume.enemyDeath) || 0.5
            );
            // Create colored particles on enemy death with different tones
            if (e.type === "gruntBoss") {
              // Boss death nova: emit a ring of magenta particles
              const novaCount = 36;
              const novaRadius = e.radius + 32;
              for (let j = 0; j < novaCount; j++) {
                const angle = (Math.PI * 2 * j) / novaCount;
                const speed = 3.2 + Math.random() * 1.8;
                const color = ["#b800e0", "#d900ff", "#ff33ff", "#910091"][Math.floor(Math.random()*4)];
                const size = 7 + Math.random() * 3;
                const life = 32 + Math.random() * 24;
                const decay = 0.92 + Math.random() * 0.04;
                spawnParticle(
                  e.x + Math.cos(angle) * novaRadius,
                  e.y + Math.sin(angle) * novaRadius,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  life,
                  color,
                  decay,
                  size,
                  "enemyDeath"
                );
              }
              // Don't drop XP if wave end condition is "boss"
              const isBossWaveEndCondition1 = window._timelineWaveState && window._timelineWaveState.endCondition === 'boss';
              // Preserve the Grunt Boss's additional reward set.
              if (!(e.noLoot || e.noXP) && !isBossWaveEndCondition1) {
                tryDiscoverProtocolFromEnemy(e.type, e.x, e.y, { forceDrop: true, rarity: "Rare" });
                for (let dropIndex = 0; dropIndex < 2; dropIndex++) {
                  const spread = 16;
                  tryDiscoverProtocolFromEnemy(e.type, e.x + (Math.random() * spread - spread / 2), e.y + (Math.random() * spread - spread / 2), {
                    forceDrop: true,
                    rarity: "Common"
                  });
                }
                for (let xpIndex = 0; xpIndex < 25; xpIndex++) {
                  const xpAngle = Math.random() * Math.PI * 2;
                  const xpDist = 14 + Math.random() * 34;
                  xpDrops.push({
                    x: e.x + Math.cos(xpAngle) * xpDist,
                    y: e.y + Math.sin(xpAngle) * xpDist
                  });
                }
              }
              // Boss-gated waves use direct completion; other waves use standard burst progression
              if (wave === 5) {
                unlockWave(5);
                wave++;
                runWavesCleared++;
                if (!triggerVictoryIfFinalWaveCleared()) {
                  try {
                    let warnAudio = new Audio('warning.wav');
                    warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 0.5;
                    warnAudio.playbackRate = 0.7;
                    warnAudio.play();
                  } catch (e) {}
                  spawnWave();
                }
              }
            } else if (e.type === "gruntBossMinor") {
              // Grunt boss minor is not a true boss; keep its special death visuals + small XP payout
              const novaCount = 36;
              const novaRadius = e.radius + 22;
              for (let j = 0; j < novaCount; j++) {
                const angle = (Math.PI * 2 * j) / novaCount;
                const speed = 3.2 + Math.random() * 1.8;
                const color = ["#b800e0", "#d900ff", "#ff33ff", "#910091"][Math.floor(Math.random()*4)];
                const size = 7 + Math.random() * 3;
                const life = 32 + Math.random() * 24;
                const decay = 0.92 + Math.random() * 0.04;
                spawnParticle(
                  e.x + Math.cos(angle) * novaRadius,
                  e.y + Math.sin(angle) * novaRadius,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  life,
                  color,
                  decay,
                  size,
                  "enemyDeath"
                );
              }
              // Scatter 5 xpDrops around gruntBossMinor's location
              const isBossWaveEndCondition1 = window._timelineWaveState && window._timelineWaveState.endCondition === 'boss';
              if (!isBossWaveEndCondition1) {
                for (let k = 0; k < 5; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = 18 + Math.random() * 22;
                  xpDrops.push({
                    x: e.x + Math.cos(angle) * dist,
                    y: e.y + Math.sin(angle) * dist
                  });
                }
              }
            } else if (e.type === "brute" || e.type === "bruteBoss" || e.type === "slingerBoss") {
              // Brute death burst: mimic nova 'growing' burst
              const burstCount = e.type === "bruteBoss" ? 24 : 12;
              if (e.type === "slingerBoss" && mines.length > 0) {
                playSoundFresh('u_b32baquv5u-explosion-9-340460.mp3', (window.sentinelVolume && window.sentinelVolume.mineExplosion) || 0.8);
                for (let mi = mines.length - 1; mi >= 0; mi--) {
                  if (mines[mi].contactOnly) {
                    detonateMine(mines[mi], false);
                    mines.splice(mi, 1);
                  }
                }
              }
              for (let j = 0; j < burstCount; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2.2 + Math.random() * 1.2;
                const flare = j < (e.type === "bruteBoss" ? 8 : 4);
                const color = flare ? "#fff200" : ["#ff6600","#ffaa00","#ff3300"][Math.floor(Math.random()*3)];
                const size = flare ? 7 + Math.random() * 3 : 4 + Math.random() * 2;
                const life = flare ? 22 + Math.random() * 12 : 16 + Math.random() * 8;
                const decay = flare ? 0.91 : 0.95;
                spawnParticle(
                  e.x,
                  e.y,
                  Math.cos(angle) * speed * (flare ? 1.8 : 1),
                  Math.sin(angle) * speed * (flare ? 1.8 : 1),
                  life,
                  color,
                  decay,
                  size,
                  "enemyDeath"
                );
              }
              if (e.type === "bruteBoss" && wave === 25) {
                unlockWave(25);
                wave++;
                runWavesCleared++;
                if (!triggerVictoryIfFinalWaveCleared()) {
                  try {
                    let warnAudio = new Audio('warning.wav');
                    warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 0.5;
                    warnAudio.playbackRate = 0.7;
                    warnAudio.play();
                  } catch (e) {}
                  spawnWave();
                }
              }
            } else if (e.type === "stalker") {
              const stalkerPalette = ["#57e7ff", "#7fdfff", "#a7f3ff", "#3ec6ff"];
              for (let j = 0; j < 16; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 1.4;
                const color = stalkerPalette[Math.floor(Math.random() * stalkerPalette.length)];
                spawnParticle(
                  e.x,
                  e.y,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  45 + Math.floor(Math.random() * 90),
                  color,
                  0.9 + Math.random() * 0.06,
                  2 + Math.random() * 2,
                  "enemyDeath"
                );
              }
            } else if (e.type === "stalkerBoss" && e.stalkerBossIllusion) {
              const illusionPalette = ["#66e8ff", "#57e7ff", "#a7f3ff"];
              for (let j = 0; j < 12; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.8 + Math.random() * 1.4;
                spawnParticle(
                  e.x,
                  e.y,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  24 + Math.random() * 18,
                  illusionPalette[Math.floor(Math.random() * illusionPalette.length)],
                  0.9 + Math.random() * 0.05,
                  2 + Math.random() * 2,
                  "enemyDeath"
                );
              }
            } else if (e.type === "stalkerBoss") {
              // Stalker boss death nova: emit cyan particles
              for (let cloneIndex = 0; cloneIndex < enemies.length; cloneIndex++) {
                const illusion = enemies[cloneIndex];
                if (
                  illusion !== e &&
                  illusion.stalkerBossIllusion &&
                  illusion.stalkerBossIllusionOwner === e.stalkerBossIllusionGroupId
                ) {
                  illusion.health = 0;
                }
              }
              const novaCount = 48;
              const novaRadius = e.radius + 40;
              const stalkerBossPalette = ["#66e8ff", "#57e7ff", "#7fdfff", "#a7f3ff"];
              for (let j = 0; j < novaCount; j++) {
                const angle = (Math.PI * 2 * j) / novaCount;
                const speed = 3.5 + Math.random() * 2;
                const color = stalkerBossPalette[Math.floor(Math.random() * stalkerBossPalette.length)];
                const size = 8 + Math.random() * 4;
                const life = 36 + Math.random() * 28;
                const decay = 0.90 + Math.random() * 0.05;
                spawnParticle(
                  e.x + Math.cos(angle) * novaRadius,
                  e.y + Math.sin(angle) * novaRadius,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  life,
                  color,
                  decay,
                  size,
                  "enemyDeath"
                );
              }
              // Wave 35 boss gate
              if (wave === 35) {
                unlockWave(35);
                wave++;
                runWavesCleared++;
                if (!triggerVictoryIfFinalWaveCleared()) {
                  try {
                    let warnAudio = new Audio('warning.wav');
                    warnAudio.volume = window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 0.5;
                    warnAudio.playbackRate = 0.7;
                    warnAudio.play();
                  } catch (e) {}
                  spawnWave();
                }
              }
            } else if (e.type === "beamerBoss") {
              const deathPalette = ["#00bfff", "#69eaff", "#d4f7ff", "#ffffff"];
              const beamCount = Math.max(2, e.beamerBossSpinBeamCount || 8);
              const beamAngle = typeof e.beamerBossSpinAngle === "number" ? e.beamerBossSpinAngle : 0;
              if (e.beamerBossBeamAudio) {
                e.beamerBossBeamAudio.pause();
                e.beamerBossBeamAudio.currentTime = 0;
                e.beamerBossBeamAudio = null;
              }
              spawnPlayerDeathSmoke(e.x, e.y, 8);
              spawnPlayerDeathBurst(e.x, e.y, "enemyDeath");
              for (let beamIndex = 0; beamIndex < beamCount; beamIndex++) {
                const angle = beamAngle + (Math.PI * 2 * beamIndex) / beamCount;
                for (let segment = 0; segment < 8; segment++) {
                  const distance = e.radius + segment * 7;
                  const speed = 2.5 + Math.random() * 2;
                  const color = deathPalette[Math.floor(Math.random() * deathPalette.length)];
                  spawnParticle(
                    e.x + Math.cos(angle) * distance,
                    e.y + Math.sin(angle) * distance,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    36 + Math.random() * 24,
                    color,
                    0.9 + Math.random() * 0.05,
                    3 + Math.random() * 3,
                    "enemyDeath"
                  );
                }
              }
            } else if (e.type === "shielder") {
              // Shielder death nova — expanding cyan/teal ring + scatter burst, similar to player game start
              const shielderPalette = ["#78ffd6", "#4be6c3", "#d7fff2", "#00ffdd", "#aaf6ff", "#ffffff"];
              const novaCount = 40;
              const novaRadius = e.radius + 18;
              // Evenly-spaced outer ring
              for (let j = 0; j < novaCount; j++) {
                const angle = (Math.PI * 2 * j) / novaCount;
                const speed = 2.8 + Math.random() * 2.2;
                const color = shielderPalette[Math.floor(Math.random() * shielderPalette.length)];
                const size = 5 + Math.random() * 4;
                const life = 30 + Math.random() * 28;
                const decay = 0.91 + Math.random() * 0.05;
                spawnParticle(
                  e.x + Math.cos(angle) * novaRadius,
                  e.y + Math.sin(angle) * novaRadius,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  life, color, decay, size, "novaFlare"
                );
              }
              // Inner scattered burst (converge-then-scatter feel)
              for (let j = 0; j < 28; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.2 + Math.random() * 3.5;
                const color = shielderPalette[Math.floor(Math.random() * shielderPalette.length)];
                const size = 2.5 + Math.random() * 5;
                const life = 22 + Math.random() * 40;
                spawnParticle(
                  e.x, e.y,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  life, color, 0.93 + Math.random() * 0.04, size, "enemyDeath"
                );
              }
            } else {
              let palette;
              if (e.type === "grunt") {
                palette = ["#FF00FF", "#910091", "#d900ff", "#c800b0", "#b800e0"];
              } else if (e.type === "slinger" || e.type === "slingerBoss") {
                palette = ["#FFA500", "#ffb84d", "#ff9900", "#ffcc80", "#8b5b00"];
              } else {
                palette = [e.color];
              }
              const particleCount = e.type === "kamikaze" ? KAMIKAZE_DEATH_PARTICLE_COUNT : 18;
              const lifeBase = e.type === "kamikaze" ? 24 : 60;
              const lifeRange = e.type === "kamikaze" ? 70 : 240;
              for (let j = 0; j < particleCount; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = e.type === "kamikaze" ? (1.7 + Math.random() * 1.1) : (2.5 + Math.random() * 1.8);
                let size = 2;
                if (j < 4) size = 4;
                if (j < 2) size = 7;
                const color = palette[Math.floor(Math.random() * palette.length)];
                spawnParticle(
                  e.x,
                  e.y,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  lifeBase + Math.floor(Math.random() * lifeRange),
                  color,
                  0.88 + Math.random() * 0.04,
                  size,
                  "enemyDeath"
                );
              }
            }
            if (!(e.noLoot || e.noXP)) {
              const isBoss = ["gruntBoss", "bruteBoss", "slingerBoss", "stalkerBoss", "beamerBoss"].includes(e.type);
              if (isBoss) {
                // Every boss gets one random Rare protocol; Beamer also gets a Rare Higher.
                tryDiscoverProtocolFromEnemy(e.type, e.x, e.y, { forceDrop: true, rarity: "Rare" });
                if (e.type !== "gruntBoss") {
                  tryDiscoverProtocolFromEnemy(e.type, e.x, e.y, {
                    forceDrop: true,
                    rarity: "Rare",
                    tier: "Standard"
                  });
                }
                if (e.type === "beamerBoss") {
                  tryDiscoverProtocolFromEnemy(e.type, e.x, e.y, {
                    forceDrop: true,
                    rarity: "Rare",
                    tier: "Higher"
                  });
                }
                const commonProtocolDropCount = e.type === "gruntBoss" ? 2 : 3;
                for (let dropIndex = 0; dropIndex < commonProtocolDropCount; dropIndex++) {
                  const spread = 16;
                  tryDiscoverProtocolFromEnemy(e.type, e.x + (Math.random() * spread - spread / 2), e.y + (Math.random() * spread - spread / 2), {
                    forceDrop: true,
                    rarity: "Common"
                  });
                }
                const isBossWaveEndCondition = window._timelineWaveState && window._timelineWaveState.endCondition === "boss";
                const xpDropCount = e.type === "gruntBoss" && !isBossWaveEndCondition ? 25 : 50;
                for (let xpIndex = 0; xpIndex < xpDropCount; xpIndex++) {
                  const xpAngle = Math.random() * Math.PI * 2;
                  const xpDist = 14 + Math.random() * 34;
                  xpDrops.push({
                    x: e.x + Math.cos(xpAngle) * xpDist,
                    y: e.y + Math.sin(xpAngle) * xpDist
                  });
                }
              } else {
                tryDiscoverProtocolFromEnemy(e.type, e.x, e.y);
              }
            }
            releaseEnemyAt(i);
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
        if (e.type === "stalker") {
          if (typeof e.blinkCooldown !== "number") e.blinkCooldown = 0;
          if (typeof e.blinkCastTimer !== "number") e.blinkCastTimer = 0;
          if (typeof e.blinkCastDuration !== "number") e.blinkCastDuration = 1;
          if (typeof e.blinkRecoverTimer !== "number") e.blinkRecoverTimer = 0;
          if (typeof e.blinkRecoverDuration !== "number") e.blinkRecoverDuration = 1;
          if (typeof e.burstsLeft !== "number") e.burstsLeft = 0;
          if (typeof e.burstTimer !== "number") e.burstTimer = 0;
          if (typeof e.burstShotsLeft !== "number") e.burstShotsLeft = 0;
          if (typeof e.pendingBursts !== "number") e.pendingBursts = 0;
          if (typeof e.stalkerBurstInterval !== "number") e.stalkerBurstInterval = 120;
          if (typeof e.stalkerBurstCooldown !== "number") e.stalkerBurstCooldown = 18 + Math.floor(Math.random() * 22);
          if (typeof e.castFxCooldown !== "number") e.castFxCooldown = 0;
          if (typeof e.stalkerAlpha !== "number") e.stalkerAlpha = 0.9;
          if (typeof e.stalkerRoutineActive !== "boolean") e.stalkerRoutineActive = false;
          if (typeof e.stalkerInitialBurstDone !== "boolean") e.stalkerInitialBurstDone = false;
          if (typeof e.stalkerPreferredDistance !== "number") e.stalkerPreferredDistance = 180 + Math.random() * 120;
          const legacyPadding = typeof e.stalkerEdgePadding === "number" ? e.stalkerEdgePadding : 120;
          if (typeof e.stalkerEdgePaddingX !== "number") e.stalkerEdgePaddingX = legacyPadding;
          if (typeof e.stalkerEdgePaddingY !== "number") e.stalkerEdgePaddingY = Math.max(legacyPadding, 170);

          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const minCenterDist = e.stalkerPreferredDistance;
          const edgePaddingX = Math.max(e.radius + 4, e.stalkerEdgePaddingX);
          const edgePaddingY = Math.max(e.radius + 4, e.stalkerEdgePaddingY);

          const isStalkerInRange = dist < (e.attackRange || 320) + player.radius;
          // Always update hasEnteredPaddedArea for stalkers as they move
          if (!e.hasEnteredPaddedArea) {
            if (
              e.x >= edgePaddingX && e.x <= canvas.width - edgePaddingX &&
              e.y >= edgePaddingY && e.y <= canvas.height - edgePaddingY
            ) {
              e.hasEnteredPaddedArea = true;
            }
          }
          if (!e.stalkerRoutineActive) {
            // Allow stalkers to shoot as soon as in range, even before entering the padded area
            if (isStalkerInRange && !e.stalkerInitialBurstDone) {
              const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
              const spread = 0.12;
              const shotSpeed = 2.25;
              for (let s = -1; s <= 1; s++) {
                const shotAngle = angleToPlayer + (s * spread);
                spawnProjectile(
                  e.x,
                  e.y,
                  Math.cos(shotAngle) * shotSpeed,
                  Math.sin(shotAngle) * shotSpeed,
                  e.damage,
                  4,
                  "#66e8ff",
                  "stalkerProjectile"
                );
              }
              e.stalkerInitialBurstDone = true;
              playSound('laser.wav', (window.sentinelVolume && window.sentinelVolume.enemyProjectile) || 1.0);
            }
            // Always force stalkers to walk into the padded area before stopping
            if (!e.hasEnteredPaddedArea) {
              if (dist > 0) {
                e.x += (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
                e.y += (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;
              }
              // Do NOT continue here; allow blink logic to run even before entering padded area
            } else {
              // Once in padded area, allow stalker to stop and start its routine
              e.stalkerRoutineActive = true;
              continue;
            }
          }

          if (e.blinkCastTimer > 0) {
            e.blinkCastTimer -= delta * SPEED_MULTIPLIER;
            e.castFxCooldown -= delta * SPEED_MULTIPLIER;
            if (e.castFxCooldown <= 0) {
              e.castFxCooldown = 4;
              for (let p = 0; p < 3; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.9 + Math.random() * 0.8;
                spawnParticle(
                  e.x,
                  e.y,
                  Math.cos(angle) * speed,
                  Math.sin(angle) * speed,
                  16 + Math.random() * 10,
                  "#7beeff",
                  0.93,
                  1.6 + Math.random() * 1.2,
                  "enemyHit"
                );
              }
            }

            if (e.blinkCastTimer <= 0) {
              for (let p = 0; p < 10; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.6 + Math.random() * 1.1;
                spawnParticle(e.x, e.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 24 + Math.random() * 10, "#66e8ff", 0.93, 2 + Math.random() * 1.6, "enemyHit");
              }

              const minBlinkRadius = Math.min(canvas.width, canvas.height) * 0.28;
              const maxBlinkRadius = Math.min(canvas.width, canvas.height) * 0.45;
              const minBlinkFromPlayer = (typeof player.range === "number" ? player.range : player.radius) + 70;
              let blinkTargetX = e.x;
              let blinkTargetY = e.y;
              for (let attempt = 0; attempt < 14; attempt++) {
                const blinkAngle = Math.random() * Math.PI * 2;
                const blinkRadius = minBlinkRadius + Math.random() * (maxBlinkRadius - minBlinkRadius);
                const candidateX = Math.max(edgePaddingX, Math.min(canvas.width - edgePaddingX, centerX + Math.cos(blinkAngle) * blinkRadius));
                const candidateY = Math.max(edgePaddingY, Math.min(canvas.height - edgePaddingY, centerY + Math.sin(blinkAngle) * blinkRadius));
                const candidateDistToPlayer = Math.hypot(player.x - candidateX, player.y - candidateY);
                blinkTargetX = candidateX;
                blinkTargetY = candidateY;
                if (candidateDistToPlayer >= minBlinkFromPlayer) break;
              }
              e.x = blinkTargetX;
              e.y = blinkTargetY;
              playSoundFresh('u_wzgyzo3pae-warp-306033.mp3', (window.sentinelVolume && window.sentinelVolume.stalkerWarp) || 0.6);

              for (let p = 0; p < 10; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.6 + Math.random() * 1.1;
                spawnParticle(e.x, e.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 24 + Math.random() * 10, "#66e8ff", 0.93, 2 + Math.random() * 1.6, "enemyHit");
              }

              e.pendingBursts = 1;
              e.burstShotsLeft = 0;
              // Keep blink recovery at previous (slower) value
              e.blinkRecoverDuration = 22 + Math.floor(Math.random() * 8);
              e.blinkRecoverTimer = e.blinkRecoverDuration;
              e.blinkCastTimer = 0;
            }
          } else if (e.blinkRecoverTimer > 0) {
            e.blinkRecoverTimer -= delta * SPEED_MULTIPLIER;
            if (e.blinkRecoverTimer <= 0) {
              e.burstsLeft = Math.max(e.burstsLeft, e.pendingBursts || 1);
              e.pendingBursts = 0;
              e.blinkCooldown = 240; // 4 seconds at 60 FPS
            }
          } else if (e.burstsLeft > 0) {
            if (e.burstShotsLeft <= 0) {
              const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
              const spread = 0.12;
              const shotSpeed = 2.25;
              for (let s = -1; s <= 1; s++) {
                const shotAngle = angleToPlayer + (s * spread);
                spawnProjectile(
                  e.x,
                  e.y,
                  Math.cos(shotAngle) * shotSpeed,
                  Math.sin(shotAngle) * shotSpeed,
                  e.damage,
                  4,
                  "#66e8ff",
                  "stalkerProjectile"
                );
              }
              e.burstsLeft -= 1;
              e.burstShotsLeft = 26;
              playSound('laser.wav', (window.sentinelVolume && window.sentinelVolume.enemyProjectile) || 1.0);
              if (e.burstsLeft <= 0) e.stalkerBurstCooldown = e.stalkerBurstInterval;
            } else {
              e.burstShotsLeft -= delta * SPEED_MULTIPLIER;
            }
          } else {
            if (e.stalkerBurstCooldown > 0) {
              e.stalkerBurstCooldown -= delta * SPEED_MULTIPLIER;
              if (e.stalkerBurstCooldown < 0) e.stalkerBurstCooldown = 0;
            }

            if (e.blinkCooldown > 0) {
              e.blinkCooldown -= delta * SPEED_MULTIPLIER;
              if (e.blinkCooldown < 0) e.blinkCooldown = 0;
            }
            const playerBlinkRange = (typeof player.range === "number" ? player.range : player.radius) + 50;
            const shouldBlinkAway = e.blinkCooldown <= 0 && dist <= playerBlinkRange;
            if (shouldBlinkAway) {
              // Make blink cast much faster
              e.blinkCastDuration = 7 + Math.floor(Math.random() * 4);
              e.blinkCastTimer = e.blinkCastDuration;
              e.castFxCooldown = 0;
            } else if (e.stalkerBurstCooldown <= 0) {
              e.burstsLeft = Math.max(e.burstsLeft, 1);
              e.burstShotsLeft = 0;
              e.stalkerBurstCooldown = e.stalkerBurstInterval;
            }
          }

          let targetStalkerAlpha = 0.9;
          if (e.blinkCastTimer > 0) {
            const castProgress = e.blinkCastDuration > 0
              ? Math.max(0, Math.min(1, e.blinkCastTimer / e.blinkCastDuration))
              : 0;
            targetStalkerAlpha = 0.15 + (0.75 * castProgress);
          } else if (e.blinkRecoverTimer > 0) {
            const recoverProgress = e.blinkRecoverDuration > 0
              ? Math.max(0, Math.min(1, 1 - (e.blinkRecoverTimer / e.blinkRecoverDuration)))
              : 1;
            targetStalkerAlpha = 0.2 + (0.7 * recoverProgress);
          }
          const alphaBlend = Math.min(1, 0.22 * delta * SPEED_MULTIPLIER);
          e.stalkerAlpha += (targetStalkerAlpha - e.stalkerAlpha) * alphaBlend;
          e.stalkerAlpha = Math.max(0.08, Math.min(0.95, e.stalkerAlpha));

          const centerDx = e.x - centerX;
          const centerDy = e.y - centerY;
          const centerDist = Math.hypot(centerDx, centerDy);
          if (centerDist < minCenterDist && centerDist > 0) {
            e.x += (centerDx / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
            e.y += (centerDy / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
          }
          // Only clamp after entering padded area at least once
          if (e.hasEnteredPaddedArea) {
            e.x = Math.max(edgePaddingX, Math.min(canvas.width - edgePaddingX, e.x));
            e.y = Math.max(edgePaddingY, Math.min(canvas.height - edgePaddingY, e.y));
          }
          continue;
        }
        if (e.type === "shielder") {
          if (typeof e.shielderPreferredDistance !== "number") e.shielderPreferredDistance = 170 + Math.random() * 120;
          if (typeof e.shieldRange !== "number") e.shieldRange = 230;
          if (typeof e.shieldMaxLinks !== "number") e.shieldMaxLinks = 2;
          if (typeof e.shieldReductionAmount !== "number") e.shieldReductionAmount = 0.75;
          if (typeof e.shieldPersistDuration !== "number") e.shieldPersistDuration = 180;
          if (typeof e.shielderAlpha !== "number") e.shielderAlpha = 0;
          if (!Array.isArray(e.activeShieldTargets)) e.activeShieldTargets = [];
          e.activeShieldTargets.length = 0;

          const legacyPadding = typeof e.shielderEdgePadding === "number" ? e.shielderEdgePadding : 72;
          if (typeof e.shielderEdgePaddingX !== "number") e.shielderEdgePaddingX = legacyPadding;
          if (typeof e.shielderEdgePaddingY !== "number") e.shielderEdgePaddingY = Math.max(legacyPadding, 120);

          if (typeof e.zoneLocked !== "boolean") e.zoneLocked = false;
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          
          // Constrain stop distance to stay within padded area
          const maxXDistFromCenter = centerX - e.shielderEdgePaddingX;
          const maxYDistFromCenter = centerY - e.shielderEdgePaddingY;
          const maxPaddedDistance = Math.min(maxXDistFromCenter, maxYDistFromCenter);
          
          const maxStopDistance = Math.max(250, Math.min(maxPaddedDistance, Math.min(canvas.width, canvas.height) * 0.5));
          const minStopDistance = Math.max(180, maxStopDistance * 0.68);
          if (typeof e.shielderStopDistance !== "number") {
            e.shielderStopDistance = minStopDistance + Math.random() * (maxStopDistance - minStopDistance);
          }

          if (!e.zoneLocked) {
            const centerDist = Math.hypot(e.x - centerX, e.y - centerY);
            if (centerDist <= e.shielderStopDistance) {
              e.zoneLocked = true;
            } else {
              const zoneDx = centerX - e.x;
              const zoneDy = centerY - e.y;
              const zoneDist = Math.hypot(zoneDx, zoneDy);
              if (zoneDist > 0) {
                e.x += (zoneDx / zoneDist) * e.speed * delta * SPEED_MULTIPLIER;
                e.y += (zoneDy / zoneDist) * e.speed * delta * SPEED_MULTIPLIER;
              }
            }
          }

          const alliesInRange = [];
          const _shieldMaxLinks = Math.max(0, e.shieldMaxLinks);
          const _shieldRange = e.shieldRange;
          for (let _si = 0; _si < enemies.length; _si++) {
            const _st = enemies[_si];
            if (_st === e || _st.health <= 0 || _st.type === "shielder") continue;
            const _sd = Math.hypot(_st.x - e.x, _st.y - e.y);
            if (_sd > _shieldRange) continue;
            // Insert sorted by distance (ascending), cap at shieldMaxLinks
            let inserted = false;
            for (let _si2 = 0; _si2 < alliesInRange.length; _si2++) {
              if (_sd < alliesInRange[_si2].dist) {
                alliesInRange.splice(_si2, 0, { target: _st, dist: _sd });
                inserted = true;
                break;
              }
            }
            if (!inserted && alliesInRange.length < _shieldMaxLinks) {
              alliesInRange.push({ target: _st, dist: _sd });
            }
            if (alliesInRange.length > _shieldMaxLinks) alliesInRange.length = _shieldMaxLinks;
          }

          for (const entry of alliesInRange) {
            const target = entry.target;
            const reduction = Math.max(0, Math.min(0.8, e.shieldReductionAmount));
            if (!target.shielded || reduction > (target.shieldReduction || 0)) {
              if (!target.shielded) {
                playSoundFresh('freesound_community-energy-90321.mp3', (window.sentinelVolume && window.sentinelVolume.shielderShield) || 0.6);
              }
              target.shielded = true;
              target.shieldReduction = reduction;
            }
            target.shieldPersistTimer = Math.max(target.shieldPersistTimer || 0, e.shieldPersistDuration);
            target.shieldedBy = e;
            e.activeShieldTargets.push(target);
          }

          e.shielderAlpha = Math.min(1, e.shielderAlpha + (0.035 * delta * SPEED_MULTIPLIER));
          continue;
        }
        if (e.type === "beamerBoss") {
          const step = delta * SPEED_MULTIPLIER;
          const beamAudioVolume = window.sentinelVolume && window.sentinelVolume.beamerBossBeam !== undefined
            ? window.sentinelVolume.beamerBossBeam
            : 1;
          const beamStartAudioVolume = window.sentinelVolume && window.sentinelVolume.beamerBossBeamStart !== undefined
            ? window.sentinelVolume.beamerBossBeamStart
            : 1;
          const stopBeamAudio = () => {
            if (!e.beamerBossBeamAudio) return;
            e.beamerBossBeamAudio.pause();
            e.beamerBossBeamAudio.currentTime = 0;
            e.beamerBossBeamAudio = null;
          };
          const beamLength = typeof e.beamerBossBeamLength === "number"
            ? e.beamerBossBeamLength
            : Math.hypot(canvas.width, canvas.height) + 120;
          const emitterOffset = e.radius * 1.8;
          const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
          const distanceToSegment = (x1, y1, x2, y2) => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lengthSquared = dx * dx + dy * dy;
            if (lengthSquared === 0) return Math.hypot(player.x - x1, player.y - y1);
            const t = Math.max(0, Math.min(1, ((player.x - x1) * dx + (player.y - y1) * dy) / lengthSquared));
            return Math.hypot(player.x - (x1 + dx * t), player.y - (y1 + dy * t));
          };
          const damagePlayer = amount => {
            if (!window.godMode) {
              player.health -= amount;
              runHealthLost += amount;
              playPlayerHitSound();
            }
          };
          e.beamerBossContactDamageTimer = Math.max(
            0,
            (typeof e.beamerBossContactDamageTimer === "number" ? e.beamerBossContactDamageTimer : 0) - step
          );
          const contactDistance = Math.hypot(player.x - e.x, player.y - e.y);
          if (contactDistance < e.radius + player.radius && e.beamerBossContactDamageTimer <= 0) {
            damagePlayer(e.damage);
            e.beamerBossContactDamageTimer = 60;
          }
          const randomizeNovaGapOffset = () => {
            const fullTurn = Math.PI * 2;
            const gapCount = Math.max(1, e.beamerBossNovaGapCount || 8);
            const sectorAngle = fullTurn / gapCount;
            if (!e.beamerBossNovaGapHasPrevious) {
              e.beamerBossNovaGapOffset = Math.random() * fullTurn;
              e.beamerBossNovaGapHasPrevious = true;
              return;
            }
            let candidateOffset;
            let sectorDelta;
            do {
              candidateOffset = Math.random() * fullTurn;
              sectorDelta = ((candidateOffset - e.beamerBossNovaGapOffset) % sectorAngle + sectorAngle) % sectorAngle;
              sectorDelta = Math.min(sectorDelta, sectorAngle - sectorDelta);
            } while (sectorDelta < sectorAngle * 0.3);
            e.beamerBossNovaGapOffset = candidateOffset;
          };

          const healthRatio = e.maxHealth > 0 ? e.health / e.maxHealth : 1;
          const healthPhase = healthRatio <= 0.2 ? 4 : healthRatio <= 0.33 ? 3 : healthRatio <= 0.67 ? 2 : 1;
          const spinBeamCount = healthPhase === 1 ? 2 : healthPhase === 2 ? 4 : 8;
          e.beamerBossNovaArcFraction = Math.min(0.86, 0.68 + (healthPhase - 1) * 0.06);
          const phaseSmokeCount = Math.max(0, healthPhase - 1);
          const phaseSmokeInterval = healthPhase === 2 ? 90 : healthPhase === 3 ? 60 : 30;
          const previousHealthPhase = e.beamerBossHealthPhase;
          if (typeof previousHealthPhase === "number" && healthPhase > previousHealthPhase) {
            e.beamerBossPhaseEffectStage = "smoke";
            e.beamerBossPhaseEffectTimer = 12;
            e.beamerBossPhaseEffectSmokeCount = phaseSmokeCount;
            e.beamerBossPhaseEffectX = e.x;
            e.beamerBossPhaseEffectY = e.y;
            e.beamerBossStunTimer = e.beamerBossStunDuration || 180;
            e.beamerBossContinuousSmokeTimer = phaseSmokeInterval;
            e.beamerBossPhase = "stunned";
            e.beamerBossSpinTimer = 600;
            e.beamerBossBeamTickTimer = 0;
            e.beamerBossSpinBeamReach = 0;
            e.beamerBossAimShotsRemaining = 0;
            e.beamerBossNovaBurstsRemaining = 0;
            e.beamerBossChargeTimer = 0;
            e.beamerBossNovaChargeTimer = 0;
            e.beamerBossNovaRadius = 0;
            e.beamerBossNovaPreviousRadius = 0;
            playSoundFresh("sparky_laser.wav", (window.sentinelVolume && window.sentinelVolume.laser) || 0.3);
            for (let i = 0; i < 12; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 0.8 + Math.random() * 2;
              const color = ["#8deaff", "#c9f8ff", "#ffffff"][Math.floor(Math.random() * 3)];
              spawnParticle(
                e.x,
                e.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                8 + Math.random() * 12,
                color,
                0.88,
                1.5 + Math.random() * 2,
                "enemyHit"
              );
            }
          }
          e.beamerBossHealthPhase = healthPhase;
          e.beamerBossSpinBeamCount = spinBeamCount;
          if (e.beamerBossPhase !== "spin") stopBeamAudio();
          if (e.beamerBossPhaseEffectStage === "smoke" || e.beamerBossPhaseEffectStage === "deathBurst") {
            e.beamerBossPhaseEffectTimer -= step;
            if (e.beamerBossPhaseEffectTimer <= 0) {
              if (e.beamerBossPhaseEffectStage === "smoke") {
                spawnPlayerDeathSmoke(e.beamerBossPhaseEffectX, e.beamerBossPhaseEffectY, e.beamerBossPhaseEffectSmokeCount);
                e.beamerBossPhaseEffectStage = "deathBurst";
                e.beamerBossPhaseEffectTimer = 10;
              } else {
                playSoundFresh('lumora_studios-pixel-explosion-319166.mp3', (window.sentinelVolume && window.sentinelVolume.enemyDeath) || 0.5);
                spawnPlayerDeathBurst(e.beamerBossPhaseEffectX, e.beamerBossPhaseEffectY, "enemyHit");
                e.beamerBossPhaseEffectStage = null;
                e.beamerBossPhaseEffectTimer = 0;
              }
            }
          }
          if (healthPhase >= 2) {
            e.beamerBossContinuousSmokeTimer = (typeof e.beamerBossContinuousSmokeTimer === "number"
              ? e.beamerBossContinuousSmokeTimer
              : phaseSmokeInterval) - step;
            if (e.beamerBossContinuousSmokeTimer <= 0) {
              spawnPlayerDeathSmoke(e.x, e.y, phaseSmokeCount);
              e.beamerBossContinuousSmokeTimer = phaseSmokeInterval;
            }
          } else {
            e.beamerBossContinuousSmokeTimer = 0;
          }
          if (e.beamerBossStunTimer > 0) {
            e.beamerBossStunTimer = Math.max(0, e.beamerBossStunTimer - step);
            if (e.beamerBossStunTimer > 0) {
              e.beamerBossPhase = "stunned";
              continue;
            }
            e.beamerBossSpinAngle = typeof e.beamerBossFacingAngle === "number"
              ? e.beamerBossFacingAngle
              : e.beamerBossSpinAngle;
            e.beamerBossPhase = "spinCharge";
            e.beamerBossSpinChargeTimer = e.beamerBossSpinChargeDuration || 60;
            e.beamerBossSpinTimer = 600;
            e.beamerBossBeamTickTimer = 0;
            e.beamerBossSpinBeamReach = 0;
          }
          const beginTransition = (nextPhase, duration = 36) => {
            e.beamerBossPhase = "transition";
            e.beamerBossNextPhase = nextPhase;
            e.beamerBossTransitionTimer = duration;
          };

          if (e.beamerBossEntering !== false) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const centerDx = centerX - e.x;
            const centerDy = centerY - e.y;
            const centerDistance = Math.hypot(centerDx, centerDy);
            const arrivalThreshold = Math.max(12, e.radius * 0.7);
            if (centerDistance > arrivalThreshold && centerDistance > 0) {
              const entrySpeed = typeof e.beamerBossEntrySpeed === "number" ? e.beamerBossEntrySpeed : e.speed * 2.1;
              e.x += (centerDx / centerDistance) * entrySpeed * step;
              e.y += (centerDy / centerDistance) * entrySpeed * step;
              e.beamerBossFacingAngle = Math.atan2(centerDy, centerDx);
            }
            if (centerDistance <= arrivalThreshold) {
              e.x = centerX;
              e.y = centerY;
              e.beamerBossEntering = false;
              beginTransition("spin", 48);
            }
          } else if (e.beamerBossPhase === "transition") {
            e.beamerBossTransitionTimer -= step;
            e.beamerBossFacingAngle = angleToPlayer;
            if (e.beamerBossTransitionTimer <= 0) {
              e.beamerBossPhase = e.beamerBossNextPhase;
              if (e.beamerBossPhase === "spin") {
                e.beamerBossPhase = "spinCharge";
                e.beamerBossSpinAngle = e.beamerBossFacingAngle;
                e.beamerBossSpinChargeTimer = e.beamerBossSpinChargeDuration || 60;
                e.beamerBossSpinTimer = 600;
                e.beamerBossBeamTickTimer = 0;
                e.beamerBossSpinBeamReach = 0;
              } else if (e.beamerBossPhase === "aimCharge") {
                e.beamerBossChargeDuration = 75 - (healthPhase - 1) * 15;
                e.beamerBossChargeTimer = e.beamerBossChargeDuration;
                e.beamerBossAimAngle = angleToPlayer;
                playSoundFresh("freesound_community-057967_power-charge-88127.mp3", 0.6);
              } else if (e.beamerBossPhase === "novaCharge") {
                e.beamerBossNovaChargeDuration = 150 - (healthPhase - 1) * 30;
                e.beamerBossNovaChargeTimer = e.beamerBossNovaChargeDuration;
                e.beamerBossNovaRadius = 0;
                e.beamerBossNovaPreviousRadius = 0;
                e.beamerBossNovaHitPlayer = false;
                randomizeNovaGapOffset();
                playSoundFresh(
                  'yodguard-energy-beam-blast-4-482514.mp3',
                  window.sentinelVolume && window.sentinelVolume.beamerBossNova !== undefined
                    ? window.sentinelVolume.beamerBossNova
                    : 0.3
                );
              }
            }
          } else if (e.beamerBossPhase === "spinCharge") {
            const spinSpeedMultiplier = healthPhase >= 4 ? 1.25 : 1;
            e.beamerBossSpinAngle += 0.0065 * 0.35 * spinSpeedMultiplier * step;
            e.beamerBossFacingAngle = e.beamerBossSpinAngle;
            e.beamerBossSpinChargeTimer -= step;
            if (e.beamerBossSpinChargeTimer <= 0) {
              e.beamerBossPhase = "spin";
              e.beamerBossBeamTickTimer = 0;
              e.beamerBossSpinBeamReach = 0;
              playSoundFresh("freesound_community-rikochet-v1-light-2-47347.mp3", beamStartAudioVolume);
            }
          } else if (e.beamerBossPhase === "spin") {
            if (!e.beamerBossBeamAudio || e.beamerBossBeamAudio.paused) {
              e.beamerBossBeamAudio = playSound(BEAMER_BOSS_BEAM_SOUND_FILE, beamAudioVolume, true);
            }
            e.beamerBossSpinTimer -= step;
            const spinSpeedMultiplier = healthPhase >= 4 ? 1.25 : 1;
            e.beamerBossSpinAngle += 0.0065 * spinSpeedMultiplier * step;
            e.beamerBossFacingAngle = e.beamerBossSpinAngle;

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            if (typeof e.beamerBossOrbitAngle === "number" && typeof e.beamerBossOrbitRadius === "number") {
              e.beamerBossOrbitAngle += 0.0025 * spinSpeedMultiplier * step;
              const orbitTargetX = centerX + Math.cos(e.beamerBossOrbitAngle) * e.beamerBossOrbitRadius;
              const orbitTargetY = centerY + Math.sin(e.beamerBossOrbitAngle) * e.beamerBossOrbitRadius;
              const orbitDx = orbitTargetX - e.x;
              const orbitDy = orbitTargetY - e.y;
              const orbitDistance = Math.hypot(orbitDx, orbitDy);
              const moveDistance = Math.min(orbitDistance, e.speed * step);
              if (orbitDistance > 0) {
                e.x += (orbitDx / orbitDistance) * moveDistance;
                e.y += (orbitDy / orbitDistance) * moveDistance;
              }
            }

            const beamExtendSpeed = typeof e.beamerBossSpinBeamExtendSpeed === "number"
              ? e.beamerBossSpinBeamExtendSpeed
              : beamLength / 240;
            const currentBeamReach = typeof e.beamerBossSpinBeamReach === "number" ? e.beamerBossSpinBeamReach : 0;
            e.beamerBossSpinBeamReach = Math.min(beamLength, currentBeamReach + beamExtendSpeed * step);
            const spinBeamReach = Math.max(emitterOffset, e.beamerBossSpinBeamReach);
            e.beamerBossBeamTickTimer -= step;
            if (e.beamerBossBeamTickTimer <= 0) {
              let hitBySpinBeam = false;
              for (let beamIndex = 0; beamIndex < spinBeamCount; beamIndex++) {
                const beamAngle = e.beamerBossSpinAngle + (Math.PI * 2 * beamIndex) / spinBeamCount;
                const beamX = Math.cos(beamAngle);
                const beamY = Math.sin(beamAngle);
                const startX = e.x + beamX * emitterOffset;
                const startY = e.y + beamY * emitterOffset;
                const endX = e.x + beamX * spinBeamReach;
                const endY = e.y + beamY * spinBeamReach;
                if (distanceToSegment(startX, startY, endX, endY) <= player.radius + 8) {
                  hitBySpinBeam = true;
                  break;
                }
              }
              if (hitBySpinBeam) {
                damagePlayer(e.beamerBossBeamDamage);
              }
              e.beamerBossBeamTickTimer = 10;
            }
            if (e.beamerBossSpinTimer <= 0) {
              e.beamerBossAimShotsRemaining = healthPhase;
              e.beamerBossAimShotsPerVolley = healthPhase;
              beginTransition("aimCharge");
            }
          } else if (e.beamerBossPhase === "aimCharge") {
            e.beamerBossAimAngle = angleToPlayer;
            e.beamerBossFacingAngle = e.beamerBossAimAngle;
            e.beamerBossChargeTimer -= step;
            if (e.beamerBossChargeTimer <= 0) {
              e.beamerBossPhase = "fire";
              e.beamerBossShotAngle = e.beamerBossAimAngle;
              e.beamerBossShotHead = 0;
              e.beamerBossShotTail = 0;
              e.beamerBossShotTickTimer = 0;
              playSoundFresh("freesound_community-beam-8-43831.mp3", (window.sentinelVolume && window.sentinelVolume.beamerShot) || 0.7);
            }
          } else if (e.beamerBossPhase === "fire") {
            const shotAngle = e.beamerBossShotAngle;
            e.beamerBossFacingAngle = shotAngle;
            e.beamerBossShotHead += e.beamerBossShotSpeed * step;
            e.beamerBossShotTail = Math.max(0, e.beamerBossShotHead - e.beamerBossShotSegmentLength);
            e.beamerBossShotTickTimer -= step;

            if (e.beamerBossShotTickTimer <= 0) {
              const shotX = Math.cos(shotAngle);
              const shotY = Math.sin(shotAngle);
              const shotStartDistance = emitterOffset + e.beamerBossShotTail;
              const shotEndDistance = emitterOffset + e.beamerBossShotHead;
              const shotStartX = e.x + shotX * shotStartDistance;
              const shotStartY = e.y + shotY * shotStartDistance;
              const shotEndX = e.x + shotX * shotEndDistance;
              const shotEndY = e.y + shotY * shotEndDistance;
              if (distanceToSegment(shotStartX, shotStartY, shotEndX, shotEndY) <= player.radius + 8) {
                damagePlayer(e.beamerBossShotDamage);
              }
              e.beamerBossShotTickTimer = 10;
            }

            if (e.beamerBossShotTail >= beamLength) {
              e.beamerBossAimShotsRemaining = Math.max(0, e.beamerBossAimShotsRemaining - 1);
              if (e.beamerBossAimShotsRemaining > 0) {
                beginTransition("aimCharge", 24);
              } else {
                e.beamerBossNovaBurstsPerSequence = healthPhase;
                e.beamerBossNovaBurstsRemaining = e.beamerBossNovaBurstsPerSequence;
                beginTransition("novaCharge", 36);
              }
            }
          } else if (e.beamerBossPhase === "novaCharge") {
            e.beamerBossFacingAngle = angleToPlayer;
            e.beamerBossNovaChargeTimer -= step;
            if (e.beamerBossNovaChargeTimer <= 0) {
              e.beamerBossPhase = "nova";
              e.beamerBossNovaRadius = 0;
              e.beamerBossNovaPreviousRadius = 0;
              e.beamerBossNovaHitPlayer = false;
            }
          } else if (e.beamerBossPhase === "nova") {
            const maxRadius = typeof e.beamerBossNovaMaxRadius === "number"
              ? e.beamerBossNovaMaxRadius
              : Math.hypot(canvas.width, canvas.height);
            e.beamerBossNovaPreviousRadius = e.beamerBossNovaRadius;
            e.beamerBossNovaRadius = Math.min(maxRadius, e.beamerBossNovaRadius + 8 * step);
            const playerDistance = Math.hypot(player.x - e.x, player.y - e.y);
            const gapCount = Math.max(1, e.beamerBossNovaGapCount || 8);
            const sectorAngle = (Math.PI * 2) / gapCount;
            const playerAngle = Math.atan2(player.y - e.y, player.x - e.x);
            const normalizedAngle = ((playerAngle - e.beamerBossNovaGapOffset) % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
            const withinSectorAngle = normalizedAngle % sectorAngle;
            const arcLength = sectorAngle * (e.beamerBossNovaArcFraction || 0.68);
            const gapHalfWidth = (sectorAngle - arcLength) / 2;
            const gapCenterDistance = Math.abs(withinSectorAngle - (arcLength + gapHalfWidth));
            const playerAngularRadius = playerDistance <= player.radius + 4
              ? Math.PI
              : Math.asin(Math.min(1, (player.radius + 4) / playerDistance));
            const insideNovaArc = gapCenterDistance + playerAngularRadius >= gapHalfWidth;
            if (
              !e.beamerBossNovaHitPlayer &&
              insideNovaArc &&
              playerDistance + player.radius >= e.beamerBossNovaPreviousRadius &&
              playerDistance - player.radius <= e.beamerBossNovaRadius
            ) {
              damagePlayer(e.damage * 2);
              e.beamerBossNovaHitPlayer = true;
            }
            if (e.beamerBossNovaRadius >= maxRadius) {
              e.beamerBossNovaBurstsRemaining = Math.max(0, e.beamerBossNovaBurstsRemaining - 1);
              beginTransition(e.beamerBossNovaBurstsRemaining > 0 ? "novaCharge" : "spin", e.beamerBossNovaBurstsRemaining > 0 ? 24 : 36);
            }
          }

          if (e.beamerBossEntering === false) {
            e.x = Math.max(110, Math.min(canvas.width - 110, e.x));
            e.y = Math.max(110, Math.min(canvas.height - 110, e.y));
          }
          continue;
        }

        if (e.type === "beamer") {
          if (typeof e.beamCooldown !== "number") e.beamCooldown = 110 + Math.floor(Math.random() * 70);
          if (typeof e.beamCastTimer !== "number") e.beamCastTimer = 0;
          if (typeof e.beamCastDuration !== "number") e.beamCastDuration = 0;
          if (typeof e.beamActiveTimer !== "number") e.beamActiveTimer = 0;
          if (typeof e.beamDuration !== "number") e.beamDuration = 0;
          if (typeof e.beamAngle !== "number") e.beamAngle = Math.atan2(player.y - e.y, player.x - e.x);
          if (typeof e.beamLength !== "number") e.beamLength = 460;
          if (typeof e.beamTravelHead !== "number") e.beamTravelHead = 0;
          if (typeof e.beamTravelTail !== "number") e.beamTravelTail = 0;
          if (typeof e.beamTravelSpeed !== "number") e.beamTravelSpeed = 0;
          if (typeof e.beamSegmentLength !== "number") e.beamSegmentLength = Math.max(120, e.beamLength * 0.32);
          if (typeof e.beamTickTimer !== "number") e.beamTickTimer = 0;
          if (typeof e.beamGlow !== "number") e.beamGlow = 0;
          if (typeof e.beamerAlpha !== "number") e.beamerAlpha = 0;
          if (typeof e.beamerFacingAngle !== "number") e.beamerFacingAngle = Math.atan2(player.y - e.y, player.x - e.x);
          if (typeof e.beamerPreferredDistance !== "number") e.beamerPreferredDistance = 190 + Math.random() * 140;
          const legacyPadding = typeof e.beamerEdgePadding === "number" ? e.beamerEdgePadding : 72;
          if (typeof e.beamerEdgePaddingX !== "number") e.beamerEdgePaddingX = legacyPadding;
          if (typeof e.beamerEdgePaddingY !== "number") e.beamerEdgePaddingY = Math.max(legacyPadding, 84);

          const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
          if (e.beamCastTimer <= 0 && e.beamActiveTimer <= 0) {
            e.beamAngle = angleToPlayer;
          }

          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const minCenterDist = e.beamerPreferredDistance;
          const edgePaddingX = Math.max(e.radius + 4, e.beamerEdgePaddingX);
          const edgePaddingY = Math.max(e.radius + 4, e.beamerEdgePaddingY);

          if (e.beamCastTimer > 0) {
            e.beamCastTimer -= delta * SPEED_MULTIPLIER;
            if (e.beamCastTimer <= 0) {
              e.beamDuration = 28 + Math.floor(Math.random() * 12);
              e.beamActiveTimer = e.beamDuration;
              e.beamTravelHead = 0;
              e.beamTravelTail = 0;
              e.beamSegmentLength = Math.max(120, e.beamLength * 0.32);
              e.beamTravelSpeed = e.beamLength / Math.max(1, e.beamDuration * 0.78);
              e.beamTickTimer = 0;
              // Beam fire sounds
              playSoundFresh('freesound_community-beam-8-43831.mp3', (window.sentinelVolume && window.sentinelVolume.beamerShot) || 0.7);
            }
          } else if (e.beamActiveTimer > 0) {
            e.beamActiveTimer -= delta * SPEED_MULTIPLIER;
            e.beamTravelHead += e.beamTravelSpeed * delta * SPEED_MULTIPLIER;
            e.beamTravelTail = Math.max(0, e.beamTravelHead - e.beamSegmentLength);
            e.beamTickTimer -= delta * SPEED_MULTIPLIER;

            if (e.beamTickTimer <= 0) {
              const beamStartX = e.x;
              const beamStartY = e.y;
              const headDist = Math.max(0, Math.min(e.beamLength, e.beamTravelHead));
              const tailDist = Math.max(0, Math.min(headDist, e.beamTravelTail));
              const segStartX = beamStartX + Math.cos(e.beamAngle) * tailDist;
              const segStartY = beamStartY + Math.sin(e.beamAngle) * tailDist;
              const segEndX = beamStartX + Math.cos(e.beamAngle) * headDist;
              const segEndY = beamStartY + Math.sin(e.beamAngle) * headDist;

              const segX = segEndX - segStartX;
              const segY = segEndY - segStartY;
              const segLenSq = segX * segX + segY * segY;
              let distanceToBeam = Infinity;
              if (segLenSq > 0) {
                const t = Math.max(0, Math.min(1, ((player.x - segStartX) * segX + (player.y - segStartY) * segY) / segLenSq));
                const closestX = segStartX + segX * t;
                const closestY = segStartY + segY * t;
                distanceToBeam = Math.hypot(player.x - closestX, player.y - closestY);
              }

              if (distanceToBeam <= player.radius + 9) {
                if (!window.godMode) { player.health -= Math.max(1, e.damage); runHealthLost += Math.max(1, e.damage); playPlayerHitSound(); }
              }
              e.beamTickTimer = 10;
            }

            if (e.beamActiveTimer <= 0) {
              e.beamCooldown = 135 + Math.floor(Math.random() * 95);
              e.beamTravelHead = 0;
              e.beamTravelTail = 0;
              e.beamTravelSpeed = 0;
              e.beamGlow = 0;
            }
          } else {
            e.beamCooldown -= delta * SPEED_MULTIPLIER;
            if (e.beamCooldown <= 0) {
              e.beamCastDuration = 24 + Math.floor(Math.random() * 10);
              e.beamCastTimer = e.beamCastDuration;
              e.beamLength = Math.max(e.beamLength || 0, Math.hypot(canvas.width, canvas.height) + 120);
              e.beamAngle = Math.atan2(player.y - e.y, player.x - e.x);
              e.beamerFacingAngle = e.beamAngle;
            }
          }

          const desiredFacingAngle = (e.beamCastTimer > 0 || e.beamActiveTimer > 0)
            ? e.beamAngle
            : angleToPlayer;
          let facingDiff = desiredFacingAngle - e.beamerFacingAngle;
          while (facingDiff > Math.PI) facingDiff -= Math.PI * 2;
          while (facingDiff < -Math.PI) facingDiff += Math.PI * 2;
          const maxTurnPerFrame = 0.12 * delta * SPEED_MULTIPLIER;
          if (Math.abs(facingDiff) <= maxTurnPerFrame) {
            e.beamerFacingAngle = desiredFacingAngle;
          } else {
            e.beamerFacingAngle += Math.sign(facingDiff) * maxTurnPerFrame;
          }

          const targetGlow = e.beamActiveTimer > 0 ? 1 : (e.beamCastTimer > 0 ? 0.5 : 0.12);
          e.beamGlow += (targetGlow - e.beamGlow) * Math.min(1, 0.18 * delta * SPEED_MULTIPLIER);
          e.beamGlow = Math.max(0.08, Math.min(1, e.beamGlow));
          e.beamerAlpha = Math.min(1, e.beamerAlpha + (0.045 * delta * SPEED_MULTIPLIER));

          const centerDx = e.x - centerX;
          const centerDy = e.y - centerY;
          const centerDist = Math.hypot(centerDx, centerDy);
          if (e.beamCastTimer <= 0) {
            if (centerDist < minCenterDist && centerDist > 0) {
              e.x += (centerDx / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
              e.y += (centerDy / centerDist) * e.speed * delta * SPEED_MULTIPLIER;
            }
          }
          e.x = Math.max(edgePaddingX, Math.min(canvas.width - edgePaddingX, e.x));
          e.y = Math.max(edgePaddingY, Math.min(canvas.height - edgePaddingY, e.y));
          continue;
        }
        const isSlinger = e.type === "slinger";
        if (e.type === "slingerBoss") {
          const maxHealth = Math.max(1, typeof e.maxHealth === "number" ? e.maxHealth : e.health);
          const healthRatio = Math.max(0, Math.min(1, e.health / maxHealth));
          const stage = getSlingerBossStage(healthRatio);
          const step = delta * SPEED_MULTIPLIER;
          if (typeof e.attackCooldown !== "number") e.attackCooldown = 0;
          const getPositionX = (positionIndex) => {
            const left = LOOT_XRAY_SIDE_DISTANCE + e.radius + 210;
            const right = canvas.width - LOOT_XRAY_SIDE_DISTANCE - e.radius - 210;
            if (positionIndex === 0) return left;
            if (positionIndex === 2) return right;
            return canvas.width * 0.5;
          };
          const beginPhase = (nextPhase, moveToNewPosition) => {
            e.slingerBossAttackPhase = nextPhase;
            e.slingerBossPhaseState = "pause";
            e.slingerBossPhaseTimer = SLINGER_BOSS_PHASE_PAUSE;
            e.slingerBossShotTimer = 0;
            e.slingerBossNovaShotsFired = 0;
            if (moveToNewPosition) {
              const currentPosition = e.slingerBossPositionIndex;
              let nextPosition = Math.floor(Math.random() * 2);
              if (nextPosition >= currentPosition) nextPosition++;
              e.slingerBossPositionIndex = nextPosition;
              e.slingerBossMoveFromX = e.x;
              e.slingerBossMoveToX = getPositionX(nextPosition);
              e.slingerBossMoveTimer = SLINGER_BOSS_PHASE_PAUSE;
            }
          };

          if (typeof e.slingerBossPositionIndex !== "number") e.slingerBossPositionIndex = 1;
          e.y = LOOT_XRAY_TOP_DISTANCE + e.radius + 185;
          if (typeof e.slingerBossHealthStage !== "number") e.slingerBossHealthStage = stage;
          if (typeof e.slingerBossAttackPhase !== "number") e.slingerBossAttackPhase = 1;
          if (e.slingerBossPhaseState !== "pause" && e.slingerBossPhaseState !== "attack") {
            e.slingerBossPhaseState = "pause";
            e.slingerBossPhaseTimer = SLINGER_BOSS_PHASE_PAUSE;
          }
          if (typeof e.slingerBossPhaseTimer !== "number") e.slingerBossPhaseTimer = SLINGER_BOSS_PHASE_PAUSE;
          if (typeof e.slingerBossShotTimer !== "number") e.slingerBossShotTimer = 0;
          if (typeof e.slingerBossNovaShotsFired !== "number") e.slingerBossNovaShotsFired = 0;
          if (typeof e.slingerBossMoveTimer !== "number") e.slingerBossMoveTimer = 0;

          if (stage !== e.slingerBossHealthStage) {
            e.slingerBossHealthStage = stage;
            e.slingerBossMoveTimer = 0;
            beginPhase(1, false);
            triggerBossPhaseEffect(e, stage);
            continue;
          }

          if (typeof e.slingerBossMoveFromX !== "number") e.slingerBossMoveFromX = getPositionX(e.slingerBossPositionIndex);
          if (typeof e.slingerBossMoveToX !== "number") e.slingerBossMoveToX = getPositionX(e.slingerBossPositionIndex);
          if (e.slingerBossMoveTimer > 0) {
            e.slingerBossMoveTimer = Math.max(0, e.slingerBossMoveTimer - step);
            const progress = 1 - e.slingerBossMoveTimer / SLINGER_BOSS_PHASE_PAUSE;
            e.x = e.slingerBossMoveFromX + (e.slingerBossMoveToX - e.slingerBossMoveFromX) * progress;
          } else {
            e.x = getPositionX(e.slingerBossPositionIndex);
          }
          const bossContactDistance = Math.hypot(player.x - e.x, player.y - e.y);
          if (bossContactDistance < e.radius + player.radius && e.attackCooldown <= 0) {
            if (!window.godMode) {
              player.health -= e.damage;
              runHealthLost += e.damage;
              playPlayerHitSound();
            }
            e.attackCooldown = 60;
          }
          if (e._bossPhaseStunTimer > 0) continue;

          const fireShot = (angle, speed, damage, radius, type, color) => spawnProjectile(
            e.x,
            e.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            damage,
            radius,
            color,
            type
          );
          const fireLine = () => {
            const vertical = Math.PI / 2;
            const elapsed = SLINGER_BOSS_LINE_DURATION - e.slingerBossPhaseTimer;
            const wavePeriod = stage === 1 ? 12 * 60 : stage === 2 ? 10 * 60 : 8 * 60;
            const wave = Math.sin((elapsed / wavePeriod) * Math.PI * 2);
            const angle = vertical + wave * (190 * Math.PI / 180);
            fireShot(angle, 1.9, e.damage, 7, "slingerBossProjectile", "#ffb347");
            playSound("laser.wav", (window.sentinelVolume && window.sentinelVolume.enemyProjectile) || 1.0);
          };
          const fireNova = () => {
            const shotCount = 20;
            const waveOffset = stage >= 2
              ? Math.sin(e.slingerBossNovaShotsFired * Math.PI / 2) * (Math.PI / 4)
              : 0;
            const baseRotation = stage >= 2
              ? e.slingerBossNovaBaseRotation
              : Math.random() * Math.PI * 2;
            const rotation = baseRotation + waveOffset;
            for (let shotIndex = 0; shotIndex < shotCount; shotIndex++) {
              const angle = rotation + (shotIndex / shotCount) * Math.PI * 2;
              fireShot(angle, 1.7 + (stage - 1) * 0.12, e.damage, 7, "slingerBossProjectile", "#ffb347");
            }
            playSound("laser.wav", (window.sentinelVolume && window.sentinelVolume.enemyProjectile) || 1.0);
          };
          const fireGrenadeVolley = () => {
            const grenadeCount = stage;
            const minX = LOOT_XRAY_SIDE_DISTANCE + 10;
            const maxX = canvas.width - LOOT_XRAY_SIDE_DISTANCE - 10;
            const minY = LOOT_XRAY_TOP_DISTANCE + 10;
            const maxY = canvas.height - LOOT_XRAY_BOTTOM_DISTANCE - 10;
            const randomTarget = () => {
              const angle = Math.PI / 2 + (Math.random() - 0.5) * (3 * Math.PI / 2);
              const directionX = Math.cos(angle);
              const directionY = Math.sin(angle);
              const maxXDistance = Math.abs(directionX) < 1e-10
                ? Infinity
                : directionX > 0
                  ? (maxX - e.x) / directionX
                  : (minX - e.x) / directionX;
              const maxYDistance = Math.abs(directionY) < 1e-10
                ? Infinity
                : directionY > 0
                  ? (maxY - e.y) / directionY
                  : (minY - e.y) / directionY;
              const maxDistance = Math.min(maxXDistance, maxYDistance);
              const distance = 200 + Math.random() * Math.max(0, maxDistance - 200);
              return {
                x: e.x + directionX * distance,
                y: e.y + directionY * distance
              };
            };
            for (let grenadeIndex = 0; grenadeIndex < grenadeCount; grenadeIndex++) {
              const target = randomTarget();
              const targetX = target.x;
              const targetY = target.y;
              const aimAngle = Math.atan2(targetY - e.y, targetX - e.x);
              const shell = fireShot(aimAngle, 1.28, e.damage + 1, 9.2, "slingerBossFragShell", "#ffd08a");
              shell.fragTargetX = targetX;
              shell.fragTargetY = targetY;
              shell.fragmentCount = 8;
              shell.fragmentDamage = Math.max(0.5, e.damage * 0.45);
              shell.fragmentRadius = 5.2;
              shell.lifeTimer = Math.ceil(Math.hypot(targetX - e.x, targetY - e.y) / 1.28) + 20;
            }
            playSound("laser.wav", (window.sentinelVolume && window.sentinelVolume.enemyProjectile) || 1.0);
          };

          if (e.slingerBossPhaseState === "pause") {
            e.slingerBossPhaseTimer = Math.max(0, e.slingerBossPhaseTimer - step);
            if (e.slingerBossPhaseTimer <= 0) {
              e.slingerBossPhaseState = "attack";
              e.slingerBossShotTimer = 0;
              e.slingerBossNovaShotsFired = 0;
              e.slingerBossPhaseTimer = e.slingerBossAttackPhase === 1
                ? SLINGER_BOSS_LINE_DURATION
                : e.slingerBossAttackPhase === 3
                  ? SLINGER_BOSS_GRENADE_DURATION
                  : 0;
              if (e.slingerBossAttackPhase === 2) {
                e.slingerBossNovaBaseRotation = Math.random() * Math.PI * 2;
              }
            }
            continue;
          }

          if (e.slingerBossAttackPhase === 2) {
            e.slingerBossShotTimer -= step;
            const novaCount = stage === 1 ? 3 : stage === 2 ? 5 : 7;
            if (e.slingerBossShotTimer <= 0 && e.slingerBossNovaShotsFired < novaCount) {
              fireNova();
              e.slingerBossNovaShotsFired++;
              e.slingerBossShotTimer += SLINGER_BOSS_NOVA_INTERVALS[stage];
            }
            if (e.slingerBossNovaShotsFired >= novaCount) {
              beginPhase(3, false);
            }
          } else {
            e.slingerBossPhaseTimer -= step;
            e.slingerBossShotTimer -= step;
            while (e.slingerBossShotTimer <= 0 && e.slingerBossPhaseTimer > 0) {
              if (e.slingerBossAttackPhase === 1) {
                fireLine();
                e.slingerBossShotTimer += SLINGER_BOSS_LINE_INTERVAL;
              } else {
                fireGrenadeVolley();
                e.slingerBossShotTimer += SLINGER_BOSS_GRENADE_INTERVAL;
              }
            }
            if (e.slingerBossPhaseTimer <= 0) {
              const nextPhase = e.slingerBossAttackPhase === 1 ? 2 : 1;
              beginPhase(nextPhase, e.slingerBossAttackPhase === 3);
            }
          }
          continue;
        }
        if (e.type === "stalkerBoss") {
          const step = delta * SPEED_MULTIPLIER;
          const centerX = canvas.width * 0.5;
          const centerY = canvas.height * 0.5;
          const paddingX = typeof e.stalkerBossEdgePaddingX === "number" ? e.stalkerBossEdgePaddingX : STALKER_BOSS_EDGE_MARGIN;
          const paddingY = typeof e.stalkerBossEdgePaddingY === "number" ? e.stalkerBossEdgePaddingY : STALKER_BOSS_EDGE_MARGIN;
          const hexRadius = Math.max(0, Math.min(centerX - paddingX - e.radius, centerY - paddingY - e.radius));
          const minX = paddingX + e.radius;
          const maxX = canvas.width - paddingX - e.radius;
          const minY = paddingY + e.radius;
          const maxY = canvas.height - paddingY - e.radius;
          const clampPosition = (value, min, max, center) =>
            min > max ? center : Math.max(min, Math.min(max, value));
          const hexPositions = Array.from({ length: 6 }, (_, index) => {
            const angle = -Math.PI / 2 + (index * Math.PI) / 3;
            let x = centerX + Math.cos(angle) * hexRadius;
            let y = centerY + Math.sin(angle) * hexRadius;
            if (index === 0) y += 50;
            else if (index === 3) y -= 50;
            else x += Math.cos(angle) > 0 ? 50 : -50;
            y += 25;
            return {
              x: clampPosition(x, minX, maxX, centerX),
              y: clampPosition(y, minY, maxY, centerY)
            };
          });
          const healthRatio = Math.max(0, Math.min(1, e.health / Math.max(1, e.maxHealth || e.health)));
          const stage = getStalkerBossStage(healthRatio);
          const isIllusion = !!e.stalkerBossIllusion;

          if (typeof e.stalkerBossCurrentHexIndex !== "number") {
            e.stalkerBossCurrentHexIndex = Math.floor(Math.random() * hexPositions.length);
          }
          e.stalkerBossCurrentHexIndex = ((Math.floor(e.stalkerBossCurrentHexIndex) % 6) + 6) % 6;
          if (e.stalkerBossPositionInitialized !== true) {
            e.x = hexPositions[e.stalkerBossCurrentHexIndex].x;
            e.y = hexPositions[e.stalkerBossCurrentHexIndex].y;
            e.stalkerBossPositionInitialized = true;
          }
          if (typeof e.attackCooldown !== "number") e.attackCooldown = 0;
          if (typeof e.stalkerBossIllusionGroupId !== "object" || !e.stalkerBossIllusionGroupId) {
            e.stalkerBossIllusionGroupId = {};
          }

          const updateAlpha = (entity) => {
            if (entity.stalkerBossPhase3Hidden) {
              entity.stalkerAlpha = 0;
              return;
            }
            const fadeDuration = typeof entity.spawnFadeDuration === "number" ? entity.spawnFadeDuration : 120;
            if (typeof entity.spawnFadeTimer === "number" && entity.spawnFadeTimer < fadeDuration) {
              entity.spawnFadeTimer += step;
              entity.stalkerAlpha = 0.9 * Math.min(1, entity.spawnFadeTimer / fadeDuration);
            } else if (typeof entity.stalkerAlpha !== "number" || entity.stalkerAlpha < 0.9) {
              entity.stalkerAlpha = 0.9;
            }
          };
          const fireSingleShot = (shooter) => {
            const angle = Math.atan2(player.y - shooter.y, player.x - shooter.x);
            const shotSpeed = 2.4;
            spawnProjectile(
              shooter.x,
              shooter.y,
              Math.cos(angle) * shotSpeed,
              Math.sin(angle) * shotSpeed,
              shooter.damage,
              8,
              "#66e8ff",
              "stalkerBossProjectile"
            );
            playSound("laser.wav", (window.sentinelVolume && window.sentinelVolume.enemyProjectile) || 1.0);
          };
          const fireFanShot = (shooter, includeCenter = false) => {
            const angleToPlayer = Math.atan2(player.y - shooter.y, player.x - shooter.x);
            const burstShots = 3;
            const shotSpeed = 2.4;
            const spread = (Math.PI / 2) / (2 * burstShots);
            for (let shotIndex = -burstShots; shotIndex <= burstShots; shotIndex++) {
              if (shotIndex === 0 && !includeCenter) continue;
              const shotAngle = angleToPlayer + shotIndex * spread;
              spawnProjectile(
                shooter.x,
                shooter.y,
                Math.cos(shotAngle) * shotSpeed,
                Math.sin(shotAngle) * shotSpeed,
                shooter.damage,
                8,
                "#66e8ff",
                "stalkerBossProjectile"
              );
            }
            playSound("laser.wav", (window.sentinelVolume && window.sentinelVolume.enemyProjectile) || 1.0);
          };
          const applyContactDamage = (entity) => {
            const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
            if (distance < entity.radius + player.radius && entity.attackCooldown <= 0) {
              if (!window.godMode) {
                player.health -= entity.damage;
                runHealthLost += entity.damage;
                playPlayerHitSound();
              }
              entity.attackCooldown = 60;
            }
          };
          const emitTeleportParticles = (entity, count) => {
            for (let particleIndex = 0; particleIndex < count; particleIndex++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 1.8 + Math.random() * 2.2;
              spawnParticle(
                entity.x,
                entity.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                20 + Math.random() * 16,
                ["#66e8ff", "#b7f6ff", "#4a8aaa", "#d9fbff"][Math.floor(Math.random() * 4)],
                0.91 + Math.random() * 0.04,
                2.8 + Math.random() * 2.8,
                "enemyHit"
              );
            }
          };
          const clearIllusions = () => {
            for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex++) {
              const illusion = enemies[enemyIndex];
              if (
                illusion !== e &&
                illusion.stalkerBossIllusion &&
                illusion.stalkerBossIllusionOwner === e.stalkerBossIllusionGroupId
              ) {
                illusion.health = 0;
              }
            }
          };
          const spawnIllusions = (reservedHexIndex) => {
            const availableHexes = [];
            for (let hexIndex = 0; hexIndex < hexPositions.length; hexIndex++) {
              if (hexIndex !== reservedHexIndex) availableHexes.push(hexIndex);
            }
            for (let index = availableHexes.length - 1; index > 0; index--) {
              const otherIndex = Math.floor(Math.random() * (index + 1));
              [availableHexes[index], availableHexes[otherIndex]] = [availableHexes[otherIndex], availableHexes[index]];
            }

            const illusionCount = STALKER_BOSS_ILLUSION_COUNTS[stage];
            for (let illusionIndex = 0; illusionIndex < illusionCount; illusionIndex++) {
              const hexIndex = availableHexes[illusionIndex];
              const illusion = spawnEnemy();
              illusion.x = hexPositions[hexIndex].x;
              illusion.y = hexPositions[hexIndex].y;
              illusion.radius = e.radius;
              illusion.collisionRadius = e.collisionRadius || e.radius;
              illusion.speed = 0;
              illusion.health = 1000;
              illusion.maxHealth = 1000;
              illusion.damage = e.damage;
              illusion.attackCooldown = 0;
              illusion.attackRange = e.attackRange;
              illusion.color = e.color;
              illusion.type = "stalkerBoss";
              illusion.noLoot = true;
              illusion.noXP = true;
              illusion.stalkerBossIllusion = true;
              illusion.stalkerBossIllusionOwner = e.stalkerBossIllusionGroupId;
              illusion.stalkerBossCurrentHexIndex = hexIndex;
              illusion.stalkerBossPositionInitialized = true;
              illusion.stalkerBossSingleShotCooldown = 0;
              illusion.stalkerBossPhase3Hidden = true;
              illusion.stalkerBossPhase3RevealComplete = false;
              illusion.stalkerAlpha = 0;
            }
          };
          const revealIllusions = () => {
            for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex++) {
              const illusion = enemies[enemyIndex];
              if (
                illusion.stalkerBossIllusion &&
                illusion.stalkerBossIllusionOwner === e.stalkerBossIllusionGroupId
              ) {
                illusion.stalkerBossPhase3Hidden = false;
                illusion.stalkerBossPhase3RevealComplete = false;
                illusion.stalkerBossSingleShotCooldown = STALKER_BOSS_PHASE3_REVEAL_DURATION;
                illusion.spawnFadeTimer = 0;
                illusion.spawnFadeDuration = STALKER_BOSS_PHASE3_REVEAL_DURATION;
                illusion.stalkerAlpha = 0;
                emitTeleportParticles(illusion, 18);
              }
            }
          };
          const startTeleport = (quick) => {
            const targetHexIndices = hexPositions
              .map((_, index) => index)
              .filter((index) => {
                if (index === e.stalkerBossCurrentHexIndex) return false;
                if (e.stalkerBossAttackPhase !== 1) return true;
                const clockwiseDistance = (index - e.stalkerBossCurrentHexIndex + 6) % 6;
                const hexDistance = Math.min(clockwiseDistance, 6 - clockwiseDistance);
                return hexDistance > 1;
              });
            const targetHexIndex = targetHexIndices[Math.floor(Math.random() * targetHexIndices.length)];
            e.stalkerBossTeleportTargetIndex = targetHexIndex;
            e.stalkerBossTeleportDuration = quick ? 12 : 24 + Math.floor(Math.random() * 12);
            e.stalkerBossTeleportTimer = e.stalkerBossTeleportDuration;
            e.stalkerBossPhaseState = "teleporting";
            emitTeleportParticles(e, 18);
          };
          const beginPhase = (phase) => {
            e.stalkerBossAttackPhase = phase;
            e.stalkerBossTeleportsThisPhase = 0;
            if (phase === 1) {
              e.stalkerBossIllusionPhaseActive = false;
              e.stalkerBossPhase3RevealComplete = false;
              e.stalkerBossPhaseState = "single";
              e.stalkerBossPhase1FanCooldown = 0;
              e.stalkerBossPhase1TeleportRequested = false;
              e.stalkerBossPhase1TransitionTeleportRequested = false;
              e.stalkerBossPhase1TransitionTeleporting = false;
            } else if (phase === 2) {
              e.stalkerBossIllusionPhaseActive = false;
              e.stalkerBossPhase3RevealComplete = false;
              e.stalkerBossFanVolleysFired = 0;
              e.stalkerBossPhaseState = "fanTeleport";
            } else {
              e.stalkerBossIllusionPhaseActive = true;
              e.stalkerBossPhase3RevealComplete = false;
              e.stalkerBossSingleShotCooldown = 0;
              startTeleport(false);
              spawnIllusions(e.stalkerBossTeleportTargetIndex);
            }
          };
          const queuePhase = (phase) => {
            e.stalkerBossNextPhase = phase;
            e.stalkerBossPhaseState = "phasePause";
            e.stalkerBossPhaseTimer = STALKER_BOSS_PHASE_PAUSE;
          };

          updateAlpha(e);
          const phase3RevealPending =
            e.stalkerBossPhase3Hidden ||
            (e.stalkerBossIllusion && !e.stalkerBossPhase3RevealComplete) ||
            (!isIllusion && e.stalkerBossIllusionPhaseActive && !e.stalkerBossPhase3RevealComplete);
          if (!phase3RevealPending) applyContactDamage(e);
          if (isIllusion) {
            if (e.stalkerBossPhase3Hidden) continue;
            if (typeof e.stalkerBossSingleShotCooldown !== "number") e.stalkerBossSingleShotCooldown = 0;
            e.stalkerBossSingleShotCooldown -= step;
            if (e.stalkerBossSingleShotCooldown <= 0) {
              fireSingleShot(e);
              e.stalkerBossSingleShotCooldown = 120;
            }
            continue;
          }

          if (typeof e.stalkerBossHealthStage !== "number") e.stalkerBossHealthStage = stage;
          if (typeof e.stalkerBossAttackPhase !== "number") e.stalkerBossAttackPhase = 1;
          if (typeof e.stalkerBossPhaseState !== "string") e.stalkerBossPhaseState = "single";
          if (typeof e.stalkerBossTeleportsThisPhase !== "number") e.stalkerBossTeleportsThisPhase = 0;
          if (typeof e.stalkerBossSingleShotCooldown !== "number") e.stalkerBossSingleShotCooldown = 0;
          if (typeof e.stalkerBossPhase1TeleportRequested !== "boolean") e.stalkerBossPhase1TeleportRequested = false;

          if (stage !== e.stalkerBossHealthStage) {
            clearIllusions();
            e.stalkerBossIllusionPhaseActive = false;
            e.stalkerBossPhase3RevealComplete = false;
            e.stalkerBossHealthStage = stage;
            e.stalkerBossNextPhase = 1;
            e.stalkerBossPhaseState = "phasePause";
            e.stalkerBossPhaseTimer = STALKER_BOSS_PHASE_PAUSE;
            e.stalkerBossPhase1TeleportRequested = false;
            e.stalkerBossPhase1TransitionTeleportRequested = false;
            e.stalkerBossPhase1TransitionTeleporting = false;
            e.stalkerBossPhase1SalvoShotsRemaining = 0;
            e.stalkerBossPhase1SalvoCooldown = 0;
            triggerBossPhaseEffect(e, stage);
            continue;
          }

          if (e.stalkerBossPhaseState === "phasePause") {
            e.stalkerBossPhaseTimer = Math.max(0, e.stalkerBossPhaseTimer - step);
            if (e.stalkerBossPhaseTimer <= 0) beginPhase(e.stalkerBossNextPhase);
            continue;
          }

          if (e.stalkerBossPhaseState === "teleporting") {
            e.stalkerBossTeleportTimer = Math.max(0, e.stalkerBossTeleportTimer - step);
            const teleportProgress = 1 - e.stalkerBossTeleportTimer / e.stalkerBossTeleportDuration;
            e.stalkerAlpha = Math.max(0.08, 0.9 * (1 - teleportProgress));
            if (e.stalkerBossTeleportTimer <= 0) {
              const targetPosition = hexPositions[e.stalkerBossTeleportTargetIndex];
              e.x = targetPosition.x;
              e.y = targetPosition.y;
              e.stalkerBossCurrentHexIndex = e.stalkerBossTeleportTargetIndex;
              const isPhase1TransitionTeleport = e.stalkerBossPhase1TransitionTeleporting === true;
              if (!isPhase1TransitionTeleport) e.stalkerBossTeleportsThisPhase++;
              e.stalkerAlpha = 0.15;
              emitTeleportParticles(e, 24);
              playSoundFresh("u_wzgyzo3pae-warp-306033.mp3", (window.sentinelVolume && window.sentinelVolume.stalkerWarp) || 0.6);
              if (isPhase1TransitionTeleport) {
                e.stalkerBossPhase1TransitionTeleporting = false;
                e.stalkerBossPhase1TeleportRequested = false;
                e.stalkerBossPhase1SalvoShotsRemaining = 0;
                e.stalkerBossPhase1SalvoCooldown = 0;
                e.stalkerBossPhase1FanCooldown = 0;
                e.stalkerBossTeleportsThisPhase = 0;
                e.stalkerBossAttackPhase = 2;
                e.stalkerBossFanVolleysFired = 0;
                e.stalkerBossPhaseState = "fanDelay";
                e.stalkerBossPhaseTimer = STALKER_BOSS_PHASE2_TELEPORT_DELAY;
              } else if (e.stalkerBossAttackPhase === 1) {
                e.stalkerBossPhase1TeleportRequested = false;
                e.stalkerBossPhase1FanCooldown = 0;
                e.stalkerBossPhase1SalvoShotsRemaining = stage;
                e.stalkerBossPhase1SalvoCooldown = 0;
                e.stalkerBossPhaseState = "singleDelay";
                e.stalkerBossPhaseTimer = STALKER_BOSS_PHASE1_TELEPORT_RECOVERY;
              } else if (e.stalkerBossAttackPhase === 3) {
                e.stalkerAlpha = 0;
                e.spawnFadeTimer = 0;
                e.spawnFadeDuration = STALKER_BOSS_PHASE3_REVEAL_DURATION;
                e.stalkerBossSingleShotCooldown = STALKER_BOSS_PHASE3_REVEAL_DURATION;
                e.stalkerBossPhaseState = "illusionReveal";
                e.stalkerBossPhaseTimer = STALKER_BOSS_PHASE3_REVEAL_DURATION;
                revealIllusions();
              } else {
                e.stalkerBossPhaseState = "fanDelay";
                e.stalkerBossPhaseTimer = STALKER_BOSS_PHASE2_TELEPORT_DELAY;
              }
            }
            continue;
          }

          if (e.stalkerBossPhaseState === "singleDelay" || e.stalkerBossPhaseState === "fanDelay") {
            const delayDuration = e.stalkerBossPhaseState === "singleDelay"
              ? STALKER_BOSS_PHASE1_TELEPORT_RECOVERY
              : STALKER_BOSS_PHASE2_TELEPORT_DELAY;
            e.stalkerBossPhaseTimer = Math.max(0, e.stalkerBossPhaseTimer - step);
            e.stalkerAlpha = 0.15 + 0.75 * (1 - e.stalkerBossPhaseTimer / delayDuration);
            if (e.stalkerBossPhaseTimer <= 0) {
              e.stalkerBossPhaseState = e.stalkerBossAttackPhase === 1 ? "single" : "fan";
              if (e.stalkerBossAttackPhase === 1) e.stalkerBossPhase1FanCooldown = 0;
            }
            continue;
          }

          if (e.stalkerBossPhaseState === "illusionReveal") {
            e.stalkerBossPhaseTimer = Math.max(0, e.stalkerBossPhaseTimer - step);
            if (e.stalkerBossPhaseTimer <= 0) {
              e.stalkerBossPhase3RevealComplete = true;
              for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex++) {
                const illusion = enemies[enemyIndex];
                if (
                  illusion.stalkerBossIllusion &&
                  illusion.stalkerBossIllusionOwner === e.stalkerBossIllusionGroupId
                ) {
                  illusion.stalkerBossPhase3RevealComplete = true;
                }
              }
              e.stalkerBossPhaseState = "illusion";
              e.stalkerBossPhaseTimer = STALKER_BOSS_ILLUSION_DURATIONS[stage];
              e.stalkerBossSingleShotCooldown = 0;
            }
            continue;
          }

          if (e.stalkerBossPhaseState === "single") {
            if (e.stalkerBossPhase1TransitionTeleportRequested) {
              e.stalkerBossPhase1TransitionTeleportRequested = false;
              e.stalkerBossPhase1TransitionTeleporting = true;
              startTeleport(false);
              continue;
            }
            if (e.stalkerBossPhase1TeleportRequested) {
              e.stalkerBossPhase1TeleportRequested = false;
              startTeleport(false);
              continue;
            }
            if (e.stalkerBossPhase1SalvoShotsRemaining > 0) {
              e.stalkerBossPhase1SalvoCooldown = Math.max(0, e.stalkerBossPhase1SalvoCooldown - step);
              if (e.stalkerBossPhase1SalvoCooldown <= 0) {
                fireFanShot(e, true);
                e.stalkerBossPhase1SalvoShotsRemaining--;
                if (e.stalkerBossPhase1SalvoShotsRemaining <= 0) {
                  e.stalkerBossPhase1FanCooldown = STALKER_BOSS_PHASE1_FAN_INTERVAL;
                } else {
                  e.stalkerBossPhase1SalvoCooldown = STALKER_BOSS_PHASE1_SALVO_INTERVAL;
                }
              }
              continue;
            }
            if (typeof e.stalkerBossPhase1FanCooldown !== "number") e.stalkerBossPhase1FanCooldown = 0;
            e.stalkerBossPhase1FanCooldown = Math.max(0, e.stalkerBossPhase1FanCooldown - step);
            if (e.stalkerBossPhase1FanCooldown <= 0) {
              fireFanShot(e, true);
              e.stalkerBossPhase1FanCooldown = STALKER_BOSS_PHASE1_FAN_INTERVAL;
            }
            continue;
          }

          if (e.stalkerBossPhaseState === "fanTeleport") {
            startTeleport(true);
            continue;
          }

          if (e.stalkerBossPhaseState === "fan") {
            fireFanShot(e, true);
            e.stalkerBossFanVolleysFired++;
            if (e.stalkerBossFanVolleysFired >= STALKER_BOSS_TELEPORT_COUNTS[stage]) {
              queuePhase(3);
            } else {
              e.stalkerBossPhaseState = "fanTeleport";
            }
            continue;
          }

          if (e.stalkerBossPhaseState === "illusion") {
            e.stalkerBossPhaseTimer = Math.max(0, e.stalkerBossPhaseTimer - step);
            e.stalkerBossSingleShotCooldown -= step;
            if (e.stalkerBossSingleShotCooldown <= 0) {
              fireSingleShot(e);
              e.stalkerBossSingleShotCooldown = 120;
            }
            if (e.stalkerBossPhaseTimer <= 0) {
              clearIllusions();
              e.stalkerBossIllusionPhaseActive = false;
              e.stalkerBossPhase3RevealComplete = false;
              queuePhase(1);
            }
            continue;
          }

          beginPhase(1);
          continue;
        }
        if (e.type === "gruntBoss" && e.gruntBossEntering !== false) {
          const centerX = canvas.width * 0.5;
          const centerY = canvas.height * 0.5;
          const centerDx = centerX - e.x;
          const centerDy = centerY - e.y;
          const centerDist = Math.hypot(centerDx, centerDy);
          const paddingX = typeof e.gruntBossEdgePaddingX === "number" ? e.gruntBossEdgePaddingX : 110;
          const paddingY = typeof e.gruntBossEdgePaddingY === "number" ? e.gruntBossEdgePaddingY : 150;
          const minX = paddingX;
          const maxX = canvas.width - paddingX;
          const minY = paddingY;
          const maxY = canvas.height - paddingY;
          const insidePaddedArea = e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY;
          const entrySpeed = typeof e.gruntBossEntrySpeed === "number" ? e.gruntBossEntrySpeed : (e.speed * 1.9);
          if (centerDist > 0) {
            e.x += (centerDx / centerDist) * entrySpeed * delta * SPEED_MULTIPLIER;
            e.y += (centerDy / centerDist) * entrySpeed * delta * SPEED_MULTIPLIER;
          }
          if (insidePaddedArea) {
            e.gruntBossEntering = false;
            if (typeof e.gruntBossNormalSpeed === "number") {
              e.speed = e.gruntBossNormalSpeed;
            }
          }
        }
        const isTouchingPlayer = dist < (e.radius + player.radius);
        const isSlingerInRange = dist < (e.attackRange || 20) + player.radius;
        const isSlingerInXrayArea = isSlinger && isInLootXrayArea(e.x, e.y);
        const canAttackNow = e.type === "slingerBoss"
          ? false
          : (e.type === "gruntBoss" && e.gruntBossEntering !== false)
            ? false
            : (isSlinger ? (isSlingerInRange && !isSlingerInXrayArea) : isTouchingPlayer);
        if (e.type === "kamikaze" && e.explodeOnContact && !e.exploded && isTouchingPlayer) {
          detonateKamikaze(e, i);
          continue;
        }
        if (canAttackNow) {
          if (e.attackCooldown <= 0) {
            if (isSlinger) {
              const angle = Math.atan2(player.y - e.y, player.x - e.x);
              const speed = 1.5;
              spawnProjectile(e.x, e.y, Math.cos(angle) * speed, Math.sin(angle) * speed, e.damage);
              playSound('laser.wav', (window.sentinelVolume && window.sentinelVolume.enemyProjectile) || 1.0);
              e.attackCooldown = 60;
            } else {
              if (!window.godMode) { player.health -= e.damage; runHealthLost += e.damage; playPlayerHitSound(); }
              e.attackCooldown = 60;
            }
          }
            if (!isSlinger) drawLine(e.x, e.y, player.x, player.y, "gray");
        } else {
            if (e.type === "gruntBoss" && e.gruntBossEntering !== false) {
              // Grunt boss entry movement is handled above until it reaches the padded area.
            } else if (e.type === "bruteBoss") {
              e.x = canvas.width / 2;
              e.y = canvas.height / 2;
            } else if (e.type === "brute") {
              if (typeof e.zoneLocked !== "boolean") e.zoneLocked = false;
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const maxStopDistance = Math.max(90, Math.min(canvas.width, canvas.height) * 0.34);
              const minStopDistance = Math.max(44, maxStopDistance * 0.42);
              if (typeof e.bruteStopDistance !== "number") {
                e.bruteStopDistance = minStopDistance + Math.random() * (maxStopDistance - minStopDistance);
              }

              if (!e.zoneLocked) {
                const centerDist = Math.hypot(e.x - centerX, e.y - centerY);
                if (centerDist <= e.bruteStopDistance) {
                  e.zoneLocked = true;
                } else {
                  const zoneDx = centerX - e.x;
                  const zoneDy = centerY - e.y;
                  const zoneDist = Math.hypot(zoneDx, zoneDy);
                  if (zoneDist > 0) {
                    e.x += (zoneDx / zoneDist) * e.speed * delta * SPEED_MULTIPLIER;
                    e.y += (zoneDy / zoneDist) * e.speed * delta * SPEED_MULTIPLIER;
                  }
                }
              }
            } else
            if (e.type === "kamikaze" && !e.exploded) {
              // Brute boss kamikazes keep traveling radially instead of homing.
              if (e.bruteBossLaunchOutward) {
                e.x += e.bruteBossLaunchVelocityX * delta * SPEED_MULTIPLIER;
                e.y += e.bruteBossLaunchVelocityY * delta * SPEED_MULTIPLIER;
              } else if (typeof e.bruteBossLaunchTimer === "number" && e.bruteBossLaunchTimer > 0) {
                e.x += e.bruteBossLaunchVelocityX * delta * SPEED_MULTIPLIER;
                e.y += e.bruteBossLaunchVelocityY * delta * SPEED_MULTIPLIER;
                e.bruteBossLaunchTimer -= delta * SPEED_MULTIPLIER;
              } else if (dist > 0) {
                e.x += (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
                e.y += (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;
              }

              // Handle mine placement and explosion timing
              if (typeof e.minesPlaced === 'undefined') e.minesPlaced = 0;
              if (typeof e.minePlacementAttempts === 'undefined') e.minePlacementAttempts = e.minesPlaced;
              if (typeof e.mineInterval === 'undefined') e.mineInterval = 60;
              if (typeof e.nextMineTime === 'undefined') e.nextMineTime = 60;
              if (typeof e.timer === 'undefined') e.timer = 60;
              if (!e._chargeoundPlayed) {
                e._chargeoundPlayed = true;
                playSoundFresh('dragon-studio-fire-spell-impact-393921.mp3', (window.sentinelVolume && window.sentinelVolume.kamikazeCharge) || 0.7);
              }

              e.timer -= delta * SPEED_MULTIPLIER;
              if (e.minePlacementAttempts < 3) {
                e.nextMineTime -= delta * SPEED_MULTIPLIER;
                if (e.nextMineTime <= 0) {
                  const mineRadius = 18;
                  const overlapsMine = mines.some(existingMine => {
                    if (!existingMine || existingMine.type === "burn" || existingMine.active === false) return false;
                    const existingRadius = Number.isFinite(existingMine.radius) ? existingMine.radius : mineRadius;
                    return Math.hypot(e.x - existingMine.x, e.y - existingMine.y) < mineRadius + existingRadius;
                  });
                  if (!overlapsMine) {
                    mines.push({
                      x: e.x,
                      y: e.y,
                      radius: mineRadius,
                      timer: typeof e.mineLifetime === "number" ? e.mineLifetime : 360,
                      color: '#ffbb00',
                      active: true
                    });
                    e.minesPlaced++;
                  }
                  e.minePlacementAttempts++;
                  e.nextMineTime = e.mineInterval;
                  e.timer = e.mineInterval; // reset timer for next mine/explosion
                }
              } else if (e.timer <= 0) {
                detonateKamikaze(e, i);
                continue;
              }
            } else {
              e.x += (dx / dist) * e.speed * delta * SPEED_MULTIPLIER;
              e.y += (dy / dist) * e.speed * delta * SPEED_MULTIPLIER;
            }
        }
      }
    }

    // Only decrement attackCooldown for mobs
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (typeof e.attackCooldown === "number") e.attackCooldown--;
    }

    // Prevent enemy overlap and update spin/hover once per enemy per frame
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      for (let j = 0; j < enemies.length; j++) {
        if (i === j) continue;
        const o = enemies[j];
        // Fast early-out: skip if clearly too far apart (max radius is ~60)
        const _quickDx = e.x - o.x;
        const _quickDy = e.y - o.y;
        if (_quickDx * _quickDx + _quickDy * _quickDy > 36000) continue;
        if (
          e.type === "stalkerBoss" ||
          o.type === "stalkerBoss" ||
          (e.type === "grunt" && o.type === "gruntBoss" && e.noBossCollision > 0) ||
          (o.type === "grunt" && e.type === "gruntBoss" && o.noBossCollision > 0)
        ) {
          continue;
        }
        const ox = _quickDx;
        const oy = _quickDy;
        const d = Math.hypot(ox, oy);
        const r1 = typeof e.collisionRadius === 'number' ? e.collisionRadius : e.radius;
        const r2 = typeof o.collisionRadius === 'number' ? o.collisionRadius : o.radius;
        const minDist = r1 + r2;
        const isBrutePair = (e.type === "brute" || e.type === "bruteBoss") && (o.type === "brute" || o.type === "bruteBoss");
        const isShielderPair = e.type === "shielder" && o.type === "shielder";
        const shouldUseExpandedSpacing = isBrutePair || isShielderPair;
        const targetMinDist = shouldUseExpandedSpacing ? minDist * 3 : minDist;
        if (d < targetMinDist && d > 0) {
          const overlap = (targetMinDist - d) / 2;
          let pushFactorE = 0.25, pushFactorO = 0.25;
          if (e.type === "gruntBoss") pushFactorE = 0.08;
          else if (e.type === "brute" || e.type === "bruteBoss") pushFactorE = 0.18;
          else if (e.type === "stalker") pushFactorE = 0.16;
          else if (e.type === "shielder") pushFactorE = 0.16;
          else if (e.type === "beamer") pushFactorE = 0.16;
          if (o.type === "gruntBoss") pushFactorO = 0.08;
          else if (o.type === "brute" || o.type === "bruteBoss") pushFactorO = 0.18;
          else if (o.type === "stalker") pushFactorO = 0.16;
          else if (o.type === "shielder") pushFactorO = 0.16;
          else if (o.type === "beamer") pushFactorO = 0.16;
          if (shouldUseExpandedSpacing) {
            pushFactorE = 0.3;
            pushFactorO = 0.3;
          }
          if (e.type === "bruteBoss") pushFactorE = 0;
          if (o.type === "bruteBoss") pushFactorO = 0;
          e.x += (ox / d) * overlap * pushFactorE * delta * SPEED_MULTIPLIER;
          e.y += (oy / d) * overlap * pushFactorE * delta * SPEED_MULTIPLIER;
          o.x -= (ox / d) * overlap * pushFactorO * delta * SPEED_MULTIPLIER;
          o.y -= (oy / d) * overlap * pushFactorO * delta * SPEED_MULTIPLIER;
        }
      }

      if (typeof e.spinAngle === "undefined") e.spinAngle = Math.random() * Math.PI * 2;
      // Removed spin animation: spinAngle is set only at spawn and not updated
      if (e.type === "slinger" || e.type === "slingerBoss") {
        if (typeof e.baseY === "undefined") e.baseY = e.y;
        if (typeof e.hoverOffset === "undefined") e.hoverOffset = Math.random() * Math.PI * 2;
        e.hoverOffset += 0.8 * delta;
      }
    }
  }

  function updateProjectiles(delta) {
    const frameScale = delta * SPEED_MULTIPLIER;
    const emitBruteFireballNova = (x, y, areaRadius) => {
      const resolvedRadius = Math.max(18, Number.isFinite(areaRadius) ? areaRadius : 72);
      const burstCount = 42;
      for (let burstIndex = 0; burstIndex < burstCount; burstIndex++) {
        const angle = (Math.PI * 2 * burstIndex) / burstCount;
        const speed = (resolvedRadius / 22) + Math.random() * (resolvedRadius / 34);
        const flare = burstIndex < 14;
        const color = flare ? "#fff200" : ["#ff6600", "#ffaa00", "#ff3300"][Math.floor(Math.random() * 3)];
        const size = flare ? 8 + Math.random() * 3 : 4 + Math.random() * 2.5;
        const life = flare ? 24 + Math.random() * 14 : 18 + Math.random() * 12;
        const decay = flare ? 0.92 : 0.95;
        spawnParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          life,
          color,
          decay,
          size,
          "novaFlare"
        );
      }
    };

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.dx * frameScale;
      p.y += p.dy * frameScale;

      if (p.type === "bruteBossFireball") {
        p.lifeTimer = (typeof p.lifeTimer === "number" ? p.lifeTimer : 200) - frameScale;
        p.particleCooldown = (typeof p.particleCooldown === "number" ? p.particleCooldown : 0) - frameScale;
        if (p.particleCooldown <= 0) {
          p.particleCooldown = 4;
          const trailAngle = Math.atan2(-p.dy, -p.dx);
          const spread = (Math.random() - 0.5) * 0.9;
          const particleSpeed = 0.7 + Math.random() * 0.6;
          spawnParticle(
            p.x,
            p.y,
            Math.cos(trailAngle + spread) * particleSpeed,
            Math.sin(trailAngle + spread) * particleSpeed,
            18 + Math.floor(Math.random() * 14),
            ["#ff6a00", "#ffb14d", "#ff4200"][Math.floor(Math.random() * 3)],
            0.9 + Math.random() * 0.05,
            3 + Math.random() * 2.5,
            "enemyProjectile"
          );
        }
      }

      if (p.type === "slingerBossFragShell") {
        p.lifeTimer = (typeof p.lifeTimer === "number" ? p.lifeTimer : 170) - frameScale;
        const targetX = typeof p.fragTargetX === "number" ? p.fragTargetX : p.x;
        const targetY = typeof p.fragTargetY === "number" ? p.fragTargetY : p.y;
        const shellRadius = typeof p.radius === "number" ? p.radius : 9;
        const distanceToTarget = Math.hypot(targetX - p.x, targetY - p.y);
        if (distanceToTarget <= Math.max(7, shellRadius + 1) || p.lifeTimer <= 0) {
          const fragmentCount = typeof p.fragmentCount === "number" ? p.fragmentCount : 8;
          const fragmentDamage = Math.max(0.5, typeof p.fragmentDamage === "number" ? p.fragmentDamage : (p.damage * 0.45));
          const fragmentRadius = typeof p.fragmentRadius === "number" ? p.fragmentRadius : 5.2;
          for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex++) {
            const fragmentAngle = (Math.PI * 2 * fragmentIndex) / fragmentCount;
            const fragmentSpeed = 1.2 + Math.random() * 0.25;
            spawnProjectile(
              targetX,
              targetY,
              Math.cos(fragmentAngle) * fragmentSpeed,
              Math.sin(fragmentAngle) * fragmentSpeed,
              fragmentDamage,
              fragmentRadius,
              "#ffb347",
              "slingerBossFragment"
            );
          }
          releaseProjectileAt(i);
          continue;
        }
      }

      // Removed projectile trail/tail update

      const projectileRadius = typeof p.radius === "number" ? p.radius : 4;
      const dist = Math.hypot(player.x - p.x, player.y - p.y);
      if (dist < player.radius + projectileRadius) {
        if (!window.godMode) { player.health -= p.damage; runHealthLost += p.damage; playPlayerHitSound(); }
        if (p.type === "bruteBossFireball") {
          emitBruteFireballNova(p.x, p.y, p.burnRadius);
          spawnBurningArea(p.x, p.y, {
            radius: p.burnRadius,
            duration: p.burnDuration,
            tickInterval: p.burnTickInterval,
            damage: p.burnDamage
          });
        }
        releaseProjectileAt(i);
        continue;
      }

      if (p.type === "bruteBossFireball" && p.lifeTimer <= 0) {
        emitBruteFireballNova(p.x, p.y, p.burnRadius);
        spawnBurningArea(p.x, p.y, {
          radius: p.burnRadius,
          duration: p.burnDuration,
          tickInterval: p.burnTickInterval,
          damage: p.burnDamage
        });
        releaseProjectileAt(i);
        continue;
      }

      if (p.x < -20 || p.x > canvas.width + 20 || p.y < -20 || p.y > canvas.height + 20) {
        releaseProjectileAt(i);
      }
    }
  }

  function updateParticles() {
    let xpDropParticleCount = 0;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.dx;
      p.y += p.dy;
      if (p.decay) {
        p.dx *= p.decay;
        p.dy *= p.decay;
      }
      p.life--;
      if (p.life <= 0) { releaseParticleAt(i); continue; }
      if (p.type === "xpDrop") xpDropParticleCount++;
    }

    if (xpDropParticleCount > MAX_XPDROP_PARTICLES) {
      let toRemove = xpDropParticleCount - MAX_XPDROP_PARTICLES;
      for (let i = 0; i < particles.length && toRemove > 0; i++) {
        if (particles[i].type === "xpDrop") {
          releaseParticleAt(i);
          i--;
          toRemove--;
        }
      }
    }

    if (particles.length > MAX_PARTICLES) {
      while (particles.length > MAX_PARTICLES) {
        releaseParticleAt(0);
      }
    }
  }

  function drawProjectiles() {
    for (let p of projectiles) {
      // Skip drawing if projectile is completely outside the canvas
      const r = typeof p.radius === "number" ? p.radius : 10;
      if (
        p.x + r < 0 ||
        p.x - r > canvas.width ||
        p.y + r < 0 ||
        p.y - r > canvas.height
      ) {
        continue;
      }
      // Remove tail and pulsing from all enemy projectiles (gruntboss, slinger, slinger boss, stalker)
      if (
        p.type === "bruteBossFireball" ||
        p.type === "slingerBossProjectile" ||
        p.type === "slingerBossFragment" ||
        p.type === "slingerBossFragShell" ||
        p.type === "slingerProjectile" ||
        p.type === "stalkerProjectile" ||
        p.type === "stalkerBossProjectile" ||
        p.type === "gruntBossProjectile"
      ) {
        ctx.save();
        const radius = typeof p.radius === "number" ? p.radius : 8;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color || "#ffb347";
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = "#fff2c0";
        ctx.fill();
        ctx.restore();
        continue;
      }

      // Pulsing glow
      ctx.save();

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

  // --- Cached lights array and pre-rendered glow canvas ---
  // Lights are static per canvas size, so we only rebuild when dimensions change.
  let _lights = null;
  let _lightGlowCanvas = null;
  let _lightCanvasCachedW = 0;
  let _lightCanvasCachedH = 0;

  function _buildLightsCache() {
    const W = canvas.width;
    const H = canvas.height;
    _lights = [
      {x: 115,         y: 220,      w: 8,  h: 45, intensity: 0.28, beamColor: "rgba(0,200,255,0.28)"},
      {x: 115,         y: H - 310,  w: 8,  h: 45, intensity: 0.28, beamColor: "rgba(0,200,255,0.28)"},
      {x: 340,         y: H - 130,  w: 45, h: 8,  intensity: 0.28, beamColor: "rgba(0,200,255,0.28)"},
      {x: W - 390,     y: H - 130,  w: 45, h: 8,  intensity: 0.28, beamColor: "rgba(0,200,255,0.28)"},
      {x: W - 120,     y: H - 310,  w: 8,  h: 45, intensity: 0.28, beamColor: "rgba(0,200,255,0.28)"},
      {x: W - 120,     y: 220,      w: 8,  h: 45, intensity: 0.28, beamColor: "rgba(0,200,255,0.28)"},
      {x: 340,         y: 90,       w: 45, h: 8,  intensity: 0.28, beamColor: "rgba(0,200,255,0.28)"},
      {x: W - 390,     y: 90,       w: 45, h: 8,  intensity: 0.28, beamColor: "rgba(0,200,255,0.28)"}
    ];
    // Pre-render all light glows onto an offscreen canvas once
    _lightGlowCanvas = document.createElement('canvas');
    _lightGlowCanvas.width = W;
    _lightGlowCanvas.height = H;
    const gc = _lightGlowCanvas.getContext('2d');
    gc.globalCompositeOperation = "lighter";
    for (const light of _lights) {
      const lx = light.x + light.w / 2;
      const ly = light.y + light.h / 2;
      const glowRadius = Math.max(light.w, light.h) * 4.2;
      const grad = gc.createRadialGradient(lx, ly, Math.max(light.w, light.h) * 0.5, lx, ly, glowRadius);
      grad.addColorStop(0, light.beamColor);
      grad.addColorStop(0.3, `rgba(0,200,255,${light.intensity * 0.36})`);
      grad.addColorStop(1, "rgba(0,0,0,0.0)");
      gc.beginPath();
      gc.arc(lx, ly, glowRadius, 0, Math.PI * 2);
      gc.fillStyle = grad;
      gc.fill();
    }
    _lightCanvasCachedW = W;
    _lightCanvasCachedH = H;
    // Pre-compute per-light shadow data used every frame in the enemy draw loop
    for (const light of _lights) {
      light._lx = light.x + light.w / 2;
      light._ly = light.y + light.h / 2;
      light._fadeEnd = Math.max(light.w, light.h) * 6.5;
      light._fadeStart = Math.max(light.w, light.h) * 1.2;
    }
  }

  let lastTimestamp = performance.now();
  let screenShake = 0;
  const SCREEN_SHAKE_ENEMY_TYPES = new Set([
    "brute",
    "gruntBossMinor",
    "shielder",
    "beamer",
    "gruntBoss",
    "bruteBoss",
    "slingerBoss",
    "stalkerBoss",
    "beamerBoss"
  ]);
  const SCREEN_SHAKE_BOSS_TYPES = new Set([
    "gruntBoss",
    "bruteBoss",
    "slingerBoss",
    "stalkerBoss",
    "beamerBoss"
  ]);

  let _lastDebugLog = 0;
  function gameLoop(currentTimestamp) {
    updateHudSignal(currentTimestamp);
    updateRunMenuTouchButtonVisibility();
    if (typeof isGameBlocked === 'function' && isGameBlocked()) {
      lastTimestamp = currentTimestamp;
      requestAnimationFrame(gameLoop);
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Calculate delta time in seconds
    const delta = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;

    // ...existing code...
    if (window._victoryAwaitingAcknowledgment) {
      paused = true;
      showStats = false;
    } else if (tutorialModalPause) {
      paused = true;
    } else if (window._introPhase) {
      paused = true;
      showStats = false;
    } else if (window._secondDeathPending) {
      // During second-death smoke, keep the game running and suppress the stats panel.
      paused = false;
      showStats = false;
    } else if (window._activateUnpauseTimeout) {
      paused = true;
      showStats = false;
    } else if (!followMouse && !gameOver) {
      paused = true;
      showStats = true;
    } else if (followMouse) {
      paused = false;
      showStats = false;
    }
    statsMenuAnimationProgress = Math.max(0, Math.min(1,
      statsMenuAnimationProgress + (showStats ? delta : -delta) / 0.35
    ));

    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (paused) {
      screenShake = 0;
    } else if (screenShake > 0) {
      shakeOffsetX = (Math.random() * 2 - 1) * screenShake;
      shakeOffsetY = (Math.random() * 2 - 1) * screenShake;
      screenShake = Math.max(0, screenShake - delta * 48);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image, fallback to clear if not loaded
    if (backgroundImg.complete && backgroundImg.naturalWidth > 0) {
      ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    }
    ctx.translate(shakeOffsetX, shakeOffsetY);

    // Rebuild lights cache if canvas size changed
    if (canvas.width !== _lightCanvasCachedW || canvas.height !== _lightCanvasCachedH) {
      _buildLightsCache();
    }
    const lights = _lights;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Draw pre-rendered light glows (single drawImage vs 8 createRadialGradient per frame)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(_lightGlowCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
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
      drawWaveAnnouncement(delta);
    } else {
      if (!gameStarted) {
        spawnWave();
        gameStarted = true;
      }

      // During game over confirmation window, keep particles ticking so the explosion stays alive
      if (!paused && gameOver && !window._gameOverConfirmDone) {
        updateParticles();
      }

      if (!paused && !gameOver) {
        updateHealthDrops();
        updateXPDrops();
        updateslingerDrops();
        updateBruteDrops();
        if (!freezeActive) {
          updateProtocolOrbs(delta);
        }
        updateMines(delta);
        updateParticles();
        // Only update movement if not frozen
        if (freezeActive) {
          freezeTimer -= delta;
          if (freezeTimer <= 0) {
            freezeActive = false;
            freezeTimer = 0;
          }
        }
        if (!freezeActive) {
          updatePlayer(delta);
          updateEnemies(delta);
        }
        if (!freezeActive) {
          updateProjectiles(delta);
        }
        autoAttack();
        handleWaveSpawning(delta);

        // ---- Boss music polling ----
        // True bosses are the gated bosses that define boss waves
        const BOSS_MUSIC_TYPES = ['gruntBoss', 'bruteBoss', 'slingerBoss', 'stalkerBoss'];
        const hasBeamerBoss = enemies.some(en => en.type === 'beamerBoss' && en.health > 0);
        const hasOtherBossEnemy = enemies.some(en => BOSS_MUSIC_TYPES.includes(en.type) && en.health > 0);
        if (!window._secondDeathPending && !window._bossSoundsStoppedForEndState) {
          if (hasBeamerBoss) {
            if (!window._beamerBossMusicActive) {
              window._beamerBossMusicActive = true;
              window._bossMusicallyActive = true;
              stopGameMusic();
              stopBossMusic();
              playBossMusic(
                BEAMER_BOSS_MUSIC_FILE,
                window.sentinelVolume && window.sentinelVolume.beamerBossMusic !== undefined
                  ? window.sentinelVolume.beamerBossMusic
                  : 0.45
              );
            }
          } else if (window._beamerBossMusicActive) {
            window._beamerBossMusicActive = false;
            window._bossMusicallyActive = false;
            stopAllMusic();
          } else if (hasOtherBossEnemy && !window._bossMusicallyActive) {
            window._bossMusicallyActive = true;
            // Pause game music immediately, then start the standard boss music
            _silenceGameMusicForBoss(() => { playBossMusic(); });
          } else if (!hasOtherBossEnemy && window._bossMusicallyActive) {
            window._bossMusicallyActive = false;
            // Fade out boss music, then resume game music
            fadeOutBossMusic(1000, () => { _restoreGameMusicFromBoss(800); });
          }
        }
        // ----------------------------
        
        // Always re-sync burstIndex and burstCount from global state before transition check
        if (window._sentinelWaveState) {
          if (typeof burstIndex !== 'undefined') burstIndex = window._sentinelWaveState.burstIndex;
          if (typeof burstCount !== 'undefined') burstCount = window._sentinelWaveState.burstCount;
        }
        const ctxWave = getWaveControlContext();
        
        // CRITICAL: For timeline waves, check if wave completed by verifying state was cleared
        const isUsingTimeline = window._editorWaveOverride && window._editorWaveOverride[wave] && window._editorWaveOverride[wave].timelineMode;
        let timelineWaveJustCompleted = false;
        if (isUsingTimeline && !window._timelineWaveState) {
          // Timeline state was cleared - wave completed
          timelineWaveJustCompleted = true;
        }
        
        // Use the actual endCondition from the wave's timeline configuration
        // Only timeline waves with 'boss' endCondition are boss-gated
        const endConditionIsBoss = window._timelineWaveState && window._timelineWaveState.endCondition === 'boss';
        const waveUsesBossGate = isUsingTimeline && endConditionIsBoss;
        const finalBurstReached = window._sentinelWaveState && window._sentinelWaveState.burstCount !== Infinity && window._sentinelWaveState.burstIndex >= window._sentinelWaveState.burstCount;
        
        const allEnemiesCleared = enemies.length === 0;
        // Timeline waves that just completed can always advance (their end condition was already verified)
        // Non-timeline waves advance when final burst reached, unless they're boss-gated
        const allowTimedOrClearAdvance = timelineWaveJustCompleted || (!waveUsesBossGate && finalBurstReached);
        
        // DEBUG: Log wave progression for waves 1-5
        if (wave <= 5 && window.debugWave) {
        }
        if (!window._victoryTriggered && allowTimedOrClearAdvance) {
          if (window.debugWaveTransition) {
          }
          if (!interWavePending) {
            interWavePending = true;
            interWaveDelayTimer = INTER_WAVE_DELAY_SECONDS;
          } else {
            interWaveDelayTimer -= delta;
          }
          const timerExpired = interWaveDelayTimer <= 0;
          const shouldAdvanceWave = allEnemiesCleared || timerExpired;
          if (shouldAdvanceWave) {
            // DEBUG: Log before advancing
            if (window.debugWaveTransition) {
            }
            interWavePending = false;
            interWaveDelayTimer = 0;
            wave++;
            runWavesCleared++;
            triggerVictoryIfFinalWaveCleared();
            // Auto-unlock the next wave for future runs (for waves 1-50)
            if (!window._victoryTriggered && wave <= FINAL_CAMPAIGN_WAVE && typeof unlockWave === "function") {
              unlockWave(wave);
            }
            
            if (!window._victoryTriggered) {
              try {
                playSound('warning.wav', window.sentinelVolume && window.sentinelVolume.warning !== undefined ? window.sentinelVolume.warning : 1.0);
              } catch (e) {}
              spawnWave();
              burstTimer = burstInterval;
            }
          }
        } else {
          interWavePending = false;
          interWaveDelayTimer = 0;
        }
      }



      //-======================DROPS, MINES, AND PARTICLES======================-
      // Draw drops with glow (drawn before player/enemies for z-index effect)
      xpDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ff33ff";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#ff31ff";
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      // Slinger drop glow
      slingerDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ffc250";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      // Brute drop glow
      bruteDrops.forEach(d => {
        const _hpPulse = 0.85 + Math.sin(Date.now() * 0.006) * 0.15;
        const _hpRadius = 9 * _hpPulse;
        ctx.save();
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 22 + _hpPulse * 10;
        ctx.fillStyle = "#ff1717";
        ctx.beginPath();
        ctx.arc(d.x, d.y, _hpRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,120,120,${0.45 + _hpPulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, _hpRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      // Health drop glow (no pulsating)
      healthDrops.forEach(d => {
        ctx.save();
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 22;
        ctx.fillStyle = "#ff1717";
        ctx.beginPath();
        ctx.arc(d.x, d.y, 9, 0, Math.PI * 2);
        ctx.fill();
        // bright inner highlight
        ctx.fillStyle = "rgba(255,120,120,0.6)";
        ctx.beginPath();
        ctx.arc(d.x, d.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Protocol orb glow (attackable discovery drops)
      protocolOrbs.forEach(orb => {
        const pulse = 0.85 + Math.sin(Date.now() * 0.008) * 0.15;
        const progress = orb.requiredFrames > 0 ? Math.min(1, orb.progressFrames / orb.requiredFrames) : 0;
        const coreRadius = orb.radius * pulse;
        const outerRadius = orb.radius * (1.9 + progress * 0.5);
        const _orbTier = (PROTOCOLS[orb.protocolName] && PROTOCOLS[orb.protocolName].tier) || "Standard";
        const coreColor = getProtocolRarityColor(orb.rarity, _orbTier);
        const edgeColor = getProtocolRarityEdgeColor(orb.rarity, _orbTier);

        ctx.save();
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 20;
        const grad = ctx.createRadialGradient(orb.x, orb.y, 1, orb.x, orb.y, outerRadius);
        grad.addColorStop(0, coreColor);
        grad.addColorStop(0.45, edgeColor);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, outerRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.globalAlpha = 0.75;
        ctx.fill();

        // Progress ring while attacking over time
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#e8ffff";
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
        ctx.stroke();
        ctx.restore();
      });

      // Draw mines before player/enemies for proper z-index
      drawMines();

      //laser, enemyHit, levelUp, xpDrop, slingerDrop, bruteDrop, healthDrop, enemyDeath,
      drawParticlesBatched(["xpDrop","slingerDrop","bruteDrop","healthDrop","enemyDeath","dust","novaFlare","burnZone","gruntNova"]);






      //-======================PLAYER AND ENEMIES======================-
      // Draw health bar and XP bar above the player (no numbers)
      function drawPlayerBars() {
        // Show freeze countdown if active
        if (typeof freezeActive !== 'undefined' && freezeActive && typeof freezeTimer === 'number' && freezeTimer > 0) {
          ctx.save();
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = "#ffe26c";
          ctx.textAlign = "center";
          ctx.shadowColor = "#000";
          ctx.shadowBlur = 6;
          const barWidth = player.radius * 2.2;
          const barX = player.x - barWidth / 2;
          const barY = player.y - player.radius - 10;
          // Centered higher above health bar
          ctx.fillText(freezeTimer.toFixed(1) + "s", barX + barWidth / 2, barY - 18);
          ctx.restore();
        }
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
        const healthBarY = barY;

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
        const xpBarY = barY;
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#222";
        ctx.fillStyle = "#0cf";
        ctx.beginPath();
        ctx.rect(barX, barY, barWidth, barHeight);
        ctx.stroke();
        ctx.fillRect(barX, barY, barWidth * (xp / xpToLevel), barHeight);
        ctx.restore();

        if (statPoints > 0) {
          const arrowX = barX + barWidth + 10;
          const arrowTopY = xpBarY - 2;
          const arrowBottomY = healthBarY + barHeight + 2;
          const arrowMidY = arrowTopY + 6;
          ctx.save();
          ctx.strokeStyle = "#00ff88";
          ctx.fillStyle = "#00ff88";
          ctx.shadowColor = "#00ff88";
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(arrowX, arrowBottomY);
          ctx.lineTo(arrowX, arrowMidY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arrowX, arrowTopY);
          ctx.lineTo(arrowX - 4, arrowMidY);
          ctx.lineTo(arrowX + 4, arrowMidY);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        if (bytePickupNotifications.length > 0) {
          for (let notificationIndex = bytePickupNotifications.length - 1; notificationIndex >= 0; notificationIndex--) {
            const notification = bytePickupNotifications[notificationIndex];
            if (!paused) notification.timer -= 1;
            if (notification.timer <= 0) {
              bytePickupNotifications.splice(notificationIndex, 1);
              continue;
            }

            const lifeRatio = Math.max(0, Math.min(1, notification.timer / Math.max(1, notification.maxTimer || 80)));
            const rise = (1 - lifeRatio) * 20;
            const yOffset = notificationIndex * 14;
            // Centered above the health bar
            const textX = barX + barWidth / 2;
            const textY = healthBarY - 18 - yOffset - rise;

            ctx.save();
            ctx.globalAlpha = lifeRatio;
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ffd84d";
            ctx.shadowColor = "#ffd84d";
            ctx.shadowBlur = 10;
            ctx.fillText(`+${formatByteAmount(notification.amount)}`, textX, textY);
            ctx.restore();
          }
        }
      }

      // Intro phase: manually drive hover drift so player bobs while paused
      if (window._introPhase) {
        player._hoverPhase = (player._hoverPhase || 0) + 0.07 * delta * 60;
        const _ihr = 4;
        player.x = (window._introBaseX || player.x) + Math.cos(player._hoverPhase) * _ihr;
        player.y = (window._introBaseY || player.y) + Math.sin(player._hoverPhase * 0.93) * _ihr * 0.58;
      }

      // Compute intro fade alpha for player sprite — invisible until explosion fires
      let _introAlpha = 1;
      if (window._introPhase === "animating") {
        _introAlpha = 0;
      }

      // Player feedback: green flash when level up, red blink when hit
      let feedbackColor = null;
      let feedbackAlpha = 0;
      if (!window._secondDeathPending && !gameOver && playerLevelUpTimer > 0) {
        feedbackColor = "#00d9ff";
        // Blink: on for 6 frames, off for 6 frames, fade out in last 60 frames
        const blinkOn = Math.floor(playerLevelUpTimer / 6) % 2 === 0;
        feedbackAlpha = blinkOn ? 0.45 * Math.min(1, playerLevelUpTimer / 60) : 0;
      } else if (!window._secondDeathPending && !gameOver && player.hitFlashTimer > 0) {
        feedbackColor = "#ff2222";
        // Blink: on for 6 frames, off for 6 frames
        const blinkOn = Math.floor(player.hitFlashTimer / 6) % 2 === 0;
        feedbackAlpha = blinkOn ? 0.45 * Math.min(1, player.hitFlashTimer / 20) : 0;
      }

      if (playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = _introAlpha;
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
          const lx = light._lx;
          const ly = light._ly;
          const fadeEnd = light._fadeEnd;
          const dx = player.x - lx;
          const dy = player.y - ly;
          const dist = Math.hypot(dx, dy);
          if (dist >= fadeEnd) return; // outside shadow range, skip
          // Fade shadow: max opacity when close, fades out as distance increases
          const fadeStart = light._fadeStart;
          let shadowAlpha = 0;
          if (dist < fadeStart) {
            shadowAlpha = 0.38;
          } else {
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

        // Cyan glow when stat points are available
        let angle = window._playerToEnemyAngle || 0;
        if (statPoints > 0) {
          ctx.shadowColor = "#00d9ff";
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
        ctx.globalAlpha = _introAlpha;
        // Cyan glow when stat points are available
        if (statPoints > 0) {
          ctx.shadowColor = "#00d9ff";
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
      if (!window._introPhase && !window._secondDeathPending && !gameOver) drawPlayerBars();
      // (Removed health number on player)

      // ---- Intro animation overlay ----
      if (window._introPhase) {
        const _iNow = performance.now();
        const _iElapsed = (_iNow - (window._introStartTime || _iNow)) / 1000;
        const _iT = Math.min(1, _iElapsed / 1.8);

        // Transition: animating → waiting at t=1 — player snaps fully visible
        if (_iElapsed >= 1.8 && window._introPhase === "animating") {
          window._introPhase = "waiting";
          const _bx = window._introBaseX || player.x;
          const _by = window._introBaseY || player.y;
          window._introFlashTimer = 0.18; // bright flash overlay duration (seconds)
        }

        // Teleport-in particles: spawn far out, converge inward toward player center
        if (window._introPhase === "animating") {
          if (!window._introParticles) window._introParticles = [];
          const _iParts = window._introParticles;
          const spawnCount = 4 + Math.floor(Math.random() * 4);
          for (let _si = 0; _si < spawnCount; _si++) {
            const _angle = Math.random() * Math.PI * 2;
            const _spawnDist = 55 + Math.random() * 90; // start far from player
            const _life = 22 + Math.random() * 38;
            const _size = 1.5 + Math.random() * 5;
            const _colors = ["#00ffdc", "#00c8ff", "#aaf6ff", "#ffffff", "#66ffee"];
            const _sx = (window._introBaseX || player.x) + Math.cos(_angle) * _spawnDist;
            const _sy = (window._introBaseY || player.y) + Math.sin(_angle) * _spawnDist;
            // velocity points inward toward the player center
            const _speed = (_spawnDist / _life) * (0.85 + Math.random() * 0.3);
            _iParts.push({
              x: _sx, y: _sy,
              vx: -Math.cos(_angle) * _speed,
              vy: -Math.sin(_angle) * _speed,
              size: _size,
              life: _life, maxLife: _life,
              color: _colors[Math.floor(Math.random() * _colors.length)]
            });
          }
          // Update & draw converging particles
          for (let _pi = _iParts.length - 1; _pi >= 0; _pi--) {
            const _p = _iParts[_pi];
            _p.x += _p.vx; _p.y += _p.vy;
            _p.life -= 1;
            if (_p.life <= 0) { _iParts.splice(_pi, 1); continue; }
            const _frac = _p.life / _p.maxLife; // 1→0 as particle nears center
            const _pa = Math.min(1, _frac * 2) * _iT; // fade in then out
            ctx.save();
            ctx.globalAlpha = _pa;
            ctx.shadowColor = _p.color; ctx.shadowBlur = _p.size * 4;
            ctx.fillStyle = _p.color;
            ctx.beginPath();
            ctx.arc(_p.x, _p.y, _p.size * (0.4 + 0.6 * _frac), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Energy ring: expands outward then contracts as the sprite brightens
          // At t<0.5: ring expands; t>0.5: ring shrinks and sprite is nearly solid
          const _ringPhase = _iT < 0.5 ? _iT * 2 : 2 - _iT * 2; // 0→1→0
          const _ringR = player.radius * (1.1 + _ringPhase * 3.5);
          const _ringAlpha = _ringPhase * 0.75 * _iT;
          if (_ringAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = _ringAlpha;
            ctx.strokeStyle = "#00ffdd";
            ctx.shadowColor = "#00ffdd"; ctx.shadowBlur = 28;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(player.x, player.y, _ringR, 0, Math.PI * 2);
            ctx.stroke();
            // second softer ring slightly larger
            ctx.globalAlpha = _ringAlpha * 0.4;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(player.x, player.y, _ringR * 1.18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        } else if (window._introParticles && window._introParticles.length) {
          // Drain any remaining particles after animation ends
          const _iParts = window._introParticles;
          for (let _pi = _iParts.length - 1; _pi >= 0; _pi--) {
            const _p = _iParts[_pi];
            _p.life -= 3;
            if (_p.life <= 0) { _iParts.splice(_pi, 1); continue; }
            const _pa = (_p.life / _p.maxLife) * 0.5;
            ctx.save();
            ctx.globalAlpha = _pa;
            ctx.shadowColor = _p.color; ctx.shadowBlur = 4;
            ctx.fillStyle = _p.color;
            ctx.beginPath();
            ctx.arc(_p.x, _p.y, _p.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // White flash ring drawn on the frame(s) immediately after explosion
        if (window._introFlashTimer > 0) {
          window._introFlashTimer -= delta;
          const _ft = Math.max(0, window._introFlashTimer / 0.18); // 1→0
          const _bx = window._introBaseX || player.x;
          const _by = window._introBaseY || player.y;
          // Expanding white disc flash
          ctx.save();
          ctx.globalAlpha = _ft * 0.85;
          ctx.globalCompositeOperation = "lighter";
          const _fGrad = ctx.createRadialGradient(_bx, _by, 0, _bx, _by, player.radius * (2.5 + (1 - _ft) * 4));
          _fGrad.addColorStop(0, "rgba(255,255,255,1)");
          _fGrad.addColorStop(0.35, "rgba(180,255,240,0.7)");
          _fGrad.addColorStop(1, "rgba(0,255,200,0)");
          ctx.beginPath();
          ctx.arc(_bx, _by, player.radius * (2.5 + (1 - _ft) * 4), 0, Math.PI * 2);
          ctx.fillStyle = _fGrad;
          ctx.fill();
          ctx.restore();
          // Hard bright ring
          ctx.save();
          ctx.globalAlpha = _ft;
          ctx.strokeStyle = "#ffffff";
          ctx.shadowColor = "#00ffdd"; ctx.shadowBlur = 40;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(_bx, _by, player.radius * (1.4 + (1 - _ft) * 5), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      // ---- End intro animation ----

      enemies.forEach(e => {
                const isStalkerIllusion = e.type === "stalkerBoss" && e.stalkerBossIllusion;
                const showBossHealthBar =
                  (e.type === "gruntBoss" || e.type === "bruteBoss" || e.type === "slingerBoss" || e.type === "stalkerBoss" || e.type === "beamerBoss") &&
                  !e.stalkerBossIllusion;
                const showIllusionHealthBar =
                  isStalkerIllusion && e.health > 0 && !e.stalkerBossPhase3Hidden;
                if (showBossHealthBar || showIllusionHealthBar) {
                  const barWidth = 80;
                  const barHeight = 8;
                  const barX = e.x - barWidth / 2;
                  const barY = e.type === "beamerBoss"
                    ? e.y - e.radius * 2.1 - 49
                    : e.y - e.radius - 39;
                  const healthBarSource = showIllusionHealthBar
                    ? enemies.find(candidate =>
                      candidate.type === "stalkerBoss" &&
                      !candidate.stalkerBossIllusion &&
                      candidate.stalkerBossIllusionGroupId === e.stalkerBossIllusionOwner
                    ) || e
                    : e;
                  if (typeof healthBarSource.maxHealth !== "number" || healthBarSource.maxHealth < healthBarSource.health) {
                    healthBarSource.maxHealth = Math.max(1, healthBarSource.health);
                  }
                  const bossHealthRatio = Math.max(
                    0,
                    Math.min(1, healthBarSource.health / Math.max(1, healthBarSource.maxHealth))
                  );
                  ctx.save();
                  ctx.globalAlpha = 0.92;
                  ctx.lineWidth = 3;
                  ctx.strokeStyle = "#222";
                  ctx.fillStyle = e.type === "beamerBoss" ? "#27dfff" : (e.type === "bruteBoss" ? "#ff6a00" : (e.type === "slingerBoss" ? "#ff9f1a" : "#e00000"));
                  ctx.beginPath();
                  ctx.rect(barX, barY, barWidth, barHeight);
                  ctx.stroke();
                  ctx.fillRect(barX, barY, barWidth * bossHealthRatio, barHeight);
                  // Draw boss label
                  const _showBossName = false;
                  if (_showBossName) {
                    ctx.font = "bold 13px sans-serif";
                    ctx.fillStyle = "#fff";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    ctx.fillText(e.type === "beamerBoss" ? "Beamer Major" : (e.type === "bruteBoss" ? "Brute Major" : (e.type === "slingerBoss" ? "Slinger Major" : (e.type === "stalkerBoss" ? "Stalker Major" : "Shard Major"))), e.x, barY - 2);
                  }
                  ctx.restore();
                }
        // Hover effect (visual only) for slinger and stalker
        let hoverX = e.x;
        let hoverY = e.y;
        if (e.type === "slinger" || e.type === "slingerBoss" || e.type === "stalker" || e.type === "stalkerBoss" || e.type === "bruteBoss" || e.type === "beamer" || e.type === "shielder") {
          if (typeof e.hoverOffset === "undefined") e.hoverOffset = Math.random() * Math.PI * 2;
          e.hoverOffset += 0.04;
          const hoverRadius = (e.type === "stalker" || e.type === "stalkerBoss" || e.type === "bruteBoss" || e.type === "slingerBoss") ? 2.8 : (e.type === "beamer" ? 2.5 : (e.type === "shielder" ? 2.3 : 2.2));
          hoverX = e.x + Math.cos(e.hoverOffset) * hoverRadius;
          hoverY = e.y + Math.sin(e.hoverOffset * 0.93) * (hoverRadius * 0.58);
        }

        // Draw fading shadows from each light
        ctx.save();
        ctx.translate(e.x, e.y);
        lights.forEach(light => {
          const lx = light._lx;
          const ly = light._ly;
          const fadeEnd = light._fadeEnd;
          const dx = e.x - lx;
          const dy = e.y - ly;
          const dist = Math.hypot(dx, dy);
          if (dist >= fadeEnd) return; // outside shadow range, skip
          const fadeStart = light._fadeStart;
          let shadowAlpha = 0;
          if (dist < fadeStart) {
            shadowAlpha = 0.38;
          } else {
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
            if (e.type === "brute" || e.type === "bruteBoss") {
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

        if (e.shielded) {
          ctx.save();
          const shieldBaseX = hoverX;
          const shieldBaseY = hoverY;
          const shieldRadius = e.radius + 6;
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = "rgba(125, 255, 230, 0.38)";
          ctx.shadowColor = "#7dffe6";
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(shieldBaseX, shieldBaseY, shieldRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.82;
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#d8fff4";
          ctx.beginPath();
          ctx.arc(shieldBaseX, shieldBaseY, shieldRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        // Removed shadowColor and shadowBlur for grunt
        ctx.beginPath();
        ctx.arc(e.x, e.y, (e.radius > 20 ? 40 : 20), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 80, 80, 0.0)";
        ctx.lineWidth = 1; ctx.stroke();
        // Draw magenta grunt with grunt image
        if (e.type === "grunt" && e.color === "magenta") {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(e.spinAngle);
          ctx.drawImage(gruntImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        // Draw grunt boss minor (Grunt Heavy) with grunt heavy image
        } else if (e.type === "gruntBossMinor") {
          ctx.save();
          ctx.translate(e.x, e.y);
          // No rotation for grunt heavy
          ctx.drawImage(gruntHeavyImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        } else if (e.type === "gruntBoss") {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(0); // No rotation for grunt boss
          ctx.drawImage(gruntBossImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        } else if (e.type === "brute" || e.type === "bruteBoss") {
          if (e.type === "bruteBoss" && e.bruteBossAttackPhase === 3) {
            const coneRange = e.bruteBossInfernoRange || 0;
            for (const coneAngle of e.bruteBossInfernoAngles || []) {
              ctx.save();
              const flameGradient = ctx.createRadialGradient(
                e.x,
                e.y,
                0,
                e.x,
                e.y,
                Math.max(1, coneRange)
              );
              flameGradient.addColorStop(0, "rgba(255, 66, 0, 0.025)");
              flameGradient.addColorStop(0.65, "rgba(255, 90, 0, 0.06)");
              flameGradient.addColorStop(1, "rgba(255, 210, 55, 0.14)");
              ctx.globalAlpha = 0.75;
              ctx.fillStyle = flameGradient;
              ctx.shadowColor = "#ff5a00";
              ctx.shadowBlur = 5;
              ctx.strokeStyle = "rgba(255, 209, 102, 0.18)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(e.x, e.y);
              ctx.arc(e.x, e.y, coneRange, coneAngle - Math.PI / 7, coneAngle + Math.PI / 7);
              ctx.closePath();
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.globalAlpha = 0.25;
              ctx.stroke();
              ctx.restore();
            }
          }
          ctx.save();
          ctx.translate(hoverX, hoverY);
          const bruteSprite = e.type === "bruteBoss" ? bruteBossImg : bruteImg;
          ctx.drawImage(bruteSprite, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
          // Draw nova circle with cue
          if (e.type !== "bruteBoss" || e.bruteBossAttackPhase === 1) {
            ctx.save();
            ctx.globalAlpha = 0.32;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.novaRadius || (e.radius + 8), 0, Math.PI * 2);
            if (e.type === "bruteBoss") {
              ctx.strokeStyle = e.novaCue ? "#ff8a00" : "#ffaa00";
              ctx.shadowColor = e.novaCue ? "#ff8a00" : "#ffaa00";
              ctx.shadowBlur = e.novaCue ? 22 : 10;
            } else {
              ctx.strokeStyle = e.novaCue ? "#fff200" : "#ff6600";
              ctx.shadowColor = e.novaCue ? "#fff200" : "#ff6600";
              ctx.shadowBlur = e.novaCue ? 24 : 12;
            }
            ctx.stroke();
            ctx.restore();
          }
        } else if (e.type === "slinger" || e.type === "slingerBoss") {
          ctx.save();
          ctx.translate(hoverX, hoverY);
          if (e.type === "slingerBoss") {
            const phaseFlash = e._bossPhaseStunTimer > 0 && Math.floor(Date.now() / 90) % 2 === 0;
            ctx.globalAlpha = phaseFlash ? 0.6 : 1;
            ctx.drawImage(slingerBossImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          } else {
            ctx.drawImage(slingerImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          }
          ctx.restore();
        } else if (e.type === "kamikaze") {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.drawImage(kamikazeImg, -e.radius * 2, -e.radius * 2, e.radius * 4, e.radius * 4);
          ctx.restore();
        } else if (e.type === "stalker") {
          // Reverted: No afterimages for blink, just normal stalker rendering

          // Draw main stalker
          ctx.save();
          ctx.translate(hoverX, hoverY);
          const stalkerAlpha = typeof e.stalkerAlpha === "number" ? e.stalkerAlpha : 0.9;
          ctx.globalAlpha = stalkerAlpha;
          if (stalkerImg && stalkerImg.complete && stalkerImg.naturalWidth > 0) {
            const drawScale = 4.1;
            ctx.drawImage(stalkerImg, -e.radius * drawScale / 2, -e.radius * drawScale / 2, e.radius * drawScale, e.radius * drawScale);
          } else {
            ctx.fillStyle = "#66e8ff";
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = Math.max(0.1, stalkerAlpha * 0.85);
            ctx.strokeStyle = "#b7f6ff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        } else if (e.type === "stalkerBoss") {
          // Draw stalker boss with alpha blinking
          ctx.save();
          ctx.translate(hoverX, hoverY);
          const stalkerAlpha = typeof e.stalkerAlpha === "number" ? e.stalkerAlpha : 0.9;
          ctx.globalAlpha = stalkerAlpha;
          if (stalkerBossImg && stalkerBossImg.complete && stalkerBossImg.naturalWidth > 0) {
            const drawScale = 4.3;
            ctx.drawImage(stalkerBossImg, -e.radius * drawScale / 2, -e.radius * drawScale / 2, e.radius * drawScale, e.radius * drawScale);
          } else {
            ctx.fillStyle = "#1a1a1a";
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 0.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = Math.max(0.15, stalkerAlpha * 0.9);
            ctx.strokeStyle = "#4a8aaa";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        } else if (e.type === "beamerBoss") {
          const phase = e.beamerBossPhase;
          const angle = typeof e.beamerBossFacingAngle === "number" ? e.beamerBossFacingAngle : 0;
          const beamLength = typeof e.beamerBossBeamLength === "number" ? e.beamerBossBeamLength : Math.hypot(canvas.width, canvas.height) + 120;
          const emitterOffset = e.radius * 1.8;
          const spinBeamReach = Math.max(emitterOffset, Math.min(beamLength, e.beamerBossSpinBeamReach || 0));
          const novaGapCount = Math.max(1, e.beamerBossNovaGapCount || 8);
          const novaSectorAngle = (Math.PI * 2) / novaGapCount;
          const novaArcLength = novaSectorAngle * (e.beamerBossNovaArcFraction || 0.68);
          const novaGapOffset = typeof e.beamerBossNovaGapOffset === "number" ? e.beamerBossNovaGapOffset : 0;
          const drawBeam = (beamAngle, startDistance, endDistance, color, width, alpha, blur) => {
            const beamX = Math.cos(beamAngle);
            const beamY = Math.sin(beamAngle);
            const startX = e.x + beamX * startDistance;
            const startY = e.y + beamY * startDistance;
            const endX = e.x + beamX * endDistance;
            const endY = e.y + beamY * endDistance;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.lineCap = "round";
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.shadowColor = color;
            ctx.shadowBlur = blur;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.restore();
          };
          const drawNovaRing = (radius, alpha, width, blur) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = "#66e7ff";
            ctx.lineWidth = width;
            ctx.shadowColor = "#00bfff";
            ctx.shadowBlur = blur;
            for (let segment = 0; segment < novaGapCount; segment++) {
              const startAngle = novaGapOffset + segment * novaSectorAngle;
              ctx.beginPath();
              ctx.arc(e.x, e.y, radius, startAngle, startAngle + novaArcLength);
              ctx.stroke();
            }
            ctx.restore();
          };
          const drawSpinChargeWaves = (spinAngle, beamCount, progress, elapsed) => {
            ctx.save();
            ctx.shadowColor = "#00bfff";
            ctx.shadowBlur = 12 + progress * 12;
            ctx.strokeStyle = "#9af4ff";
            for (let beamIndex = 0; beamIndex < beamCount; beamIndex++) {
              const direction = spinAngle + (Math.PI * 2 * beamIndex) / beamCount;
              const beamX = Math.cos(direction);
              const beamY = Math.sin(direction);
              for (let waveIndex = 0; waveIndex < 3; waveIndex++) {
                const waveProgress = (elapsed * 0.045 + waveIndex / 3) % 1;
                const pulseDistance = emitterOffset + 6 + waveProgress * 42;
                const pulseRadius = 3 + Math.sin(waveProgress * Math.PI) * 5;
                ctx.globalAlpha = (1 - waveProgress * 0.5) * (0.35 + progress * 0.45);
                ctx.lineWidth = 1.5 + progress * 1.5;
                ctx.beginPath();
                ctx.arc(
                  e.x + beamX * pulseDistance,
                  e.y + beamY * pulseDistance,
                  pulseRadius,
                  0,
                  Math.PI * 2
                );
                ctx.stroke();
              }
            }
            ctx.restore();
          };

          if (phase === "spinCharge") {
            const chargeDuration = e.beamerBossSpinChargeDuration || 60;
            const progress = 1 - Math.max(0, e.beamerBossSpinChargeTimer) / chargeDuration;
            const elapsed = chargeDuration - Math.max(0, e.beamerBossSpinChargeTimer);
            const spinAngle = typeof e.beamerBossSpinAngle === "number" ? e.beamerBossSpinAngle : angle;
            const beamCount = typeof e.beamerBossSpinBeamCount === "number"
              ? e.beamerBossSpinBeamCount
              : e.beamerBossHealthPhase === 2 ? 4 : e.beamerBossHealthPhase >= 3 ? 8 : 2;
            drawSpinChargeWaves(spinAngle, beamCount, progress, elapsed);
          } else if (phase === "spin") {
            const spinAngle = typeof e.beamerBossSpinAngle === "number" ? e.beamerBossSpinAngle : angle;
            const beamCount = typeof e.beamerBossSpinBeamCount === "number"
              ? e.beamerBossSpinBeamCount
              : e.beamerBossHealthPhase === 2 ? 4 : e.beamerBossHealthPhase >= 3 ? 8 : 2;
            for (let beamIndex = 0; beamIndex < beamCount; beamIndex++) {
              const direction = spinAngle + (Math.PI * 2 * beamIndex) / beamCount;
              drawBeam(direction, emitterOffset, spinBeamReach, "#00bfff", 12, 0.62, 24);
              drawBeam(direction, emitterOffset, spinBeamReach, "#d4f7ff", 3, 0.92, 8);
            }
            const spinDuration = 600;
            const spinTimer = typeof e.beamerBossSpinTimer === "number" ? e.beamerBossSpinTimer : spinDuration;
            const chargeDuration = e.beamerBossSpinChargeDuration || 60;
            drawSpinChargeWaves(
              spinAngle,
              beamCount,
              1,
              chargeDuration + Math.max(0, spinDuration - spinTimer)
            );
          } else if (phase === "aimCharge") {
            const chargeDuration = e.beamerBossChargeDuration || 90;
            const progress = 1 - Math.max(0, e.beamerBossChargeTimer) / chargeDuration;
            drawBeam(angle, emitterOffset, beamLength, "#ff674d", 2 + progress * 2, 0.48 + progress * 0.35, 18 + progress * 12);
            ctx.save();
            ctx.globalAlpha = 0.35 + progress * 0.55;
            ctx.fillStyle = "#b9f4ff";
            ctx.shadowColor = "#16cfff";
            ctx.shadowBlur = 14 + progress * 30;
            ctx.beginPath();
            ctx.arc(hoverX, hoverY, 8 + progress * 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (phase === "fire") {
            const shotAngle = e.beamerBossShotAngle;
            const tailDistance = Math.min(beamLength, e.beamerBossShotTail);
            const headDistance = Math.min(beamLength, e.beamerBossShotHead);
            drawBeam(shotAngle, emitterOffset + tailDistance, emitterOffset + headDistance, "#00bfff", 14, 0.78, 28);
            drawBeam(shotAngle, emitterOffset + tailDistance, emitterOffset + headDistance, "#e5fbff", 4, 1, 10);
          } else if (phase === "novaCharge") {
            const chargeDuration = e.beamerBossNovaChargeDuration || 150;
            const progress = 1 - Math.max(0, e.beamerBossNovaChargeTimer) / chargeDuration;
            const maxRadius = typeof e.beamerBossNovaMaxRadius === "number" ? e.beamerBossNovaMaxRadius : beamLength;
            const previewRadius = Math.max(e.radius + 20, maxRadius * progress);
            drawNovaRing(previewRadius, 0.2 + progress * 0.55, 3 + progress * 5, 12 + progress * 24);
          } else if (phase === "nova") {
            const maxRadius = typeof e.beamerBossNovaMaxRadius === "number" ? e.beamerBossNovaMaxRadius : beamLength;
            const progress = maxRadius > 0 ? e.beamerBossNovaRadius / maxRadius : 1;
            drawNovaRing(e.beamerBossNovaRadius, Math.max(0.18, 0.9 - progress * 0.68), Math.max(3, 14 - progress * 8), 24);
          }

          ctx.save();
          ctx.translate(hoverX, hoverY);
          ctx.rotate(angle);
          const phaseFlash = e.beamerBossStunTimer > 0 && Math.floor(Date.now() / 90) % 2 === 0;
          ctx.globalAlpha = phaseFlash ? 0.75 : 1;
          if (beamerBossImg && beamerBossImg.complete && beamerBossImg.naturalWidth > 0) {
            const drawScale = 4.2;
            ctx.drawImage(beamerBossImg, -e.radius * drawScale / 2, -e.radius * drawScale / 2, e.radius * drawScale, e.radius * drawScale);
          } else {
            ctx.fillStyle = "#1c7fb2";
            ctx.shadowColor = "#00d9ff";
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#c8f7ff";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          if (phaseFlash) {
            ctx.strokeStyle = "#d4f7ff";
            ctx.lineWidth = 4;
            ctx.shadowColor = "#00d9ff";
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 2.1 + 8, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        } else if (e.type === "beamer") {
          ctx.save();
          ctx.translate(hoverX, hoverY);
          const beamGlow = typeof e.beamGlow === "number" ? e.beamGlow : 0.12;
          const beamerAlpha = typeof e.beamerAlpha === "number" ? e.beamerAlpha : 1;
          const beamerFacingAngle = typeof e.beamerFacingAngle === "number" ? e.beamerFacingAngle : Math.atan2(player.y - hoverY, player.x - hoverX);
          const castAlpha = e.beamCastTimer > 0 ? 0.78 : 1;
          ctx.globalAlpha = castAlpha * beamerAlpha;
          ctx.rotate(beamerFacingAngle);
          if (beamerImg && beamerImg.complete && beamerImg.naturalWidth > 0) {
            const drawScale = 4.2;
            ctx.drawImage(beamerImg, -e.radius * drawScale / 2, -e.radius * drawScale / 2, e.radius * drawScale, e.radius * drawScale);
          } else {
            ctx.fillStyle = "#5ecfff";
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 0.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#d6f3ff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          if ((e.beamCastTimer > 0 || e.beamActiveTimer > 0) && typeof e.beamAngle === "number") {
            const beamStartX = hoverX;
            const beamStartY = hoverY;
            const beamLength = typeof e.beamLength === "number" ? e.beamLength : 460;
            const isActiveBeam = e.beamActiveTimer > 0;
            const beamHeadDist = isActiveBeam
              ? Math.max(0, Math.min(beamLength, typeof e.beamTravelHead === "number" ? e.beamTravelHead : beamLength))
              : beamLength;
            const beamTailDist = isActiveBeam
              ? Math.max(0, Math.min(beamHeadDist, typeof e.beamTravelTail === "number" ? e.beamTravelTail : 0))
              : 0;
            const beamSegStartX = beamStartX + Math.cos(e.beamAngle) * beamTailDist;
            const beamSegStartY = beamStartY + Math.sin(e.beamAngle) * beamTailDist;
            const beamSegEndX = beamStartX + Math.cos(e.beamAngle) * beamHeadDist;
            const beamSegEndY = beamStartY + Math.sin(e.beamAngle) * beamHeadDist;
            const beamAlpha = (isActiveBeam ? 0.75 : 0.5) * (typeof e.beamerAlpha === "number" ? e.beamerAlpha : 1);
            const beamWidth = e.beamActiveTimer > 0 ? 5.5 : 1.6;
            const beamLineColor = isActiveBeam ? "#6ad3ff" : "#ff2222";
            const beamShadowColor = isActiveBeam ? "#4ecbff" : "#ff2c2c";
            const beamCoreColor = isActiveBeam ? "#d4f5ff" : "#ffd0d0";
            const beamTipColor = isActiveBeam ? "#dcf8ff" : "#ffdede";

            ctx.save();
            ctx.globalAlpha = beamAlpha;
            ctx.strokeStyle = beamLineColor;
            ctx.lineWidth = beamWidth;
            ctx.shadowColor = beamShadowColor;
            ctx.shadowBlur = isActiveBeam ? 20 : 14;
            ctx.beginPath();
            ctx.moveTo(beamSegStartX, beamSegStartY);
            ctx.lineTo(beamSegEndX, beamSegEndY);
            ctx.stroke();

            if (isActiveBeam) {
              ctx.globalAlpha = 0.75;
              ctx.lineWidth = 2;
              ctx.strokeStyle = beamCoreColor;
              ctx.beginPath();
              ctx.moveTo(beamSegStartX, beamSegStartY);
              ctx.lineTo(beamSegEndX, beamSegEndY);
              ctx.stroke();

              ctx.globalAlpha = 0.88;
              ctx.fillStyle = beamTipColor;
              ctx.beginPath();
              ctx.arc(beamSegEndX, beamSegEndY, 3.6, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        } else if (e.type === "shielder") {
          ctx.save();
          ctx.translate(hoverX, hoverY);
          const shielderAlpha = typeof e.shielderAlpha === "number" ? e.shielderAlpha : 1;
          ctx.globalAlpha = shielderAlpha;
          if (shielderImg && shielderImg.complete && shielderImg.naturalWidth > 0) {
            const drawScale = 4.0;
            ctx.drawImage(shielderImg, -e.radius * drawScale / 2, -e.radius * drawScale / 2, e.radius * drawScale, e.radius * drawScale);
          } else {
            ctx.shadowColor = "#78ffd6";
            ctx.shadowBlur = 12;
            ctx.fillStyle = "#4be6c3";
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 0.82, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#d7fff2";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 2.5, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          const linkedAllies = Array.isArray(e.activeShieldTargets)
            ? e.activeShieldTargets.filter(other => other && other.health > 0)
            : [];
          if (linkedAllies.length > 0) {
            ctx.save();
            for (const ally of linkedAllies) {
              const allyHoverY = (typeof ally.hoverOffset === "number")
                ? ally.y + Math.sin(ally.hoverOffset * 0.93) * 0.8
                : ally.y;
              const linkAngle = Math.atan2(allyHoverY - hoverY, ally.x - hoverX);
              const linkStartX = hoverX + Math.cos(linkAngle) * (e.radius + 4);
              const linkStartY = hoverY + Math.sin(linkAngle) * (e.radius + 4);
              ctx.globalAlpha = 0.55;
              ctx.strokeStyle = "#7dffe6";
              ctx.lineWidth = 2.2;
              ctx.shadowColor = "#7dffe6";
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.moveTo(linkStartX, linkStartY);
              ctx.lineTo(ally.x, allyHoverY);
              ctx.stroke();
            }
            ctx.restore();
          }
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
      drawParticlesBatched(["laser","enemyHit","levelUp","playerRevive","playerSmoke"]); // victory pre-smoke visible before gameOver

      drawProjectiles();

      drawWaveAnnouncement(delta);

      //-======================HUD AND STAT ALLOCATION======================-
      drawProtocolWarnings();
      if (gameStarted && !gameOver && !followMouse && !window._protocolReplaceMode && window._introPhase !== "animating") {
        drawDisplayPrompt("HOLD TOUCH, RIGHT-CLICK OR SPACE TO PLAY", canvas.width / 2, canvas.height / 2 - 80);
      }
      drawHUD();
      drawLootXray(shakeOffsetX, shakeOffsetY);
      // Draw debug text on top of HUD and overlays
      if (window.debugFramerateEnabled) {
        if (typeof particles !== 'undefined' && typeof mines !== 'undefined' && typeof enemies !== 'undefined') {
          ctx.save();
          ctx.font = 'bold 15px monospace';
          ctx.fillStyle = '#00eaff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          const fps = (1 / delta).toFixed(1);
          const debugText =
            'FrameRate (FPS): ' + fps +
            '\nParticles: ' + particles.length +
            ' | Mines: ' + mines.length +
            ' | Enemies: ' + enemies.length;
          const lines = debugText.split('\n');
          lines.forEach((line, i) => {
            ctx.fillText(line, 12, 12 + i * 20);
          });
          ctx.restore();
        }
      }
      
      // Update hovered protocol based on mouse position
      hoveredProtocol = -1;
      if (showStats && window._protocolSelectorBoxes) {
        const boxes = window._protocolSelectorBoxes;
        for (let box of boxes) {
          if (
            mouseX >= box.x &&
            mouseX <= box.x + box.w &&
            mouseY >= box.y &&
            mouseY <= box.y + box.h
          ) {
            hoveredProtocol = box.index;
            // Clear new-pickup highlight after 1s of continuous hover
            if (window._newlyPickedProtocols && window._newlyPickedProtocols.has(box.name)) {
              if (!window._newPickHoverStart) window._newPickHoverStart = {};
              if (!window._newPickHoverStart[box.name]) {
                window._newPickHoverStart[box.name] = Date.now();
              } else if (Date.now() - window._newPickHoverStart[box.name] >= 250) {
                window._newlyPickedProtocols.delete(box.name);
                if (!window._seenProtocols) window._seenProtocols = new Set();
                window._seenProtocols.add(box.name);
                delete window._newPickHoverStart[box.name];
              }
            } else if (window._newPickHoverStart) {
              delete window._newPickHoverStart[box.name];
            }
            break;
          }
        }
        // Reset hover timer for any card no longer being hovered
        if (hoveredProtocol < 0 && window._newPickHoverStart) {
          window._newPickHoverStart = {};
        }
      }
      if (hoveredProtocol !== lastHoveredProtocol) {
        lastHoveredProtocol = hoveredProtocol;
        hoveredProtocolSince = hoveredProtocol >= 0 ? Date.now() : 0;
      }
      // Update hovered replace card
      window._protocolReplaceHovered = null;
      if (window._protocolReplaceMode && window._protocolReplacePanelBoxes) {
        for (let box of window._protocolReplacePanelBoxes) {
          if (!box.cancel && mouseX >= box.x && mouseX <= box.x + box.w && mouseY >= box.y && mouseY <= box.y + box.h) {
            window._protocolReplaceHovered = box.name;
            break;
          }
        }
      }
      
      
      // Draw protocol tooltip last so it is always on top
      if (hoveredProtocol >= 0) {
        const hoveredBox = (window._protocolSelectorBoxes || []).find(box => box.index === hoveredProtocol);
        if (hoveredBox && hoveredBox.name) {
          // ...existing tooltip code (see previous tooltip block)...
          // This ensures tooltip is drawn after all overlays and text
        }
      }
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      
      
      

      if (window._victoryTriggered && !gameOver && window._victoryTime) {
        stopBossSounds();
        const _vsElapsed = Date.now() - window._victoryTime;
        // Pre-smoke at 2s: follows player
        if (_vsElapsed >= 2000) {
          window._gameOverDeathPos = { x: player.x, y: player.y };
          const smokeCount = 2 + Math.floor(Math.random() * 2);
          for (let si = 0; si < smokeCount; si++) {
            const sAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            const sSpeed = 0.15 + Math.random() * 0.5;
            const grey = Math.floor(80 + Math.random() * 100);
            spawnParticle(player.x + (Math.random()-0.5)*18, player.y + (Math.random()-0.5)*18,
              Math.cos(sAngle)*sSpeed, Math.sin(sAngle)*sSpeed,
              60+Math.random()*90, `rgba(${grey},${grey},${grey},0.55)`,
              0.992+Math.random()*0.006, 6+Math.random()*18, "playerSmoke");
          }
        }
        // At 4s: game stops, first explosion burst
        if (_vsElapsed >= 4000) {
          window._gameOverExplosionDone = true; // pos already tracked above
          window._gameOverBurstDone = false;    // fire first burst
          window._playerUsedContinue = true;
          gameOver = true;
          stopLowHealthSound();
          deactivateAttack();
          playSoundFresh('lumora_studios-pixel-explosion-319166.mp3', (window.sentinelVolume && window.sentinelVolume.enemyDeath) || 0.5);
        }
      }

      // Second death pending: keep player at 0, emit smoke, then trigger after 4s
      if (window._secondDeathPending && !gameOver) {
        player.health = 0;
        const _sdElapsed = Date.now() - window._secondDeathTime;
        const sdSmokeCount = 2 + Math.floor(Math.random() * 2);
        for (let si = 0; si < sdSmokeCount; si++) {
          const sAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
          const sSpeed = 0.15 + Math.random() * 0.5;
          const grey = Math.floor(80 + Math.random() * 100);
          spawnParticle(player.x + (Math.random()-0.5)*18, player.y + (Math.random()-0.5)*18,
            Math.cos(sAngle)*sSpeed, Math.sin(sAngle)*sSpeed,
            60+Math.random()*90, `rgba(${grey},${grey},${grey},0.55)`,
            0.992+Math.random()*0.006, 6+Math.random()*18, "playerSmoke");
        }
        if (_sdElapsed >= 4000) {
          window._secondDeathPending = false;
          window._gameOverDeathPos = { x: player.x, y: player.y };
          window._gameOverExplosionDone = false;
          window._gameOverBurstDone = false;
          window._playerUsedContinue = true;
          gameOver = true;
          stopBossSounds(true);
          stopLowHealthSound();
          deactivateAttack();
          showStats = false;
          rightMouseHeld = false;
          spaceHeld = false;
          attackHeld = false;
          if (window._gameMusicAudio) muffleGameMusic();
          if (window._bossMusicAudio) mufleBossMusic();
          playSoundFresh('lumora_studios-pixel-explosion-319166.mp3', (window.sentinelVolume && window.sentinelVolume.enemyDeath) || 0.5);
        }
      }

      if (player.health <= 0 && !gameOver && !window._secondDeathPending) {
        triggerLoadingFlash();
        if (window._playerUsedContinue) {
          // Second death — delayed sequence
          stopAttackSound();
          window._secondDeathPending = true;
          window._secondDeathTime = Date.now();
          if (window._activateUnpauseTimeout) {
            clearTimeout(window._activateUnpauseTimeout);
            window._activateUnpauseTimeout = null;
            window._activateUnpauseStart = null;
          }
          player.health = 0;
          stopLowHealthSound();
          followMouse = true;
          paused = false;
          showStats = false;
        } else {
          // First death — normal flow
          gameOver = true;
          stopLowHealthSound();
          deactivateAttack();
          playSoundFresh('lumora_studios-pixel-explosion-319166.mp3', (window.sentinelVolume && window.sentinelVolume.enemyDeath) || 0.5);
          window._gameOverExplosionDone = false;
        }
      }

      // Low health warning sound poll
      if (!gameOver && gameStarted) {
        const lowHealthThreshold = player.maxHealth * 0.25;
        if (player.health > 0 && player.health <= lowHealthThreshold) {
          startLowHealthSound();
        } else {
          stopLowHealthSound();
        }
      }

      if (gameOver) {
        // Initialize game over state on first render
        if (typeof window._gameOverTime === "undefined") {
          window._gameOverTime = Date.now();
        }

        // On first death: record position and start smoke only (no burst yet)
        if (!window._gameOverExplosionDone) {
          window._gameOverExplosionDone = true;
          window._gameOverDeathPos = { x: player.x, y: player.y };
        }

        const elapsedSeconds = (Date.now() - window._gameOverTime) / 1000;
        const remainingSeconds = Math.max(0, 5 - Math.floor(elapsedSeconds));
        const editorTimerExpired = window._editorSessionActive && !window._playerUsedContinue && elapsedSeconds >= 5;
        const showFinalScreen = window._playerUsedContinue || editorTimerExpired || remainingSeconds === 0;

        // When transition to final screen happens, fire the explosion burst
        if (showFinalScreen && !window._gameOverBurstDone && window._gameOverDeathPos) {
          window._gameOverBurstDone = true;
          playSoundFresh('lumora_studios-pixel-explosion-319166.mp3', (window.sentinelVolume && window.sentinelVolume.enemyDeath) || 0.5);
          const px = window._gameOverDeathPos.x, py = window._gameOverDeathPos.y;
          // Kill existing smoke
          for (let i = particles.length - 1; i >= 0; i--) {
            if (particles[i].type === "playerSmoke") releaseParticleAt(i);
          }
          // Core burst — fiery shards
          for (let i = 0; i < 70; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.4 + Math.random() * 2.2;
            const colors = ["#ff3c3c", "#ff8800", "#ffdd00", "#ffffff", "#ff4466"];
            spawnParticle(px, py,
              Math.cos(angle) * speed, Math.sin(angle) * speed,
              90 + Math.random() * 120,
              colors[Math.floor(Math.random() * colors.length)],
              0.97 + Math.random() * 0.025,
              2 + Math.random() * 6,
              "playerDeath");
          }
          // Long-burning embers
          for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.1 + Math.random() * 0.9;
            spawnParticle(px, py,
              Math.cos(angle) * speed, Math.sin(angle) * speed,
              150 + Math.random() * 180,
              ["#ff6600", "#ff3300", "#ffaa00", "#ff2200"][Math.floor(Math.random() * 4)],
              0.985 + Math.random() * 0.012,
              2 + Math.random() * 8,
              "playerDeath");
          }
        }

        // Transition: once timer runs out, flip to final screen
        if (remainingSeconds === 0 && !window._playerUsedContinue && !window._editorSessionActive) {
          window._playerUsedContinue = true;
        }

        // Continuous smoke — loop until results overlay shown
        if (window._gameOverDeathPos && !window._gameOverOverlay) {
          const sp = window._gameOverDeathPos;
          const smokeCount = 2 + Math.floor(Math.random() * 2);
          for (let i = 0; i < smokeCount; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; // mostly upward
            const speed = 0.15 + Math.random() * 0.5;
            const offsetX = (Math.random() - 0.5) * 18;
            const offsetY = (Math.random() - 0.5) * 18;
            const grey = Math.floor(80 + Math.random() * 100);
            spawnParticle(
              sp.x + offsetX, sp.y + offsetY,
              Math.cos(angle) * speed, Math.sin(angle) * speed,
              60 + Math.random() * 90,
              `rgba(${grey},${grey},${grey},0.55)`,
              0.992 + Math.random() * 0.006,
              6 + Math.random() * 18,
              "playerSmoke"
            );
          }
        }

        // Draw explosion particles during entire game over phase
        drawParticlesBatched(["playerDeath","playerSmoke"]);
        if (!showFinalScreen) {
          // --- First death: canvas text fades in over the explosion ---
          const fadeAlpha = Math.min(1, elapsedSeconds / 0.8);
          ctx.save();
          ctx.globalAlpha = fadeAlpha;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (window._victoryTriggered) {
            ctx.shadowColor = "#ffd700";
            ctx.shadowBlur = 32;
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 44px sans-serif";
            ctx.fillText("VICTORY!", canvas.width / 2, canvas.height / 2 - 20);
          } else {
            ctx.shadowColor = "#ff0000";
            ctx.shadowBlur = 28;
            ctx.fillStyle = "#ff3c3c";
            ctx.font = "bold 40px sans-serif";
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
            ctx.shadowBlur = 0;
            drawDisplayPrompt(`RIGHT-CLICK TO CONTINUE (${remainingSeconds}s)`, canvas.width / 2, canvas.height / 2 + 30, "#ff3c3c");
          }
          ctx.restore();
        } else {
          // --- Final game over screen after 1.5s delay ---
          if (typeof window._gameOverFinalTime === "undefined") {
            window._gameOverFinalTime = Date.now();
          }
          const finalElapsed = (Date.now() - window._gameOverFinalTime) / 1000;

          if (!window._gameOverOverlay && !window._victoryTriggered) {
            const fadeAlpha = Math.min(1, finalElapsed / 0.6);
            ctx.save();
            ctx.globalAlpha = fadeAlpha;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "#ff0000";
            ctx.shadowBlur = 28;
            ctx.fillStyle = "#ff3c3c";
            ctx.font = "bold 40px sans-serif";
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
            ctx.restore();
          }

          if (!window._gameOverOverlay && finalElapsed >= 4) {
            if (window._editorSessionActive) {
              if (window._gameOverOverlay) { window._gameOverOverlay.remove(); window._gameOverOverlay = null; }
              gameOver = false;
              window._bossSoundsStoppedForEndState = false;
              window._gameOverTime = undefined;
              window._playerUsedContinue = false;
              followMouse = false;
              window._bossMusicallyActive = false;
              stopBossMusic();
              stopLowHealthSound();
              if (typeof window.SentinelEditor !== "undefined" && window.SentinelEditor && typeof window.SentinelEditor.showWaveEditor === "function") {
                window.SentinelEditor.showWaveEditor();
              }
              requestAnimationFrame(gameLoop);
              return;
            }

            const isVictory = !!window._victoryTriggered;
            if (isVictory) clearVictoryConsole();
            else {
              stopBossSounds(true);
              if (window._gameMusicAudio) fadeOutGameMusic(1200);
              if (window._bossMusicAudio) fadeOutBossMusic(1200);
            }
            if (!isVictory && !runDeathCounted) {
              runDeathCounted = true;
              recordCompletedTrialRun();
            }

            const runScore = Math.max(0, ((runWavesCleared - runStartWaves) * 100) - (Math.floor(runHealthLost) * 2));
            const runDifficulty = window.sentinelDifficulty || "Normal";

            // --- Per-difficulty leaderboard helpers ---
            const LB_KEY = "sentinel.leaderboard." + runDifficulty;
            function loadLeaderboard() {
              try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch { return []; }
            }
            function saveLeaderboard(entries) {
              try { localStorage.setItem(LB_KEY, JSON.stringify(entries)); } catch {}
            }

            function doReturnToMenu() {
              if (window._gameOverOverlay) { window._gameOverOverlay.remove(); window._gameOverOverlay = null; }
              showMenuScreen = true;
              showMenu(false);
              gameOver = false;
              window._bossSoundsStoppedForEndState = false;
              window._gameOverTime = undefined;
              window._playerUsedContinue = false;
              followMouse = false;
              window._bossMusicallyActive = false;
              stopBossMusic();
              stopLowHealthSound();
              transitionToMenuMusic(1200);
            }

            // --- Build overlay ---
            const overlay = showMenu(false);
            if (!overlay) throw new Error("Unable to create the game-over menu.");
            overlay.id = "gameOverOverlay";
            overlay.style.background = "#000";
            overlay.style.fontFamily = "sans-serif";
            const menuTitle = overlay.querySelector("h1");
            if (menuTitle) {
              menuTitle.style.top = "8px";
              menuTitle.style.fontSize = "32px";
              menuTitle.style.textShadow = "0 0 14px #00d9ff, 0 3px 8px #000";
            }
            const menuButtons = document.getElementById("mainMenuButtons");
            if (menuButtons) menuButtons.remove();

            const resultColor = isVictory ? "#ffd700" : "#ff3c3c";
            const panel = document.createElement("div");
            panel.style.cssText = `position:absolute;top:52px;left:12px;right:12px;bottom:8px;width:auto;max-width:${GAME_DISPLAY_WIDTH - 24}px;height:auto;box-sizing:border-box;overflow:hidden;background:transparent;border:0;border-radius:0;box-shadow:none;padding:8px 12px;display:grid;grid-template-columns:minmax(220px,0.8fr) minmax(0,1.2fr);grid-template-rows:minmax(0,1fr) auto;align-items:stretch;gap:8px 16px;`;
            panel.classList.add("scrollbar-themed");
            overlay.appendChild(panel);

            const summary = document.createElement("div");
            summary.style.cssText = "min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;";
            panel.appendChild(summary);

            // Result title
            const title = document.createElement("div");
            title.textContent = isVictory ? "VICTORY!" : "GAME OVER";
            title.style.cssText = `color:${resultColor};font-size:1.75rem;font-weight:bold;letter-spacing:3px;text-align:center;text-shadow:0 0 18px ${resultColor}99;margin-bottom:4px;`;
            summary.appendChild(title);

            if (window._editorSessionActive) {
              const edNote = document.createElement("div");
              edNote.textContent = "Press O to open Editor and spawn a wave";
              edNote.style.cssText = "color:#ffe26c;font-size:0.95rem;";
              summary.appendChild(edNote);
            }

            // Stats row
            const statsRow = document.createElement("div");
            statsRow.style.cssText = "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:100%;margin:6px 0;";
            [[formatByteAmount(runCollectedBytes), "Earned", "#00ffdd"], [`${runWavesCleared}`, "Waves", "#aaf6ff"], [`${Math.floor(runHealthLost)}`, "HP Lost", "#ff8888"]].forEach(([val, label, color]) => {
              const box = document.createElement("div");
              box.style.cssText = "display:flex;flex-direction:column;align-items:center;";
              const v = document.createElement("div");
              v.textContent = val;
              v.style.cssText = `color:${color};font-size:1.2rem;font-weight:bold;`;
              const l = document.createElement("div");
              l.textContent = label;
              l.style.cssText = "color:#aaf6ff;font-size:0.72rem;letter-spacing:1px;text-shadow:0 1px 5px rgba(0,0,0,0.9);";
              box.appendChild(v); box.appendChild(l);
              statsRow.appendChild(box);
            });
            summary.appendChild(statsRow);

            // Score
            const scoreEl = document.createElement("div");
            scoreEl.style.cssText = "color:#ffdd00;font-size:2rem;font-weight:bold;text-shadow:0 0 12px #ffdd0080;";
            scoreEl.textContent = `Score: ${runScore}`;
            summary.appendChild(scoreEl);
            const scoreFormula = document.createElement("div");
            scoreFormula.textContent = `(${runWavesCleared - runStartWaves} waves × 100 − ${Math.floor(runHealthLost)} HP × 2)`;
            scoreFormula.style.cssText = "color:#aaf6ff;font-size:0.72rem;text-align:center;margin-top:-4px;text-shadow:0 1px 5px rgba(0,0,0,0.9);";
            summary.appendChild(scoreFormula);

            // --- Insert current run and render leaderboard ---
            const diffColor = runDifficulty === "Apocalypse" ? "#ff3c3c" : runDifficulty === "Hardcore" ? "#ffb300" : "#00ffdd";
            const newEntry = { name: "", score: runScore, waves: runWavesCleared, bytes: runCollectedBytes, _pending: true };
            let lbNameInput = null;

            const leaderboardPanel = document.createElement("div");
            leaderboardPanel.style.cssText = "min-width:0;min-height:0;display:flex;flex-direction:column;align-items:stretch;border-left:1px solid rgba(0,217,255,0.3);padding-left:12px;";
            panel.appendChild(leaderboardPanel);

            // Leaderboard title
            const lbTitle = document.createElement("div");
            lbTitle.textContent = `${runDifficulty.toUpperCase()} LEADERBOARD`;
            lbTitle.style.cssText = `color:${diffColor};font-size:1rem;font-weight:bold;letter-spacing:2px;margin-bottom:6px;text-align:center;`;
            leaderboardPanel.appendChild(lbTitle);

            // Column headers
            const COLS = "32px 1fr 92px 70px";
            const lbHeaders = document.createElement("div");
            lbHeaders.style.cssText = `width:100%;display:grid;grid-template-columns:${COLS};gap:4px;padding:0 8px;box-sizing:border-box;`;
            [["#", false], ["Name", false], ["Score", true], ["Waves", true]].forEach(([t, right]) => {
              const h = document.createElement("div");
              h.textContent = t;
              h.style.cssText = `color:#8cecff;font-size:0.8rem;letter-spacing:1px;text-transform:uppercase;text-align:${right ? "right" : "left"};text-shadow:0 1px 5px rgba(0,0,0,0.9);`;
              lbHeaders.appendChild(h);
            });
            leaderboardPanel.appendChild(lbHeaders);

            // Leaderboard table
            const lbTable = document.createElement("div");
            lbTable.style.cssText = "width:100%;display:flex;flex:1;flex-direction:column;gap:3px;min-height:0;overflow-y:auto;";
            lbTable.classList.add("scrollbar-themed");
            leaderboardPanel.appendChild(lbTable);

            function renderLbRows(cloudEntries, pendingEntry) {
              lbTable.innerHTML = "";
              lbNameInput = null;
              const merged = cloudEntries ? cloudEntries.slice() : [];
              if (pendingEntry && !pendingEntry._named) merged.push(pendingEntry);
              merged.sort((a, b) => b.score - a.score);
              const top = merged.slice(0, 25);
              if (top.length === 0) {
                const empty = document.createElement("div");
                empty.style.cssText = "color:#8cecff;font-size:0.85rem;text-align:center;padding:12px;";
                empty.textContent = "No entries yet.";
                lbTable.appendChild(empty);
                return;
              }
              top.forEach((entry, i) => {
                const isMe = entry === pendingEntry;
                const row = document.createElement("div");
                row.style.cssText = `display:grid;grid-template-columns:${COLS};gap:4px;align-items:center;padding:5px 8px;border-bottom:1px solid ${isMe ? "rgba(255,221,0,0.45)" : "rgba(0,217,255,0.16)"};background:transparent;`;
                const rank = document.createElement("div");
                rank.textContent = `#${i + 1}`;
                rank.style.cssText = `color:${i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#8cecff"};font-weight:bold;font-size:0.95rem;`;
                let nameEl;
                if (isMe) {
                  nameEl = document.createElement("div");
                  nameEl.style.cssText = "display:flex;gap:4px;align-items:center;min-width:0;";
                  const nameInput = document.createElement("input");
                  nameInput.type = "text";
                  nameInput.maxLength = 18;
                  nameInput.placeholder = "Your name…";
                  nameInput.style.cssText = "flex:1;min-width:0;font-size:0.85rem;padding:1px 4px;background:transparent;color:#ffdd00;border:1px solid #ffdd0088;border-radius:0;outline:none;box-sizing:border-box;";
                  lbNameInput = nameInput;
                  let nameEntryFlashTriggered = false;
                  nameInput.addEventListener("input", () => {
                    if (nameEntryFlashTriggered || !nameInput.value.trim()) return;
                    nameEntryFlashTriggered = true;
                    triggerLoadingFlash();
                  });
                  const okBtn = document.createElement("button");
                  okBtn.textContent = "OK";
                  okBtn.style.cssText = "font-size:0.75rem;padding:1px 6px;background:transparent;color:#ffdd00;border:1px solid #ffdd0088;border-radius:0;white-space:nowrap;flex-shrink:0;";
                  let nameConfirmed = false;
                  const confirmName = () => {
                    if (nameConfirmed) return;
                    nameConfirmed = true;
                    const finalName = nameInput.value.trim() || "???";
                    nameInput.disabled = true;
                    okBtn.disabled = true;
                    lbNameInput = null;
                    entry._named = true;
                    delete entry._pending;
                    // Save to localStorage
                    const localLb = (loadLeaderboard() || []).filter(e => !e._pending);
                    localLb.push({ name: finalName, score: entry.score, waves: entry.waves, bytes: entry.bytes || 0 });
                    localLb.sort((a, b) => b.score - a.score);
                    saveLeaderboard(localLb.slice(0, 25));
                    renderLbRows(localLb.slice(0, 25), null);
                    // Save to Firestore then refresh table
                    if (window.fbLB) {
                      window.fbLB.save(runDifficulty, { name: finalName, score: entry.score, waves: entry.waves, bytes: entry.bytes || 0 })
                        .then(() => window.fbLB.load(runDifficulty))
                        .then(fresh => { if (window._gameOverOverlay) renderLbRows(fresh, null); })
                        .catch(() => { if (window._gameOverOverlay) renderLbRows(loadLeaderboard(), null); });
                    } else {
                      renderLbRows(loadLeaderboard(), null);
                    }
                  };
                  okBtn.addEventListener("click", confirmName);
                  nameInput.addEventListener("keydown", e => { if (e.key === "Enter") confirmName(); });
                  nameEl.appendChild(nameInput);
                  nameEl.appendChild(okBtn);
                  requestAnimationFrame(() => nameInput.focus());
                } else {
                  nameEl = document.createElement("div");
                  nameEl.textContent = entry.name || "???";
                  nameEl.style.cssText = "color:#e0ffff;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                }
                const sc = document.createElement("div");
                sc.textContent = entry.score;
                sc.style.cssText = "color:#ffdd00;font-weight:bold;font-size:1.1rem;text-align:right;text-shadow:0 0 6px rgba(255,221,0,0.5);";
                const wv = document.createElement("div");
                wv.textContent = `W${entry.waves}`;
                wv.style.cssText = "color:#aaf6ff;font-size:0.95rem;text-align:right;";
                row.appendChild(rank); row.appendChild(nameEl); row.appendChild(sc); row.appendChild(wv);
                lbTable.appendChild(row);
                if (isMe) requestAnimationFrame(() => row.scrollIntoView({ block: "nearest" }));
              });
            }

            // Show loading state, fetch from Firestore (fallback to localStorage)
            lbTable.innerHTML = `<div style="color:#8cecff;font-size:0.85rem;text-align:center;padding:12px;">Loading leaderboard…</div>`;
            if (window.fbLB) {
              window.fbLB.load(runDifficulty)
                .then(cloudEntries => { if (window._gameOverOverlay) renderLbRows(cloudEntries, newEntry); })
                .catch(() => { renderLbRows(loadLeaderboard(), newEntry); });
            } else {
              renderLbRows(loadLeaderboard(), newEntry);
            }

            // Patch doReturnToMenu to finalize pending name before navigating
            const _origReturn = doReturnToMenu;
            const doReturnToMenuFinal = () => {
              if (lbNameInput) {
                const finalName = lbNameInput.value.trim() || "???";
                const localLb = (loadLeaderboard() || []).filter(e => !e._pending);
                localLb.push({ name: finalName, score: runScore, waves: runWavesCleared, bytes: runCollectedBytes });
                localLb.sort((a, b) => b.score - a.score);
                saveLeaderboard(localLb.slice(0, 25));
                if (window.fbLB) {
                  window.fbLB.save(runDifficulty, { name: finalName, score: runScore, waves: runWavesCleared, bytes: runCollectedBytes }).catch(() => {});
                }
              }
              _origReturn();
            };

            // Return button
            if (!window._editorSessionActive) {
              const btn = document.createElement("button");
              btn.textContent = "Return to Menu";
              btn.style.cssText = "grid-column:1 / -1;justify-self:center;font-size:1rem;padding:0.4rem 1.6rem;background:transparent;color:#8cecff;border:1px solid rgba(0,217,255,0.8);border-radius:0;";
              btn.addEventListener("click", doReturnToMenuFinal);
              panel.appendChild(btn);
            }

            overlay.style.opacity = "0";
            overlay.style.transition = "opacity 0.8s ease";
            requestAnimationFrame(() => { overlay.style.opacity = "1"; });
            window._gameOverOverlay = overlay;
            finalizeRunBytes();
          }
        }

        requestAnimationFrame(gameLoop);
        return;
      }
    }

    // ---- Activate countdown (hold right-click/spacebar) — drawn on top of everything ----
    if (window._activateUnpauseTimeout && window._activateUnpauseStart != null) {
      const _cdElapsed = (performance.now() - window._activateUnpauseStart) / 1000;
      const _cdRemaining = Math.max(0, 0.5 - _cdElapsed);
      const _cdText = _cdRemaining.toFixed(1);
      drawDisplayPrompt(`ENGAGE ${_cdText}s`, player.x, player.y - player.radius - 18);
    }
    // ---- End activate countdown ----

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

}