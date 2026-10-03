/* Entidades: player, tiros (pool), formação inimiga, partículas, AABB arcade. */
(function () {
  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function Player(W, H) {
    this.W = W; this.H = H;
    this.y = H - 30;
    this.reset();
  }
  Player.prototype.reset = function () {
    this.x = this.W / 2; this.cool = 0; this.inv = 0;
  };
  Player.prototype.update = function (dt, input) {
    var SPEED = 165, TOUCH_SPEED = 300;
    if (input.touchActive) {
      var target = input.touchX * this.W;
      var dx = target - this.x;
      var step = TOUCH_SPEED * dt;
      this.x += Math.max(-step, Math.min(step, dx));
    } else {
      if (input.left) this.x -= SPEED * dt;
      if (input.right) this.x += SPEED * dt;
    }
    if (this.x < 12) this.x = 12;
    if (this.x > this.W - 12) this.x = this.W - 12;
    if (this.cool > 0) this.cool -= dt;
    if (this.inv > 0) this.inv -= dt;
  };
  // hitbox generosa estilo arcade (perdoa bordas)
  Player.prototype.rect = function () { return { x: this.x - 4, y: this.y - 3, w: 8, h: 7 }; };
  Player.prototype.draw = function (ctx, time) {
    if (this.inv > 0 && Math.floor(time * 12) % 2 === 0) return; // blink
    window.Sprites.drawShip(ctx, this.x, this.y);
    // chama do motor
    var f = Math.floor(time * 20) % 2;
    ctx.fillStyle = f ? "#FF7B3D" : "#FFE93D";
    ctx.fillRect(Math.round(this.x) - 1, Math.round(this.y) + 10, 2, 3 + f);
  };

  function BulletPool(n, enemy) {
    this.items = [];
    for (var i = 0; i < n; i++) this.items.push({ active: false, x: 0, y: 0, vy: 0 });
    this.enemy = !!enemy;
  }
  BulletPool.prototype.spawn = function (x, y, vy) {
    for (var i = 0; i < this.items.length; i++) {
      var b = this.items[i];
      if (!b.active) { b.active = true; b.x = x; b.y = y; b.vy = vy; return b; }
    }
    return null;
  };
  BulletPool.prototype.clear = function () {
    for (var i = 0; i < this.items.length; i++) this.items[i].active = false;
  };
  BulletPool.prototype.hasActive = function () {
    for (var i = 0; i < this.items.length; i++) if (this.items[i].active) return true;
    return false;
  };
  BulletPool.prototype.update = function (dt, H) {
    for (var i = 0; i < this.items.length; i++) {
      var b = this.items[i];
      if (!b.active) continue;
      b.y += b.vy * dt;
      if (b.y < -10 || b.y > H + 10) b.active = false;
    }
  };
  BulletPool.prototype.draw = function (ctx) {
    for (var i = 0; i < this.items.length; i++) {
      var b = this.items[i];
      if (!b.active) continue;
      if (this.enemy) {
        ctx.fillStyle = "#FF3D5A";
        ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 2, 3, 5);
        ctx.fillStyle = "#FFF";
        ctx.fillRect(Math.round(b.x), Math.round(b.y) - 1, 1, 2);
      } else {
        ctx.fillStyle = "#FFE93D";
        ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 4, 2, 7);
        ctx.fillStyle = "#FFF";
        ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 4, 2, 2);
      }
    }
  };

  function Formation(level, W) {
    this.W = W;
    this.rows = level >= 4 ? 4 : 3;
    this.cols = 6;
    this.sx = 30; this.sy = 22;
    var w = (this.cols - 1) * this.sx;
    this.ox = (W - w) / 2;
    this.oy = 34;
    this.dir = 1;
    var k = Math.pow(1.12, level - 1);
    this.descend = 7 * k;
    this.hspeed = 24 * k;
    this.wobAmp = 6;
    this.wobFreq = 2.2 + level * 0.15;
    this.maxY = 140;
    this.list = [];
    for (var r = 0; r < this.rows; r++)
      for (var c = 0; c < this.cols; c++)
        this.list.push({ r: r, c: c, alive: true, seed: (r * 7 + c * 3) * 0.7 });
  }
  Formation.prototype.update = function (dt, time) {
    this.ox += this.dir * this.hspeed * dt;
    var w = (this.cols - 1) * this.sx;
    if (this.ox < 10) { this.ox = 10; this.dir = 1; }
    if (this.ox + w > this.W - 10) { this.ox = this.W - 10 - w; this.dir = -1; }
    if (this.oy < this.maxY) this.oy += this.descend * dt;
  };
  Formation.prototype.pos = function (e, time) {
    return {
      x: this.ox + e.c * this.sx + Math.sin(time * this.wobFreq + e.seed) * this.wobAmp,
      y: this.oy + e.r * this.sy + Math.cos(time * 2 + e.seed) * 2
    };
  };
  Formation.prototype.aliveCount = function () {
    var n = 0;
    for (var i = 0; i < this.list.length; i++) if (this.list[i].alive) n++;
    return n;
  };
  // atirador: coluna aleatória com vivo, o mais baixo dela
  Formation.prototype.pickShooter = function (time) {
    var cols = [];
    for (var i = 0; i < this.list.length; i++) {
      var e = this.list[i];
      if (!e.alive) continue;
      cols[e.c] = cols[e.c] || [];
      cols[e.c].push(e);
    }
    var keys = Object.keys(cols);
    if (!keys.length) return null;
    var c = keys[(Math.random() * keys.length) | 0];
    var arr = cols[c], bottom = arr[0];
    for (var j = 1; j < arr.length; j++) if (arr[j].r > bottom.r) bottom = arr[j];
    var p = this.pos(bottom, time);
    return { e: bottom, x: p.x, y: p.y + 6 };
  };
  Formation.prototype.draw = function (ctx, time, type) {
    var frame = Math.floor(time * 4) % 2;
    for (var i = 0; i < this.list.length; i++) {
      var e = this.list[i];
      if (!e.alive) continue;
      var p = this.pos(e, time);
      window.Sprites.draw(ctx, type, p.x - 7, p.y - 5, (frame + e.r + e.c) % 2);
    }
  };

  function Particles() { this.items = []; }
  Particles.prototype.burst = function (x, y, colors, n, spd) {
    for (var i = 0; i < n; i++) {
      if (this.items.length > 220) this.items.shift();
      var a = Math.random() * Math.PI * 2, s = (0.3 + Math.random() * 0.7) * (spd || 90);
      this.items.push({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0, max: 0.35 + Math.random() * 0.3,
        color: colors[(Math.random() * colors.length) | 0],
        size: 1 + ((Math.random() * 2) | 0)
      });
    }
  };
  Particles.prototype.update = function (dt) {
    for (var i = this.items.length - 1; i >= 0; i--) {
      var p = this.items[i];
      p.life += dt;
      if (p.life >= p.max) { this.items.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.98; p.vy *= 0.98;
    }
  };
  Particles.prototype.draw = function (ctx) {
    for (var i = 0; i < this.items.length; i++) {
      var p = this.items[i];
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  };

  window.Entities = { aabb: aabb, Player: Player, BulletPool: BulletPool, Formation: Formation, Particles: Particles };
})();
