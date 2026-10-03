/* Áudio procedural via WebAudio: laser agudo + explosão crushing. */
(function () {
  var ctx = null, muted = false;

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function env(g, t0, peak, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function laser() {
    if (muted || !ensure()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(1600, t);
    o.frequency.exponentialRampToValueAtTime(280, t + 0.12);
    env(g, t, 0.12, 0.13);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.15);
  }

  // crushing: ruído + lowpass descendente
  function explosion(big) {
    if (muted || !ensure()) return;
    var t = ctx.currentTime, dur = big ? 0.55 : 0.32;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(big ? 2500 : 3200, t);
    f.frequency.exponentialRampToValueAtTime(120, t + dur);
    var g = ctx.createGain();
    env(g, t, big ? 0.35 : 0.25, dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
  }

  function waveClear() {
    if (muted || !ensure()) return;
    var t = ctx.currentTime;
    [660, 880, 1320].forEach(function (fr, i) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = fr;
      var t0 = t + i * 0.09;
      env(g, t0, 0.1, 0.1);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + 0.12);
    });
  }

  function toggleMute() { muted = !muted; return muted; }
  window.Sound = { ensure: ensure, laser: laser, explosion: explosion, waveClear: waveClear, toggleMute: toggleMute };
})();
