(function () {
  var OF = window.OF = window.OF || {};
  var C = window.OF_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var cur = "home", prev = "home";
  var SITE = "https://rabbyhossain.com";
  var TITLES = { how: "How to use", license: "License", updates: "Updates", about: "About" };

  var TPL = {
    how:
      '<div class="step-card"><i>1</i><div><h3>Select your artwork</h3><p>Pick an outlined icon or shape. If it uses live strokes, outline them first (Object &gt; Path &gt; Outline Stroke).</p></div></div>' +
      '<div class="step-card"><i>2</i><div><h3>Match size</h3><p>Current is detected from your selection (line thickness, width or height). Type the Target size you want and the offset is worked out for you.</p></div></div>' +
      '<div class="step-card"><i>3</i><div><h3>Or type an offset</h3><p>Use Manual offset to enter the Offset Path value yourself. Negative shrinks inward, positive grows outward.</p></div></div>' +
      '<div class="step-card"><i>4</i><div><h3>Apply</h3><p>Click Apply Offset. Expand to vector makes real shapes; Keep original leaves your artwork untouched.</p></div></div>' +
      '<p class="note">Tip: merge overlapping pieces with Pathfinder &gt; Unite for an accurate thickness reading, and use Round joins if sharp corners push past your target.</p>',
    license:
      '<div class="info-card"><span class="eyebrow">LICENSE</span>' +
      '<div class="info-row"><span>Status</span><b id="lcStatus">-</b></div>' +
      '<div class="info-row"><span>License key</span><b id="lcKey" class="mono">-</b></div>' +
      '<div class="info-row"><span>This device</span><b id="lcDev" class="mono">-</b></div></div>' +
      '<button id="lcBtn" class="outline-btn">Deactivate this device</button>' +
      '<div id="lcMsg" class="msg"></div>' +
      '<p class="note">One license key works on one device. To move Offset Forge to another computer, deactivate it here first, then activate on the new one.</p>',
    updates:
      '<div class="info-card"><span class="eyebrow">UPDATES</span>' +
      '<div class="info-row"><span>Installed version</span><b id="upVer">-</b></div>' +
      '<div class="info-row"><span>Status</span><b id="upStatus">Checking\u2026</b></div></div>' +
      '<button id="upCheck" class="outline-btn">Check again</button>' +
      '<p class="note">Offset Forge checks for updates every time it opens. When a new version is ready you will see a popup with what\u2019s new.</p>',
    about:
      '<div class="about"><div class="logo big"><svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="#0b0910" stroke-width="1.6" aria-hidden="true"><rect x="2" y="2" width="14" height="14" rx="3"/><rect x="6" y="6" width="6" height="6" rx="1.5"/></svg></div>' +
      '<h2>Offset Forge</h2><p id="abVer">Version</p>' +
      '<p>Set the exact line thickness or size of icons and shapes in Illustrator. Enter the current and target size and Offset Forge applies the right Offset Path for you.</p></div>' +
      '<div class="info-card"><span class="eyebrow">DEVELOPER</span>' +
      '<div class="info-row"><span>Created by</span><b>Rabby Hossain</b></div>' +
      '<div class="info-row"><span>Website</span><b>rabbyhossain.com</b></div></div>' +
      '<button id="abSite" class="outline-btn">Visit rabbyhossain.com</button>' +
      '<p class="note">&copy; 2026 Rabby Hossain. All rights reserved.</p>'
  };

  function mark() {
    var b = document.querySelectorAll(".d-item");
    for (var i = 0; i < b.length; i++) b[i].className = "d-item" + (b[i].getAttribute("data-go") === cur ? " on" : "");
  }
  function openDrawer() { $("dVer").textContent = "Version " + C.VERSION; mark(); $("drawer").hidden = false; $("scrim").hidden = false; }
  function closeDrawer() { $("drawer").hidden = true; $("scrim").hidden = true; }
  function hidePage() { $("page").hidden = true; }
  function setMsg(t, k) { var m = $("lcMsg"); if (m) { m.textContent = t || ""; m.className = "msg" + (k ? " " + k : ""); } }

  var FILL = {
    how: function () {},
    license: function () {
      var act = OF.license.isActive();
      var st = $("lcStatus"); st.textContent = act ? "Active" : "Not activated"; st.className = act ? "good" : "bad";
      $("lcKey").textContent = act && OF.license.masked() ? OF.license.masked() : "\u2014";
      $("lcDev").textContent = OF.deviceId();
      var btn = $("lcBtn"); btn.textContent = act ? "Deactivate this device" : "Enter license key";
      btn.onclick = function () {
        if (!OF.license.isActive()) { hidePage(); cur = "home"; OF.license.showLock(); return; }
        btn.disabled = true; setMsg("Deactivating\u2026", "");
        OF.license.deactivate(function (ok, msg) {
          btn.disabled = false;
          if (ok) { hidePage(); cur = "home"; } else setMsg(msg, "err");
        });
      };
    },
    updates: function () {
      $("upVer").textContent = "v" + C.VERSION;
      function run() {
        $("upStatus").textContent = "Checking\u2026";
        OF.updater.check(true, function (t) { $("upStatus").textContent = t; });
      }
      $("upCheck").onclick = run;
      run();
    },
    about: function () {
      $("abVer").textContent = "Version " + C.VERSION;
      $("abSite").onclick = function () { OF.openUrl(SITE); };
    }
  };

  function render(name) {
    $("pgTitle").textContent = TITLES[name];
    $("pgBody").innerHTML = TPL[name];
    FILL[name]();
    $("page").hidden = false;
  }

  function go(name) {
    closeDrawer();
    if (name === "home") { hidePage(); cur = "home"; prev = "home"; return; }
    if (name === "reset") {
      OF.resetDefaults(); hidePage(); cur = "home"; prev = "home";
      if (OF.setStatus) OF.setStatus("Settings reset to defaults", "ok", 2500);
      return;
    }
    if (name !== cur) prev = cur;
    cur = name;
    render(name);
  }

  var items = document.querySelectorAll(".d-item");
  for (var i = 0; i < items.length; i++) {
    items[i].onclick = function () { go(this.getAttribute("data-go")); };
  }
  $("menuBtn").onclick = openDrawer;
  $("pgMenu").onclick = openDrawer;
  $("scrim").onclick = closeDrawer;
  $("pgHome").onclick = function () { go("home"); };
  $("pgBack").onclick = function () { go(prev || "home"); };
  $("siteLink").onclick = function () { OF.openUrl(SITE); };
  document.addEventListener("keydown", function (e) { if (e.keyCode === 27) closeDrawer(); });

  OF.menu = { go: go };
})();
