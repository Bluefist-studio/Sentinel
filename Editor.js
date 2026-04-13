(function () {
	const WAVE_CODE_PREFIX_V1 = "SWC1:";
	const WAVE_CODE_PREFIX_V2 = "SWC2:";
	const WAVE_CODE_PREFIX_V3 = "SWC3:";
	const INTERVAL_UNITS_PER_SECOND = 120;
	
	// Timeline mob type compression mapping
	const TIMELINE_MOB_COMPRESS_MAP = {
		grunts: "g",
		brutes: "b",
		slingers: "s",
		shielders: "sh",
		beamers: "be",
		kamikazes: "k",
		stalkers: "st",
		gruntbossminor: "gbm",
		gruntboss: "gb",
		slingerboss: "sb",
		bruteboss: "bb"
	};
	
	const TIMELINE_MOB_DECOMPRESS_MAP = {
		g: "grunts",
		b: "brutes",
		s: "slingers",
		sh: "shielders",
		be: "beamers",
		k: "kamikazes",
		st: "stalkers",
		gbm: "gruntbossminor",
		gb: "gruntboss",
		sb: "slingerboss",
		bb: "bruteboss"
	};
	
	// Load wave overrides from localStorage
	let waveEditorOverrides = {};
	try {
		const saved = localStorage.getItem("sentinel.waveEditorOverrides");
		if (saved) {
			waveEditorOverrides = JSON.parse(saved);
		}
	} catch (err) {
		waveEditorOverrides = {};
	}
	
	// CRITICAL: Remove any legacy/non-timeline overrides for waves 1-15 to prevent conflicts
	// Waves 1-15 should ONLY use the timeline codes from DEFAULT_WAVE_EDITOR_CODES
	for (let w = 1; w <= 15; w++) {
		const override = waveEditorOverrides[w];
		if (override && !override.timelineMode) {
			delete waveEditorOverrides[w];
		}
	}
	
	// Helper function to load default code wave for a specific wave number
	function ensureDefaultCodeLoaded(waveNum) {
		// Skip if already in localStorage
		if (waveEditorOverrides[waveNum]) {
			return;
		}
		
		// Skip if already in session
		if (window._editorWaveOverride && window._editorWaveOverride[waveNum]) {
			return;
		}
		
		const code = window.SentinelWaveEditorCodes && window.SentinelWaveEditorCodes[waveNum];
		if (!code) {
			return;
		}
		
		if (!window.SentinelEditor || typeof window.SentinelEditor.decodeWaveCode !== "function") {
			return;
		}
		
		try {
			const decoded = window.SentinelEditor.decodeWaveCode(code);
			const waveCfg = decoded[waveNum];
			if (waveCfg && waveCfg.timelineMode && waveCfg.timeline) {
				if (!window._editorWaveOverride) {
					window._editorWaveOverride = {};
				}
				window._editorWaveOverride[waveNum] = {
					timelineMode: true,
					timeline: waveCfg.timeline,
					_source: 'defaultCode'
				};
				return true;
			}
		} catch (err) {
		}
		return false;
	}
	
	// Make globally accessible
	window.waveEditorOverrides = waveEditorOverrides;
	window.ensureDefaultCodeLoaded = ensureDefaultCodeLoaded;
	
	let waveEditorOverlay = null;
	let waveEditorWasPaused = false;
	let autoScalePlayerToLoadedWave = true;
	let discoverAllProtocolsInEditor = false;
	const SWC2_ARRAY_FIELD_MAP = {
		customBursts: "g",
		customBrutes: "br",
		customSlingers: "sl",
		customShielders: "sh",
		customBeamers: "be",
		customKamikazes: "k",
		customStalkers: "st",
		customGruntBossMinors: "bm",
		customGruntBosses: "bo",
		customSlingerBosses: "sb",
		customBruteBosses: "bb",
		customStalkerBosses: "stb"
	};
	const SWC2_INTERVAL_FIELD_MAP = {
		grunts: "g",
		slingers: "sl",
		shielders: "sh",
		beamers: "be",
		stalkers: "st",
		brutes: "br",
		kamikazes: "k",
		gruntBossMinor: "bm",
		gruntBoss: "bo",
		slingerBoss: "sb",
		bruteBoss: "bb"
	};

	function hasSupportedWaveCodePrefix(raw) {
		return raw.startsWith(WAVE_CODE_PREFIX_V1) || raw.startsWith(WAVE_CODE_PREFIX_V2) || raw.startsWith(WAVE_CODE_PREFIX_V3);
	}

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

	function normalizeMobIntervals(intervals) {
		if (!intervals || typeof intervals !== "object") return undefined;
		const out = {};
		const aliases = {
			grunts: "grunts",
			slingers: "slingers",
			shielders: "shielders",
			beamers: "beamers",
			stalkers: "stalkers",
			brutes: "brutes",
			kamikazes: "kamikazes",
			gruntBossMinor: "gruntBossMinor",
			gruntBoss: "gruntBoss",
			bossMinors: "bossMinors",
			bosses: "bosses",
			slingerBoss: "slingerBoss",
			bruteBoss: "bruteBoss",
			gruntbossminor: "gruntBossMinor",
			gruntboss: "gruntBoss",
			slingerboss: "slingerBoss",
			bruteboss: "bruteBoss"
		};
		Object.entries(intervals).forEach(([inputKey, inputValue]) => {
			const resolvedKey = aliases[inputKey];
			if (!resolvedKey) return;
			const raw = Number(inputValue);
			// Allow explicit 0 to mean 'use wave burst interval' (pass through 0)
			if (Number.isFinite(raw) && raw >= 0) out[resolvedKey] = Math.round(raw);
		});
		return Object.keys(out).length ? out : undefined;
	}

	function cloneOverrides(overrides) {
		const out = {};
		Object.keys(overrides || {}).forEach((waveKey) => {
			const entry = overrides[waveKey];
			if (!entry) return;
			
			// Handle timeline-based waves
			if (entry.timelineMode && entry.timeline) {
				out[waveKey] = {
					timelineMode: true,
					timeline: entry.timeline
				};
				return;
			}
			
			// Handle burst-based waves
			out[waveKey] = {
				burstCount: entry.burstCount,
				burstInterval: entry.burstInterval,
				customBursts: Array.isArray(entry.customBursts) ? entry.customBursts.slice() : undefined,
				customBrutes: Array.isArray(entry.customBrutes) ? entry.customBrutes.slice() : undefined,
				customSlingers: Array.isArray(entry.customSlingers) ? entry.customSlingers.slice() : undefined,
				customShielders: Array.isArray(entry.customShielders) ? entry.customShielders.slice() : undefined,
				customBeamers: Array.isArray(entry.customBeamers) ? entry.customBeamers.slice() : undefined,
				customKamikazes: Array.isArray(entry.customKamikazes) ? entry.customKamikazes.slice() : undefined,
				customStalkers: Array.isArray(entry.customStalkers) ? entry.customStalkers.slice() : undefined,
				customBossMinors: Array.isArray(entry.customBossMinors) ? entry.customBossMinors.slice() : undefined,
				customBosses: Array.isArray(entry.customBosses) ? entry.customBosses.slice() : undefined,
				customSlingerBosses: Array.isArray(entry.customSlingerBosses) ? entry.customSlingerBosses.slice() : undefined,
				customBruteBosses: Array.isArray(entry.customBruteBosses) ? entry.customBruteBosses.slice() : undefined,
				customStalkerBosses: Array.isArray(entry.customStalkerBosses) ? entry.customStalkerBosses.slice() : undefined,
				mobIntervals: normalizeMobIntervals(entry.mobIntervals)
			};
		});
		return out;
	}

	function serializeOverrides(overrides) {
		const normalized = {};
		Object.keys(overrides || {}).forEach((waveKey) => {
			const src = overrides[waveKey];
			if (!src) return;
			
			// Handle timeline-based waves
			if (src.timelineMode && src.timeline) {
				normalized[waveKey] = {
					timelineMode: true,
					timeline: src.timeline
				};
				return;
			}

			normalized[waveKey] = {
				burstCount: src.burstCount === Infinity ? "INF" : src.burstCount,
				burstIntervalSeconds: Number(intervalUnitsToSeconds(src.burstInterval).toFixed(3)),
				customBursts: Array.isArray(src.customBursts) ? src.customBursts.slice() : undefined,
				customBrutes: Array.isArray(src.customBrutes) ? src.customBrutes.slice() : undefined,
				customSlingers: Array.isArray(src.customSlingers) ? src.customSlingers.slice() : undefined,
				customShielders: Array.isArray(src.customShielders) ? src.customShielders.slice() : undefined,
				customBeamers: Array.isArray(src.customBeamers) ? src.customBeamers.slice() : undefined,
				customKamikazes: Array.isArray(src.customKamikazes) ? src.customKamikazes.slice() : undefined,
				customStalkers: Array.isArray(src.customStalkers) ? src.customStalkers.slice() : undefined,
				customGruntBossMinors: Array.isArray(src.customGruntBossMinors)
					? src.customGruntBossMinors.slice()
					: (Array.isArray(src.customBossMinors) ? src.customBossMinors.slice() : undefined),
				customGruntBosses: Array.isArray(src.customGruntBosses)
					? src.customGruntBosses.slice()
					: (Array.isArray(src.customBosses) ? src.customBosses.slice() : undefined),
				customSlingerBosses: Array.isArray(src.customSlingerBosses) ? src.customSlingerBosses.slice() : undefined,
				customBruteBosses: Array.isArray(src.customBruteBosses) ? src.customBruteBosses.slice() : undefined,
				customStalkerBosses: Array.isArray(src.customStalkerBosses) ? src.customStalkerBosses.slice() : undefined,
				mobIntervalsSeconds: src.mobIntervals
					? {
						grunts: src.mobIntervals.grunts ? Number(intervalUnitsToSeconds(src.mobIntervals.grunts).toFixed(3)) : undefined,
						slingers: src.mobIntervals.slingers ? Number(intervalUnitsToSeconds(src.mobIntervals.slingers).toFixed(3)) : undefined,
						shielders: src.mobIntervals.shielders ? Number(intervalUnitsToSeconds(src.mobIntervals.shielders).toFixed(3)) : undefined,
						beamers: src.mobIntervals.beamers ? Number(intervalUnitsToSeconds(src.mobIntervals.beamers).toFixed(3)) : undefined,
						stalkers: src.mobIntervals.stalkers ? Number(intervalUnitsToSeconds(src.mobIntervals.stalkers).toFixed(3)) : undefined,
						brutes: src.mobIntervals.brutes ? Number(intervalUnitsToSeconds(src.mobIntervals.brutes).toFixed(3)) : undefined,
						kamikazes: src.mobIntervals.kamikazes ? Number(intervalUnitsToSeconds(src.mobIntervals.kamikazes).toFixed(3)) : undefined,
						gruntBossMinor: (src.mobIntervals.gruntBossMinor || src.mobIntervals.bossMinors) ? Number(intervalUnitsToSeconds(src.mobIntervals.gruntBossMinor || src.mobIntervals.bossMinors).toFixed(3)) : undefined,
						gruntBoss: (src.mobIntervals.gruntBoss || src.mobIntervals.bosses) ? Number(intervalUnitsToSeconds(src.mobIntervals.gruntBoss || src.mobIntervals.bosses).toFixed(3)) : undefined,
						slingerBoss: (src.mobIntervals.slingerBoss || src.mobIntervals.slingerboss) ? Number(intervalUnitsToSeconds(src.mobIntervals.slingerBoss || src.mobIntervals.slingerboss).toFixed(3)) : undefined,
						bruteBoss: (src.mobIntervals.bruteBoss || src.mobIntervals.bruteboss) ? Number(intervalUnitsToSeconds(src.mobIntervals.bruteBoss || src.mobIntervals.bruteboss).toFixed(3)) : undefined
					}
					: undefined
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
			
			// Handle timeline-based waves
			if (src.timelineMode && src.timeline) {
				restored[waveNumber] = {
					timelineMode: true,
					timeline: src.timeline
				};
				return;
			}

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
				customShielders: Array.isArray(src.customShielders) ? src.customShielders.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customBeamers: Array.isArray(src.customBeamers) ? src.customBeamers.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customKamikazes: Array.isArray(src.customKamikazes) ? src.customKamikazes.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customStalkers: Array.isArray(src.customStalkers) ? src.customStalkers.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customBossMinors: Array.isArray(src.customGruntBossMinors)
					? src.customGruntBossMinors.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0)
					: (Array.isArray(src.customBossMinors) ? src.customBossMinors.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined),
				customBosses: Array.isArray(src.customGruntBosses)
					? src.customGruntBosses.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0)
					: (Array.isArray(src.customBosses) ? src.customBosses.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined),
				customGruntBossMinors: Array.isArray(src.customGruntBossMinors)
					? src.customGruntBossMinors.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0)
					: (Array.isArray(src.customBossMinors) ? src.customBossMinors.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined),
				customGruntBosses: Array.isArray(src.customGruntBosses)
					? src.customGruntBosses.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0)
					: (Array.isArray(src.customBosses) ? src.customBosses.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined),
				customSlingerBosses: Array.isArray(src.customSlingerBosses) ? src.customSlingerBosses.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customBruteBosses: Array.isArray(src.customBruteBosses) ? src.customBruteBosses.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				customStalkerBosses: Array.isArray(src.customStalkerBosses) ? src.customStalkerBosses.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0) : undefined,
				mobIntervals: normalizeMobIntervals(
					src.mobIntervalsSeconds
						? {
							grunts: src.mobIntervalsSeconds.grunts ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.grunts)) : undefined,
							slingers: src.mobIntervalsSeconds.slingers ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.slingers)) : undefined,
							shielders: src.mobIntervalsSeconds.shielders ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.shielders)) : undefined,
							beamers: src.mobIntervalsSeconds.beamers ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.beamers)) : undefined,
							stalkers: src.mobIntervalsSeconds.stalkers ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.stalkers)) : undefined,
							brutes: src.mobIntervalsSeconds.brutes ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.brutes)) : undefined,
							kamikazes: src.mobIntervalsSeconds.kamikazes ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.kamikazes)) : undefined,
							gruntBossMinor: (src.mobIntervalsSeconds.gruntBossMinor || src.mobIntervalsSeconds.bossMinors) ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.gruntBossMinor || src.mobIntervalsSeconds.bossMinors)) : undefined,
							gruntBoss: (src.mobIntervalsSeconds.gruntBoss || src.mobIntervalsSeconds.bosses) ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.gruntBoss || src.mobIntervalsSeconds.bosses)) : undefined,
							slingerBoss: src.mobIntervalsSeconds.slingerBoss ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.slingerBoss)) : undefined,
							bruteBoss: src.mobIntervalsSeconds.bruteBoss ? secondsToIntervalUnits(parseFloat(src.mobIntervalsSeconds.bruteBoss)) : undefined
						}
						: undefined
				)
			};
		});
		return restored;
	}

	function encodeJsonPayload(payload) {
		const json = JSON.stringify(payload);
		return btoa(unescape(encodeURIComponent(json)));
	}

	function decodeJsonPayload(encoded) {
		const json = decodeURIComponent(escape(atob(encoded)));
		return JSON.parse(json);
	}

	// Compress timeline data for SWC3 format
	function compressTimelineData(timeline) {
		if (!timeline || typeof timeline !== "object") return null;
		
		const compressed = {
			d: timeline.duration || 30,
			e: timeline.endCondition || "duration"
		};
		
		// Compress mobs - only include non-empty mob types, use short keys, store as [time, amount] arrays
		const compressedMobs = {};
		if (timeline.mobs && typeof timeline.mobs === "object") {
			for (const [mobType, events] of Object.entries(timeline.mobs)) {
				if (!Array.isArray(events) || events.length === 0) continue;
				const shortKey = TIMELINE_MOB_COMPRESS_MAP[mobType];
				if (!shortKey) continue;
				
				// Convert {time, amount, mode} objects to [time, amount] arrays
				const compressedEvents = events.map(evt => [evt.time, evt.amount]);
				compressedMobs[shortKey] = compressedEvents;
			}
		}
		
		if (Object.keys(compressedMobs).length > 0) {
			compressed.m = compressedMobs;
		}
		
		return compressed;
	}
	
	// Decompress timeline data from SWC3 format
	function decompressTimelineData(compressed) {
		if (!compressed || typeof compressed !== "object") {
			return null;
		}
		
		const timeline = {
			duration: compressed.d || 30,
			endCondition: compressed.e || "duration",
			mobs: {}
		};
		
		// Initialize all mob types as empty arrays
		for (const fullName of Object.values(TIMELINE_MOB_DECOMPRESS_MAP)) {
			timeline.mobs[fullName] = [];
		}
		
		// Decompress mobs - convert [time, amount] arrays back to {time, amount, mode} objects
		if (compressed.m && typeof compressed.m === "object") {
			for (const [shortKey, compressedEvents] of Object.entries(compressed.m)) {
				const fullName = TIMELINE_MOB_DECOMPRESS_MAP[shortKey];
				
				if (!fullName) {
					continue;
				}
				
				if (Array.isArray(compressedEvents)) {
					timeline.mobs[fullName] = compressedEvents.map(([time, amount]) => ({
						time,
						amount,
						mode: "event"
					}));
				}
			}
		}
		return timeline;
	}

	function toNonNegativeIntList(list) {
		if (!Array.isArray(list)) return undefined;
		const values = list.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0);
		return values.length ? values : undefined;
	}

	function compressArrayForSWC2(list) {
		const values = toNonNegativeIntList(list);
		if (!values) return undefined;
		const hasAnyNonZero = values.some((value) => value > 0);
		if (!hasAnyNonZero) return undefined;
		const pairs = [];
		for (let i = 0; i < values.length; i++) {
			if (values[i] > 0) pairs.push([i, values[i]]);
		}
		if (pairs.length <= Math.floor(values.length * 0.6)) {
			return { n: values.length, p: pairs };
		}
		return { f: values };
	}

	function expandArrayFromSWC2(value) {
		if (Array.isArray(value)) return toNonNegativeIntList(value);
		if (!value || typeof value !== "object") return undefined;
		if (Array.isArray(value.f)) return toNonNegativeIntList(value.f);
		if (!Array.isArray(value.p)) return undefined;

		const pairs = value.p;
		let length = parseInt(value.n, 10);
		if (!Number.isFinite(length) || length <= 0) {
			length = 0;
			pairs.forEach((pair) => {
				if (!Array.isArray(pair) || pair.length < 2) return;
				const index = parseInt(pair[0], 10);
				if (Number.isFinite(index) && index >= 0) {
					length = Math.max(length, index + 1);
				}
			});
		}
		if (length <= 0) return undefined;

		const out = Array.from({ length }, () => 0);
		pairs.forEach((pair) => {
			if (!Array.isArray(pair) || pair.length < 2) return;
			const index = parseInt(pair[0], 10);
			const amount = parseInt(pair[1], 10);
			if (!Number.isFinite(index) || index < 0 || index >= out.length) return;
			if (!Number.isFinite(amount) || amount < 0) return;
			out[index] = amount;
		});
		return out;
	}

	function serializeOverridesForSWC2(overrides) {
		const serialized = serializeOverrides(overrides);
		const compact = {};

		Object.keys(serialized || {}).forEach((waveKey) => {
			const src = serialized[waveKey];
			if (!src || typeof src !== "object") return;
			
			// Handle timeline-based waves
			if (src.timelineMode && src.timeline) {
				const entry = {
					tlm: true,  // timeline mode flag
					tl: src.timeline  // timeline data
				};
				compact[waveKey] = entry;
				return;
			}

			const entry = {};

			if (src.burstCount !== undefined) {
				entry.bc = src.burstCount === "INF" ? "I" : src.burstCount;
			}
			if (src.burstIntervalSeconds !== undefined) {
				entry.bi = Number(src.burstIntervalSeconds);
			}

			Object.keys(SWC2_ARRAY_FIELD_MAP).forEach((longKey) => {
				const shortKey = SWC2_ARRAY_FIELD_MAP[longKey];
				const packed = compressArrayForSWC2(src[longKey]);
				if (packed !== undefined) entry[shortKey] = packed;
			});

			if (src.mobIntervalsSeconds && typeof src.mobIntervalsSeconds === "object") {
				const compactIntervals = {};
				Object.keys(SWC2_INTERVAL_FIELD_MAP).forEach((longKey) => {
					const shortKey = SWC2_INTERVAL_FIELD_MAP[longKey];
					const raw = Number(src.mobIntervalsSeconds[longKey]);
					if (Number.isFinite(raw) && raw > 0) {
						compactIntervals[shortKey] = Number(raw.toFixed(3));
					}
				});
				if (Object.keys(compactIntervals).length) {
					entry.mi = compactIntervals;
				}
			}

			if (Object.keys(entry).length) {
				compact[waveKey] = entry;
			}
		});

		return compact;
	}

	function deserializeOverridesFromSWC2(compactOverrides) {
		const serialized = {};
		Object.keys(compactOverrides || {}).forEach((waveKey) => {
			const src = compactOverrides[waveKey];
			if (!src || typeof src !== "object") return;
			const waveNumber = parseInt(waveKey, 10);
			if (!Number.isFinite(waveNumber) || waveNumber < 1) return;

			// Handle timeline-based waves
			if (src.tlm && src.tl) {
				serialized[waveNumber] = {
					timelineMode: true,
					timeline: src.tl
				};
				return;
			}

			const entry = {};
			if (src.bc === "I" || src.bc === "INF") {
				entry.burstCount = "INF";
			} else {
				const burstCount = parseInt(src.bc, 10);
				if (Number.isFinite(burstCount) && burstCount >= 0) {
					entry.burstCount = burstCount;
				}
			}

			const burstIntervalSeconds = Number(src.bi);
			if (Number.isFinite(burstIntervalSeconds) && burstIntervalSeconds > 0) {
				entry.burstIntervalSeconds = Number(burstIntervalSeconds.toFixed(3));
			}

			Object.keys(SWC2_ARRAY_FIELD_MAP).forEach((longKey) => {
				const shortKey = SWC2_ARRAY_FIELD_MAP[longKey];
				const unpacked = expandArrayFromSWC2(src[shortKey]);
				if (Array.isArray(unpacked) && unpacked.length) {
					entry[longKey] = unpacked;
				}
			});

			if (src.mi && typeof src.mi === "object") {
				const intervalByLongKey = {};
				Object.keys(SWC2_INTERVAL_FIELD_MAP).forEach((longKey) => {
					const shortKey = SWC2_INTERVAL_FIELD_MAP[longKey];
					const raw = Number(src.mi[shortKey]);
					if (Number.isFinite(raw) && raw > 0) {
						intervalByLongKey[longKey] = Number(raw.toFixed(3));
					}
				});
				if (Object.keys(intervalByLongKey).length) {
					entry.mobIntervalsSeconds = intervalByLongKey;
				}
			}

			if (entry.burstCount === undefined) return;
			if (entry.burstIntervalSeconds === undefined) return;
			serialized[waveNumber] = entry;
		});

		return deserializeOverrides(serialized);
	}

	function encodeWaveCode(overrides) {
		const payload = { v: 1, o: serializeOverridesForSWC2(overrides) };
		return `${WAVE_CODE_PREFIX_V2}${encodeJsonPayload(payload)}`;
	}

	// Encode a single wave - automatically chooses SWC3 for timeline or SWC2 for burst
	function encodeSingleWaveCode(waveNumber) {
		const waveNum = parseInt(waveNumber, 10);
		if (!Number.isFinite(waveNum) || waveNum < 1) {
			throw new Error("Valid wave number required.");
		}
		const override = waveEditorOverrides[waveNum];
		if (!override) {
			throw new Error(`No override data for wave ${waveNum}.`);
		}
		
		// Use SWC3 for timeline waves (60-70% shorter)
		if (override.timelineMode && override.timeline) {
			return encodeSingleTimelineWaveCode(waveNum);
		}
		
		// Use SWC2 for burst waves
		const singleWaveOverrides = { [waveNum]: override };
		const payload = { v: 1, o: serializeOverridesForSWC2(singleWaveOverrides) };
		return `${WAVE_CODE_PREFIX_V2}${encodeJsonPayload(payload)}`;
	}

	// Encode a single timeline-based wave into compact SWC3 format
	function encodeSingleTimelineWaveCode(waveNumber) {
		const waveNum = parseInt(waveNumber, 10);
		if (!Number.isFinite(waveNum) || waveNum < 1) {
			throw new Error("Valid wave number required.");
		}
		const override = waveEditorOverrides[waveNum];
		if (!override) {
			throw new Error(`No override data for wave ${waveNum}.`);
		}
		if (!override.timelineMode || !override.timeline) {
			throw new Error(`Wave ${waveNum} is not timeline-based.`);
		}
		
		// Compress the timeline
		const compressed = compressTimelineData(override.timeline);
		
		// Create SWC3 payload with single wave
		const payload = {
			v: 3,
			o: {
				[waveNum]: {
					t: true,  // timeline mode flag (compressed from "tlm")
					l: compressed  // timeline data (compressed from "tl")
				}
			}
		};
		
		return `${WAVE_CODE_PREFIX_V3}${encodeJsonPayload(payload)}`;
	}

	function decodeWaveCode(code) {
		const raw = (code || "").trim();
		
		try {
			// Support SWC3 format
			if (raw.startsWith(WAVE_CODE_PREFIX_V3)) {
				const encoded = raw.slice(WAVE_CODE_PREFIX_V3.length);
				const payload = decodeJsonPayload(encoded);
				
				if (!payload || typeof payload.o !== "object") {
					throw new Error("Invalid SWC3 payload - no wave data.");
				}
				if (payload.v !== 3) {
					throw new Error(`Invalid SWC3 version - expected v:3, got v:${payload.v}`);
				}
				// Decompress SWC3 waves
				const decompressed = {};
				Object.keys(payload.o).forEach((waveKey) => {
					const compressed = payload.o[waveKey];
					
					if (compressed && compressed.t && compressed.l) {
						const timeline = decompressTimelineData(compressed.l);
						
						decompressed[waveKey] = {
							timelineMode: true,
							timeline
						};
					}
				});
				return decompressed;
			}
			
			// Support SWC2 format (backward compatibility)
			if (raw.startsWith(WAVE_CODE_PREFIX_V2)) {
				const encoded = raw.slice(WAVE_CODE_PREFIX_V2.length);
				const payload = decodeJsonPayload(encoded);
				
				if (!payload || typeof payload.o !== "object") {
					throw new Error("Invalid SWC2 payload - no wave data.");
				}
				if (payload.v !== 1) {
					throw new Error(`Invalid SWC2 version - expected v:1, got v:${payload.v}`);
				}
				// Use deserializeOverridesFromSWC2 to decode SWC2 format
				const decoded = deserializeOverridesFromSWC2(payload.o);
				return decoded;
			}
			
			throw new Error("Unknown wave code format. Expected SWC2 or SWC3.");
			
		} catch (err) {
			throw err;
		}
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
		if (!text) return [0]; // Treat empty field as [0]
		return text
			.split(",")
			.map(part => {
				const trimmed = part.trim();
				if (trimmed === "") return 0;
				const parsed = parseInt(trimmed, 10);
				return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
			});
	}

	function formatWaveEditorList(list) {
		return Array.isArray(list) ? list.join(",") : "";
	}

	function expandSingleValueList(list, burstCount) {
		if (!Array.isArray(list) || list.length !== 1) return list;
		if (!Number.isFinite(burstCount) || burstCount <= 0) return list;
		const value = list[0] || 0;
		return Array.from({ length: burstCount }, () => value);
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
				customShielders: override.customShielders,
				customBeamers: override.customBeamers,
				customKamikazes: override.customKamikazes,
				customStalkers: override.customStalkers,
				customBossMinors: override.customBossMinors,
				customBosses: override.customBosses,
				customSlingerBosses: override.customSlingerBosses,
				customBruteBosses: override.customBruteBosses,
				customStalkerBosses: override.customStalkerBosses,
				mobIntervals: normalizeMobIntervals(override.mobIntervals)
			};
		}
		if (currentState && targetWave === currentState.wave) {
			return {
				burstCount: currentState.burstCount,
				burstInterval: currentState.burstInterval,
				customBursts: currentState.customBursts,
				customBrutes: currentState.customBrutes,
				customSlingers: currentState.customSlingers,
				customShielders: currentState.customShielders,
				customBeamers: currentState.customBeamers,
				customKamikazes: currentState.customKamikazes,
				customStalkers: currentState.customStalkers,
				customBossMinors: currentState.customBossMinors,
				customBosses: currentState.customBosses,
				customSlingerBosses: currentState.customSlingerBosses,
				customBruteBosses: currentState.customBruteBosses,
				customStalkerBosses: currentState.customStalkerBosses,
				mobIntervals: undefined
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
					customShielders: preset.customShielders,
					customBeamers: preset.customBeamers,
					customKamikazes: preset.customKamikazes,
					customStalkers: preset.customStalkers,
					customBossMinors: preset.customBossMinors,
					customBosses: preset.customBosses,
					customSlingerBosses: preset.customSlingerBosses,
					customBruteBosses: preset.customBruteBosses,
					mobIntervals: normalizeMobIntervals(preset.mobIntervals)
				};
			}
		}
		return {
			burstCount: 5,
			burstInterval: INTERVAL_UNITS_PER_SECOND * 3,
			customBursts: undefined,
			customBrutes: undefined,
			customSlingers: undefined,
			customShielders: undefined,
			customBeamers: undefined,
			customKamikazes: undefined,
			customStalkers: undefined,
			customBossMinors: undefined,
			customBosses: undefined,
			customSlingerBosses: undefined,
			customBruteBosses: undefined,
			customStalkerBosses: undefined,
			mobIntervals: undefined
		};
	}

	function closeWaveEditor(options) {
		const bridge = window.SentinelEditorBridge;
		const keepEditorSession = !!(options && options.keepEditorSession);
		if (!waveEditorOverlay) return;
		waveEditorOverlay.remove();
		waveEditorOverlay = null;
		if (bridge && typeof bridge.setEditorSessionActive === "function") {
			bridge.setEditorSessionActive(keepEditorSession);
		}
		if (bridge && typeof bridge.setPaused === "function") {
			bridge.setPaused(waveEditorWasPaused);
		}
		if (window._editorOpenedFromMenuMusic && !keepEditorSession) {
			window._editorOpenedFromMenuMusic = false;
			if (window._gameMusicAudio) {
				if (typeof window.fadeOutGameMusic === "function") {
					window.fadeOutGameMusic(800, () => {
						if (typeof window.playMenuMusic === "function") window.playMenuMusic();
					});
				} else {
					if (typeof window.stopGameMusic === "function") window.stopGameMusic();
					if (typeof window.playMenuMusic === "function") window.playMenuMusic();
				}
			}
		}
	}

	// Detect and load code waves from waveControl.js
	function initializeCodeWaves() {
		if (!window.SentinelWaveEditorCodes) {
			return;
		}

		window._editorWaveOverride = window._editorWaveOverride || {};
		let loadedCount = 0;

		Object.entries(window.SentinelWaveEditorCodes).forEach(([waveNumStr, waveCode]) => {
			const waveNum = parseInt(waveNumStr, 10);
			if (!Number.isFinite(waveNum) || !waveCode || typeof waveCode !== "string") return;

			try {
				const decoded = decodeWaveCode(waveCode);
				if (decoded && typeof decoded === "object") {
					window._editorWaveOverride[waveNum] = decoded;
					loadedCount++;
				}
			} catch (err) {
			}
		});

		window._codeWavesInitialized = true;
	}

	function showWaveEditor() {
		const bridge = window.SentinelEditorBridge;
		if (!bridge || typeof bridge.getWaveEditorState !== "function") return;
		if (waveEditorOverlay) return;
		discoverAllProtocolsInEditor = (typeof bridge.getEditorDiscoverAllProtocols === "function")
			? !!bridge.getEditorDiscoverAllProtocols()
			: false;

		waveEditorWasPaused = typeof bridge.getPaused === "function" ? !!bridge.getPaused() : false;
		if (!window._gameMusicAudio && typeof window.playGameMusic === "function") {
			window._editorOpenedFromMenuMusic = true;
			// Start game music IMMEDIATELY (within user gesture context) for autoplay to work
			window.playGameMusic(1);
			setTimeout(() => { window.muffleGameMusic && window.muffleGameMusic(); }, 100);
			// Fade out menu music separately without waiting for callback
			if (window._menuMusicAudio && !window._menuMusicAudio.paused && typeof window.fadeOutMenuMusic === "function") {
				window.fadeOutMenuMusic(800);
			}
		}
		if (typeof bridge.setPaused === "function") bridge.setPaused(true);
		if (typeof bridge.setEditorSessionActive === "function") bridge.setEditorSessionActive(true);
		if (typeof bridge.setEditorDiscoverAllProtocols === "function") {
			bridge.setEditorDiscoverAllProtocols(discoverAllProtocolsInEditor);
		}

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

		const protocolDiscoverToggleWrap = document.createElement("label");
		protocolDiscoverToggleWrap.style.display = "flex";
		protocolDiscoverToggleWrap.style.alignItems = "center";
		protocolDiscoverToggleWrap.style.gap = "8px";
		protocolDiscoverToggleWrap.style.marginBottom = "12px";
		protocolDiscoverToggleWrap.style.color = "#d8ffff";
		protocolDiscoverToggleWrap.style.fontSize = "0.9rem";
		const protocolDiscoverToggle = document.createElement("input");
		protocolDiscoverToggle.type = "checkbox";
		protocolDiscoverToggle.checked = !!discoverAllProtocolsInEditor;
		protocolDiscoverToggleWrap.appendChild(protocolDiscoverToggle);
		const protocolDiscoverToggleText = document.createElement("span");
		protocolDiscoverToggleText.textContent = "Discover all protocols in editor session";
		protocolDiscoverToggleWrap.appendChild(protocolDiscoverToggleText);
		panel.appendChild(protocolDiscoverToggleWrap);

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

		// Timeline-based wave editor section
		const waveSection = makeSection("Wave Timeline Editor");
		const waveInputWrap = document.createElement("div");
		waveInputWrap.style.marginBottom = "10px";
		waveInputWrap.appendChild(makeLabel("Target Wave"));
		const waveInput = document.createElement("input");
		waveInput.type = "number";
		waveInput.value = String(selectedWaveState.value);
		waveInput.min = "1";
		waveInput.max = "50";
		waveInput.step = "1";
		waveInput.style.width = "80px";
		waveInput.style.padding = "6px";
		waveInput.style.borderRadius = "4px";
		waveInput.style.border = "1px solid rgba(0,255,221,0.4)";
		waveInput.style.background = "rgba(0,0,0,0.45)";
		waveInput.style.color = "#d8ffff";
		waveInputWrap.style.display = "flex";
		waveInputWrap.style.gap = "8px";
		waveInputWrap.style.alignItems = "center";
		waveInputWrap.appendChild(waveInput);
		waveSection.appendChild(waveInputWrap);

		// Initialize timeline editor helper
		let timelineHelper = null;
		if (typeof window.SentinelTimelineEditorHelper !== "undefined" && typeof window.SentinelTimelineEditorHelper.createNewTimelineWaveEditor === "function") {
			timelineHelper = window.SentinelTimelineEditorHelper.createNewTimelineWaveEditor(waveSection, selectedWaveState);
		}

		// Create button row for wave-specific controls (positioned before the scale)
		const waveButtonRow = document.createElement("div");
		waveButtonRow.style.display = "grid";
		waveButtonRow.style.gridTemplateColumns = "repeat(2, minmax(auto, 140px))";
		waveButtonRow.style.gap = "6px";
		waveButtonRow.style.marginTop = "8px";
		waveButtonRow.style.marginBottom = "12px";
		waveButtonRow.style.justifyContent = "start";

		// Insert before the timeline editor container
		const timelineEditorContainer = waveSection.querySelector(".timeline-scale-div")?.parentElement;
		if (timelineEditorContainer) {
			waveSection.insertBefore(waveButtonRow, timelineEditorContainer);
		} else {
			waveSection.appendChild(waveButtonRow);
		}

		// Track which wave is currently being edited (distinct from Target Wave)
		let currentlyEditedWave = selectedWaveState.value;

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

		const autoScaleWrap = document.createElement("label");
		autoScaleWrap.style.display = "flex";
		autoScaleWrap.style.alignItems = "center";
		autoScaleWrap.style.gap = "8px";
		autoScaleWrap.style.marginTop = "8px";
		autoScaleWrap.style.color = "#d8ffff";
		const autoScaleToggle = document.createElement("input");
		autoScaleToggle.type = "checkbox";
		autoScaleToggle.checked = !!autoScalePlayerToLoadedWave;
		autoScaleWrap.appendChild(autoScaleToggle);
		const autoScaleText = document.createElement("span");
		autoScaleText.textContent = "Auto-scale player to loaded wave";
		autoScaleWrap.appendChild(autoScaleText);
		playerSection.appendChild(autoScaleWrap);

		// Placeholder for player button row (will add after buttons are created)
		const playerButtonRow = document.createElement("div");
		playerButtonRow.style.display = "flex";
		playerButtonRow.style.flexWrap = "wrap";
		playerButtonRow.style.gap = "6px";
		playerButtonRow.style.marginTop = "12px";
		playerButtonRow.style.justifyContent = "flex-start";
		playerSection.appendChild(playerButtonRow);

		// Move makeActionBtn definition above all uses (and only define it once)
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

		const actionRow = document.createElement("div");
		actionRow.style.display = "flex";
		actionRow.style.flexWrap = "wrap";
		actionRow.style.gap = "8px";
		actionRow.style.marginTop = "8px";
		actionRow.style.marginBottom = "12px";
		panel.appendChild(actionRow);

		const codeSection = makeSection("Wave Code");
		const waveCodeWrap = document.createElement("div");
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

		const codeActionRow = document.createElement("div");
		codeActionRow.style.display = "flex";
		codeActionRow.style.flexWrap = "wrap";
		codeActionRow.style.gap = "8px";
		codeActionRow.style.marginTop = "8px";
		codeSection.appendChild(codeActionRow);

		const codeStatus = document.createElement("div");
		codeStatus.style.marginTop = "8px";
		codeStatus.style.fontSize = "0.85rem";
		codeStatus.style.color = "#9de8ff";
		codeSection.appendChild(codeStatus);


		const loadBtn = makeActionBtn("Load Wave", "#00ffdd");
		const applyWaveBtn = makeActionBtn("Save Wave", "#a8ff6c");
		const spawnNowBtn = makeActionBtn("Spawn Now", "#ffe26c");
		const clearInputsBtn = makeActionBtn("Clear Inputs", "#ffd27f");
		const clearWaveBtn = makeActionBtn("Wave Default", "#ff9a9a");
		const clearLootsBtn = makeActionBtn("Clear Loots", "#ffb3de");
		const applyPlayerBtn = makeActionBtn("Apply Player Stats", "#9fd2ff");
		const clearAllBtn = makeActionBtn("All Wave Default", "#ff7b7b");
		const backToMenuBtn = makeActionBtn("Back to Menu", "#ffffff");
		const closeBtn = makeActionBtn("Test", "#ffffff");
		const generateCodeBtn = makeActionBtn("Export Code", "#9de8ff");
		const exportSingleWaveBtn = makeActionBtn("Export Wave", "#7dd3fc");
		const loadCodeBtn = makeActionBtn("Import Wave", "#9de8ff");
		const copyCodeBtn = makeActionBtn("Copy Code", "#ffffff");

		const editorHeaderSection = document.createElement("div");
		editorHeaderSection.style.width = "100%";
		editorHeaderSection.style.height = "auto";
		editorHeaderSection.style.padding = "0 0 10px 0";
		editorHeaderSection.style.display = "flex";
		editorHeaderSection.style.alignItems = "center";
		editorHeaderSection.style.justifyContent = "flex-start";
		editorHeaderSection.style.position = "relative";
		editorHeaderSection.style.zIndex = "10";

		backToMenuBtn.textContent = "← Back to Menu";
		backToMenuBtn.style.fontSize = "0.9rem";
		backToMenuBtn.style.marginLeft = "3px";
		backToMenuBtn.style.padding = "0.4rem 1rem";
		backToMenuBtn.style.background = "rgba(0,0,0,0.7)";
		backToMenuBtn.style.color = "#00ffdd";
		backToMenuBtn.style.border = "2px solid #00ffdd";
		backToMenuBtn.style.borderRadius = "6px";
		backToMenuBtn.style.cursor = "pointer";
		backToMenuBtn.style.transition = "background 0.2s";
		backToMenuBtn.style.flex = "0 0 auto";
		backToMenuBtn.style.minWidth = "auto";
		backToMenuBtn.style.whiteSpace = "nowrap";
		backToMenuBtn.addEventListener("mouseover", () => backToMenuBtn.style.background = "rgba(0,0,0,0.9)");
		backToMenuBtn.addEventListener("mouseout", () => backToMenuBtn.style.background = "rgba(0,0,0,0.7)");
		editorHeaderSection.appendChild(backToMenuBtn);
		panel.insertBefore(editorHeaderSection, panel.firstChild);

		waveButtonRow.appendChild(loadBtn);
		waveButtonRow.appendChild(applyWaveBtn);
		waveButtonRow.appendChild(spawnNowBtn);
		waveButtonRow.appendChild(clearInputsBtn);
		waveButtonRow.appendChild(clearWaveBtn);
		waveButtonRow.appendChild(clearAllBtn);
		waveButtonRow.appendChild(clearLootsBtn);
		waveButtonRow.appendChild(closeBtn);

		// Style wave buttons in grid layout
		[loadBtn, applyWaveBtn, spawnNowBtn, clearInputsBtn, clearWaveBtn, clearAllBtn, clearLootsBtn, closeBtn].forEach(btn => {
			btn.style.flex = "none";
			btn.style.maxWidth = "140px";
			btn.style.padding = "0.4rem 0.7rem";
			btn.style.fontSize = "0.85rem";
		});

		// Add Apply Player Stats button to player section
		playerButtonRow.appendChild(applyPlayerBtn);
		applyPlayerBtn.style.flex = "none";
		applyPlayerBtn.style.maxWidth = "140px";
		applyPlayerBtn.style.padding = "0.4rem 0.7rem";
		applyPlayerBtn.style.fontSize = "0.85rem";

		codeActionRow.appendChild(generateCodeBtn);
		codeActionRow.appendChild(exportSingleWaveBtn);
		codeActionRow.appendChild(loadCodeBtn);
		codeActionRow.appendChild(copyCodeBtn);

		const loadWaveIntoForm = () => {
			const parsedWave = parseInt(waveInput.value, 10);
			selectedWaveState.value = Number.isFinite(parsedWave) && parsedWave > 0 ? parsedWave : 1;
			currentlyEditedWave = selectedWaveState.value;  // Track which wave is being edited
			waveInput.value = String(selectedWaveState.value);
			// Reload the timeline editor display for the new wave
			if (timelineHelper && typeof timelineHelper.renderTimeline === "function") {
				// Discard any unsaved working copy before loading new wave
				if (typeof timelineHelper.discardWorkingCopy === "function") {
					timelineHelper.discardWorkingCopy();
				}
				timelineHelper.renderTimeline(selectedWaveState.value);
			}
			waveStatus.textContent = `Editing wave ${selectedWaveState.value}.`;
		};

		const applyWaveOverride = (spawnImmediately) => {
			const targetWave = parseInt(waveInput.value, 10);
			if (!Number.isFinite(targetWave) || targetWave < 1) {
				waveStatus.textContent = "Enter a valid wave number (1+).";
				return;
			}

			// Get timeline data from the CURRENTLY EDITED wave, not the target wave
			if (!timelineHelper || typeof timelineHelper.getTimelineData !== "function") {
				waveStatus.textContent = "Timeline editor not available.";
				return;
			}

			// Get the current working copy WITHOUT saving to persistent storage
			// This keeps the original wave data intact
			const timelineData = timelineHelper.getTimelineData(currentlyEditedWave);
			if (!timelineData || !timelineData.mobs) {
				waveStatus.textContent = "No timeline data found for currently edited wave.";
				return;
			}
			// Convert timeline data to override format compatible with runtime
			// Store the timeline object for the TARGET wave (without modifying source wave)
			waveEditorOverrides[targetWave] = {
				timelineMode: true,
				timeline: JSON.parse(JSON.stringify(timelineData))  // Deep copy
			};

			// Save to localStorage
			try {
				localStorage.setItem("sentinel.waveEditorOverrides", JSON.stringify(waveEditorOverrides));
			} catch (err) {
			}

			waveStatus.textContent = `Wave ${currentlyEditedWave} timeline applied to wave ${targetWave}.`;

			// Only update the game's wave data if spawning immediately, not on regular save
			if (spawnImmediately && window.SentinelWaveControl && typeof window.SentinelWaveControl.setTimelineWaveData === "function") {
				window.SentinelWaveControl.setTimelineWaveData(targetWave, timelineData);
			}

			const applyAutoScalePlayerForWave = (waveNumber) => {
				if (!autoScalePlayerToLoadedWave) return;
				if (typeof bridge.getPlayer !== "function" || typeof bridge.setLevel !== "function" || typeof bridge.setStatPoints !== "function") {
					playerStatus.textContent = "Auto-scale unavailable (bridge missing methods).";
					return;
				}

				const targetLevel = Math.max(1, parseInt(waveNumber, 10) || 1);
				bridge.setLevel(targetLevel);
				const player = bridge.getPlayer();

				const stats = ["Power", "AttackSpeed", "Range", "Movement", "Vitality", "Pickup"];
				const influenceWeight = {
					Power: 5,
					AttackSpeed: 4,
					Range: 3,
					Movement: 3,
					Vitality: 2,
					Pickup: 1
				};

				const statCap = targetLevel + 1;
				const totalPointsEarned = 5 + Math.max(0, (targetLevel - 1) * 2);
				const totalWeight = stats.reduce((sum, key) => sum + (influenceWeight[key] || 0), 0);
				let spent = 0;
				for (const key of stats) {
					const weighted = Math.floor((totalPointsEarned * (influenceWeight[key] || 0)) / totalWeight);
					const value = Math.min(statCap, weighted);
					player.stats[key] = value;
					spent += value;
				}

				const priorityOrder = [...stats];

				let distributeRemaining = Math.max(0, totalPointsEarned - spent);
				while (distributeRemaining > 0) {
					let allocated = false;
					for (const key of priorityOrder) {
						if (distributeRemaining <= 0) break;
						if (player.stats[key] < statCap) {
							player.stats[key] += 1;
							distributeRemaining--;
							allocated = true;
						}
					}
					if (!allocated) break;
				}

				const remaining = distributeRemaining;
				bridge.setStatPoints(remaining);
				if (typeof bridge.applyStats === "function") bridge.applyStats();
				player.health = player.maxHealth;
				playerStatus.textContent = `Auto-scaled player to wave ${waveNumber} (level ${targetLevel}) using stat influence priority.`;
				loadPlayerForm();
			};

			if (spawnImmediately && typeof bridge.spawnWaveNow === "function") {
				// Set timeline data FIRST before spawning
				if (window.SentinelWaveControl && typeof window.SentinelWaveControl.setTimelineWaveData === "function") {
					window.SentinelWaveControl.setTimelineWaveData(targetWave, timelineData);
				}
				bridge.spawnWaveNow(targetWave, waveEditorOverrides[targetWave]);
				applyAutoScalePlayerForWave(targetWave);
				waveStatus.textContent = `Wave ${targetWave} timeline override applied and spawned.`;
			}
		};

		const clearWaveInputs = () => {
			if (timelineHelper && typeof timelineHelper.getTimelineData === "function") {
				const timeline = timelineHelper.getTimelineData(currentlyEditedWave);
				if (timeline && timeline.mobs) {
					// Clear all mob spawn events
					Object.keys(timeline.mobs).forEach(mob => timeline.mobs[mob] = []);
					if (timelineHelper.renderTimeline) {
						timelineHelper.renderTimeline(currentlyEditedWave);
					}
				}
			}
			waveStatus.textContent = `Wave ${currentlyEditedWave} timeline cleared.`;
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
		autoScaleToggle.addEventListener("change", () => {
			autoScalePlayerToLoadedWave = !!autoScaleToggle.checked;
			playerStatus.textContent = autoScalePlayerToLoadedWave
				? "Auto-scale is ON for Apply + Spawn Now."
				: "Auto-scale is OFF.";
		});
		protocolDiscoverToggle.addEventListener("change", () => {
			discoverAllProtocolsInEditor = !!protocolDiscoverToggle.checked;
			if (typeof bridge.setEditorDiscoverAllProtocols === "function") {
				bridge.setEditorDiscoverAllProtocols(discoverAllProtocolsInEditor);
			}
			playerStatus.textContent = discoverAllProtocolsInEditor
				? "Editor protocol discover-all is ON."
				: "Editor protocol discover-all is OFF.";
		});
		applyWaveBtn.addEventListener("click", () => applyWaveOverride(false));
		spawnNowBtn.addEventListener("click", () => {
			const targetWave = parseInt(waveInput.value, 10);
			// Clear timeline state for this specific wave before spawning
			window._timelineWaveState = null;
			if (window._timelineCompletedWaves) {
				delete window._timelineCompletedWaves[targetWave];
			}
			applyWaveOverride(true);
			restartGame();
		});
		clearInputsBtn.addEventListener("click", clearWaveInputs);
		clearWaveBtn.addEventListener("click", () => {
			const targetWave = parseInt(waveInput.value, 10);
			if (!Number.isFinite(targetWave) || targetWave < 1) {
				waveStatus.textContent = "Enter a valid wave number (1+) to clear.";
				return;
			}
			delete waveEditorOverrides[targetWave];
			
			// Also clear any session override so it falls back to default code
			if (window._editorWaveOverride && window._editorWaveOverride[targetWave]) {
				delete window._editorWaveOverride[targetWave];
			}
			
			// Save to localStorage
			try {
				localStorage.setItem("sentinel.waveEditorOverrides", JSON.stringify(waveEditorOverrides));
			} catch (err) {
			}
			
			waveStatus.textContent = `Wave ${targetWave} override cleared. Reloading default...`;
			loadWaveIntoForm();
		});
		clearLootsBtn.addEventListener("click", () => {
			if (typeof bridge.clearLoots === "function") {
				bridge.clearLoots();
				playerStatus.textContent = "Active loot drops cleared.";
			} else {
				playerStatus.textContent = "Clear loot function unavailable.";
			}
		});
		clearAllBtn.addEventListener("click", () => {
			Object.keys(waveEditorOverrides).forEach(key => delete waveEditorOverrides[key]);
			
			// Also clear all session overrides so they fall back to default codes
			if (window._editorWaveOverride && typeof window._editorWaveOverride === "object") {
				Object.keys(window._editorWaveOverride).forEach(key => delete window._editorWaveOverride[key]);
			}
			
			// Save to localStorage
			try {
				localStorage.setItem("sentinel.waveEditorOverrides", JSON.stringify(waveEditorOverrides));
			} catch (err) {
			}
			
			waveStatus.textContent = "All wave overrides cleared. Reloading defaults...";
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
		exportSingleWaveBtn.addEventListener("click", () => {
			const targetWave = parseInt(waveInput.value, 10);
			if (!Number.isFinite(targetWave) || targetWave < 1) {
				codeStatus.textContent = "Enter a valid wave number to export.";
				return;
			}
			if (!waveEditorOverrides[targetWave]) {
				codeStatus.textContent = `No data for wave ${targetWave} to export.`;
				return;
			}
			try {
				const override = waveEditorOverrides[targetWave];
				waveCodeInput.value = window.SentinelEditor.encodeSingleWaveCode(targetWave);
				const format = (override.timelineMode && override.timeline) ? "SWC3 (60-70% shorter)" : "SWC2";
				codeStatus.textContent = `Wave ${targetWave} exported as ${format} code.`;
			} catch (err) {
				codeStatus.textContent = `Failed to export wave ${targetWave}: ${err.message}`;
			}
		});
		loadCodeBtn.addEventListener("click", () => {
			try {
				const code = (waveCodeInput.value || "").trim();
				if (!code) {
					codeStatus.textContent = "Paste a wave code to import.";
					return;
				}
				
				// Decode to get the wave numbers
				const decodedWaves = decodeWaveCode(code);
				if (!decodedWaves || Object.keys(decodedWaves).length === 0) {
					throw new Error("No waves found in code.");
				}
				
				// Get the first imported wave number
				const importedWaveNum = Math.min(...Object.keys(decodedWaves).map(Number));
				// Load into active overrides
				activateWaveCode(code);
				
				// Save to localStorage so it persists
				try {
					localStorage.setItem("sentinel.waveEditorOverrides", JSON.stringify(waveEditorOverrides));
				} catch (err) {
				}
				
				// Clear the timeline working copy so it reloads fresh
				if (typeof window._timelineWorkingCopy !== "undefined") {
					window._timelineWorkingCopy.waveNum = null;
					window._timelineWorkingCopy.data = null;
				}
				
				// Set the input to the imported wave and load it
				waveInput.value = String(importedWaveNum);
				codeStatus.textContent = `Wave ${importedWaveNum} imported successfully!`;
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
		closeBtn.addEventListener("click", () => {
			// Only collapse/close the editor menu, do not apply or spawn
			closeWaveEditor({ keepEditorSession: true });
		});

		waveEditorOverlay.addEventListener("click", (event) => {
			if (event.target === waveEditorOverlay) {
				event.preventDefault();
				event.stopPropagation();
			}
		});

		document.body.appendChild(waveEditorOverlay);
		
		// Ensure code waves are initialized before loading
		const initAndLoad = () => {
			if (!window._codeWavesInitialized && window.SentinelWaveEditorCodes) {
				initializeCodeWaves();
			}
			// Small delay to ensure _editorWaveOverride is populated
			setTimeout(() => {
				loadWaveIntoForm();
				loadPlayerForm();
			}, 50);
		};
		
		initAndLoad();
	}

	if (typeof window.sentinelWaveCode === "string" && hasSupportedWaveCodePrefix(window.sentinelWaveCode.trim())) {
		try { activateWaveCode(window.sentinelWaveCode); } catch (_) {}
	}

	// Initialize code waves at page load if not already done
	if (!window._codeWavesInitialized && window.SentinelWaveEditorCodes) {
		initializeCodeWaves();
	}

	window.SentinelEditor = {
		showWaveEditor,
		closeWaveEditor,
		getActiveWaveOverride,
		getWaveEditorBurstValue,
		generateWaveCode: () => encodeWaveCode(waveEditorOverrides),
		encodeSingleWaveCode,
		encodeSingleTimelineWaveCode,
		decodeWaveCode,
		getWaveConfigFromCode,
		activateWaveCode,
		getCurrentOverrides: () => cloneOverrides(waveEditorOverrides)
	};
})();
