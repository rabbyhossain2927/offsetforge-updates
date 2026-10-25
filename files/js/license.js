(function () {
  var OF = window.OF = window.OF || {};
  var C = window.OF_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var STORE = "offsetforge.license.v1";
  var active = false, working = false;

  function load() { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; } }
  function save(o) { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} }
  function clear() { try { localStorage.removeItem(STORE); } catch (e) {} }

  function setMsg(t, k) { var m = $("licMsg"); m.textContent = t || ""; m.className = "msg" + (k ? " " + k : ""); }
  function showLock(msg, kind) { $("lock").hidden = false; setMsg(msg, kind); }
  function hideLock() { $("lock").hidden = true; }
  function errText(j) { return (j && (j.error || j.message || j.reason)) || "That license key couldn't be verified"; }

  // action: activate | check | deactivate  ->  cb(json)
  function api(action, key, cb) {
    var url = C.API_BASE + "/" + action + "?key=" + encodeURIComponent(key) +
      "&product=" + encodeURIComponent(C.PRODUCT_SLUG) + "&device=" + encodeURIComponent(OF.deviceId());
    OF.get(url, function (err, data, status) {
      if (err) return cb({ ok: false, network: true, error: String(err.message || err) });
      var j = null;
      try { j = JSON.parse(OF.text(data)); } catch (e) {}
      if (!j) return cb({ ok: false, error: "Unexpected response from the license server (HTTP " + status + ")" });
      cb(j);
    });
  }

  function activate() {
    if (working) return;
    var key = $("licKey").value.replace(/\s+/g, "");
    if (!key) { setMsg("Enter your license key", "err"); return; }
    working = true; $("licBtn").disabled = true; $("licBtn").textContent = "Activating…"; setMsg("");
    api("activate", key, function (j) {
      working = false; $("licBtn").disabled = false; $("licBtn").textContent = "Activate";
      if (j && j.ok) {
        save({ key: key, lastOk: Date.now() });
        active = true; hideLock();
      } else {
        setMsg(j && j.network ? "Can't reach the license server. Check your internet connection." : errText(j), "err");
      }
    });
  }

  function boot(done) {
    var lic = load();
    if (!lic || !lic.key) { showLock(); if (done) done(false); return; }
    api("check", lic.key, function (j) {
      if (j && j.ok) {
        lic.lastOk = Date.now(); save(lic); active = true; hideLock();
      } else if (j && j.network) {
        var days = (Date.now() - (lic.lastOk || 0)) / 86400000;
        if (days <= C.OFFLINE_GRACE_DAYS) { active = true; hideLock(); }
        else { $("licKey").value = lic.key; showLock("Couldn't verify your license. Connect to the internet to continue.", "err"); }
      } else {
        active = false; $("licKey").value = lic.key; showLock(errText(j), "err");
      }
      if (done) done(active);
    });
  }

  function deactivate(cb) {
    var lic = load();
    if (!lic || !lic.key) { cb(false, "No license is active on this device"); return; }
    api("deactivate", lic.key, function (j) {
      if (j && j.ok) {
        clear(); active = false; $("licKey").value = "";
        showLock("This device was deactivated. You can activate your key on another computer.", "ok");
        cb(true, "");
      } else {
        cb(false, j && j.network ? "Can't reach the license server" : errText(j));
      }
    });
  }

  function masked() {
    var l = load();
    if (!l || !l.key) return "";
    return l.key.length > 8 ? l.key.slice(0, 4) + "\u2026" + l.key.slice(-4) : l.key;
  }

  $("licBtn").onclick = activate;
  $("licKey").onkeydown = function (e) { if (e.keyCode === 13) activate(); };
  $("buyBtn").onclick = function () { OF.openUrl(C.SHOP_URL); };

  OF.license = { boot: boot, deactivate: deactivate, isActive: function () { return active; }, masked: masked, showLock: showLock };
})();
