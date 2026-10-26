(function () {
  var OF = window.OF = window.OF || {};
  var C = window.OF_CONFIG, N = window.OF_NODE;
  var $ = function (id) { return document.getElementById(id); };
  var pending = null, busy = false;

  function cmp(a, b) {
    var x = String(a).split("."), y = String(b).split("."), i, d;
    for (i = 0; i < 3; i++) { d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0); if (d) return d > 0 ? 1 : -1; }
    return 0;
  }
  function extDir() {
    try {
      var p = decodeURIComponent(String(window.__adobe_cep__.getSystemPath("extension")).replace(/^file:\/\//, ""));
      if (/^\/[A-Za-z]:/.test(p)) p = p.slice(1);
      return p;
    } catch (e) { return null; }
  }
  function safePath(p) {
    return typeof p === "string" && p.indexOf("..") < 0 &&
      /^(index\.html|(css|js|jsx)\/[A-Za-z0-9_.\-]+(\/[A-Za-z0-9_.\-]+)*)$/.test(p);
  }
  // GitHub first, then GitHub API, then a CDN mirror (for networks that block one of them)
  function sources(path) {
    var repo = C.UPDATE_REPO || "rabbyhossain2927/offsetforge-updates";
    return [
      { name: "github", url: "https://raw.githubusercontent.com/" + repo + "/main/" + path },
      { name: "api", url: "https://api.github.com/repos/" + repo + "/contents/" + path + "?ref=main", headers: { Accept: "application/vnd.github.raw+json" } },
      { name: "cdn", url: "https://cdn.jsdelivr.net/gh/" + repo + "@main/" + path }
    ];
  }
  function setMsg(t, k) { var m = $("updMsg"); m.textContent = t || ""; m.className = "msg" + (k ? " " + k : ""); }
  function hide() { $("upd").hidden = true; }

  function show(info) {
    pending = info;
    $("updSub").textContent = "Offset Forge v" + info.version + " is ready. You have v" + C.VERSION + ".";
    var ul = $("updNotes"); ul.innerHTML = "";
    var notes = info.notes || [];
    for (var i = 0; i < notes.length && i < 8; i++) { var li = document.createElement("li"); li.textContent = String(notes[i]); ul.appendChild(li); }
    $("updGo").disabled = false; $("updGo").textContent = "Update now";
    setMsg("");
    $("upd").hidden = false;
  }

  // report(text, kind) is optional - used for the manual "Check for updates" buttons
  function check(manual, report) {
    var valid = function (d) { var j = JSON.parse(OF.text(d)); return !!(j && j.version); };
    OF.getFirst(sources("update.json"), valid, function (err, data) {
      if (err) {
        if (manual && report) report("Couldn't check for updates (" + String(err.message).slice(0, 110) + ")", "warn");
        return;
      }
      var info = JSON.parse(OF.text(data));
      if (cmp(info.version, C.VERSION) > 0) { show(info); if (manual && report) report("Update available: v" + info.version, "ok"); }
      else if (manual && report) report("You're up to date (v" + C.VERSION + ")", "ok");
    });
  }

  function install(info) {
    if (busy) return;
    var dir = extDir();
    if (!info.files || !info.files.length || !info.baseUrl || !N.ok || !dir) {
      OF.openUrl(info.downloadUrl || C.SHOP_URL); hide(); return;
    }
    busy = true; $("updGo").disabled = true;
    var base = String(info.baseUrl).replace(/\/?$/, "/"), files = info.files, got = [], i = 0;

    function fail(m) { busy = false; $("updGo").disabled = false; $("updGo").textContent = "Try again"; setMsg(m, "err"); }

    function next() {
      if (i >= files.length) return write();
      var f = files[i];
      if (!f || !safePath(f.path) || !/^[a-f0-9]{64}$/i.test(f.sha256 || "")) return fail("The update file list is invalid");
      $("updGo").textContent = "Downloading " + (i + 1) + "/" + files.length + "\u2026";
      var want = f.sha256.toLowerCase();
      var okHash = function (buf) { return N.crypto.createHash("sha256").update(buf).digest("hex").toLowerCase() === want; };
      OF.getFirst(sources("files/" + f.path), okHash, function (err, buf) {
        if (err) return fail("Download failed (" + String(err.message).slice(0, 110) + ")");
        got.push({ path: f.path, buf: buf }); i++; next();
      });
    }

    function write() {
      try {
        for (var k = 0; k < got.length; k++) {
          var dest = N.path.join(dir, got[k].path), tmp = dest + ".new";
          N.fs.mkdirSync(N.path.dirname(dest), { recursive: true });
          N.fs.writeFileSync(tmp, got[k].buf);
          N.fs.renameSync(tmp, dest);
        }
      } catch (e) { return fail("Couldn't write the update: " + e.message); }
      $("updGo").textContent = "Updated";
      setMsg("Updated to v" + info.version + ". Reloading\u2026", "ok");
      try { window.__adobe_cep__.evalScript('$.evalFile("' + dir.replace(/\\/g, "/") + '/jsx/host.jsx")', function () {}); } catch (e2) {}
      setTimeout(function () { location.reload(); }, 1000);
    }
    next();
  }

  $("updGo").onclick = function () { if (pending) install(pending); };
  $("updLater").onclick = hide;

  OF.updater = { check: check };
})();
