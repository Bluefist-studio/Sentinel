(function () {
	const WAVE_CODE_PREFIX_V1 = "SWC1:";
	const WAVE_CODE_PREFIX_V2 = "SWC2:";
	const INTERVAL_UNITS_PER_SECOND = 120;
	const waveEditorOverrides = {};
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
		customBruteBosses: "bb"
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
		return raw.startsWith(WAVE_CODE_PREFIX_V1) || raw.startsWith(WAVE_CODE_PREFIX_V2);
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
			if (Number.isFinite(raw) && raw > 0) out[resolvedKey] = Math.round(raw);
		});
		return Object.keys(out).length ? out : undefined;
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
				customShielders: Array.isArray(entry.customShielders) ? entry.customShielders.slice() : undefined,
				customBeamers: Array.isArray(entry.customBeamers) ? entry.customBeamers.slice() : undefined,
				customKamikazes: Array.isArray(entry.customKamikazes) ? entry.customKamikazes.slice() : undefined,
				customStalkers: Array.isArray(entry.customStalkers) ? entry.customStalkers.slice() : undefined,
				customBossMinors: Array.isArray(entry.customBossMinors) ? entry.customBossMinors.slice() : undefined,
				customBosses: Array.isArray(entry.customBosses) ? entry.customBosses.slice() : undefined,
				customSlingerBosses: Array.isArray(entry.customSlingerBosses) ? entry.customSlingerBosses.slice() : undefined,
				customBruteBosses: Array.isArray(entry.customBruteBosses) ? entry.customBruteBosses.slice() : undefined,
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

	function decodeWaveCode(code) {
		const raw = (code || "").trim();
		if (!hasSupportedWaveCodePrefix(raw)) {
			throw new Error("Invalid wave code prefix. Use SWC1 or SWC2.");
		}

		if (raw.startsWith(WAVE_CODE_PREFIX_V2)) {
			const encoded = raw.slice(WAVE_CODE_PREFIX_V2.length);
			const payload = decodeJsonPayload(encoded);
			if (!payload || typeof payload.o !== "object") {
				throw new Error("Invalid SWC2 wave code payload.");
			}
			if (payload.v !== 1) {
				throw new Error("Unsupported SWC2 wave code version.");
			}
			return deserializeOverridesFromSWC2(payload.o);
		}

		const encoded = raw.slice(WAVE_CODE_PREFIX_V1.length);
		const payload = decodeJsonPayload(encoded);
		if (!payload || typeof payload.overrides !== "object") {
			throw new Error("Invalid SWC1 wave code payload.");
		}
		if (payload.version !== 1 && payload.version !== 2) {
			throw new Error("Unsupported SWC1 wave code version.");
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
	}

	function showWaveEditor() {
		const bridge = window.SentinelEditorBridge;
		if (!bridge || typeof bridge.getWaveEditorState !== "function") return;
		if (waveEditorOverlay) return;
		discoverAllProtocolsInEditor = (typeof bridge.getEditorDiscoverAllProtocols === "function")
			? !!bridge.getEditorDiscoverAllProtocols()
			: false;

		waveEditorWasPaused = typeof bridge.getPaused === "function" ? !!bridge.getPaused() : false;
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

		const waveSection = makeSection("Wave Controls");
		const rowA = document.createElement("div");
		rowA.style.display = "grid";
		rowA.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
		rowA.style.gap = "0";
		rowA.style.border = "1px solid rgba(0,255,221,0.28)";
		rowA.style.borderRadius = "8px";
		rowA.style.overflow = "hidden";
		waveSection.appendChild(rowA);

		const waveInputWrap = document.createElement("div");
		waveInputWrap.style.padding = "8px";
		waveInputWrap.appendChild(makeLabel("Target Wave"));
		const waveInput = makeInput();
		waveInput.value = String(selectedWaveState.value);
		waveInputWrap.appendChild(waveInput);
		rowA.appendChild(waveInputWrap);

		const burstCountWrap = document.createElement("div");
		burstCountWrap.style.padding = "8px";
		burstCountWrap.style.borderLeft = "1px solid rgba(0,255,221,0.28)";
		burstCountWrap.appendChild(makeLabel("Burst Count (use Infinity)"));
		const burstCountInput = makeInput();
		burstCountWrap.appendChild(burstCountInput);
		rowA.appendChild(burstCountWrap);

		const burstIntervalWrap = document.createElement("div");
		burstIntervalWrap.style.padding = "8px";
		burstIntervalWrap.style.borderLeft = "1px solid rgba(0,255,221,0.28)";
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

		const createMobEntry = (parent, mobName) => {
			const wrap = document.createElement("div");
			const mobTitle = makeLabel(mobName);
			mobTitle.style.color = "#00ffdd";
			mobTitle.style.fontWeight = "bold";
			wrap.appendChild(mobTitle);
			wrap.appendChild(makeLabel("Per burst"));
			const input = makeInput();
			wrap.appendChild(input);
			parent.appendChild(wrap);
			return { wrap, input };
		};

		const { wrap: gruntWrap, input: gruntInput } = createMobEntry(rowB, "Grunts");
		const { wrap: slingerWrap, input: slingerInput } = createMobEntry(rowB, "Slingers");
		const { wrap: shielderWrap, input: shielderInput } = createMobEntry(rowB, "Shielders");
		const { wrap: beamerWrap, input: beamerInput } = createMobEntry(rowB, "Beamers");
		const { wrap: bruteWrap, input: bruteInput } = createMobEntry(rowB, "Brutes");
		const { wrap: kamikazeWrap, input: kamikazeInput } = createMobEntry(rowB, "Kamikazes");
		const { wrap: stalkerWrap, input: stalkerInput } = createMobEntry(rowB, "Stalkers");
		const { wrap: bossMinorWrap, input: bossMinorInput } = createMobEntry(rowB, "Grunt Heavy");

		const rowDivider = document.createElement("div");
		rowDivider.style.height = "1px";
		rowDivider.style.margin = "10px 0";
		rowDivider.style.background = "rgba(0, 255, 221, 0.28)";
		waveSection.appendChild(rowDivider);

		const rowC = document.createElement("div");
		rowC.style.display = "grid";
		rowC.style.gridTemplateColumns = "repeat(auto-fit, minmax(210px, 1fr))";
		rowC.style.gap = "10px";
		rowC.style.marginTop = "10px";
		waveSection.appendChild(rowC);

		const { wrap: bossWrap, input: bossInput } = createMobEntry(rowC, "Grunt Boss");
		const { wrap: slingerBossWrap, input: slingerBossInput } = createMobEntry(rowC, "Slinger Boss");
		const { wrap: bruteBossWrap, input: bruteBossInput } = createMobEntry(rowC, "Brute Boss");

		const addPairedIntervalInput = (wrap) => {
			const label = makeLabel("Interval");
			label.style.marginTop = "8px";
			wrap.appendChild(label);
			const input = makeInput();
			wrap.appendChild(input);
			return input;
		};

		const gruntIntervalInput = addPairedIntervalInput(gruntWrap);
		const slingerIntervalInput = addPairedIntervalInput(slingerWrap);
		const shielderIntervalInput = addPairedIntervalInput(shielderWrap);
		const beamerIntervalInput = addPairedIntervalInput(beamerWrap);
		const stalkerIntervalInput = addPairedIntervalInput(stalkerWrap);
		const bruteIntervalInput = addPairedIntervalInput(bruteWrap);
		const kamikazeIntervalInput = addPairedIntervalInput(kamikazeWrap);
		const bossMinorIntervalInput = addPairedIntervalInput(bossMinorWrap);
		const bossIntervalInput = addPairedIntervalInput(bossWrap);
		const slingerBossIntervalInput = addPairedIntervalInput(slingerBossWrap);
		const bruteBossIntervalInput = addPairedIntervalInput(bruteBossWrap);

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
		const clearInputsBtn = makeActionBtn("Clear Inputs", "#ffd27f");
		const clearWaveBtn = makeActionBtn("Clear Wave Override", "#ff9a9a");
		const clearLootsBtn = makeActionBtn("Clear Loots", "#ffb3de");
		const applyPlayerBtn = makeActionBtn("Apply Player Stats", "#9fd2ff");
		const clearAllBtn = makeActionBtn("Clear All Overrides", "#ff7b7b");
		const backToMenuBtn = makeActionBtn("Back to Menu", "#ffffff");
		const closeBtn = makeActionBtn("Test", "#ffffff");
		const generateCodeBtn = makeActionBtn("Generate Code", "#9de8ff");
		const loadCodeBtn = makeActionBtn("Load Code", "#9de8ff");
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

		actionRow.appendChild(loadBtn);
		actionRow.appendChild(applyWaveBtn);
		actionRow.appendChild(spawnNowBtn);
		actionRow.appendChild(clearInputsBtn);
		actionRow.appendChild(clearWaveBtn);
		actionRow.appendChild(clearLootsBtn);
		actionRow.appendChild(applyPlayerBtn);
		actionRow.appendChild(clearAllBtn);
		actionRow.appendChild(closeBtn);

		codeActionRow.appendChild(generateCodeBtn);
		codeActionRow.appendChild(loadCodeBtn);
		codeActionRow.appendChild(copyCodeBtn);

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
			shielderInput.value = formatWaveEditorList(source.customShielders);
			beamerInput.value = formatWaveEditorList(source.customBeamers);
			kamikazeInput.value = formatWaveEditorList(source.customKamikazes);
			stalkerInput.value = formatWaveEditorList(source.customStalkers);
			bossMinorInput.value = formatWaveEditorList(source.customBossMinors);
			bossInput.value = formatWaveEditorList(source.customBosses);
			slingerBossInput.value = formatWaveEditorList(source.customSlingerBosses);
			bruteBossInput.value = formatWaveEditorList(source.customBruteBosses);
			const mobIntervals = source.mobIntervals || {};
			gruntIntervalInput.value = mobIntervals.grunts ? String(Number(intervalUnitsToSeconds(mobIntervals.grunts).toFixed(2))) : "";
			slingerIntervalInput.value = mobIntervals.slingers ? String(Number(intervalUnitsToSeconds(mobIntervals.slingers).toFixed(2))) : "";
			shielderIntervalInput.value = mobIntervals.shielders ? String(Number(intervalUnitsToSeconds(mobIntervals.shielders).toFixed(2))) : "";
			beamerIntervalInput.value = mobIntervals.beamers ? String(Number(intervalUnitsToSeconds(mobIntervals.beamers).toFixed(2))) : "";
			stalkerIntervalInput.value = mobIntervals.stalkers ? String(Number(intervalUnitsToSeconds(mobIntervals.stalkers).toFixed(2))) : "";
			bruteIntervalInput.value = mobIntervals.brutes ? String(Number(intervalUnitsToSeconds(mobIntervals.brutes).toFixed(2))) : "";
			kamikazeIntervalInput.value = mobIntervals.kamikazes ? String(Number(intervalUnitsToSeconds(mobIntervals.kamikazes).toFixed(2))) : "";
			bossMinorIntervalInput.value = (mobIntervals.gruntBossMinor || mobIntervals.bossMinors) ? String(Number(intervalUnitsToSeconds(mobIntervals.gruntBossMinor || mobIntervals.bossMinors).toFixed(2))) : "";
			bossIntervalInput.value = (mobIntervals.gruntBoss || mobIntervals.bosses) ? String(Number(intervalUnitsToSeconds(mobIntervals.gruntBoss || mobIntervals.bosses).toFixed(2))) : "";
			slingerBossIntervalInput.value = (mobIntervals.slingerBoss || mobIntervals.slingerboss) ? String(Number(intervalUnitsToSeconds(mobIntervals.slingerBoss || mobIntervals.slingerboss).toFixed(2))) : "";
			bruteBossIntervalInput.value = (mobIntervals.bruteBoss || mobIntervals.bruteboss) ? String(Number(intervalUnitsToSeconds(mobIntervals.bruteBoss || mobIntervals.bruteboss).toFixed(2))) : "";
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

			const parseMobIntervalField = (rawValue) => {
				const trimmed = (rawValue || "").trim();
				if (!trimmed) return undefined;
				const parsed = parseFloat(trimmed);
				if (!Number.isFinite(parsed) || parsed <= 0) return null;
				return secondsToIntervalUnits(parsed);
			};

			const parsedMobIntervalsRaw = {
				grunts: parseMobIntervalField(gruntIntervalInput.value),
				slingers: parseMobIntervalField(slingerIntervalInput.value),
				shielders: parseMobIntervalField(shielderIntervalInput.value),
				beamers: parseMobIntervalField(beamerIntervalInput.value),
				stalkers: parseMobIntervalField(stalkerIntervalInput.value),
				brutes: parseMobIntervalField(bruteIntervalInput.value),
				kamikazes: parseMobIntervalField(kamikazeIntervalInput.value),
				gruntBossMinor: parseMobIntervalField(bossMinorIntervalInput.value),
				gruntBoss: parseMobIntervalField(bossIntervalInput.value),
				slingerBoss: parseMobIntervalField(slingerBossIntervalInput.value),
				bruteBoss: parseMobIntervalField(bruteBossIntervalInput.value)
			};

			if (Object.values(parsedMobIntervalsRaw).some(v => v === null)) {
				waveStatus.textContent = "Mob intervals must be positive seconds (or blank).";
				return;
			}
			const parsedMobIntervals = normalizeMobIntervals(parsedMobIntervalsRaw);
			const parsedCustomBursts = parseWaveEditorList(gruntInput.value);
			const parsedCustomBrutes = parseWaveEditorList(bruteInput.value);
			const parsedCustomSlingers = parseWaveEditorList(slingerInput.value);
			const parsedCustomShielders = parseWaveEditorList(shielderInput.value);
			const parsedCustomBeamers = parseWaveEditorList(beamerInput.value);
			const parsedCustomKamikazes = parseWaveEditorList(kamikazeInput.value);
			const parsedCustomStalkers = parseWaveEditorList(stalkerInput.value);
			const parsedCustomBossMinors = parseWaveEditorList(bossMinorInput.value);
			const parsedCustomBosses = parseWaveEditorList(bossInput.value);
			const parsedCustomSlingerBosses = parseWaveEditorList(slingerBossInput.value);
			const parsedCustomBruteBosses = parseWaveEditorList(bruteBossInput.value);

			waveEditorOverrides[targetWave] = {
				burstCount: parsedBurstCount,
				burstInterval: secondsToIntervalUnits(parsedBurstIntervalSeconds),
				customBursts: expandSingleValueList(parsedCustomBursts, parsedBurstCount),
				customBrutes: expandSingleValueList(parsedCustomBrutes, parsedBurstCount),
				customSlingers: expandSingleValueList(parsedCustomSlingers, parsedBurstCount),
				customShielders: expandSingleValueList(parsedCustomShielders, parsedBurstCount),
				customBeamers: expandSingleValueList(parsedCustomBeamers, parsedBurstCount),
				customKamikazes: expandSingleValueList(parsedCustomKamikazes, parsedBurstCount),
				customStalkers: expandSingleValueList(parsedCustomStalkers, parsedBurstCount),
				customBossMinors: expandSingleValueList(parsedCustomBossMinors, parsedBurstCount),
				customBosses: expandSingleValueList(parsedCustomBosses, parsedBurstCount),
				customGruntBossMinors: expandSingleValueList(parsedCustomBossMinors, parsedBurstCount),
				customGruntBosses: expandSingleValueList(parsedCustomBosses, parsedBurstCount),
				customSlingerBosses: expandSingleValueList(parsedCustomSlingerBosses, parsedBurstCount),
				customBruteBosses: expandSingleValueList(parsedCustomBruteBosses, parsedBurstCount),
				mobIntervals: parsedMobIntervals
			};

			waveStatus.textContent = `Wave ${targetWave} override applied.`;

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
				bridge.spawnWaveNow(targetWave, waveEditorOverrides[targetWave]);
				if (window.SentinelWaveControl && typeof window.SentinelWaveControl.setMobBurstIntervals === "function") {
					if (waveEditorOverrides[targetWave].mobIntervals) {
						window.SentinelWaveControl.setMobBurstIntervals(waveEditorOverrides[targetWave].mobIntervals);
					} else if (typeof window.SentinelWaveControl.clearMobBurstIntervals === "function") {
						window.SentinelWaveControl.clearMobBurstIntervals();
					}
				}
				applyAutoScalePlayerForWave(targetWave);
				waveStatus.textContent = `Wave ${targetWave} override applied and spawned.`;
			}
		};

		const clearWaveInputs = () => {
			burstCountInput.value = "";
			burstIntervalInput.value = "";
			gruntInput.value = "";
			bruteInput.value = "";
			slingerInput.value = "";
			shielderInput.value = "";
			beamerInput.value = "";
			kamikazeInput.value = "";
			stalkerInput.value = "";
			bossMinorInput.value = "";
			bossInput.value = "";
			slingerBossInput.value = "";
			bruteBossInput.value = "";
			gruntIntervalInput.value = "";
			slingerIntervalInput.value = "";
			shielderIntervalInput.value = "";
			beamerIntervalInput.value = "";
			stalkerIntervalInput.value = "";
			bruteIntervalInput.value = "";
			kamikazeIntervalInput.value = "";
			bossMinorIntervalInput.value = "";
			bossIntervalInput.value = "";
			slingerBossIntervalInput.value = "";
			bruteBossIntervalInput.value = "";
			waveStatus.textContent = `Wave ${selectedWaveState.value} inputs cleared.`;
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
		spawnNowBtn.addEventListener("click", () => applyWaveOverride(true));
		clearInputsBtn.addEventListener("click", clearWaveInputs);
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
		loadWaveIntoForm();
		loadPlayerForm();
	}

	if (typeof window.sentinelWaveCode === "string" && hasSupportedWaveCodePrefix(window.sentinelWaveCode.trim())) {
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
