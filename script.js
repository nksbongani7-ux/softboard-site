/* PDIS-16 site interactions — vanilla, no dependencies.
   Progressive enhancement: page is fully readable without JS,
   and all motion respects prefers-reduced-motion.            */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    var els = [].slice.call(document.querySelectorAll(".reveal"));
    if (!("IntersectionObserver" in window) || reduce) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- helper: build an SVG path 'd' from points ---------- */
  function pathFrom(pts) {
    return pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
  }

  /* ---------- hero live monitor: drifting line + ticking number ---------- */
  function initMonitor() {
    var svg = document.getElementById("mchart");
    if (!svg) return;
    var W = 520, H = 150, ns = "http://www.w3.org/2000/svg";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    // band separators (visual reference lines)
    [0.5, 0.75].forEach(function (f) {
      var l = document.createElementNS(ns, "line");
      l.setAttribute("x1", 0); l.setAttribute("x2", W);
      l.setAttribute("y1", H * (1 - f)); l.setAttribute("y2", H * (1 - f));
      l.setAttribute("stroke", "#E5E8EC"); l.setAttribute("stroke-dasharray", "3 5");
      svg.appendChild(l);
    });
    var area = document.createElementNS(ns, "path");
    area.setAttribute("fill", "url(#mgrad)"); area.setAttribute("opacity", "0.5");
    var line = document.createElementNS(ns, "path");
    line.setAttribute("fill", "none"); line.setAttribute("stroke", "#E39411");
    line.setAttribute("stroke-width", "2.4"); line.setAttribute("stroke-linejoin", "round"); line.setAttribute("stroke-linecap", "round");
    var head = document.createElementNS(ns, "circle");
    head.setAttribute("r", "3.6"); head.setAttribute("fill", "#E39411");
    // gradient
    var defs = document.createElementNS(ns, "defs");
    defs.innerHTML = '<linearGradient id="mgrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#E39411" stop-opacity="0.28"/>' +
      '<stop offset="1" stop-color="#E39411" stop-opacity="0"/></linearGradient>';
    svg.appendChild(defs); svg.appendChild(area); svg.appendChild(line); svg.appendChild(head);

    var N = 60, data = [], base = 0.30;
    for (var i = 0; i < N; i++) data.push(base + Math.sin(i / 7) * 0.02);
    var dval = document.getElementById("dval");
    var t = 0, phase = 0;

    function frame() {
      t += 1;
      // slow upward drift with gentle noise, resetting occasionally
      phase += 0.012;
      var target = 0.30 + (Math.sin(phase) * 0.5 + 0.5) * 0.42; // 0.30 .. 0.72
      var last = data[data.length - 1];
      var next = last + (target - last) * 0.05 + (Math.random() - 0.5) * 0.012;
      next = Math.max(0.12, Math.min(0.82, next));
      data.push(next); data.shift();

      var pts = data.map(function (v, idx) { return [idx / (N - 1) * W, H - v * H]; });
      line.setAttribute("d", pathFrom(pts));
      area.setAttribute("d", pathFrom(pts) + " L" + W + " " + H + " L0 " + H + " Z");
      var hp = pts[pts.length - 1];
      head.setAttribute("cx", hp[0]); head.setAttribute("cy", hp[1]);
      var col = next < 0.5 ? "#1F9D6B" : (next < 0.75 ? "#E0A32E" : "#D8452B");
      line.setAttribute("stroke", col); head.setAttribute("fill", col);
      if (dval) { dval.textContent = next.toFixed(2); dval.style.color = col; }
    }
    frame();
    if (!reduce) {
      var iv = setInterval(frame, 90);
      // pause when tab hidden
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) { clearInterval(iv); }
        else { iv = setInterval(frame, 90); }
      });
    }
  }

  /* ---------- threshold vs physics static plots (animated draw) ---------- */
  function drawShift() {
    var W = 440, H = 170, ns = "http://www.w3.org/2000/svg";
    // shared underlying signal: slow rise then a knee upward (impending failure)
    var raw = [];
    for (var i = 0; i <= 60; i++) {
      var x = i / 60;
      var y = 0.30 + x * 0.20 + Math.pow(Math.max(0, x - 0.55) / 0.45, 2.2) * 0.5 + Math.sin(i / 3) * 0.015;
      raw.push(y);
    }
    function toPts(vals) { return vals.map(function (v, i) { return [i / 60 * W, H - Math.min(0.95, v) * H]; }); }

    // ---- LEFT: threshold ----
    var s1 = document.getElementById("plot-threshold");
    if (s1) {
      s1.setAttribute("viewBox", "0 0 " + W + " " + H);
      var thr = 0.82, thrY = H - thr * H;
      var tl = document.createElementNS(ns, "line");
      tl.setAttribute("x1", 0); tl.setAttribute("x2", W); tl.setAttribute("y1", thrY); tl.setAttribute("y2", thrY);
      tl.setAttribute("stroke", "#D8452B"); tl.setAttribute("stroke-width", "1.6"); tl.setAttribute("stroke-dasharray", "5 4");
      s1.appendChild(tl);
      var lbl = document.createElementNS(ns, "text");
      lbl.setAttribute("x", 6); lbl.setAttribute("y", thrY - 6); lbl.setAttribute("fill", "#D8452B");
      lbl.setAttribute("font-size", "10"); lbl.setAttribute("font-family", "IBM Plex Mono, monospace");
      lbl.textContent = "ALARM THRESHOLD"; s1.appendChild(lbl);
      // signal stays flat/green until it crosses, only then "seen"
      var p1 = document.createElementNS(ns, "path");
      p1.setAttribute("fill", "none"); p1.setAttribute("stroke", "#98A2AE"); p1.setAttribute("stroke-width", "2.2");
      p1.setAttribute("d", pathFrom(toPts(raw))); s1.appendChild(p1);
      // find crossing
      var cross = raw.findIndex(function (v) { return v >= thr; });
      if (cross > -1) {
        var cx = cross / 60 * W;
        var band = document.createElementNS(ns, "rect");
        band.setAttribute("x", cx); band.setAttribute("y", 0); band.setAttribute("width", W - cx); band.setAttribute("height", H);
        band.setAttribute("fill", "#D8452B"); band.setAttribute("opacity", "0.07"); s1.insertBefore(band, p1);
        var mk = document.createElementNS(ns, "circle");
        mk.setAttribute("cx", cx); mk.setAttribute("cy", thrY); mk.setAttribute("r", "4.5"); mk.setAttribute("fill", "#D8452B"); s1.appendChild(mk);
        var t2 = document.createElementNS(ns, "text");
        t2.setAttribute("x", Math.min(cx + 6, W - 70)); t2.setAttribute("y", 18); t2.setAttribute("fill", "#D8452B");
        t2.setAttribute("font-size", "10"); t2.setAttribute("font-family", "IBM Plex Mono, monospace"); t2.setAttribute("font-weight", "600");
        t2.textContent = "TOO LATE"; s1.appendChild(t2);
      }
      animateStroke(p1);
    }

    // ---- RIGHT: physics / drift ----
    var s2 = document.getElementById("plot-physics");
    if (s2) {
      s2.setAttribute("viewBox", "0 0 " + W + " " + H);
      // early flag where drift trend departs from baseline (well before threshold)
      var flagIdx = 33; var fx = flagIdx / 60 * W;
      var band2 = document.createElementNS(ns, "rect");
      band2.setAttribute("x", fx); band2.setAttribute("y", 0); band2.setAttribute("width", W - fx); band2.setAttribute("height", H);
      band2.setAttribute("fill", "#1F9D6B"); band2.setAttribute("opacity", "0.06"); s2.appendChild(band2);
      var p2 = document.createElementNS(ns, "path");
      p2.setAttribute("fill", "none"); p2.setAttribute("stroke", "#E39411"); p2.setAttribute("stroke-width", "2.4");
      p2.setAttribute("d", pathFrom(toPts(raw))); s2.appendChild(p2);
      var fl = document.createElementNS(ns, "line");
      fl.setAttribute("x1", fx); fl.setAttribute("x2", fx); fl.setAttribute("y1", 0); fl.setAttribute("y2", H);
      fl.setAttribute("stroke", "#1F9D6B"); fl.setAttribute("stroke-width", "1.6"); fl.setAttribute("stroke-dasharray", "5 4"); s2.appendChild(fl);
      var mk2 = document.createElementNS(ns, "circle");
      var my = H - Math.min(0.95, raw[flagIdx]) * H;
      mk2.setAttribute("cx", fx); mk2.setAttribute("cy", my); mk2.setAttribute("r", "4.5"); mk2.setAttribute("fill", "#1F9D6B"); s2.appendChild(mk2);
      var t3 = document.createElementNS(ns, "text");
      t3.setAttribute("x", fx + 6); t3.setAttribute("y", 18); t3.setAttribute("fill", "#1F9D6B");
      t3.setAttribute("font-size", "10"); t3.setAttribute("font-family", "IBM Plex Mono, monospace"); t3.setAttribute("font-weight", "600");
      t3.textContent = "DRIFT FLAGGED EARLY"; s2.appendChild(t3);
      animateStroke(p2);
    }
  }
  function animateStroke(path) {
    if (reduce) return;
    try {
      var len = path.getTotalLength();
      path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
      // trigger when in view
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (e.isIntersecting) {
            path.style.transition = "stroke-dashoffset 1.6s ease";
            path.style.strokeDashoffset = "0";
            io.disconnect();
          }
        });
      }, { threshold: 0.3 });
      io.observe(path);
    } catch (e) { /* getTotalLength unsupported: leave drawn */ }
  }

  /* ---------- pipeline packet animation on view ---------- */
  function initPipeline() {
    var track = document.querySelector(".pipe-track");
    if (!track || reduce) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) track.classList.add("animate"); });
    }, { threshold: 0.3 });
    io.observe(track);
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  ready(function () {
    initReveal();
    initMonitor();
    drawShift();
    initPipeline();
  });
})();
