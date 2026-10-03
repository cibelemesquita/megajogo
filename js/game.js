/* Regras: energia, vidas, score, ondas, níveis, colisão. */
(function () {
  var E = window.Entities;
  var DRAIN = 100 / 45; // 100 -> 0 em 45s

  function Game(W, H) {
    this.W = W; this.H = H;
    this.player = new E.Player(W, H);
    this.pBullets = new E.BulletPool(8, false);
    this.eBullets = new E.BulletPool(2, true); // poucos tiros; 1 de cada vez na prática
    this.parts = new E.Particles();
    this.onEvent = null;
    this.reset(true);
  }

  Game.prototype.reset = function (title) {
    this.level = 1; this.score = 0; this.lives = 3;
    this.energy = 100; this.time = 0;
    this.state = title ? "title" : "playing";
    this.dyingT = 0; this.clearT = 0; this.enemyT = 1.2;
    this.player.reset();
    this.pBullets.clear(); this.eBullets.clear();
    this.parts.items.length = 0;
  };
  Game.prototype.newGame = function () {
    this.level = 1; this.score = 0; this.lives = 3;
    this.energy = 100; this.time = 0;
    this.player.reset();
    this.spawnLevel();
    this.state = "playing";
    this.emit("start", {});
  };

  Game.prototype.spawnLevel = function () {
    this.formation = new E.Formation(this.level, this.W);
    this.type = window.Sprites.forLevel(this.level);
    this.enemyT = 1.2;
    this.pBullets.clear(); this.eBullets.clear();
  };

  Game.prototype.emit = function (name, data) {
    if (this.onEvent) this.onEvent(name, data || {});
  };

  Game.prototype.die = function (reason) {
    if (this.state !== "playing") return;
    this.lives--;
    this.parts.burst(this.player.x, this.player.y + 4, ["#FFFFFF", "#FFE93D", "#FF3D3D", "#FF7B3D"], 26, 130);
    window.Sound.explosion(true);
    this.eBullets.clear();
    this.state = "dying";
    this.dyingT = 1.6;
    this.emit("death", { lives: this.lives, reason: reason });
  };

  Game.prototype.update = function (dt, input) {
    this.time += dt;
    this.parts.update(dt);
    if (this.state === "playing") this.updatePlaying(dt, input);
    else if (this.state === "dying") {
      this.dyingT -= dt;
      this.pBullets.update(dt, this.H); this.eBullets.update(dt, this.H);
      if (this.dyingT <= 0) {
        if (this.lives <= 0) { this.state = "gameover"; this.emit("gameover", { score: this.score }); }
        else {
          this.energy = 100; // renova após perder vida
          this.player.reset(); this.player.inv = 2.5;
          this.state = "playing";
          this.emit("respawn", {});
        }
      }
    } else if (this.state === "clear") {
      this.pBullets.update(dt, this.H);
      this.clearT -= dt;
      if (this.clearT <= 0) {
        this.level++;
        this.energy = 100; // fase nova = barra renovada
        this.spawnLevel();
        this.state = "playing";
        this.emit("level", { level: this.level, type: this.type });
      }
    }
  };

  Game.prototype.updatePlaying = function (dt, input) {
    // 1. energia drena sempre
    this.energy -= DRAIN * dt;
    if (this.energy <= 0) { this.energy = 0; this.die("fuel"); return; }

    // 2. player + tiro rápido
    this.player.update(dt, input);
    if (input.fire && this.player.cool <= 0) {
      this.pBullets.spawn(this.player.x, this.player.y - 6, -420);
      this.player.cool = 0.2;
      window.Sound.laser();
    }
    this.pBullets.update(dt, this.H);
    this.formation.update(dt, this.time);

    // 3. inimigos atiram pouco: só se não houver tiro inimigo ativo
    this.enemyT -= dt;
    if (this.enemyT <= 0) {
      this.enemyT = Math.max(0.45, 1.3 - this.level * 0.08);
      if (!this.eBullets.hasActive()) {
        var s = this.formation.pickShooter(this.time);
        if (s) this.eBullets.spawn(s.x, s.y, 110 + this.level * 9);
      }
    }
    this.eBullets.update(dt, this.H);

    var pr = this.player.rect();

    // 4. tiro player x inimigos (AABB preciso)
    var pb = this.pBullets.items;
    for (var i = 0; i < pb.length; i++) {
      if (!pb[i].active) continue;
      var bx = pb[i].x - 1, by = pb[i].y - 4, bw = 2, bh = 7;
      var list = this.formation.list;
      for (var j = 0; j < list.length; j++) {
        var en = list[j];
        if (!en.alive) continue;
        var p = this.formation.pos(en, this.time);
        if (E.aabb(bx, by, bw, bh, p.x - 5, p.y - 4, 11, 8)) {
          en.alive = false; pb[i].active = false;
          this.score += 100 * this.level;
          this.parts.burst(p.x, p.y, ["#FFFFFF", "#FFE93D", "#FF7B3D", "#FF3D5A"], 12, 100);
          window.Sound.explosion(false);
          this.emit("kill", { score: this.score });
          break;
        }
      }
    }

    // 5. onda completa -> recupera + próxima fase
    if (this.formation.aliveCount() === 0) {
      this.score += 250 * this.level;
      this.energy = 100;
      this.state = "clear"; this.clearT = 2.2;
      window.Sound.waveClear();
      this.emit("clear", { level: this.level, score: this.score });
      return;
    }

    if (this.player.inv > 0) return; // invencível: ignora dano

    // 6. tiro inimigo x player
    var eb = this.eBullets.items;
    for (var k = 0; k < eb.length; k++) {
      if (!eb[k].active) continue;
      if (E.aabb(eb[k].x - 1, eb[k].y - 2, 3, 5, pr.x, pr.y, pr.w, pr.h)) {
        eb[k].active = false; this.die("hit"); return;
      }
    }
    // 7. contato direto destrói a nave
    var lst = this.formation.list;
    for (var m = 0; m < lst.length; m++) {
      if (!lst[m].alive) continue;
      var q = this.formation.pos(lst[m], this.time);
      if (E.aabb(q.x - 5, q.y - 4, 11, 8, pr.x, pr.y, pr.w, pr.h)) {
        lst[m].alive = false; this.die("crash"); return;
      }
    }
  };

  Game.prototype.render = function (ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.W, this.H);
    if (this.state === "title") return;
    this.formation.draw(ctx, this.time, this.type);
    this.pBullets.draw(ctx);
    this.eBullets.draw(ctx);
    if (this.state !== "dying" || Math.floor(this.time * 8) % 2 === 0)
      this.player.draw(ctx, this.time);
    this.parts.draw(ctx);
  };

  window.Game = Game;
})();
