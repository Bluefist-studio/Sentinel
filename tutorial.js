/**
 * tutorial.js — First-time player tutorial for Sentinel
 *
 * Guides the player through: Main Menu → Difficulty → Wave Selection → Protocol Database
 * Only runs once; completion is stored in localStorage under 'sentinel_tutorialDone'.
 */
(function () {
  'use strict';

  if (localStorage.getItem('sentinel_tutorialDone')) return;

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
  `;
  document.head.appendChild(styleEl);

  // ─── State ─────────────────────────────────────────────────────────────────
  let stage = 'mainMenu'; // updated whenever a known overlay appears

  // ─── Body MutationObserver ─────────────────────────────────────────────────
  const bodyObserver = new MutationObserver((mutations) => {
    if (stage === 'done') return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        switch (node.id) {
          case 'menuOverlay':
            stage = 'mainMenu';
            applyMainMenu(node);
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
            stage = 'protocol';
            applyProtocol(node);
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

    // Pulse Start Run once 2 protocols are selected
    if (selectionCountEl && startBtn) {
      const updateStartPulse = () => {
        const m = selectionCountEl.textContent.match(/Selected:\s*(\d+)/);
        const count = m ? parseInt(m[1], 10) : 0;
        if (count >= 2) {
          startBtn.classList.add('tut-pulse');
        } else {
          startBtn.classList.remove('tut-pulse');
        }
      };

      const countObserver = new MutationObserver(updateStartPulse);
      countObserver.observe(selectionCountEl, { childList: true, characterData: true, subtree: true });
    }

    // Complete the tutorial when Start Run is clicked
    if (startBtn) {
      startBtn.addEventListener('click', completeTutorial, { once: true });
    }
  }

  // ─── Completion ────────────────────────────────────────────────────────────
  function completeTutorial() {
    stage = 'done';
    localStorage.setItem('sentinel_tutorialDone', '1');
    bodyObserver.disconnect();
  }

})();
