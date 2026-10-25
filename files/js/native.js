(function () {
  var OF = window.OF = window.OF || {};
  var N = { ok: false };
  var req = null;
  try { req = (window.cep_node && window.cep_node.require) || (typeof require === "function" ? require : null); } catch (e) {}
  if (req) {
    try {
      N.https = req("https"); N.http = req("http"); N.fs = req("fs"); N.path = req("path");
      N.os = req("os"); N.crypto = req("crypto"); N.url = req("url"); N.Buffer = req("buffer").Buffer;
      N.ok = true;
    } catch (e2) { N.ok = false; }
  }
  window.OF_NODE = N;

  // GET -> cb(err, bufferOrString, status)
  OF.get = function (url, cb, hops) {
    hops = hops || 0;
    var done = false;
    function fin(e, d, s) { if (done) return; done = true; cb(e, d, s); }
    if (!N.ok) {
      try {
        var x = new XMLHttpRequest();
        x.open("GET", url, true); x.timeout = 10000;
        x.onload = function () { fin(null, x.responseText, x.status); };
        x.onerror = function () { fin(new Error("Network error")); };
        x.ontimeout = function () { fin(new Error("Timed out")); };
        x.send();
      } catch (e3) { fin(e3); }
      return;
    }
    var lib = url.indexOf("https:") === 0 ? N.https : N.http;
    var rq = lib.get(url, { headers: { "User-Agent": "OffsetForge", "Cache-Control": "no-cache" } }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 5) {
        res.resume(); done = true;
        return OF.get(N.url.resolve(url, res.headers.location), cb, hops + 1);
      }
      var chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () { fin(null, N.Buffer.concat(chunks), res.statusCode); });
      res.on("error", function (e4) { fin(e4); });
    });
    rq.setTimeout(10000, function () { rq.abort(); fin(new Error("Timed out")); });
    rq.on("error", function (e5) { fin(e5); });
  };

  OF.text = function (d) { return typeof d === "string" ? d : d.toString("utf8"); };

  OF.openUrl = function (url) {
    try { window.__adobe_cep__.openURLInDefaultBrowser(url); } catch (e) { try { window.open(url); } catch (e2) {} }
  };

  // Stable per-computer id (computer name + user + OS), hashed
  OF.deviceId = function () {
    try {
      if (N.ok) {
        var parts = [];
        try { parts.push(N.os.hostname()); } catch (a) {}
        try { parts.push(N.os.platform() + N.os.arch()); } catch (b) {}
        try { parts.push(N.os.userInfo().username); } catch (c) {}
        return "of-" + N.crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
      }
    } catch (e) {}
    var k = "offsetforge.device", v = null;
    try { v = localStorage.getItem(k); if (!v) { v = "of-" + Math.random().toString(16).slice(2) + Date.now().toString(16); localStorage.setItem(k, v); } } catch (e6) { v = "of-unknown"; }
    return v;
  };
})();
