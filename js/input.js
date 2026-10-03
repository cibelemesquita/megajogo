/* Abstração de input: left/right/fire + touch (arrastar = mover, auto-tiro). */
(function () {
  var Input = {
    left: false, right: false, fire: false,
    touchActive: false, touchX: 0.5, usingTouch: false,
    onPause: null, onMute: null, onConfirm: null
  };

  function init(canvas, btnL, btnR, btnF) {
    function firstGesture() {
      Input.usingTouch = Input.usingTouch || ("ontouchstart" in window);
      if (window.Sound) window.Sound.ensure();
    }
    window.addEventListener("pointerdown", firstGesture, { passive: true });
    window.addEventListener("keydown", firstGesture);

    window.addEventListener("keydown", function (e) {
      var k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") { Input.left = true; e.preventDefault(); }
      else if (k === "ArrowRight" || k === "d" || k === "D") { Input.right = true; e.preventDefault(); }
      else if (k === " " || k === "j" || k === "J" || k === "z" || k === "Z") {
        Input.fire = true; e.preventDefault();
        if (Input.onConfirm) Input.onConfirm();
      }
      else if (k === "Enter") { if (Input.onConfirm) Input.onConfirm(); }
      else if (k === "p" || k === "P") { if (Input.onPause) Input.onPause(); }
      else if (k === "m" || k === "M") { if (Input.onMute) Input.onMute(); }
    });
    window.addEventListener("keyup", function (e) {
      var k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") Input.left = false;
      else if (k === "ArrowRight" || k === "d" || k === "D") Input.right = false;
      else if (k === " " || k === "j" || k === "J" || k === "z" || k === "Z") Input.fire = false;
    });

    function bindHold(el, set) {
      if (!el) return;
      var on = function (e) { e.preventDefault(); Input.usingTouch = true; firstGesture(); set(true); };
      var off = function (e) { e.preventDefault(); set(false); };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointercancel", off);
      el.addEventListener("pointerleave", off);
      el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    }
    bindHold(btnL, function (v) { Input.left = v; });
    bindHold(btnR, function (v) { Input.right = v; });
    bindHold(btnF, function (v) { Input.fire = v; });

    // Arrastar no canvas = mover + atirar
    function canvasX(e) {
      var r = canvas.getBoundingClientRect();
      var cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      return Math.min(1, Math.max(0, (cx - r.left) / Math.max(1, r.width)));
    }
    canvas.addEventListener("pointerdown", function (e) {
      Input.usingTouch = true; firstGesture();
      Input.touchActive = true; Input.touchX = canvasX(e);
      Input.fire = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      if (Input.onConfirm) Input.onConfirm();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (Input.touchActive) Input.touchX = canvasX(e);
    });
    function canvasUp() { Input.touchActive = false; if (!btnFHeld()) Input.fire = false; }
    canvas.addEventListener("pointerup", canvasUp);
    canvas.addEventListener("pointercancel", canvasUp);
    var fireHeld = false;
    if (btnF) {
      btnF.addEventListener("pointerdown", function () { fireHeld = true; });
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
        btnF.addEventListener(ev, function () { fireHeld = false; });
      });
    }
    function btnFHeld() { return fireHeld; }
  }

  window.Input = Input;
  window.initInput = init;
})();
