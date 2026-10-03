// ==UserScript==
// @name         TierScope - Chaturbate Viewers Visualizer
// @namespace    http://tampermonkey.net/
// @version      3.5.0-beta.1
// @description  TierScope - Viewer visualizer with trend tracking, reports, and GIF export
// @author       newivy
// @match        https://chaturbate.com/*
// @match        https://*.chaturbate.com/*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @require      https://cdn.jsdelivr.net/npm/omggif@1.0.10/omggif.js
// @run-at       document-end
// ==/UserScript==

// Generated from src/main.js. Edit src/ and run npm run build.
"use strict";
(() => {
  // src/history.js
  function saveToHistory() {
    var counts = { "red": 0, "green": 0, "purple": 0, "pink": 0, "dark-blue": 0, "light-blue": 0, "gray": 0, "female-trans": 0 };
    runtime.users.forEach(function(data) {
      if (counts[data.tier] !== void 0) counts[data.tier]++;
      if (data.gender === "female" || data.gender === "trans") {
        counts["female-trans"]++;
      }
    });
    var total = runtime.users.size;
    var withTokens = counts["red"] + counts["green"] + counts["purple"] + counts["pink"] + counts["dark-blue"] + counts["light-blue"];
    var anonymousCount = getAnonymousCount();
    var now = Date.now();
    if (runtime.sessionStartedAt === null) runtime.sessionStartedAt = now;
    var sample = Object.assign({}, counts, { withTokens, total, anonymous: anonymousCount });
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      var previous = getSessionHigh(key, 0);
      var value = sample[key];
      if (value > previous.value) runtime.sessionHighs[key] = { value, time: now };
      else if (!runtime.sessionHighs[key]) runtime.sessionHighs[key] = previous;
      if (value > 0 && value >= runtime.sessionHighs[key].value) runtime.newHighTiers[key] = true;
      else delete runtime.newHighTiers[key];
    });
    syncHighTimes();
    if (!runtime.history.breaks || runtime.history.breaks.length !== runtime.history.timestamps.length) runtime.history.breaks = getHistoryBreaks(runtime.history).slice();
    var lastTime = runtime.history.timestamps.length ? runtime.history.timestamps[runtime.history.timestamps.length - 1] : null;
    runtime.history.breaks.push(lastTime !== null && (runtime.pendingHistoryGap || now - lastTime > Math.max(runtime.scanIntervalSeconds, runtime.lastScheduledIntervalSeconds) * 2e3 + runtime.API_TIMEOUT_MS));
    runtime.pendingHistoryGap = false;
    runtime.history.timestamps.push(now);
    Object.keys(counts).forEach(function(tier) {
      runtime.history[tier].push(counts[tier]);
    });
    runtime.history["withTokens"].push(withTokens);
    runtime.history["total"].push(total);
    runtime.history["anonymous"].push(anonymousCount);
    if (runtime.history.timestamps.length > runtime.MAX_HISTORY_LENGTH) {
      runtime.history.timestamps.shift();
      runtime.history.breaks.shift();
      Object.keys(counts).forEach(function(tier) {
        runtime.history[tier].shift();
      });
      runtime.history["withTokens"].shift();
      runtime.history["total"].shift();
      runtime.history["anonymous"].shift();
    }
    if (!runtime.isMinimized) {
      drawAllSparklines();
    }
  }

  // src/utils.js
  function getTierMarker(tier) {
    var config = runtime.TIERS[tier];
    if (tier === "female-trans") return config.name;
    return '<span role="img" aria-label="' + config.name + '" title="' + config.name + '" style="display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle;background:' + config.color + ';"></span>';
  }
  function log(msg) {
    console.log("[TierScope " + runtime.TIERSCOPE_VERSION + "] " + msg);
  }
  function getModelNameFromUrl(url) {
    if (!url) return "unknown";
    var path = new URL(url).pathname;
    var bMatch = path.match(/\/b\/([^\/\?#]+)/);
    if (bMatch) return bMatch[1];
    var camMatch = path.match(/^\/([^\/]+)\/cam\/?$/);
    if (camMatch) return camMatch[1];
    var normalMatch = path.match(/\/([^\/\?#]+)\/?$/);
    if (normalMatch) {
      var name = normalMatch[1];
      var nonRoomPaths = [
        "followed",
        "featured",
        "tags",
        "accounts",
        "login",
        "register",
        "supporter",
        "settings",
        "apps",
        "explore",
        "trending",
        "new",
        "female",
        "male",
        "couple",
        "trans",
        "hd",
        "north-american",
        "european",
        "asian",
        "south-american",
        "exhibitionist",
        "followed-cams",
        "female-cams",
        "trans-cams",
        "male-cams",
        "couple-cams"
      ];
      if (nonRoomPaths.indexOf(name) === -1) return name;
    }
    return "unknown";
  }
  function isBroadcastRoom() {
    var path = window.location.pathname;
    var pathParts = path.split("/").filter(function(p) {
      return p;
    });
    if (pathParts.length === 0) return false;
    var nonRoomPaths = [
      "followed",
      "featured",
      "tags",
      "accounts",
      "login",
      "register",
      "supporter",
      "settings",
      "apps",
      "explore",
      "trending",
      "new",
      "female",
      "male",
      "couple",
      "trans",
      "hd",
      "north-american",
      "european",
      "asian",
      "south-american",
      "exhibitionist",
      "followed-cams",
      "female-cams",
      "trans-cams",
      "male-cams",
      "couple-cams"
    ];
    if (nonRoomPaths.indexOf(pathParts[0]) !== -1) return false;
    if (pathParts[0] === "b" && pathParts.length >= 2) return true;
    if (pathParts.length === 1) return true;
    if (pathParts.length === 2 && pathParts[1] === "cam") return true;
    return false;
  }
  function formatElapsedTime(ms) {
    ms = Math.max(0, ms);
    var totalSeconds = Math.floor(ms / 1e3);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor(totalSeconds % 3600 / 60);
    var seconds = totalSeconds % 60;
    return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }
  function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString();
  }
  function formatSampleAge(timestamp) {
    var seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1e3));
    if (seconds < 60) return seconds + "s";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m";
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h" + (minutes % 60 ? " " + minutes % 60 + "m" : "");
    var days = Math.floor(hours / 24);
    return days + "d" + (hours % 24 ? " " + hours % 24 + "h" : "");
  }
  function getModelName() {
    return getModelNameFromUrl(location.href);
  }

  // src/trends.js
  function checkTrendAutoEscalation() {
    if (!runtime.autoTrendEscalation || !runtime.trackingStartTime) return;
    var elapsedMs = runtime.isPaused ? runtime.pausedElapsedTime : Date.now() - runtime.trackingStartTime;
    var elapsedMin = elapsedMs / 6e4;
    var targetMode = "last";
    if (elapsedMin >= 60) targetMode = "1hour";
    else if (elapsedMin >= 30) targetMode = "30min";
    else if (elapsedMin >= 15) targetMode = "15min";
    else if (elapsedMin >= 5) targetMode = "5min";
    if (targetMode !== runtime.trendComparisonMode) {
      log("Auto-escalating trend mode: " + runtime.trendComparisonMode + " -> " + targetMode + " (" + Math.floor(elapsedMin) + " min elapsed)");
      if (runtime.users.size === 0) {
        runtime.trendComparisonMode = targetMode;
        updateTrendPresetButtons();
        updateAutoTrendButton();
        saveSession(getModelName());
        return;
      }
      setTrendComparisonMode(targetMode);
    }
  }
  function toggleAutoTrendEscalation() {
    runtime.autoTrendEscalation = !runtime.autoTrendEscalation;
    updateAutoTrendButton();
    log("Auto trend escalation " + (runtime.autoTrendEscalation ? "enabled" : "disabled"));
    saveSession(getModelName());
    if (runtime.autoTrendEscalation) {
      checkTrendAutoEscalation();
    }
  }
  function updateAutoTrendButton() {
    var btn = document.getElementById("btn-trend-auto");
    if (btn) {
      if (runtime.autoTrendEscalation) {
        btn.style.background = "#32CD32";
        btn.style.color = "#fff";
        btn.style.borderColor = "#32CD32";
        btn.title = "Auto-escalation ON - Click to disable";
      } else {
        btn.style.background = "var(--panel-button)";
        btn.style.color = "var(--panel-muted)";
        btn.style.borderColor = "var(--panel-divider)";
        btn.title = "Auto-escalation OFF - Click to enable";
      }
    }
  }
  function getComparisonCounts() {
    var comparisonNow = runtime.isStopped ? runtime.history.timestamps[runtime.history.timestamps.length - 1] || runtime.stoppedAt : Date.now();
    if (runtime.trendComparisonMode === "last") {
      if (runtime.history.timestamps.length < 2) {
        return { counts: null, short: false, actualMinutes: 0 };
      }
      var lastIdx = runtime.history.timestamps.length - 2;
      var actualMinutes = Math.round((comparisonNow - runtime.history.timestamps[lastIdx]) / 6e4);
      return {
        counts: {
          "red": runtime.history["red"][lastIdx] || 0,
          "green": runtime.history["green"][lastIdx] || 0,
          "purple": runtime.history["purple"][lastIdx] || 0,
          "pink": runtime.history["pink"][lastIdx] || 0,
          "dark-blue": runtime.history["dark-blue"][lastIdx] || 0,
          "light-blue": runtime.history["light-blue"][lastIdx] || 0,
          "gray": runtime.history["gray"][lastIdx] || 0,
          "female-trans": runtime.history["female-trans"][lastIdx] || 0,
          "withTokens": runtime.history["withTokens"][lastIdx] || 0,
          "total": runtime.history["total"][lastIdx] || 0,
          "anonymous": runtime.history["anonymous"][lastIdx] || 0
        },
        short: false,
        actualMinutes
      };
    }
    if (runtime.trendComparisonMode === "start") {
      if (runtime.history.timestamps.length === 0) {
        return {
          counts: {
            "red": 0,
            "green": 0,
            "purple": 0,
            "pink": 0,
            "dark-blue": 0,
            "light-blue": 0,
            "gray": 0,
            "female-trans": 0,
            "withTokens": 0,
            "total": 0,
            "anonymous": 0
          },
          short: false,
          actualMinutes: 0
        };
      }
      var startMinutes = Math.round((comparisonNow - runtime.history.timestamps[0]) / 6e4);
      return {
        counts: {
          "red": runtime.history["red"][0] || 0,
          "green": runtime.history["green"][0] || 0,
          "purple": runtime.history["purple"][0] || 0,
          "pink": runtime.history["pink"][0] || 0,
          "dark-blue": runtime.history["dark-blue"][0] || 0,
          "light-blue": runtime.history["light-blue"][0] || 0,
          "gray": runtime.history["gray"][0] || 0,
          "female-trans": runtime.history["female-trans"][0] || 0,
          "withTokens": runtime.history["withTokens"][0] || 0,
          "total": runtime.history["total"][0] || 0,
          "anonymous": runtime.history["anonymous"][0] || 0
        },
        short: false,
        actualMinutes: startMinutes
      };
    }
    var preset = runtime.TREND_PRESETS[runtime.trendComparisonMode];
    if (!preset || preset.ms <= 0) return { counts: runtime.previousCounts, short: false, actualMinutes: 0 };
    var targetTime = comparisonNow - preset.ms;
    var idx = -1;
    for (var i = 0; i < runtime.history.timestamps.length; i++) {
      if (runtime.history.timestamps[i] <= targetTime) {
        idx = i;
      } else {
        break;
      }
    }
    var short = idx === -1;
    if (short) idx = 0;
    if (idx === -1 || runtime.history.timestamps.length === 0) {
      return { counts: runtime.previousCounts, short: false, actualMinutes: 0 };
    }
    var actualMs = comparisonNow - runtime.history.timestamps[idx];
    var actualMinutes = Math.round(actualMs / 6e4);
    return {
      counts: {
        "red": runtime.history["red"][idx] || 0,
        "green": runtime.history["green"][idx] || 0,
        "purple": runtime.history["purple"][idx] || 0,
        "pink": runtime.history["pink"][idx] || 0,
        "dark-blue": runtime.history["dark-blue"][idx] || 0,
        "light-blue": runtime.history["light-blue"][idx] || 0,
        "gray": runtime.history["gray"][idx] || 0,
        "female-trans": runtime.history["female-trans"][idx] || 0,
        "withTokens": runtime.history["withTokens"][idx] || 0,
        "total": runtime.history["total"][idx] || 0,
        "anonymous": runtime.history["anonymous"][idx] || 0
      },
      short,
      actualMinutes
    };
  }
  function setTrendComparisonMode(mode) {
    if (!runtime.TREND_PRESETS[mode] && mode !== "last") return;
    runtime.trendComparisonMode = mode;
    updateTrendDisplay();
    updateTrendPresetButtons();
    saveSession(getModelName());
  }
  function updateTrendPresetButtons() {
    var buttons = document.querySelectorAll(".trend-preset-btn");
    buttons.forEach(function(btn) {
      var mode = btn.dataset.mode;
      if (mode === runtime.trendComparisonMode) {
        btn.style.background = "#4169E1";
        btn.style.color = "#fff";
        btn.style.borderColor = "#4169E1";
      } else {
        btn.style.background = "var(--panel-button)";
        btn.style.color = "var(--panel-muted)";
        btn.style.borderColor = "var(--panel-divider)";
      }
    });
  }
  function updateTrendDisplay() {
    if (runtime.presentationMode === "PLAYBACK") return;
    var trendContainer = document.getElementById("trend-container");
    var trendHeaderLabel = document.getElementById("trend-header-label");
    if (!trendContainer) return;
    if (runtime.restoredDisplayFrame) {
      trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-muted);text-align:center;padding:8px;">' + (runtime.isStopped ? "Session stopped — history remains available in Replay." : "Saved snapshot — trends resume after a new sample.") + "</div>";
      if (trendHeaderLabel) trendHeaderLabel.textContent = "📈 TREND";
      return;
    }
    if (!runtime.hasTrendBaseline) {
      trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div>';
      if (trendHeaderLabel) trendHeaderLabel.textContent = "📈 TREND";
      return;
    }
    var counts = { "red": 0, "green": 0, "purple": 0, "pink": 0, "dark-blue": 0, "light-blue": 0, "gray": 0, "female-trans": 0 };
    runtime.users.forEach(function(data) {
      if (counts[data.tier] !== void 0) counts[data.tier]++;
      if (data.gender === "female" || data.gender === "trans") {
        counts["female-trans"]++;
      }
    });
    var total = runtime.users.size;
    var withTokens = counts["red"] + counts["green"] + counts["purple"] + counts["pink"] + counts["dark-blue"] + counts["light-blue"];
    var anonymousCount = getAnonymousCount();
    var comparison = getComparisonCounts();
    var comparisonCounts = comparison.counts;
    var shortSession = comparison.short;
    var actualMinutes = comparison.actualMinutes;
    if (!comparisonCounts) {
      var waitingText = runtime.history.timestamps.length === 1 ? "Waiting for second scan..." : "Waiting for scan...";
      trendContainer.innerHTML = '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">' + waitingText + "</div>";
      if (trendHeaderLabel) trendHeaderLabel.textContent = "📈 TREND";
      return;
    }
    var getShortLabel = function() {
      if (!shortSession || actualMinutes <= 0) return "";
      if (actualMinutes < 60) return " vs " + actualMinutes + "m";
      var hours = Math.floor(actualMinutes / 60);
      var mins = actualMinutes % 60;
      return " vs " + hours + "h" + (mins > 0 ? mins : "");
    };
    function buildTrendItem(name, current, prev, isSpecial, isLarge) {
      var diff = current - prev;
      var deltaText = diff !== 0 ? diff > 0 ? "+" + diff : diff : "";
      var deltaColor = diff > 0 ? "var(--panel-positive)" : "var(--panel-negative)";
      var bgStyle;
      if (diff > 0) {
        bgStyle = "background:rgba(50, 205, 50, 0.22);";
      } else if (diff < 0) {
        bgStyle = "background:rgba(255, 85, 85, 0.15);";
      } else {
        bgStyle = "background:rgba(255, 215, 0, 0.15);";
      }
      if (isSpecial) bgStyle += "border:1px solid #ff69b4;";
      var padding = isLarge ? "6px 12px" : "2px 6px";
      var fontSize = isLarge ? "12px" : "10px";
      var deltaFont = fontSize;
      if (deltaText) {
        var dlen = String(Math.abs(diff)).length;
        if (dlen >= 4) deltaFont = "8px";
        else if (dlen === 3) deltaFont = "10px";
      }
      return '<div style="display:flex;align-items:center;gap:4px;' + bgStyle + "padding:" + padding + ';border-radius:4px;"><span style="font-size:' + fontSize + ';">' + name + "</span>" + (deltaText ? '<span style="font-size:' + deltaFont + ";font-weight:bold;color:" + deltaColor + ';">' + deltaText + "</span>" : "") + "</div>";
    }
    var headerLabel = "📈 TREND";
    var shortLabel = getShortLabel();
    var html = '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
    html += buildTrendItem(getTierMarker("red"), counts["red"] || 0, comparisonCounts["red"] || 0, false, false);
    html += buildTrendItem(getTierMarker("green"), counts["green"] || 0, comparisonCounts["green"] || 0, false, false);
    html += buildTrendItem(getTierMarker("purple"), counts["purple"] || 0, comparisonCounts["purple"] || 0, false, false);
    html += buildTrendItem(getTierMarker("pink"), counts["pink"] || 0, comparisonCounts["pink"] || 0, false, false);
    html += "</div>";
    html += '<div style="display:flex;justify-content:center;gap:6px;padding:4px 0;">';
    html += buildTrendItem(getTierMarker("dark-blue"), counts["dark-blue"] || 0, comparisonCounts["dark-blue"] || 0, false, false);
    html += buildTrendItem(getTierMarker("light-blue"), counts["light-blue"] || 0, comparisonCounts["light-blue"] || 0, false, false);
    html += buildTrendItem(getTierMarker("gray"), counts["gray"] || 0, comparisonCounts["gray"] || 0, false, false);
    html += buildTrendItem(getTierMarker("female-trans"), counts["female-trans"] || 0, comparisonCounts["female-trans"] || 0, false, false);
    html += "</div>";
    html += '<div style="display:flex;justify-content:center;gap:8px;padding:4px 0;">';
    html += buildTrendItem("💎", withTokens || 0, comparisonCounts.withTokens || 0, true, true);
    html += buildTrendItem("📊", total || 0, comparisonCounts.total || 0, false, true);
    html += buildTrendItem("👻", anonymousCount || 0, comparisonCounts.anonymous || 0, false, true);
    html += "</div>";
    trendContainer.innerHTML = html;
    if (trendHeaderLabel) {
      trendHeaderLabel.textContent = headerLabel + shortLabel;
    }
  }

  // src/scanning.js
  function readRequestPolicy() {
    try {
      var raw = GM_getValue(runtime.REQUEST_POLICY_KEY, null);
      if (raw === null && !runtime.requestPolicyUnsaved) runtime.requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: "" };
      else if (raw !== null) {
        var value = JSON.parse(raw);
        if (value && Number.isFinite(value.until) && value.until >= 0 && Number.isInteger(value.failures) && value.failures >= 0 && (value.blocked === 0 || value.blocked === 401 || value.blocked === 403) && Number.isInteger(value.status) && (!value.serverUntil || isStorageTimestamp(value.serverUntil)) && typeof value.revision === "string") {
          if (runtime.requestPolicyUnsaved) {
            value = Object.assign({}, value, {
              until: Math.max(value.until, runtime.requestPolicyCache.until),
              serverUntil: Math.max(value.serverUntil || 0, runtime.requestPolicyCache.serverUntil || 0),
              failures: Math.max(value.failures, runtime.requestPolicyCache.failures),
              blocked: runtime.requestPolicyCache.blocked || value.blocked,
              status: runtime.requestPolicyCache.until >= value.until ? runtime.requestPolicyCache.status : value.status,
              revision: runtime.requestPolicyCache.revision
            });
          }
          runtime.requestPolicyCache = value;
        }
      }
    } catch (error) {
    }
    return runtime.requestPolicyCache;
  }
  function writeRequestPolicy(policy) {
    policy.revision = makeStorageId();
    runtime.requestPolicyCache = policy;
    runtime.requestPolicyUnsaved = true;
    try {
      GM_setValue(runtime.REQUEST_POLICY_KEY, JSON.stringify(policy));
      runtime.requestPolicyUnsaved = false;
    } catch (error) {
      log("Request restriction is local to this tab: " + error.message);
    }
  }
  function retryAfterTime(value, now) {
    if (typeof value !== "string" || !value.trim()) return 0;
    value = value.trim();
    if (/^\d+$/.test(value)) {
      var until = now + Number(value) * 1e3;
      return Number.isSafeInteger(until) && until <= 864e13 ? until : 0;
    }
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > now ? parsed : 0;
  }
  function recordRequestFailure(error) {
    var old = readRequestPolicy();
    var failures = Math.min(20, old.failures + 1);
    var status = error.status || 0;
    var delay = Math.min(9e5, Math.max(6e4, runtime.scanIntervalSeconds * 1e3) * Math.pow(2, failures - 1));
    var policy = {
      until: Math.max(old.until, Date.now() + delay, error.retryAt || 0),
      failures,
      blocked: status === 401 || status === 403 ? status : old.blocked,
      status,
      serverUntil: Math.max(old.serverUntil || 0, error.retryAt || 0, status === 429 ? Date.now() + delay : 0),
      revision: ""
    };
    writeRequestPolicy(policy);
    return policy;
  }
  function clearRequestFailures(revision) {
    var current = readRequestPolicy();
    if (current.revision !== revision || current.blocked || !current.failures) return;
    runtime.requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: "" };
    runtime.requestPolicyUnsaved = false;
    try {
      GM_deleteValue(runtime.REQUEST_POLICY_KEY);
    } catch (error) {
    }
  }
  function requestPolicyMessage(policy) {
    if (policy.blocked) return "Access denied (" + policy.blocked + ")";
    var seconds = Math.max(0, Math.ceil((policy.until - Date.now()) / 1e3));
    if (!seconds) return "";
    return (policy.status === 429 ? "Rate limited · " : "Retry in ") + (seconds >= 60 ? Math.ceil(seconds / 60) + "m" : seconds + "s");
  }
  function pauseForAccessRestriction() {
    pauseAutoRefresh();
  }
  function parseGetChatUserListResponse(text) {
    if (typeof text !== "string" || !text.trim()) throw new Error("Empty API response");
    var parts = text.trim().split(",");
    if (!/^\d+$/.test(parts[0])) throw new Error("Invalid API anonymous count");
    var anonymousCount = Number(parts[0]);
    if (!Number.isSafeInteger(anonymousCount)) throw new Error("Unsafe API anonymous count");
    var classTiers = { m: "red", f: "green", l: "purple", p: "pink", tr: "dark-blue", t: "light-blue", g: "gray" };
    var genders = { m: "male", f: "female", s: "trans", c: "couple" };
    var seen = /* @__PURE__ */ new Set();
    var parsedUsers = [];
    var unknownClasses = /* @__PURE__ */ Object.create(null);
    var unknownGenders = /* @__PURE__ */ Object.create(null);
    for (var i = 1; i < parts.length; i++) {
      var fields = parts[i].split("|");
      if (fields.length !== 4 || !/^[A-Za-z0-9_-]{2,30}$/.test(fields[0]) || fields.slice(1).some(function(field) {
        return !/^[^\s|,<>\x00-\x1f]+$/.test(field);
      })) {
        throw new Error("Malformed API record at index " + i);
      }
      var username = fields[0];
      var key = username.toLowerCase();
      if (seen.has(key)) throw new Error("Duplicate API username at index " + i);
      seen.add(key);
      var rawClass = fields[1];
      var genderCode = fields[2];
      var isOwner = rawClass === "o";
      var tier = Object.prototype.hasOwnProperty.call(classTiers, rawClass) ? classTiers[rawClass] : null;
      var gender = Object.prototype.hasOwnProperty.call(genders, genderCode) ? genders[genderCode] : "unknown";
      if (!tier && !isOwner) unknownClasses[rawClass] = (unknownClasses[rawClass] || 0) + 1;
      if (gender === "unknown") unknownGenders[genderCode] = (unknownGenders[genderCode] || 0) + 1;
      parsedUsers.push({
        username,
        rawClass,
        tier,
        genderCode,
        gender,
        rawFlag: fields[3],
        isOwner
      });
    }
    var registeredCount = parsedUsers.length;
    var totalUsers = anonymousCount + registeredCount;
    if (!Number.isSafeInteger(totalUsers)) throw new Error("Unsafe API total users");
    return {
      anonymousCount,
      registeredCount,
      totalUsers,
      users: parsedUsers,
      diagnostics: { unknownClasses, unknownGenders }
    };
  }
  function isAcquisitionCurrent(context) {
    return context.epoch === runtime.scanEpoch && context.generation === runtime.initGuard && context.url === location.href;
  }
  function validateRoomSnapshot(snapshot) {
    if (!snapshot || !Number.isSafeInteger(snapshot.roomTotal) || snapshot.roomTotal < 0 || !Array.isArray(snapshot.users)) throw new Error("Invalid room snapshot");
    if (snapshot.source === "API" && (!Number.isSafeInteger(snapshot.anonymousCount) || snapshot.anonymousCount < 0 || snapshot.registeredCount !== snapshot.users.length || snapshot.totalUsers !== snapshot.anonymousCount + snapshot.registeredCount || snapshot.roomTotal !== snapshot.totalUsers)) {
      throw new Error("Inconsistent API anonymous, registered, or total user counts");
    }
    if (!isScanValid(snapshot.users.length, snapshot.roomTotal)) {
      throw new Error("Sample rejected by 3.0.0 scan-validity checks");
    }
  }
  async function acquireAPISnapshot(context) {
    if (!context.room || context.room === "unknown") throw new Error("No current room username");
    var url = new URL("/api/getchatuserlist/", location.origin);
    url.searchParams.set("roomname", context.room);
    url.searchParams.set("private", "false");
    url.searchParams.set("sort_by", "a");
    url.searchParams.set("exclude_staff", "false");
    var controller = new AbortController();
    var timeout;
    try {
      var text = await Promise.race([
        (async function() {
          var response = await fetch(url.href, {
            method: "GET",
            credentials: "same-origin",
            mode: "same-origin",
            cache: "no-store",
            redirect: "error",
            signal: controller.signal
          });
          if (!response.ok) {
            var error = new Error("API HTTP " + response.status);
            error.status = response.status;
            error.retryAt = retryAfterTime(response.headers && response.headers.get("Retry-After"), Date.now());
            throw error;
          }
          return response.text();
        })(),
        new Promise(function(resolve, reject) {
          timeout = setTimeout(function() {
            reject(new Error("API request timed out after " + runtime.API_TIMEOUT_MS + " ms"));
            controller.abort();
          }, runtime.API_TIMEOUT_MS);
        })
      ]);
      var snapshot = parseGetChatUserListResponse(text);
      snapshot.roomTotal = snapshot.totalUsers;
      snapshot.source = "API";
      snapshot.timestamp = Date.now();
      return snapshot;
    } finally {
      clearTimeout(timeout);
    }
  }
  async function acquireDOMSnapshot(context, returnToChat) {
    var usersTab = findTab("users");
    var chatTab = findTab("chat");
    if (!usersTab) throw new Error("USERS tab not found");
    var openedUsers = false;
    try {
      usersTab.click();
      openedUsers = true;
      await new Promise(function(resolve) {
        setTimeout(resolve, 800);
      });
      if (!isAcquisitionCurrent(context)) return null;
      return scanUsers();
    } finally {
      if (openedUsers && isAcquisitionCurrent(context) && returnToChat && chatTab) {
        try {
          chatTab.click();
        } catch (err) {
          log("DOM fallback could not return to CHAT: " + err.message);
        }
      }
    }
  }
  async function checkBroadcasterReturn(context) {
    runtime.lastAcquisitionAttemptSource = "API";
    try {
      var snapshot = await acquireAPISnapshot(context);
      if (!isAcquisitionCurrent(context) || checkAbsenceStop() || !isAbsencePaused()) return null;
      if (readRequestPolicy().blocked) {
        pauseForAccessRestriction();
        return null;
      }
      clearRequestFailures(context.policyRevision);
      if (!snapshot.users.some(function(user) {
        return user.isOwner === true;
      })) return null;
      runtime.broadcasterAbsence = { since: null, missing: 0 };
      runtime.absencePausedAt = null;
      runtime.absenceOverrideActive = false;
      startTrackingTimer();
      updateStopControls();
      validateRoomSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      if (!isAcquisitionCurrent(context)) return null;
      if (isAbsencePaused()) {
        var policy = recordRequestFailure(error);
        if (policy.blocked) pauseForAccessRestriction();
      }
      log("Return check did not record a sample: " + error.message);
      return null;
    }
  }
  function getDOMFallbackWaitSeconds(modelName) {
    var readyAt = runtime.domFallbackReadyAtByRoom.get(modelName.toLowerCase()) || 0;
    return Math.max(0, Math.ceil((readyAt - Date.now()) / 1e3));
  }
  async function acquireRoomSnapshot(context, returnToChat) {
    runtime.lastAcquisitionAttemptSource = "API";
    try {
      var snapshot = await acquireAPISnapshot(context);
      if (!isAcquisitionCurrent(context)) return null;
      if (checkAbsenceStop() || !isAcquisitionCurrent(context)) return null;
      runtime.broadcasterAbsence = nextBroadcasterAbsence(snapshot);
      if (checkAbsenceStop() || !isAcquisitionCurrent(context)) return null;
      validateRoomSnapshot(snapshot);
      runtime.domHealthStatus.consecutiveFailures = 0;
      clearRequestFailures(context.policyRevision);
      return snapshot;
    } catch (err) {
      if (!isAcquisitionCurrent(context)) return null;
      console.warn("[TierScope " + runtime.TIERSCOPE_VERSION + "] API failed: " + err.message);
      var policy = recordRequestFailure(err);
      if (policy.blocked) {
        pauseForAccessRestriction();
        return null;
      }
      if (err.status === 429 || err.retryAt > Date.now()) return null;
    }
    runtime.lastAcquisitionAttemptSource = "DOM";
    var fallbackWait = getDOMFallbackWaitSeconds(context.room);
    if (fallbackWait > 0) {
      log("DOM fallback deferred for " + fallbackWait + "s; retaining previous valid data (no history point)");
      return null;
    }
    var roomKey = context.room.toLowerCase();
    var fallbackIntervalMs = Math.max(runtime.DOM_FALLBACK_INTERVAL_SECONDS, runtime.scanIntervalSeconds) * 1e3;
    runtime.domFallbackReadyAtByRoom.set(roomKey, Date.now() + fallbackIntervalMs);
    log("Attempting DOM fallback; room=" + context.room);
    try {
      var fallback = await acquireDOMSnapshot(context, returnToChat);
      if (!isAcquisitionCurrent(context)) return null;
      validateRoomSnapshot(fallback);
      log("DOM fallback succeeded; room=" + context.room + " records=" + fallback.users.length);
      return fallback;
    } catch (err) {
      if (!isAcquisitionCurrent(context)) return null;
      console.warn("[TierScope " + runtime.TIERSCOPE_VERSION + "] DOM fallback failed: " + err.message + "; retaining previous valid data (no history point)");
      return null;
    } finally {
      runtime.domFallbackReadyAtByRoom.set(roomKey, Math.max(
        runtime.domFallbackReadyAtByRoom.get(roomKey) || 0,
        Date.now() + fallbackIntervalMs
      ));
    }
  }
  function acceptRoomSnapshot(snapshot, modelName) {
    runtime.restoredDisplayFrame = null;
    runtime.users = new Map(snapshot.users.map(function(user) {
      return [user.username, user];
    }));
    runtime.roomTotal = snapshot.roomTotal;
    runtime.lastAcceptedAcquisition = { source: snapshot.source, timestamp: snapshot.timestamp, api: null };
    if (snapshot.source === "API") {
      var owners = snapshot.users.filter(function(user) {
        return user.isOwner;
      });
      var tierSum = snapshot.users.filter(function(user) {
        return user.tier !== null;
      }).length;
      var unknownClasses = snapshot.diagnostics.unknownClasses;
      var unknownGenders = snapshot.diagnostics.unknownGenders;
      runtime.lastAcceptedAcquisition.api = {
        anonymousCount: snapshot.anonymousCount,
        registeredCount: snapshot.registeredCount,
        totalUsers: snapshot.totalUsers,
        ownerCount: owners.length
      };
      return {
        room: modelName,
        anonymousCount: snapshot.anonymousCount,
        registeredCount: snapshot.registeredCount,
        totalUsers: snapshot.totalUsers,
        ownerCount: owners.length,
        unknownClasses: Object.values(unknownClasses).reduce(function(a, b) {
          return a + b;
        }, 0),
        unknownGenders: Object.values(unknownGenders).reduce(function(a, b) {
          return a + b;
        }, 0),
        unknownClassCodes: unknownClasses,
        unknownGenderCodes: unknownGenders,
        viewerTierSum: tierSum,
        registeredMinusTierSum: runtime.users.size - tierSum,
        viewerTierGapExplanation: "Owner and unknown-class records count toward Registered, outside the seven viewer tiers",
        timestamp: new Date(snapshot.timestamp).toISOString()
      };
    }
    return null;
  }
  function updateAcquisitionStatus() {
    updateMiniFreshness();
    var el = document.getElementById("acquisition-status");
    if (!el) return;
    if (runtime.isStopped) {
      el.textContent = "Stopped";
      el.title = stopDescription() + " at " + new Date(runtime.stoppedAt).toLocaleString() + ". History and elapsed time are frozen.";
      return;
    }
    if (runtime.sessionStorageNotice) {
      el.textContent = "Local only • room reset";
      el.title = runtime.sessionStorageNotice;
      return;
    }
    var policyMessage = requestPolicyMessage(readRequestPolicy());
    if (policyMessage) {
      var sample = runtime.lastAcceptedAcquisition || runtime.restoredDisplayFrame;
      el.textContent = policyMessage;
      el.title = policyMessage + (sample ? ". Last sample: " + new Date(sample.timestamp).toISOString() : ". No accepted sample.");
      return;
    }
    if (isAbsencePaused()) {
      el.textContent = "Auto-paused • return checks";
      el.title = absencePauseDescription();
      return;
    }
    if (!runtime.lastAcceptedAcquisition) {
      if (runtime.restoredDisplayFrame) {
        el.textContent = "Saved • " + formatSampleAge(runtime.restoredDisplayFrame.timestamp);
        el.title = "Saved sample recorded at: " + new Date(runtime.restoredDisplayFrame.timestamp).toISOString() + ". Age is measured from the sample time, not the session save time. Waiting for the first fresh sample since restore.";
      } else {
        el.textContent = "No sample";
        el.title = "No accepted sample in this page session";
      }
      return;
    }
    el.textContent = runtime.lastAcceptedAcquisition.source + " • " + formatSampleAge(runtime.lastAcceptedAcquisition.timestamp);
    el.title = "Last accepted sample: " + new Date(runtime.lastAcceptedAcquisition.timestamp).toISOString() + ". TierScope and the USERS tab refresh independently.";
  }
  async function performScanThenReturn(returnToChat) {
    if (typeof returnToChat === "undefined") returnToChat = true;
    if (checkAbsenceStop()) return;
    if (runtime.isScanning || runtime.isStopped) return;
    var policy = readRequestPolicy();
    if (policy.blocked) {
      pauseForAccessRestriction();
      updateCountdownDisplay();
      return;
    }
    if (policy.until > Date.now()) {
      updateCountdownDisplay();
      return;
    }
    runtime.isScanning = true;
    var context = { epoch: ++runtime.scanEpoch, generation: runtime.initGuard, url: location.href, room: getModelName(), policyRevision: policy.revision };
    var priorState = null;
    var sampleCommitted = false;
    var priorAbsence = runtime.broadcasterAbsence;
    var checkingReturn = isAbsencePaused();
    var statusEl = document.getElementById("auto-status");
    updateCountdownDisplay();
    try {
      var snapshot = checkingReturn ? await checkBroadcasterReturn(context) : await acquireRoomSnapshot(context, returnToChat);
      if (!isAcquisitionCurrent(context)) return;
      if (checkAbsenceStop()) return;
      if (checkingReturn && isAbsencePaused()) return;
      if (!snapshot) {
        runtime.pendingHistoryGap = true;
        if (statusEl) {
          statusEl.textContent = "Scan skipped (unreliable)";
          statusEl.style.color = "var(--panel-negative)";
        }
        return;
      }
      priorState = {
        users: runtime.users,
        roomTotal: runtime.roomTotal,
        previousUserCount: runtime.previousUserCount,
        previousRoomTotal: runtime.previousRoomTotal,
        previousCounts: runtime.previousCounts,
        hasTrendBaseline: runtime.hasTrendBaseline,
        lastAcceptedAcquisition: runtime.lastAcceptedAcquisition,
        restoredDisplayFrame: runtime.restoredDisplayFrame,
        pendingHistoryGap: runtime.pendingHistoryGap,
        trendHTML: (document.getElementById("trend-container") || {}).innerHTML,
        trendHeaderText: (document.getElementById("trend-header-label") || {}).textContent,
        history: Object.fromEntries(Object.keys(runtime.history).map(function(key) {
          return [key, runtime.history[key].slice()];
        })),
        roomTotalHigh: runtime.roomTotalHigh,
        roomTotalHighTime: runtime.roomTotalHighTime,
        tierHighTimes: Object.fromEntries(Object.entries(runtime.tierHighTimes)),
        withTokensHighTime: runtime.withTokensHighTime,
        totalHighTime: runtime.totalHighTime,
        anonHighTime: runtime.anonHighTime,
        femaleTransHighTime: runtime.femaleTransHighTime,
        sessionStartedAt: runtime.sessionStartedAt,
        sessionHighs: Object.fromEntries(Object.entries(runtime.sessionHighs).map(function(entry) {
          return [entry[0], Object.assign({}, entry[1])];
        })),
        allTimeHighs: readAllTimeHighs(context.room).highs,
        newHighTiers: Object.fromEntries(Object.entries(runtime.newHighTiers))
      };
      var diagnostics = acceptRoomSnapshot(snapshot, context.room);
      var counts = { "red": 0, "green": 0, "purple": 0, "pink": 0, "dark-blue": 0, "light-blue": 0, "gray": 0, "female-trans": 0 };
      runtime.users.forEach(function(data) {
        if (counts[data.tier] !== void 0) counts[data.tier]++;
        if (data.gender === "female" || data.gender === "trans") {
          counts["female-trans"]++;
        }
      });
      var total = runtime.users.size;
      var withTokens = counts["red"] + counts["green"] + counts["purple"] + counts["pink"] + counts["dark-blue"] + counts["light-blue"];
      var anonymousCount = getAnonymousCount();
      runtime.previousUserCount = total;
      runtime.previousRoomTotal = runtime.roomTotal;
      var currentRoomTotal = runtime.roomTotal > 0 ? runtime.roomTotal : total + anonymousCount;
      if (currentRoomTotal > runtime.roomTotalHigh) {
        runtime.roomTotalHigh = currentRoomTotal;
        runtime.roomTotalHighTime = Date.now();
      }
      saveToHistory();
      runtime.hasTrendBaseline = true;
      updateDisplay();
      updateTrendDisplay();
      runtime.previousCounts = {
        "red": counts["red"] || 0,
        "green": counts["green"] || 0,
        "purple": counts["purple"] || 0,
        "pink": counts["pink"] || 0,
        "dark-blue": counts["dark-blue"] || 0,
        "light-blue": counts["light-blue"] || 0,
        "gray": counts["gray"] || 0,
        "female-trans": counts["female-trans"] || 0,
        "withTokens": withTokens || 0,
        "total": total || 0,
        "anonymous": anonymousCount || 0
      };
      updateAcquisitionStatus();
      saveSession(context.room);
      if (diagnostics) console.log("[TierScope " + runtime.TIERSCOPE_VERSION + "] API scan accepted", diagnostics);
      sampleCommitted = true;
    } catch (err) {
      if (priorState) {
        runtime.users = priorState.users;
        runtime.roomTotal = priorState.roomTotal;
        runtime.previousUserCount = priorState.previousUserCount;
        runtime.previousRoomTotal = priorState.previousRoomTotal;
        runtime.previousCounts = priorState.previousCounts;
        runtime.hasTrendBaseline = priorState.hasTrendBaseline;
        runtime.lastAcceptedAcquisition = priorState.lastAcceptedAcquisition;
        runtime.restoredDisplayFrame = priorState.restoredDisplayFrame;
        runtime.history = priorState.history;
        runtime.pendingHistoryGap = priorState.pendingHistoryGap;
        runtime.roomTotalHigh = priorState.roomTotalHigh;
        runtime.roomTotalHighTime = priorState.roomTotalHighTime;
        runtime.tierHighTimes = priorState.tierHighTimes;
        runtime.withTokensHighTime = priorState.withTokensHighTime;
        runtime.totalHighTime = priorState.totalHighTime;
        runtime.anonHighTime = priorState.anonHighTime;
        runtime.femaleTransHighTime = priorState.femaleTransHighTime;
        runtime.sessionStartedAt = priorState.sessionStartedAt;
        runtime.sessionHighs = priorState.sessionHighs;
        runtime.newHighTiers = priorState.newHighTiers || {};
        try {
          var trendEl = document.getElementById("trend-container");
          if (trendEl && typeof priorState.trendHTML === "string") trendEl.innerHTML = priorState.trendHTML;
          var trendHeader = document.getElementById("trend-header-label");
          if (trendHeader && typeof priorState.trendHeaderText === "string") trendHeader.textContent = priorState.trendHeaderText;
          updateDisplay();
          updateAcquisitionStatus();
          if (!runtime.isMinimized) drawAllSparklines();
        } catch (displayError) {
          log("Could not repaint previous data: " + displayError.message);
        }
      }
      runtime.pendingHistoryGap = true;
      log("Error during scan; retaining previous valid data: " + err.message);
    } finally {
      if (sampleCommitted) {
        try {
          recordAcceptedAllTimeHighs(context.room);
          updateDisplay();
        } catch (error) {
          log("Could not update all-time highs: " + error.message);
        }
        pulseAcceptedHighs(priorState);
      }
      if (isAcquisitionCurrent(context)) {
        runtime.isScanning = false;
        resetCountdown();
        updateAcquisitionStatus();
        if (checkingReturn || !priorState && priorAbsence !== runtime.broadcasterAbsence) saveSession(context.room);
      }
    }
  }

  // src/storage.js
  function getStorageKey(model) {
    return runtime.STORAGE_KEY_PREFIX + model.toLowerCase();
  }
  function isStorageObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function hasStorageField(data, field) {
    return Object.prototype.hasOwnProperty.call(data, field);
  }
  function isStorageNumber(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
  }
  function isStorageTimestamp(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= 864e13;
  }
  function makeStorageId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
  }
  function roomEpochKey(key) {
    return runtime.ROOM_EPOCH_PREFIX + key.slice(runtime.STORAGE_KEY_PREFIX.length);
  }
  function roomTabPrefix(key) {
    return runtime.TAB_RECORD_PREFIX + key.slice(runtime.STORAGE_KEY_PREFIX.length) + ":";
  }
  function getRoomEpoch(key) {
    return GM_getValue(roomEpochKey(key), "legacy");
  }
  function readSavedSession(key) {
    var epoch = getRoomEpoch(key);
    var keys = GM_listValues().filter(function(candidate) {
      return candidate.indexOf(roomTabPrefix(key)) === 0;
    });
    if (epoch === "legacy") keys.unshift(key);
    var selected;
    var warnings = [];
    keys.forEach(function(candidate) {
      try {
        var raw = GM_getValue(candidate, void 0);
        if (typeof raw === "undefined") return;
        if (typeof raw !== "string") throw new Error("Saved session must be JSON text");
        var parsed = JSON.parse(raw);
        var data = migrateStoredSession(parsed, determineStorageSchema(parsed));
        validateStoredSession(data);
        if (candidate !== key && typeof data.roomEpoch !== "string") throw new Error("Missing tab record epoch");
        if (hasStorageField(parsed, "sessionUniqueUsers") || hasStorageField(parsed, "sessionFemaleTransUsers")) {
          delete parsed.sessionUniqueUsers;
          delete parsed.sessionFemaleTransUsers;
          raw = JSON.stringify(parsed);
        }
        if (Date.now() - data.timestamp > runtime.STORAGE_MAX_AGE_MS) {
          if (candidate !== key) GM_deleteValue(candidate);
          return;
        }
        if (candidate !== key && data.roomEpoch !== epoch) return;
        var times = data.history.timestamps;
        var sampleTime = times.length ? Math.max.apply(null, times) : -1;
        var rank = [sampleTime, times.length, data.timestamp, candidate === key ? 0 : 1, candidate];
        if (!selected || rank.some(function(value, i) {
          return value > selected.rank[i] && rank.slice(0, i).every(function(v, j) {
            return v === selected.rank[j];
          });
        })) selected = { raw, rank };
      } catch (error) {
        warnings.push(candidate + ": " + error.message);
      }
    });
    var previous = runtime.sessionRecordWarnings.get(key) || [];
    warnings.forEach(function(warning) {
      if (previous.indexOf(warning) === -1) log("Saved record skipped and retained: " + warning);
    });
    runtime.sessionRecordWarnings.set(key, warnings);
    return selected ? selected.raw : void 0;
  }
  function determineStorageSchema(data) {
    if (!isStorageObject(data)) throw new Error("Saved session must be an object");
    if (!hasStorageField(data, "schemaVersion")) return { version: 1, legacy: true };
    if (!Number.isSafeInteger(data.schemaVersion) || data.schemaVersion < 0) {
      throw new Error("Invalid storage schemaVersion");
    }
    return { version: data.schemaVersion, legacy: false };
  }
  function migrateStoredSession(data, schema) {
    if (schema.version > runtime.STORAGE_SCHEMA_VERSION) {
      throw new Error("Newer storage schema " + schema.version + "; this build supports " + runtime.STORAGE_SCHEMA_VERSION);
    }
    if (schema.version === 1) return Object.assign({}, data, { schemaVersion: runtime.STORAGE_SCHEMA_VERSION });
    if (schema.version !== runtime.STORAGE_SCHEMA_VERSION) {
      throw new Error("Unsupported storage schema " + schema.version + "; no migration path to " + runtime.STORAGE_SCHEMA_VERSION);
    }
    return data;
  }
  function validateStoredSession(data) {
    function requireField(condition, field) {
      if (!condition) throw new Error("Invalid saved-session field: " + field);
    }
    requireField(isStorageObject(data), "record");
    if (hasStorageField(data, "schemaVersion")) {
      requireField(data.schemaVersion === runtime.STORAGE_SCHEMA_VERSION, "schemaVersion");
    }
    if (hasStorageField(data, "producerVersion")) {
      requireField(typeof data.producerVersion === "string", "producerVersion");
    }
    requireField(isStorageTimestamp(data.timestamp), "timestamp");
    requireField(isStorageObject(data.history), "history");
    requireField(Array.isArray(data.history.timestamps), "history.timestamps");
    requireField(data.history.timestamps.length <= runtime.MAX_HISTORY_LENGTH, "history length");
    requireField(data.history.timestamps.every(isStorageTimestamp), "history.timestamps");
    runtime.STORAGE_HISTORY_SERIES.forEach(function(field) {
      var series = data.history[field];
      requireField(Array.isArray(series) && series.length === data.history.timestamps.length && series.every(isStorageNumber), "history." + field);
    });
    if (hasStorageField(data.history, "breaks")) {
      requireField(Array.isArray(data.history.breaks) && data.history.breaks.length === data.history.timestamps.length && data.history.breaks.every(function(value) {
        return typeof value === "boolean";
      }), "history.breaks");
    }
    if (hasStorageField(data, "previousCounts")) {
      requireField(isStorageObject(data.previousCounts), "previousCounts");
      runtime.STORAGE_HISTORY_SERIES.forEach(function(field) {
        requireField(isStorageNumber(data.previousCounts[field]), "previousCounts." + field);
      });
    }
    if (hasStorageField(data, "tierHighTimes")) {
      requireField(isStorageObject(data.tierHighTimes), "tierHighTimes");
      Object.keys(data.tierHighTimes).forEach(function(tier) {
        requireField(hasStorageField(runtime.TIERS, tier) && (data.tierHighTimes[tier] === null || isStorageTimestamp(data.tierHighTimes[tier])), "tierHighTimes." + tier);
      });
    }
    runtime.STORAGE_NULLABLE_TIMES.forEach(function(field) {
      if (hasStorageField(data, field)) {
        requireField(data[field] === null || isStorageTimestamp(data[field]), field);
      }
    });
    if (hasStorageField(data, "roomEpoch")) requireField(typeof data.roomEpoch === "string", "roomEpoch");
    if (hasStorageField(data, "sessionStartEstimated")) requireField(typeof data.sessionStartEstimated === "boolean", "sessionStartEstimated");
    if (hasStorageField(data, "sessionHighs")) {
      requireField(isStorageObject(data.sessionHighs), "sessionHighs");
      runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        var high = data.sessionHighs[key];
        requireField(isStorageObject(high) && isStorageNumber(high.value) && (high.time === null || isStorageTimestamp(high.time)), "sessionHighs." + key);
        requireField(high.value >= Math.max.apply(null, [0].concat(data.history[key])), "sessionHighs." + key + " below retained history");
        requireField(high.value === 0 || high.time !== null, "sessionHighs." + key + ".time");
      });
    }
    if (hasStorageField(data, "roomTotalHigh")) requireField(isStorageNumber(data.roomTotalHigh), "roomTotalHigh");
    if (hasStorageField(data, "pausedElapsedTime")) {
      requireField(isStorageTimestamp(data.pausedElapsedTime) && data.pausedElapsedTime <= Math.min(data.timestamp, Date.now()), "pausedElapsedTime");
    }
    if (hasStorageField(data, "trendComparisonMode")) {
      requireField(typeof data.trendComparisonMode === "string" && hasStorageField(runtime.TREND_PRESETS, data.trendComparisonMode), "trendComparisonMode");
    }
    ["isPaused", "isStopped", "hasTrendBaseline", "autoTrendEscalation", "absenceOverrideActive"].forEach(function(field) {
      if (hasStorageField(data, field)) requireField(typeof data[field] === "boolean", field);
    });
    if (data.isStopped) {
      requireField(data.isPaused === true && isStorageTimestamp(data.stoppedAt), "stopped state");
      requireField(data.stopReason === "manual" || data.stopReason === "absence", "stopReason");
    }
    if (hasStorageField(data, "absencePausedAt") && data.absencePausedAt !== null) {
      requireField(isStorageTimestamp(data.absencePausedAt) && data.absencePausedAt <= data.timestamp && data.isPaused === true && data.absenceOverrideActive !== true && isStorageObject(data.broadcasterAbsence) && data.broadcasterAbsence.missing >= 2 && isStorageTimestamp(data.broadcasterAbsence.since) && data.absencePausedAt === data.broadcasterAbsence.since + runtime.ABSENCE_PAUSE_MS, "absencePausedAt");
    }
    if (hasStorageField(data, "broadcasterAbsence")) {
      var absence = data.broadcasterAbsence;
      requireField(isStorageObject(absence) && Number.isSafeInteger(absence.missing) && absence.missing >= 0 && absence.missing <= 1e6 && (absence.missing === 0 ? absence.since === null : isStorageTimestamp(absence.since) && absence.since <= data.timestamp), "broadcasterAbsence");
    }
  }
  function normalizeStoredSession(data) {
    var normalized = {
      timestamp: data.timestamp,
      history: Object.fromEntries(["timestamps"].concat(runtime.STORAGE_HISTORY_SERIES).map(function(field) {
        return [field, data.history[field].slice()];
      })),
      previousCounts: Object.fromEntries(runtime.STORAGE_HISTORY_SERIES.map(function(field) {
        return [field, hasStorageField(data, "previousCounts") ? data.previousCounts[field] : 0];
      })),
      hasTrendBaseline: hasStorageField(data, "previousCounts") && data.hasTrendBaseline === true,
      isPaused: data.isPaused === true,
      isStopped: data.isStopped === true,
      stoppedAt: data.isStopped ? data.stoppedAt : null,
      stopReason: data.isStopped ? data.stopReason : null,
      absencePausedAt: hasStorageField(data, "absencePausedAt") ? data.absencePausedAt : null,
      absenceOverrideActive: data.absenceOverrideActive === true,
      broadcasterAbsence: data.broadcasterAbsence ? Object.assign({}, data.broadcasterAbsence) : { since: null, missing: 0 },
      trendComparisonMode: hasStorageField(data, "trendComparisonMode") ? data.trendComparisonMode : "last",
      autoTrendEscalation: !hasStorageField(data, "autoTrendEscalation") || data.autoTrendEscalation,
      roomTotalHigh: hasStorageField(data, "roomTotalHigh") ? data.roomTotalHigh : 0,
      pausedElapsedTime: hasStorageField(data, "pausedElapsedTime") ? data.pausedElapsedTime : 0
    };
    ["tierHighTimes"].forEach(function(field) {
      normalized[field] = hasStorageField(data, field) ? Object.fromEntries(Object.entries(data[field])) : {};
    });
    runtime.STORAGE_NULLABLE_TIMES.forEach(function(field) {
      normalized[field] = hasStorageField(data, field) ? data[field] : null;
    });
    normalized.history.breaks = getHistoryBreaks(data.history).slice();
    normalized.sessionHighs = {};
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      if (data.sessionHighs && data.sessionHighs[key]) {
        normalized.sessionHighs[key] = Object.assign({}, data.sessionHighs[key]);
      } else {
        var values = normalized.history[key];
        var value = Math.max.apply(null, [0].concat(values));
        normalized.sessionHighs[key] = {
          value,
          time: value > 0 ? normalized.history.timestamps[values.indexOf(value)] : null
        };
      }
    });
    normalized.sessionStartEstimated = data.sessionStartEstimated === true;
    if (!hasStorageField(data, "sessionStartedAt")) {
      var knownTimes = [data.trackingStartTime, data.roomTotalHighTime].concat(normalized.history.timestamps).filter(function(time) {
        return typeof time === "number" && time > 0;
      });
      normalized.sessionStartedAt = knownTimes.length ? Math.min.apply(null, knownTimes) : null;
      normalized.sessionStartEstimated = knownTimes.length > 0;
    }
    return normalized;
  }
  function protectSessionStorage(key, reason, producerVersion) {
    var prior = runtime.sessionStorageStatus.get(key);
    if (prior && prior.protected) return prior;
    var status = { protected: true, reason, producerVersion: producerVersion == null ? null : producerVersion };
    runtime.sessionStorageStatus.set(key, status);
    log("Storage protected for " + key + ": " + reason + ". Saved data retained; automatic writes disabled until explicit Reset. Using a clean in-memory session on load.");
    return status;
  }
  function inspectStoredSession(model, restore) {
    var key = getStorageKey(model);
    var prior = runtime.sessionStorageStatus.get(key);
    if (prior && prior.protected) return prior;
    var producerVersion = null;
    try {
      var raw = readSavedSession(key);
      if (!restore && prior && prior.raw === raw) return prior;
      if (typeof raw === "undefined") {
        var empty = { protected: false, raw, producerVersion: null };
        runtime.sessionStorageStatus.set(key, empty);
        return empty;
      }
      if (typeof raw !== "string") throw new Error("Saved session must be JSON text");
      var parsed = JSON.parse(raw);
      if (isStorageObject(parsed) && typeof parsed.producerVersion === "string") producerVersion = parsed.producerVersion;
      var schema = determineStorageSchema(parsed);
      var migrated = migrateStoredSession(parsed, schema);
      validateStoredSession(migrated);
      var status = { protected: false, raw, producerVersion, legacy: schema.legacy };
      runtime.sessionStorageStatus.set(key, status);
      return restore ? Object.assign({}, status, { data: normalizeStoredSession(migrated) }) : status;
    } catch (e) {
      return protectSessionStorage(key, e.message, producerVersion);
    }
  }
  function restoreSessionState(data) {
    runtime.users = /* @__PURE__ */ new Map();
    runtime.roomTotal = 0;
    runtime.previousUserCount = 0;
    runtime.previousRoomTotal = 0;
    runtime.lastAcceptedAcquisition = null;
    runtime.newHighTiers = {};
    runtime.history = data.history;
    runtime.pendingHistoryGap = true;
    runtime.tierHighTimes = data.tierHighTimes;
    runtime.withTokensHighTime = data.withTokensHighTime;
    runtime.totalHighTime = data.totalHighTime;
    runtime.anonHighTime = data.anonHighTime;
    runtime.femaleTransHighTime = data.femaleTransHighTime;
    runtime.roomTotalHigh = data.roomTotalHigh;
    runtime.roomTotalHighTime = data.roomTotalHighTime;
    runtime.trackingStartTime = data.trackingStartTime;
    runtime.sessionStartedAt = data.sessionStartedAt;
    runtime.sessionStartEstimated = data.sessionStartEstimated;
    runtime.sessionHighs = data.sessionHighs;
    syncHighTimes();
    runtime.isPaused = data.isPaused;
    runtime.isStopped = data.isStopped;
    runtime.stoppedAt = data.stoppedAt;
    runtime.stopReason = data.stopReason;
    runtime.broadcasterAbsence = data.broadcasterAbsence;
    runtime.absencePausedAt = data.absencePausedAt;
    runtime.absenceOverrideActive = data.absenceOverrideActive;
    runtime.lastScheduledIntervalSeconds = getEffectiveScanIntervalSeconds();
    runtime.pausedElapsedTime = data.pausedElapsedTime;
    runtime.previousCounts = data.previousCounts;
    runtime.hasTrendBaseline = data.hasTrendBaseline;
    runtime.trendComparisonMode = data.trendComparisonMode;
    runtime.autoTrendEscalation = data.autoTrendEscalation;
    var snapshot = createPlaybackSnapshot(runtime.history);
    runtime.restoredDisplayFrame = getPlaybackFrame(snapshot, snapshot.durationMs);
    if (runtime.restoredDisplayFrame) {
      runtime.restoredDisplayFrame.isRestored = true;
      runtime.restoredDisplayFrame.playbackNewHighTiers = {};
      runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        var value = runtime.history[key][runtime.history[key].length - 1];
        if (value > 0 && value >= getSessionHigh(key, 0).value) runtime.restoredDisplayFrame.playbackNewHighTiers[key] = true;
      });
      runtime.restoredDisplayFrame.roomTotalHigh = Math.max(runtime.roomTotalHigh, runtime.restoredDisplayFrame.roomTotalHigh);
    }
  }
  function getStorageReportStatus(model) {
    if (!model || model === "unknown") return { producer: "Unknown (no saved session)", access: "No room" };
    var status = inspectStoredSession(model, false);
    var warnings = runtime.sessionRecordWarnings.get(getStorageKey(model)) || [];
    return {
      producer: status.producerVersion === null ? status.legacy ? "Unknown (legacy session)" : "Unknown" : status.producerVersion || "(empty string)",
      access: status.protected ? "Protected / read-only: " + status.reason : (runtime.sessionStorageNotice || (runtime.activeSessionStorageKey === getStorageKey(model) ? "Writable (separate tab record)" : "Not initialized")) + (warnings.length ? "; " + warnings.length + " skipped record(s) retained; see console" : "")
    };
  }
  function saveSession(model) {
    if (!model || model === "unknown") return;
    var key = getStorageKey(model);
    if (runtime.activeSessionStorageKey !== key || inspectStoredSession(model, false).protected) return;
    if (getRoomEpoch(key) !== runtime.activeRoomEpoch) {
      runtime.sessionStorageNotice = "Reset in another tab — local data only; export TXT/CSV before reloading";
      updateAcquisitionStatus();
      return;
    }
    runtime.STORAGE_HISTORY_SERIES.forEach(function(series) {
      if (!runtime.sessionHighs[series]) runtime.sessionHighs[series] = getSessionHigh(series, 0);
    });
    var saveData = {
      schemaVersion: runtime.STORAGE_SCHEMA_VERSION,
      producerVersion: runtime.TIERSCOPE_VERSION,
      timestamp: Date.now(),
      history: runtime.history,
      tierHighTimes: runtime.tierHighTimes,
      withTokensHighTime: runtime.withTokensHighTime,
      totalHighTime: runtime.totalHighTime,
      anonHighTime: runtime.anonHighTime,
      femaleTransHighTime: runtime.femaleTransHighTime,
      roomTotalHigh: runtime.roomTotalHigh,
      roomTotalHighTime: runtime.roomTotalHighTime,
      trackingStartTime: runtime.trackingStartTime,
      sessionStartedAt: runtime.sessionStartedAt,
      sessionStartEstimated: runtime.sessionStartEstimated,
      sessionHighs: runtime.sessionHighs,
      roomEpoch: runtime.activeRoomEpoch,
      isPaused: runtime.isPaused,
      isStopped: runtime.isStopped,
      stoppedAt: runtime.stoppedAt,
      stopReason: runtime.stopReason,
      broadcasterAbsence: runtime.broadcasterAbsence,
      absencePausedAt: runtime.absencePausedAt,
      absenceOverrideActive: runtime.absenceOverrideActive,
      pausedElapsedTime: runtime.pausedElapsedTime,
      previousCounts: runtime.previousCounts,
      hasTrendBaseline: runtime.hasTrendBaseline,
      trendComparisonMode: runtime.trendComparisonMode,
      autoTrendEscalation: runtime.autoTrendEscalation
    };
    try {
      validateStoredSession(saveData);
      var raw = JSON.stringify(saveData);
      var tabRecord = runtime.tabRecords.get(key);
      if (!tabRecord || Date.now() - tabRecord.savedAt > runtime.STORAGE_MAX_AGE_MS) {
        tabRecord = { id: makeStorageId(), savedAt: Date.now() };
      }
      GM_setValue(roomTabPrefix(key) + tabRecord.id, raw);
      tabRecord.savedAt = Date.now();
      runtime.tabRecords.set(key, tabRecord);
      runtime.sessionStorageStatus.set(key, { protected: false, raw, producerVersion: runtime.TIERSCOPE_VERSION, legacy: false });
      log("Session saved for " + model + " (storage schema " + runtime.STORAGE_SCHEMA_VERSION + ", producer " + runtime.TIERSCOPE_VERSION + ")");
    } catch (e) {
      log("Failed to save session: " + e);
    }
  }
  function loadSession(model) {
    runtime.restoredDisplayFrame = null;
    if (!model || model === "unknown") return false;
    leavePlayback(false);
    var key = getStorageKey(model);
    runtime.activeSessionStorageKey = key;
    runtime.activeRoomEpoch = getRoomEpoch(key);
    runtime.sessionStorageNotice = "";
    var allTime = readAllTimeHighs(model);
    var saved = inspectStoredSession(model, true);
    if (saved.protected || !saved.data) return false;
    var age = Date.now() - saved.data.timestamp;
    restoreSessionState(saved.data);
    if (!allTime.error && allTime.epoch === "initial" && !allTime.keys.length && saved.data.history.timestamps.length) {
      storeAllTimeHighs(model, sessionAllTimeHighs(saved.data, "saved"));
    }
    log("Session restored for " + model + " (" + Math.round(age / 6e4) + " min old; " + (saved.legacy ? "validated legacy schema 1" : "storage schema " + runtime.STORAGE_SCHEMA_VERSION) + "; producer " + (saved.producerVersion === null ? "unknown" : saved.producerVersion) + ")");
    return true;
  }
  function deleteSession(model) {
    if (!model || model === "unknown") return;
    var key = getStorageKey(model);
    try {
      runtime.activeRoomEpoch = makeStorageId();
      GM_setValue(roomEpochKey(key), runtime.activeRoomEpoch);
      GM_listValues().filter(function(candidate) {
        return candidate.indexOf(roomTabPrefix(key)) === 0;
      }).forEach(function(candidate) {
        GM_deleteValue(candidate);
      });
      GM_deleteValue(key);
      runtime.sessionStorageStatus.delete(key);
      runtime.sessionRecordWarnings.delete(key);
      runtime.sessionStorageNotice = "";
      log("Session deleted for " + model);
    } catch (e) {
      protectSessionStorage(
        key,
        "Explicit Reset could not delete saved session: " + e.message,
        (runtime.sessionStorageStatus.get(key) || {}).producerVersion
      );
      log("Reset cleared live tracking but saved storage remains protected: " + e.message);
    }
  }

  // src/reports.js
  function downloadTrackingReport() {
    var modelName = getModelName();
    var restored = runtime.restoredDisplayFrame;
    var sessionStart = runtime.sessionStartedAt !== null ? formatDateTime(runtime.sessionStartedAt) : "Not started";
    var totalTime = runtime.trackingStartTime ? formatElapsedTime(runtime.isPaused ? runtime.pausedElapsedTime : Date.now() - runtime.trackingStartTime) : "00:00:00";
    var now = Date.now();
    var storageReport = getStorageReportStatus(modelName);
    var report = [
      "================================",
      "CHATURBATE TRACKING REPORT",
      "================================",
      "",
      "Model: " + modelName,
      "Session Start: " + sessionStart + (runtime.sessionStartEstimated ? " (estimated from legacy data)" : ""),
      "Report Generated: " + formatDateTime(now),
      "TierScope Version: " + runtime.TIERSCOPE_VERSION,
      "Storage Schema Version: " + runtime.STORAGE_SCHEMA_VERSION,
      "Saved Session Producer Version: " + storageReport.producer,
      "Session Storage: " + storageReport.access,
      "Last Accepted Acquisition Source: " + (runtime.lastAcceptedAcquisition ? runtime.lastAcceptedAcquisition.source : "None"),
      "Last Accepted Sample Time: " + (runtime.lastAcceptedAcquisition ? new Date(runtime.lastAcceptedAcquisition.timestamp).toISOString() : "None"),
      "Total Tracking Time: " + totalTime,
      ""
    ];
    if (runtime.isStopped) {
      report.push("Session State: STOPPED — " + stopDescription());
      report.push("Stopped At: " + new Date(runtime.stoppedAt).toISOString());
      report.push("Displayed Data: Final retained sample; this session is closed.");
      report.push("");
    } else if (isAbsencePaused()) {
      report.push("Session State: AUTO-PAUSED — broadcaster absent");
      report.push("Auto-paused At: " + new Date(runtime.absencePausedAt).toISOString());
      report.push("Displayed Data: Last retained sample; presence checks do not record audience counts.");
      report.push(absencePauseDescription());
      report.push("");
    }
    if (runtime.absenceOverrideActive) report.push("Absence Automation: Manually overridden until the broadcaster is detected again.", "");
    if (restored) {
      report.push("Displayed Data: Last saved snapshot; no fresh sample accepted since restore.");
      report.push("Saved Snapshot Time: " + new Date(restored.timestamp).toISOString());
      report.push("");
    }
    if (runtime.lastAcceptedAcquisition && runtime.lastAcceptedAcquisition.api) {
      report.push("API Anonymous Count: " + runtime.lastAcceptedAcquisition.api.anonymousCount);
      report.push("API Registered Record Count: " + runtime.lastAcceptedAcquisition.api.registeredCount);
      report.push("API Total Users: " + runtime.lastAcceptedAcquisition.api.totalUsers);
      report.push("API Owner Record Present: " + (runtime.lastAcceptedAcquisition.api.ownerCount > 0 ? "yes" : "no"));
      report.push("Registered includes broadcaster/owner and unclassified records outside the seven viewer tiers.");
      report.push("");
    }
    report.push("--- SESSION HIGHS ---");
    report.push("Offsets below are wall time since session start, including pauses.");
    if (runtime.sessionStartEstimated) report.push("Legacy tier highs were recovered from retained samples; older discarded peaks are unavailable.");
    report.push("");
    if (runtime.roomTotalHigh > 0 && runtime.roomTotalHighTime) {
      var elapsed = formatElapsedTime(runtime.roomTotalHighTime - runtime.sessionStartedAt);
      report.push("Room Total High: " + runtime.roomTotalHigh.toLocaleString() + " users");
      report.push("  Recorded at: " + formatDateTime(runtime.roomTotalHighTime) + " (" + elapsed + " into session)");
      report.push("");
    }
    Object.keys(runtime.TIERS).forEach(function(tier) {
      var highResult = getSessionHigh(tier, 0);
      var highVal = highResult.value;
      var highTime = runtime.tierHighTimes[tier];
      if (highVal > 0 && highTime) {
        var elapsed2 = formatElapsedTime(highTime - runtime.sessionStartedAt);
        report.push(runtime.TIERS[tier].name + " High: " + highVal.toLocaleString());
        report.push("  Recorded at: " + formatDateTime(highTime) + " (" + elapsed2 + " into session)");
        report.push("");
      }
    });
    var withTokensResult = getSessionHigh("withTokens", 0);
    var withTokensHigh = withTokensResult.value;
    if (withTokensHigh > 0 && runtime.withTokensHighTime) {
      var elapsed = formatElapsedTime(runtime.withTokensHighTime - runtime.sessionStartedAt);
      report.push("With Tokens High: " + withTokensHigh.toLocaleString());
      report.push("  Recorded at: " + formatDateTime(runtime.withTokensHighTime) + " (" + elapsed + " into session)");
      report.push("");
    }
    var totalResult = getSessionHigh("total", 0);
    var totalHigh = totalResult.value;
    if (totalHigh > 0 && runtime.totalHighTime) {
      var elapsed = formatElapsedTime(runtime.totalHighTime - runtime.sessionStartedAt);
      report.push("Registered Users High: " + totalHigh.toLocaleString());
      report.push("  Recorded at: " + formatDateTime(runtime.totalHighTime) + " (" + elapsed + " into session)");
      report.push("");
    }
    var anonResult = getSessionHigh("anonymous", 0);
    var anonHigh = anonResult.value;
    if (anonHigh > 0 && runtime.anonHighTime) {
      var elapsed = formatElapsedTime(runtime.anonHighTime - runtime.sessionStartedAt);
      report.push("Anonymous High: " + anonHigh.toLocaleString());
      report.push("  Recorded at: " + formatDateTime(runtime.anonHighTime) + " (" + elapsed + " into session)");
      report.push("");
    }
    report.push(runtime.isStopped ? "--- STOPPED SESSION STATS (NOT A LIVE SAMPLE) ---" : isAbsencePaused() ? "--- AUTO-PAUSED STATS (NOT A LIVE SAMPLE) ---" : restored ? "--- LAST SAVED STATS (NOT A LIVE SAMPLE) ---" : "--- CURRENT STATS ---");
    report.push("");
    var counts = { "red": 0, "green": 0, "purple": 0, "pink": 0, "dark-blue": 0, "light-blue": 0, "gray": 0, "female-trans": 0 };
    runtime.users.forEach(function(data) {
      if (counts[data.tier] !== void 0) counts[data.tier]++;
      if (data.gender === "female" || data.gender === "trans") {
        counts["female-trans"]++;
      }
    });
    var total = runtime.users.size;
    var withTokens = counts["red"] + counts["green"] + counts["purple"] + counts["pink"] + counts["dark-blue"] + counts["light-blue"];
    var anonymousCount = getAnonymousCount();
    var fullRoomTotal = runtime.roomTotal > total ? runtime.roomTotal : total + anonymousCount;
    if (restored) {
      counts = restored.counts;
      total = restored.total;
      withTokens = restored.withTokens;
      anonymousCount = restored.anonymousCount;
      fullRoomTotal = restored.fullRoomTotal;
    }
    var totalHighCurrent = getSessionHigh("total", total).value;
    var withTokensHighCurrent = getSessionHigh("withTokens", withTokens).value;
    var anonHighCurrent = getSessionHigh("anonymous", anonymousCount).value;
    var statsLabel = runtime.isStopped ? "Final " : restored ? "Saved " : "Current ";
    var reportedRoomHigh = restored ? restored.roomTotalHigh : runtime.roomTotalHigh;
    report.push(statsLabel + "Room Total: " + fullRoomTotal.toLocaleString() + " (High: " + reportedRoomHigh.toLocaleString() + ")");
    report.push(statsLabel + "Registered: " + total.toLocaleString() + " (High: " + totalHighCurrent.toLocaleString() + ")");
    report.push(statsLabel + "With Tokens: " + withTokens.toLocaleString() + " (High: " + withTokensHighCurrent.toLocaleString() + ")");
    report.push(statsLabel + "Anonymous: " + anonymousCount.toLocaleString() + " (High: " + anonHighCurrent.toLocaleString() + ")");
    report.push("");
    report.push(restored ? "--- SAVED TIER BREAKDOWN ---" : "--- TIER BREAKDOWN ---");
    report.push("");
    Object.keys(runtime.TIERS).forEach(function(tier) {
      var current = counts[tier] || 0;
      var high = getSessionHigh(tier, current).value;
      report.push(runtime.TIERS[tier].name + ": " + current.toLocaleString() + " (High: " + high.toLocaleString() + ")");
    });
    report.push("");
    report.push("================================");
    report.push("End of Report");
    report.push("================================");
    var date = /* @__PURE__ */ new Date();
    var dateStr = date.toISOString().slice(0, 10);
    var timeStr = date.getHours().toString().padStart(2, "0") + "-" + date.getMinutes().toString().padStart(2, "0") + "-" + date.getSeconds().toString().padStart(2, "0");
    var filename = modelName + "-tracking-report-" + dateStr + "-" + timeStr + ".txt";
    var blob = new Blob([report.join("\n")], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function downloadTrackingCSV() {
    if (!runtime.history.timestamps.length) {
      alert("No recorded history to export yet.");
      return;
    }
    var model = getModelName();
    function cell(value) {
      var text = String(value);
      if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }
    var rows = [[
      "room",
      "sample_index",
      "timestamp_utc",
      "elapsed_seconds",
      "room_total",
      "registered",
      "anonymous",
      "with_tokens",
      "moderators",
      "fan_club",
      "dark_purple",
      "light_purple",
      "dark_blue",
      "light_blue",
      "grey",
      "female_trans"
    ]];
    runtime.history.timestamps.forEach(function(timestamp, i) {
      rows.push([
        model,
        i + 1,
        new Date(timestamp).toISOString(),
        Math.max(0, timestamp - runtime.history.timestamps[0]) / 1e3,
        runtime.history.total[i] + runtime.history.anonymous[i],
        runtime.history.total[i],
        runtime.history.anonymous[i],
        runtime.history.withTokens[i],
        runtime.history.red[i],
        runtime.history.green[i],
        runtime.history.purple[i],
        runtime.history.pink[i],
        runtime.history["dark-blue"][i],
        runtime.history["light-blue"][i],
        runtime.history.gray[i],
        runtime.history["female-trans"][i]
      ]);
    });
    var blob = new Blob(
      ["\uFEFF" + rows.map(function(row) {
        return row.map(cell).join(",");
      }).join("\r\n") + "\r\n"],
      { type: "text/csv;charset=utf-8" }
    );
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = model.replace(/[^a-z0-9_-]/gi, "_") + "-history-" + (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-") + ".csv";
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 6e4);
    }
  }

  // src/theme.js
  function themeColor(token) {
    return runtime.PANEL_THEME_COLORS[token][runtime.isDarkMode ? 0 : 1];
  }
  function setThemeVariables(element) {
    if (!element) return;
    Object.keys(runtime.PANEL_THEME_COLORS).forEach(function(token) {
      element.style.setProperty("--panel-" + token, themeColor(token));
    });
    element.style.colorScheme = runtime.isDarkMode ? "dark" : "light";
  }
  function applyPanelTheme(redraw) {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    setThemeVariables(container);
    container.setAttribute("data-theme", runtime.isDarkMode ? "dark" : "bright");
    setThemeVariables(document.getElementById("tierscope-chart-tooltip"));
    var toggle = document.getElementById("dark-mode-toggle");
    if (toggle) toggle.checked = runtime.isDarkMode;
    var control = document.getElementById("dark-mode-control");
    if (control) control.title = runtime.isDarkMode ? "Dark mode on — switch to bright mode" : "Bright mode on — switch to dark mode";
    updateContainerOpacity(runtime.panelBackgroundPercent);
    if (redraw) {
      hideChartTooltip();
      updateDisplay();
      redrawPanelCharts();
    }
  }
  function updateContainerOpacity(value) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    runtime.panelBackgroundPercent = Math.max(30, Math.min(100, numeric));
    var container = document.getElementById("tracker-container");
    if (!container) return;
    container.style.backgroundColor = "rgba(" + themeColor("rgb") + "," + runtime.panelBackgroundPercent / 100 + ")";
    container.style.setProperty("--tier-background-scale", String(runtime.panelBackgroundPercent / 95));
    var slider = document.getElementById("opacity-slider");
    if (slider) {
      slider.value = String(runtime.panelBackgroundPercent);
      slider.setAttribute("aria-valuetext", runtime.panelBackgroundPercent + "% background opacity");
    }
    var label = document.getElementById("opacity-value");
    if (label) label.textContent = runtime.panelBackgroundPercent + "%";
  }

  // src/panel.js
  function createPanel() {
    if (runtime.panelOptionsCleanup) {
      runtime.panelOptionsCleanup();
      runtime.panelOptionsCleanup = null;
    }
    hideChartTooltip();
    cancelGifExport();
    leavePlayback(false);
    cleanupDragListeners();
    if (runtime.miniSettingsKeyHandler) {
      document.removeEventListener("keydown", runtime.miniSettingsKeyHandler, true);
      runtime.miniSettingsKeyHandler = null;
    }
    if (runtime.windowResizeHandler) {
      window.removeEventListener("resize", runtime.windowResizeHandler);
      runtime.windowResizeHandler = null;
    }
    if (window._trackerResizeCleanup) {
      window._trackerResizeCleanup();
      window._trackerResizeCleanup = null;
    }
    var existing = document.getElementById("cb-tier-tracker");
    if (existing) existing.remove();
    var div = document.createElement("div");
    div.id = "cb-tier-tracker";
    var html = '<div id="tracker-container" style="position:fixed;top:80px;right:20px;background:rgba(20,20,30,0.95);color:var(--panel-text);padding:5px;border-radius:6px;font-family:Arial,sans-serif;font-size:9px;z-index:999999;width:' + runtime.BASE_WIDTH_MINI + 'px;border:1px solid #ff69b4;transition:width 0.3s ease;cursor:default;user-select:none;"><div id="drag-handle" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;border-bottom:1px solid #ff69b4;padding-bottom:3px;cursor:move;"><span id="header-text" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold;color:var(--panel-accent);font-size:10px;">USERS: 0 (SH:0)</span><span id="mini-room-change" style="font-size:8px;margin:0 3px;display:none;"></span><div style="display:flex;align-items:center;gap:3px;flex-shrink:0;"><button type="button" id="btn-high-mode" aria-pressed="false" aria-label="Session highs. Switch to all-time highs" style="display:none;min-width:29px;background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;">SH</button><button type="button" id="btn-panel-options" aria-label="Chart window and session files" aria-expanded="false" aria-controls="panel-options" style="display:none;background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;white-space:nowrap;">Full ▾</button><button type="button" id="btn-standard-size" title="Restore standard panel size (100%)" aria-label="Restore standard panel size" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;">100%</button><button id="btn-toggle" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:9px;padding:1px 4px;flex-shrink:0;">+</button></div></div><div id="panel-options" role="group" aria-label="Chart and session options" style="display:none;position:absolute;right:5px;top:29px;width:190px;max-width:calc(100% - 10px);box-sizing:border-box;z-index:5;padding:8px;background:var(--panel-solid);color:var(--panel-text);border:1px solid #ff69b4;border-radius:4px;font-size:11px;box-shadow:0 3px 12px #0008;"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;"><strong>Charts &amp; sessions</strong><button type="button" id="panel-options-close" aria-label="Close chart and session options" style="background:var(--panel-button);color:var(--panel-text);border:0;border-radius:3px;cursor:pointer;">×</button></div><label for="chart-window-select">Chart window</label><select id="chart-window-select" style="display:block;width:100%;margin:4px 0 6px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);font-size:11px;"><option value="full">Full history</option><option value="fourHours">Last 4 hours</option><option value="twoHours">Last 2 hours</option><option value="hour">Last hour</option><option value="halfHour">Last 30 minutes</option><option value="quarter">Last 15 minutes</option></select><div style="font-size:10px;color:var(--panel-muted);line-height:1.4;margin-bottom:8px;">Charts only. Downloads keep the full retained history.</div><button type="button" id="btn-save-session" style="display:block;width:100%;margin:4px 0;padding:4px;background:#4169E1;color:#fff;border:0;border-radius:3px;cursor:pointer;">Save session file</button><button type="button" id="btn-open-session" style="display:block;width:100%;margin:4px 0;padding:4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;">Open session file…</button><input type="file" id="session-file-input" accept=".json,application/json" style="display:none;"><div id="session-file-info" style="display:none;margin-top:7px;font-size:10px;line-height:1.4;white-space:pre-line;overflow-wrap:anywhere;color:var(--panel-secondary);"></div><div style="border-top:1px solid var(--panel-divider);margin-top:8px;padding-top:6px;"><strong>All-time highs</strong><div id="all-time-info" style="font-size:10px;line-height:1.4;margin:4px 0;color:var(--panel-secondary);"></div><button type="button" id="btn-add-all-time" style="display:none;width:100%;margin:4px 0;padding:4px;background:#4169E1;color:#fff;border:0;border-radius:3px;cursor:pointer;">Add to all-time highs</button><button type="button" id="btn-clear-all-time" style="display:block;width:100%;margin:4px 0;padding:4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;">Clear all-time highs…</button><div id="all-time-action-status" role="status" style="font-size:10px;line-height:1.4;overflow-wrap:anywhere;color:var(--panel-secondary);"></div></div></div><div id="minimized-view" style="display:block;position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;gap:3px;"><button type="button" id="mini-metric" style="background:transparent;border:0;color:var(--panel-secondary);font:inherit;cursor:pointer;padding:2px 0;" aria-label="Cycle chart metric">Room total ▾</button><button type="button" id="mini-high" style="background:transparent;border:0;padding:0;color:var(--panel-subtle);font-size:8px;cursor:pointer;"></button></div><canvas id="mini-chart" width="140" height="36" style="display:block;width:100%;height:36px;" role="img" aria-label="Recent audience history"></canvas><div style="display:flex;justify-content:space-between;gap:4px;margin:3px 0;"><span title="With Tokens">💎 <span id="mini-withtokens">0</span> <span id="mini-withtokens-change"></span></span><span title="Registered">📊 <span id="mini-total">0</span> <span id="mini-total-change"></span></span></div><div style="display:flex;align-items:center;gap:3px;"><span id="mini-freshness" style="flex:1;min-width:0;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">No sample</span><button type="button" id="btn-auto" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" title="Pause or resume scans">⏸</button><button type="button" id="mini-settings-toggle" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" aria-label="Scan interval settings" title="Scan interval settings — adjust how often TierScope scans" aria-expanded="false" aria-controls="mini-settings">◷</button><button type="button" id="btn-expand" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;font-size:9px;cursor:pointer;" title="Expand panel" aria-label="Expand panel">↗</button></div><div id="mini-settings" style="display:none;position:absolute;left:0;right:0;top:17px;background:var(--panel-settings);border:1px solid #ff69b4;border-radius:4px;padding:5px;z-index:2;" role="group" aria-label="Scan interval"><div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--panel-secondary);">Scan interval <button type="button" id="mini-settings-close" aria-label="Close scan interval settings" title="Close (Escape)" style="background:var(--panel-button);color:var(--panel-text);border:0;border-radius:3px;cursor:pointer;padding:1px 5px;font-size:13px;">×</button></div><div style="display:flex;align-items:center;justify-content:center;gap:3px;margin:3px 0;padding:2px;background:rgba(var(--panel-row-rgb),0.05);border-radius:3px;"><button id="btn-timer-down" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">−</button><span id="timer-display" style="font-size:11px;color:var(--panel-warning);font-weight:bold;min-width:28px;">60s</span><button id="btn-timer-up" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">+</button></div><div style="display:flex;gap:2px;justify-content:center;margin-top:3px;"><button class="timer-preset" data-time="30" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">30s</button><button class="timer-preset" data-time="60" style="background:#ff69b4;border:1px solid #ff69b4;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">60s</button><button class="timer-preset" data-time="120" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">2m</button><button class="timer-preset" data-time="300" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">5m</button></div><div id="auto-status" style="margin-top:3px;font-size:8px;color:var(--panel-muted);">Starting...</div></div></div><div id="full-view" style="display:none;"><div id="tier-chart-region" style="display:flow-root;">' + collapsedTrayHtml();
    Object.keys(runtime.TIERS).forEach(function(key) {
      var t = runtime.TIERS[key];
      html += '<div id="tier-row-' + key + '" data-tier="' + key + '" style="display:flex;align-items:center;padding:1px 3px;margin:1px 0;background:rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)));border-radius:3px;border-left:3px solid ' + t.color + ';"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml(key) + '</div><canvas id="spark-' + key + '" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-' + key + '" style="font-weight:bold;color:' + t.color + ';font-size:14px;">0</span><div id="high-' + key + '" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div>';
    });
    html += '<div id="summary-tier-rows" style="border-top:1px solid var(--panel-divider);margin-top:4px;padding-top:4px;"><div id="tier-row-withtokens" data-tier="withtokens" style="display:flex;align-items:center;padding:2px 3px;background:rgba(255,105,180,0.15);border-radius:3px;border:1px solid #ff69b4;margin-bottom:3px;"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("withtokens") + '</div><canvas id="spark-withtokens" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-withtokens" style="font-weight:bold;color:#ff69b4;font-size:14px;">0</span><span id="pct-withtokens" style="font-size:8px;color:#ff69b4;margin-left:2px;">0%</span><div id="high-withtokens" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div><div id="tier-row-total" data-tier="total" style="display:flex;align-items:center;padding:2px 3px;background:rgba(var(--panel-row-rgb),0.1);border-radius:3px;"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("total") + '</div><canvas id="spark-total" width="105" height="28" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="count-total" style="font-weight:bold;color:var(--panel-text);font-size:14px;">0</span><div id="high-total" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div></div><div id="tier-row-anon" data-tier="anonymous" style="margin-top:5px;padding:5px;background:rgba(136,136,136,0.15);border-radius:3px;border:1px solid #888;"><div style="display:flex;align-items:center;"><div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml("anon") + `</div><canvas id="spark-anon" width="105" height="50" style="flex:1;margin:0 4px;"></canvas><div style="text-align:right;width:48px;flex-shrink:0;"><span id="anon-ratio-full" style="font-size:13px;font-weight:bold;color:#ff69b4;">--</span><div id="high-anon" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div></div></div></div></div><div id="trend-section" style="position:relative;border-top:1px solid #4169E1;margin-top:5px;padding-top:5px;"><div id="live-trend"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;flex-wrap:wrap;gap:2px;"><span id="trend-header-label" style="font-size:9px;font-weight:bold;color:#4169E1;">📈 TREND</span><div style="display:flex;gap:2px;flex-wrap:wrap;"><button class="trend-preset-btn" data-mode="last" style="background:#4169E1;border:1px solid #4169E1;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Last</button><button class="trend-preset-btn" data-mode="5min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">5m</button><button class="trend-preset-btn" data-mode="15min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">15m</button><button class="trend-preset-btn" data-mode="30min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">30m</button><button class="trend-preset-btn" data-mode="1hour" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">1h</button><button class="trend-preset-btn" data-mode="start" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Start</button><button id="btn-trend-auto" style="background:#32CD32;border:1px solid #32CD32;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;" title="Auto-escalation ON - Click to disable">AUTO</button></div></div><div id="trend-container" style="min-height:30px;"><div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div></div></div><div id="playback-controls" style="display:none;position:absolute;top:5px;left:0;right:0;bottom:0;padding:0 2px;box-sizing:border-box;grid-template-rows:minmax(14px,1fr) 14px 12px;gap:2px;" aria-label="Playback controls"><div id="gif-export-controls" style="display:none;position:absolute;inset:0;z-index:1;align-items:center;justify-content:center;gap:5px;background:var(--panel-solid);border-radius:3px;padding:3px;"><span id="gif-export-status" role="status" style="font-size:8px;color:var(--panel-secondary);overflow-wrap:anywhere;"></span><button id="btn-cancel-gif" hidden style="font-size:8px;cursor:pointer;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;">Cancel</button></div><div style="display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0;"><div id="playback-file-controls" style="display:none;align-items:center;gap:4px;min-width:0;"><div id="playback-room" style="display:none;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:12px;font-weight:bold;color:var(--panel-text);"></div><button type="button" id="btn-playback-add-all-time" aria-live="polite" title="Add this file's highs to the room named beside this button" style="display:none;flex-shrink:0;min-width:88px;font-size:8px;line-height:12px;margin:0;padding:0 4px;white-space:nowrap;background:#4169E1;color:#fff;border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Add to all-time highs</button></div><div style="display:flex;align-items:center;justify-content:space-between;gap:3px;"><strong id="playback-label" style="font-size:9px;color:var(--panel-warning);">PLAYBACK</strong><button id="playback-play" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:#4169E1;color:white;border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Pause</button><select id="playback-speed" aria-label="Playback speed" style="font-size:8px;height:15px;margin:0;padding:0;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><button id="btn-export-gif" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:#ff69b4;color:white;border:1px solid #ff69b4;border-radius:2px;cursor:pointer;" title="Download this Replay as a ` + runtime.GIF_WIDTH + " × " + runtime.GIF_HEIGHT + ' GIF">GIF</button><button id="playback-return" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Return to Live</button></div></div><div style="display:flex;align-items:center;gap:4px;min-width:0;"><button type="button" id="playback-previous" title="Previous recorded sample (pauses Replay)" aria-label="Previous recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">|&#9664;</button><input id="playback-scrubber" type="range" min="0" max="0" value="0" step="any" aria-label="Playback timeline" style="flex:1;min-width:0;width:100%;height:12px;margin:0;accent-color:var(--panel-warning);cursor:pointer;"><button type="button" id="playback-next" title="Next recorded sample (pauses Replay)" aria-label="Next recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">&#9654;|</button></div><div id="playback-file-actions" style="display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:4px;min-width:0;"><div id="playback-position" style="grid-column:2;font-size:9px;line-height:12px;text-align:center;white-space:nowrap;color:var(--panel-secondary);font-family:monospace;">00:00:00 / 00:00:00</div><div style="grid-column:3;justify-self:end;display:flex;gap:2px;"><button type="button" id="btn-playback-save-session" aria-label="Save replay session file" title="Save the full session being replayed" style="font-size:8px;line-height:10px;height:12px;box-sizing:border-box;margin:0;padding:0 4px;background:#4169E1;color:#fff;border:1px solid #4169E1;border-radius:2px;cursor:pointer;">Save</button><button type="button" id="btn-playback-open-session" aria-label="Open session file in replay" title="Open another saved session in FILE REPLAY" style="font-size:8px;line-height:10px;height:12px;box-sizing:border-box;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Open</button></div></div></div></div><div id="control-field" style="margin-top:5px;padding:4px;background:rgba(65,105,225,0.15);border-radius:3px;border:1px solid #4169E1;"><div id="control-session-row" style="display:flex;justify-content:space-between;align-items:center;gap:3px;margin-bottom:4px;white-space:nowrap;"><span style="font-size:9px;font-weight:bold;color:#4169E1;">🎛️ CONTROLS</span><div id="control-session-buttons" style="display:flex;gap:2px;align-items:center;"><button id="btn-replay" style="font-size:8px;line-height:11px;height:13px;box-sizing:border-box;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-warning);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;" title="Replay recorded history">Replay</button><button type="button" id="btn-control-save-session" aria-label="Save session file" title="Save this session as a file to replay later" style="font-size:8px;line-height:11px;height:13px;box-sizing:border-box;margin:0;padding:0 4px;background:#4169E1;color:white;border:1px solid #4169E1;border-radius:2px;cursor:pointer;">Save</button><button type="button" id="btn-control-open-session" aria-label="Open session file" title="Open a saved session in FILE REPLAY" style="font-size:8px;line-height:11px;height:13px;box-sizing:border-box;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Open</button></div><span style="font-size:11px;color:var(--panel-positive);font-weight:bold;" id="control-next-scan">Next: 60s</span></div><div id="control-action-row" style="display:grid;grid-template-columns:minmax(max-content,1fr) auto minmax(0,1fr);align-items:center;gap:3px;"><span style="font-size:12px;color:var(--panel-warning);font-family:monospace;font-weight:bold;flex-shrink:0;" id="control-tracking-timer">00:00:00</span><div id="control-action-buttons" style="display:flex;gap:2px;align-items:center;"><button id="btn-download-report" style="background:#4169E1;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;display:flex;align-items:center;gap:2px;" title="Download tracking report"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="4" x2="12" y2="16"/><polyline points="6 10 12 16 18 10"/><line x1="4" y1="20" x2="20" y2="20"/></svg>TXT</button><button id="btn-download-csv" style="background:#4169E1;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;display:flex;align-items:center;gap:2px;" title="Download all retained history as CSV"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="4" x2="12" y2="16"/><polyline points="6 10 12 16 18 10"/><line x1="4" y1="20" x2="20" y2="20"/></svg>CSV</button><button id="btn-control-auto" style="background:#32CD32;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 4px;min-width:24px;" title="Auto-Refresh ON">⏸</button><button type="button" id="btn-control-stop" aria-label="Stop this session" title="Stop this session and freeze its history and elapsed time" style="background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;white-space:nowrap;">■ Stop</button><button id="btn-main-reset" style="background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;display:flex;align-items:center;gap:2px;" title="Reset all tracking data"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/></svg>Reset</button></div><label id="dark-mode-control" style="justify-self:end;display:inline-flex;align-items:center;gap:2px;cursor:pointer;color:var(--panel-secondary);line-height:1;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/></svg><input type="checkbox" id="dark-mode-toggle" checked aria-label="Dark mode" style="appearance:auto;width:12px;height:12px;margin:0;cursor:pointer;accent-color:#4169E1;"></label></div></div><div id="tracker-footer" style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:4px;margin-top:5px;min-height:14px;"><div id="acquisition-status" style="max-width:80px;font-size:7px;color:var(--panel-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="No accepted sample yet">No sample</div><div id="background-slider-controls" style="display:flex;align-items:center;gap:3px;min-width:0;"><svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--panel-warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0;"><path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z"/></svg><input type="range" id="opacity-slider" min="30" max="100" value="95" aria-label="Background opacity" style="flex:1;min-width:0;width:100%;height:12px;margin:0;cursor:pointer;accent-color:#ff69b4;" title="Main and standard tier background opacity"><span id="opacity-value" style="font-size:8px;color:var(--panel-secondary);min-width:23px;">95%</span></div><div id="tierscope-logo" style="justify-self:end;display:flex;align-items:center;gap:3px;white-space:nowrap;opacity:0.6;transition:opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.6"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ff69b4" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg><span title="TierScope ' + runtime.TIERSCOPE_VERSION + `" style="font-size:7px;font-family:'Courier New',monospace;font-weight:bold;color:var(--panel-accent);letter-spacing:1px;">TIERSCOPE</span></div></div></div>`;
    div.innerHTML = html;
    document.body.appendChild(div);
    applyPanelTheme(false);
    document.getElementById("dark-mode-toggle").addEventListener("change", function() {
      runtime.isDarkMode = this.checked;
      try {
        GM_setValue(runtime.PANEL_THEME_KEY, runtime.isDarkMode ? "dark" : "bright");
      } catch (error) {
        log("Could not save theme preference");
      }
      applyPanelTheme(true);
    });
    var standardSize = document.getElementById("btn-standard-size");
    if (standardSize) {
      standardSize.onmousedown = function(event) {
        event.stopPropagation();
      };
      standardSize.onclick = function(event) {
        event.stopPropagation();
        restoreStandardSize();
      };
    }
    var btnCSV = document.getElementById("btn-download-csv");
    if (btnCSV) btnCSV.onclick = downloadTrackingCSV;
    var btnDownload = document.getElementById("btn-download-report");
    var btnMainReset = document.getElementById("btn-main-reset");
    var btnControlAuto = document.getElementById("btn-control-auto");
    var btnExportGif = document.getElementById("btn-export-gif");
    var opacitySlider = document.getElementById("opacity-slider");
    if (btnDownload) btnDownload.addEventListener("click", downloadTrackingReport);
    if (btnMainReset) btnMainReset.addEventListener("click", resetAllTracking);
    if (btnControlAuto) btnControlAuto.addEventListener("click", toggleAutoRefresh);
    document.getElementById("btn-control-stop").onclick = function() {
      if (runtime.isStopped) return;
      if (!confirm("Stop this session?\n\nHistory will remain available for Replay and downloads, but this session cannot be resumed. Starting again begins a new session.")) return;
      stopTracking("manual");
    };
    if (btnExportGif) btnExportGif.addEventListener("click", generateGifFromHistory);
    document.getElementById("btn-cancel-gif").onclick = cancelGifExport;
    updateContainerOpacity(runtime.panelBackgroundPercent);
    if (opacitySlider) {
      opacitySlider.addEventListener("input", function() {
        updateContainerOpacity(this.value);
      });
    }
    bindPanelOptions();
    bindPlaybackControls();
    bindRowControls();
    updateReplayAvailability();
    setupDraggable();
    setupResizable();
    setupResizeHandler();
    var btnToggle = document.getElementById("btn-toggle");
    var btnExpand = document.getElementById("btn-expand");
    var btnAuto = document.getElementById("btn-auto");
    var btnTimerDown = document.getElementById("btn-timer-down");
    var btnTimerUp = document.getElementById("btn-timer-up");
    var miniMetricButton = document.getElementById("mini-metric");
    if (miniMetricButton) miniMetricButton.onclick = function() {
      runtime.miniMetric = runtime.MINI_METRICS[(runtime.MINI_METRICS.indexOf(runtime.miniMetric) + 1) % runtime.MINI_METRICS.length];
      try {
        GM_setValue(runtime.MINI_METRIC_KEY, runtime.miniMetric);
      } catch (error) {
        log("Could not save compact chart preference");
      }
      updateDisplay();
    };
    var miniSettingsButton = document.getElementById("mini-settings-toggle");
    var miniSettings = document.getElementById("mini-settings");
    if (miniSettingsButton && miniSettings) {
      let closeMiniSettings = function() {
        miniSettings.style.display = "none";
        miniSettingsButton.setAttribute("aria-expanded", "false");
        miniSettingsButton.focus();
      };
      var miniSettingsClose = document.getElementById("mini-settings-close");
      if (miniSettingsClose) miniSettingsClose.onclick = closeMiniSettings;
      miniSettingsButton.onclick = function() {
        if (miniSettings.style.display !== "none") {
          closeMiniSettings();
          return;
        }
        miniSettings.style.display = "block";
        miniSettingsButton.setAttribute("aria-expanded", "true");
        if (miniSettingsClose) miniSettingsClose.focus();
      };
      runtime.miniSettingsKeyHandler = function(event) {
        if (event.key === "Escape" && miniSettings.style.display !== "none") {
          event.preventDefault();
          event.stopPropagation();
          closeMiniSettings();
        }
      };
      document.addEventListener("keydown", runtime.miniSettingsKeyHandler, true);
    }
    if (btnToggle) btnToggle.onclick = toggleView;
    if (btnExpand) btnExpand.onclick = toggleView;
    if (btnAuto) btnAuto.onclick = toggleAutoRefresh;
    if (btnTimerDown) btnTimerDown.onclick = function() {
      adjustTimer(-10);
    };
    if (btnTimerUp) btnTimerUp.onclick = function() {
      adjustTimer(10);
    };
    var presetBtns = document.querySelectorAll(".timer-preset");
    for (var i = 0; i < presetBtns.length; i++) {
      presetBtns[i].onclick = function() {
        var time = parseInt(this.dataset.time);
        runtime.scanIntervalSeconds = time;
        if (runtime.isAutoRefreshOn) {
          stopCountdown();
          resetCountdown();
          startCountdown();
        } else {
          resetCountdown();
        }
        updateCountdownDisplay();
        var allPresets = document.querySelectorAll(".timer-preset");
        for (var j = 0; j < allPresets.length; j++) {
          allPresets[j].style.background = "var(--panel-button)";
          allPresets[j].style.color = "var(--panel-muted)";
          allPresets[j].style.borderColor = "var(--panel-divider)";
        }
        this.style.background = "#ff69b4";
        this.style.color = "#fff";
        this.style.borderColor = "#ff69b4";
      };
    }
    var trendPresetBtns = document.querySelectorAll(".trend-preset-btn");
    for (var k = 0; k < trendPresetBtns.length; k++) {
      trendPresetBtns[k].onclick = function() {
        runtime.autoTrendEscalation = false;
        updateAutoTrendButton();
        var mode = this.dataset.mode;
        setTrendComparisonMode(mode);
      };
    }
    var btnTrendAuto = document.getElementById("btn-trend-auto");
    if (btnTrendAuto) {
      btnTrendAuto.onclick = toggleAutoTrendEscalation;
    }
    updateTrendPresetButtons();
    updateAutoTrendButton();
    updateStopControls();
  }
  function updateDisplay() {
    updateReplayAvailability();
    if (runtime.restoredDisplayFrame) {
      if (runtime.presentationMode !== "PLAYBACK") renderDisplayFrame(runtime.restoredDisplayFrame);
      return;
    }
    var counts = { "red": 0, "green": 0, "purple": 0, "pink": 0, "dark-blue": 0, "light-blue": 0, "gray": 0, "female-trans": 0 };
    runtime.users.forEach(function(data) {
      if (counts[data.tier] !== void 0) counts[data.tier]++;
      if (data.gender === "female" || data.gender === "trans") {
        counts["female-trans"]++;
      }
    });
    var total = runtime.users.size;
    var withTokens = counts["red"] + counts["green"] + counts["purple"] + counts["pink"] + counts["dark-blue"] + counts["light-blue"];
    var anonymousCount = getAnonymousCount();
    var fullRoomTotal = runtime.roomTotal > total ? runtime.roomTotal : total + anonymousCount;
    if (fullRoomTotal > runtime.roomTotalHigh) {
      runtime.roomTotalHigh = fullRoomTotal;
      runtime.roomTotalHighTime = Date.now();
    }
    if (runtime.presentationMode === "PLAYBACK") return;
    renderDisplayFrame({
      counts,
      total,
      withTokens,
      anonymousCount,
      fullRoomTotal,
      roomTotalHigh: runtime.roomTotalHigh,
      history: runtime.history,
      isPlayback: false
    });
  }
  function renderDisplayFrame(frame) {
    updatePanelOptions();
    var counts = frame.counts;
    var total = frame.total;
    var withTokens = frame.withTokens;
    var anonymousCount = frame.anonymousCount;
    var fullRoomTotal = frame.fullRoomTotal;
    var roomTotalHigh = frame.roomTotalHigh;
    var displayHistory = frame.history;
    var highlights = frame.isPlayback || frame.isRestored ? frame.playbackNewHighTiers : runtime.newHighTiers;
    if (runtime.highMode === "ath") {
      highlights = {};
      runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        var value = key === "withTokens" ? withTokens : key === "total" ? total : key === "anonymous" ? anonymousCount : counts[key];
        var high = getDisplayHigh(frame, key, value);
        if (high.source && value > 0 && value >= high.value) highlights[key] = true;
      });
    }
    updateCollapsedRowStatus(frame, highlights);
    var withTokensPct = total > 0 ? Math.round(withTokens / total * 100) + "%" : "0%";
    var registeredPct = fullRoomTotal > 0 ? Math.round(total / fullRoomTotal * 100) + "%" : "0%";
    var headerText = document.getElementById("header-text");
    if (headerText) {
      var roomHigh = getDisplayHigh(frame, "roomTotal", fullRoomTotal);
      var displayedRoomHigh = highLabel(roomHigh);
      headerText.title = (frame.isPlayback && runtime.playback && runtime.playback.archive ? "Replay: " + runtime.playback.archive.room + " · " : "") + "Room total: " + fullRoomTotal.toLocaleString() + " · " + highDescription(roomHigh);
      if (runtime.isStopped && !frame.isPlayback) {
        headerText.textContent = "STOPPED: " + fullRoomTotal.toLocaleString() + " (" + displayedRoomHigh + ")";
      } else if (runtime.isMinimized) {
        headerText.textContent = (frame.isPlayback ? "PLAYBACK: " : frame.isRestored ? "SAVED: " : "") + fullRoomTotal.toLocaleString() + " (" + displayedRoomHigh + ")";
      } else {
        headerText.textContent = (frame.isPlayback ? runtime.playback && runtime.playback.imported ? "FILE: " : "PLAYBACK: " : frame.isRestored ? "SAVED: " : "USERS: ") + fullRoomTotal.toLocaleString() + " (" + displayedRoomHigh + ")";
      }
    }
    var miniWithTokens = document.getElementById("mini-withtokens");
    var miniWithTokensPct = document.getElementById("mini-withtokens-pct");
    var miniTotal = document.getElementById("mini-total");
    var miniTotalPct = document.getElementById("mini-total-pct");
    if (miniWithTokens) miniWithTokens.textContent = withTokens;
    if (miniWithTokensPct) miniWithTokensPct.textContent = withTokensPct;
    if (miniTotal) miniTotal.textContent = total;
    if (miniTotalPct) miniTotalPct.textContent = registeredPct;
    var miniChange = document.getElementById("mini-room-change");
    if (miniChange) miniChange.style.display = runtime.isMinimized ? "inline" : "none";
    if (miniWithTokens) miniWithTokens.parentElement && (miniWithTokens.parentElement.title = "With Tokens: " + withTokens.toLocaleString() + " (" + withTokensPct + " of registered users)");
    if (miniTotal) miniTotal.parentElement && (miniTotal.parentElement.title = "Registered: " + total.toLocaleString() + " (" + registeredPct + " of room total)");
    updateCompactDashboard(frame);
    if (!runtime.isMinimized) {
      Object.keys(runtime.TIERS).forEach(function(tier) {
        var countEl = document.getElementById("count-" + tier);
        var highEl = document.getElementById("high-" + tier);
        var rowEl = document.getElementById("tier-row-" + tier);
        var currentVal = counts[tier];
        var highResult = getDisplayHigh(frame, tier, currentVal);
        if (countEl) countEl.textContent = currentVal;
        if (highEl) {
          highEl.textContent = highLabel(highResult, true);
          highEl.title = highDescription(highResult);
        }
        if (rowEl) {
          if (highlights && highlights[tier]) {
            rowEl.style.background = "rgba(50, 205, 50, 0.22)";
          } else {
            rowEl.style.background = "rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)))";
          }
        }
      });
      var withTokensCountEl = document.getElementById("count-withtokens");
      var withTokensPctEl = document.getElementById("pct-withtokens");
      var withTokensHighEl = document.getElementById("high-withtokens");
      var withTokensRowEl = document.getElementById("tier-row-withtokens");
      var withTokensResult = getDisplayHigh(frame, "withTokens", withTokens);
      if (withTokensCountEl) withTokensCountEl.textContent = withTokens;
      if (withTokensPctEl) withTokensPctEl.textContent = withTokensPct;
      if (withTokensHighEl) {
        withTokensHighEl.textContent = highLabel(withTokensResult, true);
        withTokensHighEl.title = highDescription(withTokensResult);
      }
      if (withTokensRowEl) {
        if (highlights && highlights["withTokens"]) {
          withTokensRowEl.style.background = "rgba(50, 205, 50, 0.22)";
        } else {
          withTokensRowEl.style.background = "rgba(255,105,180,0.15)";
        }
      }
      var totalEl = document.getElementById("count-total");
      var totalHighEl = document.getElementById("high-total");
      var totalRowEl = document.getElementById("tier-row-total");
      var totalResult = getDisplayHigh(frame, "total", total);
      if (totalEl) totalEl.textContent = total;
      if (totalHighEl) {
        totalHighEl.textContent = highLabel(totalResult, true);
        totalHighEl.title = highDescription(totalResult);
      }
      if (totalRowEl) {
        if (highlights && highlights["total"]) {
          totalRowEl.style.background = "rgba(50, 205, 50, 0.22)";
        } else {
          totalRowEl.style.background = "rgba(var(--panel-row-rgb),0.1)";
        }
      }
      var fullAnonText = document.getElementById("anon-ratio-full");
      var anonHighEl = document.getElementById("high-anon");
      var anonRowEl = document.getElementById("tier-row-anon");
      var anonResult = getDisplayHigh(frame, "anonymous", anonymousCount);
      if (fullAnonText) {
        var anonLabel = anonymousCount > 0 ? anonymousCount.toLocaleString() : "0";
        var digits = String(Math.abs(anonymousCount)).length;
        fullAnonText.textContent = anonLabel;
        fullAnonText.style.fontSize = digits >= 6 ? "9px" : digits === 5 ? "11px" : "13px";
      }
      if (anonHighEl) {
        anonHighEl.textContent = highLabel(anonResult, true);
        anonHighEl.title = highDescription(anonResult);
      }
      if (anonRowEl) {
        if (highlights && highlights["anonymous"]) {
          anonRowEl.style.background = "rgba(50, 205, 50, 0.22)";
        } else {
          anonRowEl.style.background = "rgba(136,136,136,0.15)";
        }
      }
    }
  }

  // src/replay.js
  function createPlaybackSnapshot(sourceHistory) {
    var copiedHistory = { timestamps: sourceHistory.timestamps.slice(), breaks: getHistoryBreaks(sourceHistory).slice() };
    var timeline = [];
    var highs = { roomTotal: [] };
    var firstTimestamp = copiedHistory.timestamps.length ? copiedHistory.timestamps[0] : 0;
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      copiedHistory[key] = sourceHistory[key].slice();
      highs[key] = [];
    });
    copiedHistory.timestamps.forEach(function(timestamp, index) {
      timeline.push(Math.max(index ? timeline[index - 1] : 0, timestamp - firstTimestamp));
      runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
        highs[key].push(Math.max(index ? highs[key][index - 1] : 0, copiedHistory[key][index]));
      });
      var total = copiedHistory.total[index] + copiedHistory.anonymous[index];
      highs.roomTotal.push(Math.max(index ? highs.roomTotal[index - 1] : 0, total));
    });
    var durationMs = timeline.length ? timeline[timeline.length - 1] : 0;
    return {
      history: copiedHistory,
      timeline,
      highs,
      // Recording gaps affect the chart's time axis, not how long Replay
      // waits for its next sample. Keep one second per step, capped at 30s.
      durationMs,
      replayDurationMs: Math.min(3e4, Math.max(0, timeline.length - 1) * 1e3)
    };
  }
  function setPlaybackSamplePosition(state, position) {
    var last = state.snapshot.timeline.length - 1;
    state.samplePosition = Math.max(0, Math.min(last, position));
    if (Math.abs(state.samplePosition - Math.round(state.samplePosition)) < 1e-9) {
      state.samplePosition = Math.round(state.samplePosition);
    }
    state.stepIndex = Math.floor(state.samplePosition);
    var time = state.snapshot.timeline[state.stepIndex];
    var nextTime = state.snapshot.timeline[Math.min(last, state.stepIndex + 1)];
    state.positionMs = time + (nextTime - time) * (state.samplePosition - state.stepIndex);
  }
  function getPlaybackSampleIndex(snapshot, positionMs, exactIndex) {
    if (!snapshot || !snapshot.timeline.length) return -1;
    var position = Number(positionMs);
    position = Number.isFinite(position) ? Math.max(0, Math.min(snapshot.durationMs, position)) : 0;
    var low = 0;
    var high = snapshot.timeline.length;
    while (low < high) {
      var middle = Math.floor((low + high) / 2);
      if (snapshot.timeline[middle] <= position) low = middle + 1;
      else high = middle;
    }
    return Number.isInteger(exactIndex) ? Math.max(0, Math.min(snapshot.timeline.length - 1, exactIndex)) : Math.max(0, low - 1);
  }
  function getPlaybackFrame(snapshot, positionMs, exactIndex) {
    var index = getPlaybackSampleIndex(snapshot, positionMs, exactIndex);
    if (index < 0) return null;
    var frameHistory = snapshot.history;
    var frameHighs = {};
    var counts = {};
    var playbackNewHighTiers = {};
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      frameHighs[key] = snapshot.highs[key][index];
      var count = snapshot.history[key][index];
      if (hasStorageField(runtime.TIERS, key)) counts[key] = count;
      if (count > 0 && count >= snapshot.highs[key][index]) {
        playbackNewHighTiers[key] = true;
      }
    });
    frameHighs.roomTotal = snapshot.highs.roomTotal[index];
    var total = snapshot.history.total[index];
    var anonymousCount = snapshot.history.anonymous[index];
    return {
      counts,
      total,
      withTokens: snapshot.history.withTokens[index],
      anonymousCount,
      fullRoomTotal: total + anonymousCount,
      roomTotalHigh: frameHighs.roomTotal,
      history: frameHistory,
      historyEndIndex: index,
      highs: frameHighs,
      index,
      timestamp: snapshot.history.timestamps[index],
      playbackNewHighTiers
    };
  }
  function isPlaybackCurrent(state) {
    return !!state && state === runtime.playback && runtime.presentationMode === "PLAYBACK" && state.url === location.href && runtime.lastUrl === location.href && state.generation === runtime.initGuard && state.key === runtime.activeSessionStorageKey && (state.imported || state.key === getStorageKey(getModelName()));
  }
  function stopPlaybackClock(state) {
    if (state && state.timer !== null) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }
  function startPlaybackClock(state) {
    if (!state.playing || state.timer !== null) return;
    state.timer = setInterval(function() {
      if (runtime.playback === state) tickPlayback(state);
    }, 50);
  }
  function paintPlayback(state) {
    if (!isPlaybackCurrent(state)) return false;
    try {
      var index = getPlaybackSampleIndex(state.snapshot, state.positionMs, state.stepIndex);
      if (state.paintedPosition !== state.samplePosition || state.paintLayout !== runtime.chartLayoutRevision) {
        renderPlaybackFrame(getPlaybackFrame(state.snapshot, state.positionMs, state.stepIndex), state.samplePosition - index);
        state.paintedPosition = state.samplePosition;
        state.paintLayout = runtime.chartLayoutRevision;
      }
      updatePlaybackControls();
      return true;
    } catch (error) {
      state.playing = false;
      stopPlaybackClock(state);
      log("Playback paused after a presentation error: " + error.message);
      try {
        updatePlaybackControls();
      } catch (controlError) {
      }
      return false;
    }
  }
  function enterPlayback() {
    if (runtime.playback) {
      if (isPlaybackCurrent(runtime.playback)) return true;
      leavePlayback(false);
    }
    var model = getModelName();
    if (!model || model === "unknown" || runtime.lastUrl !== location.href || runtime.activeSessionStorageKey !== getStorageKey(model) || !runtime.history.timestamps.length) return false;
    try {
      var archive = captureSessionFile();
      var snapshot = createPlaybackSnapshot(archive.session.history);
      runtime.playback = {
        url: location.href,
        key: runtime.activeSessionStorageKey,
        generation: runtime.initGuard,
        archive,
        snapshot,
        positionMs: 0,
        samplePosition: 0,
        stepIndex: 0,
        allTimeState: readAllTimeHighs(model),
        speed: 1,
        lastTickAt: Date.now(),
        playing: snapshot.replayDurationMs > 0,
        timer: null
      };
      cancelHighPulses();
      runtime.presentationMode = "PLAYBACK";
      setPlaybackLayout(true);
      if (!paintPlayback(runtime.playback)) return false;
      startPlaybackClock(runtime.playback);
      return true;
    } catch (error) {
      if (runtime.playback) {
        runtime.playback.playing = false;
        stopPlaybackClock(runtime.playback);
      }
      log("Could not start playback: " + error.message);
      return false;
    }
  }
  function leavePlayback(renderLive) {
    runtime.sessionFileLoadGeneration++;
    setAllTimeActionStatus("");
    hideChartTooltip();
    cancelHighPulses();
    cancelGifExport();
    if (typeof renderLive === "undefined") renderLive = true;
    if (!runtime.playback && runtime.presentationMode === "LIVE") return false;
    var canRenderLive = renderLive && isPlaybackCurrent(runtime.playback);
    stopPlaybackClock(runtime.playback);
    runtime.playback = null;
    runtime.presentationMode = "LIVE";
    try {
      setPlaybackLayout(false);
      if (canRenderLive) repaintLivePresentation();
      else clearPlaybackPresentation();
    } catch (error) {
      log("Could not repaint after playback: " + error.message);
    }
    return true;
  }
  function tickPlayback(expectedState) {
    if (expectedState && expectedState !== runtime.playback) return false;
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
      if (state) leavePlayback(false);
      return false;
    }
    if (!state.playing) return false;
    var now = Date.now();
    var elapsed = Math.max(0, now - state.lastTickAt);
    state.lastTickAt = now;
    var last = state.snapshot.timeline.length - 1;
    var rate = state.snapshot.replayDurationMs > 0 ? last / state.snapshot.replayDurationMs : 0;
    setPlaybackSamplePosition(state, state.samplePosition + elapsed * rate * state.speed);
    if (state.samplePosition >= last) {
      state.playing = false;
      stopPlaybackClock(state);
    }
    return paintPlayback(state);
  }
  function togglePlayback() {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
      if (state) leavePlayback(false);
      return false;
    }
    if (!state.snapshot.replayDurationMs) return false;
    if (state.playing) {
      tickPlayback(state);
      state.playing = false;
      stopPlaybackClock(state);
    } else {
      if (state.samplePosition >= state.snapshot.timeline.length - 1) setPlaybackSamplePosition(state, 0);
      state.playing = true;
      state.lastTickAt = Date.now();
    }
    if (!paintPlayback(state)) return false;
    startPlaybackClock(state);
    return true;
  }
  function scrubPlayback(samplePosition) {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
      if (state) leavePlayback(false);
      return false;
    }
    var position = Number(samplePosition);
    if (!Number.isFinite(position)) return false;
    state.playing = false;
    stopPlaybackClock(state);
    setPlaybackSamplePosition(state, position);
    state.lastTickAt = Date.now();
    return paintPlayback(state);
  }
  function stepPlayback(direction) {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) return false;
    var index = getPlaybackSampleIndex(state.snapshot, state.positionMs, state.stepIndex);
    if (index < 0) return false;
    state.playing = false;
    stopPlaybackClock(state);
    setPlaybackSamplePosition(state, index + direction);
    state.lastTickAt = Date.now();
    return paintPlayback(state);
  }
  function setPlaybackSpeed(value) {
    var state = runtime.playback;
    if (!isPlaybackCurrent(state)) {
      if (state) leavePlayback(false);
      return false;
    }
    var speed = Number(value);
    if ([0.5, 1, 2].indexOf(speed) === -1) return false;
    if (state.playing) tickPlayback(state);
    state.speed = speed;
    state.lastTickAt = Date.now();
    return paintPlayback(state);
  }
  function updateReplayAvailability() {
    var button = document.getElementById("btn-replay");
    if (!button) return;
    button.disabled = !runtime.history.timestamps.length || runtime.activeSessionStorageKey !== getStorageKey(getModelName()) || location.href !== runtime.lastUrl;
    button.title = button.disabled ? "No recorded history for this room yet" : "Replay recorded history; live acquisition continues";
  }
  function bindPlaybackControls() {
    var bindings = {
      "btn-replay": enterPlayback,
      "playback-play": togglePlayback,
      "playback-previous": function() {
        stepPlayback(-1);
      },
      "playback-next": function() {
        stepPlayback(1);
      },
      "playback-return": function() {
        leavePlayback(true);
      }
    };
    Object.keys(bindings).forEach(function(id) {
      var button = document.getElementById(id);
      if (button) button.onclick = bindings[id];
    });
    var slider = document.getElementById("playback-scrubber");
    if (slider) slider.oninput = function() {
      scrubPlayback(Number(this.value));
    };
    var speed = document.getElementById("playback-speed");
    if (speed) speed.onchange = function() {
      setPlaybackSpeed(Number(this.value));
    };
  }
  function setPlaybackLayout(active) {
    if (active) {
      runtime.playbackLayoutState = [];
      var toggle = document.getElementById("btn-toggle");
      if (toggle) toggle.disabled = true;
      [
        ["live-trend", "visibility", "hidden"],
        ["control-field", "visibility", "hidden"],
        ["acquisition-status", "visibility", "hidden"],
        ["btn-toggle", "visibility", "hidden"],
        ["playback-controls", "display", "grid"]
      ].forEach(function(change) {
        var element = document.getElementById(change[0]);
        if (!element) return;
        runtime.playbackLayoutState.push({ element, property: change[1], value: element.style[change[1]] || "" });
        element.style[change[1]] = change[2];
      });
    } else if (runtime.playbackLayoutState) {
      runtime.playbackLayoutState.forEach(function(saved) {
        saved.element.style[saved.property] = saved.value;
      });
      runtime.playbackLayoutState = null;
      var toggle = document.getElementById("btn-toggle");
      if (toggle) toggle.disabled = false;
    }
  }
  function updatePlaybackControls() {
    if (!runtime.playback) return;
    updatePanelOptions();
    var label = document.getElementById("playback-label");
    if (label) {
      label.textContent = runtime.playback.imported ? "FILE REPLAY" : "PLAYBACK";
      label.title = runtime.playback.archive ? runtime.playback.archive.room : "";
    }
    var room = document.getElementById("playback-room");
    if (room) {
      var sourceRoom = runtime.playback.imported && runtime.playback.archive ? runtime.playback.archive.room : "";
      room.textContent = sourceRoom ? "Room: " + sourceRoom : "";
      room.title = sourceRoom ? "Saved session from " + sourceRoom : "";
      room.style.display = sourceRoom ? "block" : "none";
    }
    var fileControls = document.getElementById("playback-file-controls");
    if (fileControls) fileControls.style.display = runtime.playback.imported ? "flex" : "none";
    var controls = document.getElementById("playback-controls");
    if (controls) controls.style.minHeight = runtime.playback.imported ? "66px" : "";
    var back = document.getElementById("playback-return");
    if (back) {
      back.textContent = runtime.playback.imported ? "Close Replay" : "Return to Live";
      back.title = runtime.playback.imported ? "Close this file and return to the current room session" : "Return to the current room session";
    }
    var index = getPlaybackSampleIndex(runtime.playback.snapshot, runtime.playback.positionMs, runtime.playback.stepIndex);
    var previous = document.getElementById("playback-previous");
    var next = document.getElementById("playback-next");
    if (previous) previous.disabled = index <= 0;
    if (next) next.disabled = index < 0 || index === runtime.playback.snapshot.timeline.length - 1;
    var button = document.getElementById("playback-play");
    if (button) {
      button.textContent = runtime.playback.playing ? "Pause" : "Play";
      button.disabled = runtime.playback.snapshot.replayDurationMs === 0;
      button.title = runtime.playback.playing ? "Pause playback only" : "Play recorded samples at an even pace";
    }
    var slider = document.getElementById("playback-scrubber");
    if (slider) {
      slider.max = String(Math.max(0, runtime.playback.snapshot.timeline.length - 1));
      slider.value = String(runtime.playback.samplePosition);
      slider.disabled = runtime.playback.snapshot.replayDurationMs === 0;
      slider.setAttribute("aria-valuetext", "Sample " + (index + 1) + " of " + runtime.playback.snapshot.timeline.length);
    }
    var speed = document.getElementById("playback-speed");
    if (speed) speed.value = String(runtime.playback.speed);
    var position = document.getElementById("playback-position");
    if (position) {
      position.textContent = formatElapsedTime(runtime.playback.positionMs) + " / " + formatElapsedTime(runtime.playback.snapshot.durationMs);
      position.title = "Sample " + (index + 1) + " of " + runtime.playback.snapshot.timeline.length + ". Samples play at an even pace; the time display and chart gaps retain recorded timing. The moving line connects recorded samples; counts and highs change only at a recorded sample. Live acquisition continues independently.";
      if (runtime.playback.archive) position.title += "\n" + runtime.playback.archive.room + " · " + new Date(runtime.playback.archive.session.timestamp).toLocaleString() + " · Active time: " + formatElapsedTime(runtime.playback.archive.session.pausedElapsedTime) + (runtime.playback.archive.session.isStopped ? " · Stopped session" : runtime.playback.archive.session.isPaused ? " · Paused session" : " · Running session snapshot");
    }
  }
  function renderPlaybackFrame(frame, progress) {
    renderDisplayFrame(Object.assign({}, frame, { isPlayback: true }));
    drawHistorySparklines(frame.history, frame.historyEndIndex, progress);
  }
  function clearPlaybackPresentation() {
    var emptyHistory = { timestamps: [] };
    var counts = {};
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      emptyHistory[key] = [];
      counts[key] = 0;
    });
    renderDisplayFrame({
      counts,
      total: 0,
      withTokens: 0,
      anonymousCount: 0,
      fullRoomTotal: 0,
      roomTotalHigh: 0,
      history: emptyHistory,
      isPlayback: false
    });
    drawHistorySparklines(emptyHistory);
  }
  function repaintLivePresentation() {
    updateDisplay();
    updateTrendDisplay();
    drawAllSparklines();
    updateAcquisitionStatus();
    updateCountdownDisplay();
  }

  // src/files.js
  function setChartWindow(value) {
    if (!hasStorageField(runtime.CHART_WINDOWS, value)) return;
    runtime.chartWindowMode = value;
    try {
      GM_setValue(runtime.CHART_WINDOW_KEY, value);
    } catch (error) {
      log("Could not save chart window preference");
    }
    runtime.chartLayoutRevision++;
    updatePanelOptions();
    redrawPanelCharts();
  }
  function captureSessionFile() {
    if (isPlaybackCurrent(runtime.playback) && runtime.playback.archive) return runtime.playback.archive;
    if (!runtime.history.timestamps.length || runtime.activeSessionStorageKey !== getStorageKey(getModelName()) || location.href !== runtime.lastUrl) {
      throw new Error("No recorded session to save yet.");
    }
    var now = Date.now();
    var data = {
      schemaVersion: runtime.STORAGE_SCHEMA_VERSION,
      timestamp: now,
      history: { timestamps: runtime.history.timestamps.slice(), breaks: getHistoryBreaks(runtime.history).slice() },
      sessionStartedAt: runtime.sessionStartedAt,
      sessionStartEstimated: runtime.sessionStartEstimated,
      sessionHighs: {},
      roomTotalHigh: runtime.roomTotalHigh,
      roomTotalHighTime: runtime.roomTotalHighTime,
      pausedElapsedTime: runtime.isPaused ? runtime.pausedElapsedTime : runtime.trackingStartTime ? Math.max(0, now - runtime.trackingStartTime) : 0,
      isPaused: runtime.isPaused,
      isStopped: runtime.isStopped,
      stoppedAt: runtime.stoppedAt,
      stopReason: runtime.stopReason
    };
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      data.history[key] = runtime.history[key].slice();
      data.sessionHighs[key] = getSessionHigh(key, 0);
    });
    runtime.history.timestamps.forEach(function(time, i) {
      var total = runtime.history.total[i] + runtime.history.anonymous[i];
      if (total > data.roomTotalHigh) {
        data.roomTotalHigh = total;
        data.roomTotalHighTime = time;
      }
    });
    return validateSessionFile({
      format: runtime.SESSION_FILE_FORMAT,
      formatVersion: runtime.SESSION_FILE_VERSION,
      producerVersion: runtime.TIERSCOPE_VERSION,
      room: getModelName(),
      session: data
    });
  }
  function validateSessionFile(file) {
    if (!isStorageObject(file) || file.format !== runtime.SESSION_FILE_FORMAT || file.formatVersion !== runtime.SESSION_FILE_VERSION) {
      throw new Error("This is not a supported TierScope session file.");
    }
    if (typeof file.room !== "string" || !/^[a-z0-9_-]{1,100}$/i.test(file.room) || typeof file.producerVersion !== "string" || file.producerVersion.length > 40) {
      throw new Error("Invalid session file information.");
    }
    var data = file.session;
    validateStoredSession(data);
    if (data.schemaVersion !== runtime.STORAGE_SCHEMA_VERSION || !data.history.timestamps.length || !isStorageObject(data.sessionHighs) || !isStorageNumber(data.roomTotalHigh) || !(data.sessionStartedAt === null || isStorageTimestamp(data.sessionStartedAt)) || typeof data.sessionStartEstimated !== "boolean" || !isStorageTimestamp(data.pausedElapsedTime) || typeof data.isPaused !== "boolean" || typeof data.isStopped !== "boolean" || !(data.roomTotalHighTime === null || isStorageTimestamp(data.roomTotalHighTime))) {
      throw new Error("Session file is incomplete.");
    }
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      if (!data.history[key].every(Number.isSafeInteger) || !Number.isSafeInteger(data.sessionHighs[key].value)) {
        throw new Error("Session counts must be whole numbers.");
      }
    });
    var roomPeak = 0;
    data.history.timestamps.forEach(function(_, i) {
      var total = data.history.total[i] + data.history.anonymous[i];
      if (!Number.isSafeInteger(total)) throw new Error("Invalid session room total.");
      roomPeak = Math.max(roomPeak, total);
    });
    if (!Number.isSafeInteger(data.roomTotalHigh) || data.roomTotalHigh < roomPeak) throw new Error("Invalid session room high.");
    var normalized = normalizeStoredSession(data);
    var clean = { schemaVersion: runtime.STORAGE_SCHEMA_VERSION };
    [
      "timestamp",
      "history",
      "sessionStartedAt",
      "sessionStartEstimated",
      "sessionHighs",
      "roomTotalHigh",
      "roomTotalHighTime",
      "pausedElapsedTime",
      "isPaused",
      "isStopped",
      "stoppedAt",
      "stopReason"
    ].forEach(function(key) {
      clean[key] = normalized[key];
    });
    return {
      format: runtime.SESSION_FILE_FORMAT,
      formatVersion: runtime.SESSION_FILE_VERSION,
      producerVersion: file.producerVersion,
      room: file.room,
      session: clean
    };
  }
  function downloadSessionFile() {
    try {
      var archive = captureSessionFile();
      var blob = new Blob([JSON.stringify(archive)], { type: "application/json;charset=utf-8" });
      var url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url;
      link.download = archive.room + "-session-" + new Date(archive.session.timestamp).toISOString().replace(/[:.]/g, "-") + ".tierscope.json";
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        setTimeout(function() {
          URL.revokeObjectURL(url);
        }, 6e4);
      }
    } catch (error) {
      alert("Could not save session file: " + error.message);
    }
  }
  function openSessionReplay(file) {
    var archive = validateSessionFile(file);
    leavePlayback(false);
    if (runtime.isMinimized) toggleView();
    runtime.playback = {
      url: location.href,
      key: runtime.activeSessionStorageKey,
      generation: runtime.initGuard,
      imported: true,
      archive,
      snapshot: createPlaybackSnapshot(archive.session.history),
      allTimeState: readAllTimeHighs(archive.room),
      positionMs: 0,
      samplePosition: 0,
      stepIndex: 0,
      speed: 1,
      lastTickAt: Date.now(),
      playing: false,
      timer: null
    };
    cancelHighPulses();
    runtime.presentationMode = "PLAYBACK";
    setPlaybackLayout(true);
    return paintPlayback(runtime.playback);
  }
  async function readSessionFile(file) {
    if (!file) return false;
    var request = ++runtime.sessionFileLoadGeneration, url = location.href, generation = runtime.initGuard;
    function current() {
      return request === runtime.sessionFileLoadGeneration && url === location.href && generation === runtime.initGuard;
    }
    try {
      if (file.size > runtime.SESSION_FILE_MAX_BYTES) throw new Error("Session files must be 8 MB or smaller.");
      var text = await file.text();
      if (!current()) return false;
      if (text.length > runtime.SESSION_FILE_MAX_BYTES) throw new Error("Session file is too large.");
      return openSessionReplay(JSON.parse(text.replace(/^\uFEFF/, "")));
    } catch (error) {
      if (current()) alert("Could not open session file: " + error.message);
      return false;
    }
  }
  function updatePanelOptions() {
    updateHighControls();
    var button = document.getElementById("btn-panel-options");
    if (button) {
      button.style.display = runtime.isMinimized ? "none" : "";
      button.textContent = { full: "Full", fourHours: "4h", twoHours: "2h", hour: "1h", halfHour: "30m", quarter: "15m" }[runtime.chartWindowMode] + " ▾";
      button.title = "Chart window and session files. Showing " + { full: "full history", fourHours: "the last 4 hours", twoHours: "the last 2 hours", hour: "the last hour", halfHour: "the last 30 minutes", quarter: "the last 15 minutes" }[runtime.chartWindowMode] + ".";
    }
    var select = document.getElementById("chart-window-select");
    if (select) select.value = runtime.chartWindowMode;
    ["btn-save-session", "btn-control-save-session", "btn-playback-save-session"].forEach(function(id) {
      var save = document.getElementById(id);
      if (save) save.disabled = !(isPlaybackCurrent(runtime.playback) && runtime.playback.archive || runtime.history.timestamps.length);
    });
    var info = document.getElementById("session-file-info");
    if (info) {
      var archive = isPlaybackCurrent(runtime.playback) && runtime.playback.imported ? runtime.playback.archive : null;
      info.style.display = archive ? "block" : "none";
      if (archive) info.textContent = archive.room + " · " + archive.session.history.timestamps.length + " samples\nSaved " + new Date(archive.session.timestamp).toLocaleString() + "\nSession room high: " + archive.session.roomTotalHigh.toLocaleString();
    }
  }
  function bindPanelOptions() {
    var button = document.getElementById("btn-panel-options"), menu = document.getElementById("panel-options");
    var input = document.getElementById("session-file-input");
    function close(focus) {
      menu.style.display = "none";
      button.setAttribute("aria-expanded", "false");
      if (focus) button.focus();
    }
    button.onmousedown = function(event) {
      event.stopPropagation();
    };
    button.onclick = function(event) {
      event.stopPropagation();
      updatePanelOptions();
      var open = menu.style.display === "none";
      menu.style.display = open ? "block" : "none";
      button.setAttribute("aria-expanded", String(open));
      if (open) document.getElementById("chart-window-select").focus();
    };
    document.getElementById("panel-options-close").onclick = function() {
      close(true);
    };
    document.getElementById("chart-window-select").onchange = function() {
      setChartWindow(this.value);
    };
    document.getElementById("btn-save-session").onclick = function() {
      downloadSessionFile();
      close(true);
    };
    document.getElementById("btn-control-save-session").onclick = downloadSessionFile;
    document.getElementById("btn-playback-save-session").onclick = downloadSessionFile;
    function chooseSessionFile() {
      input.value = "";
      input.click();
    }
    document.getElementById("btn-open-session").onclick = chooseSessionFile;
    document.getElementById("btn-control-open-session").onclick = chooseSessionFile;
    document.getElementById("btn-playback-open-session").onclick = chooseSessionFile;
    document.getElementById("btn-high-mode").onclick = toggleHighMode;
    document.getElementById("mini-high").onclick = toggleHighMode;
    document.getElementById("btn-add-all-time").onclick = addFileToAllTimeHighs;
    document.getElementById("btn-playback-add-all-time").onclick = addFileToAllTimeHighs;
    document.getElementById("btn-clear-all-time").onclick = clearAllTimeHighs;
    input.onchange = function() {
      var file = input.files && input.files[0];
      if (file) {
        close(false);
        readSessionFile(file);
      }
    };
    function outside(event) {
      if (!menu.contains(event.target) && !button.contains(event.target)) close(false);
    }
    function escape(event) {
      if (event.key === "Escape" && menu.style.display !== "none") {
        close(true);
        event.stopPropagation();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    runtime.panelOptionsCleanup = function() {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
    updatePanelOptions();
  }

  // src/highs.js
  function allTimeRoom(room) {
    return typeof room === "string" && /^[a-z0-9_-]{1,100}$/i.test(room) && room.toLowerCase() !== "unknown" ? room.toLowerCase() : null;
  }
  function emptyAllTimeHighs() {
    var highs = {};
    runtime.ALL_TIME_SERIES.forEach(function(key) {
      highs[key] = { value: 0, time: null, source: null };
    });
    return highs;
  }
  function mergeAllTimeHighs(target, incoming) {
    var changed = 0;
    runtime.ALL_TIME_SERIES.forEach(function(key) {
      var old = target[key], next = incoming[key];
      if (!next || !next.source) return;
      if (!old.source || next.value > old.value || next.value === old.value && next.time !== null && (old.time === null || next.time < old.time)) {
        target[key] = { value: next.value, time: next.time, source: next.source };
        changed++;
      }
    });
    return changed;
  }
  function validateAllTimeRecord(data, room) {
    if (!isStorageObject(data) || data.schemaVersion !== 1 || data.room !== room || typeof data.epoch !== "string" || !isStorageObject(data.highs)) throw new Error("Unsupported all-time record");
    runtime.ALL_TIME_SERIES.forEach(function(key) {
      var high = data.highs[key];
      if (!isStorageObject(high) || !Number.isSafeInteger(high.value) || high.value < 0 || !(high.time === null || isStorageTimestamp(high.time)) || [null, "live", "saved", "file"].indexOf(high.source) === -1 || high.source === null && (high.value !== 0 || high.time !== null)) throw new Error("Invalid all-time high");
    });
  }
  function readAllTimeHighs(room) {
    room = allTimeRoom(room);
    var previous = runtime.allTimeCache.get(room);
    var state = { room, epoch: "initial", highs: emptyAllTimeHighs(), keys: [], skipped: 0, error: "", pending: false };
    if (!room) return state;
    try {
      state.epoch = GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + room, "initial");
      if (typeof state.epoch !== "string") throw new Error("Invalid all-time records generation");
      var prefix = runtime.ALL_TIME_PREFIX + room + ":";
      GM_listValues().filter(function(key) {
        return key.indexOf(prefix) === 0;
      }).forEach(function(key) {
        try {
          var raw = GM_getValue(key, void 0);
          if (raw === void 0) return;
          var data = JSON.parse(raw);
          validateAllTimeRecord(data, room);
          if (data.epoch !== state.epoch) return;
          mergeAllTimeHighs(state.highs, data.highs);
          state.keys.push(key);
        } catch (error) {
          state.skipped++;
        }
      });
      if (previous && previous.pending && previous.epoch === state.epoch) {
        mergeAllTimeHighs(state.highs, previous.highs);
        state.pending = true;
      }
    } catch (error) {
      if (previous) {
        state = Object.assign({}, previous, { highs: emptyAllTimeHighs() });
        mergeAllTimeHighs(state.highs, previous.highs);
      }
      state.error = "All-time records could not be read. Showing locally available records.";
    }
    runtime.allTimeCache.set(room, state);
    return state;
  }
  function storeAllTimeHighs(room, incoming) {
    var state = readAllTimeHighs(room);
    if (!state.room) return { state, changed: 0, saved: false };
    try {
      validateAllTimeRecord({ schemaVersion: 1, room: state.room, epoch: state.epoch, highs: incoming }, state.room);
    } catch (error) {
      state.error = "All-time highs were not updated: invalid record values.";
      return { state, changed: 0, saved: false };
    }
    var changed = mergeAllTimeHighs(state.highs, incoming);
    if (!changed && !state.pending && state.keys.length < 2) return { state, changed: 0, saved: !state.error };
    state.pending = true;
    try {
      if (state.error) throw new Error(state.error);
      var data = { schemaVersion: 1, room: state.room, epoch: state.epoch, highs: state.highs };
      validateAllTimeRecord(data, state.room);
      var key = runtime.ALL_TIME_PREFIX + state.room + ":" + state.epoch + ":" + makeStorageId();
      GM_setValue(key, JSON.stringify(data));
      if (GM_getValue(runtime.ALL_TIME_EPOCH_PREFIX + state.room, "initial") !== state.epoch) {
        return { state: readAllTimeHighs(state.room), changed: 0, saved: false };
      }
      state.pending = false;
      state.keys.forEach(function(old) {
        try {
          GM_deleteValue(old);
        } catch (error) {
        }
      });
      state.keys = [key];
    } catch (error) {
      state.error = "All-time highs are local only: saving is unavailable. Keep this tab open to retry.";
    }
    return { state: state.pending ? state : readAllTimeHighs(state.room), changed, saved: !state.pending };
  }
  function sessionAllTimeHighs(data, source) {
    var highs = emptyAllTimeHighs();
    runtime.STORAGE_HISTORY_SERIES.forEach(function(key) {
      var high = data.sessionHighs[key];
      highs[key] = { value: high.value, time: high.time, source };
    });
    highs.roomTotal = { value: data.roomTotalHigh, time: data.roomTotalHighTime, source };
    data.history.timestamps.forEach(function(time, i) {
      var total = data.history.total[i] + data.history.anonymous[i];
      if (total > highs.roomTotal.value || total === highs.roomTotal.value && highs.roomTotal.time === null) {
        highs.roomTotal = { value: total, time, source };
      }
    });
    return highs;
  }
  function recordAcceptedAllTimeHighs(room) {
    var index = runtime.history.timestamps.length - 1;
    if (index < 0) return;
    var incoming = emptyAllTimeHighs(), time = runtime.history.timestamps[index];
    runtime.ALL_TIME_SERIES.forEach(function(key) {
      incoming[key] = {
        value: key === "roomTotal" ? runtime.history.total[index] + runtime.history.anonymous[index] : runtime.history[key][index],
        time,
        source: "live"
      };
    });
    storeAllTimeHighs(room, incoming);
  }
  function displayedHighRoom() {
    return allTimeRoom(isPlaybackCurrent(runtime.playback) && runtime.playback.archive ? runtime.playback.archive.room : getModelName());
  }
  function displayedAllTimeState() {
    if (isPlaybackCurrent(runtime.playback) && runtime.playback.allTimeState) return runtime.playback.allTimeState;
    var room = displayedHighRoom();
    return runtime.allTimeCache.get(room) || readAllTimeHighs(room);
  }
  function repaintHighMode() {
    cancelHighPulses();
    runtime.chartLayoutRevision++;
    if (isPlaybackCurrent(runtime.playback)) paintPlayback(runtime.playback);
    else updateDisplay();
    updateHighControls();
  }
  function toggleHighMode() {
    runtime.highMode = runtime.highMode === "sh" ? "ath" : "sh";
    var state = readAllTimeHighs(displayedHighRoom());
    if (isPlaybackCurrent(runtime.playback)) runtime.playback.allTimeState = state;
    try {
      GM_setValue(runtime.HIGH_MODE_KEY, runtime.highMode);
    } catch (error) {
    }
    repaintHighMode();
  }
  function setAllTimeActionStatus(message, replayLabel) {
    var status = document.getElementById("all-time-action-status");
    if (status) status.textContent = message;
    var button = document.getElementById("btn-playback-add-all-time");
    if (button) {
      button.textContent = replayLabel || "Add to all-time highs";
      button.title = message || "Add this file's highs to the room named beside this button";
      button.setAttribute("aria-label", replayLabel ? replayLabel + ". " + message : "Add to all-time highs");
    }
  }
  function addFileToAllTimeHighs() {
    if (!isPlaybackCurrent(runtime.playback) || !runtime.playback.imported) return;
    try {
      var archive = validateSessionFile(runtime.playback.archive);
      var result = storeAllTimeHighs(archive.room, sessionAllTimeHighs(archive.session, "file"));
      runtime.playback.allTimeState = result.state;
      repaintHighMode();
      setAllTimeActionStatus(
        result.saved ? (result.changed ? "Records updated for " : "No higher records in this file for ") + archive.room + "." : result.state.error || "Records changed in another tab. Try adding this file again.",
        result.saved ? result.changed ? "Added to ATH" : "Already in ATH" : "Retry adding to ATH"
      );
    } catch (error) {
      alert("Could not add all-time highs: " + error.message);
    }
  }
  function clearAllTimeHighs() {
    var room = displayedHighRoom();
    if (!room || !confirm("Clear all-time highs for " + room + "?\n\nSession history and saved files will remain. New accepted samples will start new all-time records.")) return;
    try {
      var prefix = runtime.ALL_TIME_PREFIX + room + ":";
      var keys = GM_listValues().filter(function(key) {
        return key.indexOf(prefix) === 0;
      });
      GM_setValue(runtime.ALL_TIME_EPOCH_PREFIX + room, makeStorageId());
      runtime.allTimeCache.delete(room);
      keys.forEach(function(key) {
        try {
          GM_deleteValue(key);
        } catch (error) {
        }
      });
      var state = readAllTimeHighs(room);
      if (isPlaybackCurrent(runtime.playback)) runtime.playback.allTimeState = state;
      repaintHighMode();
      setAllTimeActionStatus("All-time highs cleared for " + room + ".");
    } catch (error) {
      alert("Could not clear all-time highs: " + error.message);
    }
  }
  function updateHighControls() {
    var state = displayedAllTimeState();
    var warning = state.error || (state.pending ? "All-time highs are local only: saving is pending. Keep this tab open to retry." : "");
    var toggle = document.getElementById("btn-high-mode");
    if (toggle) {
      toggle.style.display = runtime.isMinimized ? "none" : "";
      toggle.textContent = runtime.highMode.toUpperCase();
      toggle.setAttribute("aria-pressed", String(runtime.highMode === "ath"));
      toggle.setAttribute("aria-label", runtime.highMode === "ath" ? "All-time highs. Switch to session highs" : "Session highs. Switch to all-time highs");
      toggle.title = (runtime.highMode === "ath" ? "All-time highs recorded for this room in this browser" : "Session highs") + ". Click to switch. " + warning;
    }
    ["btn-add-all-time", "btn-playback-add-all-time"].forEach(function(id) {
      var add = document.getElementById(id);
      if (add) add.style.display = isPlaybackCurrent(runtime.playback) && runtime.playback.imported ? "block" : "none";
    });
    var clear = document.getElementById("btn-clear-all-time");
    if (clear) {
      clear.disabled = !state.room;
      clear.title = state.room ? "Clear all-time records for " + state.room + " only" : "Open a room or session file first";
    }
    var info = document.getElementById("all-time-info");
    if (info) info.textContent = warning || (state.skipped ? state.skipped + " unreadable all-time record(s) were skipped and retained." : "All-time highs are saved per room in this browser and survive session Reset.");
  }
  function cancelHighPulse(key) {
    var animation = runtime.highPulseAnimations.get(key);
    runtime.highPulseAnimations.delete(key);
    if (animation) {
      try {
        animation.cancel();
      } catch (error) {
      }
    }
  }
  function cancelHighPulses() {
    Array.from(runtime.highPulseAnimations.keys()).forEach(cancelHighPulse);
  }
  function pulseAcceptedHighs(priorState) {
    try {
      if (runtime.presentationMode !== "LIVE" || runtime.isMinimized || runtime.restoredDisplayFrame || document.visibilityState === "hidden" || runtime.highPulseMotion && runtime.highPulseMotion.matches) {
        cancelHighPulses();
        return;
      }
      runtime.PANEL_ROWS.forEach(function(row) {
        var key = row.key === "withtokens" ? "withTokens" : row.key === "anon" ? "anonymous" : row.key;
        var atHigh = runtime.newHighTiers[key], wasAtHigh = priorState.newHighTiers[key];
        var previousHigh = priorState.sessionHighs[key];
        var raisedHigh = runtime.sessionHighs[key].value > (previousHigh ? previousHigh.value : 0);
        if (runtime.highMode === "ath") {
          var high = displayedAllTimeState().highs[key], before = priorState.allTimeHighs[key];
          var current = runtime.history[key][runtime.history[key].length - 1];
          var oldValue = priorState.history[key][priorState.history[key].length - 1];
          atHigh = high.source && current > 0 && current >= high.value;
          wasAtHigh = priorState.lastAcceptedAcquisition && before.source && oldValue > 0 && oldValue >= before.value;
          raisedHigh = high.value > before.value;
        }
        if (!atHigh) {
          cancelHighPulse(row.key);
          return;
        }
        if (wasAtHigh && !raisedHigh) return;
        var target = document.getElementById((runtime.collapsedRows.has(row.key) ? "restore-row-" : "tier-row-") + row.key);
        if (!target || typeof target.animate !== "function") return;
        cancelHighPulse(row.key);
        var animation = target.animate([
          { backgroundColor: "rgba(50, 205, 50, 0.22)", boxShadow: "inset 0 0 0 1px rgba(105, 190, 69, 0)", offset: 0 },
          { backgroundColor: "rgba(50, 205, 50, 0.40)", boxShadow: "inset 0 0 0 1px rgba(105, 190, 69, 0.75)", offset: 0.5 },
          { backgroundColor: "rgba(50, 205, 50, 0.22)", boxShadow: "inset 0 0 0 1px rgba(105, 190, 69, 0)", offset: 1 }
        ], { duration: 850, iterations: 2, easing: "ease-in-out", fill: "none" });
        runtime.highPulseAnimations.set(row.key, animation);
        animation.onfinish = animation.oncancel = function() {
          if (runtime.highPulseAnimations.get(row.key) === animation) runtime.highPulseAnimations.delete(row.key);
        };
      });
    } catch (error) {
      log("High pulse unavailable: " + error.message);
    }
  }
  function getSessionHigh(key, current) {
    var saved = runtime.sessionHighs[key];
    if (!saved) {
      var values = runtime.history[key] || [];
      var value = Math.max.apply(null, [0].concat(values));
      saved = { value, time: value > 0 ? runtime.history.timestamps[values.indexOf(value)] : null };
    }
    return { value: Math.max(saved.value, current || 0), time: saved.time };
  }
  function syncHighTimes() {
    Object.keys(runtime.TIERS).forEach(function(key) {
      runtime.tierHighTimes[key] = getSessionHigh(key, 0).time;
    });
    runtime.withTokensHighTime = getSessionHigh("withTokens", 0).time;
    runtime.totalHighTime = getSessionHigh("total", 0).time;
    runtime.anonHighTime = getSessionHigh("anonymous", 0).time;
    runtime.femaleTransHighTime = getSessionHigh("female-trans", 0).time;
  }
  function getDisplayHigh(frame, key, current) {
    if (runtime.highMode === "ath") return displayedAllTimeState().highs[key];
    if (key === "roomTotal") return { value: frame.roomTotalHigh, time: frame.isPlayback ? null : runtime.roomTotalHighTime };
    return frame.isPlayback ? { value: Math.max(frame.highs[key] || 0, current || 0), isNew: false } : getSessionHigh(key, current);
  }
  function highLabel(high, compact) {
    return runtime.highMode.toUpperCase() + ":" + (runtime.highMode === "ath" && !high.source ? "—" : compact ? compactNumber(high.value) : high.value.toLocaleString());
  }
  function highDescription(high) {
    var label = runtime.highMode === "ath" ? "All-time high for " + displayedHighRoom() : "Session high";
    if (runtime.highMode === "ath" && !high.source) return label + ": no record yet";
    return label + ": " + high.value.toLocaleString() + (high.time != null ? " · " + new Date(high.time).toLocaleString() : "") + (runtime.highMode === "ath" ? (high.source === "file" ? " · Added from a session file" : high.source === "saved" ? " · Restored local session" : " · Recorded live") + (displayedAllTimeState().pending ? " · Local only, not saved" : "") : "");
  }
  function getHighValue(data, currentValue, timestamp) {
    var historyMax = data && data.length > 0 ? Math.max.apply(null, data) : 0;
    var newHigh = Math.max(historyMax, currentValue || 0);
    if (timestamp && newHigh > historyMax) {
      return { value: newHigh, isNew: true, time: timestamp };
    }
    return { value: newHigh, isNew: false };
  }

  // src/compact.js
  function compactNumber(value) {
    return value >= 1e6 ? (value / 1e6).toFixed(1).replace(/\.0$/, "") + "m" : value >= 1e4 ? (value / 1e3).toFixed(1).replace(/\.0$/, "") + "k" : String(value);
  }
  function updateMiniFreshness() {
    var el = document.getElementById("mini-freshness");
    if (!el) return;
    if (runtime.isStopped) {
      el.textContent = "Stopped";
      el.title = stopDescription() + ". Start begins a new session.";
      el.style.color = "var(--panel-muted)";
      return;
    }
    if (isAbsencePaused() && !runtime.sessionStorageNotice) {
      var waitingPolicy = requestPolicyMessage(readRequestPolicy());
      el.textContent = waitingPolicy || "Auto-paused";
      el.title = absencePauseDescription() + (waitingPolicy ? " " + waitingPolicy + "." : " Next return check: " + runtime.countdownSeconds + "s.");
      el.style.color = "var(--panel-warning)";
      return;
    }
    var sample = runtime.lastAcceptedAcquisition || runtime.restoredDisplayFrame;
    var source = runtime.lastAcceptedAcquisition ? runtime.lastAcceptedAcquisition.source : sample ? "Saved" : "No sample";
    el.textContent = runtime.sessionStorageNotice ? "Local only" : (runtime.isAutoRefreshOn ? source : "Paused") + (sample ? " · " + formatSampleAge(sample.timestamp) : "");
    el.style.color = runtime.sessionStorageNotice ? "var(--panel-warning)" : runtime.isAutoRefreshOn ? "var(--panel-muted)" : "var(--panel-paused)";
    var policyMessage = requestPolicyMessage(readRequestPolicy());
    if (policyMessage && !runtime.sessionStorageNotice) {
      el.textContent = policyMessage;
      el.style.color = "var(--panel-warning)";
    }
    if (!policyMessage && runtime.isAutoRefreshOn && getEffectiveScanIntervalSeconds() > runtime.scanIntervalSeconds) {
      el.textContent = "Reduced · " + getEffectiveScanIntervalSeconds() / 60 + "m";
    }
    el.title = runtime.sessionStorageNotice || (policyMessage ? policyMessage + ". " : "") + source + (sample ? ": " + new Date(sample.timestamp).toISOString() : "") + ". Age of the last accepted sample. " + (runtime.isAutoRefreshOn ? "Next attempt: " + runtime.countdownSeconds + "s." : "Automatic scans paused.");
  }
  function updateCompactDashboard(frame) {
    if (!runtime.isMinimized) return;
    var comparison = !frame.isRestored && runtime.hasTrendBaseline ? getComparisonCounts().counts : null;
    var mode = runtime.trendComparisonMode === "last" ? "previous sample" : runtime.trendComparisonMode === "start" ? "first retained sample" : runtime.trendComparisonMode;
    function delta(id, value, old) {
      var el = document.getElementById(id);
      if (!el) return "";
      var change = comparison ? value - old : null;
      var text = change === null ? "" : change > 0 ? "+" + compactNumber(change) : change < 0 ? "−" + compactNumber(-change) : "0";
      el.textContent = text;
      el.style.color = change > 0 ? "var(--panel-delta-up)" : change < 0 ? "var(--panel-delta-down)" : "var(--panel-warning)";
      el.title = change === null ? "Waiting for a fresh sample and comparison history" : "Change versus " + mode + ": " + change;
      return text;
    }
    delta("mini-withtokens-change", frame.withTokens, comparison && comparison.withTokens);
    delta("mini-total-change", frame.total, comparison && comparison.total);
    var roomChange = delta("mini-room-change", frame.fullRoomTotal, comparison && comparison.total + comparison.anonymous);
    var header = document.getElementById("header-text");
    if (header) {
      header.textContent = (runtime.isStopped ? "STOPPED: " : frame.isRestored ? "SAVED: " : "") + compactNumber(frame.fullRoomTotal);
      header.title = getModelName() + " — Room total: " + frame.fullRoomTotal.toLocaleString() + "; " + highDescription(getDisplayHigh(frame, "roomTotal", frame.fullRoomTotal)) + (roomChange ? "; change: " + roomChange + " versus " + mode : "");
    }
    ["withtokens", "total"].forEach(function(key) {
      var el = document.getElementById("mini-" + key);
      var value = key === "total" ? frame.total : frame.withTokens;
      if (el) {
        el.textContent = compactNumber(value);
        el.title = value.toLocaleString() + (key === "total" ? " registered users" : " users in token-classified tiers");
      }
    });
    var label = document.getElementById("mini-metric");
    var names = { room: "Room total", withTokens: "With Tokens", total: "Registered" };
    if (label) {
      label.textContent = (runtime.miniMetric === "room" ? "Room total" : runtime.miniMetric === "withTokens" ? "💎" : "📊") + " ▾";
      label.setAttribute("aria-label", names[runtime.miniMetric] + " chart. Activate to change metric.");
      label.title = "Click to cycle Room total, With Tokens, and Registered. Showing the last 15 recorded minutes.";
    }
    var high = document.getElementById("mini-high");
    var peak = getDisplayHigh(
      frame,
      runtime.miniMetric === "room" ? "roomTotal" : runtime.miniMetric,
      runtime.miniMetric === "room" ? frame.fullRoomTotal : frame[runtime.miniMetric]
    );
    if (high) {
      high.textContent = highLabel(peak, true);
      high.title = highDescription(peak) + ". Click to switch SH/ATH.";
      high.setAttribute("aria-label", high.title);
      high.setAttribute("aria-pressed", String(runtime.highMode === "ath"));
    }
    var canvas = document.getElementById("mini-chart");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var width = 140, height = 36, scale = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);
    var times = frame.history.timestamps;
    canvas.title = names[runtime.miniMetric] + " — last 15 recorded minutes; vertical scale fits the plotted values";
    if (!times.length) {
      bindChartInspection(canvas, { values: [], times: [], breaks: [], plot: { end: -1 }, width, label: names[runtime.miniMetric] });
      return;
    }
    var end = times[times.length - 1], start = end - 15 * 6e4;
    var breaks = getHistoryBreaks(frame.history);
    var points = [], firstVisible = times.findIndex(function(time) {
      return time >= start;
    });
    var firstDrawn = firstVisible > 0 && breaks[firstVisible] ? firstVisible - 1 : firstVisible;
    times.forEach(function(time, i) {
      if (i >= firstDrawn && time <= end) points.push({ time, move: breaks[i], value: runtime.miniMetric === "room" ? frame.history.total[i] + frame.history.anonymous[i] : frame.history[runtime.miniMetric][i] });
    });
    var values = points.map(function(p) {
      return p.value;
    });
    var firstIndex = points[0].time < start ? 1 : 0;
    var visibleValues = values.slice(firstIndex);
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    canvas.title += "; range " + min + "–" + max + "; " + visibleValues.length + " samples through " + new Date(end).toISOString() + ". Orange dashes: no samples recorded during the interval.";
    bindChartInspection(canvas, {
      values,
      times: points.map(function(p) {
        return p.time;
      }),
      breaks: points.map(function(p) {
        return p.move;
      }),
      firstIndex,
      plot: { min, max, end: points.length - 1, startTime: start, endTime: end },
      width,
      label: names[runtime.miniMetric]
    });
    points.forEach(function(point, i) {
      point.x = 2 + (point.time - start) / (15 * 6e4) * (width - 4);
      point.y = max === min ? height / 2 : height - 3 - (point.value - min) / (max - min) * (height - 6);
      point.move = i === 0 || point.move;
    });
    var color = runtime.miniMetric === "withTokens" ? "#ff69b4" : runtime.miniMetric === "total" ? themeColor("text") : "#69BE45";
    ctx.strokeStyle = color;
    ctx.save();
    ctx.beginPath();
    ctx.rect(2, 0, width - 2, height);
    ctx.clip();
    drawCanvasChart(ctx, points, color);
    ctx.restore();
    updateMiniFreshness();
  }

  // src/lifecycle.js
  function isAbsencePaused() {
    return runtime.absencePausedAt !== null && runtime.isPaused && runtime.isAutoRefreshOn && !runtime.isStopped;
  }
  function absencePauseDescription() {
    return "Recording and elapsed time paused after 15 minutes without the broadcaster. API return checks every minute, subject to retry restrictions. A confirmed return resumes recording. Automatic Stop at " + new Date(runtime.absencePausedAt + runtime.ABSENCE_STOP_MS).toLocaleString() + " (3 hours after auto-pause). Use Resume to keep recording during this absence.";
  }
  function getEffectiveScanIntervalSeconds() {
    if (isAbsencePaused()) return runtime.ABSENCE_CHECK_SECONDS;
    if (runtime.absenceOverrideActive) return runtime.scanIntervalSeconds;
    if (runtime.broadcasterAbsence.missing < 2 || runtime.broadcasterAbsence.since === null) return runtime.scanIntervalSeconds;
    return Math.max(runtime.scanIntervalSeconds, Date.now() - runtime.broadcasterAbsence.since >= 10 * 6e4 ? 300 : 120);
  }
  function nextBroadcasterAbsence(snapshot) {
    if (snapshot.source !== "API") return runtime.broadcasterAbsence;
    if (snapshot.users.some(function(user) {
      return user.isOwner === true;
    })) {
      runtime.absenceOverrideActive = false;
      return { since: null, missing: 0 };
    }
    if (runtime.absenceOverrideActive || !runtime.isAutoRefreshOn || runtime.isPaused || runtime.isStopped) return runtime.broadcasterAbsence;
    return {
      since: runtime.broadcasterAbsence.since === null ? Date.now() : runtime.broadcasterAbsence.since,
      missing: Math.min(1e6, runtime.broadcasterAbsence.missing + 1)
    };
  }
  function stopDescription() {
    return runtime.stopReason === "absence" ? runtime.absencePausedAt !== null ? "Stopped after 3 hours auto-paused for broadcaster absence" : "Stopped after 3 hours of broadcaster absence" : "Session stopped";
  }
  function checkAbsenceStop() {
    if (runtime.isStopped || !runtime.isAutoRefreshOn || runtime.absenceOverrideActive) return false;
    if (runtime.absencePausedAt === null && !runtime.isPaused && runtime.broadcasterAbsence.missing >= 2 && runtime.broadcasterAbsence.since !== null && Date.now() - runtime.broadcasterAbsence.since >= runtime.ABSENCE_PAUSE_MS) {
      runtime.absencePausedAt = runtime.broadcasterAbsence.since + runtime.ABSENCE_PAUSE_MS;
      runtime.scanEpoch++;
      runtime.isScanning = false;
      runtime.pausedElapsedTime = runtime.trackingStartTime ? Math.max(0, runtime.absencePausedAt - runtime.trackingStartTime) : 0;
      runtime.isPaused = true;
      if (runtime.trackingTimerInterval) clearInterval(runtime.trackingTimerInterval);
      runtime.trackingTimerInterval = null;
      runtime.pendingHistoryGap = true;
      cancelHighPulses();
      runtime.nextScanAt = Math.max(Date.now(), readRequestPolicy().until);
      updateTrackingTimer();
      updateStopControls();
      updateAcquisitionStatus();
      saveSession(getModelName());
    }
    if (isAbsencePaused() && Date.now() - runtime.absencePausedAt >= runtime.ABSENCE_STOP_MS) {
      stopTracking("absence");
      return true;
    }
    return false;
  }
  function updateStopControls() {
    var stop = document.getElementById("btn-control-stop");
    if (stop) {
      stop.disabled = runtime.isStopped;
      stop.style.opacity = runtime.isStopped ? "0.5" : "1";
    }
    ["btn-auto", "btn-control-auto"].forEach(function(id) {
      var button = document.getElementById(id);
      if (!button) return;
      button.innerHTML = runtime.isStopped ? "Start" : runtime.isAutoRefreshOn && !isAbsencePaused() ? "⏸" : "▶";
      button.title = runtime.isStopped ? "Start a new session (keeps this stopped record until normal cleanup)" : isAbsencePaused() ? "Resume recording now; cancel absence slowdown, automatic pause and Stop until the broadcaster returns" : runtime.isAutoRefreshOn ? "Pause scans and elapsed time" : "Resume this session";
      button.setAttribute("aria-label", runtime.isStopped ? "Start a new session" : isAbsencePaused() ? "Resume recording" : runtime.isAutoRefreshOn ? "Pause scans" : "Resume scans");
      button.style.background = runtime.isStopped ? "#4169E1" : isAbsencePaused() ? "#b86b00" : runtime.isAutoRefreshOn ? "#32CD32" : "#ff4444";
    });
  }
  function stopTracking(reason) {
    if (runtime.isStopped) return;
    runtime.stopReason = reason === "absence" ? "absence" : "manual";
    runtime.stoppedAt = runtime.stopReason === "absence" && runtime.broadcasterAbsence.since !== null ? Math.min(Date.now(), (runtime.absencePausedAt !== null ? runtime.absencePausedAt : runtime.broadcasterAbsence.since) + runtime.ABSENCE_STOP_MS) : Date.now();
    runtime.isStopped = true;
    runtime.scanEpoch++;
    runtime.isScanning = false;
    runtime.isAutoRefreshOn = false;
    stopCountdown();
    runtime.nextScanAt = 0;
    if (!runtime.isPaused) runtime.pausedElapsedTime = runtime.trackingStartTime ? Math.max(0, runtime.stoppedAt - runtime.trackingStartTime) : 0;
    runtime.isPaused = true;
    if (runtime.trackingTimerInterval) clearInterval(runtime.trackingTimerInterval);
    runtime.trackingTimerInterval = null;
    runtime.pendingHistoryGap = false;
    cancelHighPulses();
    updateTrackingTimer();
    updateStopControls();
    updateDisplay();
    updateCountdownDisplay();
    updateAcquisitionStatus();
    saveSession(getModelName());
  }
  function startNewSession() {
    if (!runtime.isStopped) return;
    if (!confirm("Start a new session?\n\nThe chart and elapsed time will start from zero. Export this stopped session first if you want to keep a report, CSV or GIF. Its saved record is retained until normal storage cleanup.")) return;
    saveSession(getModelName());
    runtime.tabRecords.delete(getStorageKey(getModelName()));
    runtime.isAutoRefreshOn = true;
    resetTrackingData(false);
  }
  function updateTrackingTimer() {
    var controlTimerEl = document.getElementById("control-tracking-timer");
    var displayTime = "00:00:00";
    var displayColor = "var(--panel-subtle)";
    if (runtime.isPaused) {
      displayTime = formatElapsedTime(runtime.pausedElapsedTime);
      displayColor = "var(--panel-negative)";
    } else if (runtime.trackingStartTime) {
      displayTime = formatElapsedTime(Date.now() - runtime.trackingStartTime);
      displayColor = "var(--panel-warning)";
    }
    if (controlTimerEl) {
      controlTimerEl.textContent = displayTime;
      controlTimerEl.style.color = displayColor;
    }
    checkTrendAutoEscalation();
  }
  function startTrackingTimer() {
    if (runtime.isStopped) return;
    if (runtime.sessionStartedAt === null) runtime.sessionStartedAt = Date.now();
    if (runtime.isPaused) {
      runtime.isPaused = false;
      runtime.trackingStartTime = Date.now() - runtime.pausedElapsedTime;
    } else if (!runtime.trackingStartTime) {
      runtime.trackingStartTime = Date.now();
    }
    if (runtime.trackingTimerInterval) {
      clearInterval(runtime.trackingTimerInterval);
      runtime.trackingTimerInterval = null;
    }
    runtime.trackingTimerInterval = setInterval(updateTrackingTimer, 1e3);
    updateTrackingTimer();
    saveSession(getModelName());
  }
  function pauseTrackingTimer() {
    if (runtime.isPaused) return;
    runtime.pendingHistoryGap = true;
    runtime.isPaused = true;
    runtime.pausedElapsedTime = runtime.trackingStartTime ? Math.max(0, Date.now() - runtime.trackingStartTime) : 0;
    if (runtime.trackingTimerInterval) {
      clearInterval(runtime.trackingTimerInterval);
      runtime.trackingTimerInterval = null;
    }
    updateTrackingTimer();
    saveSession(getModelName());
  }
  function stopTrackingTimer() {
    if (runtime.trackingTimerInterval) {
      clearInterval(runtime.trackingTimerInterval);
      runtime.trackingTimerInterval = null;
    }
    runtime.trackingStartTime = null;
    runtime.sessionStartedAt = null;
    runtime.sessionStartEstimated = false;
    runtime.sessionHighs = {};
    runtime.pausedElapsedTime = 0;
    runtime.isPaused = false;
    runtime.roomTotalHighTime = null;
    runtime.tierHighTimes = {};
    runtime.withTokensHighTime = null;
    runtime.totalHighTime = null;
    runtime.anonHighTime = null;
    runtime.femaleTransHighTime = null;
    runtime.previousCounts = {
      "red": 0,
      "green": 0,
      "purple": 0,
      "pink": 0,
      "dark-blue": 0,
      "light-blue": 0,
      "gray": 0,
      "female-trans": 0,
      "withTokens": 0,
      "total": 0,
      "anonymous": 0
    };
    runtime.hasTrendBaseline = false;
    runtime.trendComparisonMode = "last";
    runtime.autoTrendEscalation = true;
    runtime.newHighTiers = {};
    updateTrackingTimer();
  }
  function resetAllTracking() {
    if (!confirm("Reset all tracking data?\n\nThis will clear:\n- All session history\n- Trend tracking\n- Elapsed timer\n\nA new scan will start immediately.")) {
      return;
    }
    resetTrackingData(true);
  }
  function resetTrackingData(deleteSaved) {
    var modelName = getModelName();
    leavePlayback(false);
    cancelGifExport();
    log("Performing main reset...");
    if (deleteSaved) deleteSession(modelName);
    runtime.isStopped = false;
    runtime.stoppedAt = null;
    runtime.stopReason = null;
    runtime.broadcasterAbsence = { since: null, missing: 0 };
    runtime.absencePausedAt = null;
    runtime.absenceOverrideActive = false;
    runtime.activeSessionStorageKey = getStorageKey(modelName);
    runtime.scanEpoch++;
    runtime.isScanning = false;
    stopCountdown();
    stopTrackingTimer();
    runtime.isPaused = !runtime.isAutoRefreshOn;
    runtime.users.clear();
    runtime.lastAcceptedAcquisition = null;
    runtime.restoredDisplayFrame = null;
    runtime.lastAcquisitionAttemptSource = "API";
    runtime.domHealthStatus.consecutiveFailures = 0;
    updateAcquisitionStatus();
    runtime.previousUserCount = 0;
    runtime.previousRoomTotal = 0;
    runtime.roomTotal = 0;
    runtime.roomTotalHigh = 0;
    runtime.previousCounts = {
      "red": 0,
      "green": 0,
      "purple": 0,
      "pink": 0,
      "dark-blue": 0,
      "light-blue": 0,
      "gray": 0,
      "female-trans": 0,
      "withTokens": 0,
      "total": 0,
      "anonymous": 0
    };
    runtime.hasTrendBaseline = false;
    runtime.trendComparisonMode = "last";
    runtime.autoTrendEscalation = true;
    runtime.newHighTiers = {};
    runtime.history = {
      timestamps: [],
      "red": [],
      "green": [],
      "purple": [],
      "pink": [],
      "dark-blue": [],
      "light-blue": [],
      "gray": [],
      "female-trans": [],
      "withTokens": [],
      "total": [],
      "anonymous": []
    };
    runtime.roomTotalHighTime = null;
    runtime.tierHighTimes = {};
    runtime.withTokensHighTime = null;
    runtime.totalHighTime = null;
    runtime.anonHighTime = null;
    runtime.femaleTransHighTime = null;
    resetCountdown();
    updateDisplay();
    updateTrendDisplay();
    updateTrackingTimer();
    updateCountdownDisplay();
    drawAllSparklines();
    if (runtime.isAutoRefreshOn) {
      startTrackingTimer();
      startCountdown();
    }
    saveSession(modelName);
    var resetContext = { epoch: runtime.scanEpoch, generation: runtime.initGuard, url: location.href };
    setTimeout(function() {
      if (isAcquisitionCurrent(resetContext)) performScanThenReturn(true);
    }, 500);
    updateTrendPresetButtons();
    updateAutoTrendButton();
    updateStopControls();
    log("Reset complete - starting fresh scan (epoch: " + runtime.scanEpoch + ")");
  }
  function resetCountdown() {
    runtime.lastScheduledIntervalSeconds = getEffectiveScanIntervalSeconds();
    runtime.countdownSeconds = runtime.lastScheduledIntervalSeconds;
    runtime.nextScanAt = runtime.isStopped ? 0 : Math.max(Date.now() + runtime.lastScheduledIntervalSeconds * 1e3, readRequestPolicy().until);
    updateCountdownDisplay();
  }
  function updateCountdownDisplay() {
    if (checkAbsenceStop()) return;
    var policy = readRequestPolicy();
    if (policy.blocked && runtime.isAutoRefreshOn) pauseForAccessRestriction();
    var policyMessage = requestPolicyMessage(policy);
    if (runtime.isAutoRefreshOn && policy.until > runtime.nextScanAt) runtime.nextScanAt = policy.until;
    updateMiniFreshness();
    if (runtime.isAutoRefreshOn && !runtime.isScanning && runtime.nextScanAt) {
      runtime.countdownSeconds = Math.max(0, Math.ceil((runtime.nextScanAt - Date.now()) / 1e3));
    }
    var fallbackWait = getDOMFallbackWaitSeconds(getModelName());
    var timingTitle = "Next API attempt after the countdown. " + (fallbackWait > 0 ? "DOM fallback eligible in " + fallbackWait + "s if the API fails." : "DOM fallback eligible if the API fails.");
    var statusEl = document.getElementById("auto-status");
    var timerDisplay = document.getElementById("timer-display");
    var expandedCountdown = document.getElementById("expanded-countdown");
    var controlNextScan = document.getElementById("control-next-scan");
    if (runtime.isStopped) {
      [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
        if (el) {
          el.textContent = "Stopped";
          el.title = stopDescription();
          el.style.color = "var(--panel-muted)";
        }
      });
      updateStopControls();
      return;
    }
    if (isAbsencePaused()) {
      if (timerDisplay) timerDisplay.textContent = runtime.scanIntervalSeconds + "s";
      [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
        if (!el) return;
        el.textContent = policyMessage || (el === statusEl ? "Auto-paused" : runtime.isScanning ? "Checking..." : "Check: " + runtime.countdownSeconds + "s");
        el.title = absencePauseDescription() + (policyMessage ? " " + policyMessage + "." : " Next return check: " + runtime.countdownSeconds + "s.");
        el.style.color = "var(--panel-warning)";
      });
      updateStopControls();
      return;
    }
    var effectiveInterval = getEffectiveScanIntervalSeconds();
    var reduced = effectiveInterval > runtime.scanIntervalSeconds;
    timingTitle += " Selected interval: " + runtime.scanIntervalSeconds + "s. Effective interval: " + effectiveInterval + "s." + (reduced ? " Reduced scanning while the broadcaster is absent; auto-pause at 15 minutes, then return checks for up to 3 hours." : "") + (runtime.absenceOverrideActive ? " Absence automation manually overridden until the broadcaster is detected again." : "");
    [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
      if (el) el.title = runtime.isAutoRefreshOn ? timingTitle : "Automatic scans paused. An in-flight scan may finish. " + timingTitle;
    });
    if (timerDisplay) {
      timerDisplay.textContent = runtime.scanIntervalSeconds + "s";
    }
    if (expandedCountdown) {
      if (runtime.isScanning) {
        expandedCountdown.textContent = "scanning...";
        expandedCountdown.style.color = "var(--panel-warning)";
      } else if (runtime.isAutoRefreshOn) {
        expandedCountdown.textContent = "next: " + runtime.countdownSeconds + "s";
        expandedCountdown.style.color = "var(--panel-positive)";
      } else {
        expandedCountdown.textContent = "paused";
        expandedCountdown.style.color = "var(--panel-negative)";
      }
    }
    if (controlNextScan) {
      if (runtime.isScanning) {
        controlNextScan.textContent = "Scanning...";
        controlNextScan.style.color = "var(--panel-warning)";
      } else if (runtime.isAutoRefreshOn) {
        controlNextScan.textContent = (reduced ? "Reduced: " : "Next: ") + runtime.countdownSeconds + "s";
        controlNextScan.style.color = "var(--panel-positive)";
      } else {
        controlNextScan.textContent = "Paused";
        controlNextScan.style.color = "var(--panel-negative)";
      }
    }
    if (policyMessage) {
      [statusEl, expandedCountdown, controlNextScan].forEach(function(el) {
        if (!el) return;
        el.textContent = policyMessage;
        el.style.color = "var(--panel-warning)";
        el.title = policyMessage + (policy.blocked ? ". Automatic scans stopped. After resolving access, use Resume to retry." : ". No API or DOM acquisition before " + new Date(policy.until).toLocaleString() + ".");
      });
      return;
    }
    if (!statusEl) return;
    if (runtime.isScanning) {
      statusEl.textContent = "Scanning...";
      statusEl.style.color = "var(--panel-warning)";
    } else if (runtime.isAutoRefreshOn) {
      statusEl.textContent = "Next: " + runtime.countdownSeconds + "s";
      statusEl.style.color = "var(--panel-positive)";
    } else {
      statusEl.textContent = "Auto: OFF";
      statusEl.style.color = "var(--panel-negative)";
    }
  }
  function adjustTimer(delta) {
    var newValue = runtime.scanIntervalSeconds + delta;
    if (newValue < 30) runtime.scanIntervalSeconds = 30;
    else if (newValue > 300) runtime.scanIntervalSeconds = 300;
    else runtime.scanIntervalSeconds = newValue;
    if (runtime.isAutoRefreshOn) {
      stopCountdown();
      resetCountdown();
      startCountdown();
    } else {
      resetCountdown();
      var timerDisplay = document.getElementById("timer-display");
      if (timerDisplay) {
        timerDisplay.textContent = runtime.scanIntervalSeconds + "s";
      }
    }
    updateCountdownDisplay();
  }
  function startCountdown() {
    if (runtime.isStopped) return;
    if (runtime.countdownInterval) {
      clearInterval(runtime.countdownInterval);
      runtime.countdownInterval = null;
    }
    if (!runtime.nextScanAt) resetCountdown();
    updateCountdownDisplay();
    if (runtime.isStopped) return;
    runtime.countdownInterval = setInterval(function() {
      if (!runtime.isAutoRefreshOn || runtime.isScanning) return;
      updateCountdownDisplay();
      if (runtime.countdownSeconds <= 0) {
        performScanThenReturn(true);
      }
    }, 1e3);
  }
  function stopCountdown() {
    if (runtime.countdownInterval) {
      clearInterval(runtime.countdownInterval);
      runtime.countdownInterval = null;
    }
  }
  function pauseAutoRefresh() {
    if (runtime.isStopped) return;
    if (isAbsencePaused()) {
      runtime.scanEpoch++;
      runtime.isScanning = false;
    }
    runtime.absencePausedAt = null;
    runtime.broadcasterAbsence = { since: null, missing: 0 };
    runtime.isAutoRefreshOn = false;
    stopCountdown();
    pauseTrackingTimer();
    updateStopControls();
    updateCountdownDisplay();
    updateAcquisitionStatus();
    saveSession(getModelName());
  }
  function toggleAutoRefresh() {
    if (runtime.isStopped) {
      startNewSession();
      return;
    }
    if (checkAbsenceStop()) return;
    var overridingAbsence = isAbsencePaused();
    if (runtime.isAutoRefreshOn && !overridingAbsence) {
      pauseAutoRefresh();
      return;
    }
    if (overridingAbsence) {
      runtime.scanEpoch++;
      runtime.isScanning = false;
      runtime.absenceOverrideActive = true;
    }
    runtime.absencePausedAt = null;
    runtime.broadcasterAbsence = { since: null, missing: 0 };
    var policy = readRequestPolicy();
    if (policy.blocked) {
      writeRequestPolicy({ until: policy.serverUntil || 0, serverUntil: policy.serverUntil || 0, failures: 0, blocked: 0, status: 0, revision: "" });
    }
    runtime.isAutoRefreshOn = true;
    startTrackingTimer();
    startCountdown();
    performScanThenReturn(true);
    updateStopControls();
    updateAcquisitionStatus();
    saveSession(getModelName());
  }

  // src/dom.js
  function validateDOMHealth() {
    const now = Date.now();
    const container = document.getElementById("tracker-container");
    const userListTab = document.querySelector(runtime.DOM_SELECTORS.userListTab);
    const hasUserList = !!userListTab;
    let hasUsernameElements = false;
    for (let i = 0; i < runtime.DOM_SELECTORS.usernameElements.length; i++) {
      if (document.querySelector(runtime.DOM_SELECTORS.usernameElements[i])) {
        hasUsernameElements = true;
        break;
      }
    }
    const health = {
      timestamp: now,
      userListTab: hasUserList,
      usernameElements: hasUsernameElements,
      container: !!container,
      roomTotalSelectors: runtime.DOM_SELECTORS.roomTotal.some((sel) => !!document.querySelector(sel))
    };
    const wasHealthy = runtime.domHealthStatus.isHealthy;
    runtime.domHealthStatus.isHealthy = health.userListTab && health.usernameElements;
    runtime.domHealthStatus.lastCheck = now;
    runtime.domHealthStatus.userListTabFound = hasUserList;
    if (!runtime.domHealthStatus.isHealthy) {
      runtime.domHealthStatus.consecutiveFailures++;
      if (runtime.domHealthStatus.consecutiveFailures === 1 || runtime.domHealthStatus.consecutiveFailures % 10 === 0) {
        console.warn("[TierScope " + runtime.TIERSCOPE_VERSION + "] DOM health check failed:", health);
        if (container) {
          const statusEl = document.getElementById("auto-status");
          if (statusEl) {
            statusEl.textContent = "DOM mismatch - check console";
            statusEl.style.color = "var(--panel-negative)";
          }
        }
      }
      if (runtime.domHealthStatus.consecutiveFailures > 5 && runtime.isAutoRefreshOn) {
        console.warn("[TierScope " + runtime.TIERSCOPE_VERSION + "] Auto-pausing due to DOM health issues");
        pauseAutoRefresh();
      }
    } else {
      if (!wasHealthy && runtime.domHealthStatus.consecutiveFailures > 0) {
        console.log("[TierScope " + runtime.TIERSCOPE_VERSION + "] DOM health restored");
        const statusEl = document.getElementById("auto-status");
        if (statusEl && runtime.isAutoRefreshOn) {
          statusEl.textContent = "Next: " + runtime.countdownSeconds + "s";
          statusEl.style.color = "var(--panel-positive)";
        }
      }
      runtime.domHealthStatus.consecutiveFailures = 0;
    }
    return health;
  }
  function getTierFromClassList(classList) {
    for (var i = 0; i < classList.length; i++) {
      var className = classList[i];
      var lower = className.toLowerCase();
      if (className === "tippedTonsRecently" || lower === "tippedtonsrecently") return "purple";
      if (className === "tippedALotRecently" || lower === "tippedalotrecently") return "pink";
      if (className === "tippedRecently" || lower === "tippedrecently") return "dark-blue";
      if (className === "inFanClub" || lower === "infanclub") return "green";
      if (className === "mod" || lower === "moderator") return "red";
      if (className === "hasTokens" || lower === "hastokens") return "light-blue";
      if (className === "defaultUser" || lower === "defaultuser") return "gray";
    }
    return null;
  }
  function getTierFromElement(el) {
    var tier = getTierFromClassList(el.classList);
    if (tier) return tier;
    var parent = el.parentElement;
    for (var i = 0; i < 4 && parent; i++) {
      tier = getTierFromClassList(parent.classList);
      if (tier) return tier;
      parent = parent.parentElement;
    }
    return "gray";
  }
  function getGenderFromElement(el) {
    var genderImg = el.querySelector('img[data-testid="gender-icon"], img[title="Trans"], img[title="Female"], img[title="Male"], img[title="Couple"]');
    if (!genderImg) {
      var parent = el.parentElement;
      for (var i = 0; i < 3 && parent; i++) {
        genderImg = parent.querySelector('img[data-testid="gender-icon"], img[title="Trans"], img[title="Female"], img[title="Male"], img[title="Couple"]');
        if (genderImg) break;
        parent = parent.parentElement;
      }
    }
    if (genderImg) {
      var src = genderImg.src || "";
      var title = genderImg.title || "";
      if (src.indexOf("female") !== -1 || title === "Female") return "female";
      if (src.indexOf("trans") !== -1 || title === "Trans") return "trans";
      if (src.indexOf("male") !== -1 || title === "Male") return "male";
      if (src.indexOf("couple") !== -1 || title === "Couple") return "couple";
    }
    return "unknown";
  }
  function getRoomTotal() {
    for (var i = 0; i < runtime.DOM_SELECTORS.roomTotal.length; i++) {
      var el = document.querySelector(runtime.DOM_SELECTORS.roomTotal[i]);
      if (el) {
        var text = el.textContent || "";
        var match = text.match(/USERS\s*\(?(\d[\d,]*)\)?/i);
        if (match) return parseInt(match[1].replace(/,/g, ""));
      }
    }
    return 0;
  }
  function getAnonymousCount() {
    if (runtime.lastAcceptedAcquisition && runtime.lastAcceptedAcquisition.source === "API") {
      return runtime.lastAcceptedAcquisition.api.anonymousCount;
    }
    var tracked = runtime.users.size;
    if (runtime.roomTotal > tracked) return runtime.roomTotal - tracked;
    return 0;
  }
  function extractUsername(text) {
    if (!text) return null;
    text = text.trim().split("\n")[0];
    var match = text.match(/^([^\s\(\[\<\,]+)/);
    if (match) {
      var candidate = match[1].trim();
      if (candidate.length >= 2 && candidate.length <= 30) {
        var clean = candidate.replace(/[^\w\-]+$/, "");
        if (clean.length >= 2) return clean;
      }
    }
    return null;
  }
  function findTab(tabName) {
    var selectors = runtime.DOM_SELECTORS.tabs[tabName.toLowerCase()] || [];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    var buttons = document.querySelectorAll('button, div[role="tab"]');
    for (var j = 0; j < buttons.length; j++) {
      var btn = buttons[j];
      var text = (btn.textContent || "").toUpperCase();
      if (text.indexOf(tabName.toUpperCase()) !== -1) return btn;
    }
    return null;
  }
  function isScanValid(newUserCount, newRoomTotal) {
    if (runtime.previousRoomTotal === 0) return true;
    if (newRoomTotal === 0 && runtime.previousRoomTotal > 0) {
      log("Scan rejected: room total is 0 but previous was " + runtime.previousRoomTotal);
      return false;
    }
    var roomTotalChange = Math.abs(newRoomTotal - runtime.previousRoomTotal) / runtime.previousRoomTotal;
    if (roomTotalChange > 0.1) return true;
    var userDrop = runtime.previousUserCount > 0 ? (runtime.previousUserCount - newUserCount) / runtime.previousUserCount : 0;
    if (userDrop > 0.5) {
      log("Scan rejected: user count dropped " + Math.round(userDrop * 100) + "% (" + runtime.previousUserCount + " -> " + newUserCount + ") while room total stable (" + runtime.previousRoomTotal + " -> " + newRoomTotal + ")");
      return false;
    }
    return true;
  }
  function scanUsers() {
    var userListTab = document.querySelector(runtime.DOM_SELECTORS.userListTab);
    if (!userListTab) throw new Error("UserListTab not found");
    var snapshotUsers = /* @__PURE__ */ new Map();
    var snapshotRoomTotal = getRoomTotal();
    if (!snapshotRoomTotal) throw new Error("DOM room total missing or zero");
    var userElements = [];
    for (var i = 0; i < runtime.DOM_SELECTORS.usernameElements.length; i++) {
      var found = userListTab.querySelectorAll(runtime.DOM_SELECTORS.usernameElements[i]);
      for (var j = 0; j < found.length; j++) {
        userElements.push(found[j]);
      }
    }
    for (var i = 0; i < userElements.length; i++) {
      var el = userElements[i];
      var rawText = (el.textContent || "").trim() || (el.getAttribute("data-username") || "").trim();
      var username = extractUsername(rawText);
      if (username && !snapshotUsers.has(username)) {
        var tier = getTierFromElement(el);
        var gender = getGenderFromElement(el);
        snapshotUsers.set(username, {
          username,
          rawClass: null,
          tier,
          genderCode: null,
          gender,
          rawFlag: null,
          isOwner: null
        });
      }
    }
    if (!snapshotUsers.size) throw new Error("DOM sample contains no readable users");
    return {
      source: "DOM",
      timestamp: Date.now(),
      roomTotal: snapshotRoomTotal,
      users: Array.from(snapshotUsers.values())
    };
  }

  // src/layout.js
  function loadCollapsedRows() {
    try {
      var raw = GM_getValue(runtime.COLLAPSED_ROWS_KEY, null);
      if (raw !== null && typeof raw !== "undefined") {
        var saved = JSON.parse(raw);
        if (!Array.isArray(saved) || !saved.every(function(key) {
          return runtime.PANEL_ROWS.some(function(row) {
            return row.key === key;
          });
        })) throw new Error("Invalid collapsed-row preferences");
        return new Set(saved);
      }
    } catch (error) {
      log("Could not restore row preferences: " + error.message);
    }
    return /* @__PURE__ */ new Set(["red", "green"]);
  }
  function panelRowMarker(row) {
    return row.icon || getTierMarker(row.key);
  }
  function collapseMarkerHtml(key) {
    var row = runtime.PANEL_ROWS.find(function(item) {
      return item.key === key;
    });
    return '<button type="button" class="tier-collapse-marker" id="collapse-row-' + key + '" aria-controls="tier-row-' + key + '" aria-expanded="true" aria-label="Collapse ' + row.label + ' row" title="Collapse ' + row.label + ' row" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:24px;padding:0;border:0;border-radius:3px;background:transparent;color:inherit;font-size:14px;line-height:1;cursor:pointer;">' + panelRowMarker(row) + "</button>";
  }
  function collapsedTrayHtml() {
    return '<div id="collapsed-tier-tray" role="group" aria-label="Collapsed rows. Click an icon to restore its row." style="display:none;flex-wrap:wrap;align-items:center;gap:3px;margin-bottom:4px;">' + runtime.PANEL_ROWS.map(function(row) {
      return '<button type="button" id="restore-row-' + row.key + '" aria-controls="tier-row-' + row.key + '" aria-expanded="false" aria-label="Restore ' + row.label + ' row" title="Restore ' + row.label + ' row" style="display:none;align-items:center;justify-content:center;flex:0 0 22px;width:22px;height:22px;box-sizing:border-box;padding:0;border:1px solid ' + (row.key === "total" ? "var(--panel-text)" : row.color) + ';border-radius:3px;background:rgba(var(--panel-row-rgb),0.05);color:var(--panel-text);font-size:12px;line-height:1;cursor:pointer;">' + panelRowMarker(row) + "</button>";
    }).join("") + "</div>";
  }
  function applyRowLayout() {
    runtime.chartLayoutRevision++;
    var region = document.getElementById("tier-chart-region");
    var tray = document.getElementById("collapsed-tier-tray");
    var group = document.getElementById("summary-tier-rows");
    var measurable = region && region.offsetHeight > 0;
    var visibleCount = runtime.PANEL_ROWS.length - runtime.collapsedRows.size;
    if (region) region.style.height = "auto";
    runtime.PANEL_ROWS.forEach(function(row) {
      runtime.panelChartHeights[row.key] = row.height;
      var canvas = document.getElementById("spark-" + row.key);
      if (canvas) canvas.style.height = row.height + "px";
      var element = document.getElementById("tier-row-" + row.key);
      if (measurable && element) element.style.display = row.display;
    });
    if (measurable && tray) tray.style.display = "none";
    if (measurable && group) group.style.display = "block";
    if (measurable) {
      runtime.PANEL_ROWS.forEach(function(row) {
        var canvas = document.getElementById("spark-" + row.key);
        if (!canvas) return;
        var parent = canvas.parentElement;
        var style = window.getComputedStyle(parent);
        var minimum = parent.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
        runtime.panelChartHeights[row.key] = Math.max(row.height, minimum);
        canvas.style.height = runtime.panelChartHeights[row.key] + "px";
      });
      if (runtime.panelChartRegionHeight === null) runtime.panelChartRegionHeight = region.offsetHeight;
    }
    if (tray) tray.style.display = runtime.collapsedRows.size ? "flex" : "none";
    runtime.PANEL_ROWS.forEach(function(row) {
      var collapsed = runtime.collapsedRows.has(row.key);
      var element = document.getElementById("tier-row-" + row.key);
      if (element) element.style.display = collapsed ? "none" : row.display;
      var restore = document.getElementById("restore-row-" + row.key);
      if (restore) restore.style.display = collapsed ? "inline-flex" : "none";
      var collapse = document.getElementById("collapse-row-" + row.key);
      if (collapse) collapse.setAttribute("aria-expanded", String(!collapsed));
    });
    if (group) group.style.display = runtime.collapsedRows.has("withtokens") && runtime.collapsedRows.has("total") ? "none" : "block";
    var extra = measurable && visibleCount ? Math.max(0, runtime.panelChartRegionHeight - region.offsetHeight) / visibleCount : 0;
    runtime.PANEL_ROWS.forEach(function(row) {
      if (runtime.collapsedRows.has(row.key)) return;
      runtime.panelChartHeights[row.key] += extra;
      var canvas = document.getElementById("spark-" + row.key);
      if (canvas) canvas.style.height = runtime.panelChartHeights[row.key] + "px";
    });
    if (region && visibleCount && runtime.panelChartRegionHeight !== null) {
      region.style.height = runtime.panelChartRegionHeight + "px";
    }
    runtime.rowLayoutNeedsMeasure = !measurable;
  }
  function setRowCollapsed(key, collapsed) {
    cancelHighPulse(key);
    if (!runtime.PANEL_ROWS.some(function(row) {
      return row.key === key;
    })) return;
    if (collapsed) runtime.collapsedRows.add(key);
    else runtime.collapsedRows.delete(key);
    try {
      GM_setValue(runtime.COLLAPSED_ROWS_KEY, JSON.stringify(Array.from(runtime.collapsedRows)));
    } catch (error) {
      log("Could not save row preferences: " + error.message);
    }
    applyRowLayout();
    if (runtime.presentationMode === "PLAYBACK") {
      paintPlayback(runtime.playback);
    } else {
      updateDisplay();
      drawAllSparklines();
    }
    constrainPanelPosition();
    var target = document.getElementById((collapsed ? "restore-row-" : "collapse-row-") + key);
    if (target) target.focus({ preventScroll: true });
  }
  function bindRowControls() {
    runtime.panelChartRegionHeight = null;
    runtime.PANEL_ROWS.forEach(function(row) {
      [false, true].forEach(function(collapsed) {
        var button = document.getElementById((collapsed ? "collapse-row-" : "restore-row-") + row.key);
        if (button) button.onclick = function(event) {
          event.stopPropagation();
          setRowCollapsed(row.key, collapsed);
        };
      });
    });
    var container = document.getElementById("tracker-container");
    if (container) container.addEventListener("transitionend", function(event) {
      if (event.target === container && event.propertyName === "width") {
        redrawPanelCharts();
        constrainPanelPosition();
      }
    });
    applyRowLayout();
  }
  function redrawPanelCharts() {
    if (runtime.isMinimized) return;
    runtime.chartLayoutRevision++;
    if (runtime.presentationMode === "PLAYBACK") paintPlayback(runtime.playback);
    else drawAllSparklines();
  }
  function updateCollapsedRowStatus(frame, highlights) {
    runtime.PANEL_ROWS.forEach(function(row) {
      var button = document.getElementById("restore-row-" + row.key);
      if (!button) return;
      var value = row.key === "withtokens" ? frame.withTokens : row.key === "total" ? frame.total : row.key === "anon" ? frame.anonymousCount : frame.counts[row.key];
      var historyKey = row.key === "withtokens" ? "withTokens" : row.key === "anon" ? "anonymous" : row.key;
      var high = getDisplayHigh(frame, historyKey, value);
      var context = frame.isPlayback ? "Replay" : frame.isRestored ? "Saved sample" : "Latest sample";
      button.title = row.label + ": " + value.toLocaleString() + " (" + highLabel(high) + "). " + highDescription(high) + ". " + context + ". Click to restore row.";
      button.setAttribute("aria-label", "Restore " + row.label + " row. " + context + ": " + value.toLocaleString());
      button.style.background = highlights && highlights[historyKey] ? "rgba(50, 205, 50, 0.22)" : "rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)))";
    });
  }
  function cleanupDragListeners() {
    for (var i = 0; i < runtime.dragListeners.length; i++) {
      var listener = runtime.dragListeners[i];
      document.removeEventListener(listener.type, listener.fn, listener.options);
    }
    runtime.dragListeners = [];
  }
  function addDragListener(type, fn, options) {
    document.addEventListener(type, fn, options);
    runtime.dragListeners.push({ type, fn, options });
  }
  function loadPanelGeometry() {
    try {
      var raw = GM_getValue(runtime.PANEL_GEOMETRY_KEY, null);
      if (raw === null) return null;
      var data = JSON.parse(raw);
      if (!data || !Number.isFinite(data.left) || !Number.isFinite(data.top) || !Number.isFinite(data.scale) || data.scale < 0.5 || data.scale > 3) return null;
      return { left: data.left, top: data.top, scale: data.scale };
    } catch (error) {
      return null;
    }
  }
  function constrainPanelPosition() {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    var rect = container.getBoundingClientRect();
    container.style.left = Math.max(0, Math.min(rect.left, Math.max(0, window.innerWidth - rect.width))) + "px";
    container.style.top = Math.max(0, Math.min(rect.top, Math.max(0, window.innerHeight - rect.height))) + "px";
    container.style.right = "auto";
  }
  function savePanelGeometry() {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    var rect = container.getBoundingClientRect();
    runtime.panelGeometry = { left: rect.left, top: rect.top, scale: runtime.currentScale };
    try {
      GM_setValue(runtime.PANEL_GEOMETRY_KEY, JSON.stringify(runtime.panelGeometry));
    } catch (error) {
      log("Could not save panel position/scale: " + error.message);
    }
  }
  function restorePanelGeometry() {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    if (runtime.panelGeometry) {
      container.style.left = runtime.panelGeometry.left + "px";
      container.style.top = runtime.panelGeometry.top + "px";
      container.style.right = "auto";
      applyScale(runtime.panelGeometry.scale);
    } else applyScale(runtime.currentScale);
    constrainPanelPosition();
    redrawPanelCharts();
  }
  function restoreStandardSize() {
    applyScale(1);
    redrawPanelCharts();
    constrainPanelPosition();
    savePanelGeometry();
  }
  function applyScale(scale) {
    runtime.currentScale = scale;
    var container = document.getElementById("tracker-container");
    if (!container) return;
    container.style.transform = "scale(" + scale + ")";
    container.style.transformOrigin = "top left";
    container.dataset.scale = scale;
  }
  function setupResizable() {
    var container = document.getElementById("tracker-container");
    if (!container) return;
    var resizeHandle = document.createElement("div");
    resizeHandle.id = "resize-handle";
    resizeHandle.style.cssText = "position:absolute;top:0;left:0;width:16px;height:16px;background:linear-gradient(135deg, #ff69b4 50%, transparent 50%);cursor:nw-resize;z-index:999999;border-top-left-radius:6px;opacity:0.8;transition:opacity 0.2s;";
    resizeHandle.addEventListener("mouseenter", function() {
      this.style.opacity = "1";
    });
    resizeHandle.addEventListener("mouseleave", function() {
      this.style.opacity = "0.8";
    });
    container.appendChild(resizeHandle);
    var startResize = function(e) {
      if (runtime.isDragging) return;
      runtime.isResizing = true;
      runtime.resizeStartX = e.clientX;
      runtime.resizeStartY = e.clientY;
      var rect = container.getBoundingClientRect();
      runtime.resizeStartWidth = rect.width;
      runtime.resizeStartHeight = rect.height;
      e.preventDefault();
      e.stopPropagation();
    };
    var doResize = function(e) {
      if (!runtime.isResizing) return;
      var deltaX = runtime.resizeStartX - e.clientX;
      var deltaY = runtime.resizeStartY - e.clientY;
      var newWidth = runtime.resizeStartWidth + deltaX;
      var baseWidth = container.offsetWidth;
      var newScale = Math.max(0.5, Math.min(3, newWidth / baseWidth));
      applyScale(newScale);
    };
    var stopResize = function() {
      if (!runtime.isResizing) return;
      runtime.isResizing = false;
      redrawPanelCharts();
      constrainPanelPosition();
      savePanelGeometry();
    };
    resizeHandle.addEventListener("mousedown", startResize);
    document.addEventListener("mousemove", doResize);
    document.addEventListener("mouseup", stopResize);
    window._trackerResizeCleanup = function() {
      resizeHandle.removeEventListener("mousedown", startResize);
      document.removeEventListener("mousemove", doResize);
      document.removeEventListener("mouseup", stopResize);
    };
  }
  function setupResizeHandler() {
    if (runtime.windowResizeHandler) {
      window.removeEventListener("resize", runtime.windowResizeHandler);
      runtime.windowResizeHandler = null;
    }
    var resizeTimeout;
    runtime.windowResizeHandler = function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        constrainPanelPosition();
        redrawPanelCharts();
      }, 100);
    };
    window.addEventListener("resize", runtime.windowResizeHandler);
  }
  function setupDraggable() {
    var container = document.getElementById("tracker-container");
    var dragHandle = document.getElementById("drag-handle");
    if (!container || !dragHandle) return;
    var startDrag = function(e) {
      if (runtime.isResizing || e.target.closest && e.target.closest("button, input, select, a")) return;
      runtime.isDragging = true;
      var rect = container.getBoundingClientRect();
      var scale = runtime.currentScale || 1;
      runtime.dragOffsetX = (e.clientX - rect.left) / scale;
      runtime.dragOffsetY = (e.clientY - rect.top) / scale;
      if (container.style.right !== "auto") {
        container.style.left = rect.left + "px";
        container.style.right = "auto";
      }
      addDragListener("mousemove", doDrag, false);
      addDragListener("mouseup", stopDrag, false);
      e.preventDefault();
    };
    var doDrag = function(e) {
      if (!runtime.isDragging) return;
      var scale = runtime.currentScale || 1;
      var newX = e.clientX - runtime.dragOffsetX * scale;
      var newY = e.clientY - runtime.dragOffsetY * scale;
      var maxX = window.innerWidth - container.offsetWidth * scale;
      var maxY = window.innerHeight - container.offsetHeight * scale;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      container.style.left = newX + "px";
      container.style.top = newY + "px";
    };
    var stopDrag = function() {
      runtime.isDragging = false;
      cleanupDragListeners();
      savePanelGeometry();
    };
    dragHandle.addEventListener("mousedown", startDrag, false);
  }
  function toggleView() {
    hideChartTooltip();
    if (runtime.presentationMode === "PLAYBACK") return;
    cancelHighPulses();
    runtime.isMinimized = !runtime.isMinimized;
    var fullView = document.getElementById("full-view");
    var miniView = document.getElementById("minimized-view");
    var toggleBtn = document.getElementById("btn-toggle");
    var container = document.getElementById("tracker-container");
    var headerText = document.getElementById("header-text");
    var resizeHandle = document.getElementById("resize-handle");
    var anonymousCount = getAnonymousCount();
    var previousTransition = container ? container.style.transition : "";
    if (container) container.style.transition = "none";
    if (runtime.isMinimized) {
      if (fullView) fullView.style.display = "none";
      if (miniView) miniView.style.display = "block";
      if (toggleBtn) toggleBtn.textContent = "+";
      if (container) container.style.width = runtime.BASE_WIDTH_MINI + "px";
      if (resizeHandle) resizeHandle.style.display = "none";
      if (runtime.isResizing) runtime.isResizing = false;
      var currentTotal = runtime.roomTotal > 0 ? runtime.roomTotal : runtime.users.size + anonymousCount;
      if (headerText) headerText.textContent = currentTotal.toLocaleString() + " (H:" + runtime.roomTotalHigh.toLocaleString() + ")";
    } else {
      if (fullView) fullView.style.display = "block";
      if (miniView) miniView.style.display = "none";
      if (toggleBtn) toggleBtn.textContent = "−";
      if (container) container.style.width = runtime.BASE_WIDTH_FULL + "px";
      if (resizeHandle) resizeHandle.style.display = "block";
      var currentTotal = runtime.roomTotal > 0 ? runtime.roomTotal : runtime.users.size + anonymousCount;
      if (headerText) headerText.textContent = "USERS: " + currentTotal.toLocaleString() + " (H:" + runtime.roomTotalHigh.toLocaleString() + ")";
    }
    var settings = document.getElementById("mini-settings");
    if (settings) settings.style.display = "none";
    var settingsButton = document.getElementById("mini-settings-toggle");
    if (settingsButton) settingsButton.setAttribute("aria-expanded", "false");
    updateDisplay();
    if (!runtime.isMinimized) {
      drawAllSparklines();
      constrainPanelPosition();
    }
    constrainPanelPosition();
    if (container) container.style.transition = previousTransition;
  }

  // src/charts.js
  function getChartTimes(times) {
    var cached = runtime.chartTimeCache.get(times);
    var last = times.length ? times[times.length - 1] : 0;
    if (cached && cached.length === times.length && cached.last === last && cached.first === times[0]) return cached.axis;
    var axis = [];
    times.forEach(function(time, i) {
      axis.push(i ? Math.max(axis[i - 1], time) : time);
    });
    runtime.chartTimeCache.set(times, { length: times.length, first: times[0], last, axis });
    return axis;
  }
  function getHistoryBreaks(data) {
    if (data.breaks && data.breaks.length === data.timestamps.length) return data.breaks;
    var times = getChartTimes(data.timestamps), intervals = [];
    for (var i = 1; i < times.length; i++) if (times[i] > times[i - 1]) intervals.push(times[i] - times[i - 1]);
    intervals.sort(function(a, b) {
      return a - b;
    });
    var typical = intervals.length ? intervals[Math.floor((intervals.length - 1) / 2)] : 6e4;
    var threshold = Math.max(12e4, typical * 2 + runtime.API_TIMEOUT_MS);
    return times.map(function(time, i2) {
      return i2 > 0 && time - times[i2 - 1] > threshold;
    });
  }
  function buildChartPlot(values, times, breaks, width, lastIndex, windowMs, replayProgress) {
    var end = Math.min(values.length, times.length) - 1;
    if (Number.isInteger(lastIndex)) end = Math.min(end, lastIndex);
    if (end < 0) return { points: [], min: 0, max: 0, end: -1 };
    var axis = getChartTimes(times);
    var progress = end + 1 < Math.min(values.length, times.length) && Number.isFinite(replayProgress) ? Math.max(0, Math.min(1, replayProgress)) : 0;
    var endTime = axis[end] + (progress ? (axis[end + 1] - axis[end]) * progress : 0);
    var startTime = windowMs ? Math.max(axis[0], endTime - windowMs) : axis[0];
    var start = 0;
    while (start < end && axis[start] < startTime) start++;
    var firstDrawn = start > 0 && axis[start] > startTime ? start - 1 : start, span = endTime - startTime;
    var min = Infinity, max = -Infinity, points = [], bucket = null, breakNext = true;
    function flush() {
      if (!bucket) return;
      var indices = [bucket.first, bucket.low, bucket.high, bucket.last].sort(function(a, b) {
        return a - b;
      });
      indices.forEach(function(index, j) {
        if (j && index === indices[j - 1]) return;
        points.push({
          index,
          x: span ? (axis[index] - startTime) / span * width : width / 2,
          value: values[index],
          move: breakNext
        });
        breakNext = false;
      });
      bucket = null;
    }
    for (var i = firstDrawn; i <= end; i++) {
      var value = values[i];
      min = Math.min(min, value);
      max = Math.max(max, value);
      var column = span ? Math.floor((axis[i] - startTime) / span * width) : 0;
      if (breaks && breaks[i]) {
        flush();
        breakNext = true;
      }
      if (!bucket || bucket.column !== column) {
        flush();
        bucket = { column, first: i, last: i, low: i, high: i };
      } else {
        bucket.last = i;
        if (value < values[bucket.low]) bucket.low = i;
        if (value > values[bucket.high]) bucket.high = i;
      }
    }
    flush();
    var continuation = progress ? {
      fromX: span ? (axis[end] - startTime) / span * width : width / 2,
      toX: span ? width : width / 2,
      fromValue: values[end],
      value: values[end] + (values[end + 1] - values[end]) * progress,
      gap: !!(breaks && breaks[end + 1]),
      progress
    } : null;
    return {
      points,
      min,
      max,
      start,
      end,
      startTime,
      endTime,
      continuation
    };
  }
  function hideChartTooltip() {
    var tooltip = document.getElementById("tierscope-chart-tooltip");
    if (tooltip) tooltip.style.display = "none";
  }
  function nearestChartSample(times, end, target) {
    var low = 0, high = end + 1;
    while (low < high) {
      var middle = Math.floor((low + high) / 2);
      if (times[middle] <= target) low = middle + 1;
      else high = middle;
    }
    if (low === 0) return 0;
    if (low > end) return end;
    return target - times[low - 1] <= times[low] - target ? low - 1 : low;
  }
  function showChartTooltip(canvas, index, clientX, clientY, gapIndex) {
    var model = canvas._tierScopeChart;
    if (!model || model.plot.end < 0) return;
    var firstIndex = model.firstIndex || 0;
    index = Math.max(firstIndex, Math.min(model.plot.end, index));
    canvas._tierScopeIndex = index;
    var tooltip = document.getElementById("tierscope-chart-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "tierscope-chart-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;max-width:310px;padding:7px 9px;background:var(--panel-tooltip);color:var(--panel-text);border:1px solid #a36acb;border-radius:5px;font:12px/1.5 Arial,sans-serif;white-space:pre-line;box-shadow:0 3px 12px #0008;";
      document.body.appendChild(tooltip);
    }
    setThemeVariables(tooltip);
    tooltip.textContent = gapIndex > 0 ? model.label + "\nNo samples recorded during this interval.\n" + new Date(model.times[gapIndex - 1]).toLocaleString() + " – " + new Date(model.times[gapIndex]).toLocaleString() + "\nOrange dashes connect recorded endpoints only." : model.label + " · " + model.values[index].toLocaleString() + "\n" + new Date(model.times[index]).toLocaleString() + "\nRange: " + model.plot.min.toLocaleString() + "–" + model.plot.max.toLocaleString() + " · Sample " + (index - firstIndex + 1) + "/" + (model.plot.end - firstIndex + 1);
    tooltip.style.display = "block";
    var rect = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(4, Math.min(clientX + 12, window.innerWidth - rect.width - 4)) + "px";
    tooltip.style.top = Math.max(4, Math.min(clientY + 12, window.innerHeight - rect.height - 4)) + "px";
  }
  function bindChartInspection(canvas, model) {
    canvas._tierScopeChart = model;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-describedby", "tierscope-chart-tooltip");
    canvas.setAttribute("aria-label", model.label + " history. " + (model.plot.end < 0 ? "No samples." : "Range " + model.plot.min + " to " + model.plot.max + ". " + (model.plot.end - (model.firstIndex || 0) + 1) + " samples. Orange dashes mark intervals with no recorded samples. Use Left and Right arrows to inspect samples; Home and End to jump; Escape to close."));
    if (canvas._tierScopeBound) return;
    canvas._tierScopeBound = true;
    canvas.addEventListener("pointermove", function(event) {
      var m = canvas._tierScopeChart;
      if (m.plot.end < 0) return;
      var rect = canvas.getBoundingClientRect();
      var fraction = Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * m.width - 2) / (m.width - 4)));
      var time = m.plot.startTime + fraction * (m.plot.endTime - m.plot.startTime);
      var axis = getChartTimes(m.times), index = nearestChartSample(axis, m.plot.end, time);
      var next = axis[index] > time ? index : index + 1;
      var gapEnd = m.plot.end + (m.plot.continuation ? 1 : 0);
      var gap = next > 0 && next <= gapEnd && m.breaks[next] && time > axis[next - 1] && time < axis[next];
      showChartTooltip(canvas, index, event.clientX, event.clientY, gap ? next : 0);
    });
    canvas.addEventListener("pointerleave", hideChartTooltip);
    canvas.addEventListener("blur", hideChartTooltip);
    canvas.addEventListener("focus", function() {
      var rect = canvas.getBoundingClientRect();
      showChartTooltip(canvas, canvas._tierScopeChart.plot.end, rect.left + rect.width / 2, rect.top + rect.height, false);
    });
    canvas.addEventListener("keydown", function(event) {
      if (event.key === "Escape") {
        hideChartTooltip();
        event.stopPropagation();
        return;
      }
      var end = canvas._tierScopeChart.plot.end, index = canvas._tierScopeIndex === void 0 ? end : canvas._tierScopeIndex;
      if (event.key === "ArrowLeft") index--;
      else if (event.key === "ArrowRight") index++;
      else if (event.key === "Home") index = 0;
      else if (event.key === "End") index = end;
      else return;
      event.preventDefault();
      event.stopPropagation();
      var rect = canvas.getBoundingClientRect();
      showChartTooltip(canvas, index, rect.left + rect.width / 2, rect.top + rect.height, false);
    });
  }
  function drawCanvasChart(ctx, points, color) {
    ctx.save();
    ctx.strokeStyle = themeColor("gap");
    ctx.lineWidth = 1.5;
    ctx.lineCap = "butt";
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    points.forEach(function(point, i) {
      if (i && point.move) {
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
    ctx.beginPath();
    points.forEach(function(point, i) {
      if (point.move) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
      if (point.move && (i === points.length - 1 || points[i + 1].move)) ctx.fillRect(point.x - 1.5, point.y - 1.5, 3, 3);
    });
    ctx.stroke();
  }
  function drawSparkline(canvasId, data, color, customHeight, times, breaks, lastIndex, label, replayProgress) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var scale = Math.max(1, (runtime.currentScale || 1) * (window.devicePixelRatio || 1));
    var height = customHeight || 28;
    canvas.style.width = "105px";
    canvas.style.minWidth = "0";
    canvas.style.height = height + "px";
    var width = canvas.clientWidth || 105;
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);
    var plot = buildChartPlot(data, times, breaks, Math.max(1, width - 4), lastIndex, runtime.CHART_WINDOWS[runtime.chartWindowMode], replayProgress);
    bindChartInspection(canvas, { values: data, times, breaks, firstIndex: plot.start || 0, plot, width, label });
    var continuation = plot.continuation;
    var min = continuation ? Math.min(plot.min, continuation.value) : plot.min;
    var max = continuation ? Math.max(plot.max, continuation.value) : plot.max;
    function y(value) {
      return max === min ? height / 2 : height - 2 - (value - min) / (max - min) * (height - 4);
    }
    ctx.strokeStyle = color;
    ctx.save();
    ctx.beginPath();
    ctx.rect(2, 0, width - 2, height);
    ctx.clip();
    drawCanvasChart(ctx, plot.points.map(function(point) {
      return {
        x: 2 + point.x,
        y: y(point.value),
        move: point.move
      };
    }), color);
    if (continuation) {
      ctx.save();
      ctx.strokeStyle = continuation.gap ? themeColor("gap") : color;
      ctx.lineWidth = continuation.gap ? 1.5 : 2;
      ctx.setLineDash(continuation.gap ? [4, 3] : []);
      ctx.lineDashOffset = continuation.gap ? -continuation.progress * 14 : 0;
      ctx.beginPath();
      ctx.moveTo(2 + continuation.fromX, y(continuation.fromValue));
      ctx.lineTo(2 + continuation.toX, y(continuation.value));
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function drawAllSparklines() {
    if (runtime.presentationMode === "PLAYBACK") return;
    drawHistorySparklines(runtime.history);
  }
  function drawHistorySparklines(displayHistory, lastIndex, replayProgress) {
    hideChartTooltip();
    if (runtime.rowLayoutNeedsMeasure) applyRowLayout();
    var breaks = getHistoryBreaks(displayHistory);
    runtime.PANEL_ROWS.forEach(function(row) {
      if (runtime.collapsedRows.has(row.key)) return;
      var key = row.key === "withtokens" ? "withTokens" : row.key === "anon" ? "anonymous" : row.key;
      drawSparkline(
        "spark-" + row.key,
        displayHistory[key],
        row.key === "total" ? themeColor("text") : row.color,
        runtime.panelChartHeights[row.key] || row.height,
        displayHistory.timestamps,
        breaks,
        lastIndex,
        row.label,
        replayProgress
      );
    });
  }

  // src/gif.js
  function createGifSurface(palette) {
    var canvas = document.createElement("canvas");
    canvas.width = runtime.GIF_WIDTH;
    canvas.height = runtime.GIF_HEIGHT;
    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas is unavailable.");
    var pixels = new Uint8Array(runtime.GIF_WIDTH * runtime.GIF_HEIGHT);
    var colors = palette.map(function(color) {
      return "#" + color.toString(16).padStart(6, "0");
    });
    function rect(x, y, width, height, color) {
      x = Math.round(x);
      y = Math.round(y);
      width = Math.round(width);
      height = Math.round(height);
      var left = Math.max(0, x), top = Math.max(0, y);
      var right = Math.min(runtime.GIF_WIDTH, x + width), bottom = Math.min(runtime.GIF_HEIGHT, y + height);
      if (right <= left || bottom <= top) return;
      ctx.fillStyle = colors[color];
      ctx.fillRect(left, top, right - left, bottom - top);
      for (var row = top; row < bottom; row++) {
        pixels.fill(color, row * runtime.GIF_WIDTH + left, row * runtime.GIF_WIDTH + right);
      }
    }
    function text(value, x, y, color, scale, rightAlign) {
      scale = scale || 1;
      value = String(value).toUpperCase();
      if (rightAlign) x -= (value.length * 6 - 1) * scale;
      for (var i = 0; i < value.length; i++) {
        var glyph = runtime.GIF_FONT[value[i]] || runtime.GIF_FONT["?"];
        for (var row = 0; row < 7; row++) {
          for (var col = 0; col < 5; col++) {
            if (glyph[row] & 1 << 4 - col) {
              rect(x + (i * 6 + col) * scale, y + row * scale, scale, scale, color);
            }
          }
        }
      }
    }
    return { canvas, pixels, rect, text };
  }
  function gifCount(value) {
    value = Math.max(0, Number(value) || 0);
    var text = String(Math.round(value));
    return text.length <= 10 ? text : value.toExponential(2);
  }
  function getGifSampleIndex(snapshot, frameIndex, frameCount) {
    var last = snapshot.timeline.length - 1;
    if (snapshot.timeline.length <= runtime.GIF_MAX_FRAMES) return frameIndex;
    if (frameIndex === 0) return 0;
    if (frameIndex === frameCount - 1) return last;
    var position = snapshot.durationMs * frameIndex / (frameCount - 1);
    var low = 0, high = snapshot.timeline.length;
    while (low < high) {
      var middle = Math.floor((low + high) / 2);
      if (snapshot.timeline[middle] <= position) low = middle + 1;
      else high = middle;
    }
    return Math.max(0, low - 1);
  }
  function drawGifSparkline(surface, values, lastIndex, color, bounds, times, breaks) {
    var left = bounds.left, top = bounds.top;
    var plotWidth = bounds.width - 2, plotHeight = bounds.height - 2;
    var minimum = values[0], maximum = values[0];
    for (var i = 1; i <= lastIndex; i++) {
      minimum = Math.min(minimum, values[i]);
      maximum = Math.max(maximum, values[i]);
    }
    var range = maximum - minimum || 1;
    function y(value) {
      return maximum === minimum ? top + Math.round(plotHeight / 2) : top + plotHeight - Math.round((value - minimum) / range * plotHeight);
    }
    function line(x0, y0, x1, y1, strokeColor, dashed) {
      var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      var error = dx + dy, step = 0;
      var distancePerStep = Math.hypot(dx, dy) / Math.max(dx, -dy, 1);
      while (true) {
        if (!dashed || step * distancePerStep % 10 < 6) surface.rect(x0, y0, dashed ? 1 : 2, dashed ? 1 : 2, strokeColor);
        if (x0 === x1 && y0 === y1) break;
        var twiceError = 2 * error;
        if (twiceError >= dy) {
          error += dy;
          x0 += sx;
        }
        if (twiceError <= dx) {
          error += dx;
          y0 += sy;
        }
        step++;
      }
    }
    var plot = buildChartPlot(values, times || values.map(function(_, i2) {
      return i2;
    }), breaks || [], plotWidth, lastIndex);
    for (var p = 1; p < plot.points.length; p++) {
      if (!plot.points[p].move) continue;
      var before = plot.points[p - 1], after = plot.points[p];
      line(left + Math.round(before.x), y(before.value), left + Math.round(after.x), y(after.value), runtime.GIF_GAP_COLOR_INDEX, true);
    }
    var previous = null;
    plot.points.forEach(function(point) {
      var x = left + Math.round(point.x), nextY = y(point.value);
      if (previous && !point.move) line(previous.x, previous.y, x, nextY, color, false);
      else surface.rect(x, nextY, 2, 2, color);
      previous = { x, y: nextY };
    });
  }
  function drawGifSummary(surface, snapshot, index, tiers) {
    var data = snapshot.history;
    var breaks = getHistoryBreaks(data);
    var margin = 16, rowStart = 90, rowStep = 44, groupGap = 12;
    var chartLeft = 176, countWidth = 70, columnGap = 10;
    var chartWidth = runtime.GIF_WIDTH - chartLeft - margin - countWidth - columnGap;
    surface.rect(0, 0, runtime.GIF_WIDTH, runtime.GIF_HEIGHT, 0);
    surface.text("TIERSCOPE REPLAY", margin, 12, 1, 3);
    surface.text(formatElapsedTime(snapshot.timeline[index]) + " / " + formatElapsedTime(snapshot.durationMs), margin, 46, 1, 2);
    surface.text("LINES SCALED PER SERIES", margin, 67, 1, 1);
    if (breaks.some(function(gap, i) {
      return gap && i > 0 && i <= index;
    })) {
      surface.text("ORANGE DASHES: NO SAMPLES", runtime.GIF_WIDTH - margin, 67, runtime.GIF_GAP_COLOR_INDEX, 1, true);
    }
    surface.rect(margin, 80, runtime.GIF_WIDTH - margin * 2, 2, 1);
    function drawRow(label, values, top, color) {
      surface.rect(margin, top + 14, 6, 14, color);
      surface.text(label, 30, top + 14, 1, 2);
      drawGifSparkline(
        surface,
        values,
        index,
        color,
        { left: chartLeft, top: top + 2, width: chartWidth, height: 36 },
        data.timestamps,
        breaks
      );
      var count = gifCount(values[index]);
      var countScale = (count.length * 6 - 1) * 2 <= countWidth ? 2 : 1;
      surface.text(count, runtime.GIF_WIDTH - margin, top + (countScale === 2 ? 14 : 18), color, countScale, true);
    }
    tiers.forEach(function(tier, row) {
      drawRow(
        tier === "female-trans" ? "FEMALE/TRANS" : runtime.TIERS[tier].name,
        data[tier],
        rowStart + row * rowStep,
        row + 2
      );
    });
    var totalsStart = rowStart + tiers.length * rowStep;
    surface.rect(margin, totalsStart, runtime.GIF_WIDTH - margin * 2, 2, 1);
    totalsStart += groupGap;
    var roomTotals = data.total.map(function(value, i) {
      return value + data.anonymous[i];
    });
    drawRow("TOTAL", roomTotals, totalsStart, 1);
    drawRow("WITH TOKENS", data.withTokens, totalsStart + rowStep, 10);
    drawRow("REGISTERED", data.total, totalsStart + rowStep * 2, 1);
    drawRow("ANONYMOUS", data.anonymous, totalsStart + rowStep * 3, 11);
  }
  function cancelGifExport() {
    if (runtime.gifExportJob) runtime.gifExportJob.cancelled = true;
  }
  async function generateGifFromHistory() {
    if (runtime.gifExportJob) return;
    var button = document.getElementById("btn-export-gif");
    var status = document.getElementById("gif-export-status");
    var cancel = document.getElementById("btn-cancel-gif");
    var progress = document.getElementById("gif-export-controls");
    var job = {
      cancelled: false,
      url: location.href,
      generation: runtime.initGuard,
      key: runtime.activeSessionStorageKey
    };
    runtime.gifExportJob = job;
    if (button) button.disabled = true;
    if (progress) progress.style.display = "flex";
    if (cancel) cancel.hidden = false;
    if (status) status.textContent = "Preparing GIF…";
    function checkJob() {
      if (job.cancelled || location.href !== job.url || runtime.initGuard !== job.generation || runtime.activeSessionStorageKey !== job.key) throw new Error("GIF export cancelled.");
    }
    try {
      if (typeof GifWriter !== "function") {
        throw new Error("GIF encoder missing. Reinstall the complete script, including its @require header.");
      }
      if (!isPlaybackCurrent(runtime.playback)) throw new Error("Open Replay before downloading a GIF.");
      var model = runtime.playback.archive ? runtime.playback.archive.room : getModelName();
      var snapshot = runtime.playback.snapshot;
      if (!snapshot.timeline.length) throw new Error("No recorded history to export yet.");
      var tiers = Object.keys(runtime.TIERS);
      var palette = [1315870, 16777215].concat(tiers.map(function(tier) {
        return parseInt(runtime.TIERS[tier].color.slice(1), 16);
      }));
      palette.push(16738740, 8947848);
      palette.push(15244101);
      while ((palette.length & palette.length - 1) !== 0) palette.push(palette[0]);
      var surface = createGifSurface(palette);
      var frameCount = Math.min(runtime.GIF_MAX_FRAMES, snapshot.timeline.length);
      var bytes = new Uint8Array(256 * 1024);
      var writer = new GifWriter(bytes, runtime.GIF_WIDTH, runtime.GIF_HEIGHT, { palette, loop: 0 });
      for (var i = 0; i < frameCount; i++) {
        await new Promise(function(resolve) {
          setTimeout(resolve, 0);
        });
        checkJob();
        var index = getGifSampleIndex(snapshot, i, frameCount);
        drawGifSummary(surface, snapshot, index, tiers);
        var needed = writer.getOutputBufferPosition() + runtime.GIF_WIDTH * runtime.GIF_HEIGHT * 2 + 1024;
        if (needed > bytes.length) {
          var grown = new Uint8Array(Math.max(bytes.length * 2, needed));
          grown.set(bytes);
          bytes = grown;
          writer.setOutputBuffer(bytes);
        }
        var delay = Math.round((i + 1) * runtime.GIF_DURATION_CS / frameCount) - Math.round(i * runtime.GIF_DURATION_CS / frameCount);
        writer.addFrame(0, 0, runtime.GIF_WIDTH, runtime.GIF_HEIGHT, surface.pixels, { delay, disposal: 1 });
        if (status) status.textContent = "GIF " + Math.round((i + 1) / frameCount * 100) + "%";
      }
      checkJob();
      var length = writer.end();
      if (length > bytes.length) throw new Error("GIF output buffer overflow.");
      var blob = new Blob([bytes.subarray(0, length)], { type: "image/gif" });
      var url = URL.createObjectURL(blob);
      try {
        var link = document.createElement("a");
        link.href = url;
        link.download = model.replace(/[^a-z0-9_-]/gi, "_") + "-replay-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".gif";
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      } finally {
        setTimeout(function() {
          URL.revokeObjectURL(url);
        }, 6e4);
      }
      if (status) status.textContent = "GIF downloaded";
      log("GIF export complete: " + frameCount + " frames, " + length + " bytes");
    } catch (error) {
      if (status) status.textContent = error.message;
      log("GIF export: " + error.message);
      if (!job.cancelled && location.href === job.url && runtime.initGuard === job.generation) alert(error.message);
    } finally {
      if (button) button.disabled = false;
      if (cancel) cancel.hidden = true;
      if (progress) progress.style.display = "none";
      if (button && status) button.title = status.textContent;
      if (runtime.gifExportJob === job) runtime.gifExportJob = null;
    }
  }

  // src/startup.js
  function scheduleInit(delay) {
    var generation = runtime.initGuard;
    var url = location.href;
    setTimeout(function() {
      if (generation === runtime.initGuard && url === location.href) init();
    }, delay);
  }
  function init() {
    leavePlayback(false);
    var myGeneration = ++runtime.initGuard;
    runtime.isScanning = false;
    log("Initializing... (generation " + myGeneration + ")");
    if (runtime.healthCheckInterval) {
      clearInterval(runtime.healthCheckInterval);
      runtime.healthCheckInterval = null;
    }
    if (runtime.freshnessInterval) clearInterval(runtime.freshnessInterval);
    runtime.freshnessInterval = setInterval(function() {
      updateAcquisitionStatus();
      updateCountdownDisplay();
    }, 1e3);
    var isRoom = isBroadcastRoom();
    var modelName = getModelName();
    var loaded = false;
    if (isRoom && modelName !== "unknown") {
      loaded = loadSession(modelName);
    }
    if (!loaded) {
      runtime.isMinimized = !isRoom;
      runtime.isAutoRefreshOn = isRoom;
    } else {
      runtime.isMinimized = false;
      runtime.isAutoRefreshOn = !runtime.isStopped && (!runtime.isPaused || runtime.absencePausedAt !== null);
    }
    try {
      createPanel();
    } catch (e) {
      log("Error creating panel: " + e);
      return;
    }
    var resizeHandle = document.getElementById("resize-handle");
    if (resizeHandle) {
      resizeHandle.style.display = runtime.isMinimized ? "none" : "block";
    }
    if (!runtime.isMinimized) {
      var fullView = document.getElementById("full-view");
      var miniView = document.getElementById("minimized-view");
      var toggleBtn = document.getElementById("btn-toggle");
      var container = document.getElementById("tracker-container");
      if (fullView) fullView.style.display = "block";
      if (miniView) miniView.style.display = "none";
      if (toggleBtn) toggleBtn.textContent = "−";
      if (container) container.style.width = runtime.BASE_WIDTH_FULL + "px";
      drawAllSparklines();
      updateDisplay();
    }
    updateDisplay();
    updateTrendDisplay();
    updateAcquisitionStatus();
    restorePanelGeometry();
    if (runtime.isStopped) {
      updateStopControls();
      updateCountdownDisplay();
      updateTrackingTimer();
      return;
    }
    if (isRoom && isAbsencePaused()) {
      runtime.nextScanAt = Math.max(Date.now(), readRequestPolicy().until);
      startCountdown();
      performScanThenReturn(true);
      updateTrackingTimer();
    } else if (isRoom && modelName !== "unknown" && !loaded && runtime.isAutoRefreshOn && !runtime.isPaused) {
      var initialScan = performScanThenReturn(true);
      var startupContext = { epoch: runtime.scanEpoch, generation: myGeneration, url: location.href };
      initialScan.then(function() {
        if (!isAcquisitionCurrent(startupContext) || !runtime.isAutoRefreshOn || runtime.isPaused) return;
        startTrackingTimer();
        startCountdown();
      }).catch(function(error) {
        log("Could not finish initial scan setup: " + error.message);
      });
    } else {
      var attempts = 0;
      var maxAttempts = 30;
      var checkInterval = setInterval(function() {
        if (myGeneration !== runtime.initGuard) {
          clearInterval(checkInterval);
          log("Init " + myGeneration + " superseded by newer generation");
          return;
        }
        attempts++;
        if (isRoom && modelName !== "unknown" || document.querySelector(runtime.DOM_SELECTORS.userListTab) || attempts >= maxAttempts) {
          clearInterval(checkInterval);
          if (!isRoom && attempts >= maxAttempts && !document.querySelector(runtime.DOM_SELECTORS.userListTab)) {
            log("UserListTab not found after 30s, giving up");
            var statusEl = document.getElementById("auto-status");
            if (statusEl) {
              statusEl.textContent = "No chat detected";
              statusEl.style.color = "var(--panel-negative)";
            }
            return;
          }
          if (!runtime.isPaused) {
            performScanThenReturn(true);
          }
          setTimeout(function() {
            if (myGeneration !== runtime.initGuard) return;
            if (runtime.isStopped) {
              updateStopControls();
              updateCountdownDisplay();
              return;
            }
            if (isAbsencePaused()) {
              startCountdown();
              updateStopControls();
              updateTrackingTimer();
            } else if (runtime.isAutoRefreshOn && !runtime.isPaused) {
              startTrackingTimer();
              startCountdown();
            } else {
              var btnAuto = document.getElementById("btn-auto");
              var btnControlAuto = document.getElementById("btn-control-auto");
              if (btnAuto) {
                btnAuto.style.background = "#ff4444";
                btnAuto.innerHTML = "▶";
                btnAuto.title = "Auto-Refresh OFF - Click to start";
              }
              if (btnControlAuto) {
                btnControlAuto.style.background = "#ff4444";
                btnControlAuto.innerHTML = "▶";
                btnControlAuto.title = "Auto-Refresh OFF - Click to start";
              }
              var statusEl2 = document.getElementById("auto-status");
              if (statusEl2) {
                statusEl2.textContent = runtime.isPaused ? "Paused (restored)" : "Paused";
                statusEl2.style.color = "var(--panel-negative)";
              }
              updateTrackingTimer();
            }
          }, 2002);
        }
      }, 1e3);
    }
    runtime.healthCheckInterval = setInterval(function() {
      if (myGeneration === runtime.initGuard && !runtime.isStopped && !isAbsencePaused() && runtime.lastAcquisitionAttemptSource === "DOM" && !runtime.isScanning) {
        validateDOMHealth();
      }
    }, 3e4);
  }
  function checkUrlChange() {
    if (location.href !== runtime.lastUrl) {
      if (runtime.panelOptionsCleanup) {
        runtime.panelOptionsCleanup();
        runtime.panelOptionsCleanup = null;
      }
      leavePlayback(false);
      var oldModel = getModelNameFromUrl(runtime.lastUrl);
      runtime.lastUrl = location.href;
      if (oldModel && oldModel !== "unknown") {
        saveSession(oldModel);
      }
      runtime.newHighTiers = {};
      runtime.activeSessionStorageKey = null;
      stopCountdown();
      runtime.nextScanAt = 0;
      runtime.countdownSeconds = runtime.scanIntervalSeconds;
      stopTrackingTimer();
      runtime.isStopped = false;
      runtime.stoppedAt = null;
      runtime.stopReason = null;
      runtime.broadcasterAbsence = { since: null, missing: 0 };
      runtime.absencePausedAt = null;
      runtime.absenceOverrideActive = false;
      cleanupDragListeners();
      if (runtime.miniSettingsKeyHandler) {
        document.removeEventListener("keydown", runtime.miniSettingsKeyHandler, true);
        runtime.miniSettingsKeyHandler = null;
      }
      runtime.isScanning = false;
      if (runtime.healthCheckInterval) {
        clearInterval(runtime.healthCheckInterval);
        runtime.healthCheckInterval = null;
      }
      runtime.currentScale = runtime.panelGeometry ? runtime.panelGeometry.scale : runtime.currentScale;
      runtime.users.clear();
      runtime.roomTotal = 0;
      runtime.lastAcceptedAcquisition = null;
      runtime.restoredDisplayFrame = null;
      runtime.lastAcquisitionAttemptSource = "API";
      runtime.domHealthStatus.consecutiveFailures = 0;
      updateAcquisitionStatus();
      runtime.previousUserCount = 0;
      runtime.previousRoomTotal = 0;
      Object.keys(runtime.history).forEach(function(k) {
        runtime.history[k] = [];
      });
      runtime.previousCounts = {
        "red": 0,
        "green": 0,
        "purple": 0,
        "pink": 0,
        "dark-blue": 0,
        "light-blue": 0,
        "gray": 0,
        "female-trans": 0,
        "withTokens": 0,
        "total": 0,
        "anonymous": 0
      };
      runtime.hasTrendBaseline = false;
      runtime.trendComparisonMode = "last";
      runtime.autoTrendEscalation = true;
      runtime.roomTotalHigh = 0;
      runtime.roomTotalHighTime = null;
      runtime.tierHighTimes = {};
      runtime.withTokensHighTime = null;
      runtime.totalHighTime = null;
      runtime.anonHighTime = null;
      runtime.femaleTransHighTime = null;
      runtime.initGuard++;
      scheduleInit(2002);
    }
  }

  // src/runtime.js
  var runtime = {};
  function initializeRuntime() {
    runtime.TIERSCOPE_VERSION = "3.5.0-beta.1";
    runtime.API_TIMEOUT_MS = 1e4;
    runtime.DEFAULT_API_INTERVAL_SECONDS = 60;
    runtime.DOM_FALLBACK_INTERVAL_SECONDS = 60;
    runtime.STORAGE_SCHEMA_VERSION = 2;
    runtime.STORAGE_KEY_PREFIX = "tierscope:v1:";
    runtime.STORAGE_MAX_AGE_MS = 3 * 60 * 60 * 1e3;
    runtime.STORAGE_HISTORY_SERIES = [
      "red",
      "green",
      "purple",
      "pink",
      "dark-blue",
      "light-blue",
      "gray",
      "female-trans",
      "withTokens",
      "total",
      "anonymous"
    ];
    runtime.STORAGE_NULLABLE_TIMES = [
      "withTokensHighTime",
      "totalHighTime",
      "anonHighTime",
      "femaleTransHighTime",
      "roomTotalHighTime",
      "trackingStartTime",
      "sessionStartedAt"
    ];
    runtime.sessionStorageStatus = /* @__PURE__ */ new Map();
    runtime.sessionRecordWarnings = /* @__PURE__ */ new Map();
    runtime.activeSessionStorageKey = null;
    runtime.TAB_RECORD_PREFIX = "tierscope:tab:v2:";
    runtime.ROOM_EPOCH_PREFIX = "tierscope:epoch:v2:";
    runtime.activeRoomEpoch = null;
    runtime.tabRecords = /* @__PURE__ */ new Map();
    runtime.sessionStorageNotice = "";
    runtime.sessionStartedAt = null;
    runtime.sessionStartEstimated = false;
    runtime.sessionHighs = {};
    runtime.ALL_TIME_PREFIX = "tierscope:ath:v1:";
    runtime.ALL_TIME_EPOCH_PREFIX = "tierscope:ath-epoch:v1:";
    runtime.HIGH_MODE_KEY = "tierscope:ui:highMode:v1";
    runtime.ALL_TIME_SERIES = runtime.STORAGE_HISTORY_SERIES.concat(["roomTotal"]);
    runtime.allTimeCache = /* @__PURE__ */ new Map();
    runtime.highMode = "sh";
    try {
      if (GM_getValue(runtime.HIGH_MODE_KEY, "sh") === "ath") runtime.highMode = "ath";
    } catch (error) {
    }
    runtime.gifExportJob = null;
    runtime.DOM_SELECTORS = {
      userListTab: "#UserListTab",
      usernameElements: [
        '[data-testid="username-label"]',
        '[data-testid="username"]',
        ".username",
        'a[href^="/b/"]',
        'a[href^="/p/"]'
      ],
      roomTotal: [
        '[data-testid="users-tab-default"]',
        ".users-tab",
        '[data-paction-name="USERS"]',
        'button[data-tab="users"]',
        '[class*="users"]'
      ],
      tabs: {
        users: [
          '[data-tab="users"]',
          '[data-testid="users-tab"]',
          '[data-testid="users-tab-default"]',
          ".users-tab",
          'button[data-paction-name="USERS"]'
        ],
        chat: [
          '[data-tab="chat"]',
          '[data-testid="chat-tab"]',
          '[data-testid="chat-tab-default"]',
          ".chat-tab",
          'button[data-paction-name="CHAT"]'
        ]
      }
    };
    runtime.domHealthStatus = {
      lastCheck: 0,
      userListTabFound: false,
      consecutiveFailures: 0,
      isHealthy: true
    };
    runtime.healthCheckInterval = null;
    runtime.initGuard = 0;
    runtime.urlCheckInterval = null;
    runtime.scanEpoch = 0;
    runtime.lastAcceptedAcquisition = null;
    runtime.restoredDisplayFrame = null;
    runtime.lastAcquisitionAttemptSource = "API";
    runtime.domFallbackReadyAtByRoom = /* @__PURE__ */ new Map();
    runtime.freshnessInterval = null;
    runtime.nextScanAt = 0;
    runtime.windowResizeHandler = null;
    runtime.miniSettingsKeyHandler = null;
    runtime.previousCounts = {
      "red": 0,
      "green": 0,
      "purple": 0,
      "pink": 0,
      "dark-blue": 0,
      "light-blue": 0,
      "gray": 0,
      "female-trans": 0,
      "withTokens": 0,
      "total": 0,
      "anonymous": 0
    };
    runtime.hasTrendBaseline = false;
    runtime.trendComparisonMode = "last";
    runtime.autoTrendEscalation = true;
    runtime.newHighTiers = {};
    runtime.highPulseAnimations = /* @__PURE__ */ new Map();
    runtime.highPulseMotion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (runtime.highPulseMotion) {
      runtime.motionChanged = function(event) {
        if (event.matches) cancelHighPulses();
      };
      if (runtime.highPulseMotion.addEventListener) runtime.highPulseMotion.addEventListener("change", runtime.motionChanged);
      else if (runtime.highPulseMotion.addListener) runtime.highPulseMotion.addListener(runtime.motionChanged);
    }
    runtime.users = /* @__PURE__ */ new Map();
    runtime.previousUserCount = 0;
    runtime.previousRoomTotal = 0;
    runtime.isMinimized = true;
    runtime.roomTotal = 0;
    runtime.roomTotalHigh = 0;
    runtime.isDragging = false;
    runtime.dragOffsetX = 0;
    runtime.dragOffsetY = 0;
    runtime.countdownInterval = null;
    runtime.isAutoRefreshOn = true;
    runtime.isScanning = false;
    runtime.countdownSeconds = runtime.DEFAULT_API_INTERVAL_SECONDS;
    runtime.scanIntervalSeconds = runtime.DEFAULT_API_INTERVAL_SECONDS;
    runtime.trackingStartTime = null;
    runtime.trackingTimerInterval = null;
    runtime.isPaused = false;
    runtime.isStopped = false;
    runtime.stoppedAt = null;
    runtime.stopReason = null;
    runtime.broadcasterAbsence = { since: null, missing: 0 };
    runtime.absencePausedAt = null;
    runtime.absenceOverrideActive = false;
    runtime.lastScheduledIntervalSeconds = runtime.DEFAULT_API_INTERVAL_SECONDS;
    runtime.ABSENCE_PAUSE_MS = 15 * 60 * 1e3;
    runtime.ABSENCE_CHECK_SECONDS = 60;
    runtime.ABSENCE_STOP_MS = 3 * 60 * 60 * 1e3;
    runtime.pausedElapsedTime = 0;
    runtime.dragListeners = [];
    runtime.isResizing = false;
    runtime.resizeStartX = 0;
    runtime.resizeStartY = 0;
    runtime.resizeStartWidth = 0;
    runtime.resizeStartHeight = 0;
    runtime.currentScale = 1;
    runtime.PANEL_GEOMETRY_KEY = "tierscope:ui:geometry:v1";
    runtime.panelGeometry = loadPanelGeometry();
    runtime.PANEL_THEME_KEY = "tierscope:ui:theme:v1";
    runtime.isDarkMode = true;
    try {
      runtime.isDarkMode = GM_getValue(runtime.PANEL_THEME_KEY, "dark") !== "bright";
    } catch (error) {
    }
    runtime.PANEL_THEME_COLORS = {
      rgb: ["20,20,30", "248,249,252"],
      text: ["#ffffff", "#202330"],
      muted: ["#aaa", "#596174"],
      secondary: ["#ddd", "#41485a"],
      subtle: ["#888", "#626978"],
      faint: ["#666", "#687183"],
      button: ["#333", "#e3e6ed"],
      "button-strong": ["#444", "#d7dce6"],
      divider: ["#555", "#b6bdca"],
      "row-rgb": ["255,255,255", "0,0,0"],
      settings: ["#20202b", "#f0f2f7"],
      solid: ["#14141e", "#f8f9fc"],
      tooltip: ["#171722", "#ffffff"],
      positive: ["#32CD32", "#23751f"],
      warning: ["#ffd43b", "#825d00"],
      gap: ["#e89b45", "#ad5f10"],
      negative: ["#ff4444", "#b52332"],
      paused: ["#ff9999", "#b52332"],
      "delta-up": ["#69BE45", "#357b21"],
      "delta-down": ["#ff7777", "#b52332"],
      accent: ["#ff69b4", "#b42370"]
    };
    runtime.MINI_METRIC_KEY = "tierscope:ui:miniMetric:v1";
    runtime.MINI_METRICS = ["room", "withTokens", "total"];
    runtime.miniMetric = "room";
    try {
      runtime.savedMiniMetric = GM_getValue(runtime.MINI_METRIC_KEY, "room");
      if (runtime.MINI_METRICS.indexOf(runtime.savedMiniMetric) !== -1) runtime.miniMetric = runtime.savedMiniMetric;
    } catch (error) {
    }
    runtime.BASE_WIDTH_MINI = 140;
    runtime.BASE_WIDTH_FULL = 280;
    runtime.roomTotalHighTime = null;
    runtime.tierHighTimes = {};
    runtime.withTokensHighTime = null;
    runtime.totalHighTime = null;
    runtime.anonHighTime = null;
    runtime.femaleTransHighTime = null;
    runtime.pendingHistoryGap = false;
    runtime.history = {
      timestamps: [],
      breaks: [],
      "red": [],
      "green": [],
      "purple": [],
      "pink": [],
      "dark-blue": [],
      "light-blue": [],
      "gray": [],
      "female-trans": [],
      "withTokens": [],
      "total": [],
      "anonymous": []
    };
    runtime.MAX_HISTORY_LENGTH = 1e4;
    runtime.TIERS = {
      "red": { name: "Red", desc: "", color: "#DC0000" },
      "green": { name: "Green", desc: "", color: "#69BE45" },
      "purple": { name: "Dark Purple", desc: "", color: "#804BAA" },
      "pink": { name: "Light Purple", desc: "", color: "#BE6AFF" },
      "dark-blue": { name: "Dark Blue", desc: "", color: "#393993" },
      "light-blue": { name: "Light Blue", desc: "", color: "#1E5FC8" },
      "gray": { name: "Grey", desc: "", color: "#6B6A6F" },
      "female-trans": { name: "♀⚧", desc: "", color: "#FF1493" }
    };
    runtime.COLLAPSED_ROWS_KEY = "tierscope:ui:collapsedRows:v1";
    runtime.PANEL_ROWS = Object.keys(runtime.TIERS).map(function(key) {
      return {
        key,
        label: key === "red" ? "Moderators" : key === "green" ? "Fan Club" : key === "female-trans" ? "Female/Trans" : runtime.TIERS[key].name,
        color: runtime.TIERS[key].color,
        height: 28,
        display: "flex"
      };
    }).concat([
      { key: "withtokens", label: "With Tokens", icon: "💎", color: "#ff69b4", height: 28, display: "flex" },
      { key: "total", label: "Registered", icon: "📊", color: "#ffffff", height: 28, display: "flex" },
      { key: "anon", label: "Anonymous", icon: "👻", color: "#888888", height: 50, display: "block" }
    ]);
    runtime.collapsedRows = loadCollapsedRows();
    runtime.panelChartHeights = {};
    runtime.rowLayoutNeedsMeasure = true;
    runtime.panelChartRegionHeight = null;
    runtime.chartLayoutRevision = 0;
    runtime.TREND_ICONS = {
      up: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--panel-positive)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
      down: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--panel-negative)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
      stable: '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="var(--panel-warning)"/></svg>'
    };
    runtime.TREND_PRESETS = {
      "last": { label: "Last", ms: 0 },
      "5min": { label: "5m", ms: 5 * 60 * 1e3 },
      "15min": { label: "15m", ms: 15 * 60 * 1e3 },
      "30min": { label: "30m", ms: 30 * 60 * 1e3 },
      "1hour": { label: "1h", ms: 60 * 60 * 1e3 },
      "start": { label: "Start", ms: -1 }
    };
    runtime.presentationMode = "LIVE";
    runtime.playback = null;
    runtime.sessionFileLoadGeneration = 0;
    runtime.panelOptionsCleanup = null;
    runtime.SESSION_FILE_FORMAT = "TierScopeSession";
    runtime.SESSION_FILE_VERSION = 1;
    runtime.SESSION_FILE_MAX_BYTES = 8 * 1024 * 1024;
    runtime.CHART_WINDOW_KEY = "tierscope:ui:chartWindow:v1";
    runtime.CHART_WINDOWS = { full: 0, fourHours: 240 * 6e4, twoHours: 120 * 6e4, hour: 60 * 6e4, halfHour: 30 * 6e4, quarter: 15 * 6e4 };
    runtime.chartWindowMode = "full";
    try {
      runtime.savedWindow = GM_getValue(runtime.CHART_WINDOW_KEY, "full");
      if (typeof runtime.savedWindow === "string" && hasStorageField(runtime.CHART_WINDOWS, runtime.savedWindow)) runtime.chartWindowMode = runtime.savedWindow;
    } catch (error) {
    }
    runtime.playbackLayoutState = null;
    runtime.GIF_WIDTH = 480;
    runtime.GIF_HEIGHT = 640;
    runtime.GIF_MAX_FRAMES = 60;
    runtime.GIF_DURATION_CS = 1e3;
    runtime.GIF_GAP_COLOR_INDEX = 12;
    runtime.GIF_FONT = {
      " ": [0, 0, 0, 0, 0, 0, 0],
      A: [14, 17, 17, 31, 17, 17, 17],
      B: [30, 17, 17, 30, 17, 17, 30],
      C: [14, 17, 16, 16, 16, 17, 14],
      D: [30, 17, 17, 17, 17, 17, 30],
      E: [31, 16, 16, 30, 16, 16, 31],
      F: [31, 16, 16, 30, 16, 16, 16],
      G: [14, 17, 16, 23, 17, 17, 15],
      H: [17, 17, 17, 31, 17, 17, 17],
      I: [14, 4, 4, 4, 4, 4, 14],
      J: [7, 2, 2, 2, 18, 18, 12],
      K: [17, 18, 20, 24, 20, 18, 17],
      L: [16, 16, 16, 16, 16, 16, 31],
      M: [17, 27, 21, 21, 17, 17, 17],
      N: [17, 25, 21, 19, 17, 17, 17],
      O: [14, 17, 17, 17, 17, 17, 14],
      P: [30, 17, 17, 30, 16, 16, 16],
      Q: [14, 17, 17, 17, 21, 18, 13],
      R: [30, 17, 17, 30, 20, 18, 17],
      S: [15, 16, 16, 14, 1, 1, 30],
      T: [31, 4, 4, 4, 4, 4, 4],
      U: [17, 17, 17, 17, 17, 17, 14],
      V: [17, 17, 17, 17, 17, 10, 4],
      W: [17, 17, 17, 21, 21, 21, 10],
      X: [17, 17, 10, 4, 10, 17, 17],
      Y: [17, 17, 10, 4, 4, 4, 4],
      Z: [31, 1, 2, 4, 8, 16, 31],
      "0": [14, 17, 19, 21, 25, 17, 14],
      "1": [4, 12, 4, 4, 4, 4, 14],
      "2": [14, 17, 1, 2, 4, 8, 31],
      "3": [30, 1, 1, 14, 1, 1, 30],
      "4": [2, 6, 10, 18, 31, 2, 2],
      "5": [31, 16, 16, 30, 1, 1, 30],
      "6": [14, 16, 16, 30, 17, 17, 14],
      "7": [31, 1, 2, 4, 8, 8, 8],
      "8": [14, 17, 17, 14, 17, 17, 14],
      "9": [14, 17, 17, 15, 1, 1, 14],
      ":": [0, 4, 4, 0, 4, 4, 0],
      "/": [1, 2, 2, 4, 8, 8, 16],
      "-": [0, 0, 0, 31, 0, 0, 0],
      ".": [0, 0, 0, 0, 0, 6, 6],
      "+": [0, 4, 4, 31, 4, 4, 0],
      "?": [14, 17, 1, 2, 4, 0, 4]
    };
    runtime.REQUEST_POLICY_KEY = "tierscope:requests:v1:" + location.origin;
    runtime.requestPolicyUnsaved = false;
    runtime.requestPolicyCache = { until: 0, failures: 0, blocked: 0, status: 0, revision: "" };
    runtime.chartTimeCache = /* @__PURE__ */ new WeakMap();
    runtime.panelBackgroundPercent = 95;
    runtime.lastUrl = location.href;
    runtime.urlCheckInterval = setInterval(checkUrlChange, 500);
    window.addEventListener("beforeunload", function() {
      cancelGifExport();
      leavePlayback(false);
      var modelName = getModelName();
      if (modelName && modelName !== "unknown") {
        saveSession(modelName);
      }
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        scheduleInit(2e3);
      });
    } else {
      scheduleInit(2e3);
    }
    log("Script loaded and waiting for init");
    return {
      downloadTrackingReport,
      downloadTrackingCSV,
      resetAllTracking,
      getHealth: function() {
        return runtime.domHealthStatus;
      },
      parseGetChatUserListResponse,
      generateGifFromHistory,
      cancelGifExport
    };
  }

  // src/main.js
  var ViewerTracker = initializeRuntime();
  if (typeof unsafeWindow !== "undefined") {
    unsafeWindow.ViewerTracker = ViewerTracker;
  } else {
    window.ViewerTracker = ViewerTracker;
  }
})();
