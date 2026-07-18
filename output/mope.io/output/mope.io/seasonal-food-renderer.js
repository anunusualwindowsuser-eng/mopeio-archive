/**
 * Seasonal food renderer for mope.io.
 * Intercepts WebSocket messages to read food positions,
 * then renders actual seasonal images on a canvas overlay.
 *
 * Must load AFTER client.js so it can wrap WebSocket message handlers.
 */
(function() {
  'use strict';

  // ─── Seasonal Food Type Mapping ──────────────────────────────────────
  const SEASONAL_FOODS = {
    41: { path: 'img/beachball', name: 'Beach Ball', variants: 10 },
    42: { path: 'img/pumpkin', name: 'Pumpkin', variants: 4 },
    43: { path: 'img/xmasgifts', name: 'Gift', variants: 4, suffix: 'gift_e' },
    44: { path: 'img/umbrella', name: 'Umbrella', variants: 4 },
    45: { path: 'img/floaters', name: 'Floater', variants: 4 },
    46: { path: 'img/candycane', name: 'Candy Cane', variants: 4 },
    47: { path: 'img/gingerbread', name: 'Gingerbread', variants: 4 },
    48: { path: 'img/mistletoe', name: 'Mistletoe', variants: 4 },
    49: { path: 'img/heart', name: 'Heart', variants: 4 },
    50: { path: 'img/easteregg', name: 'Easter Egg', variants: 4 },
    51: { path: 'img/clover', name: 'Clover', variants: 4 },
    52: { path: 'img/leaf', name: 'Leaf', variants: 4 },
    53: { path: 'img/turkey', name: 'Turkey', variants: 4 },
    54: { path: 'img/fireworks', name: 'Fireworks', variants: 4 },
    55: { path: 'img/floaters', name: 'Snowflake', variants: 4 },
    56: { path: 'img/pumpkin/golden', name: 'Golden Pumpkin', variants: 4 },
    57: { path: 'img/goldenegg', name: 'Golden Egg', variants: 0, standalone: 'img/goldenegg.png' },
    58: { path: 'img/thanksgiving', name: 'Thanksgiving', variants: 4 },
    59: { path: 'img/pumpkin/ruby', name: 'Ruby Pumpkin', variants: 4 },
    60: { path: 'img/pumpkin/emerald', name: 'Emerald Pumpkin', variants: 4 },
    61: { path: 'img/pumpkin/diamond', name: 'Diamond Pumpkin', variants: 4 },
    62: { path: 'img/pumpkin/bronze', name: 'Bronze', variants: 4 },
    63: { path: 'img/pumpkin/copper', name: 'Copper', variants: 4 },
    64: { path: 'img/pumpkin/silver', name: 'Silver', variants: 4 },
    65: { path: 'img/pumpkin/topaz', name: 'Topaz', variants: 4 },
    66: { path: 'img/pumpkin/quartz', name: 'Quartz', variants: 4 },
    67: { path: 'img/pumpkin/crystal', name: 'Crystal', variants: 4 },
    68: { path: 'img/pumpkin/platinum', name: 'Platinum', variants: 4 },
    69: { path: 'img/pumpkin/pearl', name: 'Pearl', variants: 4 },
    70: { path: 'img/pumpkin/ivory', name: 'Ivory', variants: 4 },
    71: { path: 'img/pumpkin/ebony', name: 'Ebony', variants: 4 },
    72: { path: 'img/pumpkin/coral', name: 'Coral', variants: 4 },
    73: { path: 'img/pumpkin/amber', name: 'Amber', variants: 4 },
    74: { path: 'img/pumpkin/jade', name: 'Jade', variants: 4 },
    75: { path: 'img/pumpkin/lime', name: 'Lime', variants: 4 },
    76: { path: 'img/pumpkin/olive', name: 'Olive', variants: 4 },
    77: { path: 'img/pumpkin/teal', name: 'Teal', variants: 4 },
    78: { path: 'img/pumpkin/azure', name: 'Azure', variants: 4 },
    79: { path: 'img/pumpkin/cyan', name: 'Cyan', variants: 4 },
    80: { path: 'img/pumpkin/indigo', name: 'Indigo', variants: 4 },
    81: { path: 'img/pumpkin/violet', name: 'Violet', variants: 4 },
    82: { path: 'img/pumpkin/scarlet', name: 'Scarlet', variants: 4 },
    83: { path: 'img/pumpkin/crimson', name: 'Crimson', variants: 4 },
    84: { path: 'img/pumpkin/fuchsia', name: 'Fuchsia', variants: 4 },
    85: { path: 'img/pumpkin/salmon', name: 'Salmon', variants: 4 },
    86: { path: 'img/pumpkin/plum', name: 'Plum', variants: 4 },
    87: { path: 'img/pumpkin/maroon', name: 'Maroon', variants: 4 },
    88: { path: 'img/pumpkin/navy', name: 'Navy', variants: 4 },
    89: { path: 'img/pumpkin/aqua', name: 'Aqua', variants: 4 },
    90: { path: 'img/pumpkin/ruby', name: 'Ruby', variants: 4 },
    91: { path: 'img/pumpkin/sapphire', name: 'Sapphire', variants: 4 },
    92: { path: 'img/pumpkin/emerald', name: 'Emerald', variants: 4 },
    93: { path: 'img/pumpkin/amethyst', name: 'Amethyst', variants: 4 },
    94: { path: 'img/pumpkin/garnet', name: 'Garnet', variants: 4 },
    95: { path: 'img/pumpkin/turquoise', name: 'Turquoise', variants: 4 },
    96: { path: 'img/pumpkin/citrine', name: 'Citrine', variants: 4 },
    97: { path: 'img/pumpkin/peridot', name: 'Peridot', variants: 4 },
    98: { path: 'img/pumpkin/onyx', name: 'Onyx', variants: 4 },
    99: { path: 'img/pumpkin/opal', name: 'Opal', variants: 4 },
    100: { path: 'img/pumpkin/obsidian', name: 'Obsidian', variants: 4 },
    101: { path: 'img/pumpkin/cobalt', name: 'Cobalt', variants: 4 },
    102: { path: 'img/pumpkin/diamond', name: 'Diamond', variants: 4 },
    103: { path: 'img/pumpkin/midnight', name: 'Midnight', variants: 4 },
    104: { path: 'img/pumpkin/shadow', name: 'Shadow', variants: 4 },
    105: { path: 'img/pumpkin/ghost', name: 'Ghost', variants: 4 },
    106: { path: 'img/pumpkin/phantom', name: 'Phantom', variants: 4 },
    107: { path: 'img/pumpkin/frost', name: 'Frost', variants: 4 },
    108: { path: 'img/pumpkin/ice', name: 'Ice', variants: 4 },
    109: { path: 'img/pumpkin/snow', name: 'Snow', variants: 4 },
    110: { path: 'img/pumpkin/storm', name: 'Storm', variants: 4 },
    111: { path: 'img/pumpkin/thunder', name: 'Thunder', variants: 4 },
    112: { path: 'img/pumpkin/lightning', name: 'Lightning', variants: 4 },
    113: { path: 'img/pumpkin/ocean', name: 'Ocean', variants: 4 },
    114: { path: 'img/pumpkin/deep', name: 'Deep', variants: 4 },
    115: { path: 'img/pumpkin/blaze', name: 'Blaze', variants: 4 },
    116: { path: 'img/pumpkin/magma', name: 'Magma', variants: 4 },
    117: { path: 'img/pumpkin/lava', name: 'Lava', variants: 4 },
    118: { path: 'img/pumpkin/acid', name: 'Acid', variants: 4 },
    119: { path: 'img/pumpkin/poison', name: 'Poison', variants: 4 },
    120: { path: 'img/pumpkin/toxic', name: 'Toxic', variants: 4 },
    121: { path: 'img/pumpkin/sun', name: 'Sun', variants: 4 },
    122: { path: 'img/pumpkin/moon', name: 'Moon', variants: 4 },
    123: { path: 'img/pumpkin/star', name: 'Star', variants: 4 },
    124: { path: 'img/pumpkin/rainbow', name: 'Rainbow', variants: 4 },
    125: { path: 'img/pumpkin/galaxy', name: 'Galaxy', variants: 4 },
    126: { path: 'img/pumpkin/nebula', name: 'Nebula', variants: 4 },
    127: { path: 'img/pumpkin/cosmic', name: 'Cosmic', variants: 4 },
    128: { path: 'img/pumpkin/royal', name: 'Royal', variants: 4 },
    129: { path: 'img/pumpkin/mystic', name: 'Mystic', variants: 4 },
    130: { path: 'img/pumpkin/ancient', name: 'Ancient', variants: 4 },
    131: { path: 'img/pumpkin/prime', name: 'Prime', variants: 4 },
    132: { path: 'img/pumpkin/alpha', name: 'Alpha', variants: 4 },
    133: { path: 'img/pumpkin/omega', name: 'Omega', variants: 4 },
    134: { path: 'img/pumpkin/dark', name: 'Dark', variants: 4 },
    135: { path: 'img/pumpkin/light', name: 'Light', variants: 4 },
    136: { path: 'img/pumpkin/holy', name: 'Holy', variants: 4 },
    137: { path: 'img/pumpkin/evil', name: 'Evil', variants: 4 },
    138: { path: 'img/pumpkin/chaos', name: 'Chaos', variants: 4 },
    139: { path: 'img/pumpkin/void', name: 'Void', variants: 4 },
    140: { path: 'img/pumpkin/inferno', name: 'Inferno', variants: 4 },
    141: { path: 'img/pumpkin/shiny', name: 'Shiny', variants: 4 },
    142: { path: 'img/pumpkin/glowing', name: 'Glowing', variants: 4 },
    143: { path: 'img/pumpkin/sparkling', name: 'Sparkling', variants: 4 },
    144: { path: 'img/pumpkin/twinkling', name: 'Twinkling', variants: 4 },
    145: { path: 'img/pumpkin/shimmering', name: 'Shimmering', variants: 4 },
    146: { path: 'img/pumpkin/glimmering', name: 'Glimmering', variants: 4 },
    147: { path: 'img/pumpkin/radiant', name: 'Radiant', variants: 4 },
    148: { path: 'img/pumpkin/luminous', name: 'Luminous', variants: 4 },
    149: { path: 'img/pumpkin/enchanted', name: 'Enchanted', variants: 4 },
    150: { path: 'img/pumpkin/ghostly', name: 'Ghostly', variants: 4 },
    151: { path: 'img/pumpkin/jack', name: 'Jack', variants: 4 },
    152: { path: 'img/pumpkin/lantern', name: 'Lantern', variants: 4 },
    153: { path: 'img/pumpkin/pumpkin_king', name: 'Pumpkin King', variants: 4 },
    154: { path: 'img/pumpkin/pumpkin_queen', name: 'Pumpkin Queen', variants: 4 },
    155: { path: 'img/pumpkin/cursed', name: 'Cursed', variants: 4 },
    156: { path: 'img/pumpkin/prismatic', name: 'Prismatic', variants: 4 },
    157: { path: 'img/pumpkin/spectral', name: 'Spectral', variants: 4 },
    158: { path: 'img/pumpkin/ethereal', name: 'Ethereal', variants: 4 },
    159: { path: 'img/pumpkin/celestial', name: 'Celestial', variants: 4 },
    160: { path: 'img/pumpkin/astral', name: 'Astral', variants: 4 },
    161: { path: 'img/pumpkin/runic', name: 'Runic', variants: 4 },
    162: { path: 'img/pumpkin/arcane', name: 'Arcane', variants: 4 },
    163: { path: 'img/pumpkin/eldritch', name: 'Eldritch', variants: 4 },
    164: { path: 'img/pumpkin/supreme', name: 'Supreme', variants: 4 },
    165: { path: 'img/pumpkin/transcendent', name: 'Transcendent', variants: 4 },
    166: { path: 'img/pumpkin/legendary', name: 'Legendary', variants: 4 },
    167: { path: 'img/pumpkin/mythic', name: 'Mythic', variants: 4 },
    168: { path: 'img/pumpkin/godly', name: 'Godly', variants: 4 },
    169: { path: 'img/pumpkin/divine', name: 'Divine', variants: 4 },
    170: { path: 'img/pumpkin/ultimate', name: 'Ultimate', variants: 4 },
    171: { path: 'img/pumpkin/multiversal', name: 'Multiversal', variants: 4 },
    172: { path: 'img/pumpkin/ultimate', name: 'Infinite', variants: 4 },
  };

  // ─── Image Cache ─────────────────────────────────────────────────────
  const imageCache = {};
  function getImage(path) {
    if (!imageCache[path]) {
      const img = new Image();
      img.src = path;
      imageCache[path] = img;
    }
    return imageCache[path];
  }

  function getImageForType(type) {
    const food = SEASONAL_FOODS[type];
    if (!food) return null;

    if (food.standalone) {
      return getImage(food.standalone);
    }

    // For beach balls, use subdirectory structure: path/type/frame.png
    if (type === 41) {
      const variant = Math.floor(Math.random() * food.variants);
      return getImage(food.path + '/' + variant + '/0.png');
    }

    // For other foods with variants: path/variant.png
    const variant = Math.floor(Math.random() * food.variants);
    if (food.suffix) {
      return getImage(food.path + '/' + food.suffix + '.png');
    }
    return getImage(food.path + '/' + variant + '.png');
  }

  // ─── State ───────────────────────────────────────────────────────────
  let gameCanvas = null;
  let gameCtx = null;
  let overlayCanvas = null;
  let overlayCtx = null;
  let seasonalFoodItems = [];
  let currentTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  let frameCount = 0;

  // ─── WebSocket Message Interception ──────────────────────────────────
  // Instead of replacing the WebSocket constructor (which breaks when client.js
  // has cached a reference to the constructor), wrap addEventListener on the
  // prototype so ALL WebSocket instances get our food data parser.
  // This runs after proxy-patcher.js and client.js have already loaded.
  function interceptWebSocket() {
    if (!window.WebSocket || !WebSocket.prototype.addEventListener) return;

    var origAddEventListener = WebSocket.prototype.addEventListener;

    WebSocket.prototype.addEventListener = function(type, listener, options) {
      // Only intercept 'message' events
      if (type === 'message' || type === 'Message') {
        // Wrap the listener so we parse food data before the game handler
        var wrappedListener = function(event) {
          try {
            tryParseFoodData(event.data);
          } catch(e) {
            // Silently ignore parsing errors so we don't break the game
          }
          // Call the original game listener
          return listener.apply(this, arguments);
        };
        return origAddEventListener.call(this, type, wrappedListener, options);
      }
      return origAddEventListener.call(this, type, listener, options);
    };

    console.log('[SeasonalFood] WebSocket interceptor active');
  }

  // ─── Parse 0x0C World Update Message ─────────────────────────────────
  function tryParseFoodData(data) {
    if (!data) return;

    // Convert Blob to ArrayBuffer
    if (data instanceof Blob) {
      data.arrayBuffer().then(function(buf) {
        parseFoodBuffer(buf);
      });
      return;
    }

    if (data instanceof ArrayBuffer) {
      parseFoodBuffer(data);
    }
  }

  function parseFoodBuffer(buffer) {
    if (buffer.byteLength < 5) return;

    var view = new DataView(buffer);
    var msgType = view.getUint8(0);

    // 0x0C = World Update (food positions)
    if (msgType !== 0x0C) return;

    var count = view.getUint32(1, false); // big-endian
    if (count === 0 || count > 5000) return;

    var items = [];
    var offset = 5;

    for (var i = 0; i < count && offset + 5 <= view.byteLength; i++) {
      var foodType = view.getUint8(offset);
      var x = view.getInt16(offset + 1, false);
      var y = view.getInt16(offset + 3, false);
      offset += 5;

      // Only track seasonal food types (41-172)
      if (foodType >= 41 && foodType <= 172) {
        items.push({ type: foodType, x: x, y: y });
      }
    }

    if (items.length > 0) {
      seasonalFoodItems = items;
    } else {
      seasonalFoodItems = [];
    }
  }

  // ─── Canvas Transform Tracking ───────────────────────────────────────
  function trackCanvasTransform(ctx) {
    var origSetTransform = ctx.setTransform;
    ctx.setTransform = function(a, b, c, d, e, f) {
      currentTransform = { a: a, b: b, c: c, d: d, e: e, f: f };
      return origSetTransform.call(ctx, a, b, c, d, e, f);
    };
  }

  // Convert world coordinates to screen coordinates
  function worldToScreen(worldX, worldY) {
    var t = currentTransform;
    return {
      x: worldX * t.a + worldY * t.c + t.e,
      y: worldX * t.b + worldY * t.d + t.f
    };
  }

  // ─── Canvas Setup ────────────────────────────────────────────────────
  function setupOverlay() {
    var canvas = document.querySelector('canvas');
    if (!canvas) {
      setTimeout(setupOverlay, 200);
      return;
    }

    gameCanvas = canvas;
    gameCtx = canvas.getContext('2d');
    if (!gameCtx) {
      setTimeout(setupOverlay, 200);
      return;
    }

    // Track canvas transform so we can convert world coords to screen coords
    trackCanvasTransform(gameCtx);

    // Create overlay canvas positioned exactly on top of game canvas
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.style.zIndex = '1000';
    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;
    overlayCtx = overlayCanvas.getContext('2d');

    // Insert after the game canvas
    if (canvas.parentElement) {
      canvas.parentElement.appendChild(overlayCanvas);
    }

    // Sync overlay size when game canvas resizes
    window.addEventListener('resize', function() {
      if (overlayCanvas && gameCanvas) {
        overlayCanvas.width = gameCanvas.width;
        overlayCanvas.height = gameCanvas.height;
      }
    });

    // Start render loop
    renderLoop();
    console.log('[SeasonalFood] Renderer active');
  }

  // ─── Render Loop ─────────────────────────────────────────────────────
  function renderLoop() {
    if (!overlayCtx || !gameCanvas) {
      requestAnimationFrame(renderLoop);
      return;
    }

    frameCount++;

    // Clear overlay
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Only render every 3 frames to reduce overhead
    if (frameCount % 3 === 0 && seasonalFoodItems.length > 0) {
      renderSeasonalFood();
    }

    requestAnimationFrame(renderLoop);
  }

  function renderSeasonalFood() {
    if (!overlayCtx || seasonalFoodItems.length === 0) return;

    var size = 28; // base size for food images

    for (var i = 0; i < seasonalFoodItems.length; i++) {
      var item = seasonalFoodItems[i];
      var food = SEASONAL_FOODS[item.type];
      if (!food) continue;

      var img = getImageForType(item.type);
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      // Convert world coordinates to screen coordinates
      var screenPos = worldToScreen(item.x, item.y);

      // Draw the image centered on the food position
      overlayCtx.drawImage(
        img,
        screenPos.x - size / 2,
        screenPos.y - size / 2,
        size,
        size
      );
    }
  }

  // ─── Initialize ──────────────────────────────────────────────────────
  // Step 1: Intercept WebSocket constructor
  interceptWebSocket();

  // Step 2: Wait for the game canvas to be created, then set up overlay
  var readyCheck = setInterval(function() {
    if (document.querySelector('canvas')) {
      clearInterval(readyCheck);
      // Small delay to let client.js initialize the canvas
      setTimeout(setupOverlay, 500);
    }
  }, 200);

  console.log('[SeasonalFood] Seasonal food renderer loaded');
})();