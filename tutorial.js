/**
 * tutorial.js — First-time player tutorial for Sentinel
 *
 * Guides the player through: Main Menu → Difficulty → Wave Selection → Protocol Database
 * Only runs once; completion is stored in localStorage under 'sentinel_tutorialDone'.
 */
(function () {
  'use strict';

  const TUTORIAL_TEST_MODE = false; // set true to always run tutorial on refresh while testing
  if (!TUTORIAL_TEST_MODE && localStorage.getItem('sentinel_tutorialDone')) return;

  // ─── Inject tutorial CSS ───────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.id = 'tutorial-styles';
  styleEl.textContent = `
    @keyframes tut-btn-pulse {
      0%,  100% { box-shadow: 0 0 8px 2px rgba(0,255,221,0.35), 0 0 24px #000; }
      50%        { box-shadow: 0 0 28px 10px rgba(0,255,221,0.9), 0 0 40px rgba(0,255,221,0.35); }
    }
    .tut-pulse {
      animation: tut-btn-pulse 1s ease-in-out infinite !important;
    }

    @keyframes tut-card-outline {
      0%,  100% { outline: 2px solid rgba(0,255,221,0.35); outline-offset: 2px; }
      50%        { outline: 2px solid rgba(0,255,221,0.95); outline-offset: 2px; }
    }
    .tut-card {
      animation: tut-card-outline 1.2s ease-in-out infinite !important;
    }

    @keyframes tut-text-glow {
      0%,  100% { color: #aaf6ff; text-shadow: none; }
      50%        { color: #00ffdd; text-shadow: 0 0 10px rgba(0,255,221,0.7); }
    }
    .tut-text {
      animation: tut-text-glow 1.2s ease-in-out infinite !important;
      font-weight: bold !important;
    }
    @keyframes tut-upgrade-pulse {
      0%,  100% { outline: 2px solid rgba(0,255,221,0.35); outline-offset: 2px; }
      50%        { outline: 2px solid rgba(0,255,221,1);    outline-offset: 2px; }
    }
    .tut-upgrade-pulse {
      animation: tut-upgrade-pulse 1s ease-in-out infinite !important;
    }
    .tut-banner {
      position: fixed;
      top: 128px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 22, 29, 0.62);
      color: #00ffdd;
      border: 1.5px solid #00ffdd;
      box-shadow: 0 0 10px rgba(0,255,221,0.6);
      text-shadow: 0 0 10px rgba(0,255,221,0.8);
      font-family: sans-serif;
      font-size: 14px;
      font-weight: bold;
      padding: 0 16px;
      height: 24px;
      line-height: 24px;
      border-radius: 0;
      z-index: 10000;
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
    }
  `;
  document.head.appendChild(styleEl);

  // ─── State ─────────────────────────────────────────────────────────────────
  let stage = 'mainMenu'; // updated whenever a known overlay appears
  let hadFirstRun = false; // true after the first Start Run click — skip step 4 on retries

  // ─── Body MutationObserver ─────────────────────────────────────────────────
  const bodyObserver = new MutationObserver((mutations) => {
    if (stage === 'done') return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        switch (node.id) {
          case 'menuOverlay':
            if (stage === 'step7' || stage === 'step8') {
              applyStep7(node);
            } else if (stage === 'playing') {
              // Run ended — check if both gameplay steps were completed
              if (step5Done && step6Done) {
                stage = 'step7';
                applyStep7(node);
              } else {
                // Steps incomplete — clean up and restart from step 1
                window._tutDrawOnStats = null;
                window._tutDrawOnProtocols = null;
                removeBanner('tut-levelup-banner');
                removeBanner('tut-protocol-banner');
                step5Done = false;
                step6Done = false;
                stage = 'mainMenu';
                applyMainMenu(node);
              }
            } else {
              stage = 'mainMenu';
              applyMainMenu(node);
            }
            break;
          case 'difficultyOverlay':
            stage = 'difficulty';
            applyDifficulty(node);
            break;
          case 'waveSelectionOverlay':
            stage = 'wave';
            applyWave(node);
            break;
          case 'starterProtocolOverlay':
            if (stage === 'step8') {
              applyStep8(node);
            } else if (hadFirstRun) {
              // Already did step 4 once — go straight to playing
              stage = 'playing';
            } else {
              stage = 'protocol';
              applyProtocol(node);
            }
            break;
        }
      }
    }
  });

  bodyObserver.observe(document.body, { childList: true });

  // ─── Helper ────────────────────────────────────────────────────────────────
  function dimBtn(btn) {
    btn.style.opacity = '0.3';
    btn.style.pointerEvents = 'none';
  }

  // ─── Stage 1 · Main Menu ───────────────────────────────────────────────────
  function applyMainMenu(overlay) {
    overlay.querySelectorAll('button').forEach((btn) => {
      if (btn.textContent.trim() === 'Play') {
        btn.classList.add('tut-pulse');
      } else {
        dimBtn(btn);
      }
    });
  }

  // ─── Stage 2 · Difficulty ──────────────────────────────────────────────────
  function applyDifficulty(overlay) {
    overlay.querySelectorAll('button').forEach((btn) => {
      const t = btn.textContent.trim();
      if (t === 'Normal') {
        btn.classList.add('tut-pulse');
      } else if (t === 'Hardcore' || t === 'Apocalypse') {
        dimBtn(btn);
      }
      // '← Back' stays interactive
    });
  }

  // ─── Stage 3 · Wave Selection ──────────────────────────────────────────────
  function applyWave(overlay) {
    overlay.querySelectorAll('button').forEach((btn) => {
      const t = btn.textContent.trim();
      if (t === 'Wave 1') {
        btn.classList.add('tut-pulse');
        // Ensure wave 1 is fully clickable regardless of game state
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
      } else if (t !== '← Back') {
        dimBtn(btn);
      }
    });
  }

  // ─── Stage 4 · Protocol Database ──────────────────────────────────────────
  function applyProtocol(overlay) {
    // Pulse the subtitle ("Choose up to 2 discovered protocols…")
    for (const el of overlay.querySelectorAll('div')) {
      if (el.children.length === 0 &&
          el.textContent.trim().startsWith('Choose up to 2')) {
        el.classList.add('tut-text');
        break;
      }
    }

    // Highlight every protocol card button inside the scrollable content
    const content = overlay.querySelector('.scrollbar-themed');
    if (content) {
      content.querySelectorAll('button').forEach((card) => {
        card.classList.add('tut-card');
      });
    }

    // Find the "Selected: X/2" counter and the "Start Run" button
    let selectionCountEl = null;
    for (const el of overlay.querySelectorAll('div')) {
      if (el.children.length === 0 && /^Selected:\s*\d+\/2$/.test(el.textContent.trim())) {
        selectionCountEl = el;
        break;
      }
    }

    let startBtn = null;
    for (const btn of overlay.querySelectorAll('button')) {
      if (btn.textContent.trim() === 'Start Run') {
        startBtn = btn;
        break;
      }
    }

    const setStartButtonState = (enabled) => {
      if (!startBtn) return;
      if (enabled) {
        startBtn.classList.add('tut-pulse');
        startBtn.style.opacity = '1';
        startBtn.style.pointerEvents = 'auto';
        startBtn.style.cursor = 'pointer';
        startBtn.disabled = false;
      } else {
        startBtn.classList.remove('tut-pulse');
        startBtn.style.opacity = '0.3';
        startBtn.style.pointerEvents = 'none';
        startBtn.style.cursor = 'default';
        startBtn.disabled = true;
      }
    };

    // Pulse and enable Start Run only once at least 2 protocols are selected
    if (selectionCountEl && startBtn) {
      const updateStartState = () => {
        const m = selectionCountEl.textContent.match(/Selected:\s*(\d+)/);
        const count = m ? parseInt(m[1], 10) : 0;
        setStartButtonState(count >= 2);
        // Remove card highlights once 2 are selected
        if (content) {
          content.querySelectorAll('button').forEach((card) => {
            if (count >= 2) card.classList.remove('tut-card');
            else card.classList.add('tut-card');
          });
        }
      };

      setStartButtonState(false);
      const countObserver = new MutationObserver(updateStartState);
      countObserver.observe(selectionCountEl, { childList: true, characterData: true, subtree: true });
    }

    // Transition to 'playing' stage when Start Run is clicked (steps 5 & 6 still pending)
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        stage = 'playing';
        hadFirstRun = true;
        // Observer stays connected to catch menu return
      }, { once: true });
    }
  }

  // ─── Completion ────────────────────────────────────────────────────────────
  function completeTutorial() {
    stage = 'done';
    localStorage.setItem('sentinel_tutorialDone', '1');
    bodyObserver.disconnect();
    window._tutDrawOnStats = null;
  }

  // ─── Banner helpers — injected into the game's protocolWarnings queue ──────
  function showBanner(message, id) {
    // Remove any existing banner with this id first
    removeBanner(id);
    if (window._tutPersistentBanner === undefined) window._tutPersistentBanner = null;
    // Push into the game's warning queue with Infinity timer (never fades)
    const entry = { text: message, color: '#00ffdd', timer: Infinity, _tutId: id };
    const warnings = window._tutProtocolWarningsRef;
    if (warnings) {
      warnings.push(entry);
      while (warnings.length > 4) warnings.shift();
    }
  }

  function removeBanner(id) {
    const warnings = window._tutProtocolWarningsRef;
    if (!warnings) return;
    for (let i = warnings.length - 1; i >= 0; i--) {
      if (warnings[i]._tutId === id) warnings.splice(i, 1);
    }
  }

  // ─── Stage 5 · Gameplay – Stat panel draw hook ────────────────────────────
  let step5Done = false;
  let step6Done = false;

  function checkBothDone() {
    if (step5Done && step6Done) transitionToStep7();
  }

  function transitionToStep7() {
    stage = 'step7';
    // Observer already connected — no need to re-observe
  }

  function installStatHighlight() {
    window._tutDrawOnStats = function (ctx, boxes, pts, panelX, panelY, panelW) {
      if (pts <= 0) {
        window._tutDrawOnStats = null;
        removeBanner('tut-levelup-banner');
        step5Done = true;
        checkBothDone();
        return;
      }
      const pulse = 0.35 + 0.55 * Math.abs(Math.sin(Date.now() / 400));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#00ffdd';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00ffdd';
      ctx.lineWidth = 2;
      // Each + button only (no allocation points row)
      for (const box of boxes) {
        ctx.strokeRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
      }
      ctx.restore();
    };
  }

  window.addEventListener('tut:firstLevelUp', () => {
    if (stage === 'done') return;
    // Show banner immediately on level-up
    showBanner('Level up! Spend your Power Allocation Points using the + buttons', 'tut-levelup-banner');
    // Wait until stat panel auto-opens (boxes populated), then install highlight
    const poll = setInterval(() => {
      if (window._statPlusButtonBoxes && window._statPlusButtonBoxes.length > 0) {
        clearInterval(poll);
        installStatHighlight();
      }
    }, 150);
  });

  // ─── Stage 6 · Gameplay – Protocol Pickup + Activation ────────────────────
  function installProtocolHighlight(pickedUpName) {
    showBanner('New Protocol discovered! Open your stat panel and activate it', 'tut-protocol-banner');
    window._tutDrawOnProtocols = function (ctx, boxes, panelX, panelY, panelW, panelH, contentY, contentH) {
      // Stop once the picked-up protocol is activated
      if (ProtocolSystem.activeProtocols && ProtocolSystem.activeProtocols.includes(pickedUpName)) {
        window._tutDrawOnProtocols = null;
        removeBanner('tut-protocol-banner');
        step6Done = true;
        checkBothDone();
        return;
      }
      // Pulse outline around the whole protocol panel
      const pulse = 0.35 + 0.55 * Math.abs(Math.sin(Date.now() / 500));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#00ffdd';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#00ffdd';
      ctx.lineWidth = 3;
      ctx.strokeRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
      // Pulse discovered (non-active) card for the picked-up protocol
      for (const box of (boxes || [])) {
        if (box.name === pickedUpName && box.discovered) {
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
        }
      }
      ctx.restore();
    };
  }

  window.addEventListener('tut:firstProtocolPickup', () => {
    if (stage === 'done') return;
    const pickedName = window._tutLastPickedProtocol || '';
    // Auto-scroll the protocol list to bring that card into view
    if (pickedName) window._tutScrollToProtocol = pickedName;
    installProtocolHighlight(pickedName);
  });

  window.addEventListener('tut:firstProtocolActivated', () => {
    // Fallback: if highlight was never installed (e.g. picked up while panel was closed)
    if (stage === 'done') return;
    if (!step6Done) {
      window._tutDrawOnProtocols = null;
      removeBanner('tut-protocol-banner');
      step6Done = true;
      checkBothDone();
    }
  });

  // ─── Stage 7 · Return to main menu after run ───────────────────────────────
  function applyStep7(overlay) {
    overlay.querySelectorAll('button').forEach((btn) => {
      if (btn.textContent.trim() === 'Protocols') {
        btn.classList.add('tut-pulse');
        // capture:true ensures this fires BEFORE the game's listener creates the overlay
        btn.addEventListener('click', () => { stage = 'step8'; }, { once: true, capture: true });
      } else {
        dimBtn(btn);
      }
    });
  }

  // ─── Stage 8 · Protocol Database upgrade ──────────────────────────────────
  function applyStep8(overlay) {
    showBanner('Click an Upgrade button on a discovered protocol to permanently improve it!', 'tut-upgrade-banner');
    window._tutSubtitleForce = true; // keep subtitle visible during step 8
    // Style the subtitle for high visibility
    const subtitleEl = overlay.querySelector('[data-protocol-subtitle]');
    if (subtitleEl) {
      subtitleEl.textContent = 'Upgrade a discovered protocol to permanently improve its power.';
      subtitleEl.style.visibility = 'visible'; // force visible even if refreshCount already hid it
      subtitleEl.style.color = '#00ffdd';
      subtitleEl.style.fontSize = '1rem';
      subtitleEl.style.fontWeight = 'bold';
      subtitleEl.style.textShadow = '0 0 8px rgba(0,255,221,0.7)';
    }
    // Highlight only upgrade buttons using outline (no bleed onto card)
    overlay.querySelectorAll('.upgrade-btn').forEach((btn) => {
      if (btn.disabled || btn.textContent.trim() === 'MAX') return;
      btn.classList.add('tut-upgrade-pulse');
    });
    // Dim Back and Play/Start Run buttons — must upgrade to proceed
    overlay.querySelectorAll('button').forEach((btn) => {
      const t = btn.textContent.trim();
      if (t === 'Back' || t === 'Play' || t === 'Start Run') dimBtn(btn);
    });
  }

  window.addEventListener('tut:protocolUpgraded', () => {
    if (stage !== 'step8') return;
    // Remove upgrade highlights and banner
    removeBanner('tut-upgrade-banner');
    document.querySelectorAll('.tut-upgrade-pulse').forEach(b => b.classList.remove('tut-upgrade-pulse'));
    stage = 'step9';
    window._tutSubtitleForce = false; // release subtitle visibility override
    // Reset subtitle to default
    const subtitleEl = document.querySelector('[data-protocol-subtitle]');
    if (subtitleEl) {
      subtitleEl.textContent = 'Choose up to 2 discovered protocols to start your run with.';
      subtitleEl.style.color = '#aaf6ff';
      subtitleEl.style.fontSize = '0.95rem';
      subtitleEl.style.fontWeight = '';
      subtitleEl.style.textShadow = '';
    }
    // Restore Back and Play buttons to normal, then highlight Play
    const overlay = document.getElementById('starterProtocolOverlay');
    if (overlay) {
      overlay.querySelectorAll('button').forEach(btn => {
        const t = btn.textContent.trim();
        if (t === 'Play' || t === 'Back') {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.style.cursor = 'pointer';
          btn.disabled = false;
        }
      });
      overlay.querySelectorAll('button').forEach(btn => {
        const t = btn.textContent.trim();
        if (t === 'Play') {
          btn.classList.add('tut-pulse');
          btn.addEventListener('click', () => { completeTutorial(); }, { once: true, capture: true });
        } else if (t === 'Back') {
          btn.addEventListener('click', () => { completeTutorial(); }, { once: true, capture: true });
        }
      });
    }
  });

})();
