/* Boot, loop com timestep fixo, HUD, overlays, pausa/mudo. */
(function () {
  var W = 240, H = 320;
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  var elScore = document.getElementById("hud-score");
  var elLevel = document.getElementById("hud-level");
  var elLives = document.getElementById("hud-lives");
  var elEnergy = document.getElementById("energy-fill");
  var overlay = document.getElementById("overlay");
  var ovTitle = document.getElementById("overlay-title");
  var ovSub = document.getElementById("overlay-sub");
  var btnStart = document.getElementById("btn-start");
  var flash = document.getElementById("flash-msg");

  var game = new window.Game(W, H);
  window.initInput(
    canvas,
    document.getElementById("btn-left"),
    document.getElementById("btn-right"),
    document.getElementById("btn-fire")
  );

  var NAMES = { burger: "HAMBÚRGUER", cookie: "BOLACHA", iron: "FERRO", bowtie: "GRAVATA", diamond: "DIAMANTE" };
  var flashT = 0, lastScore = -1, lastLives = -1, lastLevel = -1;

  function showFlash(txt, secs) {
    flash.textContent = txt;
    flash.style.display = "block";
    flashT = secs || 2;
  }

  game.onEvent = function (name, d) {
    if (name === "level" || name === "start") {
      var lv = (name === "start") ? 1 : d.level;
      showFlash("FASE " + lv + " — " + (NAMES[game.type] || ""), 2);
    } else if (name === "clear") {
      showFlash("ONDA DESTRUÍDA! +ENERGIA", 2);
    } else if (name === "death") {
      showFlash(d.reason === "fuel" ? "SEM ENERGIA!" : "NAVE DESTRUÍDA!", 1.5);
    } else if (name === "gameover") {
      var hi = 0;
      try {
        hi = parseInt(localStorage.getItem("mega_hi") || "0", 10) || 0;
        if (d.score > hi) { hi = d.score; localStorage.setItem("mega_hi", String(hi)); }
      } catch (_) {}
      ovTitle.innerHTML = "GAME<br>OVER";
      ovSub.textContent = "SCORE " + d.score + (d.score >= hi && d.score > 0 ? " — RECORDE!" : " — RECORDE " + hi);
      btnStart.textContent = "↻ JOGAR DE NOVO";
      overlay.classList.add("show");
    }
  };

  function startGame() {
    window.Sound.ensure();
    game.newGame();
    overlay.classList.remove("show");
    showFlash("FASE 1 — " + (NAMES[game.type] || ""), 2);
  }
  btnStart.addEventListener("click", startGame);
  window.Input.onConfirm = function () {
    if (overlay.classList.contains("show")) startGame();
  };
  window.Input.onPause = function () {
    if (game.state === "playing") { game.state = "paused"; showFlash("PAUSA", 999); }
    else if (game.state === "paused") { game.state = "playing"; flash.style.display = "none"; }
  };
  window.Input.onMute = function () {
    var m = window.Sound.toggleMute();
    showFlash(m ? "SOM OFF" : "SOM ON", 1);
  };
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && game.state === "playing") {
      game.state = "paused"; showFlash("PAUSA", 999);
    }
  });

  function pad(n) {
    n = String(Math.max(0, n | 0));
    while (n.length < 6) n = "0" + n;
    return n;
  }

  function hud() {
    if (game.score !== lastScore) { elScore.textContent = pad(game.score); lastScore = game.score; }
    if (game.lives !== lastLives) { elLives.textContent = game.lives; lastLives = game.lives; }
    if (game.level !== lastLevel) { elLevel.textContent = game.level; lastLevel = game.level; }
    var e = Math.max(0, game.energy);
    elEnergy.style.width = e + "%";
    elEnergy.classList.toggle("low", e < 30);
  }

  var STEP = 1 / 60, acc = 0, last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    if (flashT > 0 && game.state !== "paused") {
      flashT -= dt;
      if (flashT <= 0) flash.style.display = "none";
    }
    if (game.state !== "paused") {
      acc += dt;
      var n = 0;
      while (acc >= STEP && n < 5) { game.update(STEP, window.Input); acc -= STEP; n++; }
      if (n === 5) acc = 0;
      game.render(ctx);
      hud();
    }
  }
  game.spawnLevel();
  requestAnimationFrame(loop);
})();
