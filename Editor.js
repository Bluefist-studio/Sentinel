(function () {
	const WAVE_CODE_PREFIX = "SWC1:";
	const INTERVAL_UNITS_PER_SECOND = 120;
	const waveEditorOverrides = {};
	let waveEditorOverlay = null;
	let waveEditorWasPaused = false;

	function clampPositiveNumber(value, fallback) {
		return Number.isFinite(value) && value > 0 ? value : fallback;
	}

	function intervalUnitsToSeconds(units) {
		const safeUnits = clampPositiveNumber(units, INTERVAL_UNITS_PER_SECOND);
		return safeUnits / INTERVAL_UNITS_PER_SECOND;
	}

	function secondsToIntervalUnits(seconds) {
		const safeSeconds = clampPositiveNumber(seconds, 1);
		return Math.max(1, Math.round(safeSeconds * INTERVAL_UNITS_PER_SECOND));
	}

	function cloneOverrides(overrides) {
		const out = {};
		Object.keys(overrides || {}).forEach((waveKey) => {
			const entry = overrides[waveKey];
			if (!entry) return;
			out[waveKey] = {
				burstCount: entry.burstCount,
				burstInterval: entry.burstInterval,
				customBursts: Array.isArray(entry.customBursts) ? entry.customBursts.slice() : undefined,
				customBrutes: Array.isArray(entry.customBrutes) ? entry.customBrutes.slice() : undefined,
				customSlingers: Array.isArray(entry.customSlingers) ? entry.customSlingers.slice() : undefined,
				customKamikazes: Array.isArray(entry.customKamikazes) ? entry.customKamikazes.slice() : undefined,
				customBossMinors: Array.isArray(entry.customBossMinors) ? entry.customBossMinors.slice() : undefined,
				customBosses: Array.isArray(entry.customBosses) ? entry.customBosses.slice() : undefined
			};
		});
		return out;
	}

	function serializeOverrides(overrides) {
		const normalized = {};
		Object.keys(overrides || {}).forEach((waveKey) => {
			const src = overrides[waveKey];
			if (!src) return;
			normalized[waveKey] = {
				burstCount: src.burstCount === Infinity ? "INF" : src.burstCount,
				burstIntervalSeconds: Number(intervalUnitsToSeconds(src.burstInterval).toFixed(3)),
				customBursts: Array.isArray(src.customBursts) ? src.customBursts.slice() : undefined,
				customBrutes: Array.isArray(src.customBrutes) ? src.customBrutes.slice() : undefined,
				customSlingers: Array.isArray(src.customSlingers) ? src.customSlingers.slice() : undefined,
				customKamikazes: Array.isArray(src.customKamikazes) ? src.customKamikazes.slice() : undefined,
				customBossMinors: Array.isArray(src.customBossMinors) ? src.customBossMinors.slice() : undefined,
				customBosses: Array.isArray(src.customBosses) ? src.customBosses.slice() : undefined
			};
		});
		return normalized;
	}

	function deserializeOverrides(serialized) {
		const restored = {};
		Object.keys(serialized || {}).forEach((waveKey) => {
			const src = serialized[waveKey];
			if (!src) return;
			const waveNumber = parseInt(waveKey, 10);
			if (!Number.isFinite(waveNumber) || waveNumber < 1) return;
			const burstCount = src.burstCount === "INF" ? Infinity : parseInt(src.burstCount, 10);
			if (!(burstCount === Infinity || (Number.isFinite(burstCount) && burstCount >= 0))) return;

			let burstInterval = 0;
			if (src.burstIntervalSeconds !== undefined) {
				burstInterval = secondsToIntervalUnits(parseFloat(src.burstIntervalSeconds));
			} else {
				const legacyInterval = parseInt(src.burstInterval, 10);
				burstInterval = clampPositiveNumber(legacyInterval, INTERVAL_UNITS_PER_SECOND);
			}

			restored[waveNumber] = {
				burstCount,
				burstInterval,
				customBursts: Array.isArray(src.customBursts) ? src.customBursts.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customBrutes: Array.isArray(src.customBrutes) ? src.customBrutes.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customSlingers: Array.isArray(src.customSlingers) ? src.customSlingers.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customKamikazes: Array.isArray(src.customKamikazes) ? src.customKamikazes.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customBossMinors: Array.isArray(src.customBossMinors) ? src.customBossMinors.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customBosses: Array.isArray(src.customBosses) ? src.customBosses.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined
			};
		});
		return restored;
	}

	function encodeWaveCode(overrides) {
		const payload = { version: 2, overrides: serializeOverrides(overrides) };
		const json = JSON.stringify(payload);
		const encoded = btoa(unescape(encodeURIComponent(json)));
		return `${WAVE_CODE_PREFIX}${encoded}`;
	}

	function decodeWaveCode(code) {
		const raw = (code || "").trim();
		if (!raw.startsWith(WAVE_CODE_PREFIX)) {
			throw new Error("Invalid wave code prefix.");
		}
		const encoded = raw.slice(WAVE_CODE_PREFIX.length);
		const json = decodeURIComponent(escape(atob(encoded)));
		const payload = JSON.parse(json);
		if (!payload || typeof payload.overrides !== "object") {
			throw new Error("Invalid wave code payload.");
		}
		if (payload.version !== 1 && payload.version !== 2) {
			throw new Error("Unsupported wave code version.");
		}
		return deserializeOverrides(payload.overrides);
	}

	function getWaveConfigFromCode(code, waveNumber) {
		const targetWave = parseInt(waveNumber, 10);
		if (!Number.isFinite(targetWave) || targetWave < 1) {
			throw new Error("Valid wave number is required.");
		}
		const decoded = decodeWaveCode(code);
		const config = decoded[targetWave] || null;
		if (!config) return null;
		return {
			...config,
			burstIntervalSeconds: Number(intervalUnitsToSeconds(config.burstInterval).toFixed(3))
		};
	}

	function replaceActiveOverrides(newOverrides) {
		Object.keys(waveEditorOverrides).forEach((key) => delete waveEditorOverrides[key]);
		const cloned = cloneOverrides(newOverrides || {});
		Object.keys(cloned).forEach((key) => {
			waveEditorOverrides[key] = cloned[key];
		});
	}

	function activateWaveCode(code) {
		replaceActiveOverrides(decodeWaveCode(code));
	}

	function parseWaveEditorList(rawText) {
		const text = (rawText || "").trim();
		if (!text) return undefined;
		return text
			.split(",")
			.map(part => parseInt(part.trim(), 10))
			.filter(value => Number.isFinite(value) && value >= 0);
	}

	function formatWaveEditorList(list) {
		return Array.isArray(list) ? list.join(",") : "";
	}

	function getWaveEditorBurstValue(list, index) {
		if (!Array.isArray(list) || list.length === 0) return 0;
		if (index < list.length) return list[index] || 0;
		return list[list.length - 1] || 0;
	}

	function getActiveWaveOverride(targetWave) {
		return waveEditorOverrides[targetWave] || null;
	}

	function getWaveEditorSourceConfig(targetWave, currentState) {
		const bridge = window.SentinelEditorBridge;
		const override = waveEditorOverrides[targetWave];
		if (override) {
			return {
				burstCount: override.burstCount,
				burstInterval: override.burstInterval,
				customBursts: override.customBursts,
				customBrutes: override.customBrutes,
				customSlingers: override.customSlingers,
				customKamikazes: override.customKamikazes,
				customBossMinors: override.customBossMinors,
				customBosses: override.customBosses
			};
		}
		if (currentState && targetWave === currentState.wave) {
			return {
				burstCount: currentState.burstCount,
				burstInterval: currentState.burstInterval,
				customBursts: currentState.customBursts,
				customBrutes: currentState.customBrutes,
				customSlingers: currentState.customSlingers,
				customKamikazes: currentState.customKamikazes,
				customBossMinors: currentState.customBossMinors,
				customBosses: currentState.customBosses
			};
		}
		if (bridge && typeof bridge.getWavePresetConfig === "function") {
			const preset = bridge.getWavePresetConfig(targetWave);
			if (preset) {
				return {
					burstCount: preset.burstCount,
					burstInterval: preset.burstInterval,
					customBursts: preset.customBursts,
					customBrutes: preset.customBrutes,
					customSlingers: preset.customSlingers,
					customKamikazes: preset.customKamikazes,
					customBossMinors: preset.customBossMinors,
					customBosses: preset.customBosses
				};
			}
		}
		return {
			burstCount: 5,
			burstInterval: INTERVAL_UNITS_PER_SECOND * 3,
			customBursts: undefined,
			customBrutes: undefined,
			customSlingers: undefined,
			customKamikazes: undefined,
			customBossMinors: undefined,
			customBosses: undefined
		};
	}

	function closeWaveEditor() {
		const bridge = window.SentinelEditorBridge;
		if (!waveEditorOverlay) return;
		waveEditorOverlay.remove();
		waveEditorOverlay = null;
		if (bridge && typeof bridge.setEditorSessionActive === "function") {
			bridge.setEditorSessionActive(false);
		}
		if (bridge && typeof bridge.setPaused === "function") {
			bridge.setPaused(waveEditorWasPaused);
		}
	}

	function showWaveEditor() {
		const bridge = window.SentinelEditorBridge;
		if (!bridge || typeof bridge.getWaveEditorState !== "function") return;
		if (waveEditorOverlay) return;

		waveEditorWasPaused = typeof bridge.getPaused === "function" ? !!bridge.getPaused() : false;
		if (typeof bridge.setPaused === "function") bridge.setPaused(true);
		if (typeof bridge.setEditorSessionActive === "function") bridge.setEditorSessionActive(true);

		const initialState = bridge.getWaveEditorState();
		const selectedWaveState = { value: Math.max(1, initialState.wave || 1) };

		waveEditorOverlay = document.createElement("div");
		waveEditorOverlay.id = "waveEditorOverlay";
		waveEditorOverlay.style.position = "fixed";
		waveEditorOverlay.style.left = "0";
		waveEditorOverlay.style.top = "0";
		waveEditorOverlay.style.width = "100vw";
		waveEditorOverlay.style.height = "100vh";
		waveEditorOverlay.style.background = "rgba(0, 0, 0, 0.84)";
		waveEditorOverlay.style.display = "flex";
		waveEditorOverlay.style.justifyContent = "center";
		waveEditorOverlay.style.alignItems = "center";
		waveEditorOverlay.style.zIndex = "1200";

		const panel = document.createElement("div");
		panel.id = "waveEditorPanel";
		panel.style.width = "min(980px, 94vw)";
		panel.style.maxHeight = "88vh";
		panel.style.boxSizing = "border-box";
		panel.style.overflowY = "auto";
		panel.style.overflowX = "hidden";
		panel.style.scrollbarWidth = "none";
		panel.style.msOverflowStyle = "none";
		panel.style.background = "rgba(0, 20, 30, 0.98)";
		panel.style.border = "2px solid #00ffdd";
		panel.style.borderRadius = "10px";
		panel.style.boxShadow = "0 0 28px rgba(0, 255, 221, 0.35)";
		panel.style.padding = "16px";
		panel.style.color = "#c8ffff";
		panel.style.fontFamily = "sans-serif";
		waveEditorOverlay.appendChild(panel);

		const panelScrollbarStyle = document.createElement("style");
		panelScrollbarStyle.textContent = "#waveEditorPanel::-webkit-scrollbar { display: none; }";
		waveEditorOverlay.appendChild(panelScrollbarStyle);

		const title = document.createElement("h2");
		title.textContent = "WAVE EDITOR";
		title.style.margin = "0 0 10px 0";
		title.style.color = "#00ffdd";
		panel.appendChild(title);

		const subtitle = document.createElement("div");
		subtitle.textContent = "Edit burst timing/composition in seconds and generate/load wave codes.";
		subtitle.style.marginBottom = "12px";
		subtitle.style.fontSize = "0.95rem";
		panel.appendChild(subtitle);

		const sandboxNotice = document.createElement("div");
		sandboxNotice.textContent = "Editor sessions are sandboxed: protocol pickups do not permanently discover protocols and do not grant bytes.";
		sandboxNotice.style.marginBottom = "12px";
		sandboxNotice.style.fontSize = "0.84rem";
		sandboxNotice.style.color = "#9de8ff";
		sandboxNotice.style.border = "1px solid rgba(157, 232, 255, 0.45)";
		sandboxNotice.style.borderRadius = "6px";
		sandboxNotice.style.padding = "8px 10px";
		panel.appendChild(sandboxNotice);

		const makeLabel = (text) => {
			const label = document.createElement("div");
			label.textContent = text;
			label.style.color = "#7ff9ff";
			label.style.fontSize = "0.86rem";
			label.style.marginBottom = "4px";
			return label;
		};

		const makeInput = () => {
			const input = document.createElement("input");
			input.type = "text";
			input.style.width = "100%";
			input.style.maxWidth = "100%";
			input.style.minWidth = "0";
			input.style.display = "block";
			input.style.boxSizing = "border-box";
			input.style.padding = "7px";
			input.style.borderRadius = "6px";
			input.style.border = "1px solid rgba(0,255,221,0.4)";
			input.style.background = "rgba(0,0,0,0.45)";
			input.style.color = "#d8ffff";
			return input;
		};

		const makeSection = (titleText) => {
			const section = document.createElement("div");
			section.style.border = "1px solid rgba(0,255,221,0.35)";
			section.style.borderRadius = "8px";
			section.style.padding = "12px";
			section.style.marginBottom = "12px";
			const heading = document.createElement("div");
			heading.textContent = titleText;
			heading.style.color = "#00ffdd";
			heading.style.fontWeight = "bold";
			heading.style.marginBottom = "8px";
			section.appendChild(heading);
			panel.appendChild(section);
			return section;
		};

		const waveSection = makeSection("Wave Controls");
		const rowA = document.createElement("div");
		rowA.style.display = "grid";
		rowA.style.gridTemplateColumns = "repeat(auto-fit, minmax(210px, 1fr))";
		rowA.style.gap = "10px";
		waveSection.appendChild(rowA);

		const waveInputWrap = document.createElement("div");
		waveInputWrap.appendChild(makeLabel("Target Wave"));
		const waveInput = makeInput();
		waveInput.value = String(selectedWaveState.value);
		waveInputWrap.appendChild(waveInput);
		rowA.appendChild(waveInputWrap);

		const burstCountWrap = document.createElement("div");
		burstCountWrap.appendChild(makeLabel("Burst Count (use Infinity)"));
		const burstCountInput = makeInput();
		burstCountWrap.appendChild(burstCountInput);
		rowA.appendChild(burstCountWrap);

		const burstIntervalWrap = document.createElement("div");
		burstIntervalWrap.appendChild(makeLabel("Burst Interval (seconds)"));
		const burstIntervalInput = makeInput();
		burstIntervalWrap.appendChild(burstIntervalInput);
		rowA.appendChild(burstIntervalWrap);

		const rowB = document.createElement("div");
		rowB.style.display = "grid";
		rowB.style.gridTemplateColumns = "repeat(auto-fit, minmax(210px, 1fr))";
		rowB.style.gap = "10px";
		rowB.style.marginTop = "10px";
		waveSection.appendChild(rowB);

		const gruntWrap = document.createElement("div");
		gruntWrap.appendChild(makeLabel("Grunts per burst (comma list)"));
		const gruntInput = makeInput();
		gruntWrap.appendChild(gruntInput);
		rowB.appendChild(gruntWrap);

		const slingerWrap = document.createElement("div");
		slingerWrap.appendChild(makeLabel("Slingers per burst (comma list)"));
		const slingerInput = makeInput();
		slingerWrap.appendChild(slingerInput);
		rowB.appendChild(slingerWrap);

		const bruteWrap = document.createElement("div");
		bruteWrap.appendChild(makeLabel("Brutes per burst (comma list)"));
		const bruteInput = makeInput();
		bruteWrap.appendChild(bruteInput);
		rowB.appendChild(bruteWrap);

		const rowC = document.createElement("div");
		rowC.style.display = "grid";
		rowC.style.gridTemplateColumns = "repeat(auto-fit, minmax(210px, 1fr))";
		rowC.style.gap = "10px";
		rowC.style.marginTop = "10px";
		waveSection.appendChild(rowC);

		const kamikazeWrap = document.createElement("div");
		kamikazeWrap.appendChild(makeLabel("Kamikazes per burst (comma list)"));
		const kamikazeInput = makeInput();
		kamikazeWrap.appendChild(kamikazeInput);
		rowC.appendChild(kamikazeWrap);

		const bossMinorWrap = document.createElement("div");
		bossMinorWrap.appendChild(makeLabel("Boss Minors per burst (comma list)"));
		const bossMinorInput = makeInput();
		bossMinorWrap.appendChild(bossMinorInput);
		rowC.appendChild(bossMinorWrap);

		const bossWrap = document.createElement("div");
		bossWrap.appendChild(makeLabel("Grunt Bosses per burst (comma list)"));
		const bossInput = makeInput();
		bossWrap.appendChild(bossInput);
		rowC.appendChild(bossWrap);

		const waveStatus = document.createElement("div");
		waveStatus.style.marginTop = "10px";
		waveStatus.style.fontSize = "0.85rem";
		waveStatus.style.color = "#9de8ff";
		waveSection.appendChild(waveStatus);

		const playerSection = makeSection("Player Test Stats");
		const playerGrid = document.createElement("div");
		playerGrid.style.display = "grid";
		playerGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(170px, 1fr))";
		playerGrid.style.gap = "10px";
		playerSection.appendChild(playerGrid);

		const playerInputs = {};
		const playerFields = [
			["level", "Level"],
			["Range", "Range"],
			["Power", "Power"],
			["AttackSpeed", "Attack Speed"],
			["Movement", "Movement"],
			["Vitality", "Vitality"],
			["Pickup", "Pickup"],
			["statPoints", "Stat Points"],
			["health", "Current Health"]
		];

		playerFields.forEach(([key, label]) => {
			const wrap = document.createElement("div");
			wrap.appendChild(makeLabel(label));
			const input = makeInput();
			wrap.appendChild(input);
			playerInputs[key] = input;
			playerGrid.appendChild(wrap);
		});

		const playerStatus = document.createElement("div");
		playerStatus.style.marginTop = "10px";
		playerStatus.style.fontSize = "0.85rem";
		playerStatus.style.color = "#9de8ff";
		playerSection.appendChild(playerStatus);

		const actionRow = document.createElement("div");
		actionRow.style.display = "flex";
		actionRow.style.flexWrap = "wrap";
		actionRow.style.gap = "8px";
		actionRow.style.marginTop = "8px";
		panel.appendChild(actionRow);

		const codeSection = makeSection("Wave Code");
		const waveCodeWrap = document.createElement("div");
		waveCodeWrap.appendChild(makeLabel("Wave Code"));
		const waveCodeInput = document.createElement("textarea");
		waveCodeInput.style.width = "100%";
		waveCodeInput.style.maxWidth = "100%";
		waveCodeInput.style.minWidth = "0";
		waveCodeInput.style.boxSizing = "border-box";
		waveCodeInput.style.minHeight = "84px";
		waveCodeInput.style.padding = "7px";
		waveCodeInput.style.borderRadius = "6px";
		waveCodeInput.style.border = "1px solid rgba(0,255,221,0.4)";
		waveCodeInput.style.background = "rgba(0,0,0,0.45)";
		waveCodeInput.style.color = "#d8ffff";
		waveCodeInput.style.resize = "vertical";
		waveCodeWrap.appendChild(waveCodeInput);
		codeSection.appendChild(waveCodeWrap);

		const codeStatus = document.createElement("div");
		codeStatus.style.marginTop = "8px";
		codeStatus.style.fontSize = "0.85rem";
		codeStatus.style.color = "#9de8ff";
		codeSection.appendChild(codeStatus);

		const makeActionBtn = (label, color) => {
			const btn = document.createElement("button");
			btn.textContent = label;
			btn.type = "button";
			btn.style.flex = "1 1 180px";
			btn.style.maxWidth = "100%";
			btn.style.minWidth = "0";
			btn.style.whiteSpace = "normal";
			btn.style.boxSizing = "border-box";
			btn.style.padding = "0.55rem 0.9rem";
			btn.style.borderRadius = "6px";
			btn.style.border = `1px solid ${color}`;
			btn.style.background = "rgba(0,0,0,0.65)";
			btn.style.color = color;
			btn.style.cursor = "pointer";
			return btn;
		};

		const loadBtn = makeActionBtn("Load Wave", "#00ffdd");
		const applyWaveBtn = makeActionBtn("Apply Wave Override", "#a8ff6c");
		const spawnNowBtn = makeActionBtn("Apply + Spawn Now", "#ffe26c");
		const clearWaveBtn = makeActionBtn("Clear Wave Override", "#ff9a9a");
		const applyPlayerBtn = makeActionBtn("Apply Player Stats", "#9fd2ff");
		const clearAllBtn = makeActionBtn("Clear All Overrides", "#ff7b7b");
		const backToMenuBtn = makeActionBtn("Back to Menu", "#ffffff");
		const closeBtn = makeActionBtn("Close", "#ffffff");
		const generateCodeBtn = makeActionBtn("Generate Code", "#9de8ff");
		const loadCodeBtn = makeActionBtn("Load Code", "#9de8ff");
		const copyCodeBtn = makeActionBtn("Copy Code", "#ffffff");

		actionRow.appendChild(loadBtn);
		actionRow.appendChild(applyWaveBtn);
		actionRow.appendChild(spawnNowBtn);
		actionRow.appendChild(clearWaveBtn);
		actionRow.appendChild(backToMenuBtn);
		actionRow.appendChild(applyPlayerBtn);
		actionRow.appendChild(clearAllBtn);
		actionRow.appendChild(closeBtn);
		actionRow.appendChild(generateCodeBtn);
		actionRow.appendChild(loadCodeBtn);
		actionRow.appendChild(copyCodeBtn);

		const loadWaveIntoForm = () => {
			const parsedWave = parseInt(waveInput.value, 10);
			selectedWaveState.value = Number.isFinite(parsedWave) && parsedWave > 0 ? parsedWave : 1;
			waveInput.value = String(selectedWaveState.value);
			const source = getWaveEditorSourceConfig(selectedWaveState.value, bridge.getWaveEditorState());
			burstCountInput.value = source.burstCount === Infinity ? "Infinity" : String(source.burstCount ?? "");
			burstIntervalInput.value = String(Number(intervalUnitsToSeconds(source.burstInterval).toFixed(2)));
			gruntInput.value = formatWaveEditorList(source.customBursts);
			bruteInput.value = formatWaveEditorList(source.customBrutes);
			slingerInput.value = formatWaveEditorList(source.customSlingers);
			kamikazeInput.value = formatWaveEditorList(source.customKamikazes);
			bossMinorInput.value = formatWaveEditorList(source.customBossMinors);
			bossInput.value = formatWaveEditorList(source.customBosses);
			waveStatus.textContent = `Editing wave ${selectedWaveState.value}.`;
		};

		const applyWaveOverride = (spawnImmediately) => {
			const targetWave = parseInt(waveInput.value, 10);
			if (!Number.isFinite(targetWave) || targetWave < 1) {
				waveStatus.textContent = "Enter a valid wave number (1+).";
				return;
			}

			const burstCountRaw = (burstCountInput.value || "").trim();
			let parsedBurstCount;
			if (burstCountRaw.toLowerCase() === "infinity") {
				parsedBurstCount = Infinity;
			} else {
				const numericBurstCount = parseInt(burstCountRaw, 10);
				if (!Number.isFinite(numericBurstCount) || numericBurstCount < 0) {
					waveStatus.textContent = "Burst count must be a number or Infinity.";
					return;
				}
				parsedBurstCount = numericBurstCount;
			}

			const parsedBurstIntervalSeconds = parseFloat((burstIntervalInput.value || "").trim());
			if (!Number.isFinite(parsedBurstIntervalSeconds) || parsedBurstIntervalSeconds <= 0) {
				waveStatus.textContent = "Burst interval must be a positive number of seconds.";
				return;
			}

			waveEditorOverrides[targetWave] = {
				burstCount: parsedBurstCount,
				burstInterval: secondsToIntervalUnits(parsedBurstIntervalSeconds),
				customBursts: parseWaveEditorList(gruntInput.value),
				customBrutes: parseWaveEditorList(bruteInput.value),
				customSlingers: parseWaveEditorList(slingerInput.value),
				customKamikazes: parseWaveEditorList(kamikazeInput.value),
				customBossMinors: parseWaveEditorList(bossMinorInput.value),
				customBosses: parseWaveEditorList(bossInput.value)
			};

			waveStatus.textContent = `Wave ${targetWave} override applied.`;

			if (spawnImmediately && typeof bridge.spawnWaveNow === "function") {
				bridge.spawnWaveNow(targetWave, waveEditorOverrides[targetWave]);
				waveStatus.textContent = `Wave ${targetWave} override applied and spawned.`;
			}
		};

		const loadPlayerForm = () => {
			const player = bridge.getPlayer();
			playerInputs.level.value = String(typeof bridge.getLevel === "function" ? bridge.getLevel() : 1);
			playerInputs.Range.value = String(player.stats.Range || 0);
			playerInputs.Power.value = String(player.stats.Power || 0);
			playerInputs.AttackSpeed.value = String(player.stats.AttackSpeed || 0);
			playerInputs.Movement.value = String(player.stats.Movement || 0);
			playerInputs.Vitality.value = String(player.stats.Vitality || 0);
			playerInputs.Pickup.value = String(player.stats.Pickup || 0);
			playerInputs.statPoints.value = String(bridge.getStatPoints());
			playerInputs.health.value = String(Math.round(player.health));
			playerStatus.textContent = "Player values loaded.";
		};

		const applyPlayerValues = () => {
			const player = bridge.getPlayer();
			const parsedLevel = parseInt((playerInputs.level.value || "").trim(), 10);
			if (!Number.isFinite(parsedLevel) || parsedLevel < 1) {
				playerStatus.textContent = "Level must be 1 or greater.";
				return;
			}

			if (typeof bridge.setLevel === "function") {
				bridge.setLevel(parsedLevel);
			}

			const keys = ["Range", "Power", "AttackSpeed", "Movement", "Vitality", "Pickup"];
			for (const key of keys) {
				const value = parseInt((playerInputs[key].value || "").trim(), 10);
				if (!Number.isFinite(value) || value < 0) {
					playerStatus.textContent = `${key} must be 0 or greater.`;
					return;
				}
				player.stats[key] = value;
			}

			const parsedStatPoints = parseInt((playerInputs.statPoints.value || "").trim(), 10);
			if (!Number.isFinite(parsedStatPoints) || parsedStatPoints < 0) {
				playerStatus.textContent = "Stat Points must be 0 or greater.";
				return;
			}

			bridge.setStatPoints(parsedStatPoints);
			if (typeof bridge.applyStats === "function") bridge.applyStats();

			const parsedHealth = parseFloat((playerInputs.health.value || "").trim());
			if (Number.isFinite(parsedHealth)) {
				player.health = Math.max(0, Math.min(player.maxHealth, parsedHealth));
			}

			playerStatus.textContent = "Player test stats applied.";
			loadPlayerForm();
		};

		loadBtn.addEventListener("click", loadWaveIntoForm);
		applyWaveBtn.addEventListener("click", () => applyWaveOverride(false));
		spawnNowBtn.addEventListener("click", () => applyWaveOverride(true));
		clearWaveBtn.addEventListener("click", () => {
			const targetWave = parseInt(waveInput.value, 10);
			if (!Number.isFinite(targetWave) || targetWave < 1) {
				waveStatus.textContent = "Enter a valid wave number (1+) to clear.";
				return;
			}
			delete waveEditorOverrides[targetWave];
			waveStatus.textContent = `Wave ${targetWave} override cleared.`;
			loadWaveIntoForm();
		});
		clearAllBtn.addEventListener("click", () => {
			Object.keys(waveEditorOverrides).forEach(key => delete waveEditorOverrides[key]);
			waveStatus.textContent = "All wave overrides cleared.";
			loadWaveIntoForm();
		});
		backToMenuBtn.addEventListener("click", () => {
			closeWaveEditor();
			if (typeof window._showMainMenu === "function") {
				window._showMainMenu();
			}
		});
		applyPlayerBtn.addEventListener("click", applyPlayerValues);
		generateCodeBtn.addEventListener("click", () => {
			try {
				waveCodeInput.value = encodeWaveCode(waveEditorOverrides);
				codeStatus.textContent = "Wave code generated.";
			} catch (_) {
				codeStatus.textContent = "Failed to generate wave code.";
			}
		});
		loadCodeBtn.addEventListener("click", () => {
			try {
				activateWaveCode(waveCodeInput.value);
				codeStatus.textContent = "Wave code loaded.";
				loadWaveIntoForm();
			} catch (err) {
				codeStatus.textContent = err && err.message ? err.message : "Invalid wave code.";
			}
		});
		copyCodeBtn.addEventListener("click", async () => {
			const code = (waveCodeInput.value || "").trim();
			if (!code) {
				codeStatus.textContent = "Generate or load a code first.";
				return;
			}
			try {
				if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
					await navigator.clipboard.writeText(code);
				} else {
					waveCodeInput.focus();
					waveCodeInput.select();
					document.execCommand("copy");
				}
				codeStatus.textContent = "Wave code copied to clipboard.";
			} catch (_) {
				codeStatus.textContent = "Could not copy code.";
			}
		});
		closeBtn.addEventListener("click", closeWaveEditor);

		waveEditorOverlay.addEventListener("click", (event) => {
			if (event.target === waveEditorOverlay) {
				closeWaveEditor();
			}
		});

		document.body.appendChild(waveEditorOverlay);
		loadWaveIntoForm();
		loadPlayerForm();
	}

	if (typeof window.sentinelWaveCode === "string" && window.sentinelWaveCode.trim().startsWith(WAVE_CODE_PREFIX)) {
		try { activateWaveCode(window.sentinelWaveCode); } catch (_) {}
	}

	window.SentinelEditor = {
		showWaveEditor,
		closeWaveEditor,
		getActiveWaveOverride,
		getWaveEditorBurstValue,
		generateWaveCode: () => encodeWaveCode(waveEditorOverrides),
		decodeWaveCode,
		getWaveConfigFromCode,
		activateWaveCode,
		getCurrentOverrides: () => cloneOverrides(waveEditorOverrides)
	};
})();
