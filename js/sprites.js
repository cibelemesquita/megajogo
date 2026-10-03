/* Pixel-art procedural 8-bit. Cada sprite = mapa ASCII + paleta. */
(function () {
  var PAL = {
    burger: { T: "#E8A33D", G: "#3DFF5A", Y: "#FFE93D", B: "#8A4B1F", W: "#FFF6D8" },
    cookie: { T: "#D9A441", D: "#3A1E08", W: "#FFF0B8" },
    iron:   { S: "#B8C4FF", H: "#FF3D5A", R: "#FF2222", D: "#3A3A5A", W: "#FFFFFF" },
    bowtie: { R: "#FF2D78", K: "#FFE93D", D: "#7A0F38" },
    diamond:{ C: "#3DE8FF", W: "#FFFFFF", D: "#0F6A7A" },
    ship:   { W: "#FFFFFF", B: "#3D7BFF", R: "#FF3D3D", Y: "#FFE93D" }
  };

  var MAPS = {
    burger: [
      "....WWWWWW....",
      "..TTTTTTTTTT..",
      ".TWTTTTTTTTWT.",
      ".TTTTTTTTTTTT.",
      "..GGGGGGGGGG..",
      "..YYYYYYYYYY..",
      "..BBBBBBBBBB..",
      "..BBBBBBBBBB..",
      "...TTTTTTTT...",
      "............"
    ],
    cookie: [
      "....TTTT....",
      "..TTTTTTTT..",
      ".TTTDTTTTWT.",
      ".TTTTTTTTTT.",
      "TTTTTDTTTTTT",
      "TTTTTTTTTDTT",
      "TTDTTTTTTTTT",
      ".TTTTTTDTTT.",
      "..TTTTTTTT..",
      "....TTTT...."
    ],
    iron: [
      ".....HHHHHH.....",
      "....H......H....",
      "....H......H....",
      "...DDDDDDDDD....",
      "..SSSSSSSSSSS...",
      ".SSSSSSSSSSSSS..",
      "SSSSSSSSSSSSSSS.",
      "SRRRRRRRRRRRRRS.",
      "SSSSSSSSSSSSSSS.",
      "..............."
    ],
    bowtie: [
      "RRR........RRR",
      "RRRRR....RRRRR",
      ".RRRRRRRRRRRR.",
      "..RRRRRRRRRR..",
      "...RRRKKRRR...",
      "..RRRRRRRRRR..",
      ".RRRRRRRRRRRR.",
      "RRRRR....RRRRR",
      "RRR........RRR",
      "............."
    ],
    diamond: [
      ".....WW.....",
      "....WCCW....",
      "...WCCCCW...",
      "..WCCCCCCW..",
      ".WCCCCCCCCW.",
      "..WCCCCCCW..",
      "...WCCCCW...",
      "....WCCW....",
      ".....WW.....",
      "............"
    ],
    ship: [
      "......W......",
      "......W......",
      ".....WWW.....",
      ".....WBW.....",
      "....WWBWW....",
      "....WWBWW....",
      "...WWBBBWW...",
      "..WWBBBBBWW..",
      "..WRBBBBBRW..",
      ".WWWWWWWWWWW."
    ]
  };

  var TYPES = ["burger", "cookie", "iron", "bowtie", "diamond"];
  var cache = {};

  function forLevel(level) { return TYPES[(level - 1) % TYPES.length]; }

  function build(type) {
    var map = MAPS[type], pal = PAL[type];
    var h = map.length, w = map[0].length;
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var g = c.getContext("2d");
    for (var y = 0; y < h; y++)
      for (var x = 0; x < w; x++) {
        var ch = map[y][x];
        if (ch === ".") continue;
        g.fillStyle = pal[ch] || "#FFF";
        g.fillRect(x, y, 1, 1);
      }
    return c;
  }

  function get(type) {
    if (!cache[type]) cache[type] = build(type);
    return cache[type];
  }

  // frame alterna 1px p/ efeito vivo 8-bit
  function draw(ctx, type, x, y, frame) {
    var img = get(type);
    var ox = (frame % 2 === 1) ? 1 : 0;
    ctx.drawImage(img, Math.round(x) + ox, Math.round(y));
  }

  function drawShip(ctx, x, y) {
    var img = get("ship");
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y));
  }

  window.Sprites = { TYPES: TYPES, forLevel: forLevel, draw: draw, drawShip: drawShip, get: get };
})();
