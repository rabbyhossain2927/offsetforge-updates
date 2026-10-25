(function () {
  var OF = window.OF;
  var $ = function (id) { return document.getElementById(id); };
  var DEFAULTS = { cur: "1.90", tgt: "1.50", offset: "-0.20", miter: "100", join: 0, expand: true, keep: false };

  var curEl = $("cur"), tgtEl = $("tgt"), offsetEl = $("offset"), miterEl = $("miter");
  var statusEl = $("status"), statusText = $("statusText"), calcEl = $("calc");
  var chips = document.querySelectorAll(".chip");
  var joinBtns = document.querySelectorAll("#joins button");
  var modeBtns = document.querySelectorAll("#modes button");
  var mode = "match", join = 0, busyUntil = 0, dim = "t", lastSig = "";
  var autoEl = $("autoSw"), selread = $("selread"), dimBtns = document.querySelectorAll("#dim button");

  // ---------- host bridge ----------
  function run(code, cb) {
    try {
      window.__adobe_cep__.evalScript(code, function (r) { if (cb) cb(r); });
    } catch (e) {
      if (cb) cb("err:Not running inside Illustrator");
    }
  }

  // ---------- helpers ----------
  function parse(v) { return parseFloat(String(v).replace(",", ".")); }
  function fmt(n) {
    var s = String(Math.round(n * 10000) / 10000);
    if (s.indexOf(".") < 0) return s + ".00";
    if (s.split(".")[1].length === 1) return s + "0";
    return s;
  }
  function signed(n) { return (n > 0 ? "+" : "") + fmt(n); }
  function setStatus(text, kind, hold) {
    statusText.textContent = text;
    statusEl.className = "status" + (kind ? " " + kind : "");
    busyUntil = hold ? Date.now() + hold : 0;
  }
  function pressed(btn, on) { btn.setAttribute("aria-pressed", on ? "true" : "false"); }
  function isOn(btn) { return btn.getAttribute("aria-pressed") === "true"; }

  // ---------- offset calculation ----------
  // offset = (target - current) / 2
  function matchOffset() {
    var cur = parse(curEl.value), tgt = parse(tgtEl.value);
    if (isNaN(cur) || isNaN(tgt) || cur <= 0 || tgt <= 0) return null;
    return Math.round(((tgt - cur) / 2) * 10000) / 10000;
  }
  function updateCalc() {
    var o = matchOffset();
    if (o === null) { calcEl.textContent = "Enter both sizes"; calcEl.className = "result-val bad"; return; }
    if (o === 0) { calcEl.textContent = "0.00 px (already matches)"; calcEl.className = "result-val bad"; return; }
    calcEl.textContent = signed(o) + " px";
    calcEl.className = "result-val";
  }
  function currentOffset() {
    if (mode === "match") return matchOffset();
    var v = parse(offsetEl.value);
    return isNaN(v) ? null : Math.round(v * 10000) / 10000;
  }

  // ---------- mode ----------
  function syncMode() {
    for (var i = 0; i < modeBtns.length; i++) pressed(modeBtns[i], modeBtns[i].getAttribute("data-m") === mode);
    $("matchCard").hidden = mode !== "match";
    $("manualCard").hidden = mode !== "manual";
    $("chips").hidden = mode !== "manual";
  }
  for (var m = 0; m < modeBtns.length; m++) {
    modeBtns[m].onclick = function () { mode = this.getAttribute("data-m"); syncMode(); };
  }

  // ---------- fields ----------
  function syncChips() {
    var v = parse(offsetEl.value);
    for (var i = 0; i < chips.length; i++) {
      var on = !isNaN(v) && Math.abs(parse(chips[i].getAttribute("data-v")) - v) < 0.0001;
      chips[i].className = "chip" + (on ? " on" : "");
    }
  }
  function syncJoin() {
    for (var i = 0; i < joinBtns.length; i++) pressed(joinBtns[i], parseInt(joinBtns[i].getAttribute("data-j"), 10) === join);
    $("miterRow").className = "row" + (join === 0 ? "" : " off");
  }
  function step(d) {
    var v = parse(offsetEl.value);
    if (isNaN(v)) v = 0;
    offsetEl.value = fmt(v + d);
    syncChips();
  }
  function tidy(el) { var v = parse(el.value); if (!isNaN(v)) el.value = fmt(v); }
  function enterApplies(el) { el.onkeydown = function (e) { if (e.keyCode === 13) { el.blur(); apply(); } }; }

  curEl.oninput = updateCalc; tgtEl.oninput = updateCalc;
  curEl.onblur = function () { tidy(curEl); updateCalc(); };
  tgtEl.onblur = function () { tidy(tgtEl); updateCalc(); };
  enterApplies(curEl); enterApplies(tgtEl); enterApplies(miterEl);

  $("minus").onclick = function () { step(-0.05); };
  $("plus").onclick = function () { step(0.05); };
  offsetEl.oninput = syncChips;
  offsetEl.onblur = function () { tidy(offsetEl); syncChips(); };
  offsetEl.onkeydown = function (e) {
    if (e.keyCode === 13) { offsetEl.blur(); apply(); }
    else if (e.keyCode === 38) { e.preventDefault(); step(0.05); }
    else if (e.keyCode === 40) { e.preventDefault(); step(-0.05); }
  };
  for (var c = 0; c < chips.length; c++) {
    chips[c].onclick = function () { offsetEl.value = fmt(parse(this.getAttribute("data-v"))); syncChips(); };
  }
  for (var j = 0; j < joinBtns.length; j++) {
    joinBtns[j].onclick = function () { join = parseInt(this.getAttribute("data-j"), 10); syncJoin(); };
  }
  $("expand").onclick = function () { pressed(this, !isOn(this)); };
  $("keep").onclick = function () { pressed(this, !isOn(this)); };

  autoEl.onclick = function () { pressed(this, !isOn(this)); lastSig = ""; };
  for (var d = 0; d < dimBtns.length; d++) {
    dimBtns[d].onclick = function () {
      dim = this.getAttribute("data-d");
      for (var k = 0; k < dimBtns.length; k++) pressed(dimBtns[k], dimBtns[k] === this);
      lastSig = "";
    };
  }

  // ---------- reset + status (used by the side menu) ----------
  OF.setStatus = setStatus;
  OF.resetDefaults = function () {
    curEl.value = DEFAULTS.cur; tgtEl.value = DEFAULTS.tgt; offsetEl.value = DEFAULTS.offset;
    miterEl.value = DEFAULTS.miter; join = DEFAULTS.join;
    pressed($("expand"), DEFAULTS.expand); pressed($("keep"), DEFAULTS.keep);
    updateCalc(); syncChips(); syncJoin(); lastSig = "";
  };

  // ---------- apply ----------
  function apply() {
    if (!OF.license.isActive()) { OF.license.showLock(); return; }
    var off = currentOffset();
    if (off === null) {
      setStatus(mode === "match" ? "Enter both current and target size" : "Enter an offset value, e.g. -0.2", "warn", 2500);
      return;
    }
    if (off === 0) {
      setStatus(mode === "match" ? "Current and target are the same" : "Offset can't be 0", "warn", 2500);
      return;
    }
    var miter = parse(miterEl.value);
    if (isNaN(miter) || miter < 1) miter = 100;
    if (miter > 500) miter = 500;
    setStatus("Applying…", "", 8000);
    var code = "offsetForgeApply(" + off + "," + join + "," + miter + "," + isOn($("expand")) + "," + isOn($("keep")) + ")";
    run(code, function (r) {
      r = String(r);
      if (r.indexOf("ok:") === 0) {
        var n = r.slice(3);
        setStatus("Applied " + signed(off) + " px to " + n + (n === "1" ? " object" : " objects"), "ok", 2800);
      }
      else if (r === "none") setStatus("Select artwork first", "warn", 2500);
      else if (r === "nodoc") setStatus("Open a document first", "warn", 2500);
      else setStatus(r.indexOf("err:") === 0 ? r.slice(4) : "Something went wrong", "err", 3500);
    });
  }
  $("apply").onclick = apply;

  // ---------- live selection info + auto-detect ----------
  function refreshCount() {
    run("offsetForgeInfo()", function (r) {
      var p = String(r).split("|");
      var n = parseInt(p[0], 10), w = parseFloat(p[1]), h = parseFloat(p[2]), t = parseFloat(p[3]);
      if (isNaN(n)) n = 0;
      if (isNaN(t)) t = 0;
      var has = n > 0 && !isNaN(w) && !isNaN(h) && w > 0 && h > 0;
      if (has) {
        selread.textContent = "Size " + fmt(w) + " \u00d7 " + fmt(h) + " px  \u00b7  line \u2248 " + (t > 0 ? fmt(t) + " px" : "\u2014");
      } else {
        selread.textContent = "Selection \u2014";
      }

      if (Date.now() >= busyUntil) {
        if (n <= 0) setStatus("No objects selected", "", 0);
        else setStatus(n + (n === 1 ? " object selected" : " objects selected"), "ok", 0);
      }

      var val = dim === "t" ? t : (dim === "w" ? w : h);
      var sig = n + ":" + w + ":" + h + ":" + t + ":" + dim;
      if (sig !== lastSig) {
        lastSig = sig;
        if (isOn(autoEl) && has && val > 0 && document.activeElement !== curEl) {
          curEl.value = fmt(val);
          updateCalc();
        }
      }
    });
  }
  setInterval(refreshCount, 1000);

  syncMode(); updateCalc(); syncChips(); syncJoin(); refreshCount();
  $("ver").textContent = "v" + window.OF_CONFIG.VERSION;
  OF.license.boot(function () { OF.updater.check(false); });
})();
