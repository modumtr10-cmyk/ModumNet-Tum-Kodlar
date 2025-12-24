<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
<script>
  /* --- 🚀 HIZLI INTRO PERDESİ (FOUC ÖNLEYİCİ) --- */
  // Bu blok, kodun EN TEPESİNDE olmalı
  var fastCSS = document.createElement("style");
  fastCSS.innerHTML = `
/* Sayfa yüklenirken her şeyi gizle, sadece siyah ekran göster */
html.intro-active body { visibility: hidden !important; background: #0f172a !important; overflow: hidden !important; }
/* İntro katmanını her zaman görünür yap */
html.intro-active body > #mdm-intro-overlay { visibility: visible !important; }
`;
  document.head.appendChild(fastCSS);

  // Eğer Çekilişler sayfasındaysak hemen perdeyi indir!
  if (window.location.href.includes("cekilisler")) {
    document.documentElement.classList.add("intro-active");
  }
  (function () {
    var css = document.createElement("style");
    css.innerHTML = `
/* Başlıkları ve Eski İçeriği Yok Et */
.topic-page h1, #ph-title, .topic-title, .page-title { 
display: none !important; 
opacity: 0 !important;
visibility: hidden !important;
}

/* Arka Planı Temizle */
.page.topic-page, .page-container, .topic-body {
background: transparent !important;
border: none !important;
box-shadow: none !important;
padding-top: 0 !important;
margin-top: 0 !important;
}

/* Mobilde Header ile Birleştir */
@media (max-width: 768px) {
.page.topic-page { margin-top: -15px !important; }
#modum-firebase-test-root { margin-top: 0 !important; }
}
`;
    document.head.appendChild(css);
    // HTML2CANVAS KÜTÜPHANESİNİ YÜKLE
    var scriptH2C = document.createElement("script");
    scriptH2C.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    document.head.appendChild(scriptH2C);
    // GÜVENLİK YAMASI: Object.keys hatasını önle
    if (!Object.keys) {
      Object.keys = (function () {
        "use strict";
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !{ toString: null }.propertyIsEnumerable("toString"),
            dontEnums = [
              "toString",
              "toLocaleString",
              "valueOf",
              "hasOwnProperty",
              "isPrototypeOf",
              "propertyIsEnumerable",
              "constructor",
            ],
            dontEnumsLength = dontEnums.length;

        return function (obj) {
          if (
            typeof obj !== "object" &&
            (typeof obj !== "function" || obj === null)
          ) {
            return []; // Hata vermek yerine boş dizi dön
          }
          var result = [],
              prop,
              i;
          for (prop in obj) {
            if (hasOwnProperty.call(obj, prop)) {
              result.push(prop);
            }
          }
          if (hasDontEnumBug) {
            for (i = 0; i < dontEnumsLength; i++) {
              if (hasOwnProperty.call(obj, dontEnums[i])) {
                result.push(dontEnums[i]);
              }
            }
          }
          return result;
        };
      })();
    }
    var globalRaffleTimer = null;

    // ======================================================
    // 🛡️ BAKIM MODU & GELİŞMİŞ OYUN MOTORU (v2.0)
    // ======================================================
    async function checkSystemLock() {
      try {
        var cachedUser = JSON.parse(localStorage.getItem("mdm_user_cache"));
        if (cachedUser && cachedUser.email === "info@modum.tr") {
          console.log(
            "👑 Patron Girişi Algılandı: Bakım Modu Pas Geçiliyor..."
          );
          return false; // Kilidi kırma, siteyi göster
        }
        const API_URL = "https://api-hjen5442oq-uc.a.run.app";

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ islem: "get_settings" }),
        });
        const data = await res.json();

        if (
          data &&
          data.success &&
          data.settings &&
          (data.settings.maintenance_mode === "true" ||
           data.settings.maintenance_mode === true)
        ) {
          // Sadece çekiliş sayfasında çalış
          if (window.location.href.indexOf("cekilisler") === -1) return false;

          console.warn("⛔ BAKIM MODU AKTİF - OYUN HAZIRLANIYOR...");

          window.MDM_SYSTEM_LOCKED = true;

          // Temizlik
          const intro = document.getElementById("mdm-intro-overlay");
          if (intro) intro.remove();
          const egg = document.getElementById("mdm-surprise-egg");
          if (egg) egg.remove();
          const root = document.getElementById("modum-firebase-test-root");
          if (root) root.style.display = "none";

          // OYUN EKRANI (HTML)
          if (!document.getElementById("mdm-maintenance-game")) {
            const gameHTML = `
<div id="mdm-maintenance-game" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:#0f172a; z-index:2147483647; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Courier New', monospace; user-select:none; touch-action:none;">

<div style="text-align:center; margin-bottom:15px; z-index:2;">
<h1 style="color:#facc15; text-shadow:0 0 10px #b45309; margin:0; font-size:clamp(20px, 5vw, 36px);">🚧 SİSTEM YENİLENİYOR 🚧</h1>
<p style="color:#94a3b8; font-size:14px; margin:5px 0;">XP Topla, Rekorunu Kır!</p>
<div style="font-size:20px; color:#fff; margin-top:10px;">SKOR: <span id="mdm-game-score" style="color:#4ade80; font-weight:bold;">0</span></div>
  </div>

<div style="position:relative; width:90vw; max-width:500px; aspect-ratio:1/1;">

<div id="mdm-start-overlay" onclick="window.mdmStartGame()" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; border-radius:12px;">
<div style="background:#10b981; color:white; padding:15px 40px; border-radius:50px; font-size:24px; font-weight:bold; box-shadow:0 0 20px #10b981; animation:pulse 1s infinite;">
▶ OYNA
  </div>
  </div>

<canvas id="mdmGameCanvas" width="500" height="500" style="width:100%; height:100%; background:#1e293b; border:4px solid #334155; border-radius:12px; box-shadow:0 0 30px rgba(0,0,0,0.5); display:block;"></canvas>
  </div>

<div id="mdm-mobile-controls" style="display:none; gap:15px; margin-top:20px; z-index:2;">
<button onclick="window.mdmGameDir={x:-1,y:0}" style="width:60px; height:60px; background:rgba(255,255,255,0.1); color:white; border:2px solid #334155; border-radius:12px; font-size:24px;">⬅️</button>
<div style="display:flex; flex-direction:column; gap:15px;">
<button onclick="window.mdmGameDir={x:0,y:-1}" style="width:60px; height:60px; background:rgba(255,255,255,0.1); color:white; border:2px solid #334155; border-radius:12px; font-size:24px;">⬆️</button>
<button onclick="window.mdmGameDir={x:0,y:1}" style="width:60px; height:60px; background:rgba(255,255,255,0.1); color:white; border:2px solid #334155; border-radius:12px; font-size:24px;">⬇️</button>
  </div>
<button onclick="window.mdmGameDir={x:1,y:0}" style="width:60px; height:60px; background:rgba(255,255,255,0.1); color:white; border:2px solid #334155; border-radius:12px; font-size:24px;">➡️</button>
  </div>

<div style="margin-top:25px; text-align:center; z-index:2;">
<a href="/" style="background:#3b82f6; color:white; padding:12px 30px; border-radius:50px; text-decoration:none; font-weight:bold; font-size:14px; box-shadow:0 4px 15px rgba(37, 99, 235, 0.4);">🛍️ Oyunu Bırak, Alışverişe Dön</a>
  </div>

<style>@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }</style>
  </div>
`;
            document.body.insertAdjacentHTML("beforeend", gameHTML);
            document.body.style.overflow = "hidden";

            // Mobil Kontrol Göster (Ekran darsa)
            if (window.innerWidth < 1024) {
              document.getElementById("mdm-mobile-controls").style.display =
                "flex";
            }

            // Motoru yükle ama başlatma (Tuşa basmayı bekle)
            startGameEngine();
          }

          var killId = setTimeout(function () {
            for (var i = killId; i > 0; i--) clearInterval(i);
          }, 10);

          return true;
        }
      } catch (e) {}
      return false;
    }

    // 🕹️ OYUN MOTORU (GELİŞMİŞ)
    function startGameEngine() {
      const canvas = document.getElementById("mdmGameCanvas");
      const ctx = canvas.getContext("2d");

      // Canvas boyutunu responsive ayarla
      const gridSize = 25; // Kare boyutu
      const tileCount = 20; // 20x20 kare (500px / 25)

      let score = 0;
      let player = { x: 10, y: 10 };
      let trail = [];
      let tail = 5;
      let apple = { x: 15, y: 15 };

      // Yön (Başlangıçta duruyor)
      window.mdmGameDir = { x: 0, y: 0 };
      window.mdmGameInterval = null;

      // 🔥 BAŞLATMA FONKSİYONU
      window.mdmStartGame = function () {
        document.getElementById("mdm-start-overlay").style.display = "none"; // Butonu gizle
        window.mdmGameDir = { x: 1, y: 0 }; // Sağa doğru hareketi başlat
        if (window.mdmGameInterval) clearInterval(window.mdmGameInterval);
        window.mdmGameInterval = setInterval(gameLoop, 1000 / 12); // Hızı ayarla (12 FPS)
      };

      // Klavye Dinleyici
      document.addEventListener("keydown", function (evt) {
        // Eğer oyun başlamadıysa, tuşa basınca başlat
        if (
          document.getElementById("mdm-start-overlay").style.display !== "none"
        ) {
          window.mdmStartGame();
        }

        switch (evt.keyCode) {
          case 37:
            window.mdmGameDir = { x: -1, y: 0 };
            break; // Sol
          case 38:
            window.mdmGameDir = { x: 0, y: -1 };
            break; // Üst
          case 39:
            window.mdmGameDir = { x: 1, y: 0 };
            break; // Sağ
          case 40:
            window.mdmGameDir = { x: 0, y: 1 };
            break; // Alt
        }
      });

      function gameLoop() {
        if (!document.getElementById("mdm-maintenance-game")) return;

        player.x += window.mdmGameDir.x;
        player.y += window.mdmGameDir.y;

        // Duvarlardan Geçiş (Teleport)
        if (player.x < 0) player.x = tileCount - 1;
        if (player.x > tileCount - 1) player.x = 0;
        if (player.y < 0) player.y = tileCount - 1;
        if (player.y > tileCount - 1) player.y = 0;

        // Arka Plan
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Izgara Çizgileri (Opsiyonel - Daha şık durur)
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        for (let i = 0; i < tileCount; i++) {
          ctx.beginPath();
          ctx.moveTo(i * gridSize, 0);
          ctx.lineTo(i * gridSize, canvas.height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i * gridSize);
          ctx.lineTo(canvas.width, i * gridSize);
          ctx.stroke();
        }

        // Yılan (Modum-Man)
        ctx.fillStyle = "#facc15"; // Sarı
        for (let i = 0; i < trail.length; i++) {
          // Yılanın başı farklı renk olsun
          if (i === trail.length - 1) ctx.fillStyle = "#fff";
          else ctx.fillStyle = "#facc15";

          ctx.fillRect(
            trail[i].x * gridSize,
            trail[i].y * gridSize,
            gridSize - 2,
            gridSize - 2
          );

          // Kendine çarpma (Ölme)
          if (
            trail[i].x == player.x &&
            trail[i].y == player.y &&
            (window.mdmGameDir.x != 0 || window.mdmGameDir.y != 0)
          ) {
            tail = 5;
            score = 0;
            document.getElementById("mdm-game-score").innerText = score;
            // Yanınca butonu geri getir
            document.getElementById("mdm-start-overlay").style.display = "flex";
            clearInterval(window.mdmGameInterval);
          }
        }
        trail.push({ x: player.x, y: player.y });
        while (trail.length > tail) {
          trail.shift();
        }

        // Hedef (XP)
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.arc(
          apple.x * gridSize + gridSize / 2,
          apple.y * gridSize + gridSize / 2,
          gridSize / 2.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#4ade80"; // Parlama efekti

        // Yeme Kontrolü
        if (apple.x == player.x && apple.y == player.y) {
          tail++;
          score += 50; // Her yem 50 puan (Görsel)
          document.getElementById("mdm-game-score").innerText = score;
          apple.x = Math.floor(Math.random() * tileCount);
          apple.y = Math.floor(Math.random() * tileCount);
        }
        ctx.shadowBlur = 0; // Efekti sıfırla
      }
    }

    // ======================================================
    // 1. AYARLAR
    // ======================================================
    var TARGET_ID = "modum-firebase-test-root";
    var API_URL = "https://api-hjen5442oq-uc.a.run.app";
    var ACCOUNT_PAGE_URL = "/hesabim/bilgilerim/";
    var SITE_URL = window.location.origin + "/kullanici-giris";
    var DEFAULT_IMG = "https://www.modum.tr/i/m/001/0013355.png";

    var THEME = {
      bg: "#0f172a",
      cardBg: "#1e293b",
      primary: "#8b5cf6",
      text: "#f8fafc",
      textMuted: "#94a3b8",
      border: "#334155",
      gold: "#fbbf24",
      silver: "#94a3b8",
      bronze: "#b45309",
    };
    var APP_STATE = {
      user: { email: null, name: "Misafir", puan: 0, seviye: "Çaylak" },
      activeTab: "home",
      activeRaffles: [],
      completedRaffles: [],
      leaderboard: [],
      pool: 0,
      myRaffles: [],
    };
    window.APP_STATE = APP_STATE;
    window.fetchApiTest = fetchApi;
    // --- 🖼️ PROFİL AVATAR KÜTÜPHANESİ (ANIME & TARZ) ---
    var AVATAR_LIBRARY = [
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Molly",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Precious",
      "https://api.dicebear.com/7.x/big-ears/svg?seed=Tiger",
      "https://api.dicebear.com/7.x/micah/svg?seed=Coco",
      "https://api.dicebear.com/7.x/notionists/svg?seed=Cookie",
      "https://api.dicebear.com/7.x/open-peeps/svg?seed=Bella",
      "https://api.dicebear.com/7.x/personas/svg?seed=Trouble",
      "https://api.dicebear.com/7.x/pixel-art/svg?seed=Midnight",
      "https://api.dicebear.com/7.x/bottts/svg?seed=Rover",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Spooky",
      "https://api.dicebear.com/7.x/lorelei/svg?seed=Ginger",
      "https://api.dicebear.com/7.x/miniavs/svg?seed=Loki"
    ];
    // ======================================================
    // 🔥 GLOBAL ROZET VERİTABANI (TEK MERKEZ)
    // ======================================================
    var BADGES_DB = {
      // --- MEVCUTLAR ---
      gorev_adami: {
        t: "Görev Adamı",
        i: "🎯",
        d: "İlk görevini başarıyla tamamlayanlara verilir.",
      },
      gece_kusu: {
        t: "Gece Kuşu",
        i: "👾",
        d: "Gece 00:00 - 06:00 arası sipariş verenlere verilir.",
      },
      takim_lideri: {
        t: "Takım Lideri",
        i: "🤝",
        d: "Rozet 5 Arkadaşını Davet Ettiğinizde Verilir.",
      },
      sepet_krali: {
        t: "Sepet Kralı",
        i: "🛍️",
        d: "Rozet 6000₺ ve üzeri alışveriş yapanlara verilir.",
      },
      alev_alev: {
        t: "Alev Alev",
        i: "🔥",
        d: "7 gün üst üste giriş yapan sadık üyelere verilir.",
      },
      hazine_avcisi: {
        t: "Hazine Avcısı",
        i: "🕵️",
        d: "Sitedeki gizli altın ürünü bulanlara verilir.",
      },
      sans_melegi: {
        t: "Şans Meleği",
        i: "🍀",
        d: "Çekiliş kazanan şanslı üyelere verilir.",
      },
      bonkor: {
        t: "Bonkör",
        i: "🎁",
        d: "Arkadaşına hediye gönderenlere verilir.",
      },

      // --- 🔥 YENİ EKLENEN SEVİYE ROZETLERİ ---
      lvl_caylak: {
        t: "Çaylak",
        i: "🌱",
        d: "Aramıza yeni katılanlara verilen başlangıç rozeti.",
      },
      lvl_usta: {
        t: "Usta",
        i: "⚔️",
        d: "Deneyimi ve siparişleriyle ustalığını kanıtlayanlara verilir.",
      },
      lvl_sampiyon: {
        t: "Şampiyon",
        i: "🦁",
        d: "Zirveye oynayan, yüksek puanlı liderlere verilir.",
      },
      lvl_efsane: {
        t: "Efsane",
        i: "🐉",
        d: "Sistemin en prestijli rozeti. Sadece en iyilere verilir.",
      },
    };
    // 🔥 PROFİL TEMA SEÇENEKLERİ
    var PROFILE_THEMES = {
      default: {
        name: "Varsayılan",
        bg: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
        border: "rgba(255,255,255,0.1)",
        glow: "transparent",
      },
      neon: {
        name: "Neon Cyber",
        bg: "linear-gradient(135deg, #2e0249, #570a57)",
        border: "#a91079",
        glow: "#a91079",
      },
      fire: {
        name: "Ateş Ruhu",
        bg: "linear-gradient(135deg, #450a0a, #7f1d1d)",
        border: "#ef4444",
        glow: "#ef4444",
      },
      ocean: {
        name: "Okyanus",
        bg: "linear-gradient(135deg, #0c4a6e, #0369a1)",
        border: "#38bdf8",
        glow: "#38bdf8",
      },
      gold: {
        name: "Zenginlik",
        bg: "linear-gradient(135deg, #422006, #713f12)",
        border: "#eab308",
        glow: "#eab308",
      },
      matrix: {
        name: "Matrix",
        bg: "linear-gradient(135deg, #022c22, #14532d)",
        border: "#22c55e",
        glow: "#22c55e",
      },
      love: {
        name: "Aşk",
        bg: "linear-gradient(135deg, #831843, #be185d)",
        border: "#f472b6",
        glow: "#f472b6",
      },
      night: {
        name: "Gece Modu",
        bg: "#000000",
        border: "#333",
        glow: "rgba(255,255,255,0.2)",
      },
    };
    // 🔥 ÇERÇEVE VERİTABANI (POP-UP İÇİN)
    var FRAMES_DB = {
      "frame-dark": {
        t: "Karanlık (Dark) Çerçeve",
        d: "Gizemin ve asaletin simgesi.",
      },
      "frame-galaxy": {
        t: "Galaksi Çerçeve",
        d: "Sınır tanımayanlar için uzay teması.",
      },
      "frame-glitch": {
        t: "Glitch (Hata) Çerçeve",
        d: "Siber dünyanın dijital bozulması.",
      },
      "frame-fire": {
        t: "Alev Çerçeve",
        d: "Profilini yakıp kavuracak ateş efekti.",
      },
      "frame-rainbow": {
        t: "Gökkuşağı Çerçeve",
        d: "Rengarenk ve enerjik bir görünüm.",
      },
      "frame-royal": {
        t: "Kraliyet (Royal) Çerçeve",
        d: "Sadece en seçkin üyelere özel.",
      },
      "frame-gold": {
        t: "Altın (Gold) Çerçeve",
        d: "Zenginliğin ve başarının parıltısı.",
      },
      "frame-neon": {
        t: "Neon Çerçeve",
        d: "Gecenin karanlığında parlayan ışık.",
      },
      "frame-nature": {
        t: "Doğa (Nature) Çerçeve",
        d: "Doğallıktan yana olanlar için.",
      },
      "frame-ice": {
        t: "Buzul (Ice) Çerçeve",
        d: "Serin ve karizmatik bir duruş.",
      },
    };

    // ======================================================
    // 2. CSS STİLLERİ (MODAL LAYOUT FİX & MOBİL UYUM)
    // ======================================================
    var cssKodlari =
        `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');

/* --- ANA KAPLAYICI --- */
#` +
        TARGET_ID +
        ` { 
font-family: 'Outfit', sans-serif; background-color: ` +
        THEME.bg +
        `; color: ` +
        THEME.text +
        `; 
padding: 0; border-radius: 20px; min-height: 100vh; width: 100%; display: flex; flex-direction: column; 
box-sizing: border-box; position: relative; overflow-x: hidden; border: 1px solid ` +
        THEME.border +
        `;
}
#` +
        TARGET_ID +
        ` * { box-sizing: border-box; }

/* --- MODAL (MASAÜSTÜ VE MOBİL İÇİN ÖZEL LAYOUT) --- */
.mdm-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 100000; align-items: center; justify-content: center; backdrop-filter: blur(5px); } 
.mdm-modal.active { display: flex; }

.mdm-modal-content { 
background: ` +
        THEME.cardBg +
        `; 
width: 90%; max-width: 750px; /* Genişlik arttırıldı */
border-radius: 16px; padding: 0; /* Padding sıfırlandı, içerde vereceğiz */
border: 1px solid ` +
        THEME.border +
        `; 
max-height: 90vh; overflow: hidden; /* Taşmayı engelle */
position: relative; display: flex; flex-direction: column;
} 

.mdm-modal-header { 
display: flex; justify-content: space-between; align-items: center; 
padding: 15px 20px; background: rgba(0,0,0,0.2); border-bottom: 1px solid ` +
        THEME.border +
        `;
} 
.mdm-modal-close { font-size: 24px; cursor: pointer; color: ` +
        THEME.textMuted +
        `; transition:0.3s; }
.mdm-modal-close:hover { color: #fff; transform: rotate(90deg); }

/* 🔥 SPLIT LAYOUT (YAN YANA DİZİLİM) 🔥 */
.mdm-modal-split-layout { 
display: flex; 
flex-direction: row; /* Varsayılan: YAN YANA */
height: 500px; /* Sabit yükseklik */
overflow: hidden; 
}

.mdm-modal-left { 
flex: 1; /* %50 Genişlik */
padding: 20px; 
border-right: 1px solid rgba(255,255,255,0.1); 
display: flex; flex-direction: column; gap: 15px; 
overflow-y: auto; 
}

.mdm-modal-right { 
flex: 1; /* %50 Genişlik */
display: flex; flex-direction: column; 
background: rgba(0,0,0,0.1); /* Hafif koyu zemin */
}

/* Sol Taraf Bileşenleri */
.mdm-detail-img { width: 100%; height: 200px; object-fit: contain; background: #0f172a; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
.mdm-detail-title { font-size: 18px; font-weight: 800; color: #fff; line-height: 1.3; }
.mdm-detail-reward { background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); color: #fbbf24; padding: 10px; border-radius: 8px; text-align: center; font-weight: bold; }

.mdm-detail-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mdm-stat-box { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
/* --- SAYAÇ TİTREME FİX --- */
.mdm-stat-val { 
font-size: 14px !important; /* Yazıyı biraz küçülttük ki sığsın */
font-weight: 800; 
color: #fff; 
white-space: nowrap !important; /* KRİTİK KOD: Asla alt satıra inme! */
overflow: visible !important;   /* Gizleme */
display: block;
min-width: 80px; /* Rakam için yer ayır */
}
/* Kalan Süre yazısını da ortalayalım */
.mdm-stat-lbl { text-align: center; width: 100%; display: block; }

/* Sağ Taraf Bileşenleri */
.mdm-detail-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); }
.mdm-dt-tab { flex: 1; padding: 15px; text-align: center; cursor: pointer; color: #94a3b8; font-weight: 600; font-size: 13px; transition: 0.3s; }
.mdm-dt-tab.active { color: ` +
        THEME.primary +
        `; border-bottom: 2px solid ` +
        THEME.primary +
        `; background: rgba(139, 92, 246, 0.05); color: #fff; }

.mdm-participant-list { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }

/* 🔥 LİSTE ELEMANI DÜZELTMESİ (FLEX HİZALAMA) 🔥 */
.mdm-part-item { 
display: flex; 
align-items: center; /* Dikey ortala */
justify-content: space-between; /* Sağa sola yasla */
background: rgba(255,255,255,0.03); 
padding: 10px 12px; 
border-radius: 8px; 
border: 1px solid rgba(255,255,255,0.05); 
}

.mdm-part-user { 
display: flex; 
align-items: center; 
gap: 12px; /* İkon ve yazı arası boşluk */
flex: 1;
}

.mdm-part-icon { 
width: 32px; height: 32px; 
background: #334155; border-radius: 50%; 
display: flex; align-items: center; justify-content: center; 
font-size: 12px; color: #fff; font-weight: bold;
flex-shrink: 0; /* Küçülmesin */
}

.mdm-part-info { display: flex; flex-direction: column; justify-content: center; line-height: 1.3; }
.mdm-part-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
.mdm-part-ticket { font-size: 10px; color: #f59e0b; font-family: monospace; letter-spacing: 0.5px; }

.mdm-part-time { color: #64748b; font-size: 11px; white-space: nowrap; }

.mdm-participant-list::-webkit-scrollbar { width: 6px; }
.mdm-participant-list::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }

/* --- MOBİL UYUMLULUK (FİNAL: TAM ORTALAMA & KİLİT FİX v5.0) --- */
@media (max-width: 768px) {

#modum-firebase-test-root { 
/* 🔥 1. MATEMATİKSEL ORTALAMA (KAYMAYI ÖNLER) */
width: 100vw !important; 
max-width: 100vw !important;

/* Bu formül parent ne olursa olsun ekranın soluna yapıştırır */
margin-left: calc(21% - 21vw) !important;
margin-right: calc(21% - 21vw) !important;

/* Pozisyonu sıfırla ki 'left' komutları karışmasın */
position: relative !important;
left: auto !important;
right: auto !important;

/* 🔥 2. KİLİT ÇÖZÜCÜ KODLAR (DEVAM EDİYOR) */
height: auto !important;       
min-height: 100vh !important;
overflow-y: visible !important; 
overflow-x: hidden !important;

/* Tasarım Düzeltmeleri */
border: none !important;
border-top: 1px solid #334155 !important;
box-sizing: border-box !important;
padding-bottom: 85px !important; /* Alt menü payı */
background-color: #0f172a !important;
}

/* İçerik Alanı */
.mdm-content-wrapper { 
padding: 15px !important; 
padding-bottom: 100px !important; 
height: auto !important; 
display: block !important; 
overflow: visible !important;
width: 100% !important;
}

/* Modal Ayarları */
.mdm-modal-split-layout { flex-direction: column; height: auto; display: flex; } 
.mdm-modal-left { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; }
.mdm-modal-content { width: 95% !important; max-width: 95% !important; margin: 0 auto; max-height: 85vh; padding: 15px; overflow-y: auto; }
.mdm-participant-list { max-height: 200px; }

/* Grid Ayarları */
.mdm-grid { grid-template-columns: 1fr !important; }
.mdm-profile-hub { grid-template-columns: repeat(2, 1fr) !important; }

/* Alt Menü Sabitleme (Tam Genişlik) */
.mdm-bottom-nav { 
position: fixed !important; 
bottom: 0 !important; 
left: 0 !important; 
width: 100vw !important;
z-index: 2147483640 !important; 
padding-bottom: 20px !important; 
background: rgba(15, 23, 42, 0.98) !important;
backdrop-filter: blur(10px);
border-top: 1px solid #334155;
margin: 0 !important;
/* Menüyü de aynı yöntemle ortala */
margin-left: calc(50% - 50vw) !important;
}
}

/* --- DİĞER STANDART STİLLER (Aynen kaldı) --- */
.mdm-topbar { display: flex; justify-content: space-between; align-items: center; padding: 25px 30px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05); position: sticky; top: 0; z-index: 50; }
.mdm-logo { font-size: 15px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 4px; letter-spacing: -0.5px; margin-left: -25px } 
.mdm-logo span { background: linear-gradient(135deg, ` +
        THEME.primary +
        `, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 11px; letter-spacing: 1px; margin-left: 1px; background-color: rgba(139, 92, 246, 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(139, 92, 246, 0.3); }
.mdm-mini-profile { display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.05); padding: 4px 6px 4px 10px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; max-width: 140px; }
.mdm-mini-xp { font-size: 12px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } 
.mdm-mini-avatar { width: 28px; height: 28px; background: linear-gradient(135deg, ` +
        THEME.primary +
        `, #6d28d9); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #fff; flex-shrink: 0; }

/* Masaüstü Menü */
.mdm-bottom-nav { display: flex; justify-content: space-around; align-items: center; background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(10px); border-top: 1px solid ` +
        THEME.border +
        `; padding: 10px 0; position: fixed; bottom: 0; left: 0; width: 100%; z-index: 99999; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
@media (min-width: 769px) { 
#` +
        TARGET_ID +
        ` { border-radius: 20px; margin-top: 20px; min-height: 800px; }
.mdm-logo { font-size: 26px; } .mdm-logo span { font-size: 14px; }
.mdm-mini-avatar { width: 36px; height: 36px; font-size: 16px; } .mdm-mini-xp { font-size: 14px; }
.mdm-bottom-nav { position: relative; bottom: auto; left: auto; background: transparent; border-top: none; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0 30px; justify-content: flex-start; gap: 40px; margin-bottom: 20px; }
.mdm-nav-item { flex-direction: row !important; gap: 8px !important; padding: 15px 0 !important; width: auto !important; border-bottom: 2px solid transparent; }
.mdm-nav-item.active { color: #fff !important; border-bottom-color: ` +
        THEME.primary +
        `; }
.mdm-nav-item.active .mdm-nav-icon { transform: none !important; }
.mdm-nav-icon { font-size: 16px !important; margin-bottom: 0 !important; }
.mdm-nav-text { font-size: 14px !important; font-weight: 600 !important; }
.mdm-content-wrapper { padding: 0 30px 30px 30px !important; padding-bottom: 30px !important; }
}
.mdm-nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; color: ` +
        THEME.textMuted +
        `; cursor: pointer; font-size: 9px; font-weight: 500; width: 20%; transition: 0.3s; } 
.mdm-nav-icon { font-size: 18px; transition: 0.3s; } .mdm-nav-item:hover { color: #fff; } 
.mdm-nav-item.active { color: ` +
        THEME.primary +
        `; } .mdm-nav-item.active .mdm-nav-icon { transform: translateY(-2px); text-shadow: 0 0 10px ` +
        THEME.primary +
        `; }
.mdm-content-wrapper { flex: 1; padding: 15px; padding-bottom: 90px; width: 100%; max-width: 100%; }
.mdm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width: 100%; }
@media (max-width: 1024px) { .mdm-grid { grid-template-columns: repeat(2, 1fr); } }
.mdm-raffle-card { background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 1px solid #334155; font-family: 'Outfit', sans-serif; position: relative; display: flex; flex-direction: column; width: 100%; }
.mdm-raffle-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(139, 92, 246, 0.2); border-color: #8b5cf6; }
.mdm-rc-image { width: 100%; height: 160px; background: #0f172a; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.mdm-rc-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; } .mdm-raffle-card:hover .mdm-rc-image img { transform: scale(1.1); }
.mdm-rc-badge { position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 9px; font-weight: 800; letter-spacing: 0.5px; z-index: 2; }
.mdm-rc-body { padding: 15px; flex: 1; display: flex; flex-direction: column; }
.mdm-rc-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 12px; line-height: 1.4; height: 42px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.mdm-stats-bar { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.1); }
.mdm-sb-item { text-align: center; } .mdm-sb-lbl { font-size: 8px; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; } .mdm-sb-val { font-size: 12px; font-weight: 700; color: #f8fafc; } .mdm-sb-sep { width: 1px; height: 20px; background: rgba(255,255,255,0.1); }
.mdm-timer-minimal { display: flex; gap: 4px; justify-content: center; margin-bottom: 15px; background: rgba(0,0,0,0.2); padding: 8px 4px; border-radius: 8px; width: 100%; }
.mdm-tm-part { text-align: center; flex: 1; min-width: 0; } .mdm-tm-val { font-size: 16px; font-weight: 800; color: #fbbf24; line-height: 1; white-space: nowrap; } .mdm-tm-lbl { font-size: 7px; color: #64748b; margin-top: 3px; text-transform: uppercase; } .mdm-tm-dots { font-size: 14px; color: #475569; font-weight: bold; margin-top: -2px; }
.mdm-action-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px; margin-top: auto; }
.mdm-btn-v2 { border: none; padding: 0; height: 38px; border-radius: 8px; font-weight: 700; cursor: pointer; color: white; font-size: 11px; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px; line-height: 1; text-transform: uppercase; width: 100%; }
.btn-detail-v2 { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.1); } .btn-detail-v2:hover { background: rgba(255,255,255,0.2); }
.btn-join-v2 { background: linear-gradient(135deg, #8b5cf6, #6d28d9); box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); } .btn-join-v2:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(139, 92, 246, 0.6); }
.mdm-rc-footer { margin-top: 10px; }
.btn-share-link { background: transparent; border: 1px dashed rgba(255,255,255,0.2); color: #94a3b8; font-size: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; transition: 0.3s; width: 100%; } .btn-share-link:hover { border-color: #60a5fa; color: #60a5fa; background: rgba(59, 130, 246, 0.05); }
.btn-green { background: #10b981 !important; color: #fff !important; border: 1px solid #059669 !important; cursor: default !important; }
.mdm-tab-content { display: none; animation: fadeIn 0.4s ease-out; width: 100%; } .mdm-tab-content.active { display: block; } @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
.mdm-profile-hub { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 20px; }
.mdm-hub-btn { background: rgba(255,255,255,0.03) !important; border: 1px solid rgba(255,255,255,0.1) !important; padding: 15px !important; border-radius: 12px !important; cursor: pointer; text-align: center; display: flex !important; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #cbd5e1 !important; min-height: 90px; transition:0.3s !important; }
.mdm-hub-btn:hover { background: rgba(255,255,255,0.08) !important; transform:translateY(-3px); border-color: ` +
        THEME.primary +
        ` !important; color:#fff !important; }
.mdm-list-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid ` +
        THEME.border +
        `; font-size: 13px; color: #ddd; } .mdm-list-item:last-child { border-bottom: none; }
/* 🔥 ALTIN BİLET STİLİ (ZORLA UYGULA) 🔥 */
.mdm-ticket-card { 
background: linear-gradient(135deg, #fbbf24, #f59e0b) !important; /* Parlak Altın */
color: #78350f !important; /* Koyu Kahve Yazı */
border: 1px solid #d97706 !important;
box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4) !important;
}
.mdm-ticket-header { color: #78350f !important; }
.mdm-ticket-badge { background: #b45309 !important; color: #fff !important; }
.mdm-ticket-title { color: #451a03 !important; font-weight: 800 !important; }
.mdm-ticket-code { 
background: rgba(255,255,255,0.4) !important; 
border: 2px dashed #92400e !important; 
color: #78350f !important; 
}
.mdm-ticket-footer { color: #78350f !important; opacity: 0.8; }
/* --- YENİ EKLENEN: VİTRİN BUTONLARI & GÖREV KARTLARI --- */

/* 1. Vitrin Butonları (Yeşil ve Lacivert) */
.mdm-home-actions { display: flex; gap: 10px; margin-bottom: 20px; }

.mdm-btn-lucky { 
flex: 2; /* Geniş Buton */
background: #10b981; color: white; border: none; padding: 12px; border-radius: 12px; 
font-weight: 800; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;
box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); transition: 0.2s;
}
.mdm-btn-lucky:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.5); }

.mdm-btn-notify { 
flex: 1; /* Dar Buton */
background: #1e3a8a; color: white; border: none; padding: 12px; border-radius: 12px; 
font-weight: 700; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;
box-shadow: 0 4px 10px rgba(30, 58, 138, 0.4); transition: 0.2s;
}

/* 2. Görev Kartları (Rakip Tarzı - Koyu Tema) */
.mdm-task-row {
background: #1e293b; /* Koyu Zemin */
border: 1px solid #334155;
border-radius: 12px;
padding: 15px;
margin-bottom: 12px;
display: flex;
align-items: center;
justify-content: space-between;
gap: 15px;
}

.mdm-task-left { flex: 1; }
.mdm-task-head { font-weight: 700; color: #fff; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
.mdm-task-sub { font-size: 11px; color: #94a3b8; line-height: 1.3; }
.mdm-task-xp { color: #fbbf24; font-weight: 800; font-size: 11px; margin-top: 4px; display: block; }

.mdm-btn-progress {
background: #3b82f6; color: white; border: none; padding: 8px 16px; 
border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; white-space: nowrap;
min-width: 90px; text-align: center;
}
.mdm-btn-progress.done { background: #10b981; cursor: default; opacity: 0.8; }

/* Mobilde Butonları Alt Alta Al */
@media (max-width: 768px) {
.mdm-home-actions { flex-direction: column; }
.mdm-task-row { align-items: flex-start; } /* Mobilde hizalama */
}
/* --- GÖREV KARTLARI v3 (GENİŞLETİLEBİLİR) --- */
.mdm-task-card-v3 {
background: #1e293b; border: 1px solid #334155; border-radius: 12px;
margin-bottom: 15px; overflow: hidden; transition: 0.3s;
}

/* Header (Daima Görünür) */
.mdm-task-header { padding: 15px; display: flex; align-items: center; gap: 12px; }
.mdm-task-icon-box { width: 40px; height: 40px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.mdm-task-main-info { flex: 1; }
.mdm-task-title { font-weight: 700; color: #fff; font-size: 14px; margin-bottom: 4px; }
.mdm-task-meta { font-size: 10px; color: #94a3b8; margin-bottom: 6px; }
.mdm-task-progress-track { width: 100%; height: 4px; background: #334155; border-radius: 4px; overflow: hidden; }
.mdm-task-progress-bar { height: 100%; background: #3b82f6; width: 0%; transition: 0.5s; }

.mdm-btn-toggle {
background: #3b82f6; color: white; border: none; padding: 8px 12px; 
border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer;
}

/* Body (Açılır Kapanır) */
.mdm-task-body { border-top: 1px solid #334155; background: rgba(0,0,0,0.2); padding: 15px; animation: slideDown 0.3s; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

.mdm-step-row { display: flex; gap: 12px; margin-bottom: 15px; }
.mdm-step-check { width: 20px; height: 20px; border: 2px solid #64748b; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: transparent; margin-top: 2px; }
.mdm-step-check.done { background: #10b981; border-color: #10b981; color: white; }

.mdm-step-content { flex: 1; }
.mdm-step-text { color: #e2e8f0; font-size: 12px; margin-bottom: 5px; }

.mdm-btn-step-action { background: transparent; border: 1px solid #3b82f6; color: #3b82f6; padding: 4px 10px; border-radius: 20px; font-size: 10px; cursor: pointer; font-weight: bold; }
.mdm-btn-step-action:hover { background: #3b82f6; color: white; }

.mdm-step-input { background: #0f172a; border: 1px solid #475569; color: white; padding: 8px; border-radius: 6px; flex: 1; font-size: 12px; }
.mdm-btn-step-submit { background: #3b82f6; color: white; border: none; padding: 0 15px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; }
/* --- GİZLİ YUMURTA (SÜRPRİZ KUTU) --- */
.mdm-surprise-box {
position: fixed;
top: 60%; /* Ekranın biraz aşağısında */
right: -100px; /* Başlangıçta ekran dışında */
width: 70px;
height: 70px;
/* Screenshot_108'deki gibi hediye paketi ikonu */
background: url('https://cdn-icons-png.flaticon.com/512/4213/4213958.png') no-repeat center center;
background-size: contain;
z-index: 2147483647; 
cursor: pointer;
transition: right 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Yaylanarak gelme efekti */
filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
}

.mdm-surprise-box.show {
right: 20px; 
display: block !important; /* İŞTE EKSİK OLAN BU! */
animation: mdmShake 3s infinite;
}

.mdm-sb-tooltip {
position: absolute;
bottom: -30px;
left: 50%;
transform: translateX(-50%);
background: #fff;
color: #333;
padding: 4px 8px;
border-radius: 12px;
font-size: 10px;
font-weight: 800;
white-space: nowrap;
box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

@keyframes mdmShake {
0%, 100% { transform: rotate(0deg); }
25% { transform: rotate(10deg); }
75% { transform: rotate(-10deg); }
}

/* Tıklanınca Patlama Efekti (Opsiyonel Süs) */
.mdm-poof {
animation: mdmFadeOut 0.5s forwards;
transform: scale(1.5);
opacity: 0;
}
@keyframes mdmFadeOut {
to { opacity: 0; transform: scale(2); }
}
/* --- SÜSLÜ POP-UP (GİZLİ HAZİNE) --- */
.mdm-popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
.mdm-popup-box { background: white; width: 90%; max-width: 350px; padding: 30px 20px; border-radius: 20px; text-align: center; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.5); animation: mdmPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes mdmPopIn { from { opacity: 0; transform: scale(0.5) translateY(50px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.mdm-popup-icon { font-size: 60px; margin-bottom: 15px; display: block; filter: drop-shadow(0 5px 15px rgba(251, 191, 36, 0.4)); }
.mdm-popup-title { color: #d97706; font-size: 20px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; line-height: 1.2; }
.mdm-popup-desc { color: #4b5563; font-size: 13px; line-height: 1.5; margin-bottom: 20px; }
.mdm-popup-reward-box { background: #fffbeb; border: 2px dashed #f59e0b; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
.mdm-popup-reward-lbl { font-size: 10px; color: #92400e; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
.mdm-popup-reward-val { font-size: 32px; font-weight: 800; color: #10b981; margin-top: 5px; text-shadow: 0 2px 0 #d1fae5; }
.mdm-popup-btn { background: linear-gradient(to bottom, #fbbf24, #f59e0b); color: #fff; border: none; padding: 12px 30px; border-radius: 50px; font-weight: 800; font-size: 14px; cursor: pointer; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); width: 100%; transition: 0.2s; text-transform: uppercase; }
.mdm-popup-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(245, 158, 11, 0.6); }
/* --- MAĞAZA SEKMESİ TASARIMI (PRO) --- */

/* Izgara Yapısı (Grid) */
.mdm-store-grid {
display: grid;
grid-template-columns: repeat(2, 1fr); /* Mobilde yan yana 2 */
gap: 12px;
margin-bottom: 20px;
}
@media (min-width: 768px) {
.mdm-store-grid {
grid-template-columns: repeat(4, 1fr); /* Masaüstünde yan yana 4 */
}
}

/* Ürün Kartı */
.mdm-store-card {
background: #fff; /* Kart rengi beyaz */
border: 1px solid #e2e8f0;
border-radius: 12px;
padding: 12px;
display: flex;
flex-direction: column;
position: relative;
transition: transform 0.2s, box-shadow 0.2s;
overflow: hidden;
}
.mdm-store-card:hover {
transform: translateY(-3px);
box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}

/* Kilit Katmanı (Overlay) */
.mdm-card-lock-overlay {
position: absolute;
top: 0; left: 0; width: 100%; height: 100%;
background: rgba(255, 255, 255, 0.6); /* Hafif beyaz perde */
display: flex;
align-items: center;
justify-content: center;
z-index: 2;
pointer-events: none; /* Tıklamayı engelleme, buton halledecek */
}
.mdm-lock-icon {
font-size: 24px;
color: #94a3b8;
background: #f1f5f9;
padding: 10px;
border-radius: 50%;
box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

/* Kart İçeriği */
.mdm-sc-icon-box {
width: 40px; height: 40px;
background: #fdf2f8; /* Pembe zemin */
border-radius: 8px;
display: flex; align-items: center; justify-content: center;
font-size: 20px;
color: #db2777; /* İkon rengi */
margin-bottom: 10px;
}

.mdm-sc-title {
font-size: 13px;
font-weight: 700;
color: #1e293b;
margin-bottom: 4px;
line-height: 1.3;
height: 34px; /* 2 satır */
overflow: hidden;
}

.mdm-sc-desc {
font-size: 10px;
color: #64748b;
margin-bottom: 10px;
height: 28px;
overflow: hidden;
line-height: 1.4;
}

.mdm-sc-cost {
font-size: 14px;
font-weight: 800;
color: #d97706; /* Turuncu Puan */
margin-bottom: 10px;
}

/* Butonlar */
.mdm-btn-store {
width: 100%;
padding: 8px;
border: none;
border-radius: 6px;
font-weight: 700;
font-size: 11px;
cursor: pointer;
transition: 0.2s;
text-transform: uppercase;
}

.mdm-btn-store.buy {
background: #22c55e; /* Yeşil */
color: white;
}
.mdm-btn-store.buy:hover {
background: #16a34a;
}

.mdm-btn-store.locked {
background: #94a3b8; /* Gri */
color: white;
cursor: not-allowed;
}

.mdm-btn-store.soldout {
background: #ef4444; /* Kırmızı */
color: white;
cursor: not-allowed;
opacity: 0.7;
}

/* Başlıklar */
.mdm-store-header {
display: flex;
align-items: center;
gap: 8px;
margin: 25px 0 15px 0;
padding-bottom: 5px;
border-bottom: 1px solid #e2e8f0;
}
.mdm-sh-dot {
width: 10px; height: 10px;
border-radius: 50%;
}
.mdm-sh-title {
font-size: 16px;
font-weight: 700;
color: #334155;
}
/* --- 🎰 KAZI KAZAN (SCRATCH CARD) STİLİ --- */
.mdm-scratch-overlay {
position: fixed; top: 0; left: 0; width: 100%; height: 100%;
background: rgba(0,0,0,0.9); z-index: 2147483647;
display: flex; align-items: center; justify-content: center;
backdrop-filter: blur(8px);
flex-direction: column;
}

.mdm-scratch-wrapper {
position: relative;
width: 300px;
height: 300px;
background: #fff;
border-radius: 20px;
overflow: hidden;
box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
border: 4px solid #f59e0b;
}

/* Arkadaki Ödül Katmanı */
.mdm-scratch-prize {
position: absolute;
top: 0; left: 0; width: 100%; height: 100%;
display: flex; flex-direction: column;
align-items: center; justify-content: center;
background: radial-gradient(circle, #fffbeb 0%, #fef3c7 100%);
z-index: 1; /* Altta kalacak */
}

.mdm-prize-val {
font-size: 48px; font-weight: 900; color: #d97706;
text-shadow: 0 2px 0 #fff; margin: 10px 0;
animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.mdm-prize-lbl {
font-size: 14px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;
}

/* Öndeki Gri Katman (Canvas) */
#mdm-scratch-canvas {
position: absolute;
top: 0; left: 0;
width: 100%; height: 100%;
z-index: 2; /* Üstte olacak */
cursor: url('https://cdn-icons-png.flaticon.com/32/686/686308.png'), auto; /* Para ikonu */
touch-action: none; /* Mobilde kaydırmayı engelle */
}

/* Altın Tozu Animasyonu */
@keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
/* --- 👤 YENİ NESİL PROFİL TASARIMI (CYBER STYLE) --- */
.mdm-profile-header-card {
background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
backdrop-filter: blur(10px);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 24px;
padding: 25px;
text-align: center;
position: relative;
overflow: hidden;
box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

/* Arka plan süsleri (Parlamalar) */
.mdm-bg-glow {
position: absolute; width: 150px; height: 150px; border-radius: 50%;
filter: blur(50px); opacity: 0.4; z-index: 0;
}

/* Avatar Alanı */
.mdm-avatar-wrapper {
position: relative;
width: 80px; height: 80px; margin: 0 auto 15px;
z-index: 2;
}
.mdm-avatar-circle {
width: 100%; height: 100%; border-radius: 50%;
display: flex; align-items: center; justify-content: center;
font-size: 32px; font-weight: 800; color: #fff;
box-shadow: 0 5px 15px rgba(0,0,0,0.5);
border: 4px solid rgba(255,255,255,0.1);
position: relative; background: #0f172a;
}
.mdm-rank-badge-icon {
position: absolute; bottom: -5px; right: -5px;
width: 30px; height: 30px; background: #fff; border-radius: 50%;
display: flex; align-items: center; justify-content: center;
font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);
border: 2px solid #0f172a;
}

/* İsim ve XP */
.mdm-user-name { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 5px; position: relative; z-index: 2; }
.mdm-user-email { font-size: 12px; color: #94a3b8; margin-bottom: 15px; position: relative; z-index: 2; }

/* İstatistik Kutuları */
.mdm-stats-row {
display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
margin-top: 20px; position: relative; z-index: 2;
}
.mdm-stat-mini {
background: rgba(0,0,0,0.3); border-radius: 12px; padding: 10px 5px;
border: 1px solid rgba(255,255,255,0.05);
}
.mdm-stat-val { font-size: 16px; font-weight: 800; color: #fff; }
.mdm-stat-lbl { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

/* Level Bar (XP Çubuğu) */
.mdm-xp-container { margin-top: 20px; position: relative; z-index: 2; }
.mdm-xp-bar-bg { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
.mdm-xp-bar-fill { height: 100%; border-radius: 10px; transition: width 1s ease-out; box-shadow: 0 0 10px currentColor; }
.mdm-xp-text { display: flex; justify-content: space-between; font-size: 10px; color: #cbd5e1; margin-top: 5px; font-weight: 600; }

/* ====================================================== */
/* 🛠️ MENÜ BUTONLARI (MASAÜSTÜ & MOBİL HİBRİT ÇÖZÜM) 🛠️ */
/* ====================================================== */

/* 1. MASAÜSTÜ (Varsayılan Görünüm) */
.mdm-menu-grid {
display: grid;
grid-template-columns: repeat(2, 1fr); /* Yan yana 2 tane */
gap: 15px;
margin-top: 20px;
width: 100%;
}

.mdm-menu-card {
display: flex;
flex-direction: row; /* İkon solda, yazı sağda */
align-items: center;
justify-content: flex-start; /* Sola yasla */
text-align: left;
padding: 15px;
border-radius: 16px;
cursor: pointer;
transition: all 0.2s;
min-height: 80px; /* Standart yükseklik */
position: relative;
overflow: hidden;
}

.mdm-menu-info {
display: flex;
flex-direction: column;
align-items: flex-start; /* Yazıları sola yasla */
margin-left: 12px;
flex: 1;
}

.mdm-menu-info div:first-child { font-size: 13px; font-weight: 700; color: #fff; }
.mdm-menu-info div:last-child { font-size: 11px; color: #94a3b8; margin-top: 2px; }

/* Masaüstünde Oku Göster */
.mdm-menu-arrow { display: block; font-size: 12px; opacity: 0.7; }

/* ------------------------------------------------------ */

/* 2. MOBİL ÖZEL AYARLARI (768px ve altı) */
@media (max-width: 768px) {
/* Izgarayı biraz sıkılaştır */
.mdm-menu-grid {
gap: 10px !important;
}

/* Kartları Kare Yap (İkon üstte, yazı altta) */
.mdm-menu-card {
flex-direction: column !important;
justify-content: center !important;
align-items: center !important;
text-align: center !important;
padding: 15px 5px !important;
min-height: 100px !important;
}

/* Yazıları ortala */
.mdm-menu-info {
align-items: center !important;
margin-left: 0 !important;
margin-top: 8px !important;
width: 100% !important;
}

.mdm-menu-info div:first-child { font-size: 12px !important; margin-bottom: 2px !important; }
.mdm-menu-info div:last-child { font-size: 10px !important; line-height: 1.2 !important; }

/* Mobilde Oku Gizle (Gereksiz kalabalık) */
.mdm-menu-arrow { display: none !important; }

/* 🔥 ORTAKLIK BUTONU (En alttaki) GENİŞ KALSIN VE YATAY OLSUN */
.mdm-menu-card[onclick*="Affiliate"] {
grid-column: span 2 !important; /* Tam genişlik */
flex-direction: row !important; /* YATAY (Masaüstü gibi) */
justify-content: flex-start !important;
text-align: left !important;
min-height: auto !important;
padding: 15px !important;
margin-top: 5px !important;
}

/* Ortaklık butonu içindeki yazıyı sola yasla */
.mdm-menu-card[onclick*="Affiliate"] .mdm-menu-info {
align-items: flex-start !important;
text-align: left !important;
margin-top: 0 !important;
margin-left: 10px !important;
}

/* Ortaklık butonunda oku göster */
.mdm-menu-card[onclick*="Affiliate"] .mdm-menu-arrow {
display: block !important;
margin-left: auto !important;
}
}

/* Renk Temaları */
.theme-caylak { --color: #10b981; }
.theme-usta { --color: #8b5cf6; }
.theme-sampiyon { --color: #f59e0b; }
.theme-efsane { --color: #ef4444; }
.topic-page .topic-title, 
h1#ph-title {
display: none !important;
}

/* 2. Sayfa Kapsayıcılarının Boşluklarını Sıfırla */
.page.topic-page, 
.page-container, 
.topic-body, 
.topic-content {
padding-top: 0 !important;
padding-bottom: 0 !important;
margin-top: 0 !important;
margin-bottom: 0 !important;
}

/* 3. Mobil İçin Ekstra Yukarı İtme */
@media (max-width: 768px) {
/* Header'a yapıştır */
.page.topic-page {
margin-top: 50px !important; 
}

/* Bizim Widget'ın üst çizgisini kaldır */
#modum-firebase-test-root {
border-top: none !important; 
margin-top: 0 !important;
}
}
@keyframes mdmFadeUp {
from { opacity: 0; transform: translateY(5px); }
to { opacity: 1; transform: translateY(0); }
}
/* --- 🏆 LİDERLER TABLOSU (COMPACT) --- */
.mdm-lb-card {
background: #1e293b; 
border: 1px solid #334155; 
border-radius: 12px; 
padding: 15px; 
margin: 20px 0;
position: relative;
overflow: hidden;
}
.mdm-lb-header {
display: flex; 
justify-content: space-between; 
align-items: center; 
margin-bottom: 10px;
border-bottom: 1px solid rgba(255,255,255,0.1);
padding-bottom: 8px;
}
.mdm-lb-title {
font-size: 14px; 
font-weight: 800; 
color: #fff; 
display: flex; 
align-items: center; 
gap: 6px;
text-transform: uppercase;
letter-spacing: 1px;
}
.mdm-lb-list {
display: flex; 
flex-direction: column; 
gap: 6px;
}
.mdm-lb-row {
display: flex; 
align-items: center; 
justify-content: space-between; 
padding: 8px 10px; 
background: rgba(255,255,255,0.03); 
border-radius: 8px;
font-size: 12px;
transition: 0.2s;
}
.mdm-lb-row:hover {
background: rgba(255,255,255,0.08);
transform: translateX(5px);
}
.mdm-lb-rank {
font-weight: 800; 
width: 25px; 
text-align: center;
}
/* İlk 3 Sıra Renkleri */
.rank-1 { color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.5); font-size: 14px; } /* Altın */
.rank-2 { color: #94a3b8; font-size: 13px; } /* Gümüş */
.rank-3 { color: #b45309; font-size: 13px; } /* Bronz */

.mdm-lb-user {
flex: 1; 
margin-left: 10px; 
font-weight: 600; 
color: #e2e8f0;
}
.mdm-lb-xp {
font-weight: 800; 
color: #10b981; 
background: rgba(16, 185, 129, 0.1); 
padding: 2px 6px; 
border-radius: 4px;
}
/* Lider Tablosu Avatarı */
.mdm-lb-avatar {
width: 24px; 
height: 24px; 
background: rgba(255,255,255,0.1); 
border-radius: 50%; 
display: flex; 
align-items: center; 
justify-content: center; 
font-size: 14px; 
margin-right: 8px;
border: 1px solid rgba(255,255,255,0.2);
}
/* --- ❓ YARDIM MERKEZİ STİLLERİ --- */
.mdm-help-btn {
background: rgba(255,255,255,0.1); width: 36px; height: 36px; border-radius: 50%;
display: flex; align-items: center; justify-content: center; cursor: pointer;
border: 1px solid rgba(255,255,255,0.2); transition: 0.3s; margin-right: 10px;
animation: mdmPulseWhite 3s infinite;
}
.mdm-help-btn:hover { background: #fff; color: #000; transform: scale(1.1); }

@keyframes mdmPulseWhite {
0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}

.mdm-help-layout { display: flex; height: 500px; overflow: hidden; }
.mdm-help-menu { width: 30%; background: rgba(0,0,0,0.2); border-right: 1px solid rgba(255,255,255,0.1); overflow-y: auto; }
.mdm-help-content-area { width: 70%; padding: 25px; overflow-y: auto; background: #1e293b; color: #e2e8f0; font-size: 14px; line-height: 1.6; }

.mdm-help-item {
padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;
transition: 0.2s; font-size: 13px; font-weight: 600; color: #94a3b8; display: flex; align-items: center; gap: 8px;
}
.mdm-help-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
.mdm-help-item.active { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border-left: 3px solid #60a5fa; }

/* Mobilde Alt Alta */
@media (max-width: 768px) {
.mdm-help-layout { flex-direction: column; height: 80vh; }
.mdm-help-menu { width: 100%; height: 35%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.1); }
.mdm-help-content-area { width: 100%; height: 65%; }
}
/* --- YARDIM BUTONU (MASAÜSTÜ VE MOBİL UYUMLU FİNAL v2) --- */
.mdm-help-btn-pill {
/* Temel Ayarlar */
background: rgba(255, 255, 255, 0.1);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 50px;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
cursor: pointer;
transition: 0.3s;
color: #fff;
font-weight: 700;
box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
animation: mdmPulseSoft 3s infinite;
white-space: nowrap;
z-index: 999; /* En üstte dursun */
}

.mdm-help-btn-pill:hover {
background: #fff;
color: #0f172a; 
transform: translateY(-2px); /* Hover efekti */
box-shadow: 0 5px 20px rgba(255, 255, 255, 0.3);
}

.mdm-help-btn-pill i { font-size: 16px; }

/* 🖥️ MASAÜSTÜ ÖZEL AYARLAR (SORUN ÇÖZÜCÜ KISIM) */
@media (min-width: 769px) {
.mdm-help-btn-pill {
position: relative !important;   /* Akışta kalsın */
margin-left: auto !important;    /* Sağa yasla */
margin-right: 20px !important;
padding: 8px 25px !important;
font-size: 13px !important;
}
}


/* 📱 MOBİL ÖZEL AYARLAR (Dar Ekran) */
@media (max-width: 768px) {
.mdm-help-btn-pill {
margin-left: auto !important; /* Mobilde flex ile sağa yasla */
margin-right: 0 !important;
position: relative !important; /* Mobilde akışta kalsın */
top: auto !important;
padding: 6px 12px !important;
font-size: 11px !important;
}
}

@keyframes mdmPulseSoft {
0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.2); }
70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}
/* --- 🔥 YENİ: HİPER-AKTİF KART STİLLERİ --- */

/* 1. KART ANİMASYONLARI */
@keyframes mdmPulseRed {
0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); border-color: #ef4444; }
70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); border-color: #b91c1c; }
100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: #ef4444; }
}

@keyframes mdmShine {
100% { left: 125%; }
}

/* 2. ACİL DURUM KARTI (SON 24 SAAT) */
.mdm-card-urgent {
animation: mdmPulseRed 2s infinite;
background: linear-gradient(135deg, #1e293b 0%, #450a0a 100%) !important; /* Hafif Kırmızımsı */
border: 1px solid #ef4444 !important;
}

/* 3. PARLAMA EFEKTİ (MOUSE GELİNCE) */
.mdm-shine-hover {
position: relative;
overflow: hidden;
}
.mdm-shine-hover::after {
content: '';
position: absolute;
top: 0; left: -100%;
width: 50%; height: 100%;
background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%);
transform: skewX(-25deg);
pointer-events: none;
}
.mdm-shine-hover:hover::after {
animation: mdmShine 0.7s;
}

/* 4. AKILLI ROZETLER */
.mdm-badge-new { background: linear-gradient(135deg, #10b981, #059669); }
.mdm-badge-fire { background: linear-gradient(135deg, #f97316, #ea580c); animation: pulse 1s infinite; }
.mdm-badge-legend { background: linear-gradient(135deg, #8b5cf6, #6d28d9); box-shadow: 0 0 10px #8b5cf6; }
.mdm-badge-panic { background: #ef4444; color: #fff; animation: mdmPulseRed 1s infinite; font-weight:900; }

/* 5. ZAMAN ÇUBUĞU */
.mdm-progress-container {
width: 100%; height: 4px; background: #334155; margin-top: auto; position: relative;
}
.mdm-progress-bar {
height: 100%; background: #10b981; transition: width 1s linear;
}
/* Çubuk Renkleri */
.bar-green { background: #10b981; }
.bar-yellow { background: #facc15; }
.bar-red { background: #ef4444; box-shadow: 0 0 10px #ef4444; }

/* 6. SON ŞANS BUTONU */
.btn-panic-mode {
background: #ef4444 !important;
color: white !important;
font-weight: 900 !important;
animation: pulse 1s infinite;
box-shadow: 0 0 15px rgba(239, 68, 68, 0.5) !important;
border: 1px solid #b91c1c !important;
}
/* GİZLİLİK MODALI */
.mdm-privacy-content {
text-align: center; padding: 20px;
}
.mdm-privacy-icon {
font-size: 50px; margin-bottom: 15px; display: block;
}
.mdm-privacy-text {
font-size: 13px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;
}
.mdm-privacy-link {
color: #3b82f6; text-decoration: underline; font-weight: bold;
}
.mdm-btn-approve {
background: #10b981; color: white; border: none; padding: 12px 30px; 
border-radius: 50px; font-weight: bold; cursor: pointer; width: 100%; font-size: 14px;
box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); transition: 0.2s;
}
.mdm-btn-approve:hover { transform: scale(1.05); }
/* --- 🔥 AVATAR ÇERÇEVELERİ (KOZMETİK MAĞAZASI) --- */

/* Temel Çerçeve Yapısı (Hepsi İçin Ortak) */
.mdm-avatar-frame {
position: absolute;
top: -6px; left: -6px; right: -6px; bottom: -6px; /* Avatarı biraz dıştan sarar */
border-radius: 50%;
pointer-events: none;
z-index: 10;
}

/* 1. NEON (Klasik Siber) */
.frame-neon {
border: 3px solid #00f3ff;
box-shadow: 0 0 10px #00f3ff, inset 0 0 10px #00f3ff;
animation: pulseNeon 2s infinite;
}
@keyframes pulseNeon {
50% { box-shadow: 0 0 20px #00f3ff, inset 0 0 20px #00f3ff; }
}

/* 2. GOLD (Zengin) */
.frame-gold {
border: 3px solid #fbbf24;
box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%);
background-size: 200% 200%;
animation: shineGold 3s infinite linear;
}
@keyframes shineGold { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* 3. FIRE (Alev Alev) */
.frame-fire {
border: 3px solid #ef4444;
box-shadow: 0 0 10px #ef4444, 0 -5px 20px #f97316;
animation: burnFire 0.8s infinite alternate;
}
@keyframes burnFire { to { box-shadow: 0 0 20px #ef4444, 0 -8px 25px #f97316; } }

/* 4. ICE (Buzul) */
.frame-ice {
border: 3px solid #e0f2fe;
box-shadow: 0 0 10px #38bdf8, 0 0 20px #0ea5e9;
animation: freezePulse 3s infinite;
}
@keyframes freezePulse { 50% { opacity: 0.7; box-shadow: 0 0 25px #38bdf8; } }

/* 5. NATURE (Doğa/Yaprak) */
.frame-nature {
border: 3px dashed #4ade80;
box-shadow: 0 0 10px #22c55e;
animation: spinSlow 10s linear infinite;
}

/* 6. GLITCH (Siber Hata) */
.frame-glitch {
border: 3px solid #fff;
box-shadow: -3px 0 red, 3px 0 blue;
animation: glitchAnim 0.2s infinite;
}
@keyframes glitchAnim {
0% { box-shadow: -2px 0 red, 2px 0 blue; transform: translate(0); }
25% { transform: translate(-1px, 1px); }
50% { box-shadow: 2px 0 red, -2px 0 blue; transform: translate(1px, -1px); }
75% { transform: translate(0); }
100% { transform: translate(0); }
}

/* 7. GALAXY (Uzay) */
.frame-galaxy {
border: 3px solid transparent;
background: linear-gradient(#0f172a, #0f172a) padding-box,
linear-gradient(45deg, #6366f1, #d946ef, #ec4899) border-box;
box-shadow: 0 0 15px #6366f1;
}

/* 8. ROYAL (Kraliyet Moru) */
.frame-royal {
border: 4px double #d8b4fe;
box-shadow: 0 0 0 2px #5b21b6, 0 0 15px #7c3aed;
}

/* 9. RAINBOW (Gökkuşağı - Dönen) - DÜZELTİLDİ ✅ */
.frame-rainbow {
border: 4px solid transparent;
border-radius: 50%;
background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000) border-box;
-webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
-webkit-mask-composite: xor;
mask-composite: exclude;
animation: spinRainbow 2s linear infinite;
}
@keyframes spinRainbow { 100% { transform: rotate(360deg); } }

/* 10. DARK (Karanlık Mod) */
.frame-dark {
border: 3px solid #1e293b;
box-shadow: 0 0 15px #000;
filter: drop-shadow(0 0 5px rgba(0,0,0,0.8));
}

/* DÖNME EFEKTLERİ İÇİN */
@keyframes spinSlow { 100% { transform: rotate(360deg); } }
/* --- 💄 KOZMETİK MAĞAZASI (PREMIUM SHOP) --- */
.mdm-cosmetic-area {
background: linear-gradient(135deg, #2e1065, #0f172a); /* Koyu Mor Tema */
border-radius: 16px;
padding: 20px;
margin-bottom: 30px;
border: 1px solid #7e22ce;
box-shadow: 0 0 30px rgba(126, 34, 206, 0.2);
text-align: center;
position: relative;
overflow: hidden;
}

/* Arka plan süsü */
.mdm-cosmetic-bg-icon {
position: absolute; top: -20px; right: -20px;
font-size: 100px; opacity: 0.05; color: #d8b4fe; transform: rotate(15deg);
}

.mdm-cosmetic-title {
color: #d8b4fe; font-size: 16px; font-weight: 800; text-transform: uppercase;
letter-spacing: 2px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 10px;
}

/* Çerçeve Vitrini (Yan Yana Kaydırmalı) */
.mdm-frame-showcase {
display: flex; gap: 15px; overflow-x: auto; padding-bottom: 10px;
justify-content: center; /* Ortala */
flex-wrap: wrap; /* Mobilde alt alta inebilsin */
}

/* Tekil Çerçeve Kartı */
.mdm-frame-card {
width: 100% !important; /* Grid hücresine tam otursun */
max-width: 110px !important; /* Kartları biraz küçültelim ki 3 tane sığsın */
min-height: 140px !important;
background: rgba(0,0,0,0.3);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 12px;
padding: 15px;
width: 140px;
flex-shrink: 0;
display: flex; flex-direction: column; align-items: center;
transition: 0.3s;
cursor: pointer;
position: relative;
}
.mdm-frame-card:hover {
transform: translateY(-5px);
background: rgba(255,255,255,0.05);
border-color: #a855f7;
}
/* --- MOBİL ÇERÇEVE DÜZENİ (3'lü Grid) --- */
@media (max-width: 768px) {
/* Yatay kaydırmayı iptal et, Grid yap */
.mdm-frame-showcase {
display: grid !important;
grid-template-columns: repeat(3, 1fr) !important; /* Yan yana 3 tane */
gap: 1px !important;
overflow-x: visible !important;
justify-content: center !important;
padding-bottom: 0 !important;
}

/* Kart boyutlarını mobile uydur (Küçült) */
.mdm-frame-card {
width: 100% !important;
max-width: 100% !important;
min-height: 100px !important; /* Yüksekliği azalttık */
padding: 8px 5px !important;
}

/* Avatar önizlemesini küçült */
.mdm-preview-avatar {
width: 45px !important;
height: 45px !important;
font-size: 18px !important;
margin-bottom: 5px !important;
}

/* İsim yazı boyutunu küçült */
.mdm-frame-card > div:nth-child(2) {
font-size: 3px !important;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
max-width: 100%;
}
}
/* 🔥 KÜÇÜLTÜLMÜŞ AVATAR ÖNİZLEME */
.mdm-preview-avatar {
width: 50px; height: 50px; /* 70px'den 50px'e düştü */
background: #1e293b; 
border-radius: 50%;
margin-bottom: 8px; 
position: relative;
display: flex; align-items: center; justify-content: center;
font-size: 20px; /* Emoji boyutu küçüldü */
box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
border: 2px solid rgba(255,255,255,0.05);
}
.mdm-frame-card > div:nth-child(2) {
font-size: 8px !important; /* İsim boyutu */
margin-bottom: 3px !important;
white-space: nowrap; /* İsim tek satır kalsın */
overflow: hidden;
text-overflow: ellipsis;
width: 100%;
}
/* --- ORJİNAL (VARSAYILAN) ÇERÇEVE --- */
.frame-original {
border: 2px solid rgba(255, 255, 255, 0.2); /* Hafif beyaz çizgi */
box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
/* İstersen buraya basit bir efekt de ekleyebilirsin */
}
/* --- PROFİL KOLEKSİYON IZGARASI (MOBİL DÜZENLEMESİ) --- */
.mdm-collection-grid {
display: grid;
grid-template-columns: repeat(4, 1fr); /* Masaüstü: 4'lü */
gap: 10px;
background: rgba(0,0,0,0.2);
padding: 15px;
border-radius: 16px;
}
@media (max-width: 768px) {
.mdm-collection-grid {
grid-template-columns: repeat(3, 1fr) !important; /* Mobil: 3'lü */
padding: 10px;
gap: 8px;
}
}
/* --- 🎫 SİNEMA BİLETİ TASARIMI --- */
.mdm-real-ticket {
display: flex;
background: #fff;
border-radius: 12px;
overflow: hidden;
margin-bottom: 15px;
position: relative;
box-shadow: 0 4px 15px rgba(0,0,0,0.3);
filter: drop-shadow(0 4px 4px rgba(0,0,0,0.2));
}
/* Sol Taraf (Bilgi) */
.mdm-rt-left {
flex: 1;
background: linear-gradient(135deg, #1e293b, #0f172a);
padding: 15px;
border-right: 2px dashed rgba(255,255,255,0.3);
position: relative;
display: flex;
flex-direction: column;
justify-content: center;
}
/* Sağ Taraf (Koçan/Kod) */
.mdm-rt-right {
width: 90px;
background: #fbbf24;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 10px;
position: relative;
}
/* Yırtılma Efekti (Daireler) */
.mdm-rt-left::after {
content: "";
position: absolute;
top: -10px; right: -10px;
width: 20px; height: 20px;
background: #1e293b; /* Arka plan rengiyle aynı olmalı (Modal BG) */
border-radius: 50%;
}
.mdm-rt-left::before {
content: "";
position: absolute;
bottom: -10px; right: -10px;
width: 20px; height: 20px;
background: #1e293b;
border-radius: 50%;
}
/* --- 📸 INSTAGRAM TARZI PROFİL (YENİ) --- */

/* Sol Taraf: Avatar */
.mdm-insta-avatar-area {
display: flex;
flex-direction: column;
align-items: center;
justify-content: flex-start;
}
.mdm-insta-avatar-img {
width: 140px;
height: 140px;
border-radius: 50%;
object-fit: cover;
border: 4px solid #10b981; /* Varsayılan Yeşil Border */
box-shadow: 0 0 20px rgba(0,0,0,0.3);
background: #0f172a;
}

/* Orta Taraf: Bilgiler */
.mdm-insta-info {
display: flex;
flex-direction: column;
justify-content: center;
}
.mdm-insta-header {
display: flex;
align-items: center;
gap: 15px;
margin-bottom: 10px;
flex-wrap: wrap;
}
.mdm-insta-username {
font-size: 24px;
font-weight: 800;
color: #fff;
font-family: 'Inter', sans-serif;
}
.mdm-insta-edit-btn {
background: #334155;
color: #fff;
border: 1px solid #475569;
padding: 6px 15px;
border-radius: 8px;
font-size: 12px;
font-weight: 600;
cursor: pointer;
transition: 0.2s;
}
.mdm-insta-edit-btn:hover { background: #475569; }

.mdm-insta-bio {
font-size: 13px;
color: #cbd5e1;
line-height: 1.5;
margin-bottom: 20px;
max-width: 500px;
}

.mdm-insta-stats {
display: flex;
gap: 30px;
margin-bottom: 20px;
}
.mdm-stat-item { text-align: center; }
.mdm-stat-num { font-size: 18px; font-weight: 800; color: #fff; display: block; }
.mdm-stat-label { font-size: 11px; color: #94a3b8; }

/* Sağ Taraf: Çerçeveler (Dikey) */
.mdm-mini-frame-icon {
width: 40px; height: 40px;
border-radius: 50%;
background: #0f172a;
border: 2px solid #475569;
cursor: pointer;
position: relative;
}
.mdm-mini-frame-icon:hover { border-color: #fff; }

/* Sağ Üst Köşe: Puan */
.mdm-insta-score-badge {
position: absolute;
top: 20px;
right: 20px;
background: linear-gradient(135deg, #f59e0b, #d97706);
padding: 8px 15px;
border-radius: 50px;
color: #fff;
font-weight: 800;
font-size: 14px;
box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
}

/* 📱 MOBİL UYUMLULUK */
@media (max-width: 768px) {
.mdm-insta-avatar-area { margin: 0 auto; }
.mdm-insta-header { justify-content: center; flex-direction: column; gap: 5px; }
.mdm-insta-stats { justify-content: center; gap: 20px; }
.mdm-insta-bio { margin: 0 auto 15px auto; }    
}
/* --- GÜNCELLENMİŞ INSTAGRAM STİLİ (KAYDIRMA + TEMA DESTEKLİ) --- */
.mdm-insta-card {
display: grid;
grid-template-columns: 140px 1fr 80px;
gap: 15px;
/* Arka plan rengini sildim, JS'den dinamik gelecek */
border: 1px solid rgba(255,255,255,0.1); 
border-radius: 20px;
padding: 20px;
margin-bottom: 20px;
position: relative;
transition: background 0.3s ease;
}

.mdm-insta-frames { 
display: flex; 
flex-direction: column; 
gap: 8px; 
align-items: center; 
border-left: 1px solid rgba(255,255,255,0.1); 
padding-left: 10px; 

/* 🔥 KAYDIRMA ÖZELLİĞİ BURADA 🔥 */
max-height: 250px;       /* Yükseklik sınırı */
overflow-y: auto;        /* Dikey kaydırma */
scrollbar-width: thin;   /* İnce kaydırma çubuğu */
}

/* Kaydırma Çubuğu Güzelleştirme */
.mdm-insta-frames::-webkit-scrollbar { width: 4px; }
.mdm-insta-frames::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
.mdm-insta-frames::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }

/* Diğer Ayarlar */
.mdm-insta-avatar-img { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #10b981; background: #000; }
.mdm-insta-info { display: flex; flex-direction: column; justify-content: center; }
.mdm-insta-username { font-size: 22px; font-weight: 800; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.mdm-insta-bio { font-size: 12px; color: #e2e8f0; margin: 10px 0; line-height: 1.4; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
.mdm-insta-stats { display: flex; gap: 20px; margin-bottom: 10px; }
.mdm-stat-item { text-align: center; }
.mdm-stat-num { font-size: 16px; font-weight: 800; color: #fff; display:block; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.mdm-stat-label { font-size: 10px; color: #cbd5e1; }
.mdm-mini-frame-icon { width: 35px; height: 35px; border-radius: 50%; background: rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.2); cursor: pointer; position: relative; flex-shrink: 0; }

/* MOBİL */
@media (max-width: 768px) {
.mdm-insta-card { grid-template-columns: 1fr; text-align: center; }
.mdm-insta-frames { flex-direction: row; border-left: none; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; width: 100%; overflow-x: auto; max-height: none; }
.mdm-insta-avatar-area { margin: 0 auto; }
.mdm-insta-header { justify-content: center; flex-direction: column; }
.mdm-insta-stats { justify-content: center; }
}
/* --- 🔘 PROFİL BUTON GRUBU AYARLARI (RESPONSIVE) --- */

/* Ortak Ayarlar */
.mdm-profile-actions {
display: flex;
gap: 10px;
align-items: center;
}

/* 📱 MOBİL GÖRÜNÜM (Dar Ekran) */
@media (max-width: 768px) {
.mdm-profile-actions {
justify-content: center; /* Ortala */
margin-top: 10px;
margin-bottom: 10px;
width: 100%;
}
}

/* 💻 MASAÜSTÜ GÖRÜNÜM (Geniş Ekran) */
@media (min-width: 769px) {
.mdm-profile-actions {
/* Burayı istediğin gibi oynayabilirsin */
justify-content: flex-start; /* Sola yasla (İsim altına) */
margin-top: 15px;            /* İsimden biraz uzaklaşsın */
margin-left: 0px;            /* Soldan boşluk */

/* Alternatif: Sağa yaslamak istersen 'flex-start' yerine 'flex-end' yaz */
/* Alternatif 2: Eğer butonları büyütmek istersen: transform: scale(1.1); */
}
}
`;

    // ======================================================
    // 3. BAŞLATICI VE VERİ ÇEKME
    // ======================================================
    function init(root) {
      // --- 🔥 YENİ: REFERANS KODU YAKALAYICI ---
      // Linkte ?ref=VARSA bunu yakala ve kaydet
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get("ref");
      if (refCode) {
        console.log("Referans ile gelindi:", refCode);
        localStorage.setItem("pending_ref_code", refCode);
      }

      // ... eski kodlar devam ediyor ...
      var styleTag = document.createElement("style");
      styleTag.innerHTML = cssKodlari;
      root.appendChild(styleTag);

      // Cache Yükle
      APP_STATE.user = JSON.parse(localStorage.getItem("mdm_user_cache")) || {
        email: null,
        name: "Misafir",
        puan: 0,
        seviye: "Çaylak",
      };

      renderApp(root);
      updateDataInBackground(root);
      setTimeout(() => {
        ModumApp.initSurpriseSystem();
      }, 2000);
    }

    // --- VERİ ÇEKME (SERİ SORUNU %100 FİXLENDİ) ---
    async function updateDataInBackground() {
      var user = await detectUser();

      if (user && user.email) {
        APP_STATE.user = user;

        // --- 🔥 YENİ: SAĞ ÜST AVATAR GÜNCELLEME ---
        var navAvatar = document.getElementById("nav-avatar");
        var navName = document.getElementById("nav-user-name");
        var topBarXP = document.getElementById("nav-live-xp");
        if (topBarXP) {
          // Eğer puan undefined ise 0 göster
          var pVal = parseInt(APP_STATE.user.puan) || 0;
          topBarXP.innerText = pVal.toLocaleString() + " XP";
        }

        // 1. Varsayılan (Baş Harf)
        var displayContent = (user.name || "M").charAt(0).toUpperCase();
        var isEmoji = false;

        // 2. Seçili Rozet Var mı Kontrol Et
        var BADGES_ICONS = {
          gorev_adami: "🎯",
          gece_kusu: "👾",
          takim_lideri: "🤝",
          sepet_krali: "🛍️",
          alev_alev: "🔥",
          hazine_avcisi: "🕵️",
          sans_melegi: "🍀",
          bonkor: "🎁",
          lvl_caylak: "🌱",
          lvl_usta: "⚔️",
          lvl_sampiyon: "🦁",
          lvl_efsane: "🐉",
        };

        if (user.selectedAvatar && BADGES_ICONS[user.selectedAvatar]) {
          displayContent = BADGES_ICONS[user.selectedAvatar];
          isEmoji = true;
        }

        // 3. Ekrana Bas (Stil Ayarı ile)
        if (navAvatar) {
          navAvatar.innerHTML = displayContent;
          if (isEmoji) {
            // Emoji ise büyüt ve arkaplanı şeffaf yap
            navAvatar.style.fontSize = "24px";
            navAvatar.style.background = "transparent";
            navAvatar.style.border = "none";
            navAvatar.style.lineHeight = "1";
          } else {
            // Harf ise standart stil (Mor Yuvarlak)
            navAvatar.style.fontSize = "12px";
            navAvatar.style.background =
              "linear-gradient(135deg, #8b5cf6, #6d28d9)";
            navAvatar.style.border = "none";
          }
        }

        // İsmi güncelle (Mevcut kod)
        if (navName) navName.innerText = user.name;

        fetchApi("get_settings").then((res) => {
          if (res && res.settings && res.settings.active_theme) {
            // Sadece global tema değişmişse uygula
            var currentGlobal = localStorage.getItem("mdm_active_theme");
            if (currentGlobal !== res.settings.active_theme) {
              applyThemeEngine(res.settings.active_theme);
              localStorage.setItem("mdm_active_theme", res.settings.active_theme);
            }
          }
        });

        // Veritabanından Taze Bilgi Çek
        fetchApi("get_user_details", { email: user.email }).then((res) => {
          if (res && res.success) {
            var p1 = parseInt(res.user.puan) || 0;
            APP_STATE.user.puan = p1;
            APP_STATE.user.seviye = res.user.seviye;

            // Tarih
            APP_STATE.user.songunlukhaktarihi =
              res.user.songunlukhaktarihi || res.user.sonGiris || "";

            // 🔥 İŞTE ÇÖZÜM BURADA: Hem "gunlukSeri" hem "gunlukseri" kontrolü
            // Veritabanında küçük harfle yazılmışsa onu da yakalar.
            var gelenSeri = res.user.gunlukSeri || res.user.gunlukseri || 0;
            APP_STATE.user.gunlukSeri = parseInt(gelenSeri);

            if (res.user.privacyApproved === true) {
              APP_STATE.user.privacyApproved = true;
            }
            // 🌟 EKLENECEK KISIM (BURASI EKSİKTİ)
            APP_STATE.user.ownedFrames = res.user.ownedFrames || [];
            APP_STATE.user.selectedFrame = res.user.selectedFrame || "";
            if(res.user.profileTheme) {
              APP_STATE.user.profileTheme = res.user.profileTheme;
            }
            // Cache'i Güncelle
            localStorage.setItem(
              "mdm_user_cache",
              JSON.stringify(APP_STATE.user)
            );

            // EKRANDAKİ ÇUBUKLARI BOYA
            var streakDiv = document.getElementById("mdm-streak-container");
            if (streakDiv) {
              streakDiv.innerHTML = renderStreakBars(APP_STATE.user.gunlukSeri);
            }
            if (APP_STATE.activeTab === "profile") {
              var profileContainer = document.getElementById(
                "mdm-profile-container"
              );
              // renderProfileTab fonksiyonunun varlığını kontrol et ve çalıştır
              if (profileContainer && typeof renderProfileTab === "function") {
                profileContainer.innerHTML = renderProfileTab(APP_STATE.user);
              }
            }
          }
        });
        // updateDataInBackground fonksiyonunun içinde, get_settings çağrısından sonra:
        fetchApi("get_settings").then((res) => {
          if (res && res.settings && res.settings.active_theme) {
            applyThemeEngine(res.settings.active_theme);
            localStorage.setItem("mdm_active_theme", res.settings.active_theme); // 🔥 BU SATIRI EKLE
          }
        });

        var profileContainer = document.getElementById("mdm-profile-container");
        if (profileContainer)
          profileContainer.innerHTML = renderProfileTab(APP_STATE.user);

        fetchApi("get_user_tickets", { email: user.email }).then(
          (ticketRes) => {
            if (ticketRes && ticketRes.success) {
              APP_STATE.myRaffles = ticketRes.list.map((t) =>
                                                       t.raffleName.trim()
                                                      );
              var activeGrid = document.getElementById("mdm-active-grid");
              if (activeGrid)
                activeGrid.innerHTML = renderRaffles(
                  APP_STATE.activeRaffles,
                  true
                );
            }
          }
        );
      }

      // Diğer Veriler
      try {
        var pShowcase = fetchApi("get_showcase_data");
        var pSystem = fetchApi("get_system_data");
        var [newShowcase, newSys] = await Promise.all([pShowcase, pSystem]);

        if (newShowcase && newShowcase.success) {
          APP_STATE.activeRaffles = newShowcase.active || [];
          APP_STATE.completedRaffles = newShowcase.completed || [];
          var aGrid = document.getElementById("mdm-active-grid");
          if (aGrid)
            aGrid.innerHTML = renderRaffles(APP_STATE.activeRaffles, true);
          var cGrid = document.getElementById("mdm-completed-grid");
          if (cGrid)
            cGrid.innerHTML = renderRaffles(APP_STATE.completedRaffles, false);
        }

        if (newSys && newSys.data) {
          APP_STATE.pool = newSys.data.legendPool || 0;
          var pDiv = document.getElementById("mdm-pool-val");
          if (pDiv)
            pDiv.innerText = APP_STATE.pool.toLocaleString("tr-TR") + " ₺";
        }
      } catch (e) {}

      if (typeof loadTasksData === "function") loadTasksData();
      startTimer();
      findCartTaskID();
      // --- 🏆 LİDERLER TABLOSU (GÜVENLİ VE AVATARLI + ÇERÇEVELİ VERSİYON) ---
      fetchApi("get_masked_leaderboard")
        .then((res) => {
        // Konsola bilgi verelim
        // console.log("Liderler Tablosu Verisi:", res);

        var lbContainer = document.getElementById("mdm-leaderboard-area");

        // Veri var mı ve Kutu yerinde mi kontrolü
        if (
          res &&
          res.success &&
          res.list &&
          res.list.length > 0 &&
          lbContainer
        ) {
          // Rozet İkonları
          var BADGES_ICONS = {
            gorev_adami: "🎯",
            gece_kusu: "👾",
            takim_lideri: "🤝",
            sepet_krali: "🛍️",
            alev_alev: "🔥",
            hazine_avcisi: "🕵️",
            sans_melegi: "🍀",
            bonkor: "🎁",
            lvl_caylak: "🌱",
            lvl_usta: "⚔️",
            lvl_sampiyon: "🦁",
            lvl_efsane: "🐉",
          };

          var rowsHtml = "";

          // Listeyi döngüye al
          for (var i = 0; i < res.list.length; i++) {
            var u = res.list[i];
            var index = i;

            var rankClass = "rank-" + (index + 1);
            var icon = index + 1 + ".";
            if (index === 0) icon = "👑";
            if (index === 1) icon = "🥈";
            if (index === 2) icon = "🥉";


            // AVATAR BELİRLEME (GÜNCELLENMİŞ)
            var userName = u.name || "Gizli";
            var userAvatar = "🌱"; // Varsayılan
            var avatarStyle = "background:transparent; border:none; font-size:18px;";

            var uThemeID = u.theme || "default";
            var uThemeData = PROFILE_THEMES[uThemeID] || PROFILE_THEMES["default"];
            var rowStyle = `background: ${uThemeData.bg}; border: 1px solid ${uThemeData.border}; box-shadow: 0 0 10px ${uThemeData.glow}40; transition:0.2s;`;

            // 🔥 1. KONTROL: RESİM LİNKİ VARSA (Anime/Profil Resmi)
            if (u.avatar && (u.avatar.indexOf("http") > -1 || u.avatar.indexOf("data:image") > -1)) {
              userAvatar = `<img src="${u.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">`;
              // Resim olduğu için padding ve border'ı sıfırlıyoruz ki tam otursun
              avatarStyle = "padding:0; background:transparent; border:none;";
            } 
            // 2. KONTROL: EMOJİ ROZET VARSA
            else if (u.avatar && BADGES_ICONS[u.avatar]) {
              userAvatar = BADGES_ICONS[u.avatar];
              avatarStyle = "background:transparent; border:none; font-size:17px;";
            }
            // 3. KONTROL: HİÇBİRİ YOKSA RÜTBEYE BAK
            else {
              if (u.level === "Usta") userAvatar = "⚔️";
              else if (u.level === "Şampiyon") userAvatar = "🦁";
              else if (u.level === "Efsane") userAvatar = "🐉";
              else userAvatar = "🌱"; // Çaylak
            }

            var safeXP = u.points ? parseInt(u.points).toLocaleString() : "0";

            // 🔥 ÇERÇEVE HTML OLUŞTURMA (BURASI YENİ) 🔥
            // ... (u.level ve rankClass tanımlamalarından sonra) ...

            // Rütbeye göre renk belirle
            var rankColor = "#10b981"; // Varsayılan Yeşil (Çaylak)
            if (u.level === "Usta") rankColor = "#8b5cf6"; // Mor
            if (u.level === "Şampiyon") rankColor = "#f59e0b"; // Sarı
            if (u.level === "Efsane") rankColor = "#ef4444"; // Kırmızı

            // Çerçeve Mantığı:
            var userFrame = u.frame || "";
            var frameDiv = "";
            var borderStyle = "";

            if (userFrame) {
              // Özel çerçeve varsa onu koy, border'ı şeffaf yap
              frameDiv = `<div class="mdm-avatar-frame ${userFrame}" style="top:-3px; left:-3px; right:-3px; bottom:-3px; border-width:2px;"></div>`;
              borderStyle = "border: 2px solid transparent;";
            } else {
              // Özel çerçeve YOKSA, rütbe renginde border koy
              borderStyle = `border: 2px solid ${rankColor}; box-shadow: 0 0 5px ${rankColor};`;
            }

            // Avatar stiline borderStyle ekle
            avatarStyle += ` position: relative; overflow: visible; ${borderStyle} border-radius: 50%;`;

            rowsHtml += `
<div class="mdm-lb-row" style="${rowStyle}"> 
<div class="mdm-lb-rank ${rankClass}">${icon}</div>

<div class="mdm-lb-user" style="display:flex; align-items:center;">
<div class="mdm-lb-avatar" style="${avatarStyle}">
${frameDiv} 
${userAvatar}
  </div>            

<div>
${userName} 
<span style="font-size:10px; color:#e2e8f0; font-weight:normal; margin-left:5px; opacity:0.8;">(${u.level || "Çaylak"})</span>
  </div>
  </div>

<div class="mdm-lb-xp" style="background:rgba(0,0,0,0.3); color:#fff;">${safeXP} XP</div>
  </div>
`;
          }

          // HTML'i Bas
          lbContainer.innerHTML = `
<div class="mdm-lb-card">
<div class="mdm-lb-header">
<div class="mdm-lb-title"><i class="fas fa-trophy" style="color:#fbbf24;"></i> Zirvedekiler (Top 5)</div>
<div style="font-size:10px; color:#94a3b8;">Canlı Puan Durumu</div>
  </div>
<div class="mdm-lb-list">
${rowsHtml}
  </div>
  </div>
`;
        }
      })
        .catch((err) => console.log("Tablo Hatası:", err));
    }
    // Destek bildirimlerini arka planda kontrol et
    if (window.ModumApp && window.ModumApp.loadSupportHistory) {
      ModumApp.loadSupportHistory(true); // true = sessiz mod (sadece nokta kontrolü)
    }
    // --- API İLETİŞİMİ (AKILLI CACHE SİSTEMİ - TASARRUF MODU 💰) ---
    // Bu fonksiyon, sık kullanılan verileri tarayıcı hafızasına (LocalStorage) kaydeder.
    // Böylece her sayfa yenilemede sunucuya para ödemezsin.
    async function fetchApi(action, payload = {}) {
      // 1. Önbelleklenecek (Hafızaya Atılacak) İşlemler Listesi
      // Sadece "Okuma" yapan ve anlık değişmesi çok kritik olmayanlar buraya.
      const cacheableActions = [
        "get_showcase_data", // Vitrin (En çok bu çağrılır)
        "get_system_data", // Havuz tutarı
        "get_products", // Ürün listesi
        "get_tasks", // Görevler
        "get_store_items", // Mağaza ürünleri        
      ];

      // Cache Süresi: 5 Dakika (300.000 ms)
      // Kullanıcı 5 dakika içinde sayfayı yenilerse sunucuya gitmez, cepten yer.
      const CACHE_DURATION = 5 * 60 * 1000;

      // Cache Anahtarı Oluştur (Örn: mdm_cache_get_showcase_data)
      // Eğer kişiye özel bir veri ise (örn: email varsa) anahtara onu da ekle.
      let cacheKey = "mdm_cache_" + action;
      if (payload.email) cacheKey += "_" + payload.email;

      // 2. Önbellek Kontrolü (Önce cebe bak)
      if (cacheableActions.includes(action)) {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            const now = new Date().getTime();

            // Eğer veri bayatlamamışsa (süresi dolmamışsa)
            if (now - cached.timestamp < CACHE_DURATION) {
              // Konsola yazalım ki çalıştığını gör (Sadece sen görürsün)
              // console.log("⚡ Veri hafızadan okundu (Maliyet: 0₺):", action);
              return cached.data; // API'ye gitmeden veriyi dön!
            }
          } catch (e) {
            // Veri bozuksa sil, yenisini çekeriz
            localStorage.removeItem(cacheKey);
          }
        }
      }
      window.fetchApi = fetchApi;

      // 3. API İsteği (Eğer cache yoksa veya süresi dolduysa mecbur sunucuya git)
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ islem: action, ...payload }),
        });

        const data = await res.json();

        // 4. Yeni Veriyi Önbelleğe Kaydet (Sadece başarılıysa)
        if (data && data.success && cacheableActions.includes(action)) {
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                timestamp: new Date().getTime(),
                data: data,
              })
            );
          } catch (storageError) {
            // Kota dolduysa sessizce geç, sistemi bozma
            console.log("Cache dolu, yazılamadı.");
          }
        }

        return data;
      } catch (e) {
        return null;
      }
    }

    // --- KULLANICIYI TESPİT ET (CACHE ÇAKIŞMASI FİXLENDİ v4.0) ---
    async function detectUser() {
      // 1. Önce Sayfadaki GERÇEK Veriyi Tara (DOM Öncelikli)
      var foundEmail = null;
      var foundName = "Misafir";

      var inputs = [
        'input[name="Email"]',
        "#Email",
        "#MemberEmail",
        ".member-email",
        'input[type="hidden"][name="Email"]',
      ];
      for (var i = 0; i < inputs.length; i++) {
        var el = document.querySelector(inputs[i]);
        if (el && el.value && el.value.includes("@")) {
          foundEmail = el.value.trim();

          // İsmi de bulmaya çalış
          var nameEl =
              document.querySelector('input[name="FirstName"]') ||
              document.querySelector("#FirstName");
          if (nameEl && nameEl.value) foundName = nameEl.value;

          break; // Bulduysak döngüden çık
        }
      }

      // 2. Şimdi Cache'e Bak
      var cachedUser = JSON.parse(localStorage.getItem("mdm_user_cache"));

      // 3. 🔥 KRİTİK KONTROL: Cache ile Ekran Farklı mı?
      if (foundEmail && cachedUser && cachedUser.email !== foundEmail) {
        console.log(
          "♻️ Kullanıcı değişmiş! Cache temizleniyor... (" +
          cachedUser.email +
          " -> " +
          foundEmail +
          ")"
        );
        localStorage.removeItem("mdm_user_cache"); // Eski veriyi sil
        cachedUser = null; // Cache'i boşalt
      }

      // 4. Kullanıcı Objesini Oluştur
      // Eğer sayfada bulduysak onu kullan, bulamadıysak cache'tekini kullan, o da yoksa boş aç.
      var user = {
        email: foundEmail || (cachedUser ? cachedUser.email : null),
        name: foundEmail ? foundName : cachedUser ? cachedUser.name : "Misafir",
        puan: cachedUser ? cachedUser.puan : 0,
        seviye: cachedUser ? cachedUser.seviye : "Çaylak",
        hak: cachedUser ? cachedUser.hak : 0,
      };

      // 5. Eğer sayfada bulamadıysak ama "Hesabım" linki varsa, arka planda tarama yap (Dedektif Modu)
      if (!user.email) {
        try {
          var targetUrls = [
            "/hesabim/bilgilerim/",
            "/Uye/BilgiGuncelle",
            "/uyelik-bilgilerim",
          ];
          for (let url of targetUrls) {
            if (user.email) break;
            var response = await fetch(url);
            if (response.ok) {
              var text = await response.text();
              var doc = new DOMParser().parseFromString(text, "text/html");
              var mailInput =
                  doc.querySelector('input[name="Email"]') ||
                  doc.querySelector("#Email") ||
                  doc.querySelector("#MemberEmail");

              if (
                mailInput &&
                mailInput.value &&
                mailInput.value.includes("@")
              ) {
                // Eğer burada bulduğumuz mail de cache'den farklıysa yine cache'i ezmemiz lazım
                var freshEmail = mailInput.value.trim();
                if (cachedUser && cachedUser.email !== freshEmail) {
                  localStorage.removeItem("mdm_user_cache");
                  user.puan = 0; // Puanı sıfırla ki yanlış göstermesin
                }

                user.email = freshEmail;
                var nameInput =
                    doc.querySelector('input[name="FirstName"]') ||
                    doc.querySelector("#FirstName");
                if (nameInput) user.name = nameInput.value;
              }
            }
          }
        } catch (e) {
          console.log("Dedektif hatası:", e);
        }
      }

      // 6. Sonuç: E-posta varsa API'ye bildir ve Cache'i Güncelle
      if (user.email) {
        // Oturum tetikle
        fetchApi("user_login_trigger", {
          email: user.email,
          adSoyad: user.name,
        }).then((loginRes) => {
          if (loginRes && loginRes.success && loginRes.isNew) {

            // 👇 SÜREYİ BELİRLEYEN KISIM BURASIDIR 👇
            setTimeout(() => {
              ModumApp.checkWelcome(true, 50); 
            }, 8000); // 12000 = 12 Saniye demektir.

          }
        });

        // Detayları çek
        var details = await fetchApi("get_user_details", { email: user.email });
        if (details && details.success) {
          user.puan = details.user.puan || 0;
          user.seviye = details.user.seviye || "Çaylak";
          user.hak = details.user.hak || 0;
          user.gunlukSeri = details.user.gunlukSeri || 0;
          user.katilimSayisi =
            details.user.katilimSayisi || details.user.toplamkatilim || 0;
          user.toplamkatilim =
            details.user.katilimSayisi || details.user.toplamkatilim || 0;

          if (details.user.adSoyad && details.user.adSoyad !== "Misafir")
            user.name = details.user.adSoyad;
          if (details.user.referansKodu)
            user.referansKodu = details.user.referansKodu;
          user.badges = details.user.badges || [];
          user.selectedAvatar = details.user.selectedAvatar || null;
          user.profileTheme = details.user.profileTheme || "default";

          // Eğer profil sekmesi açıksa anlık güncelle
          if (APP_STATE.activeTab === "profile") {
            var pContainer = document.getElementById("mdm-profile-container");
            if (pContainer) pContainer.innerHTML = renderProfileTab(user);
          }

          // 🔥 EN GÜNCEL HALİNİ KAYDET
          localStorage.setItem("mdm_user_cache", JSON.stringify(user));
        }
      }

      return user;
    }
    // 🔥 GÜNCEL SERİ GÖRSELİ (VERİTABANINA BAĞLI)
    function renderStreakBars(count) {
      var maxDays = 7;
      var html = "";

      // Güvenlik: Count undefined ise 0 yap
      var current = parseInt(count) || 0;

      for (var i = 1; i <= maxDays; i++) {
        // Mantık:
        // Eğer i sayısı, mevcut seriden küçük veya eşitse -> DOLU (Renkli)
        // Değilse -> BOŞ (Sönük)

        var isFilled = i <= current;

        // Renk Ayarları (Doluysa Turuncu/Sarı, Boşsa Gri)
        // Screenshot'taki gibi ateş rengi yapalım
        var bgColor = isFilled
        ? "linear-gradient(to right, #f59e0b, #d97706)"
        : "#334155";
        var border = isFilled
        ? "1px solid #fbbf24"
        : "1px solid rgba(255,255,255,0.1)";
        var opacity = isFilled ? "1" : "0.3";
        var shadow = isFilled ? "0 0 10px rgba(245, 158, 11, 0.5)" : "none";

        // Animasyon (Sadece en son kazanılan gün parlasın)
        var anim =
            isFilled && i === current ? "animation: pulse 2s infinite;" : "";

        html += `
<div style="flex:1; height:30px; display:flex; flex-direction:column; align-items:center; gap:4px;">
<div style="width:100%; height:6px; background:${bgColor}; border-radius:4px; border:${border}; opacity:${opacity}; box-shadow:${shadow}; transition:0.3s; ${anim}"></div>
<div style="font-size:9px; color:${
        isFilled ? "#fbbf24" : "#64748b"
      }; font-weight:${isFilled ? "bold" : "normal"};">${i}.G</div>
  </div>`;
      }
      return html;
    }
    function applyThemeEngine(theme) {
      // 1. Temizlik
      var oldCanvas = document.getElementById("mdm-theme-canvas");
      if (oldCanvas) oldCanvas.remove();
      var oldText = document.getElementById("mdm-theme-slogan");
      if (oldText) oldText.remove();

      var logoBox = document.querySelector(".mdm-logo");
      if (!logoBox) return;

      // Logo Stilini Sıfırla
      logoBox.style.border = "none";
      logoBox.style.padding = "0";
      logoBox.style.boxShadow = "none";

      if (!theme || theme === "default") return;

      // 2. Temaya Özel Sloganlar ve Renkler
      var themeConfigs = {
        newyear: {
          slogan: "🎄 Mutlu Yıllar!",
          color: "#ef4444", // Yılbaşı Kırmızısı
          glow: "rgba(239, 68, 68, 0.5)",
          symbols: ["❄", "❅", "❆", "✨"],
        },
        valentines: {
          slogan: "💖 Aşk Dolu Fırsatlar",
          color: "#ec4899", // Aşk Pembesi
          glow: "rgba(236, 72, 153, 0.5)",
          symbols: ["❤", "♥", "🌸"],
        },
        ramadan: {
          slogan: "🌙 Hayırlı Ramazanlar",
          color: "#fbbf24", // Altın Sarısı
          glow: "rgba(251, 191, 36, 0.5)",
          symbols: ["★", "🌙", "✨"],
        },
        summer: {
          slogan: "☀️ Yazın En Sıcağı",
          color: "#f97316", // Turuncu
          glow: "rgba(249, 115, 22, 0.5)",
          symbols: ["☀️", "🌊", "🌴"],
        },
      };

      var config = themeConfigs[theme];
      if (!config) return;

      // 3. LOGO ÇERÇEVESİ VE PARILTI EKLEME
      logoBox.style.border = "2px solid " + config.color;
      logoBox.style.padding = "4px 12px";
      logoBox.style.borderRadius = "50px";
      logoBox.style.boxShadow = "0 0 15px " + config.glow;
      logoBox.style.transition = "all 0.5s ease";

      // 4. LOGO ALTINA SLOGAN EKLEME
      var slogan = document.createElement("div");
      slogan.id = "mdm-theme-slogan";
      slogan.innerText = config.slogan;
      slogan.style.position = "absolute";
      if (window.innerWidth < 768) {
        slogan.style.top = "75px"; // Mobilde logonun altına iter
        slogan.style.left = "15px"; // Mobilde biraz daha soldan başlatır
        slogan.style.fontSize = "11px"; // Mobilde yazıyı hafif küçültür ki taşmasın
      } else {
        slogan.style.top = "65px"; // Masaüstü için senin orijinal ayarın
        slogan.style.left = "20px";
        slogan.style.fontSize = "14px";
      }
      slogan.style.fontWeight = "800";
      slogan.style.color = config.color;
      slogan.style.textTransform = "uppercase";
      slogan.style.letterSpacing = "1px";
      slogan.style.fontFamily = "'Outfit', sans-serif";
      slogan.style.textShadow = "0 0 5px rgba(255,255,255,0.2)";
      slogan.style.animation = "mdmFadeUp 1s ease-out";

      // Topbar'ın içine ekle (Logo yanına veya altına denk gelir)
      document.querySelector(".mdm-topbar").appendChild(slogan);

      // 5. CANVAS EFEKTİ (Daha optimize hali)
      var canvas = document.createElement("canvas");
      canvas.id = "mdm-theme-canvas";
      Object.assign(canvas.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "99999",
      });
      document.body.appendChild(canvas);

      var ctx = canvas.getContext("2d");
      var w = (canvas.width = window.innerWidth);
      var h = (canvas.height = window.innerHeight);
      var particles = [];

      for (var i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          s: Math.random() * 15 + 10,
          sym: config.symbols[
            Math.floor(Math.random() * config.symbols.length)
          ],
          speed: Math.random() * 1 + 0.5,
          drift: Math.random() * 2 - 1,
        });
      }

      function draw() {
        ctx.clearRect(0, 0, w, h);
        ctx.font = "20px Arial";
        ctx.fillStyle = config.color;

        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          ctx.fillText(p.sym, p.x, p.y);

          // Hareket
          p.y += p.speed;

          // p.drift tanımlı değilse hata vermesin diye || 0 ekledik
          var drift = p.drift || 0;
          p.x += Math.sin(p.y / 50) * 0.5 + drift;

          // 1. Aşağıdan çıktıysa tepeye al (DOĞRU SÜSLÜ PARANTEZ YAPISI)
          if (p.y > h) {
            p.y = -20;
            p.x = Math.random() * w; // Rastgele yatay konuma git
          }

          // 2. 🔥 MOBİL FİX: Yandan çıktıysa geri getir
          if (p.x > w) p.x = 0; // Sağdan çıktıysa sola al
          if (p.x < -20) p.x = w; // Soldan çıktıysa sağa al
        }
        requestAnimationFrame(draw);
      }
      draw(); // Fonksiyonu başlat
    }
    function renderApp(root) {
      var savedGlobalTheme = localStorage.getItem("mdm_global_theme");
      if (savedGlobalTheme) {
        root.setAttribute("data-global-theme", savedGlobalTheme);
      }
      var styleEl = root.querySelector("style");
      root.innerHTML = "";
      if (styleEl) root.appendChild(styleEl);

      // 1. BUGÜNÜN TARİHİ (GARANTİLİ TÜRKİYE SAATİ)
      // Tarayıcı saati ne olursa olsun Türkiye saatine göre YYYY-MM-DD üretir.
      var turkeyDate = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
      );
      var yyyy = turkeyDate.getFullYear();
      var mm = String(turkeyDate.getMonth() + 1).padStart(2, "0");
      var dd = String(turkeyDate.getDate()).padStart(2, "0");
      var todayStr = yyyy + "-" + mm + "-" + dd;

      // 2. KULLANICININ SON HAK TARİHİ
      var lastDateRaw =
          APP_STATE.user && APP_STATE.user.songunlukhaktarihi
      ? String(APP_STATE.user.songunlukhaktarihi)
      : "";
      var lastDate = "";

      if (lastDateRaw && typeof lastDateRaw === "string") {
        // Boşlukları temizle ve T harfinden öncesini al
        var clean = lastDateRaw.trim();
        lastDate = clean.includes("T") ? clean.split("T")[0] : clean;
      }

      // 3. KARŞILAŞTIRMA (KİLİT MEKANİZMASI)
      var isCollected = lastDate === todayStr;

      var btnClass = isCollected
      ? "background:#334155; cursor:default; opacity:0.6; pointer-events:none;"
      : "background:#10b981; cursor:pointer; animation: pulse 2s infinite;";
      var btnText = isCollected
      ? '<i class="fas fa-check"></i> Bugün Alındı (Yarın Gel)'
      : '<i class="fas fa-gift"></i> Günlük Hakkını Al (+1 Hak)';
      var btnAction = isCollected ? "" : "onclick='ModumApp.dailyCheckIn()'";

      var currentXP =
          APP_STATE.user && APP_STATE.user.puan
      ? parseInt(APP_STATE.user.puan).toLocaleString()
      : "0";

      // Ana Uygulama HTML'i
      var appHTML = `
<div class="mdm-topbar">
<div class="mdm-logo">MODUMNET<span>ÇEKİLİŞ</span></div>

<div style="display:flex; align-items:center; gap:8px;">
<div onclick="ModumApp.switchTab('profile')" style="background:rgba(251, 191, 36, 0.15); border:1px solid rgba(251, 191, 36, 0.4); padding:6px 12px; border-radius:50px; display:flex; align-items:center; gap:6px; cursor:pointer; transition:0.2s;">
<i class="fas fa-star" style="color:#fbbf24; font-size:12px; animation:pulse 2s infinite;"></i>
<span id="nav-live-xp" style="color:#fff; font-weight:800; font-size:12px; font-family:'Inter', sans-serif;">${currentXP} XP</span>
  </div>

<div class="mdm-help-btn-pill" onclick="ModumApp.openHelpModal()">
<i class="fas fa-question-circle"></i>
<span>YARDIM</span>
  </div>
  </div>
  </div>

<!-- MENÜ BURAYA TAŞINDI -->
<div class="mdm-bottom-nav">
<div class="mdm-nav-item active" onclick="ModumApp.switchTab('home', this)">
<div class="mdm-nav-icon"><i class="fas fa-home"></i></div>
<div class="mdm-nav-text">Vitrin</div>
  </div>
<div class="mdm-nav-item" onclick="ModumApp.openTasksTab(this)">
<div class="mdm-nav-icon"><i class="fas fa-tasks"></i></div>
<div class="mdm-nav-text">Görevler</div>
  </div>
<div class="mdm-nav-item" onclick="ModumApp.switchTab('store', this)">
<div class="mdm-nav-icon"><i class="fas fa-shopping-bag"></i></div>
<div class="mdm-nav-text">Mağaza</div>
  </div>
<div class="mdm-nav-item" onclick="ModumApp.switchTab('support', this)">
<div class="mdm-nav-icon"><i class="fas fa-comment-dots"></i></div>
<div class="mdm-nav-text">Destek</div>
  </div>
<div class="mdm-nav-item" onclick="ModumApp.switchTab('profile', this)">
<div class="mdm-nav-icon"><i class="fas fa-user"></i></div>
<div class="mdm-nav-text">Profil</div>
  </div>
  </div>

<div class="mdm-content-wrapper">
<div id="mdm-welcome-area" style="margin-bottom: 10px;"></div>
<div id="tab-home" class="mdm-tab-content active">
<div style="display: none !important; background:linear-gradient(135deg, #b45309, #78350f); padding:20px; border-radius:16px; margin-bottom:20px; text-align:center; border:1px solid #f59e0b; box-shadow:0 10px 20px rgba(180, 83, 9, 0.3); position:relative; overflow:hidden;">
<div style="position:absolute; top:-20px; right:-20px; font-size:100px; opacity:0.1; transform:rotate(15deg);">👑</div>
<div style="color:#fcd34d; font-size:12px; font-weight:800; letter-spacing:2px; text-transform:uppercase; position:relative; z-index:2;">EFSANE HAVUZU</div>
<div id="mdm-pool-val" style="font-size:36px; font-weight:800; color:#fff; margin:5px 0; text-shadow:0 2px 10px rgba(0,0,0,0.3); position:relative; z-index:2;">${(
  APP_STATE.pool || 0
).toLocaleString("tr-TR")} ₺</div>
<div style="font-size:11px; color:#fde68a; background:rgba(0,0,0,0.2); display:inline-block; padding:4px 10px; border-radius:20px; position:relative; z-index:2;">Bu ödül <b>Efsane</b> üyeler arasında paylaşılır</div>
  </div>
<div class="mdm-home-actions">
<button class="mdm-btn-lucky" style="${btnClass}" ${btnAction}>
${btnText}
  </button>

<button class="mdm-btn-notify" onclick="ModumApp.subscribeNotification()">
<i class="fas fa-bell"></i> Bildirim Al!
  </button>
<button class="mdm-btn-lucky" style="background:linear-gradient(135deg, #6366f1, #4f46e5); margin-top:10px; border:none;" onclick="ModumApp.openSurveyModal()">
<i class="fas fa-poll"></i> Söz Sizde! (Anket)
  </button>
<div id="mdm-leaderboard-area"></div>
<h3 style="color:#fff; font-size:18px; margin:20px 0 15px; ...">
  </div>

<h3 style="color:#fff; font-size:18px; margin:20px 0 15px; display:flex; align-items:center; gap:8px;"><i class="fas fa-fire" style="color:#f59e0b"></i> Aktif Fırsatlar</h3>
<div id="mdm-active-grid" class="mdm-grid">${renderRaffles(
  APP_STATE.activeRaffles,
  true
)}</div>

<h3 style="color:#94a3b8; font-size:16px; margin:30px 0 15px; display:flex; align-items:center; gap:8px;"><i class="fas fa-flag-checkered"></i> Sonuçlananlar</h3>
<div id="mdm-completed-grid" class="mdm-grid">${renderRaffles(
  APP_STATE.completedRaffles,
  false
)}</div>
  </div>

<div id="tab-tasks" class="mdm-tab-content">
<!-- GÜNLÜK SERİ KUTUSU (En Üstte) -->
<div class="mdm-streak-box">
<div style="font-size:14px; color:#fff; font-weight:bold;">🔥 Günlük Seri</div>
<div style="font-size:11px; color:#94a3b8; margin-bottom:10px;">Her gün gel, seriyi bozma, ödülleri katla!</div>

<div id="mdm-streak-container" class="mdm-streak-days" style="display:flex; justify-content:space-between; gap:5px;">
<!-- JS ile dolacak -->
<div id="mdm-streak-container" class="mdm-streak-days" style="display:flex; gap:6px; margin-top:10px; padding:0 5px;">
${renderStreakBars(APP_STATE.user.gunlukSeri)}
  </div>
  </div>
  </div>

<h3 style="color:#fff; font-size:16px; margin:20px 0 10px;">🎯 Aktif Görevler</h3>

<!-- GÖREVLERİN LİSTELENECEĞİ KUTU -->
<div id="mdm-tasks-list">
<div style="text-align:center; padding:20px; color:#64748b;">
<i class="fas fa-circle-notch fa-spin"></i> Yükleniyor...
  </div>
  </div>
  </div>

<div id="tab-store" class="mdm-tab-content">
<h3 style="color:#fff;">🛒 Puan Mağazası</h3>
${renderEarningsInfo()} <h3 style="color:#fff; font-size:16px; margin-top:20px;">🎁 Ödül Vitrini</h3>
<div id="mdm-store-container"></div> 
  </div>

<div id="tab-support" class="mdm-tab-content">

<!-- 1. DEĞERLENDİRME KUTUSU (GÖREV İÇİN) -->
<div style="background:linear-gradient(135deg, #4f46e5, #4338ca); padding:20px; border-radius:16px; margin-bottom:20px; text-align:center; position:relative; overflow:hidden; border:1px solid #6366f1;">
<div style="position:absolute; top:-10px; right:-10px; font-size:80px; opacity:0.1;">⭐</div>
<h3 style="color:#fff; font-size:16px; margin:0 0 5px 0;">Bizi Değerlendirin</h3>
<p style="color:#c7d2fe; font-size:12px; margin-bottom:15px;">Düşünceleriniz bizim için değerli. Yorum yap, "Alışveriş Gurusu" görevini tamamla!</p>

<textarea id="eval-message" rows="2" placeholder="Hizmetimizden memnun kaldınız mı?" style="width:100%; padding:10px; border-radius:8px; border:none; background:rgba(255,255,255,0.1); color:#fff; font-size:12px; margin-bottom:10px;"></textarea>

<button onclick="ModumApp.submitEvaluation()" style="background:#fbbf24; color:#78350f; border:none; padding:10px 20px; border-radius:50px; font-weight:bold; font-size:12px; cursor:pointer; box-shadow:0 4px 10px rgba(251, 191, 36, 0.3);">
GÖNDER VE KAZAN 🚀
  </button>
  </div>

<!-- 2. DESTEK TALEBİ OLUŞTURMA -->
<h3 style="color:#fff; font-size:15px; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
<i class="fas fa-headset" style="color:#f472b6;"></i> Sorun Bildir / Destek
  </h3>

<div style="background:#1e293b; padding:15px; border-radius:12px; border:1px solid #334155; margin-bottom:25px;">
<input type="text" id="supp-subject" placeholder="Konu (Örn: Kargo, Puan vb.)" style="width:100%; padding:10px; margin-bottom:10px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px; font-size:12px;">
<textarea id="supp-message" rows="3" placeholder="Sorunuzu detaylı yazın..." style="width:100%; padding:10px; margin-bottom:10px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px; font-size:12px;"></textarea>
<input type="text" id="supp-phone" placeholder="Telefon (Opsiyonel)" style="width:100%; padding:10px; margin-bottom:10px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px; font-size:12px;">

<button onclick="ModumApp.submitSupport()" class="mdm-btn-v2 btn-detail-v2" style="width:100%; background:#334155;">TALEBİ GÖNDER</button>
  </div>

<!-- 3. TALEPLERİM LİSTESİ -->
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
<h3 style="color:#fff; font-size:15px; margin:0;">📂 Taleplerim</h3>
<button onclick="ModumApp.loadSupportHistory()" style="background:transparent; border:none; color:#3b82f6; font-size:11px; cursor:pointer;"><i class="fas fa-sync"></i> Yenile</button>
  </div>

<div id="mdm-support-history">
<div style="text-align:center; padding:20px; color:#64748b;">Yükleniyor...</div>
  </div>

  </div>

<div id="tab-profile" class="mdm-tab-content">
<h3 style="color:#fff;">👤 Hesabım</h3>
<div id="mdm-profile-container">${renderProfileTab(APP_STATE.user)}</div>
  </div>
  </div>

<!-- MODALLAR AYNEN KALIYOR -->
<div id="mdm-ticket-modal" class="mdm-modal"><div class="mdm-modal-content"><div class="mdm-modal-header"><h3 style="margin:0;color:#fff;">🎟️ Bilet Cüzdanım</h3><div class="mdm-modal-close" onclick="ModumApp.closeModal('mdm-ticket-modal')">&times;</div></div><div id="mdm-ticket-list"></div></div></div>
<div id="mdm-team-modal" class="mdm-modal"><div class="mdm-modal-content"><div class="mdm-modal-header"><h3 style="margin:0;color:#fff;">🤝 Ekip Arkadaşlarım</h3><div class="mdm-modal-close" onclick="ModumApp.closeModal('mdm-team-modal')">&times;</div></div><ul id="mdm-team-list" class="mdm-team-list"></ul></div></div>
<div id="mdm-history-modal" class="mdm-modal"><div class="mdm-modal-content"><div class="mdm-modal-header"><h3 style="margin:0;color:#fff;">📜 Puan Geçmişi</h3><div class="mdm-modal-close" onclick="ModumApp.closeModal('mdm-history-modal')">&times;</div></div><div id="mdm-history-list"></div></div></div>

<div id="mdm-detail-modal" class="mdm-modal">
<div class="mdm-modal-content">
<div class="mdm-modal-header"><h3 id="mdm-detail-title" style="margin:0; color:#fff; font-size:16px;">Detaylar</h3><div class="mdm-modal-close" onclick="ModumApp.closeModal('mdm-detail-modal')">&times;</div></div>
<div id="mdm-detail-body" style="color:#cbd5e1; font-size:13px; line-height:1.6;"></div>
  </div>
  </div>

<div id="mdm-winners-modal" class="mdm-modal">
<div class="mdm-modal-content">
<div class="mdm-modal-header"><h3 style="margin:0; color:#fff; font-size:16px;">🏆 Kazananlar Listesi</h3><div class="mdm-modal-close" onclick="ModumApp.closeModal('mdm-winners-modal')">&times;</div></div>
<div id="mdm-winners-list" style="max-height:300px; overflow-y:auto;"></div>
  </div>
  </div>
`;

      var contentDiv = document.createElement("div");
      contentDiv.innerHTML = appHTML;
      root.appendChild(contentDiv);

      try {
        var hour = new Date().getHours();
        var greeting = "İyi Günler";
        var icon = "☀️";
        if (hour >= 6 && hour < 12) {
          greeting = "Günaydın";
          icon = "☕";
        } else if (hour >= 18 || hour < 6) {
          greeting = "İyi Akşamlar";
          icon = "🌙";
        }

        var rawName =
            APP_STATE.user && APP_STATE.user.name
        ? APP_STATE.user.name
        : "Misafir";
        var firstName = rawName.split(" ")[0];

        // Kutuyu bul ve içini doldur
        var welcomeBox = document.getElementById("mdm-welcome-area");
        if (welcomeBox) {
          welcomeBox.innerHTML = `<div style="padding:0 15px; color:#94a3b8; font-size:13px; font-weight:500;">${icon} ${greeting}, <b style="color:#fff;">${firstName}</b>! Şansın bol olsun.</div>`;
        }
      } catch (e) {
        console.log("Mesaj hatası:", e);
      }

      // Üst bardaki isim ve avatarı güncelle (Eğer kullanıcı varsa)
      if (APP_STATE.user && APP_STATE.user.email) {
        var initial = (APP_STATE.user.name || "M").charAt(0).toUpperCase();
        var navAvatar = document.getElementById("nav-avatar");
        var navName = document.getElementById("nav-user-name");
        if (navAvatar) navAvatar.innerText = initial;
        if (navName) navName.innerText = APP_STATE.user.name;
      }

      if (APP_STATE.activeTab !== "home")
        ModumApp.switchTab(APP_STATE.activeTab);
      startTimer();
    }

    // --- RENDER RAFFLES (GELİŞTİRİLMİŞ: PANİK MODU & AKILLI ROZET) ---
    function renderRaffles(list, isActive) {
      if (!list || list.length === 0) {
        return `<div style="text-align:center; padding:40px; color:#64748b; background:${
        THEME.cardBg
      }; border-radius:16px; border:1px dashed ${THEME.border}; width:100%;">
<i class="fas fa-ghost" style="font-size:32px; margin-bottom:15px; opacity:0.3;"></i><br>
${
        isActive
          ? "Şu an aktif bir fırsat yok.<br><small>Takipte kal!</small>"
        : "Henüz sonuçlanmış çekiliş yok."
      }
  </div>`;
      }

      return list
        .map((r) => {
        var img = r.resim || DEFAULT_IMG;

        // Tarih Hesaplamaları
        var bitisStr = r.bitisTarihi || new Date().toISOString();
        if (bitisStr.length <= 10) bitisStr += "T23:59:00"; // Saat yoksa ekle
        else if (!bitisStr.includes("T"))
          bitisStr = bitisStr.replace(" ", "T");

        var endDate = new Date(bitisStr).getTime();
        var now = new Date().getTime();
        var hoursLeft = (endDate - now) / (1000 * 60 * 60); // Kalan saat

        var gStart = bitisStr
        .replace(/-/g, "")
        .replace(/:/g, "")
        .split(".")[0];

        // Bitiş saati (Etkinlik 1 saat sürsün)
        var endObj = new Date(bitisStr);
        endObj.setHours(endObj.getHours() + 1);
        var gEnd = endObj
        .toISOString()
        .replace(/-/g, "")
        .replace(/:/g, "")
        .split(".")[0];

        // Google Linki (Başlık, Tarih ve Açıklama Otomatik Dolacak)
        var gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
          "SONUÇLANIYOR: " + r.ad
        )}&dates=${gStart}/${gEnd}&details=${encodeURIComponent(
          "ModumNet'te katıldığın çekiliş sonuçlanıyor! Ödül: " +
          r.odul +
          ". Hemen siteye girip kontrol et: https://www.modum.tr/ekilisler"
        )}&location=www.modum.tr/cekilisler&sf=true&output=xml`;

        // --- 1. MOD BELİRLEME (Sakin mi? Panik mi?) ---
        var isUrgent = isActive && hoursLeft < 24 && hoursLeft > 0; // Son 24 saat
        var cardClass = isUrgent
        ? "mdm-raffle-card mdm-card-urgent mdm-shine-hover"
        : "mdm-raffle-card mdm-shine-hover";

        // --- 2. ROZET BELİRLEME ---
        var badgeHtml = "";
        var katilimci = parseInt(r.katilimciSayisi) || 0;
        var odulText = (r.odul || "").toLowerCase();

        if (isActive) {
          if (hoursLeft < 12) {
            badgeHtml =
              '<div class="mdm-rc-badge mdm-badge-panic">⏳ SON SAATLER</div>';
          } else if (hoursLeft < 24) {
            badgeHtml =
              '<div class="mdm-rc-badge mdm-badge-panic">🚨 SON 1 GÜN</div>';
          } else if (katilimci > 100) {
            badgeHtml =
              '<div class="mdm-rc-badge mdm-badge-fire">🔥 ALEV ALEV</div>';
          } else if (
            odulText.includes("1000") ||
            odulText.includes("telefon") ||
            odulText.includes("altın")
          ) {
            badgeHtml =
              '<div class="mdm-rc-badge mdm-badge-legend">💎 EFSANE</div>';
          } else {
            badgeHtml =
              '<div class="mdm-rc-badge mdm-badge-new">✨ YENİ FIRSAT</div>';
          }
        }

        // --- 3. İLERLEME ÇUBUĞU (GÖRSEL SAYAÇ) ---
        // Toplam süreyi bilmediğimiz için kalan süreye göre tahmini doluluk yapıyoruz
        var barWidth = "100%";
        var barColor = "bar-green";

        if (isActive) {
          if (hoursLeft < 12) {
            barWidth = "15%";
            barColor = "bar-red";
          } else if (hoursLeft < 24) {
            barWidth = "30%";
            barColor = "bar-red";
          } else if (hoursLeft < 72) {
            barWidth = "60%";
            barColor = "bar-yellow";
          } else {
            barWidth = "100%";
            barColor = "bar-green";
          }
        }

        // --- 4. BUTONLAR ---
        var cleanName = (r.ad || "").toLowerCase().trim();
        var isJoined = APP_STATE.myRaffles.some(
          (myRef) => (myRef || "").toLowerCase().trim() === cleanName
        );

        var mainBtn = "";
        if (isActive) {
          if (isJoined) {
            mainBtn = `<button class="mdm-btn-v2 btn-green" style="cursor:default; opacity:0.9; margin-top:5px;" onclick="ModumApp.openTicketModal()">KATILDINIZ <i class="fas fa-check-circle"></i></button>`;
          } else {
            // Eğer acilse buton kırmızı ve titreyen olsun
            var btnStyleClass = isUrgent ? "btn-panic-mode" : "btn-join-v2";
            var btnText = isUrgent ? "SON ŞANS! KATIL" : "HEMEN KATIL";
            mainBtn = `<button class="mdm-btn-v2 ${btnStyleClass}" style="margin-top:5px;" onclick="ModumApp.joinRaffle('${
            r.id
          }', '${r.ad.replace(
              /'/g,
              "\\'"
            )}')">${btnText} <i class="fas fa-arrow-right"></i></button>`;
          }
        } else {
          mainBtn = `<button class="mdm-btn-v2 btn-detail-v2" style="width:100%; margin-top:5px;" onclick="ModumApp.openWinnersModal('${r.ad}')">🏆 Kazananları Gör</button>`;
        }

        // Sayaç HTML (Sadece aktifse)
        var timerHtml = isActive
        ? `
<div class="mdm-timer-minimal mdm-timer-smart" data-end="${bitisStr}">
<div class="mdm-tm-part"><div class="mdm-tm-val">-</div><div class="mdm-tm-lbl">GÜN</div></div> <div class="mdm-tm-dots">:</div>
<div class="mdm-tm-part"><div class="mdm-tm-val">-</div><div class="mdm-tm-lbl">SAAT</div></div> <div class="mdm-tm-dots">:</div>
<div class="mdm-tm-part"><div class="mdm-tm-val">-</div><div class="mdm-tm-lbl">DK</div></div> <div class="mdm-tm-dots">:</div>
<div class="mdm-tm-part"><div class="mdm-tm-val">-</div><div class="mdm-tm-lbl">SN</div></div>
  </div>`
        : `<div style="text-align:center; margin-bottom:15px; color:#ef4444; font-weight:bold; letter-spacing:1px; border:1px solid #ef4444; padding:5px; border-radius:6px; background:rgba(239,68,68,0.1);">SONA ERDİ</div>`;

        return `
<div class="${cardClass}">
<div class="mdm-rc-image">
<img src="${img}" alt="${r.ad}">
${badgeHtml}
  </div>
<div class="mdm-rc-body">
<div class="mdm-rc-title">${r.ad}</div>
<div class="mdm-stats-bar">
<div class="mdm-sb-item"><div class="mdm-sb-lbl">Katılımcı</div><div class="mdm-sb-val">${
        r.katilimciSayisi
      }</div></div>
<div class="mdm-sb-sep"></div>
<div class="mdm-sb-item"><div class="mdm-sb-lbl">Ödül</div><div class="mdm-sb-val">${
        r.odul
      }</div></div>
  </div>
${timerHtml}

<div class="mdm-action-grid" style="margin-top:auto;">
<button class="mdm-btn-v2 btn-detail-v2" style="margin-top:5px;" onclick="ModumApp.openDetailModal('${
        r.id
      }', '${r.ad}', '${img}', '${r.odul}', '${bitisStr}', '${
        r.katilimciSayisi
      }')"><i class="fas fa-info-circle"></i> İncele</button>
${mainBtn}
  </div>

<div class="mdm-rc-footer" style="margin-top:10px;">
<button class="btn-share-link" onclick="ModumApp.shareRaffle('${
        r.ad
      }')"><i class="fas fa-share-alt"></i> Arkadaşlarınla Paylaş</button>
<a href="${gCalUrl}" target="_blank" class="btn-share-link" style="flex:1; text-decoration:none; color:#f59e0b; border-color:#f59e0b;">
<i class="fas fa-calendar-plus"></i> Hatırlat
  </a>
  </div>
  </div>
${
        isActive
          ? `<div class="mdm-progress-container"><div class="mdm-progress-bar ${barColor}" style="width:${barWidth}"></div></div>`
        : ""
      }
  </div>`;
      })
        .join("");
    }

    // --- PROFİL SEKMESİ (BÜTÜNLEŞİK KART TASARIMI - TEMA İÇİNDE) ---
    function renderProfileTab(incomingUser) {
      // 1. GÜVENLİK
      var user = incomingUser;
      if (!user || !user.email) {
        try { var cached = JSON.parse(localStorage.getItem("mdm_user_cache")); if (cached && cached.email) user = cached; } catch (e) {}
      }
      if (!user || !user.email) {
        return `<div style="text-align:center; padding:50px 20px;"><h3 style="color:#fff;">Giriş Yapmalısın</h3><a href="/kullanici-giris" class="mdm-btn-lucky">GİRİŞ YAP</a></div>`;
      }

      // 2. TEMA VE RENK AYARLARI (Acil Durum Kitli)
      var themesDB = null;
      if(typeof PROFILE_THEMES !== 'undefined') themesDB = PROFILE_THEMES;
      else if(typeof window.PROFILE_THEMES !== 'undefined') themesDB = window.PROFILE_THEMES;
      else {
        // Yedek Temalar
        themesDB = {
          "default": { bg: "#1e293b", border: "#334155", glow: "#334155" },
          "caylak": { bg: "#064e3b", border: "#10b981", glow: "#10b981" },
          "usta": { bg: "#3b0764", border: "#8b5cf6", glow: "#8b5cf6" },
          "sampiyon": { bg: "#451a03", border: "#f59e0b", glow: "#f59e0b" },
          "efsane": { bg: "#450a0a", border: "#ef4444", glow: "#ef4444" },
          "gold": { bg: "linear-gradient(135deg, #422006, #713f12)", border: "#eab308", glow: "#eab308" },
          "dark": { bg: "#000000", border: "#333333", glow: "#ffffff" }
        };
      }

      var myThemeId = user.profileTheme || "default";
      var theme = themesDB[myThemeId] || themesDB["default"];

      // 🔥 KART STİLİ (Tüm içeriği kapsayacak stil)
      var cardStyle = `background: ${theme.bg} !important; border: 1px solid ${theme.border}; box-shadow: 0 0 20px ${theme.glow}40; border-radius: 20px; padding: 20px; margin-bottom: 20px; position: relative; transition: background 0.3s ease;`;

      // 3. TEMEL VERİLER
      var xp = parseInt(user.puan) || 0;
      var level = user.seviye || "Çaylak";
      var name = user.adSoyad || user.name || "Misafir";

      var ranks = {
        Çaylak: { color: "#10b981", icon: "🌱", nextName: "Usta", next: 2500, class: "theme-caylak" },
        Usta: { color: "#8b5cf6", icon: "🏆", nextName: "Şampiyon", next: 7500, class: "theme-usta" },
        Şampiyon: { color: "#f59e0b", icon: "🥇", nextName: "Efsane", next: 15000, class: "theme-sampiyon" },
        Efsane: { color: "#ef4444", icon: "👑", nextName: "Maksimum", next: 999999, class: "theme-efsane" }
      };
      var currentRank = ranks[level] || ranks["Çaylak"];

      // İlerleme
      var progressPercent = 100;
      var nextLevelText = "Zirvedesin!";
      if (level !== "Efsane") {
        var goal = currentRank.next;
        var prevLimit = level === "Usta" ? 2500 : (level === "Şampiyon" ? 7500 : 0);
        progressPercent = Math.min(Math.max(((xp - prevLimit) / (goal - prevLimit)) * 100, 0), 100);
        nextLevelText = `${currentRank.nextName} için ${goal - xp} XP`;
      }

      // Avatar
      // --- 1. ÖNCE ÇERÇEVEYİ KONTROL ET ---
      var framesFromParam = user.ownedFrames || [];
      var framesFromGlobal = (window.APP_STATE && window.APP_STATE.user && window.APP_STATE.user.ownedFrames) || [];
      var mergedFrames = [...new Set([...framesFromParam, ...framesFromGlobal])];

      var currentFrame = user.selectedFrame || "";
      var frameHtml = currentFrame ? `<div class="mdm-avatar-frame ${currentFrame}" style="top:-10px; left:-10px; right:-10px; bottom:-10px; z-index:2;"></div>` : "";

      // --- 2. SONRA AVATARI ÇİZ (AKILLI KENARLIK) ---
      var avatarUrl = user.selectedAvatar || "";
      var avatarDisplay = "";
      var dbBadges = (typeof BADGES_DB !== 'undefined') ? BADGES_DB : {};

      // 🔥 KİLİT NOKTA: Eğer çerçeve takılıysa kenarlığı (border) SİL, yoksa Rütbe Rengini koy
      var borderStyle = (currentFrame && currentFrame !== "") ? "border:none !important; box-shadow:none !important;" : `border-color:${currentRank.color}`;

      if (avatarUrl.includes("http")) {
        avatarDisplay = `<img src="${avatarUrl}" class="mdm-insta-avatar-img" style="${borderStyle}">`;
      } else if (dbBadges[avatarUrl]) {
        avatarDisplay = `<div class="mdm-insta-avatar-img" style="display:flex;align-items:center;justify-content:center;font-size:60px;background:#1e293b; ${borderStyle}">${dbBadges[avatarUrl].i}</div>`;
      } else {
        avatarDisplay = `<img src="https://www.modum.tr/i/m/001/0013355.png" class="mdm-insta-avatar-img" style="${borderStyle}">`;
      }

      var framesListHtml = `<div class="mdm-mini-frame-icon" onclick="ModumApp.equipFrame('')" title="Çıkar"><i class="fas fa-ban" style="position:absolute;top:10px;left:12px;color:#ef4444;"></i></div>`;
      mergedFrames.forEach(function(f) {
        var isEquipped = currentFrame === f ? "border-color:#4ade80; box-shadow:0 0 10px #4ade80;" : "";
        framesListHtml += `<div class="mdm-mini-frame-icon ${f}" style="${isEquipped}" onclick="ModumApp.openFrameDetail('${f}')"></div>`;
      });

      var safeBio = user.bio || "Merhaba! Ben ModumNet üyesiyim. 🛍️";

      // 4. MENU STİLLERİ (Şeffaflaştırıldı çünkü artık renkli kartın içinde)
      var menuStyle = `border:1px solid rgba(255,255,255,0.1); background:rgba(0, 0, 0, 0.2); box-shadow:0 4px 15px rgba(0,0,0,0.1);`;
      var iconStyle = `background:rgba(255,255,255,0.1); color:#fff;`;

      var oldMenuHtml = `
<div class="mdm-menu-grid" style="margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
<div class="mdm-menu-card" style="${menuStyle}; padding:15px; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="ModumApp.openMyCouponsModal()">
<div style="${iconStyle}; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-tags"></i></div>
<div style="font-size:12px; font-weight:bold; color:#fff;">Kuponlarım</div>
  </div>
<div class="mdm-menu-card" style="${menuStyle}; padding:15px; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="ModumApp.openTicketModal()">
<div style="${iconStyle}; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-ticket-alt"></i></div>
<div style="font-size:12px; font-weight:bold; color:#fff;">Biletlerim</div>
  </div>
<div class="mdm-menu-card" style="${menuStyle}; padding:15px; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="ModumApp.openTeamModal()">
<div style="${iconStyle}; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-users"></i></div>
<div style="font-size:12px; font-weight:bold; color:#fff;">Ekibim</div>
  </div>
<div class="mdm-menu-card" style="${menuStyle}; padding:15px; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="ModumApp.openHistoryModal()">
<div style="${iconStyle}; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-history"></i></div>
<div style="font-size:12px; font-weight:bold; color:#fff;">Geçmiş</div>
  </div>
  </div>`;

      // 5. ROZETLER
      var badgeGridHtml = '<div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; background:rgba(0,0,0,0.2); padding:15px; border-radius:16px;">';
      Object.keys(dbBadges).forEach((key) => {
        var b = dbBadges[key];
        var hasIt = (user.badges || []).includes(key) || key === "lvl_caylak";
        var opacity = hasIt ? "1" : "0.3";
        var filter = hasIt ? "none" : "grayscale(100%)";
        badgeGridHtml += `<div onclick="ModumApp.openBadgeDetail('${key}')" style="position:relative; aspect-ratio:1; background:rgba(255,255,255,0.05); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px; cursor:pointer; opacity:${opacity}; filter:${filter}; transition:0.2s;">${b.i}</div>`;
      });
      badgeGridHtml += "</div>";

      // --- HTML ÇIKTISI (BÜYÜK BİRLEŞTİRME) ---
      return `
<div class="${currentRank.class}">

<div style="${cardStyle}">

<div class="mdm-insta-card" style="background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important;">                


<div class="mdm-insta-avatar-area">
<div style="position:relative;">
${avatarDisplay}
${frameHtml}
  </div>
  </div>

<div class="mdm-insta-info">
<div class="mdm-insta-username">${name}</div>
<div class="mdm-profile-actions">
<button onclick="ModumApp.openEditProfile()" style="background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.2); padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">✏️ Düzenle</button>
<button onclick="ModumApp.openThemeSelector()" style="background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.2); padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold; margin-left:15px;">🎨 Tema</button>
  </div>
<div class="mdm-insta-bio">${safeBio}</div>
<div class="mdm-insta-stats">
<div class="mdm-stat-item"><span class="mdm-stat-num" style="color:${currentRank.color}">${level}</span><span class="mdm-stat-label">Rütbe</span></div>
<div class="mdm-stat-item"><span class="mdm-stat-num">${user.gunlukSeri || 0}</span><span class="mdm-stat-label">Seri</span></div>
<div class="mdm-stat-item"><span class="mdm-stat-num">${(user.badges || []).length}</span><span class="mdm-stat-label">Rozet</span></div>
  </div>
<div style="background:rgba(0,0,0,0.3); height:8px; border-radius:10px; width:100%; overflow:hidden; margin-top:5px;">
<div style="background: ${currentRank.color}; height:100%; width:${progressPercent}%;"></div>
  </div>
<div style="font-size:10px; color:rgba(255,255,255,0.6); margin-top:3px; text-align:right;">${nextLevelText}</div>
  </div>

<div class="mdm-insta-frames">
<div style="font-size:9px; color:rgba(255,255,255,0.5); margin-bottom:5px; writing-mode: vertical-rl; transform: rotate(180deg);">KOLEKSİYON</div>
${framesListHtml}
  </div>
  </div>

<div style="height:1px; background:rgba(255,255,255,0.1); margin: 20px 0;"></div>

${oldMenuHtml}

<div style="margin-top:20px;">
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
<div style="font-size:11px; color:#fff; font-weight:700; opacity:0.8;">ROZET VİTRİNİ</div>
<button onclick="ModumApp.initShareProcess()" style="background:linear-gradient(45deg, #f09433, #dc2743); border:none; color:white; font-size:10px; padding:4px 12px; border-radius:20px; cursor:pointer; font-weight:bold;">📸 Story Paylaş</button>
  </div>
${badgeGridHtml}
  </div>

  </div> </div>
`;
    }

    // --- MAĞAZA KAZANÇ TABLOSU (Responsive & Yeni Limitler) ---
    function renderEarningsInfo() {
      // Limitler ve Ödüller
      const tiers = [
        {
          title: "Standart",
          range: "0 - 999 TL",
          xp: "250 XP",
          color: "#94a3b8",
          bg: "rgba(148, 163, 184, 0.1)",
          icon: "🛍️",
          border: "#475569",
        },
        {
          title: "Bronz",
          range: "1.000 - 2.499 TL",
          xp: "500 XP",
          color: "#cd7f32",
          bg: "rgba(205, 127, 50, 0.1)",
          icon: "🥉",
          border: "#b45309",
        },
        {
          title: "Gümüş",
          range: "2.500 - 4.999 TL",
          xp: "1.000 XP",
          color: "#e2e8f0",
          bg: "rgba(226, 232, 240, 0.1)",
          icon: "🥈",
          border: "#94a3b8",
        },
        {
          title: "Efsane",
          range: "5.000 TL +",
          xp: "2.500 XP",
          color: "#fbbf24",
          bg: "rgba(251, 191, 36, 0.1)",
          icon: "👑",
          border: "#fbbf24",
        },
      ];

      let gridHtml = `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-top:15px;">`;

      tiers.forEach((t) => {
        gridHtml += `
<div style="border:1px solid ${t.border}; background:${t.bg}; padding:12px 5px; border-radius:10px; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:90px;">
<div style="font-size:12px; color:${t.color}; font-weight:700; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">${t.icon} ${t.title}</div>
<div style="font-size:18px; font-weight:800; color:#fff; margin-bottom:4px; text-shadow:0 2px 10px rgba(0,0,0,0.2);">${t.xp}</div>
<div style="font-size:10px; color:#94a3b8; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:10px;">${t.range}</div>
  </div>
`;
      });

      gridHtml += `</div>`;

      return `
<div class="mdm-card" style="margin-bottom:20px; background:#1e293b; border:1px solid #334155; padding:20px; border-radius:16px;">
<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
<h3 style="color:#fff; font-size:15px; margin:0; display:flex; align-items:center; gap:8px;">
<i class="fas fa-shopping-cart" style="color:#3b82f6;"></i> Alışveriş ile Kazan
  </h3>
  </div>
<p style="font-size:11px; color:#94a3b8; margin:10px 0 0 0;">Sipariş tutarına göre anında XP kazan ve seviye atla!</p>
${gridHtml}
  </div>
`;
    }

    function renderLeaderboardList(list) {
      if (!list || list.length === 0)
        return '<li style="padding:15px; text-align:center; color:#94a3b8;">Henüz veri yok.</li>';
      return list
        .map((u, i) => {
        var rankIcon = i + 1;
        var color = THEME.textMuted;
        if (i === 0) {
          rankIcon = "🥇";
          color = THEME.gold;
        } else if (i === 1) {
          rankIcon = "🥈";
          color = THEME.silver;
        } else if (i === 2) {
          rankIcon = "🥉";
          color = THEME.bronze;
        }
        return `<li class="mdm-lb-item"><div class="mdm-lb-rank" style="color:${color}">${rankIcon}</div><div class="mdm-lb-info"><div class="mdm-lb-name">${u.name}</div><div class="mdm-lb-level">${u.level}</div></div><div class="mdm-lb-points">${u.points} XP</div></li>`;
      })
        .join("");
    }

    function renderLevelJourney(user) {
      var levels = [
        { name: "Çaylak", minXP: 0 },
        { name: "Usta", minXP: 2500 },
        { name: "Şampiyon", minXP: 7500 },
        { name: "Efsane", minXP: 15000 },
      ];
      var currentXP = user.puan || 0;
      var currentLevelIndex = 0;
      if (user.seviye === "Usta") currentLevelIndex = 1;
      if (user.seviye === "Şampiyon") currentLevelIndex = 2;
      if (user.seviye === "Efsane") currentLevelIndex = 3;
      var totalProgress = Math.min((currentXP / 15000) * 100, 100);
      var stepsHtml = levels
      .map((lvl, idx) => {
        var status =
            idx < currentLevelIndex
        ? "completed"
        : idx === currentLevelIndex
        ? "active"
        : "";
        var icon = idx === 3 ? "👑" : idx + 1;
        if (status === "completed") icon = "✓";
        return `<div class="mdm-step ${status}"><div class="mdm-step-circle">${icon}</div><div class="mdm-step-label">${lvl.name}</div></div>`;
      })
      .join("");
      return `<div class="mdm-level-journey"><div class="mdm-level-header"><span>Mevcut: <b style="color:#fff">${user.seviye}</b></span><span>${currentXP} XP</span></div><div class="mdm-level-steps"><div class="mdm-level-line"></div><div class="mdm-level-line-fill" style="width:${totalProgress}%"></div>${stepsHtml}</div></div>`;
    }
    // --- MAĞAZA SEKMESİ (AYRIŞTIRILMIŞ PREMIUM VERSİYON) ---
    async function renderStoreTab() {
      const container = document.getElementById("mdm-store-container");
      if (!container) return;

      container.innerHTML =
        '<div style="text-align:center; padding:40px; color:#94a3b8;"><i class="fas fa-circle-notch fa-spin"></i> Mağaza Yükleniyor...</div>';

      const userLevel =
            APP_STATE.user && APP_STATE.user.seviye
      ? APP_STATE.user.seviye
      : "Çaylak";
      const LEVEL_POWER = { Çaylak: 1, Usta: 2, Şampiyon: 3, Efsane: 4 };
      const myPower = LEVEL_POWER[userLevel] || 1;
      const myCurrentPuan = parseInt(APP_STATE.user.puan) || 0;

      // Verileri Çek
      const pItems = fetchApi("get_store_items");
      const pHistory = fetchApi("get_user_history", {
        email: APP_STATE.user.email,
      });

      const [res, resHist] = await Promise.all([pItems, pHistory]);

      // Satın alınanları bul
      let purchasedItems = [];
      let ownedFrames = APP_STATE.user.ownedFrames || []; // Kullanıcının zaten sahip olduğu çerçeveler

      if (resHist && resHist.success && resHist.list) {
        purchasedItems = resHist.list.map((h) =>
                                          (h.action || h.islem || "").toLowerCase()
                                         );
      }

      if (res && res.success && res.items.length > 0) {
        let finalHtml = "";

        // 🔥 1. AYRIŞTIRMA: Çerçeveler ve Diğerleri
        // Başlığında "Çerçeve" geçenleri veya tipi "avatar_frame" olanları ayır
        const frameItems = res.items.filter(
          (i) =>
          i.title.toLowerCase().includes("çerçeve") ||
          i.type === "avatar_frame"
        );
        const normalItems = res.items.filter((i) => !frameItems.includes(i));

        // 🔥 2. KOZMETİK MAĞAZASI (ÇERÇEVELER) HTML
        if (frameItems.length > 0) {
          let framesHtml = "";

          frameItems.forEach((f) => {
            // Bu çerçeveye zaten sahip mi?
            const frameClass = f.kupon_kodu || f.code || "";
            const isOwned =
                  ownedFrames.includes(frameClass) ||
                  purchasedItems.some((h) => h.includes(f.title.toLowerCase()));

            let btnText = `<div style="font-size:12px; font-weight:800; color:#fbbf24;">${f.costXP} XP</div>`;

            // 🔥 DEĞİŞİKLİK BURADA: buyItem fonksiyonuna 4. parametre olarak 'frameClass' ekledik
            let action = `onclick="ModumApp.openFramePurchaseModal('${f.id}', '${f.title}', ${f.costXP}, '${frameClass}')"`;

            let cardStyle = "";

            if (isOwned) {
              btnText = `<div style="font-size:10px; font-weight:bold; color:#4ade80;">SAHİPSİN ✅</div>`;
              action = ""; // Tıklanmasın
              cardStyle = "opacity:0.6; filter:grayscale(0.5);";
            }

            framesHtml += `
<div class="mdm-frame-card" style="${cardStyle}" ${action}>
<div class="mdm-preview-avatar">
<div class="mdm-avatar-frame ${frameClass}"></div>
👤
  </div>
<div style="font-size:11px; color:#fff; font-weight:bold; margin-bottom:5px; text-align:center; line-height:1.2;">${f.title}</div>
${btnText}
  </div>`;
          });

          finalHtml += `
<div class="mdm-cosmetic-area">
<i class="fas fa-magic mdm-cosmetic-bg-icon"></i>
<div class="mdm-cosmetic-title"><i class="fas fa-gem"></i> KOZMETİK MAĞAZASI</div>
<div style="font-size:11px; color:#a78bfa; margin-bottom:15px;">Puanlarınla profilini kişiselleştir, farkını göster!</div>
<div class="mdm-frame-showcase">
${framesHtml}
  </div>
  </div>`;
        }

        // 🔥 3. STANDART KUPON MAĞAZASI (LEVEL GRUPLU)
        // (Eski mantığın aynısı, sadece 'normalItems' dizisini kullanıyor)
        const groups = { Çaylak: [], Usta: [], Şampiyon: [], Efsane: [] };

        normalItems.forEach((item) => {
          let lvlRaw = item.minLevel || "Çaylak";
          let lvl = "Çaylak";
          if (lvlRaw.toLowerCase().includes("efsane")) lvl = "Efsane";
          else if (
            lvlRaw.toLowerCase().includes("şampiyon") ||
            lvlRaw.toLowerCase().includes("sampiyon")
          )
            lvl = "Şampiyon";
          else if (lvlRaw.toLowerCase().includes("usta")) lvl = "Usta";
          groups[lvl].push(item);
        });

        const order = ["Çaylak", "Usta", "Şampiyon", "Efsane"];

        order.forEach((groupName) => {
          const products = groups[groupName];
          if (products.length === 0) return;

          let color = "#10b981";
          if (groupName === "Usta") color = "#8b5cf6";
          if (groupName === "Şampiyon") color = "#f59e0b";
          if (groupName === "Efsane") color = "#ef4444";

          const reqPower = LEVEL_POWER[groupName] || 1;
          const isLockedGroup = myPower < reqPower;
          const lockIcon = isLockedGroup
          ? '<i class="fas fa-lock" style="margin-left:5px;"></i>'
          : "";
          const groupTitle = isLockedGroup
          ? `${groupName} Mağazası (Kilitli)`
          : `${groupName} Mağazası`;

          finalHtml += `
<div style="margin-top:25px; margin-bottom:10px; padding-left:10px; border-left:4px solid ${color}; display:flex; align-items:center;">
<h3 style="color:#fff; font-size:15px; margin:0;">${groupTitle} ${lockIcon}</h3>
  </div>
<div class="mdm-store-grid">
`;

          products.forEach((p) => {
            const titleLower = p.title.toLowerCase();
            const isUnlimited =
                  titleLower.includes("hak") ||
                  titleLower.includes("kutu") ||
                  titleLower.includes("sandık");
            const alreadyBought =
                  !isUnlimited &&
                  purchasedItems.some((hItem) => hItem.includes(titleLower));
            var itemCost = parseInt(p.costXP) || 0;

            let btnHtml = "";
            let lockOverlay = "";
            let opacity = "1";

            if (isLockedGroup) {
              btnHtml = `<button class="mdm-btn-store locked" disabled><i class="fas fa-lock"></i> KİLİTLİ</button>`;
              lockOverlay = `<div class="mdm-card-lock-overlay"><i class="mdm-lock-icon fas fa-lock"></i></div>`;
              opacity = "0.6";
            } else if (alreadyBought) {
              btnHtml = `<button class="mdm-btn-store soldout" style="background:#475569; opacity:1; cursor:default;" disabled><i class="fas fa-check"></i> ALINDI</button>`;
              opacity = "0.5";
            } else if (myCurrentPuan < itemCost) {
              btnHtml = `<button class="mdm-btn-store" style="background:#334155; color:#94a3b8; cursor:not-allowed;" disabled>PUAN YETERSİZ</button>`;
            } else {
              btnHtml = `<button class="mdm-btn-store buy" onclick="ModumApp.buyItem('${p.id}', '${p.title}', ${p.costXP})">SATIN AL</button>`;
            }

            let icon = '<i class="fas fa-ticket-alt"></i>';
            if (titleLower.includes("indirim"))
              icon = '<i class="fas fa-percent"></i>';
            if (titleLower.includes("kargo"))
              icon = '<i class="fas fa-truck"></i>';
            if (titleLower.includes("kutu") || titleLower.includes("sandık"))
              icon = '<i class="fas fa-gift"></i>';
            if (titleLower.includes("hak"))
              icon = '<i class="fas fa-ticket-alt"></i>';
            if (p.type === "physical_gift") icon = "🎁";

            finalHtml += `
<div class="mdm-store-card" style="opacity:${opacity}; border-color:${
            isLockedGroup ? "#334155" : color
          };">
${lockOverlay}
<div class="mdm-sc-header">
<div class="mdm-sc-icon-box" style="color:${color}; background:${color}15;">${icon}</div>
<div class="mdm-sc-cost" style="color:${color};">${p.costXP} XP</div>
  </div>
<div class="mdm-sc-title">${p.title}</div>
<div class="mdm-sc-desc">${p.description || ""}</div>
<div class="mdm-sc-footer">${btnHtml}</div>
  </div>
`;
          });
          finalHtml += `</div>`;
        });

        container.innerHTML = finalHtml;
      } else {
        container.innerHTML =
          '<div style="text-align:center; padding:40px; color:#94a3b8;">Mağazada aktif ürün yok.</div>';
      }
    }

    // --- GÜÇLENDİRİLMİŞ SAYAÇ MOTORU (TITREME YOK) ---
    function startTimer() {
      if (window.mdmTimerInterval) clearInterval(window.mdmTimerInterval);

      window.mdmTimerInterval = setInterval(() => {
        document.querySelectorAll(".mdm-timer-smart").forEach((el) => {
          let endStr = el.dataset.end;
          if (!endStr || endStr === "-" || endStr === "undefined") return;

          // Tarih Formatı Temizliği
          let safeStr = endStr.trim();
          if (safeStr.includes(" ") && !safeStr.includes("T")) {
            safeStr = safeStr.replace(" ", "T");
          }
          if (safeStr.length <= 10) safeStr += "T23:59:00"; // Saat yoksa ekle

          const end = new Date(safeStr).getTime();
          const now = new Date().getTime();
          const diff = end - now;

          const boxes = el.querySelectorAll(".mdm-tm-val");

          if (isNaN(end)) return;

          if (diff < 0) {
            // Süre dolduysa kutuyu değiştir
            el.innerHTML =
              '<div style="color:#ef4444; font-weight:bold; width:100%; text-align:center; padding:4px; font-size:12px;">SÜRE DOLDU</div>';
          } else {
            // Matematiksel Hesap
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor(
              (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            // Kutulara SADECE RAKAM Yaz (Yanına "g" vs koyma, sığmaz)
            if (boxes.length >= 4) {
              boxes[0].innerText = d; // Gün (Örn: 20)
              boxes[1].innerText = h < 10 ? "0" + h : h; // Saat (Örn: 05)
              boxes[2].innerText = m < 10 ? "0" + m : m; // Dakika
              boxes[3].innerText = s < 10 ? "0" + s : s; // Saniye
            }
          }
        });
      }, 1000);
    }

    /* --- WINDOW MODUMAPP (FİNAL TEMİZ SÜRÜM) --- */
    window.ModumApp = {
      // 1. Sekme Değiştirme
      switchTab: function (tabId, el) {
        // 🔥 LOG EKLEMESİ:
        ModumApp.logAction("Sekme Gezdi", tabId.toUpperCase());

        APP_STATE.activeTab = tabId;
        document
          .querySelectorAll(".mdm-tab-content")
          .forEach((d) => d.classList.remove("active"));
        var target = document.getElementById("tab-" + tabId);
        if (target) target.classList.add("active");
        if (el) {
          document
            .querySelectorAll(".mdm-nav-item")
            .forEach((n) => n.classList.remove("active"));
          el.classList.add("active");
        }

        // 🔥 MAĞAZA İSE YENİLE
        if (tabId === "store") {
          renderStoreTab();
        }

        // 🔥🔥🔥 YENİ: PROFİL İSE ANINDA YENİLE VE ÇERÇEVELERİ GETİR
        if (tabId === "profile") {
          // Cache'den en taze veriyi çekip yeniden çiz
          var cached = JSON.parse(localStorage.getItem("mdm_user_cache"));
          var profileContainer = document.getElementById(
            "mdm-profile-container"
          );
          if (cached && profileContainer) {
            profileContainer.innerHTML = renderProfileTab(cached);
          }
        }

        if (tabId === "support") {
          ModumApp.loadSupportHistory();
        }
      },
      // 1. GÜNCELLENMİŞ SATIN ALMA (SINIRSIZ ÜRÜN DESTEKLİ 🔄)
      buyItem: function (id, title, cost) {
        if (!APP_STATE.user || !APP_STATE.user.email)
          return alert("Giriş yapmalısın.");

        var currentPoints = parseInt(APP_STATE.user.puan) || 0;
        if (currentPoints < cost) return alert("Yetersiz Puan!");

        // Onay
        if (!confirm(title + " (" + cost + " XP) satın alınacak. Onaylıyor musun?")) return;

        // Butonu Kilitle (Görsel Efekt Başlangıcı)
        var btn = event.target;
        if(btn.tagName !== "BUTTON") btn = btn.closest("button");

        var originalText = "SATIN AL"; // Varsayılan metin
        var originalBg = ""; 

        if(btn) {
          originalText = btn.innerHTML; // Eski metni sakla
          originalBg = btn.style.background; // Eski rengi sakla
          btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> İşleniyor...';
          btn.disabled = true;
          btn.style.opacity = "0.7";
        }

        fetchApi("buy_store_item", {
          email: APP_STATE.user.email,
          itemId: id,
        }).then((res) => {
          if (res && res.success) {
            // Puanı düş
            APP_STATE.user.puan = currentPoints - cost;
            var navXP = document.getElementById("nav-live-xp");
            if(navXP) navXP.innerText = APP_STATE.user.puan + " XP";

            // 🔥 KRİTİK AYRIM: BU ÜRÜN SINIRSIZ MI?
            var lowerTitle = title.toLowerCase();
            var isUnlimited = lowerTitle.includes("hak") || 
                lowerTitle.includes("sandık") || 
                lowerTitle.includes("sandik") || 
                lowerTitle.includes("kutu") ||
                lowerTitle.includes("şans") ||
                lowerTitle.includes("sans");

            if(btn) {
              if (isUnlimited) {
                // --- SINIRSIZ ÜRÜNSE (Hak, Sandık) ---
                // 1. Yeşil "Başarılı" yap
                btn.innerHTML = '<i class="fas fa-check"></i> BAŞARILI';
                btn.style.background = "#10b981"; // Yeşil
                btn.style.opacity = "1";

                // 2. 2 Saniye sonra eski haline döndür (Tekrar alabilsin)
                setTimeout(() => {
                  btn.innerHTML = "TEKRAR AL 🔄";
                  btn.style.background = originalBg; // Eski rengine dön
                  btn.disabled = false; // Kilidi aç
                }, 2000);

              } else {
                // --- TEK SEFERLİK ÜRÜNSE (Kupon, Çerçeve) ---
                // Sonsuza kadar kilitle
                btn.innerHTML = '<i class="fas fa-check"></i> ALINDI';
                btn.classList.add("soldout");
                btn.style.background = "#475569";
                btn.style.cursor = "default";
                btn.disabled = true;
                btn.onclick = null;
              }
            }

            // Çerçeve Kontrolü...
            if (lowerTitle.includes("çerçeve") || lowerTitle.includes("frame")) {
              setTimeout(function () {
                updateDataInBackground(); 
                ModumApp.switchTab("profile"); 
              }, 1000);
              alert("✅ Çerçeve satın alındı! Profil sekmesinde en altta görebilirsin.");
            }
            // Sandık kontrolü (Kazı Kazan Aç)
            else if (res.type === "chest") {
              // Sandık animasyonu bitince modal açılsın
              setTimeout(() => {
                ModumApp.openScratchModal(res.reward);
              }, 500);
            } 
            // Hak Paketi ise sadece bilgilendir (Buton zaten yeşil oldu)
            else if (isUnlimited) {
              // Hak paketinde alert ile kullanıcıyı durdurmaya gerek yok, buton geri bildirimi yeterli.
              console.log("Hak paketi eklendi.");
            }
            else {
              alert("✅ " + res.message);
            }

            updateDataInBackground();
          } else {
            // Hata Durumu (Puan yetmezse veya stok biterse)
            alert("❌ " + (res.message || "Hata oluştu"));
            if(btn) {
              btn.innerHTML = originalText;
              btn.disabled = false;
              btn.style.opacity = "1";
            }
          }
        });
      },
      // --- 🔥 YENİ: ÇERÇEVE SATIN ALMA POP-UP'I ---
      openFramePurchaseModal: function (id, title, cost, frameClass) {
        // Eski modal varsa temizle
        var old = document.getElementById("mdm-buy-frame-modal");
        if (old) old.remove();

        // Kullanıcının puanı
        var myPuan = parseInt(APP_STATE.user.puan) || 0;
        var canAfford = myPuan >= cost;

        // Buton Durumu (Parası yetiyor mu?)
        var btnHtml = "";
        if (canAfford) {
          btnHtml = `<button onclick="ModumApp.buyItem('${id}', '${title}', ${cost}, '${frameClass}'); document.getElementById('mdm-buy-frame-modal').remove();" 
style="background:#10b981; color:white; border:none; padding:12px; width:100%; border-radius:12px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow:0 4px 15px rgba(16,185,129,0.3); display:flex; align-items:center; justify-content:center; gap:8px;">
SATIN AL (-${cost} XP) <i class="fas fa-check-circle"></i>
  </button>`;
        } else {
          btnHtml = `<button disabled style="background:#334155; color:#94a3b8; border:none; padding:12px; width:100%; border-radius:12px; font-weight:bold; cursor:not-allowed;">
YETERSİZ PUAN (Gereken: ${cost})
  </button>`;
        }

        var html = `
<div id="mdm-buy-frame-modal" class="mdm-modal active" style="display:flex; z-index:2147483647; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="width:90%; max-width:320px; text-align:center; padding:30px; border-radius:24px; background:#1e293b; border:1px solid #334155; position:relative; box-shadow:0 20px 50px rgba(0,0,0,0.5);">

<div onclick="document.getElementById('mdm-buy-frame-modal').remove()" style="position:absolute; top:15px; right:15px; color:#64748b; cursor:pointer; font-size:24px;">&times;</div>

<div style="font-size:10px; color:#fbbf24; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px;">KOZMETİK MAĞAZASI</div>

<div style="width:100px; height:100px; margin:0 auto 20px; position:relative; display:flex; align-items:center; justify-content:center;">
<div class="mdm-avatar-frame ${frameClass}" style="top:-5px; left:-5px; right:-5px; bottom:-5px; border-width:4px;"></div>
<div style="width:100%; height:100%; background:#0f172a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:40px;">👤</div>
  </div>

<h3 style="color:#fff; margin:0 0 5px 0; font-size:18px;">${title}</h3>
<p style="color:#94a3b8; font-size:12px; line-height:1.5; margin-bottom:20px;">
Bu özel çerçeve ile profilini özelleştir ve diğer üyelerden farklı görün!
  </p>

<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:20px; font-size:13px; color:#e2e8f0;">
Mevcut Puanın: <b style="color:#fff">${myPuan} XP</b>
  </div>

${btnHtml}

  </div>
  </div>`;

        var div = document.createElement("div");
        div.innerHTML = html;
        document.body.appendChild(div);
      },

      // 2. 🔥 KAZI KAZAN MODALI (RELOAD YOK - DONMA YOK)
      openScratchModal: function (rewardAmount) {
        var old = document.getElementById("mdm-scratch-modal");
        if (old) old.remove();

        var html = `
<div id="mdm-scratch-modal" class="mdm-scratch-overlay">
<h2 style="color:white; margin-bottom:20px; text-shadow:0 2px 10px rgba(0,0,0,0.5);">🎁 KAZIMAYA BAŞLA!</h2>

<div class="mdm-scratch-wrapper">
<div class="mdm-scratch-prize">
<div style="font-size:50px;">🏆</div>
<div class="mdm-prize-lbl">KAZANDINIZ</div>
<div class="mdm-prize-val">+${rewardAmount} XP</div>
  </div>

<canvas id="mdm-scratch-canvas" width="300" height="300"></canvas>
  </div>

<div id="mdm-scratch-hint" style="color:#fbbf24; margin-top:20px; font-size:14px; animation:pulse 1s infinite;">👆 Parmağınla veya mouse ile kazı!</div>

<!-- 🔥 DÜZELTME BURADA: location.reload() YERİNE ModumApp.finishScratch() GELDİ -->
<button id="mdm-claim-btn" onclick="ModumApp.finishScratch()" style="display:none; margin-top:20px; background:#10b981; color:white; border:none; padding:12px 40px; border-radius:30px; font-weight:bold; font-size:16px; cursor:pointer; box-shadow:0 5px 20px rgba(16,185,129,0.4);">
HARİKA! KAPAT
  </button>
  </div>`;

        var div = document.createElement("div");
        div.innerHTML = html;
        document.body.appendChild(div);

        // --- CANVAS AYARLARI ---
        var canvas = document.getElementById("mdm-scratch-canvas");
        var ctx = canvas.getContext("2d");
        var isDrawing = false;

        ctx.fillStyle = "#94a3b8"; // Gümüş Gri
        ctx.fillRect(0, 0, 300, 300);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("MODUMNET", 150, 140);
        ctx.font = "20px Arial";
        ctx.fillText("GÜMÜŞ SANDIK", 150, 170);

        function scratch(x, y) {
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.arc(x, y, 20, 0, Math.PI * 2);
          ctx.fill();
          checkProgress();
        }

        function getPos(e) {
          var rect = canvas.getBoundingClientRect();
          var touch = e.touches ? e.touches[0] : e;
          return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        }

        canvas.addEventListener("mousedown", function (e) {
          isDrawing = true;
          var p = getPos(e);
          scratch(p.x, p.y);
        });
        canvas.addEventListener("mousemove", function (e) {
          if (isDrawing) {
            var p = getPos(e);
            scratch(p.x, p.y);
          }
        });
        canvas.addEventListener("mouseup", function () {
          isDrawing = false;
        });

        canvas.addEventListener(
          "touchstart",
          function (e) {
            isDrawing = true;
            var p = getPos(e);
            scratch(p.x, p.y);
            e.preventDefault();
          },
          { passive: false }
        );
        canvas.addEventListener(
          "touchmove",
          function (e) {
            if (isDrawing) {
              var p = getPos(e);
              scratch(p.x, p.y);
              e.preventDefault();
            }
          },
          { passive: false }
        );
        canvas.addEventListener("touchend", function () {
          isDrawing = false;
        });

        var completed = false;
        function checkProgress() {
          if (completed) return;
          if (Math.random() > 0.1) return;

          var imageData = ctx.getImageData(0, 0, 300, 300);
          var pixels = imageData.data;
          var transparent = 0;
          for (var i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] < 128) transparent++;
          }
          var percent = (transparent / (pixels.length / 4)) * 100;

          if (percent > 40) {
            completed = true;
            canvas.style.transition = "opacity 0.5s";
            canvas.style.opacity = "0";
            document.getElementById("mdm-scratch-hint").style.display = "none";
            document.getElementById("mdm-claim-btn").style.display = "block";
          }
        }
      },
      // --- 🎫 KUPONLARIM SAYFASI (GELİŞMİŞ KOD YAKALAYICI v4) ---
      openMyCouponsModal: function () {
        ModumApp.logAction("Cüzdan", "Kuponlarına Baktı");
        var old = document.getElementById("mdm-coupons-modal");
        if (old) old.remove();

        var html = `
<div id="mdm-coupons-modal" class="mdm-modal" style="display:flex;">
<div class="mdm-modal-content" style="height:80vh; display:flex; flex-direction:column;">
<div class="mdm-modal-header">
<h3 style="margin:0; color:#fff;">🎫 Kupon Cüzdanım</h3>
<div class="mdm-modal-close" onclick="document.getElementById('mdm-coupons-modal').remove()">×</div>
  </div>
<div id="mdm-coupons-list" style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:10px;">
<div style="text-align:center; padding:40px; color:#94a3b8;">
<i class="fas fa-circle-notch fa-spin"></i> Kuponlar taranıyor...
  </div>
  </div>
  </div>
  </div>`;

        var div = document.createElement("div");
        div.innerHTML = html;
        document.body.appendChild(div);

        fetchApi("get_user_history", { email: APP_STATE.user.email }).then(
          (res) => {
            var listContainer = document.getElementById("mdm-coupons-list");

            if (res && res.success && res.list.length > 0) {
              var validCoupons = [];

              // Yasaklı kelimeler (Sandık vb.)
              var forbiddenWords = [
                "hak", "hakkı", "çekiliş", "cekilis", 
                "sandık", "sandik", "kutu", "chest", "box",
                "xp", "puan", "görev", "gorev", "frame", "çerçeve"
              ];

              res.list.forEach((item) => {
                var rawTitle = item.action || item.islem || "";
                var lowerTitle = rawTitle.toLowerCase();

                // 1. Sadece "Mağaza" işlemlerini al
                if (lowerTitle.includes("mağaza") || lowerTitle.includes("magaza")) {

                  // 2. Yasaklı kelime kontrolü
                  var isBanned = forbiddenWords.some(word => lowerTitle.includes(word));
                  if(isBanned) return;

                  // 🔥 KOD ÇÖZÜCÜ MOTORU (GELİŞMİŞ) 🔥

                  // A. Önce direkt veritabanı alanlarına bak
                  var finalCode = item.kupon_kodu || item.code || item.couponCode;

                  // B. Eğer kod yoksa veya geçersizse Başlık'tan avla
                  if (!finalCode || finalCode === "OTOMATIK" || finalCode === "BULUNAMADI" || finalCode === "-") {

                    // Yöntem 1: Parantez içi "(Kod: XYZ)"
                    var match1 = rawTitle.match(/\(Kod:\s*([^\)]+)\)/i);
                    if (match1 && match1[1]) {
                      finalCode = match1[1];
                    } 
                    // Yöntem 2: "Kod:" kelimesinden sonrası
                    else if (rawTitle.toLowerCase().includes("kod:")) {
                      var parts = rawTitle.split(/kod:/i);
                      if(parts[1]) finalCode = parts[1].trim().split(" ")[0].replace(")", "");
                    }
                    // Yöntem 3: Hiçbir şey bulamazsa "OTOMATIK" yaz ama kullanıcıya gösterme
                    else {
                      finalCode = "KOD ÜRETİLİYOR...";
                    }
                  }

                  // Temizle
                  finalCode = finalCode.trim().toUpperCase();

                  validCoupons.push({
                    title: rawTitle.replace("Mağaza: ", "").replace("Mağaza:", "").replace("(Alım)", "").trim(),
                    code: finalCode,
                    date: item.date,
                  });
                }
              });

              if (validCoupons.length > 0) {
                var listHtml = "";
                validCoupons.forEach((c) => {
                  var codeDisplay = c.code;
                  var btnStyle = "background:#f472b6;";
                  var copyBtn = "";

                  // Eğer kod "ÜRETİLİYOR" veya "OTOMATIK" ise butonu gizle, uyarı ver
                  if(codeDisplay.includes("ÜRETİLİYOR") || codeDisplay === "OTOMATIK" || codeDisplay === "BULUNAMADI") {
                    codeDisplay = `<span style="font-size:11px; color:#fbbf24;">⚠️ Kod İşleniyor...<br><small>Lütfen birazdan tekrar deneyin</small></span>`;
                  } else {
                    // Geçerli kod varsa kopyala butonu koy
                    copyBtn = `<button onclick="navigator.clipboard.writeText('${c.code}'); this.innerText='Kopyalandı!';" style="${btnStyle} color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold;">KOPYALA</button>`;
                  }

                  listHtml += `
<div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); padding:15px; border-radius:12px;">
<div style="color:#fff; font-weight:bold; font-size:14px;">${c.title}</div>
<div style="color:#64748b; font-size:10px; margin-bottom:5px;">${c.date} tarihinde alındı</div>

<div style="background:#1e293b; border:1px dashed #475569; padding:8px; border-radius:6px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
<span style="font-family:monospace; color:#f472b6; font-size:16px; letter-spacing:1px; font-weight:bold;">${codeDisplay}</span>
${copyBtn}
  </div>
  </div>`;
                });
                listContainer.innerHTML = listHtml;
              } else {
                listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;"><i class="fas fa-ticket-alt" style="font-size:32px; margin-bottom:10px; opacity:0.3;"></i><br>Kupon cüzdanınız boş.<br><small>Mağazadan yeni kuponlar alabilirsiniz.</small></div>';
              }
            } else {
              listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">Geçmiş bulunamadı.</div>';
            }
          }
        );
      },
      // --- 🎉 HOŞGELDİN KUTLAMASI ---
      checkWelcome: function (isNewUser, bonusAmount) {
        if (isNewUser) {
          // Konfeti Patlat
          var duration = 3000;
          var end = Date.now() + duration;
          (function frame() {
            confetti({
              particleCount: 5,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
            });
            confetti({
              particleCount: 5,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
            });
            if (Date.now() < end) requestAnimationFrame(frame);
          })();

          // Modal Göster
          var html = `
<div id="mdm-welcome-modal" class="mdm-modal active" style="z-index:999999;">
<div class="mdm-modal-content" style="text-align:center; background:linear-gradient(135deg, #4f46e5, #9333ea); border:2px solid #fff;">
<div style="font-size:60px; margin-bottom:10px;">👋</div>
<h2 style="color:#fff; text-shadow:0 2px 10px rgba(0,0,0,0.3);">ARAMIZA HOŞ GELDİN!</h2>
<p style="color:#e0e7ff; font-size:16px;">Seni gördüğümüze çok sevindik. İşte başlangıç hediyen:</p>
<div style="font-size:40px; font-weight:900; color:#fbbf24; text-shadow:0 0 20px #b45309; margin:20px 0;">+${bonusAmount} XP</div>
<button onclick="document.getElementById('mdm-welcome-modal').remove()" style="background:#fff; color:#4f46e5; padding:12px 40px; border-radius:30px; font-weight:bold; border:none; cursor:pointer; box-shadow:0 5px 20px rgba(0,0,0,0.3);">TEŞEKKÜRLER</button>
  </div>
  </div>`;
          document.body.insertAdjacentHTML("beforeend", html);
        }
      },
      // ======================================================
      // 🚀 ZİNCİRLEME KATILIM SİSTEMİ (Gizlilik -> Ortaklık -> Katıl)
      // ======================================================

      // 1. GİRİŞ NOKTASI (Butona basınca burası çalışır)
      joinRaffle: function (raffleId, raffleTitle) {
        // Misafir kontrolü
        if (!APP_STATE.user || !APP_STATE.user.email) {
          this.showGuestPopup("raffle");
          return;
        }

        // Başlık gelmediyse varsayılan yaz
        if (!raffleTitle || raffleTitle === "undefined")
          raffleTitle = "Çekiliş Fırsatı";

        // 🔥 KONTROL BURADA (Tek sefer ve temiz)
        if (APP_STATE.user.privacyApproved === true) {
          // ✅ ONAYLI: Direkt geç
          this.openBuddyModal(raffleId, raffleTitle);
        } else {
          // ❌ ONAYSIZ: Mavi kutuyu aç
          this.openPrivacyModal(raffleId, raffleTitle);
        }
      },

      // 2. GİZLİLİK SÖZLEŞMESİ PENCERESİ (Sadece 1 kez çıkar)
      openPrivacyModal: function (raffleId, raffleTitle) {
        var old = document.getElementById("mdm-privacy-modal");
        if (old) old.remove();

        var html = `
<div id="mdm-privacy-modal" class="mdm-modal active" style="z-index:9999999; display:flex; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="width:90%; max-width:400px; background:#1e293b; border:1px solid #334155; border-radius:16px; padding:25px; text-align:center;">

<div style="font-size:40px; margin-bottom:15px;">🛡️</div>
<h3 style="color:#fff; margin:0 0 10px 0;">Güvenlik Onayı</h3>
<p style="color:#cbd5e1; font-size:13px; line-height:1.5; margin-bottom:20px;">
Çekilişlere katılabilmek ve ödül kazanabilmek için <a href="https://modum.tr/gizlilik-sozlesmesi/" target="_blank" style="color:#3b82f6; font-weight:bold;">Gizlilik Sözleşmesi</a>'ni okuyup onaylamanız gerekmektedir.
<br><br>
<span style="color:#f59e0b; font-size:11px;">* Bu onayı sadece bir kez vermeniz yeterlidir.</span>
  </p>

<button onclick="ModumApp.approvePrivacy('${raffleId}', '${raffleTitle}')" class="mdm-btn-approve">
OKUDUM, ONAYLIYORUM ✅
  </button>

<div onclick="document.getElementById('mdm-privacy-modal').remove()" style="margin-top:15px; color:#64748b; cursor:pointer; font-size:12px;">Vazgeç</div>
  </div>
  </div>`;

        var d = document.createElement("div");
        d.innerHTML = html;
        document.body.appendChild(d);
      },

      // Gizliliği Onayla ve Devam Et
      approvePrivacy: function (raffleId, raffleTitle) {
        var btn = document.querySelector(".mdm-btn-approve");
        if (btn) {
          btn.innerText = "Kaydediliyor...";
          btn.disabled = true;
        }

        fetchApi("approve_privacy_policy", {
          email: APP_STATE.user.email,
        }).then((res) => {
          if (res && res.success) {
            // 🔥 TARAYICIYI GÜNCELLE (Sayfa yenilenmese bile hatırlar)
            APP_STATE.user.privacyApproved = true;
            localStorage.setItem(
              "mdm_user_cache",
              JSON.stringify(APP_STATE.user)
            );

            // Kutuyu kapat
            document.getElementById("mdm-privacy-modal").remove();

            // Sonraki adıma geç
            ModumApp.openBuddyModal(raffleId, raffleTitle);
          } else {
            alert("Hata oluştu.");
            if (btn) btn.disabled = false;
          }
        });
      },

      // 3. ŞANS ORTAĞI & PAYLAŞIM PENCERESİ (Her katılımda çıkar)
      openBuddyModal: function (raffleId, raffleTitle) {
        var old = document.getElementById("mdm-modal-buddy");
        if (old) old.remove();

        // Referans linkini al
        var refCode =
            APP_STATE.user.referansKodu || APP_STATE.user.uid || "MODUM";
        var refLink = SITE_URL + "?ref=" + refCode;

        // WhatsApp Mesajı
        var waText = encodeURIComponent(
          `Selam! ModumNet'te harika bir çekiliş var: "${raffleTitle}". Bu linkten üye olursan ikimiz de kazanırız! 🚀\n\nLink: ${refLink}`
        );
        var waLink = `https://wa.me/?text=${waText}`;

        var html = `
<div id="mdm-modal-buddy" class="mdm-modal active" style="z-index:9999999; display:flex; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="width:90%; max-width:450px; background:#1e293b; border:1px solid #334155; border-radius:16px; padding:0; overflow:hidden;">

<div style="background:linear-gradient(135deg, #1e293b, #0f172a); padding:20px; text-align:center; border-bottom:1px solid #334155;">
<h3 style="color:#fff; margin:0; font-size:18px;">Son Bir Adım! 🚀</h3>
<div style="font-size:12px; color:#94a3b8; margin-top:5px;">${raffleTitle}</div>
  </div>

<div style="padding:25px;">

<div style="background:rgba(255,255,255,0.03); border:1px dashed #3b82f6; border-radius:10px; padding:15px; margin-bottom:20px; text-align:center;">
<div style="color:#60a5fa; font-weight:bold; font-size:14px; margin-bottom:5px;">
🤝 Şansını Arkadaşlarınla Paylaş!
  </div>
<p style="font-size:11px; color:#cbd5e1; line-height:1.4; margin-bottom:15px;">
Aşağıdaki linki arkadaşlarına gönder. Onlar üye olduğunda hem sen <b>150 XP</b> kazan, hem de onlar kazandığında sana sürpriz ödüller gelsin!
  </p>

<a href="${waLink}" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:8px; background:#25D366; color:white; text-decoration:none; padding:10px; border-radius:8px; font-weight:bold; margin-bottom:10px; font-size:13px; box-shadow:0 4px 10px rgba(37, 211, 102, 0.3);">
<i class="fab fa-whatsapp" style="font-size:18px;"></i> WhatsApp ile Gönder
  </a>

<div style="display:flex; gap:5px;">
<input type="text" value="${refLink}" readonly style="flex:1; padding:8px; background:#0f172a; border:1px solid #334155; color:#94a3b8; border-radius:6px; font-size:11px;">
<button onclick="navigator.clipboard.writeText('${refLink}'); this.innerText='Kopyalandı!'" style="background:#334155; color:white; border:none; border-radius:6px; padding:0 15px; cursor:pointer; font-size:11px;">Kopyala</button>
  </div>
  </div>

<button onclick="ModumApp.confirmFinalJoin('${raffleId}')" class="mdm-btn-lucky" style="width:100%; justify-content:center; font-size:16px; padding:15px;">
PAYLAŞMADAN DEVAM ET & KATIL ✅
  </button>

<div onclick="document.getElementById('mdm-modal-buddy').remove()" style="text-align:center; margin-top:15px; color:#ef4444; cursor:pointer; font-size:12px; font-weight:bold;">İptal Et ve Çık</div>

  </div>
  </div>
  </div>`;

        var d = document.createElement("div");
        d.innerHTML = html;
        document.body.appendChild(d);
      },

      // 4. SON İŞLEM (Veritabanına kaydet)
      confirmFinalJoin: function (raffleId) {
        var btn = document.querySelector("#mdm-modal-buddy .mdm-btn-lucky");
        if (btn) {
          btn.innerHTML =
            '<i class="fas fa-circle-notch fa-spin"></i> İşleniyor...';
          btn.disabled = true;
        }

        // Backend'e SADECE katılım isteği atıyoruz
        fetchApi("join_raffle", {
          email: APP_STATE.user.email,
          raffleId: raffleId,
        }).then((d) => {
          document.getElementById("mdm-modal-buddy").remove();
          if (d) {
            alert(d.message);
            if (d.success) location.reload();
          }
        });
      },
      // 3. 🔥 YENİ: SAYFAYI YENİLEMEDEN KAPATAN FONKSİYON
      finishScratch: function () {
        // Modalı kaldır
        var m = document.getElementById("mdm-scratch-modal");
        if (m) m.remove();

        // Verileri arka planda güncelle (Sayfa yenilenmez!)
        if (typeof updateDataInBackground === "function") {
          updateDataInBackground();
        }

        // Puanların güncellendiğini göstermek için mağaza sekmesini yenile
        if (APP_STATE.activeTab === "store") {
          setTimeout(function () {
            renderStoreTab();
          }, 500);
        }
      },
      // --- DESTEK SİSTEMİ FONKSİYONLARI ---

      // 1. Değerlendirme Gönder (Görev Tamamlar)
      submitEvaluation: function () {
        var msg = document.getElementById("eval-message").value;
        if (!msg) return alert("Lütfen kısa bir yorum yazın.");

        if (!APP_STATE.user || !APP_STATE.user.email)
          return alert("Giriş yapmalısın.");

        fetchApi("submit_feedback", {
          email: APP_STATE.user.email,
          message: msg,
          type: "evaluation", // 🔥 Bu sayede görev tetiklenir
          taskId: "alisveris_guru_v1",
        }).then((res) => {
          alert(res.message);
          document.getElementById("eval-message").value = ""; // Temizle

          // Görevleri yenile ki yeşil tik olsun
          setTimeout(function () {
            if (typeof loadTasksData === "function") loadTasksData();
          }, 1000);
        });
      },

      // 2. Destek Talebi Gönder
      submitSupport: function () {
        var subj = document.getElementById("supp-subject").value;
        var msg = document.getElementById("supp-message").value;
        var phone = document.getElementById("supp-phone").value;

        if (!subj || !msg) return alert("Konu ve mesaj zorunludur.");
        if (!APP_STATE.user || !APP_STATE.user.email)
          return alert("Giriş yapmalısın.");

        fetchApi("submit_feedback", {
          email: APP_STATE.user.email,
          subject: subj,
          message: msg,
          phone: phone,
          type: "support", // Normal destek
        }).then((res) => {
          alert(res.message);
          // Formu temizle
          document.getElementById("supp-subject").value = "";
          document.getElementById("supp-message").value = "";

          // Listeyi yenile
          ModumApp.loadSupportHistory();
        });
      },

      // 3. Taleplerimi Yükle (Akıllı Bildirim - Hafızalı Sistem)
      loadSupportHistory: function (silentMode = false) {
        var container = document.getElementById("mdm-support-history");

        // Eğer sessiz mod değilse ve container yoksa çık
        if (!silentMode && !container) return;

        if (!APP_STATE.user || !APP_STATE.user.email) {
          if (container)
            container.innerHTML =
              '<div style="padding:20px; text-align:center; color:#64748b;">Giriş yapmalısın.</div>';
          return;
        }

        fetchApi("get_user_requests", { email: APP_STATE.user.email }).then(
          (res) => {
            if (res && res.success) {
              // --- 1. EN SON CEVAPLANAN TALEBİN ID'SİNİ BUL ---
              // Listeyi tara, cevaplanmış en yeni talebin ID'sini al
              var latestReplyId = "none";
              if (res.list && res.list.length > 0) {
                // Listede 'Cevaplandı' statüsünde veya admin cevabı olan ilk (en yeni) kaydı bul
                var answeredTicket = res.list.find(
                  (t) =>
                  t.status === "Cevaplandı" ||
                  t.status === "answered" ||
                  (t.adminReply && t.adminReply.length > 1)
                );
                if (answeredTicket) {
                  latestReplyId = answeredTicket.ticketId; // Örn: #TLP-1234
                }
              }

              // --- 2. KIRMIZI NOKTA YÖNETİMİ ---
              var navItems = document.querySelectorAll(".mdm-nav-item");
              navItems.forEach((el) => {
                if (el.innerText.includes("Destek")) {
                  var dot = el.querySelector(".notification-dot");

                  if (silentMode) {
                    // --- SESSİZ MOD (ARKA PLAN) ---
                    // Tarayıcı hafızasındaki son okunan ID'yi al
                    var lastReadId = localStorage.getItem(
                      "mdm_last_read_ticket"
                    );

                    // Eğer bildirim varsa VE (daha önce okumamışsak VEYA yeni bir ID geldiyse)
                    if (res.hasNotification && latestReplyId !== lastReadId) {
                      // Nokta yoksa koy
                      if (!dot) {
                        el.style.position = "relative";
                        var posStyle =
                            window.innerWidth < 768
                        ? "top:5px; right:15px;"
                        : "top:-2px; right:-5px;";
                        el.innerHTML += `<div class="notification-dot" style="position:absolute; ${posStyle} width:10px; height:10px; background:#ef4444; border:2px solid #1e293b; border-radius:50%; box-shadow:0 0 5px #ef4444; z-index:10;"></div>`;
                      }
                    }
                  } else {
                    // --- NORMAL MOD (SEKME AÇIK) ---
                    // Kullanıcı şu an listeyi görüyor, noktayı sil
                    if (dot) dot.remove();

                    // 🔥 ŞU ANKİ EN YENİ CEVABI "OKUNDU" OLARAK HAFIZAYA KAYDET
                    // Böylece 10 saniye sonraki kontrolde nokta geri gelmeyecek
                    if (latestReplyId !== "none") {
                      localStorage.setItem(
                        "mdm_last_read_ticket",
                        latestReplyId
                      );
                    }
                  }
                }
              });

              // --- 3. LİSTELEME (Sadece Sekme Açıksa Yap) ---
              if (!silentMode && container && res.list.length > 0) {
                var html = "";
                res.list.forEach((t) => {
                  var statusColor =
                      t.status === "Cevaplandı" ? "#10b981" : "#fbbf24";
                  var replyHtml = "";
                  if (t.adminReply) {
                    replyHtml = `
<div style="margin-top:10px; background:rgba(16, 185, 129, 0.1); border-left:3px solid #10b981; padding:8px; font-size:11px; color:#e2e8f0;">
<div style="font-weight:bold; color:#10b981; margin-bottom:2px;">Yetkili Cevabı:</div>
${t.adminReply}
  </div>`;
                  }

                  html += `
<div style="background:#1e293b; border:1px solid #334155; padding:12px; border-radius:8px; margin-bottom:10px;">
<div style="display:flex; justify-content:space-between; margin-bottom:5px;">
<span style="font-weight:bold; color:#fff; font-size:13px;">${t.subject}</span>
<span style="font-size:10px; color:${statusColor}; border:1px solid ${statusColor}; padding:2px 6px; border-radius:4px;">${t.status}</span>
  </div>
<div style="font-size:12px; color:#94a3b8; line-height:1.4;">${t.message}</div>
<div style="font-size:9px; color:#64748b; margin-top:5px; text-align:right;">${t.date} | ${t.ticketId}</div>
${replyHtml}
  </div>`;
                });
                container.innerHTML = html;
              } else if (!silentMode && container) {
                container.innerHTML =
                  '<div style="padding:20px; text-align:center; color:#64748b;">Henüz destek talebiniz yok.</div>';
              }
            }
          }
        );
      },
      // --- GÖREV FONKSİYONLARI ---

      // 1. Görev Sekmesini Aç ve Yükle
      openTasksTab: function (el) {
        this.switchTab("tasks", el);
        loadTasksData(); // Görevleri çek

        // 🔥 SERİ ÇUBUKLARINI YENİDEN ÇİZ
        // Sekme görünür olduğu an çizim yapılırsa ekrana yansır.
        var streakContainer = document.getElementById("mdm-streak-container");
        if (streakContainer && APP_STATE.user) {
          streakContainer.innerHTML = renderStreakBars(
            APP_STATE.user.gunlukSeri || 0
          );
        }
      },
      // --- 1. ADIM: ANINDA YÖNLENDİRME (KEEPALIVE TEKNOLOJİSİ) ---
      goAndComplete: function (taskId, link) {
        // Hedef linki belirle
        var targetLink =
            link && link.length > 2 && link !== "#" ? link : "/tum-urunler";

        // Giriş yapmışsa arkaya sinyal fırlat
        if (APP_STATE.user && APP_STATE.user.email) {
          // 🔥 SİHİRLİ KOD: keepalive
          // Bu sayede sayfa değişse bile istek iptal olmaz, sunucuya ulaşır.
          fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              islem: "complete_task_step",
              email: APP_STATE.user.email,
              taskId: taskId,
              step: 1,
            }),
            keepalive: true, // <--- İŞTE ÇÖZÜM BU!
          }).catch((e) => console.log("Hata (Önemsiz):", e));
        }

        // HİÇ BEKLEMEDEN DİREKT GİT
        window.location.href = targetLink;
      },

      // ======================================================
      // DÜZELTME 1: YASAKLI SAYFA KONTROLÜ (GARANTİ YÖNTEM)
      // ======================================================
      isPageRestricted: function () {
        var fullUrl = window.location.href.toLowerCase();

        // Bu kelimeler URL'de geçiyorsa kutu ASLA çıkmaz
        var forbidden = [
          "cekilisler",
          "kullanici-giris",
          "kullanici-kayit",
          "sepet", // sepet, sepetim, alisveris-sepetim hepsini yakalar
          "odeme",
          "uye-girisi", // Faprika alternatif giriş linkleri
          "uye-kayit",
        ];

        for (var i = 0; i < forbidden.length; i++) {
          if (fullUrl.indexOf(forbidden[i]) > -1) return true;
        }
        return false;
      },

      // ======================================================
      // DÜZELTME 2: KUTUYU ZORLA BAŞLATMA
      // ======================================================
      initSurpriseSystem: function () {
        // 1. Yasaklı sayfadaysak dur
        if (this.isPageRestricted()) {
          return;
        }

        // 2. Günlük limit kontrolü (localStorage sıfırlama mantığı)
        var todayStr = new Date().toLocaleDateString("tr-TR");
        var savedDay = localStorage.getItem("mdm_egg_day");

        // Gün değiştiyse sayacı sıfırla
        if (savedDay !== todayStr) {
          localStorage.setItem("mdm_egg_day", todayStr);
          localStorage.setItem("mdm_egg_count", 0);
        }

        var collectedCount =
            parseInt(localStorage.getItem("mdm_egg_count")) || 0;
        if (collectedCount >= 5) {
          return;
        }

        // 3. Kutuyu Göster (3 saniye gecikmeli)
        setTimeout(() => {
          this.showEgg();
        }, 3000);
      },

      // 4. Kutuyu Ekrana Bas (STYLES JS İÇİNDE - EMOJİ VERSİYON)
      showEgg: function () {
        if (this.isPageRestricted()) return;
        var collectedCount =
            parseInt(localStorage.getItem("mdm_egg_count")) || 0;
        if (collectedCount >= 5) return;

        // Varsa sil, yenisini yap
        var old = document.getElementById("mdm-surprise-egg");
        if (old) old.remove();

        var btn = document.createElement("div");
        btn.id = "mdm-surprise-egg";
        btn.onclick = function () {
          ModumApp.clickEgg(this);
        };

        // --- 🔥 GÖRÜNÜM AYARLARI (GÖZDEN KAÇMASI İMKANSIZ) ---
        btn.innerHTML = "🎁"; // Resim değil, EMOJİ!

        Object.assign(btn.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "fixed",
          top: "70%",
          right: "-100px", // Başlangıçta gizli
          width: "70px",
          height: "70px",
          fontSize: "40px", // Emojinin boyutu
          backgroundColor: "#ef4444", // KIPKIRMIZI ARKAPLAN
          border: "3px solid #fcd34d", // SARI ÇERÇEVE
          borderRadius: "50%",
          boxShadow: "0 0 20px rgba(255, 0, 0, 0.5)",
          zIndex: "2147483647", // En üst katman
          cursor: "pointer",
          transition: "right 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)", // Yaylanma efekti
        });

        // Tooltip (Konuşma Balonu)
        var tip = document.createElement("div");
        tip.innerText = "Beni Yakala!";
        Object.assign(tip.style, {
          position: "absolute",
          bottom: "-25px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "white",
          color: "black",
          padding: "2px 8px",
          borderRadius: "10px",
          fontSize: "10px",
          fontWeight: "bold",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        });
        btn.appendChild(tip);

        document.body.appendChild(btn);

        // Ekrana Kaydır
        setTimeout(() => {
          btn.style.right = "20px";
        }, 100);

        // 45 Saniye sonra kaybol
        setTimeout(() => {
          if (btn && btn.style.right === "20px") {
            btn.style.right = "-100px";
            setTimeout(() => {
              btn.remove();
            }, 500);
            this.scheduleNextEgg();
          }
        }, 45000);
      },

      // ----------------------------------------------------------------
      // 🔥 DÜZELTME 1: KULLANICIYI DAHA İYİ TANIYAN FONKSİYON
      // ----------------------------------------------------------------
      detectUserInstant: function () {
        // 1. Cache Kontrolü
        var cached = JSON.parse(localStorage.getItem("mdm_user_cache"));
        if (cached && cached.email) return cached;

        // 2. Faprika Input Kontrolü (Genel)
        var inputs = [
          'input[name="Email"]',
          "#Email",
          "#MemberEmail",
          ".member-email",
        ];
        for (var i = 0; i < inputs.length; i++) {
          var el = document.querySelector(inputs[i]);
          if (el && el.value && el.value.includes("@")) {
            return { email: el.value, name: "Üye" }; // Bulduk!
          }
        }

        // 3. Link Kontrolü (Hesabım linki varsa giriş yapılmıştır)
        // Faprika'da genelde giriş yapınca "Hesabım" linki görünür
        var accountLink = document.querySelector('a[href*="/hesabim"]');
        if (accountLink) {
          // Ama e-postayı bulmamız lazım. Hesabım sayfasında değilsek e-postayı göremeyebiliriz.
          // Bu durumda Backend'e "Giriş Var ama Mail Yok" diyemeyiz.
          // Eğer sayfada mail yoksa mecburen misafir muamelesi yapmak zorundayız
          // VEYA daha önce cache'e attıysak onu kullanırız.
        }

        return null;
      },

      // --- KUTUYA TIKLAMA (ORİJİNAL MİSAFİR MANTIĞI) ---
      clickEgg: async function (el) {
        // Kilit kontrolü (Çift tıklamayı önle)
        if (el.dataset.processing === "true") return;
        el.dataset.processing = "true";

        // 1. Efekt: Kutuyu hemen gizle
        el.style.right = "-100px";
        setTimeout(() => {
          el.remove();
        }, 500);

        // 2. KİMLİK KONTROLÜ (Hızlıca bak)
        if (!APP_STATE.user || !APP_STATE.user.email) {
          // Cache'e son bir bakış atalım
          var cached = JSON.parse(localStorage.getItem("mdm_user_cache"));
          if (cached && cached.email) {
            APP_STATE.user = cached;
          } else {
            // Son şans: Sayfada gizli e-posta var mı? (Dedektifi çağır)
            // (this.detectUser DEĞİL, direkt detectUser())
            var freshUser = await detectUser();
            if (freshUser && freshUser.email) {
              APP_STATE.user = freshUser;
            }
          }
        }

        // 3. KARAR ANI: KİMLİK HALA YOKSA -> MİSAFİR POP-UP'I AÇ!
        if (!APP_STATE.user || !APP_STATE.user.email) {
          // 🔥 İŞTE BURASI: Seni bozan yer burasıydı.
          // Artık hata vermiyoruz, direkt misafir kutusunu açıyoruz.
          this.showGuestPopup();

          // Bir sonraki kutuyu planla
          ModumApp.scheduleNextEgg();
          return;
        }

        fetchApi("collect_hidden_egg", { email: APP_STATE.user.email }).then(
          (res) => {
            if (res && res.success) {
              var earned = res.earned || 20; // Kazanılan puan
              var newTotal = res.newTotal; // Yeni Toplam Puan (Backend'den gelirse)

              // Puanı güncelle
              if (newTotal) {
                APP_STATE.user.puan = parseInt(newTotal);
              } else {
                // Backend göndermezse biz ekleyelim
                APP_STATE.user.puan =
                  (parseInt(APP_STATE.user.puan) || 0) + parseInt(earned);
              }

              // 1. Üst Barı Anında Güncelle
              var navXP = document.getElementById("nav-live-xp");
              if (navXP)
                navXP.innerText = APP_STATE.user.puan.toLocaleString() + " XP";

              var navNameXP = document.getElementById("nav-user-name");
              if (navNameXP) navNameXP.innerText = APP_STATE.user.puan + " XP";

              // 2. Hafızayı Güncelle (Sayfa yenilenirse gitmesin)
              localStorage.setItem(
                "mdm_user_cache",
                JSON.stringify(APP_STATE.user)
              );

              // 3. Ödül Pop-up'ını Göster
              ModumApp.showMemberPopup(earned);

              // C. Arka planı güncelle
              setTimeout(function () {
                if (typeof loadTasksData === "function") loadTasksData();
                try {
                  updateDataInBackground(document.getElementById(TARGET_ID));
                } catch (e) {}
              }, 2000);
            } else {
              alert("⚠️ " + (res.message || "Hata oluştu."));
            }
          }
        );
      },

      scheduleNextEgg: function () {
        // 1 dakika sonra yeni kutu
        setTimeout(() => {
          this.showEgg();
        }, 60000);
      },

      // POPUP: ÜYE (Turuncu)
      showMemberPopup: function (xp) {
        var old = document.getElementById("mdm-reward-popup");
        if (old) old.remove();
        var html = `
<div class="mdm-popup-overlay" id="mdm-reward-popup" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2147483647; align-items:center; justify-content:center;">
<div style="background:#fff; width:90%; max-width:350px; padding:30px; border-radius:20px; text-align:center; position:relative; box-shadow:0 0 50px rgba(255,215,0,0.5);">
<div style="font-size:60px; margin-bottom:10px;">🎁</div>
<div style="color:#d97706; font-size:20px; font-weight:900; margin-bottom:10px;">GİZLİ HAZİNEYİ BULDUN!</div>
<div style="color:#4b5563; font-size:13px; margin-bottom:20px;">Tebrikler! +${xp} XP hesabına eklendi.</div>
<button onclick="document.getElementById('mdm-reward-popup').remove()" style="background:linear-gradient(to bottom, #fbbf24, #f59e0b); color:white; border:none; padding:12px 30px; border-radius:50px; font-weight:bold; cursor:pointer; width:100%;">HARİKA! DEVAM ET</button>
  </div>
  </div>`;
        var div = document.createElement("div");
        div.innerHTML = html;
        document.body.appendChild(div);
      },

      // AKILLI MİSAFİR POP-UP'I (DURUMA GÖRE DEĞİŞİR)
      showGuestPopup: function (type) {
        var old = document.getElementById("mdm-guest-popup");
        if (old) old.remove();

        // Varsayılan Metinler (Yumurta İçin)
        let title = "YAKALADIN!";
        let desc = "Bu kutuda <b>20 XP</b> var ama almak için üye olmalısın.";
        let icon = "🥚";
        let btnText = "GİRİŞ YAP VE AL";

        // Duruma Göre Değiştir
        if (type === "daily") {
          title = "GÜNLÜK HEDİYE!";
          desc = "Her gün <b>1 Hak + Puan</b> kazanmak için giriş yapmalısın.";
          icon = "📅";
          btnText = "GİRİŞ YAP";
        } else if (type === "raffle") {
          title = "ÇEKİLİŞE KATIL";
          desc = "Bu fırsatı kaçırma! Çekilişe katılmak için giriş yapmalısın.";
          icon = "🎟️";
          btnText = "GİRİŞ YAP VE KATIL";
        } else if (type === "notify") {
          title = "HABERDAR OL";
          desc = "Fırsatları ilk sen duymak istiyorsan giriş yapmalısın.";
          icon = "🔔";
          btnText = "GİRİŞ YAP";
        }

        var html = `
<div class="mdm-popup-overlay" id="mdm-guest-popup" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2147483647; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
<div style="background:#fff; width:90%; max-width:350px; padding:30px; border-radius:20px; text-align:center; position:relative; box-shadow:0 10px 40px rgba(0,0,0,0.5);">
<div onclick="document.getElementById('mdm-guest-popup').remove()" style="position:absolute; top:10px; right:15px; font-size:24px; cursor:pointer; color:#999;">&times;</div>
<div style="font-size:60px; margin-bottom:10px;">${icon}</div>
<div style="color:#1e293b; font-size:20px; font-weight:900; margin-bottom:10px;">${title}</div>
<div style="color:#64748b; font-size:13px; margin-bottom:20px; line-height:1.5;">${desc}</div>
<button onclick="window.location.href='/kullanici-giris'" style="background:#2563eb; color:white; border:none; padding:12px 30px; border-radius:50px; font-weight:bold; cursor:pointer; width:100%; transition:0.2s;">${btnText}</button>
  </div>
  </div>`;

        var div = document.createElement("div");
        div.innerHTML = html;
        document.body.appendChild(div);
      },

      // GÜNLÜK YOKLAMA (ANLIK GÖRSEL GÜNCELLEMELİ)
      dailyCheckIn: function () {
        if (!APP_STATE.user || !APP_STATE.user.email) {
          this.showGuestPopup("daily");
          return;
        }

        var btn = document.querySelector(".mdm-btn-lucky");
        if (btn) {
          btn.innerHTML =
            '<i class="fas fa-circle-notch fa-spin"></i> İşleniyor...';
          btn.disabled = true;
        }

        fetchApi("daily_check_in", { email: APP_STATE.user.email }).then(
          (res) => {
            if (res && res.success) {
              // --- 🔥 BURASI YENİ: GÖRSEL HİLE BAŞLANGICI ---
              // Backend bize yeni puanı gönderdi, hemen ekrana basıyoruz.
              if (res.newPoints) {
                APP_STATE.user.puan = parseInt(res.newPoints);

                // 1. Üst Barı Güncelle
                var navXP = document.getElementById("nav-live-xp");
                if (navXP)
                  navXP.innerText =
                    APP_STATE.user.puan.toLocaleString() + " XP";

                var navNameXP = document.getElementById("nav-user-name");
                if (navNameXP)
                  navNameXP.innerText = APP_STATE.user.puan + " XP";

                // 2. 🔥 PROFİL KARTINI ANINDA YENİLE (İşte Eksik Olan Bu!)
                var profileContainer = document.getElementById(
                  "mdm-profile-container"
                );
                if (profileContainer) {
                  profileContainer.innerHTML = renderProfileTab(APP_STATE.user);
                }

                // 3. Hafızayı Güncelle
                localStorage.setItem(
                  "mdm_user_cache",
                  JSON.stringify(APP_STATE.user)
                );
              }
              // 1. BUTONU KİLİTLE
              var trDate = new Date(new Date().getTime() + 3 * 60 * 60 * 1000);
              var todayStr = trDate.toISOString().split("T")[0];
              APP_STATE.user.songunlukhaktarihi = todayStr;

              if (btn) {
                btn.style.background = "#475569";
                btn.style.cursor = "default";
                btn.innerHTML =
                  '<i class="fas fa-check"></i> Bugün Alındı (Yarın Gel)';
                btn.onclick = null;
              }

              // 2. PUANLARI GÜNCELLE
              if (res.newPoints) {
                APP_STATE.user.puan = parseInt(res.newPoints);
                var navXP = document.getElementById("nav-user-name");
                var mainXP = document.getElementById("canli-puan-kutusu");
                if (navXP) navXP.innerText = APP_STATE.user.puan + " XP";
                if (mainXP) mainXP.innerText = APP_STATE.user.puan + " XP";
              }

              // 3. 🔥 SERİYİ GÜNCELLE VE ÇUBUKLARI BOYA (Kritik Nokta)
              if (res.newStreak) {
                APP_STATE.user.gunlukSeri = parseInt(res.newStreak);
                var streakContainer = document.getElementById(
                  "mdm-streak-container"
                );
                if (streakContainer) {
                  streakContainer.innerHTML = renderStreakBars(
                    APP_STATE.user.gunlukSeri
                  );
                }
              }

              // Hafızayı kaydet
              localStorage.setItem(
                "mdm_user_cache",
                JSON.stringify(APP_STATE.user)
              );

              if (typeof loadTasksData === "function") {
                setTimeout(function () {
                  loadTasksData();
                }, 1000);
              }

              alert("🎉 " + res.message);
            } else {
              alert("⚠️ " + (res ? res.message : "Hata oluştu."));
              if (btn) {
                btn.innerHTML =
                  '<i class="fas fa-sun"></i> Bugünkü Şansını Kap! (+1 Hak)';
                btn.disabled = false;
              }
            }
          }
        );
      },
      // 3. Görev Başlatıcı
      startTask: function (id, type, link) {
        if (!APP_STATE.user.email) return alert("Giriş yapın.");

        if (type === "secret_code") {
          // Şifre Görevi
          var code = prompt(
            "🔑 Günün Şifresini Giriniz (Instagram Hikayemize Bak!):"
          );
          if (code) {
            fetchApi("redeem_promo_code", {
              email: APP_STATE.user.email,
              code: code,
            }).then((res) => {
              alert(res.success ? "✅ " + res.message : "❌ " + res.message);
              if (res.success)
                updateDataInBackground(document.getElementById(TARGET_ID));
            });
          }
        } else if (type === "golden_product") {
          // Altın Ürün Görevi (Geliştirilecek)
          alert(
            "🕵️ Bu özellik yakında aktif! Sitedeki gizli ürünü bulup kodunu buraya yazacaksın."
          );
        } else {
          // Link Görevi (Instagram Takip vb.)
          window.open(link || "https://instagram.com/modumnet", "_blank");

          // Basit Onay Mekanizması
          setTimeout(() => {
            if (confirm("Görevi tamamladın mı?")) {
              fetchApi("complete_task", {
                email: APP_STATE.user.email,
                taskId: id,
              }).then((res) => {
                if (res.success) {
                  alert("✅ " + res.message);
                  updateDataInBackground(document.getElementById(TARGET_ID));
                } else {
                  alert("⚠️ " + res.message);
                }
              });
            }
          }, 2000);
        }
      },
      // --- Link Görevini Onaylatma (Instagram vb.) ---
      completeStepLink: function (taskId, stepNum) {
        if (!confirm("Bu adımı gerçekten tamamladın mı? Kontrol edilecektir."))
          return;

        // "Yaptım" dediği an backend'e sinyal gönder
        fetchApi("complete_task_step", {
          email: APP_STATE.user.email,
          taskId: taskId,
          step: stepNum,
          type: "link_visit", // Manuel onay
        }).then((res) => {
          if (res.success) {
            alert("✅ " + res.message);
            // Listeyi yenile ki yeşil tik olsun
            loadTasksData();
            updateDataInBackground(
              document.getElementById("modum-firebase-test-root")
            );
          } else {
            alert("⚠️ " + res.message);
          }
        });
      },

      // 4. Bildirim Açma
      subscribeNotification: function () {
        if (!APP_STATE.user || !APP_STATE.user.email) {
          this.showGuestPopup("notify"); // BURAYA 'notify' YAZDIK
          return;
        }
        fetchApi("subscribe_notification", {
          email: APP_STATE.user.email,
        }).then((res) => {
          alert(
            res.success
            ? "✅ Bildirimler açıldı! Fırsatları kaçırmayacaksın."
            : res.message
          );
        });
      },
      // Kartı Aç/Kapa (Kilitlenme Önleyici Mod)
      toggleTask: function (id) {
        // 1. Tıklama Olayını İzole Et (Faprika'nın duymasını engelle)
        if (window.event) {
          window.event.stopPropagation();
          window.event.preventDefault();
        }

        var body = document.getElementById("task-body-" + id);
        var card = document.getElementById("task-card-" + id);
        var btn = document.querySelector(
          "#task-card-" + id + " .mdm-btn-toggle"
        );

        if (body.style.display === "none") {
          // AÇILIYOR
          body.style.display = "block";
          btn.innerText = "Gizle";
          btn.style.background = "#475569"; // Gri yap

          // 🔥 2. DONMA FİX: Sayfayı hafifçe kaydırarak tarayıcıyı uyandır
          setTimeout(function () {
            // Kartın hizasına kaydır
            if (card)
              card.scrollIntoView({ behavior: "smooth", block: "center" });

            // Eğer body kilitlendiyse ZORLA AÇ (Screenshot'taki hatayı bu çözer)
            document.body.style.overflow = "visible";
            document.body.style.position = "static";
            document.body.style.width = "auto";
            document.body.style.height = "auto";
          }, 300);
        } else {
          // KAPANIYOR
          body.style.display = "none";

          // Orijinal metni geri yükle
          var originalText =
              btn.getAttribute("data-original-text") || "İlerleme";
          btn.innerText = originalText;

          if (originalText.includes("Tamamlandı")) {
            btn.style.background = "#10b981";
          } else {
            btn.style.background = "#3b82f6";
          }
        }
      },

      // 12. Şifre Gönder (Adım Bazlı Güncellendi)
      submitTaskCode: function (taskId, stepNum) {
        // HTML'de input'a verdiğimiz ID'yi oluşturuyoruz: "input-GorevID-s1"
        var inputId = "input-" + taskId + "-s" + stepNum;
        var inputElement = document.getElementById(inputId);

        if (!inputElement) return alert("Hata: Input kutusu bulunamadı.");

        var code = inputElement.value;

        if (!code) return alert("Lütfen şifreyi yazın.");

        // Backend'e soralım
        fetchApi("redeem_promo_code", {
          email: APP_STATE.user.email,
          code: code,
        }).then((res) => {
          if (res.success) {
            // --- 🔥 GÖRSEL HİLE BAŞLANGICI ---
            // 1. Yeni Puanı Hesapla (Backend göndermezse 100 ekle)
            var currentPuan = parseInt(APP_STATE.user.puan) || 0;
            var bonus = 100; // Şifre ödülü genelde 100'dür

            if (res.newTotal) {
              APP_STATE.user.puan = parseInt(res.newTotal);
            } else {
              APP_STATE.user.puan = currentPuan + bonus;
            }

            // 2. Üst Barı Güncelle
            var navXP = document.getElementById("nav-live-xp");
            if (navXP)
              navXP.innerText = APP_STATE.user.puan.toLocaleString() + " XP";

            var navNameXP = document.getElementById("nav-user-name");
            if (navNameXP) navNameXP.innerText = APP_STATE.user.puan + " XP";

            // 3. 🔥 PROFİLİ DE YENİLE (İşte 265'i 285 yapan satır bu!)
            var profileContainer = document.getElementById(
              "mdm-profile-container"
            );
            if (profileContainer) {
              profileContainer.innerHTML = renderProfileTab(APP_STATE.user);
            }

            // 4. Hafızayı Güncelle
            localStorage.setItem(
              "mdm_user_cache",
              JSON.stringify(APP_STATE.user)
            );
            // -----------------------------------

            alert("✅ " + res.message);

            // Listeyi yenile ki yeşil tik olsun
            loadTasksData();
          } else {
            alert("❌ " + res.message);
            btn.innerText = oldText;
            btn.disabled = false;
          }
        });
      },

      // 3. Modal Kapatma (Ortak)
      closeModal: function (id) {
        var m = document.getElementById(id);
        if (m) m.classList.remove("active");

        // 🔥 EKLE: Pencere kapanınca sayacı sustur
        if (globalRaffleTimer) {
          clearInterval(globalRaffleTimer);
          globalRaffleTimer = null;
        }
      },

      // 4. Bilet Cüzdanı (Görsel Revize)
      openTicketModal: function () {
        ModumApp.logAction("Cüzdan", "Biletlerine Baktı");
        document.getElementById("mdm-ticket-modal").classList.add("active");
        var container = document.getElementById("mdm-ticket-list");
        container.innerHTML =
          '<div class="mdm-loading" style="text-align:center;color:#fff;">Biletler Basılıyor...</div>';

        fetchApi("get_user_tickets", { email: APP_STATE.user.email }).then(
          (data) => {
            if (data && data.success && data.list.length > 0) {
              var html = "";

              data.list.forEach((t) => {
                // t.tickets içindeki tüm biletleri tek tek basabiliriz veya gruplayabiliriz.
                // "Görsel Bilet" hissi için her bir bileti ayrı göstermek daha havalı olur ama çok yer kaplar.
                // Screenshot'taki gibi "Grup" gösterip, sağ tarafa "x29 HAK" yazalım.

                var firstCode = t.tickets[0].code;
                var rafName = t.raffleName;
                var count = t.totalTickets;

                html += `
<div class="mdm-real-ticket">
<div class="mdm-rt-left">
<div style="font-size:10px; color:#94a3b8; margin-bottom:5px;">MODUMNET ÇEKİLİŞİ</div>
<div style="font-size:14px; font-weight:bold; color:#fff; line-height:1.3;">${rafName}</div>
<div style="font-size:10px; color:#fbbf24; margin-top:8px;">📅 Çekiliş Tarihi Bekleniyor</div>
  </div>
<div class="mdm-rt-right">
<div style="font-size:24px; font-weight:900; color:#78350f;">x${count}</div>
<div style="font-size:10px; color:#78350f; font-weight:bold; text-align:center;">BİLET</div>
<div style="margin-top:auto; font-size:9px; font-family:monospace; transform:rotate(-90deg); white-space:nowrap; width:10px;">${firstCode}...</div>
  </div>
  </div>`;
              });
              container.innerHTML = html;
            } else {
              container.innerHTML =
                '<div style="text-align:center; padding:30px; color:#94a3b8;">Henüz biletiniz yok.</div>';
            }
          }
        );
      },

      // 5. Puan Geçmişi
      openHistoryModal: function () {
        ModumApp.logAction("Profil", "Geçmişine Baktı");
        document.getElementById("mdm-history-modal").classList.add("active");
        var listContainer = document.getElementById("mdm-history-list");
        listContainer.innerHTML =
          '<div class="mdm-loading" style="padding:40px; text-align:center; color:#94a3b8;"><i class="fas fa-circle-notch fa-spin"></i> Yükleniyor...</div>';

        fetchApi("get_user_history", { email: APP_STATE.user.email }).then(
          (res) => {
            if (res && res.success && res.list.length > 0) {
              var html = "";
              res.list.forEach((item) => {
                var color = item.amount > 0 ? "#10b981" : "#ef4444";
                var sign = item.amount > 0 ? "+" : "";
                var amountHtml =
                    item.amount !== 0
                ? `<span style="color:${color}; font-weight:bold;">${sign}${item.amount} XP</span>`
                : "";
                var rightsHtml =
                    item.rights !== 0
                ? `<span style="color:#f59e0b; font-size:11px; margin-left:5px;">${
                item.rights > 0 ? "+" : ""
                }${item.rights} HAK</span>`
                : "";

                html += `<div class="mdm-list-item" style="padding:12px; border-bottom:1px solid #334155; display:flex; justify-content:space-between;"><div><div style="color:#fff;">${item.action}</div><div style="font-size:10px; color:#64748b;">${item.date}</div></div><div style="text-align:right;">${amountHtml}<br>${rightsHtml}</div></div>`;
              });
              listContainer.innerHTML = `<div style="max-height:400px; overflow-y:auto;">${html}</div>`;
            } else {
              listContainer.innerHTML =
                '<div style="text-align:center; padding:30px; color:#94a3b8;">Geçmiş yok.</div>';
            }
          }
        );
      },

      // 6. Ekibim (GELİŞMİŞ GÖRÜNÜM: PRİM DETAYLI)
      openTeamModal: function () {
        ModumApp.logAction("Ekip", "Referanslarına Baktı");
        document.getElementById("mdm-team-modal").classList.add("active");
        var listContainer = document.getElementById("mdm-team-list");
        listContainer.innerHTML =
          '<div class="mdm-loading" style="text-align:center; padding:30px; color:#94a3b8;"><i class="fas fa-circle-notch fa-spin"></i> Ekip Verileri Alınıyor...</div>';

        fetchApi("get_my_team", { email: APP_STATE.user.email }).then((res) => {
          if (res && res.success && res.list.length > 0) {
            var html = "";

            // Standart Kayıt Ödülü (Ayarlardan farklıysa burayı güncelle)
            var baseReward = 150;

            res.list.forEach((m) => {
              // Matematik: Toplam puandan kayıt ödülünü çıkar, kalanı sipariş primidir.
              var total = m.earned || 0;
              var commission = total - baseReward;
              if (commission < 0) commission = 0; // Negatif çıkmasın
              var signUpBonus = total - commission; // Genelde 150

              // İsim Maskeleme
              var emailShow = m.email; // Zaten maskeli geliyor backendden

              html += `
<li class="mdm-list-item" style="flex-direction:column; align-items:stretch; gap:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); margin-bottom:8px; border-radius:10px;">

<!-- Üst Kısım: İsim ve Tarih -->
<div style="display:flex; justify-content:space-between; align-items:center;">
<div style="font-weight:600; color:#fff; display:flex; align-items:center; gap:8px;">
<div style="width:28px; height:28px; background:linear-gradient(135deg, #4f46e5, #4338ca); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px;">👤</div>
${emailShow}
  </div>
<div style="font-size:10px; color:#64748b;">${m.date}</div>
  </div>

<!-- Alt Kısım: Kazanç Detayları -->
<div style="display:flex; gap:8px; margin-top:5px;">
<!-- Kayıt Bonusu -->
<div style="flex:1; background:rgba(16, 185, 129, 0.1); border:1px solid rgba(16, 185, 129, 0.2); padding:6px; border-radius:6px; text-align:center;">
<div style="font-size:9px; color:#6ee7b7; text-transform:uppercase; font-weight:bold;">Kayıt</div>
<div style="font-size:13px; font-weight:800; color:#fff;">+${signUpBonus} XP</div>
  </div>

<!-- Sipariş Primi -->
<div style="flex:1; background:rgba(245, 158, 11, 0.1); border:1px solid rgba(245, 158, 11, 0.2); padding:6px; border-radius:6px; text-align:center;">
<div style="font-size:9px; color:#fcd34d; text-transform:uppercase; font-weight:bold;">Sipariş (%5)</div>
<div style="font-size:13px; font-weight:800; color:#fff;">+${commission} XP</div>
  </div>
  </div>

  </li>`;
            });
            listContainer.innerHTML = `<div style="max-height:400px; overflow-y:auto; padding-right:5px;">${html}</div>`;
          } else {
            listContainer.innerHTML =
              '<div style="text-align:center; padding:40px; color:#64748b;"><i class="fas fa-users" style="font-size:32px; margin-bottom:10px; opacity:0.5;"></i><br>Henüz ekibinde kimse yok.<br><small>Linkini paylaşarak kazanmaya başla!</small></div>';
          }
        });
      },

      // 7. Gelişmiş Detay Modalı (Kazanma Şansı & Filtreleme FIX)
      openDetailModal: function (
      id,
       title,
       img,
       reward,
       endDate,
       participantCount
      ) {
        ModumApp.logAction("Çekiliş İnceledi", title);

        // Eski sayacı temizle
        if (globalRaffleTimer) clearInterval(globalRaffleTimer);

        // Modalı Aç
        document.getElementById("mdm-detail-modal").classList.add("active");
        document.getElementById("mdm-detail-title").innerText = title;
        var body = document.getElementById("mdm-detail-body");

        // --- TARİH DÜZELTME ---
        var safeDateStr = endDate.replace(" ", "T");
        if (safeDateStr.length <= 10) safeDateStr += "T23:59:00";
        var targetTime = new Date(safeDateStr).getTime();

        // Toplam Katılımcı (Sayıya çevir)
        var totalP = parseInt(participantCount) || 0;

        // HTML İskeleti (Kazanma Şansı Kutusu Eklendi)
        var html = `
<div class="mdm-modal-split-layout">
<!-- SOL TARAF -->
<div class="mdm-modal-left">
<img src="${img}" class="mdm-detail-img">
<div class="mdm-detail-title">${title}</div>
<div class="mdm-detail-reward">🏆 Ödül: ${reward}</div>

<div class="mdm-detail-stats">
<div class="mdm-stat-box">
<div class="mdm-stat-val">${totalP}</div>
<div class="mdm-stat-lbl">Katılımcı</div>
  </div>

<!-- 🔥 YENİ: KAZANMA ŞANSI KUTUSU -->
<div class="mdm-stat-box" id="mdm-chance-box">
<div class="mdm-stat-val" style="color:#fbbf24;">Hesaplanıyor...</div>
<div class="mdm-stat-lbl">Şansın</div>
  </div>

<div class="mdm-stat-box">
<div class="mdm-stat-val" id="mdm-detail-timer">-</div>
<div class="mdm-stat-lbl">Kalan Süre</div>
  </div>
  </div>

<div style="display:flex; gap:10px; margin-top:15px;">
<button class="mdm-btn-v2 btn-join-v2" style="flex:2; height:45px; font-size:14px;" onclick="ModumApp.joinRaffle('${id}', '${title}')">
HEMEN KATIL <i class="fas fa-ticket-alt"></i>
  </button>
<button class="btn-share-link" style="flex:1; margin-top:0; border:1px solid rgba(255,255,255,0.2);" onclick="ModumApp.shareRaffle('${title}')">
<i class="fas fa-share-alt"></i> Paylaş
  </button>
  </div>
  </div>

<!-- SAĞ TARAF: LİSTE -->
<div class="mdm-modal-right">
<div class="mdm-detail-tabs">
<div class="mdm-dt-tab active">👥 Son Katılanlar</div>
  </div>
<div id="mdm-detail-list" class="mdm-participant-list">
<div style="text-align:center; padding:50px; color:#64748b;">
<i class="fas fa-circle-notch fa-spin" style="font-size:24px; margin-bottom:10px;"></i><br>
Veriler Analiz Ediliyor...
  </div>
  </div>
  </div>
  </div>`;

        body.innerHTML = html;

        // --- SAYAÇ BAŞLAT ---
        globalRaffleTimer = setInterval(function () {
          var now = new Date().getTime();
          var dist = targetTime - now;
          var timerDiv = document.getElementById("mdm-detail-timer");

          if (!timerDiv) {
            clearInterval(globalRaffleTimer);
            return;
          }

          if (dist < 0) {
            timerDiv.innerText = "SONA ERDİ";
            timerDiv.style.color = "#ef4444";
            clearInterval(globalRaffleTimer);
          } else {
            var d = Math.floor(dist / (1000 * 60 * 60 * 24));
            var h = Math.floor(
              (dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            var m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
            timerDiv.innerHTML = `<span style="color:#fbbf24">${d}g</span> ${h}s ${m}d`;
          }
        }, 1000);

        // --- LİSTEYİ VE ŞANSI ÇEK ---
        fetchApi("get_participants", { searchQuery: "" }).then((res) => {
          var listDiv = document.getElementById("mdm-detail-list");
          if (!listDiv) return;

          if (res && res.success && res.list) {
            // 🔥 FİLTRELEME: Sadece bu çekilişin adını içerenleri al
            var filtered = res.list.filter((p) => p.raffleName === title);

            // Eğer tam eşleşme bulamazsa "içerir" mantığıyla ara
            if (filtered.length === 0) {
              filtered = res.list.filter((p) =>
                                         p.raffleName.includes(title.substring(0, 10))
                                        );
            }

            // Kendi bilet sayını bul
            if (APP_STATE.user && APP_STATE.user.email) {
              var myCount = filtered.filter(
                (p) => p.email === APP_STATE.user.email
              ).length;

              // Şans Hesapla
              var chanceText = "Düşük";
              var chanceColor = "#94a3b8"; // Gri

              if (myCount > 0) {
                var ratio = (myCount / Math.max(totalP, 1)) * 100;
                if (ratio > 5) {
                  chanceText = "YÜKSEK 🔥";
                  chanceColor = "#10b981";
                } else if (ratio > 1) {
                  chanceText = "ORTA ⚖️";
                  chanceColor = "#fbbf24";
                } else {
                  chanceText = "NORMAL 🤞";
                  chanceColor = "#60a5fa";
                }
              } else {
                chanceText = "Biletin Yok";
              }

              var chanceBox = document.getElementById("mdm-chance-box");
              if (chanceBox) {
                chanceBox.innerHTML = `<div class="mdm-stat-val" style="color:${chanceColor}; font-size:12px;">${chanceText}</div><div class="mdm-stat-lbl">(${myCount} Bilet)</div>`;
              }
            }

            // Listeyi Ekrana Bas (Sadece ilk 20 kişi)
            var listHtml = "";
            filtered.slice(0, 20).forEach((p) => {
              listHtml += `
<div class="mdm-part-item">
<div class="mdm-part-user">
<div class="mdm-part-icon">👤</div>
<div class="mdm-part-info">
<div class="mdm-part-name">${p.name}</div>
<div class="mdm-part-ticket">${p.ticketId}</div>
  </div>
  </div>
<div class="mdm-part-time">${p.date}</div>
  </div>`;
            });

            listDiv.innerHTML =
              listHtml ||
              '<div style="padding:20px; text-align:center;">Henüz katılım yok.</div>';
          } else {
            listDiv.innerHTML =
              '<div style="padding:20px; text-align:center;">Veri alınamadı.</div>';
          }
        });
      },

      // 8. Kazananlar Modalı
      openWinnersModal: function (raffleName) {
        document.getElementById("mdm-winners-modal").classList.add("active");
        document.getElementById("mdm-winners-list").innerHTML = "Yükleniyor...";
        fetchApi("get_winners").then((data) => {
          if (data && data.success) {
            var filtered = data.winners.filter(
              (w) => w.raffleName === raffleName
            );
            var html = filtered.length
            ? filtered
            .map(
              (w, i) =>
              `<div style="padding:10px; border-bottom:1px solid #333;">${
              i + 1
              }. ${w.userName} <span style="color:#fbbf24;">(${
              w.prize
              })</span></div>`
            )
            .join("")
            : '<div style="padding:20px; text-align:center;">Henüz açıklanmadı.</div>';
            document.getElementById("mdm-winners-list").innerHTML = html;
          }
        });
      },

      // 🔥 GÜNCELLENMİŞ REFERANS MODALI
      openAffiliateModal: function () {
        // 1. Giriş Kontrolü
        if (!APP_STATE.user || !APP_STATE.user.email) {
          alert(
            "Referans linkinizi görmek için lütfen giriş yapın veya kayıt olun."
          );
          return;
        }

        // 2. Kod Kontrolü (Hata Önleyici)
        var userCode = APP_STATE.user.referansKodu;

        // Eğer kod henüz gelmediyse (internet yavaşsa), kullanıcıyı uyar
        if (!userCode || userCode === "undefined") {
          alert(
            "Referans kodunuz oluşturuluyor, lütfen sayfayı yenileyip tekrar deneyin."
          );
          return;
        }

        var link = SITE_URL + "?ref=" + userCode;
        // Eğer ana domainde çalışıyorsa direkt: window.location.origin + "?ref=" + userCode;

        // Eski modal varsa temizle
        var eskiModal = document.getElementById("mdm-affiliate-modal");
        if (eskiModal) eskiModal.remove();

        // 3. HTML Oluştur
        var modalHTML = `
<div id="mdm-affiliate-modal" class="mdm-modal" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:2147483647; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="width:90%; max-width:450px; background:#fff; color:#333; border-radius:16px; padding:20px; position:relative; box-shadow:0 20px 50px rgba(0,0,0,0.5);">

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
<h3 style="margin:0; color:#d97706; font-size:18px; display:flex; align-items:center; gap:8px;">
<i class="fas fa-handshake"></i> Ortaklık Bağlantın
  </h3>
<div onclick="document.getElementById('mdm-affiliate-modal').remove()" style="font-size:28px; color:#666; cursor:pointer; line-height:0.5;">&times;</div>
  </div>

<div style="background:#fff7ed; border:2px dashed #f97316; padding:15px; border-radius:12px; text-align:center; margin-bottom:20px;">
<div style="font-size:13px; color:#ea580c; margin-bottom:10px; font-weight:bold;">
Bu linki arkadaşlarına gönder:
  </div>

<div style="display:flex; gap:5px; margin-bottom:15px;">
<input type="text" id="affiliate-link-input" value="${link}" readonly style="width:100%; padding:12px; border:1px solid #fdba74; border-radius:8px; background:#fff; color:#333; font-size:13px; font-family:monospace;">
<button onclick="var copyText=document.getElementById('affiliate-link-input');copyText.select();document.execCommand('copy');this.innerText='Kopyalandı!';" style="background:#f97316; color:white; border:none; padding:0 20px; border-radius:8px; cursor:pointer; font-weight:bold; transition:0.2s;">Kopyala</button>
  </div>

<div style="display:flex; gap:10px;">
<button onclick="window.open('https://api.whatsapp.com/send?text=${encodeURIComponent(
  "Sana harika bir hediye linki bıraktım! Üye ol, kazan: " + link
)}', '_blank')" style="flex:1; background:#25D366; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; font-weight:bold;">
<i class="fab fa-whatsapp"></i> WhatsApp
  </button>
<button onclick="window.open('https://t.me/share/url?url=${encodeURIComponent(
  link
)}&text=${encodeURIComponent(
  "ModumNet fırsatlarına katıl!"
)}', '_blank')" style="flex:1; background:#0088cc; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; font-weight:bold;">
<i class="fab fa-telegram"></i> Telegram
  </button>
  </div>
  </div>

<div style="background:#f8fafc; padding:15px; border-radius:12px; border:1px solid #e2e8f0;">
<div style="font-size:12px; color:#64748b; margin-bottom:5px; text-align:center;">Kazanç Tablosu</div>
<div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:10px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:5px;">
<span>👤 Arkadaşın Üye Olunca</span>
<span style="color:#16a34a; font-weight:bold;">+150 XP</span>
  </div>
<div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
<span>🛒 Arkadaşın Alışveriş Yapınca</span>
<span style="color:#d97706; font-weight:bold; background:#fff7ed; padding:2px 8px; border-radius:4px;">%5 PRİM</span>
  </div>
  </div>
  </div>
  </div>
`;

        var div = document.createElement("div");
        div.innerHTML = modalHTML;
        document.body.appendChild(div);
      },

      // 10. Link Kopyala
      copyAffiliateLink: function () {
        var input = document.getElementById("affiliate-link-input");
        if (input) {
          input.select();
          document.execCommand("copy");
          alert("✅ Bağlantı kopyalandı!");
        }
      },

      // 11. WhatsApp Paylaş
      shareWhatsapp: function () {
        var link = APP_STATE.affiliateLink || window.location.href;
        var text =
            "ModumNet'e bu linkten üye ol, harika ödüller kazan! Link: " + link;
        window.open(
          "https://api.whatsapp.com/send?text=" + encodeURIComponent(text),
          "_blank"
        );
      },

      // 12. Telegram Paylaş
      shareTelegram: function () {
        var link = APP_STATE.affiliateLink || window.location.href;
        var text = "ModumNet'e katıl, kazan!";
        window.open(
          "https://t.me/share/url?url=" +
          encodeURIComponent(link) +
          "&text=" +
          encodeURIComponent(text),
          "_blank"
        );
      },
      // 14. 🔥 AKILLI LOGLAMA (SİSTEM LOGLARINA VERİ GÖNDERİR)
      logAction: function (actionName, actionDetails) {
        // Sadece üye giriş yapmışsa log tut (Gereksiz veri dolmasın)
        if (APP_STATE.user && APP_STATE.user.email) {
          fetchApi("log_frontend_action", {
            email: APP_STATE.user.email,
            action: actionName,
            details: actionDetails,
          });
        }
      },

      // 13. Genel Paylaşım (Çekiliş Kartı İçin)
      shareRaffle: function (title) {
        if (navigator.share) {
          navigator
            .share({
            title: "ModumNet",
            text: title,
            url: window.location.href,
          })
            .catch(console.error);
        } else {
          alert("Linki kopyaladım: " + window.location.href);
        }
      },
      // --- 🔥 ROZET DETAY PENCERESİ ---
      openBadgeDetail: function (badgeId) {
        var b = BADGES_DB[badgeId];
        var userBadges =
            APP_STATE.user && APP_STATE.user.badges ? APP_STATE.user.badges : [];
        var hasIt = userBadges.includes(badgeId) || badgeId === "lvl_caylak";

        var old = document.getElementById("mdm-badge-modal");
        if (old) old.remove();

        // Buton Durumu
        var btnHtml = "";
        if (hasIt) {
          btnHtml = `
<div style="display:flex; flex-direction:column; gap:10px; width:100%;">
<button onclick="ModumApp.setProfileBadge('${badgeId}')" style="background:#10b981; color:white; border:none; padding:12px; width:100%; border-radius:10px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow:0 4px 15px rgba(16,185,129,0.3);">
Profil Resmi Yap
  </button>
<button onclick="ModumApp.generateStoryImage('${badgeId}')" style="background:linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color:white; border:none; padding:12px; width:100%; border-radius:10px; font-weight:bold; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; gap:8px;">
<i class="fab fa-instagram"></i> Story Olarak Paylaş (+50 XP)
  </button>
  </div>`;
        } else {
          // ... (Kilitli butonu aynen kalıyor) ...
          btnHtml = `<button disabled style="background:#334155; color:#94a3b8; border:none; padding:12px; width:100%; border-radius:10px; font-weight:bold; cursor:not-allowed;">🔒 Henüz Kazanılmadı</button>`;
        }

        var html = `
<div id="mdm-badge-modal" class="mdm-modal" style="display:flex; z-index:100001; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="width:90%; max-width:320px; text-align:center; padding:30px; border-radius:24px; background:#1e293b; border:1px solid #334155; position:relative;">
<div onclick="document.getElementById('mdm-badge-modal').remove()" style="position:absolute; top:15px; right:15px; color:#64748b; cursor:pointer; font-size:24px;">&times;</div>
<div style="font-size:60px; margin-bottom:15px; filter:drop-shadow(0 0 20px rgba(255,255,255,0.2)); ${
        hasIt ? "" : "filter:grayscale(100%); opacity:0.5;"
        }">
${b.i}
  </div>
<h3 style="color:#fff; margin:0 0 10px 0; font-size:20px;">${b.t}</h3>
<p style="color:#94a3b8; font-size:13px; line-height:1.5; margin-bottom:25px;">${
        b.d
        }</p>
${btnHtml}
  </div>
  </div>`;

        var div = document.createElement("div");
        div.innerHTML = html;
        document.body.appendChild(div);
      },

      // --- 🔥 ROZETİ PROFİL RESMİ OLARAK AYARLA ---
      setProfileBadge: function (badgeId) {
        if (!APP_STATE.user || !APP_STATE.user.email) return;

        var btn = document.querySelector("#mdm-badge-modal button");
        if (btn) {
          btn.innerText = "İşleniyor...";
          btn.disabled = true;
        }

        fetchApi("set_avatar_badge", {
          email: APP_STATE.user.email,
          badgeId: badgeId,
        }).then((res) => {
          if (res && res.success) {
            document.getElementById("mdm-badge-modal").remove();
            APP_STATE.user.selectedAvatar = badgeId;
            localStorage.setItem(
              "mdm_user_cache",
              JSON.stringify(APP_STATE.user)
            );
            var profileContainer = document.getElementById(
              "mdm-profile-container"
            );
            if (profileContainer)
              profileContainer.innerHTML = renderProfileTab(APP_STATE.user);
            updateDataInBackground();
            alert("✅ Profil resmin güncellendi!");
          } else {
            alert("Hata: " + res.message);
            if (btn) {
              btn.innerText = "Profil Resmi Yap";
              btn.disabled = false;
            }
          }
        });
      },
      // --- 🎨 TEMA SEÇİCİ PENCERE ---
      openThemeSelector: function () {
        var old = document.getElementById("mdm-theme-modal");
        if (old) old.remove();

        var gridHtml = "";
        Object.keys(PROFILE_THEMES).forEach((key) => {
          var t = PROFILE_THEMES[key];
          var isSelected =
              APP_STATE.user.profileTheme === key ||
              (!APP_STATE.user.profileTheme && key === "default");
          var border = isSelected
          ? "2px solid #fff"
          : "1px solid rgba(255,255,255,0.1)";

          gridHtml += `
<div onclick="ModumApp.setTheme('${key}')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:5px;">
<div style="width:50px; height:50px; border-radius:50%; background:${
          t.bg
        }; border:${border}; box-shadow:0 0 10px ${t.glow};">
${
          isSelected
            ? '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><i class="fas fa-check" style="color:white;text-shadow:0 0 5px black;"></i></div>'
          : ""
        }
  </div>
<div style="font-size:10px; color:#cbd5e1;">${t.name}</div>
  </div>`;
        });

        var html = `
<div id="mdm-theme-modal" class="mdm-modal" style="display:flex; z-index:100002; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="width:90%; max-width:350px; background:#0f172a; padding:25px; border-radius:20px; border:1px solid #334155; text-align:center;">
<div style="display:flex; justify-content:space-between; margin-bottom:20px;">
<h3 style="color:white; margin:0; font-size:16px;">Profil Temanı Seç</h3>
<div onclick="document.getElementById('mdm-theme-modal').remove()" style="cursor:pointer; color:#94a3b8; font-size:20px;">&times;</div>
  </div>
<div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:15px;">
${gridHtml}
  </div>
  </div>
  </div>`;

        var div = document.createElement("div");
        div.innerHTML = html;
        document.body.appendChild(div);
      },

      // --- TEMAYI KAYDET (DÜZELTİLMİŞ) ---
      setTheme: function (themeId) {
        if (!APP_STATE.user || !APP_STATE.user.email) return;

        // 1. Global Durumu Güncelle
        APP_STATE.user.profileTheme = themeId;

        // 2. 🔥 KRİTİK DÜZELTME: Önce Hafızayı Güncelle (Eşitle)
        // Böylece renderProfileTab fonksiyonu eski veriyi okumaz.
        localStorage.setItem("mdm_user_cache", JSON.stringify(APP_STATE.user));

        // 3. Profili Yeniden Çiz (Anında Görünüm)
        var profileContainer = document.getElementById("mdm-profile-container");
        if (profileContainer) {
          // Doğrudan APP_STATE'i gönderiyoruz, cache'den okumasın diye
          profileContainer.innerHTML = renderProfileTab(APP_STATE.user); 
        }

        document.getElementById("mdm-theme-modal").remove();

        // 4. Arka Planda Sunucuya Kaydet
        fetchApi("set_profile_theme", {
          email: APP_STATE.user.email,
          themeId: themeId,
        }).then((res) => {
          console.log("Tema sunucuya kaydedildi.");
        });
      },
      // --- 📸 PREMIUM STORY OLUŞTURUCU (HAVALI TASARIM v3) ---
      generateStoryImage: function (badgeId) {
        if (typeof html2canvas === "undefined")
          return alert("Sistem hazırlanıyor, 3 saniye sonra tekrar dene.");

        // Yükleniyor Mesajı
        var btnText = event && event.target ? event.target : null;
        var originalBtnContent = "";
        if (btnText) {
          originalBtnContent = btnText.innerHTML;
          btnText.innerHTML =
            '<i class="fas fa-circle-notch fa-spin"></i> Hazırlanıyor...';
          btnText.disabled = true;
        }

        var b = BADGES_DB[badgeId];
        var name = (APP_STATE.user.name || "MİSAFİR").toUpperCase();

        // 1. Kartı Oluştur (PREMIUM TASARIM - 1080x1920)
        var cardHtml = `
<div id="mdm-share-card" style="position:fixed; top:0; left:0; width:1080px; height:1920px; background:#020617; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; text-align:center; z-index:-5; pointer-events:none;">

<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:radial-gradient(circle at 50% 40%, #1e293b 0%, #000000 80%); z-index:-2;"></div>

<div style="font-size:1200px; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) rotate(-10deg); opacity:0.04; color:white; filter:blur(2px); z-index:-1;">
${b.i}
  </div>

<div style="z-index:10; display:flex; flex-direction:column; align-items:center; transform:scale(1.3);">

<div style="font-size:40px; color:#94a3b8; font-weight:800; letter-spacing:15px; margin-bottom:80px; text-shadow:0 0 20px rgba(0,0,0,1);">MODUMNET</div>

<div style="font-size:350px; filter:drop-shadow(0 0 80px rgba(139,92,246,0.5)); margin-bottom:60px; transform:scale(1.1); animation:none;">
${b.i}
  </div>

<div style="font-size:45px; color:#fff; background:rgba(255,255,255,0.08); padding:20px 80px; border-radius:100px; border:2px solid rgba(255,255,255,0.15); font-weight:700; box-shadow:0 20px 40px rgba(0,0,0,0.5); white-space:nowrap;">
${name}
  </div>

<div style="font-size:80px; font-weight:900; color:#fbbf24; text-transform:uppercase; margin-top:50px; text-shadow:0 5px 0 #b45309, 0 0 50px rgba(251, 191, 36, 0.5); letter-spacing:2px; line-height:1.1;">
${b.t}
  </div>

<div style="font-size:30px; color:#cbd5e1; margin-top:30px; letter-spacing:5px; font-weight:300; text-transform:uppercase;">ROZETİNİ KAZANDI! 🏆</div>
  </div>

<div style="position:absolute; bottom:120px; font-size:35px; color:#64748b; font-weight:bold; letter-spacing:4px; opacity:0.6;">WWW.MODUM.TR</div>
  </div>`;

        document.body.insertAdjacentHTML("beforeend", cardHtml);
        var element = document.getElementById("mdm-share-card");

        // 2. Fotoğrafı Çek
        setTimeout(() => {
          html2canvas(element, {
            scale: 1,
            backgroundColor: "#020617",
            useCORS: true,
            allowTaint: true,
          })
            .then((canvas) => {
            // İndir
            var link = document.createElement("a");
            link.download = "ModumNet-Odul.jpg";
            link.href = canvas.toDataURL("image/jpeg", 0.95);
            link.click();

            // Temizlik
            element.remove();
            if (btnText) {
              btnText.innerHTML = originalBtnContent;
              btnText.disabled = false;
            }

            // Ödül Puanını İşle
            fetchApi("share_story_reward", {
              email: APP_STATE.user.email,
            }).then((res) => {
              if (res && res.success) updateDataInBackground();
            });

            // Yönlendirme Pop-up'ı
            var guideHtml = `
<div id="mdm-share-guide" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999999; display:flex; align-items:center; justify-content:center; padding:20px;">
<div style="background:#1e293b; border:1px solid #334155; border-radius:20px; padding:30px; text-align:center; max-width:350px; position:relative; box-shadow:0 0 50px rgba(0,0,0,0.8);">
<div onclick="document.getElementById('mdm-share-guide').remove()" style="position:absolute; top:15px; right:15px; color:#94a3b8; font-size:24px; cursor:pointer;">&times;</div>

<div style="font-size:60px; margin-bottom:15px; filter:drop-shadow(0 0 10px rgba(255,255,255,0.2));">📸</div>
<h3 style="color:#fff; margin:0 0 10px 0; font-size:20px;">Görsel Hazır!</h3>
<p style="color:#cbd5e1; font-size:14px; line-height:1.5; margin-bottom:25px;">
Özel tasarım kartın <b>galerine kaydedildi.</b><br>Şimdi Instagram'ı açıp havalı bir story atabilirsin!
  </p>

<button onclick="window.location.href='instagram://story-camera'; setTimeout(()=>{ document.getElementById('mdm-share-guide').remove(); }, 1000);" 
style="background:linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color:white; border:none; padding:15px 30px; border-radius:50px; font-weight:bold; cursor:pointer; width:100%; font-size:14px; box-shadow:0 5px 20px rgba(220, 39, 67, 0.4);">
Instagram'ı Aç 🚀
  </button>
  </div>
  </div>`;
            var gd = document.createElement("div");
            gd.innerHTML = guideHtml;
            document.body.appendChild(gd);
          })
            .catch((e) => {
            element.remove();
            if (btnText) {
              btnText.innerHTML = originalBtnContent;
              btnText.disabled = false;
            }
            alert("Hata oluştu, lütfen tekrar dene.");
          });
        }, 1000); // 1 saniye bekle (Fontlar ve stiller tam otursun)
      },
      // --- YENİ: ROZET PAYLAŞIM KONTROLÜ ---
      initShareProcess: function () {
        var userBadges =
            APP_STATE.user && APP_STATE.user.badges ? APP_STATE.user.badges : [];

        if (userBadges.length === 0) {
          alert(
            "⚠️ Henüz kazanılmış bir rozetin yok. Görevleri tamamlayarak rozet kazan, sonra paylaş!"
          );
          return;
        }

        if (userBadges.length === 1) {
          // Tek rozet varsa direkt onu oluştur
          ModumApp.generateStoryImage(userBadges[0]);
        } else {
          // Birden fazla rozet varsa seçim menüsünü aç
          ModumApp.openBadgeSelectorModal(userBadges);
        }
      },

      // --- GÜNCELLENMİŞ ROZET SEÇİM PENCERESİ ---
      openBadgeSelectorModal: function (badgeList) {
        var old = document.getElementById("mdm-badge-select");
        if (old) old.remove();

        var itemsHtml = badgeList
        .map((key) => {
          var b = BADGES_DB[key];
          if (!b) return "";
          return `
<div onclick="ModumApp.generateStoryImage('${key}'); document.getElementById('mdm-badge-select').remove();" 
style="display:flex; align-items:center; gap:15px; background:linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); cursor:pointer; margin-bottom:10px; transition:0.2s;">
<div style="font-size:28px; filter:drop-shadow(0 0 5px rgba(255,255,255,0.3));">${b.i}</div>
<div style="font-weight:700; color:#fff; font-size:14px;">${b.t}</div>
<div style="margin-left:auto; background:#10b981; color:#fff; font-size:10px; padding:4px 10px; border-radius:20px; font-weight:bold;">PAYLAŞ</div>
  </div>`;
        })
        .join("");

        var html = `
<div id="mdm-badge-select" class="mdm-modal active" style="z-index:999999; display:flex; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="width:90%; max-width:350px; background:#1e293b; padding:25px; border-radius:20px; border:1px solid #334155; box-shadow:0 20px 50px rgba(0,0,0,0.5);">
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
<h3 style="color:#fff; margin:0; font-size:16px;">Hangi Başarını Paylaşacaksın?</h3>
<div onclick="document.getElementById('mdm-badge-select').remove()" style="color:#94a3b8; cursor:pointer; font-size:20px;">&times;</div>
  </div>
<div style="max-height:350px; overflow-y:auto; padding-right:5px;">${itemsHtml}</div>
  </div>
  </div>`;

        var d = document.createElement("div");
        d.innerHTML = html;
        document.body.appendChild(d);
      },
      // ... (Üstteki kodlar: switchTab, joinRaffle vs.) ...

      // MEVCUT EN SON FONKSİYONUN (Muhtemelen bu):
      openBadgeSelectorModal: function (badgeList) {
        var old = document.getElementById("mdm-badge-select");
        if (old) old.remove();
        // ... (kodların devamı) ...
        var d = document.createElement("div");
        d.innerHTML = html;
        document.body.appendChild(d);
      }, // <--- DİKKAT: BURAYA MUTLAKA VİRGÜL KOY! (Eğer yoksa)

      // 👇👇👇 YENİ KODLARI BURADAN İTİBAREN YAPIŞTIR 👇👇👇

      // --- ❓ YARDIM SİSTEMİ (İSKELET) ---
      helpData: [
        {
          id: 1,
          title: "🚀 ModumNet Çekiliş Dünyası",
          content: `
<div style="width:100%; height:200px; overflow:hidden; border-radius:12px; border:1px solid #334155; position:relative; margin-bottom:20px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
<img src="https://www.modum.tr/i/m/001/0016133.jpeg" style="width:100%; height:100%; object-fit:cover; object-position:center;">
<div style="position:absolute; bottom:0; left:0; width:100%; background:linear-gradient(to top, #0f172a, transparent); height:80px;"></div>
  </div>

<div style="font-size:15px; color:#e2e8f0; line-height:1.6; margin-bottom:20px;">
Hoş geldin! <b>ModumNet</b> sadece bir alışveriş sitesi değil, aynı zamanda kazanabileceğin dev bir eğlence platformudur. Burada attığın her adım sana puan ve ödül olarak geri döner.
  </div>

<div style="text-align:center; margin-bottom:25px; background:rgba(255,255,255,0.05); padding:10px; border-radius:10px;">
<img src="https://www.modum.tr/i/m/001/0016134.png" style="max-width:100%; height:auto; border-radius:6px;">
<div style="font-size:12px; color:#94a3b8; margin-top:5px;">🎟️ Çekilişlere katılmak ve kazanmak tamamen ücretsizdir!</div>
  </div>

<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">

<div style="background:rgba(30, 41, 59, 0.8); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); text-align:center;">
<div style="font-size:32px; color:#4ade80; margin-bottom:10px;">
<i class="fas fa-check-circle"></i> </div>
<h4 style="margin:0 0 5px 0; color:#fff; font-size:14px;">✅Görevleri Yap</h4>
<div style="font-size:11px; color:#cbd5e1;">Basit görevleri tamamla, anında XP Puan kazan.</div>
  </div>

<div style="background:rgba(30, 41, 59, 0.8); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); text-align:center;">
<div style="font-size:32px; color:#facc15; margin-bottom:10px;">
<i class="fas fa-crown"></i> </div>
<h4 style="margin:0 0 5px 0; color:#fff; font-size:14px;">👑Rütbeni Yükselt</h4>
<div style="font-size:11px; color:#cbd5e1;">Puan topla, Çaylak'tan Efsane'ye yüksel!</div>
  </div>

  </div>
`,
        },
        {
          id: 2,
          title: "🎟️ Çekilişlere Katılım (Tamamen Ücretsiz!)",
          content: `
<div style="font-size:15px; color:#e2e8f0; margin-bottom:20px;">
ModumNet'te çekilişlere katılmak için <b>hiçbir ücret ödemezsin.</b> Kargo parası, katılım ücreti veya gizli bir şart yoktur. Sadece tek bir tıklama ile şansını deneyebilirsin!
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:20px; margin-bottom:20px; display:flex; align-items:center; gap:20px; border:1px solid rgba(255,255,255,0.1);">
<div style="flex:1;">
<div style="background:#22c55e; color:#fff; font-weight:bold; font-size:12px; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:10px;">ADIM 1</div>
<h4 style="margin:0 0 5px 0; color:#fff;">Beğendiğin Çekilişi Seç</h4>
<p style="font-size:13px; color:#94a3b8; margin:0;">Vitrindeki kutulardan gözüne kestirdiğin bir ödülün altındaki yeşil <b>"KATILDINIZ"</b> veya <b>"HEMEN KATIL"</b> butonunu bul.</p>
  </div>
<div style="width:120px; text-align:center;">
<img src="https://www.modum.tr/i/m/001/0016137.png" style="width:100%; border-radius:8px; border:1px solid #334155; box-shadow:0 5px 15px rgba(0,0,0,0.3);">
  </div>
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:20px; display:flex; align-items:center; gap:20px; border:1px solid rgba(255,255,255,0.1);">
<div style="width:120px; text-align:center;">
<img src="https://www.modum.tr/i/m/001/0016136.png" style="width:100%; border-radius:8px; border:1px solid #334155; box-shadow:0 5px 15px rgba(0,0,0,0.3);">
  </div>
<div style="flex:1;">
<div style="background:#0ea5e9; color:#fff; font-weight:bold; font-size:12px; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:10px;">ADIM 2</div>
<h4 style="margin:0 0 5px 0; color:#fff;">Tıkla ve Bitir!</h4>
<p style="font-size:13px; color:#94a3b8; margin:0;">Butona bastığın an işlem tamamdır. Buton rengi değişir ve <b>"KATILIMCI"</b> sayacı artar. Artık sonuçları bekleyebilirsin.</p>
  </div>
  </div>

<div style="margin-top:20px; padding:15px; background:rgba(245, 158, 11, 0.1); border-left:4px solid #f59e0b; border-radius:4px; font-size:13px; color:#fcd34d;">
<i class="fas fa-info-circle"></i> <b>İpucu:</b> Katıldığın her çekiliş sana ayrıca <b>XP (Puan)</b> kazandırır ve rütbeni yükseltmene yardımcı olur.
  </div>
`,
        },
        {
          id: 3,
          title: "📅 Günlük Yoklama (Şansını Artır)",
          content: `
<div style="font-size:14px; color:#e2e8f0; margin-bottom:20px;">
Şansını katlamanın en kolay yolu! Her gün siteye bir kez uğrayıp "Yoklama" alarak hem <b>XP Puanı</b> hem de <b>Ekstra Çekiliş Hakkı</b> kazanırsın.
  </div>

<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:25px;">

<div style="text-align:center;">
<div style="background:#22c55e; color:#fff; font-size:10px; font-weight:bold; padding:2px 8px; border-radius:10px; display:inline-block; margin-bottom:5px;">ADIM 1: TIKLA</div>
<img src="https://www.modum.tr/i/m/001/0016138.png" style="width:100%; border-radius:8px; border:2px solid #22c55e; box-shadow:0 5px 15px rgba(34, 197, 94, 0.2);">
<div style="font-size:11px; color:#86efac; margin-top:5px;">Her gün yeşil butonu bul</div>
  </div>

<div style="text-align:center;">
<div style="background:#64748b; color:#fff; font-size:10px; font-weight:bold; padding:2px 8px; border-radius:10px; display:inline-block; margin-bottom:5px;">ADIM 2: KAZAN</div>
<img src="https://www.modum.tr/i/m/001/0016139.png" style="width:100%; border-radius:8px; border:2px solid #64748b; opacity:0.8;">
<div style="font-size:11px; color:#cbd5e1; margin-top:5px;">Ödüller hesabına yatar</div>
  </div>

  </div>

<div style="background:linear-gradient(to right, rgba(245, 158, 11, 0.1), transparent); border-left:4px solid #f59e0b; padding:15px; border-radius:4px;">
<h4 style="margin:0 0 10px 0; color:#fcd34d; font-size:14px;">🎁 Kazandığın Ödül: Ekstra Hak Bileti</h4>

<img src="https://www.modum.tr/i/m/001/0016134.png" style="width:100%; max-width:250px; margin-bottom:10px; display:block;">

<p style="font-size:13px; color:#e2e8f0; margin:0;">
Bu bilet sayesinde, o gün katıldığın <b>TÜM çekilişlerde</b> ismin listeye 1 kez daha yazılır. Yani kazanma şansın otomatik olarak artar!
  </p>
  </div>
`,
        },
        {
          id: 4,
          title: "✨ XP (Puan) Nedir? Nasıl Kazanılır?",
          content: `
<div style="font-size:14px; color:#e2e8f0; margin-bottom:20px;">
XP (Deneyim Puanı), ModumNet dünyasındaki gücünü ve seviyeni gösterir. Sitede ne kadar aktif olursan, o kadar çok XP kazanırsın.
  </div>

<div style="display:flex; align-items:center; gap:15px; background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; margin-bottom:25px; border:1px solid rgba(255,255,255,0.1);">
<div style="width:100px;">
<img src="https://www.modum.tr/i/m/001/0016140.png" style="width:100%; border-radius:8px; border:1px solid #475569;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#facc15;">Puanın Burada Yazar!</h4>
<div style="font-size:12px; color:#cbd5e1;">
Sol menüdeki profil kartında veya üst bar'da toplam puanını (XP) ve mevcut rütbeni anlık olarak takip edebilirsin.
  </div>
  </div>
  </div>

<h4 style="color:#fff; margin-bottom:10px; font-size:14px;">⚡ Nasıl Hızlı XP Kazanırım?</h4>
<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:25px;">
<div style="background:#1e293b; padding:10px; border-radius:8px; display:flex; align-items:center; gap:10px;">
<i class="fas fa-calendar-check" style="color:#4ade80; font-size:18px;"></i>
<span style="font-size:12px; color:#cbd5e1;"><b>Günlük Yoklama</b><br>Her gün gel, puanı kap.</span>
  </div>
<div style="background:#1e293b; padding:10px; border-radius:8px; display:flex; align-items:center; gap:10px;">
<i class="fas fa-shopping-bag" style="color:#f472b6; font-size:18px;"></i>
<span style="font-size:12px; color:#cbd5e1;"><b>Alışveriş Yaparak</b><br>Siparişlerin puana dönüşsün.</span>
  </div>
<div style="background:#1e293b; padding:10px; border-radius:8px; display:flex; align-items:center; gap:10px;">
<i class="fas fa-tasks" style="color:#60a5fa; font-size:18px;"></i>
<span style="font-size:12px; color:#cbd5e1;"><b>Görevleri Bitir</b><br>Basit görevleri tamamla.</span>
  </div>
<div style="background:#1e293b; padding:10px; border-radius:8px; display:flex; align-items:center; gap:10px;">
<i class="fas fa-user-plus" style="color:#fbbf24; font-size:18px;"></i>
<span style="font-size:12px; color:#cbd5e1;"><b>Arkadaş Davet Et</b><br>Getirdiğin her kişi kazandırır.</span>
  </div>
  </div>

<div style="background:rgba(15, 23, 42, 0.6); border:1px solid #334155; border-radius:12px; padding:15px; text-align:center;">
<h4 style="margin:0 0 10px 0; color:#fff; font-size:14px;">🏆 Zirvedekiler Listesi (Top 5)</h4>
<div style="display:flex; justify-content:center; margin-bottom:10px;">
<img src="https://www.modum.tr/i/m/001/0016141.png" style="width:100%; max-width:280px; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.3);">
  </div>
<div style="font-size:12px; color:#94a3b8;">
En çok XP toplayanlar ana sayfada yayınlanır ve herkes tarafından görülür. Zirveye çıkmak senin elinde!
  </div>
  </div>
`,
        },
        {
          id: 5,
          title: "🛒 Puan Mağazası ve Kupon Kullanımı",
          content: `
<div style="font-size:14px; color:#e2e8f0; margin-bottom:20px;">
Biriktirdiğin XP puanlarını <b>Puan Mağazası</b>'nda gerçek ödüllere dönüştürebilirsin. İndirim kuponları, sürpriz kutular ve daha fazlası seni bekliyor!
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1);">
<div style="display:flex; align-items:center; gap:15px;">
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#fff; font-size:14px;">1. Ürünü Seç ve Satın Al</h4>
<p style="font-size:12px; color:#94a3b8; margin:0;">Puan Mağazasına gir, bütçene uygun ödülün altındaki <b>"SATIN AL"</b> butonuna tıkla.</p>
  </div>
<div style="width:80px;">
<img src="https://www.modum.tr/i/m/001/0016142.png" style="width:100%; border-radius:6px; border:1px solid #334155;">
  </div>
  </div>
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1);">
<div style="display:flex; align-items:center; gap:15px;">
<div style="width:100px;">
<img src="https://www.modum.tr/i/m/001/0016143.png" style="width:100%; border-radius:6px; border:1px solid #334155;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#fff; font-size:14px;">2. Profiline Git</h4>
<p style="font-size:12px; color:#94a3b8; margin:0;">Satın aldığın kuponlar anında hesabına tanımlanır. Profilindeki <b>"Kuponlarım"</b> sekmesine tıkla.</p>
  </div>
  </div>
  </div>

<div style="background:rgba(14, 165, 233, 0.1); border:1px dashed #0ea5e9; border-radius:12px; padding:15px; text-align:center;">
<h4 style="margin:0 0 10px 0; color:#fff; font-size:14px;">3. Kodunu Al ve Alışverişe Başla!</h4>
<img src="https://www.modum.tr/i/m/001/0016144.png" style="width:100%; max-width:250px; border-radius:8px; margin-bottom:10px; box-shadow:0 5px 15px rgba(0,0,0,0.3);">
<div style="font-size:12px; color:#cbd5e1;">
Açılan ekranda indirim kodunu göreceksin. Bu kodu ödeme sayfasında kullanarak indirimini anında aktif edebilirsin!
  </div>
  </div>
`,
        },
        {
          id: 6,
          title: "🏆 Rozet Sistemi",
          content: `
<div style="font-size:14px; color:#e2e8f0; margin-bottom:20px;">
ModumNet'te sadece alışveriş yapmazsın, başarılarınla rütbe atlarsın! Kazandığın rozetler profilini süsler ve sana <b>Ekstra XP</b> kazandırır.
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1); text-align:center;">
<h4 style="margin:0 0 10px 0; color:#fff; font-size:14px;">1. Rozet Vitrini</h4>
<img src="https://www.modum.tr/i/m/001/0016145.png" style="width:100%; border-radius:6px; margin-bottom:10px;">
<p style="font-size:12px; color:#94a3b8; margin:0;">
Profilinde kilitli veya açık tüm rozetleri görebilirsin. Her birinin değeri ve zorluğu farklıdır.
  </p>
  </div>

<div style="display:flex; align-items:center; gap:15px; background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1);">
<div style="width:110px;">
<img src="https://www.modum.tr/i/m/001/0016146.png" style="width:100%; border-radius:6px; border:1px solid #334155;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#facc15; font-size:13px;">Nasıl Açılır?</h4>
<p style="font-size:12px; color:#cbd5e1; margin:0;">
Merak ettiğin rozetin <b>üstüne tıkla</b>. Açılan pencerede senden istenen görevi (Örn: "3 Arkadaş Davet Et") gör ve tamamla!
  </p>
  </div>
  </div>

<div style="background:linear-gradient(to right, rgba(168, 85, 247, 0.1), transparent); border-left:4px solid #a855f7; padding:15px; border-radius:4px;">
<h4 style="margin:0 0 10px 0; color:#e879f9; font-size:14px;">🎁 Rozetini Aldığında Ne Olur?</h4>

<img src="https://www.modum.tr/i/m/001/0016147.png" style="width:100%; border-radius:8px; margin-bottom:10px; box-shadow:0 5px 15px rgba(0,0,0,0.3);">

<ul style="font-size:12px; color:#e2e8f0; margin:0; padding-left:20px; line-height:1.6;">
<li>Rozet görselini <b>Profil Resmi</b> yapabilirsin.</li>
<li>Başarını Story'de paylaşıp anında <b>50 XP</b> kazanabilirsin.</li>
<li>Rütben yükselir ve liderlik tablosunda öne çıkarsın!</li>
  </ul>
  </div>
`,
        },
        {
          id: 7,
          title: "🎯 Görevler ile Hızlı Puan",
          content: `
<div style="font-size:14px; color:#e2e8f0; margin-bottom:20px;">
Sadece çekiliş beklemek yetmez diyorsan, <b>Görevler</b> sekmesi tam sana göre! Sosyal medya takibi, yorum yapma gibi basit işlerle anında XP kazanabilirsin.
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:20px; border:1px solid rgba(255,255,255,0.1);">
<div style="display:flex; gap:15px;">
<div style="width:100px;">
<img src="https://www.modum.tr/i/m/001/0016148.png" style="width:100%; height:140px; object-fit:cover; object-position:top; border-radius:6px; border:1px solid #334155;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#fff; font-size:14px;">1. Görevini Seç</h4>
<p style="font-size:12px; color:#94a3b8; margin:0;">
Listeden puanı ve süresi sana uygun olan bir göreve tıkla. Bazı görevler <b>Süreli (Saatlik)</b> olabilir, kaçırma!
  </p>
  </div>
  </div>
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:20px; border:1px solid rgba(255,255,255,0.1);">
<div style="display:flex; flex-direction:row-reverse; gap:15px;">
<div style="width:120px;">
<img src="https://www.modum.tr/i/m/001/0016150.png" style="width:100%; border-radius:6px; border:1px solid #334155;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#4ade80; font-size:14px;">2. Kontrol Et ve Bitir</h4>
<p style="font-size:12px; color:#94a3b8; margin:0;">
Görevin adımlarını yap ve <b>"Kontrol Et"</b> butonuna bas. Eğer doğru yaptıysan yanına <b>Yeşil Tik ✅</b> gelir. Tüm adımlar bitince ödülün hesabına yatar!
  </p>
  </div>
  </div>
  </div>

<div style="background:rgba(234, 179, 8, 0.1); border-left:4px solid #eab308; padding:15px; border-radius:4px; font-size:12px; color:#fef08a;">
<i class="fas fa-bolt"></i> <b>İpucu:</b> Görevler sürekli yenilenir. Yüksek puanlı "Efsane" görevleri yakalamak için burayı sık sık kontrol et.
  </div>
`,
        },
        {
          id: 8,
          title: "🤝 Arkadaşını Davet Et (Ortaklık)",
          content: `
<div style="font-size:14px; color:#e2e8f0; margin-bottom:20px;">
ModumNet'te kazanmanın en hızlı yolu arkadaşlarını davet etmektir. Senin referansınla gelen her arkadaşın sana ömür boyu <b>XP ve Bonus</b> kazandırır.
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1);">
<div style="display:flex; align-items:center; gap:15px;">
<div style="width:100px; text-align:center;">
<img src="https://www.modum.tr/i/m/001/0016151.png" style="width:100%; border-radius:8px; border:1px solid #334155;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#fff; font-size:14px;">1. Ortaklık Menüsü</h4>
<p style="font-size:12px; color:#94a3b8; margin:0;">
Profiline gir ve menüdeki <b>"Ortaklık"</b> butonuna tıkla. Tüm referans işlemlerini buradan yöneteceksin.
  </p>
  </div>
  </div>
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1);">
<div style="display:flex; align-items:center; gap:15px; flex-direction:row-reverse;">
<div style="width:120px; text-align:center;">
<img src="https://www.modum.tr/i/m/001/0016152.png" style="width:100%; border-radius:8px; border:1px solid #334155;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#4ade80; font-size:14px;">2. Linkini Paylaş</h4>
<p style="font-size:12px; color:#94a3b8; margin:0;">
Sana özel oluşturulan <b>Referans Linkini</b> kopyala ve arkadaşlarına gönder. Onlar bu linkle kayıt olduklarında otomatik olarak senin ekibine dahil olurlar.
  </p>
  </div>
  </div>
  </div>

<div style="background:rgba(30, 41, 59, 0.6); border:1px dashed #64748b; border-radius:12px; padding:15px; text-align:center;">
<h4 style="margin:0 0 10px 0; color:#fff; font-size:14px;">3. Ekibini Büyüt</h4>
<div style="display:flex; justify-content:center; margin-bottom:10px;">
<img src="https://www.modum.tr/i/m/001/0016153.png" style="width:100%; max-width:200px; border-radius:6px;">
  </div>
<div style="font-size:12px; color:#cbd5e1;">
Davet ettiğin kişileri <b>"Ekip Arkadaşım"</b> sekmesinden görebilirsin. Ekibin ne kadar büyükse, kazancın o kadar artar!
  </div>
  </div>
`,
        },
        {
          id: 9,
          title: "🕵️ Altın Ürün Avı (Büyük Ödül)",
          content: `
<div style="font-size:14px; color:#e2e8f0; margin-bottom:20px;">
Kendine güveniyor musun dedektif? ModumNet'te her gün rastgele bir ürün <b>"Altın Ürün"</b> seçilir. İpuçlarını takip et, gizli ürünü bul ve büyük XP ödülünü kap!
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1);">
<div style="display:flex; align-items:center; gap:15px;">
<div style="width:120px;">
<img src="https://www.modum.tr/i/m/001/0016154.png" style="width:100%; border-radius:6px; border:1px solid #334155;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#facc15; font-size:14px;">1. İpucunu Yakala</h4>
<p style="font-size:12px; color:#94a3b8; margin:0;">
Görevler sayfasına git ve <b>"Altın Ürün"</b> kartını bul. Hangi kategoride (Örn: Ayakkabı, Çanta) arama yapman gerektiği orada yazar.
  </p>
  </div>
  </div>
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1);">
<div style="text-align:center; margin-bottom:10px;">
<h4 style="margin:0 0 10px 0; color:#4ade80; font-size:14px;">2. Gizli Ürünü Buldun!</h4>
<img src="https://www.modum.tr/i/m/001/0016155.png" style="width:100%; max-width:250px; border-radius:8px; box-shadow:0 0 15px rgba(74, 222, 128, 0.2);">
  </div>
<p style="font-size:12px; color:#cbd5e1; text-align:center; margin:0;">
Doğru ürünün sayfasına girdiğin an ekrana bu <b>Özel Pop-up</b> çıkar. Tebrikler, hazineyi buldun!
  </p>
  </div>

<div style="display:flex; align-items:center; gap:15px; background:linear-gradient(to right, rgba(234, 179, 8, 0.1), transparent); border-left:4px solid #eab308; padding:15px; border-radius:4px;">
<div style="width:120px;">
<img src="https://www.modum.tr/i/m/001/0016157.png" style="width:100%; border-radius:6px;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#fef08a; font-size:13px;">Hazine Hesabında!</h4>
<p style="font-size:12px; color:#e2e8f0; margin:0;">
Ödül anında bakiyene yansır. Puan geçmişinde <b>+300 XP</b> (veya o günün ödülü neyse) kazancını görebilirsin.
  </p>
  </div>
  </div>
`,
        },
        {
          id: 10,
          title: "🎁 Sürpriz Kutu (Yumurta) Avı",
          content: `
<div style="font-size:14px; color:#e2e8f0; margin-bottom:20px;">
Dikkatli bak! ModumNet'in farklı sayfalarına her gün rastgele <b>Sürpriz Kutular</b> gizlenir. Onları bulmak, ekstra XP kazanmanın en eğlenceli yoludur.
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1);">
<div style="display:flex; align-items:center; gap:15px;">
<div style="width:120px;">
<img src="https://www.modum.tr/i/m/001/0016158.png" style="width:100%; border-radius:6px; border:1px solid #334155;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#facc15; font-size:14px;">1. Av Başlasın!</h4>
<p style="font-size:12px; color:#94a3b8; margin:0;">
Görevler sayfasına bak. Günde belirli bir sayıda (Örn: 5 kez) kutu bulma hakkın vardır. Sayacı buradan takip et.
  </p>
  </div>
  </div>
  </div>

<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">

<div style="background:rgba(30, 41, 59, 0.6); padding:15px; border-radius:12px; border:1px dashed #ec4899; text-align:center;">
<h4 style="margin:0 0 10px 0; color:#f472b6; font-size:13px;">Bunu Bulmalısın!</h4>
<img src="https://www.modum.tr/i/m/001/0016160.png" style="width:80px; height:auto; margin-bottom:10px; animation: float 3s ease-in-out infinite;">
<p style="font-size:11px; color:#cbd5e1; margin:0;">
Kategori sayfalarında, ürün altlarında veya footer'da bu hediye kutusunu ara ve <b>üstüne tıkla</b>.
  </p>
  </div>

<div style="background:rgba(30, 41, 59, 0.6); padding:15px; border-radius:12px; border:1px solid #4ade80; text-align:center;">
<h4 style="margin:0 0 10px 0; color:#4ade80; font-size:13px;">Buldun!</h4>
<img src="https://www.modum.tr/i/m/001/0016159.png" style="width:100%; border-radius:6px; margin-bottom:5px;">
<p style="font-size:11px; color:#cbd5e1; margin:0;">
Doğru kutuya tıkladığında ekrana bu <b>Tebrikler</b> mesajı gelir.
  </p>
  </div>

  </div>

<div style="background:linear-gradient(to right, rgba(236, 72, 153, 0.1), transparent); border-left:4px solid #ec4899; padding:15px; border-radius:4px;">
<div style="display:flex; align-items:center; gap:15px;">
<div style="width:100px;">
<img src="https://www.modum.tr/i/m/001/0016161.png" style="width:100%; border-radius:6px; margin-bottom:10px;">
<img src="https://www.modum.tr/i/m/001/0016162.png" style="width:100%; border-radius:6px;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#f9a8d4; font-size:13px;">Puanları Topla!</h4>
<p style="font-size:12px; color:#e2e8f0; margin:0;">
Her buluşta anında XP kazanırsın (Örn: +20 XP). Ayrıca görev ilerleme çubuğun dolar. Günlük tüm kutuları bul, bonusları kap!
  </p>
  </div>
  </div>
  </div>

<style>
@keyframes float {
0% { transform: translateY(0px); }
50% { transform: translateY(-10px); }
100% { transform: translateY(0px); }
}
  </style>
`,
        },
        {
          id: 11,
          title: "🖼️ Rütbe Tablosu ve Seviyeler",
          content: `
<div style="font-size:14px; color:#e2e8f0; margin-bottom:20px;">
ModumNet'te statünü belirleyen şey XP puanındır. Puan kazandıkça rütbe ilerleme çubuğun dolar ve bir üst lige çıkarsın. İşte yol haritan!
  </div>

<div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:20px; border:1px solid rgba(255,255,255,0.1);">
<div style="display:flex; align-items:center; gap:15px;">
<div style="width:120px;">
<img src="https://www.modum.tr/i/m/001/0016163.png" style="width:100%; border-radius:6px; border:1px solid #334155;">
  </div>
<div style="flex:1;">
<h4 style="margin:0 0 5px 0; color:#fff; font-size:14px;">1. İlerlemeni Takip Et</h4>
<p style="font-size:12px; color:#94a3b8; margin:0;">
Profilinde rütbe çubuğunu görebilirsin. Çubuk dolduğunda otomatik olarak bir üst rütbeye atlarsın ve profilin daha havalı görünür!
  </p>
  </div>
  </div>
  </div>

<div style="background:rgba(30, 41, 59, 0.6); padding:15px; border-radius:12px; border:1px solid #6366f1; text-align:center;">
<h4 style="margin:0 0 10px 0; color:#818cf8; font-size:14px;">📈 Hedef Tablosu</h4>
<div style="margin-bottom:15px;">
<img src="https://www.modum.tr/i/m/001/0016164.png" style="width:100%; border-radius:8px; box-shadow:0 0 20px rgba(99, 102, 241, 0.2);">
  </div>
<div style="font-size:12px; color:#cbd5e1; text-align:left; background:rgba(0,0,0,0.2); padding:10px; border-radius:6px;">
<ul style="margin:0; padding-left:20px; line-height:1.8;">
<li><b>Çaylak & Bronz:</b> Yolun başı.</li>
<li><b>Gümüş & Altın:</b> İndirimlerin açıldığı seviye.</li>
<li><b>Elmas & Efsane:</b> Sitenin kralları! Özel ayrıcalıklar.</li>
  </ul>
  </div>
  </div>

<div style="margin-top:20px; text-align:center; padding:15px; background:linear-gradient(to right, #10b981, #3b82f6); border-radius:8px; color:white;">
<h4 style="margin:0 0 5px 0;">🎉 Tebrikler!</h4>
<div style="font-size:13px;">
ModumNet rehberini tamamladın. Artık kazanmaya hazırsın. Bol şans!
  </div>
  </div>
`,
        },
      ],

      openHelpModal: function () {
        var old = document.getElementById("mdm-help-modal");
        if (old) old.remove();
        var menuHtml = "";
        this.helpData.forEach((item, index) => {
          var activeClass = index === 0 ? "active" : "";
          menuHtml += `<div class="mdm-help-item ${activeClass}" onclick="ModumApp.loadHelpTopic(${item.id}, this)">${item.title}</div>`;
        });

        var html = `
<div id="mdm-help-modal" class="mdm-modal" style="display:flex; z-index:200000;">
<div class="mdm-modal-content" style="max-width:900px; width:95%;">
<div class="mdm-modal-header" style="background:#0f172a;">
<h3 style="margin:10; color:#fff; display:flex; align-items:center; gap:10px;"><i class="fas fa-book-open" style="color:#60a5fa"></i> Yardım & Rehber</h3>
<div class="mdm-modal-close" onclick="document.getElementById('mdm-help-modal').remove()">&times;</div>
  </div>
<div class="mdm-help-layout">
<div class="mdm-help-menu">${menuHtml}</div>
<div id="mdm-help-detail-area" class="mdm-help-content-area"></div>
  </div>
  </div>
  </div>`;

        var d = document.createElement("div");
        d.innerHTML = html;
        document.body.appendChild(d);
        this.loadHelpTopic(1);
      },

      loadHelpTopic: function (id, el) {
        if (el) {
          document
            .querySelectorAll(".mdm-help-item")
            .forEach((i) => i.classList.remove("active"));
          el.classList.add("active");
        }
        var topic = this.helpData.find((t) => t.id === id);
        var container = document.getElementById("mdm-help-detail-area");
        if (topic && container) {
          container.innerHTML = `
<h2 style="color:#fff; border-bottom:1px solid #334155; padding-bottom:10px; margin-top:0;">${topic.title}</h2>
<div style="font-size:15px; color:#cbd5e1;">${topic.content}</div>
`;
        }
      },
      // --- 🏆 RÜTBE SİSTEMİ BİLGİ PENCERESİ (YENİ) ---
      openRankInfoModal: function () {
        var userXP =
            APP_STATE.user && APP_STATE.user.puan
        ? parseInt(APP_STATE.user.puan)
        : 0;
        var currentLevel =
            APP_STATE.user && APP_STATE.user.seviye
        ? APP_STATE.user.seviye
        : "Çaylak";

        // Rütbe Tanımları
        var ranks = [
          {
            name: "Çaylak",
            icon: "🌱",
            min: 0,
            color: "#10b981",
            desc: "Başlangıç seviyesi. Aramıza hoş geldin!",
          },
          {
            name: "Usta",
            icon: "⚔️",
            min: 2500,
            color: "#8b5cf6",
            desc: "Deneyimli üye. Artık işi biliyorsun.",
          },
          {
            name: "Şampiyon",
            icon: "🦁",
            min: 7500,
            color: "#f59e0b",
            desc: "Lider ruhlu. Rakiplerin senden korksun.",
          },
          {
            name: "Efsane",
            icon: "🐉",
            min: 15000,
            color: "#ef4444",
            desc: "Zirvenin sahibi. Saygı duyulan üye.",
          },
        ];

        var listHtml = "";

        ranks.forEach((r) => {
          var isCurrent = r.name === currentLevel;
          var isPassed = userXP >= r.min;

          // Stil Ayarları
          var bg = isCurrent
          ? `background:linear-gradient(90deg, ${r.color}20, transparent); border-left:4px solid ${r.color};`
          : `background:rgba(255,255,255,0.03); border-left:4px solid #334155;`;
          var opacity = isPassed || isCurrent ? "1" : "0.5";
          var checkIcon = isPassed
          ? '<i class="fas fa-check-circle" style="color:#10b981"></i>'
          : '<i class="far fa-circle" style="color:#64748b"></i>';
          if (isCurrent)
            checkIcon =
              '<span style="background:' +
              r.color +
              '; color:white; font-size:9px; padding:2px 6px; border-radius:4px;">MEVCUT</span>';

          listHtml += `
<div style="display:flex; align-items:center; gap:15px; padding:12px; margin-bottom:8px; border-radius:8px; ${bg} opacity:${opacity}; transition:0.2s;">
<div style="font-size:24px; width:40px; text-align:center;">${r.icon}</div>
<div style="flex:1;">
<div style="font-weight:800; color:#fff; font-size:14px; display:flex; justify-content:space-between;">
<span>${r.name}</span>
<span style="font-size:12px; color:${
          r.color
        }">${r.min.toLocaleString()} XP</span>
  </div>
<div style="font-size:11px; color:#94a3b8; margin-top:2px;">${r.desc}</div>
  </div>
<div>${checkIcon}</div>
  </div>
`;
        });

        // Modal HTML
        var html = `
<div id="mdm-rank-modal" class="mdm-modal active" style="z-index:999999; display:flex; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="width:90%; max-width:400px; background:#0f172a; padding:0; border-radius:20px; border:1px solid #334155; overflow:hidden;">

<div style="background:linear-gradient(135deg, #1e293b, #0f172a); padding:20px; text-align:center; border-bottom:1px solid #334155; position:relative;">
<div onclick="document.getElementById('mdm-rank-modal').remove()" style="position:absolute; top:15px; right:15px; color:#64748b; cursor:pointer; font-size:20px;">&times;</div>
<div style="font-size:40px; margin-bottom:10px;">🏆</div>
<h3 style="margin:0; color:#fff; font-size:18px;">Rütbe Sistemi</h3>
<p style="margin:5px 0 0; font-size:12px; color:#94a3b8;">Puan topla, rütbeni yükselt, ayrıcalık kazan!</p>
  </div>

<div style="padding:20px; max-height:400px; overflow-y:auto;">
${listHtml}

<div style="margin-top:20px; background:rgba(59, 130, 246, 0.1); border:1px dashed #3b82f6; padding:10px; border-radius:8px; font-size:11px; color:#60a5fa; text-align:center;">
<i class="fas fa-info-circle"></i> Rütben arttıkça, mağazada kilitli olan özel ürünleri ve indirimleri alabilirsin.
  </div>
  </div>

  </div>
  </div>`;

        var d = document.createElement("div");
        d.innerHTML = html;
        document.body.appendChild(d);
      },
      verifyGoogleTask: function(taskId) {
        var btn = document.getElementById("btn-verify-" + taskId);
        if(btn) {
          var orjText = btn.innerText;
          btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kontrol Ediliyor...';
          btn.style.background = "#64748b"; // Gri yap
          btn.disabled = true;
        }

        // 5 Saniye Beklet (Gerçekçi olsun)
        setTimeout(function() {
          fetchApi("complete_task_step", {
            email: APP_STATE.user.email,
            taskId: taskId,
            step: 2 // 2. Adım (Onay Adımı)
          }).then(res => {
            if(res && res.success) {
              alert("✅ Teşekkürler! Ödül hesabına eklendi.");
              if(window.loadTasksData) window.loadTasksData(); 
              if(window.updateDataInBackground) window.updateDataInBackground();
            } else {
              alert("⚠️ " + (res.message || "Hata oluştu."));
              if(btn) {
                btn.innerHTML = orjText;
                btn.disabled = false;
                btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
              }
            }
          });
        }, 5000);
      },
      // --- 🗳️ ANKET LİSTESİ MODALI (YENİ) ---
      openSurveyModal: function () {
        if (!APP_STATE.user || !APP_STATE.user.email) return ModumApp.showGuestPopup("daily");

        // Önce temizlik
        var old = document.getElementById("mdm-survey-modal");
        if (old) old.remove();

        // Yükleniyor ekranı
        var loadingHtml = `<div id="mdm-survey-modal" class="mdm-modal active" style="z-index:99999;"><div class="mdm-modal-content" style="text-align:center; padding:40px;"><i class="fas fa-circle-notch fa-spin"></i> Anketler Yükleniyor...</div></div>`;
        document.body.insertAdjacentHTML("beforeend", loadingHtml);

        // Listeyi Çek
        fetchApi("get_all_surveys_for_user", { email: APP_STATE.user.email }).then(res => {
          var modalDiv = document.getElementById("mdm-survey-modal");
          if (!modalDiv) return;

          if (!res.success || res.list.length === 0) {
            modalDiv.innerHTML = `<div class="mdm-modal-content" style="padding:30px; text-align:center; background:#1e293b; border:1px solid #334155;">
<h3>📭 Aktif Anket Yok</h3>
<p style="color:#94a3b8;">Şu an aktif bir oylama bulunmuyor.</p>
<button onclick="document.getElementById('mdm-survey-modal').remove()" class="mdm-btn-lucky" style="width:auto; padding:8px 20px; margin-top:15px;">Kapat</button>
  </div>`;
            return;
          }

          // Listeyi Oluştur
          var listHtml = "";
          res.list.forEach(s => {
            var icon = s.hasVoted ? '<i class="fas fa-check-circle" style="color:#10b981;"></i>' : '<i class="far fa-circle" style="color:#fbbf24;"></i>';
            var statusText = s.hasVoted ? '<span style="color:#10b981; font-size:11px;">Tamamlandı</span>' : `<span style="color:#fbbf24; font-size:11px;">+${s.reward} XP Kazan</span>`;
            var bgStyle = s.hasVoted ? 'background:rgba(255,255,255,0.02); opacity:0.7;' : 'background:rgba(255,255,255,0.05); border-color:#6366f1;';

            listHtml += `
<div onclick="ModumApp.loadSurveyDetail('${s.id}')" style="${bgStyle} border:1px solid #334155; padding:15px; border-radius:10px; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:0.2s;">
<div style="font-size:20px;">${icon}</div>
<div style="flex:1;">
<div style="color:#fff; font-weight:600; font-size:13px;">${s.question}</div>
<div style="margin-top:2px;">${statusText}</div>
  </div>
<i class="fas fa-chevron-right" style="color:#64748b; font-size:12px;"></i>
  </div>`;
          });

          var modalBody = `
<div class="mdm-modal-content" style="background:#1e293b; max-width:450px; border:1px solid #475569; max-height:80vh; overflow-y:auto;">
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
<h3 style="margin:0; color:#fff;">📢 Anketler</h3>
<span onclick="document.getElementById('mdm-survey-modal').remove()" style="cursor:pointer; color:#94a3b8; font-size:20px;">×</span>
  </div>
<div id="survey-list-area">${listHtml}</div>
  </div>`;

          modalDiv.innerHTML = modalBody;
        });
      },

      // --- TEKİL ANKET DETAYINI AÇ ---
      loadSurveyDetail: function (surveyId) {
        var area = document.getElementById("survey-list-area");
        if(area) area.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;"><i class="fas fa-circle-notch fa-spin"></i> Yükleniyor...</div>';

        fetchApi("get_survey_detail", { email: APP_STATE.user.email, surveyId: surveyId }).then(res => {
          if(!res.success) return alert(res.message);

          var htmlContent = "";

          // EĞER OY KULLANDIYSA -> SONUÇLARI GÖSTER
          if (res.hasVoted) {
            var totalVotes = res.totalVotes || 1;
            var barsHtml = "";

            res.options.forEach((opt, idx) => {
              var count = res.votes[idx] || 0;
              var percent = Math.round((count / totalVotes) * 100);

              barsHtml += `
<div style="margin-bottom:10px;">
<div style="display:flex; justify-content:space-between; font-size:12px; color:#fff; margin-bottom:3px;">
<span>${opt}</span>
<span>%${percent} (${count} oy)</span>
  </div>
<div style="width:100%; height:8px; background:#334155; border-radius:10px; overflow:hidden;">
<div style="width:${percent}%; height:100%; background:linear-gradient(90deg, #10b981, #34d399);"></div>
  </div>
  </div>`;
            });

            htmlContent = `
<div style="text-align:center; margin-bottom:20px;">
<i class="fas fa-check-circle" style="font-size:40px; color:#10b981; margin-bottom:10px;"></i>
<h3 style="margin:0; color:#fff;">Oyunuz Alındı!</h3>
<p style="color:#94a3b8; font-size:12px;">Teşekkürler. İşte sonuçlar:</p>
  </div>
<div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; border:1px solid #334155;">
${barsHtml}
  </div>
<button onclick="ModumApp.openSurveyModal()" style="width:100%; margin-top:15px; background:transparent; border:1px solid #475569; color:#cbd5e1; padding:10px; border-radius:8px; cursor:pointer;">🔙 Listeye Dön</button>
`;
          } 
          // EĞER OY KULLANMADIYSA -> OY KULLANMA EKRANI
          else {
            var btnsHtml = "";
            res.options.forEach((opt, idx) => {
              btnsHtml += `
<button onclick="ModumApp.submitVote('${res.id}', ${idx})" 
style="width:100%; text-align:left; background:rgba(255,255,255,0.05); border:1px solid #334155; padding:15px; border-radius:10px; color:#fff; margin-bottom:10px; cursor:pointer; transition:0.2s; display:flex; align-items:center;">
<div style="width:24px; height:24px; border:2px solid #64748b; border-radius:50%; margin-right:10px; display:flex; align-items:center; justify-content:center;"></div>
${opt}
  </button>`;
            });

            htmlContent = `
<h3 style="color:#fff; text-align:center; margin-top:0;">${res.question}</h3>
<div style="background:#f59e0b20; border:1px dashed #f59e0b; color:#f59e0b; padding:8px; border-radius:8px; font-size:11px; text-align:center; margin-bottom:20px;">
🎁 Oylamaya katıl, anında <b>${res.reward} XP</b> kazan!
  </div>
<div id="survey-options-area">${btnsHtml}</div>
<button onclick="ModumApp.openSurveyModal()" style="width:100%; margin-top:10px; background:transparent; border:none; color:#64748b; font-size:12px; cursor:pointer;">İptal ve Geri Dön</button>
`;
          }

          if(area) area.innerHTML = htmlContent;
        });
      },

      // OY GÖNDERME
      submitVote: function (surveyId, index) {
        var area = document.getElementById("survey-options-area");
        if(area) area.style.opacity = "0.5";

        fetchApi("vote_survey", {
          email: APP_STATE.user.email,
          surveyId: surveyId,
          optionIndex: index
        }).then(res => {
          if(res.success) {
            alert("🎉 " + res.message);
            ModumApp.loadSurveyDetail(surveyId); // Sonuçları göster
            updateDataInBackground();
          } else {
            alert("Hata: " + res.message);
          }
        });
      },
    }; // <--- BURASI ÇOK ÖNEMLİ: window.ModumApp BU NOKTALI VİRGÜL İLE BİTER.

    checkSystemLock().then((isLocked) => {
      // Eğer kilit YOKSA normal sistemi başlat
      if (!isLocked) {
        var attempts = 0;
        var initInterval = setInterval(function () {
          var root = document.getElementById(TARGET_ID);

          // Kutu Sistemini Başlat
          if (document.body && !window.mdmEggStarted) {
            window.mdmEggStarted = true;
            ModumApp.initSurpriseSystem();
          }

          attempts++;
          if (root) {
            clearInterval(initInterval);
            init(root); // Widget'ı başlat
          } else if (attempts > 20) {
            clearInterval(initInterval);
          }
        }, 500);

        // Altın Ürün Avını Başlat
        window.addEventListener("load", function () {
          setTimeout(initGoldenHunt, 2000);
        });
      }
    });

    // --- GÖREVLERİ YÜKLEME (DEBUG MODU + KESİN EŞLEŞTİRME) ---
    async function loadTasksData() {
      var container = document.getElementById("mdm-tasks-list");
      if (!container) return;

      if (!APP_STATE.user || !APP_STATE.user.email) {
        container.innerHTML =
          '<div style="text-align:center; padding:20px; color:#94a3b8;">Görevleri görmek için giriş yapın.</div>';
        return;
      }

      // Verileri Çek
      var pTasks = fetchApi("get_tasks");
      var pProgress = fetchApi("get_user_task_progress", {
        email: APP_STATE.user.email,
      });

      var [resTasks, resProg] = await Promise.all([pTasks, pProgress]);

      // İlerlemeleri Map'e çevir (Hızlı erişim için)
      var myProgressMap = {};
      if (resProg && resProg.success && resProg.list) {
        resProg.list.forEach((p) => {
          // Olası tüm anahtarları ekleyelim
          if (p.taskId) myProgressMap[p.taskId] = p;
          if (p.taskTitle) myProgressMap[p.taskTitle] = p;
          if (p.gorevserisiid) myProgressMap[p.gorevserisiid] = p;
          // Özel kontrol: gunluk_rutin_v2 (Senin ekran görüntüsündeki ID)
          if (p.taskId === "gunluk_rutin_v2")
            myProgressMap["gunluk_rutin_v2"] = p;
        });
      }

      if (resTasks && resTasks.success) {
        var html = "";
        var activeTasks = resTasks.tasks.filter(
          (t) => t.status === "active" || t.status === true || t.aktif === true
        );
        // 2. 🔥 SIRALA: Günlük Görevler En Üste
        activeTasks.sort(function (a, b) {
          var typeA = (a.type || a.frequency || "").toUpperCase();
          var typeB = (b.type || b.frequency || "").toUpperCase();
          var titleA = (a.title || a.baslik || "").toLowerCase();
          var titleB = (b.title || b.baslik || "").toLowerCase();

          // Günlük mü? (Tipinden veya Başlığından anla)
          var isDailyA =
              typeA === "GUNLUK" ||
              typeA === "GÜNLÜK" ||
              titleA.includes("günlük") ||
              titleA.includes("rutin");
          var isDailyB =
              typeB === "GUNLUK" ||
              typeB === "GÜNLÜK" ||
              titleB.includes("günlük") ||
              titleB.includes("rutin");

          if (isDailyA && !isDailyB) return -1; // A yukarı
          if (!isDailyA && isDailyB) return 1; // B yukarı
          return 0;
        });

        if (activeTasks.length === 0) {
          container.innerHTML =
            '<div style="text-align:center; padding:20px; color:#94a3b8;">Aktif görev yok.</div>';
          return;
        }

        activeTasks.forEach((t) => {
          var title = t.baslik || t.title;
          var reward = t.buyukodul_xp || t.reward;

          // --- EŞLEŞTİRME ---
          // İlerlemeyi bulmaya çalışıyoruz.
          var myP =
              myProgressMap[t.id] ||
              myProgressMap[t.customId] ||
              myProgressMap[title] ||
              {};

          var defaultTarget = title.toLowerCase().includes("kutu") ? 5 : 1;
          var target1 = parseInt(t.adim1_hedef) || defaultTarget;

          // Adım 1 İlerlemesi
          var currentProgress =
              parseInt(myP.adim1_ilerleme) || parseInt(myP.count) || 0;
          if (myP.adim1_ilerleme === true) currentProgress = target1;

          var stepsHtml = "";
          var totalStepsCount = 0;
          var completedStepsCount = 0;

          // 1. Adım Kontrolü
          if (t.adim1_tanim) {
            totalStepsCount++;
            var isDone1 = currentProgress >= target1;
            if (isDone1) completedStepsCount++;

            var actionHtml1 = "";
            var tanimKucuk = (t.adim1_tanim || "").toLowerCase();

            if (isDone1) {
              actionHtml1 = `<div style="margin-top:5px; padding:8px; background:rgba(16, 185, 129, 0.1); border:1px solid rgba(16, 185, 129, 0.3); border-radius:6px; color:#34d399; font-size:11px; font-weight:bold; text-align:center;">✅ TAMAMLANDI</div>`;
            } // B. Profil Mimarı (ÖZEL BUTON BURAYA GELMELİ ÇÜNKÜ TEK ADIM)
            else if (t.id === "gorev_profil_mimari" || (t.customId && t.customId === "gorev_profil_mimari")) {
              actionHtml1 = `
<button onclick="ModumApp.switchTab('store')" 
style="width:100%; background:linear-gradient(135deg, #8b5cf6, #6d28d9); color:white; border:none; padding:10px; border-radius:8px; margin-top:5px; cursor:pointer; font-weight:bold; box-shadow:0 4px 10px rgba(139, 92, 246, 0.3);">
<i class="fas fa-shopping-bag"></i> Mağazaya Git & Çerçeve Al
  </button>
<div style="font-size:10px; color:#94a3b8; text-align:center; margin-top:5px;">*Profilinden çerçeve değiştirdiğinde otomatik tamamlanır.</div>
`;
            }

            // C. Google Görevi 1. Adım (Sadece Linke Gitme)
            else if (t.id === "gorev_google_maps") {
              var gLink = t.adim1_link || "https://maps.app.goo.gl/EPzeQfe28jDQsQYF6";
              actionHtml1 = `<button onclick="window.open('${gLink}', '_blank')" style="width:100%; background:#3b82f6; color:white; border:none; padding:8px; border-radius:6px; margin-top:5px; cursor:pointer; font-weight:bold;">Haritalara Git 🗺️</button>`;
            }
            else if (
              t.id === "alisveris_guru_v1" ||
              (title && title.toLowerCase().includes("alışveriş")) ||
              (title && title.toLowerCase().includes("sipariş"))
            ) {
              actionHtml1 = `
<div style="margin-top:8px; padding:10px; background:rgba(59, 130, 246, 0.1); border:1px dashed #3b82f6; border-radius:8px; font-size:11px; color:#60a5fa; line-height:1.4;">
<i class="fas fa-info-circle"></i> Siparişiniz onaylandığında bu adım <b>otomatik</b> olarak tamamlanır.
  </div>`;
            }
            // 🔥 EKSİK OLAN PARÇA BU: Altın Ürün ise Butonu Gizle, Bilgi Ver 🔥
            else if (
              (t.id && t.id.toLowerCase().includes("altin_urun")) ||
              (title && title.toLowerCase().includes("altın ürün"))
            ) {
              actionHtml1 = `
<div style="margin-top:8px; padding:10px; background:rgba(251, 191, 36, 0.1); border:1px dashed #fbbf24; border-radius:8px; font-size:11px; color:#fbbf24; line-height:1.4;">
<i class="fas fa-search"></i> Sitede gezinirken <b>Altın Ürünü</b> bulursan otomatik tamamlanır.
  </div>`;
            } else if (
              t.adim1_gorevtipi === "dogum_tarihi_gir" ||
              (title && title.toLowerCase().includes("doğum"))
            ) {
              actionHtml1 = `<button onclick="window.location.href='/hesabim/bilgilerim/'" style="width:100%; background:#e11d48; color:white; border:none; padding:8px; border-radius:6px; margin-top:5px; cursor:pointer; font-weight:bold;">Doğum Gününü Gir 🎂</button>`;
            }
            // 🔥 YENİ EKLENEN: Çekiliş Görevi İse Vitrine Yönlendir
            else if (
              t.adim1_gorevtipi === "cekilise_katil" ||
              (title && title.toLowerCase().includes("haftanın yıldızı"))
            ) {
              actionHtml1 = `<button onclick="ModumApp.switchTab('home')" style="width:100%; background:#3b82f6; color:white; border:none; padding:8px; border-radius:6px; margin-top:5px; cursor:pointer; font-weight:bold;">Vitrine Git ve Katıl 🎟️</button>`;
            } else if (tanimKucuk.includes("kutu")) {
              var kalan = target1 - currentProgress;
              var percent = Math.min((currentProgress / target1) * 100, 100);
              actionHtml1 = `
<div style="margin-top:8px;">
<div style="display:flex; justify-content:space-between; font-size:11px; color:#94a3b8; margin-bottom:4px;">
<span>Bulunan: <b style="color:#fff">${currentProgress}</b>/${target1}</span>
<span style="color:#fbbf24;">Kalan: ${kalan}</span>
  </div>
<div style="width:100%; height:8px; background:#0f172a; border-radius:10px; overflow:hidden; border:1px solid #334155;">
<div style="width:${percent}%; height:100%; background:linear-gradient(90deg, #f59e0b, #d97706); transition:width 0.5s;"></div>
  </div>
  </div>`;
            } else {
              // 1. Önce Admin Panelinden girilen özel linki al (Varsa)
              var link = t.adim1_link;
              var btnText = "Göreve Git 🚀";
              var btnColor = "#3b82f6"; // Varsayılan Mavi

              // 2. GÖREV TİPİNE GÖRE ZORUNLU YÖNLENDİRMELER
              // Admin panelinden link girilse bile, tip seçiliyse tipin dediği olur.

              if (t.adim1_gorevtipi === "instagram") {
                link = "https://instagram.com/modumnetco";
                btnText = "Instagram'a Git & Tamamla 📸";
                btnColor = "#E1306C"; // Pembe
              } else if (t.adim1_gorevtipi === "urun_gez") {
                link = "/tum-urunler";
                btnText = "Ürünleri İncele 🛍️";
                btnColor = "#f59e0b"; // Turuncu
              } else if (t.adim1_gorevtipi === "sifre_gir") {
                link = "#"; // Şifre görevi bir yere gitmez, olduğu yerde kalır
                btnText = "Şifreyi Buldun mu? 🔑";
                // Şifre görevinde 'goAndComplete' yerine, belki sadece yönlendirme yapılır
                // Ama şimdilik linke tıklayınca Instagram'a (ipucuna) gitsin istersen:
                link = "https://instagram.com/modumnetco";
              }

              // 3. GÜVENLİK: Eğer link hala boşsa (Tip yok, Panelden link girilmemiş)
              // Hata vermesin diye Ana Sayfaya yönlendir veya pasif yap
              if (!link || link === "undefined" || link === "") {
                link = "/"; // Anasayfa (veya "#" yaparak etkisizleştirebilirsin)
              }

              // Butonu Oluştur
              actionHtml1 = `<button onclick="ModumApp.goAndComplete('${t.id}', '${link}')" style="width:100%; background:${btnColor}; color:white; border:none; padding:8px; border-radius:6px; margin-top:5px; cursor:pointer; font-weight:bold;">${btnText}</button>`;
            }
            // ... actionHtml1 kodlarının hemen altına bu bloğu yapıştır:

            // 🔥 SEPET GÖREVİNİ TESPİT ET VE KAYDET
            // Eğer 2. adımın tanımında "sepete" kelimesi geçiyorsa bu ID'yi hafızaya atıyoruz.
            if (
              t.adim2_tanim &&
              t.adim2_tanim.toLowerCase().includes("sepete")
            ) {
              localStorage.setItem("mdm_cart_task_id", t.id);
            }
            stepsHtml += `<div style="margin-bottom:20px;"><div style="color:#e2e8f0; font-size:13px; margin-bottom:4px; font-weight:600;">1. ${t.adim1_tanim}</div>${actionHtml1}</div>`;
          }

          // -------------------------------------------------------------
          // 2. ADIM KONTROLÜ (GÜNLÜK HAK / ŞİFRE GİR)
          // -------------------------------------------------------------
          if (t.adim2_tanim) {
            totalStepsCount++;

            // İlerleme verisini al
            var prog2 = myP.adim2_ilerleme;
            if (prog2 === undefined || prog2 === null) prog2 = 0;
            else prog2 = parseInt(prog2);

            var isDone2 = prog2 >= 1;
            if (
              (t.title && t.title.toLowerCase().includes("günlük rutin")) ||
              (t.id && t.id.includes("gunluk_rutin"))
            ) {
              var trDate = new Date(
                new Date().toLocaleString("en-US", {
                  timeZone: "Europe/Istanbul",
                })
              );
              var yyyy = trDate.getFullYear();
              var mm = String(trDate.getMonth() + 1).padStart(2, "0");
              var dd = String(trDate.getDate()).padStart(2, "0");
              var todayStr = yyyy + "-" + mm + "-" + dd;

              var userLastDate =
                  APP_STATE.user && APP_STATE.user.songunlukhaktarihi
              ? String(APP_STATE.user.songunlukhaktarihi) // ✅ String() ile sarmaladık, hata çözüldü
              : "";

              // Sadece bu görevde, eğer bugün butona basılmışsa zorla tamamlandı yap
              if (userLastDate && userLastDate.indexOf(todayStr) > -1) {
                isDone2 = true;
              }
            }
            if (isDone2) completedStepsCount++;

            // --- HTML OLUŞTUR ---
            var actionHtml2 = "";

            if (isDone2) {
              // Eğer tamamlandıysa YEŞİL TİK göster
              actionHtml2 = `<div style="margin-top:5px; padding:8px; background:rgba(16, 185, 129, 0.1); border:1px solid rgba(16, 185, 129, 0.3); border-radius:6px; color:#34d399; font-size:11px; font-weight:bold; text-align:center;">✅ TAMAMLANDI</div>`;
            }
            else if (t.id === "gorev_google_maps" || t.adim2_gorevtipi === "manuel_onay") {
              actionHtml2 = `
<button id="btn-verify-${t.id}" onclick="ModumApp.verifyGoogleTask('${t.id}')" 
style="width:100%; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; padding:10px; border-radius:8px; margin-top:5px; cursor:pointer; font-weight:bold; box-shadow:0 4px 10px rgba(16,185,129,0.3);">
<i class="fas fa-check-double"></i> Yorum Yaptım, Kontrol Et
  </button>
<div style="font-size:10px; color:#94a3b8; text-align:center; margin-top:5px;">*Sistem 5 saniye içinde doğrular.</div>
`;
            }
            // 🔥 YENİ EKLENEN: Davet Görevi İse Referans Penceresini Aç
            else if (
              t.adim2_gorevtipi === "referans_yap" ||
              (t.adim2_tanim && t.adim2_tanim.toLowerCase().includes("davet"))
            ) {
              actionHtml2 = `<button onclick="ModumApp.openAffiliateModal()" style="width:100%; background:#8b5cf6; color:white; border:none; padding:8px; border-radius:6px; margin-top:5px; cursor:pointer; font-weight:bold;">Davet Linkini Al 🤝</button>`;
            } else if (t.adim2_gorevtipi === "sifre_gir") {
              // 🔥 ÖZEL KOD: Eğer tip "sifre_gir" ise INPUT + BUTON göster
              // Input ID'sini dinamik yapıyoruz ki her görevin kutusu ayrı olsun
              var inputId = "input-" + t.id + "-s2";
              actionHtml2 = `
<div style="display:flex; gap:5px; margin-top:5px;">
<input type="text" id="${inputId}" placeholder="Şifreyi buraya yaz..." style="flex:1; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:white; font-size:12px;">
<button onclick="ModumApp.submitTaskCode('${t.id}', 2)" style="background:#8b5cf6; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:bold;">GÖNDER</button>
  </div>`;
            } else if (
              t.id === "alisveris_guru_v1" ||
              (t.adim2_tanim && t.adim2_tanim.toLowerCase().includes("destek"))
            ) {
              actionHtml2 = `<button onclick="ModumApp.switchTab('support')" style="width:100%; background:#8b5cf6; color:white; border:none; padding:8px; border-radius:6px; margin-top:5px; cursor:pointer; font-weight:bold;">Değerlendirme Yap 💬</button>`;
            } else {
              // Diğer durumlarda (Sepete Ekle vb.) standart buton
              var btnText2 = "Görevi Yap";
              var btnLink2 = "#";

              if (t.adim2_gorevtipi === "sepete_ekle") {
                btnText2 = "Ürünlere Git 🛍️";
                btnLink2 = "/tum-urunler";
              }

              actionHtml2 = `<button onclick="window.location.href='${btnLink2}'" style="width:100%; background:transparent; border:1px solid #e2e8f0; color:#e2e8f0; padding:6px; border-radius:6px; margin-top:5px; font-size:11px; cursor:pointer;">${btnText2}</button>`;
            }

            stepsHtml += `<div style="padding-top:10px; border-top:1px dashed #334155; margin-top:10px;"><div style="color:#e2e8f0; font-size:13px; font-weight:600;">2. ${t.adim2_tanim}</div>${actionHtml2}</div>`;
          }

          // --- KART DURUMU ---
          var cardStatusText = "İlerleme";
          var cardStatusColor = "#3b82f6";

          if (completedStepsCount >= totalStepsCount && totalStepsCount > 0) {
            cardStatusText = "Tamamlandı ✅";
            cardStatusColor = "#10b981";
          }

          html += `
<div class="mdm-task-card-v3" id="task-card-${t.id}" style="background:#1e293b; border:1px solid #334155; border-radius:12px; margin-bottom:15px; overflow:hidden;">
<div class="mdm-task-header" style="padding:15px; display:flex; align-items:center; gap:12px;">
<div class="mdm-task-icon-box" style="width:40px; height:40px; background:rgba(255,255,255,0.05); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:20px;">📌</div>
<div class="mdm-task-main-info" style="flex:1;">
<div class="mdm-task-title" style="font-weight:700; color:#fff; font-size:14px; margin-bottom:4px;">${title}</div>
<div class="mdm-task-meta" style="font-size:10px; color:#fbbf24; font-weight:bold;">+${reward} XP Ödül</div>
  </div>
<button class="mdm-btn-toggle" 
data-original-text="${cardStatusText}"
style="background:${cardStatusColor}; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;" 
onclick="ModumApp.toggleTask('${t.id}')">
${cardStatusText}
  </button>
  </div>
<div class="mdm-task-body" id="task-body-${t.id}" style="display:none; border-top:1px solid #334155; background:rgba(0,0,0,0.2); padding:15px;">
${stepsHtml}
  </div>
  </div>`;
        });

        container.innerHTML = html;
      }
    }
    // Görev Ekleme Modal'ı içindeki Sıklık Selectbox'ı
    // ID'sinin "task_frequency" (veya senin kodundaki name="frequency") olduğunu varsayıyorum.
    // ID inputunun da id="custom_task_id" olduğunu varsayıyorum. Lütfen kendi kodundaki ID'lerle eşleştir.

    $('select[name="frequency"], #task_frequency').on("change", function () {
      var secim = $(this).val();
      var idInput = $('input[name="custom_task_id"], #custom_task_id');

      // Eğer seçim "Günlük" ise (Value değerine dikkat et, genelde 'daily' veya '1' olabilir)
      // Senin selectbox'ında "Günlük (Her Gece Sıfırlanır)" yazan seçeneğin value değeri neyse onu yazmalısın.
      // Örnek: value="daily" ise:

      if (secim == "daily" || secim == "gunluk") {
        // Rastgele sayı üretip sonuna ekleyelim ki benzersiz olsun
        var randomNum = Math.floor(Math.random() * 1000);
        idInput.val("gunluk_rutin_" + randomNum);

        // Kullanıcı değiştiremesin diye kilitleyebiliriz (opsiyonel)
        // idInput.prop('readonly', true);
      } else {
        // Günlük değilse boşaltabilir veya manuel girişe izin verebilirsin
        idInput.val("");
      }
    });
    // --- 🛒 SEPETE EKLEME DİNLEYİCİSİ (SÜPER YAKALAYICI + HAFIZA KONTROLÜ v4) ---
    window.addEventListener(
      "click",
      function (e) {
        // Tıklanan öğe .add-to-cart-button sınıfına sahip mi? (veya içinde mi?)
        var btn = e.target.closest(".add-to-cart-button");

        // Eğer sınıf ile bulamadıysa, ID ile de şansımızı deneyelim
        if (
          !btn &&
          e.target.id &&
          e.target.id.indexOf("add-to-cart-button") > -1
        ) {
          btn = e.target;
        }

        if (btn) {
          // 🔥 KRİTİK EKLEME: Önce Hafızayı (LocalStorage) Zorla Oku
          // Sayfa yeni açıldıysa değişken boş olabilir, hafızadan taze çekelim.
          var cachedUser = JSON.parse(localStorage.getItem("mdm_user_cache"));
          if (cachedUser && cachedUser.email) {
            APP_STATE.user = cachedUser;
          }

          // Şimdi Kontrol Et
          if (APP_STATE.user && APP_STATE.user.email) {
            // Eğer sepet görevi hafızada yoksa son bir kez bulmayı dene
            var cartTaskId = localStorage.getItem("mdm_cart_task_id");
            if (!cartTaskId) {
              findCartTaskID(); // Acil durum araması
            }

            if (cartTaskId) {
              // Backend'e '2. Adımı Tamamla' sinyali
              fetchApi("complete_task_step", {
                email: APP_STATE.user.email,
                taskId: cartTaskId,
                step: 2,
              }).then((res) => {
                if (res && res.success) {
                  // Listeleri Yenile
                  if (typeof loadTasksData === "function") loadTasksData();
                  updateDataInBackground();
                }
              });
            } else {
              console.log(
                "⚠️ Görev ID bulunamadı (Görevler sekmesini hiç açmadınız mı?)"
              );
            }
          } else {
            console.log(
              "❌ Kullanıcı hala bulunamadı. Lütfen bir kez 'Hesabım' sayfasına tıklayın."
            );
          }
        }
      },
      true
    );
    // --- 🕵️ AJAN: Site Açılınca Sepet Görevini Bul ---
    function findCartTaskID() {
      fetchApi("get_tasks").then((res) => {
        if (res && res.success && res.tasks) {
          res.tasks.forEach((t) => {
            // Görevin 2. adımı "sepete" kelimesi içeriyorsa veya tipi "sepete_ekle" ise
            if (
              (t.adim2_tanim &&
               t.adim2_tanim.toLowerCase().includes("sepete")) ||
              t.adim2_gorevtipi === "sepete_ekle"
            ) {
              localStorage.setItem("mdm_cart_task_id", t.id);
            }
          });
        }
      });
    }
    /* ======================================================
   🏆 MODUMNET ALTIN ÜRÜN AVI (GOLDEN PRODUCT HUNT)
   ====================================================== */
    (function () {
      // Sayfa Yüklendiğinde Çalıştır
      window.addEventListener("load", function () {
        setTimeout(initGoldenHunt, 2000); // 2 saniye bekle ki Faprika her şeyi yüklesin
      });

      async function initGoldenHunt() {
        var sku = detectPageSKU();
        if (!sku) return;

        console.log("🕵️ Altın Ürün Aranıyor: [" + sku + "]");

        var userEmail = "guest";
        var cachedUser = JSON.parse(localStorage.getItem("mdm_user_cache"));
        if (cachedUser && cachedUser.email) userEmail = cachedUser.email;

        try {
          const res = await fetch("https://api-hjen5442oq-uc.a.run.app", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              islem: "check_golden_product",
              email: userEmail,
              sku: sku,
            }),
          });
          const data = await res.json();

          // --- KONSOLDA CEVABI GÖRMEK İÇİN ---
          console.log("📡 Sunucu Cevabı:", data);

          if (data.success && data.isGolden) {
            if (data.isGuest) {
              showGoldenPopup("guest", sku);
            } else if (data.alreadyFound) {
              console.log("✅ Bu ödül zaten alınmış.");
            } else {
              showGoldenPopup("winner", sku, data);
              if (window.ModumApp && window.ModumApp.updateDataInBackground) {
                window.ModumApp.updateDataInBackground();
              }
            }
          } else {
            console.warn("❌ Üzgünüm, bu ürün Altın Ürün listesinde değil.");
          }
        } catch (e) {
          console.error("Bağlantı Hatası:", e);
        }
      }

      // GÜÇLENDİRİLMİŞ SKU BULUCU (Senin Siten İçin Özel)
      function detectPageSKU() {
        // 1. Senin verdiğin HTML yapısı: <span class="value" itemprop="sku">...</span>
        var el = document.querySelector('span[itemprop="sku"]');

        // 2. Eğer bulamazsa alternatif: class="sku" içindeki class="value"
        if (!el) {
          el = document.querySelector(".sku .value");
        }

        if (el && el.innerText) {
          // .trim() komutu baştaki ve sondaki boşlukları siler!
          return el.innerText.trim();
        }

        // 3. Yedek (Hidden Inputlar)
        var el3 = document.querySelector('input[name="ProductCode"]');
        if (el3) return el3.value.trim();

        return null;
      }

      // 🔥 ALTIN POPUP GÖSTERİCİ
      function showGoldenPopup(type, sku, reward) {
        // Varsa eskileri sil
        var old = document.getElementById("mdm-gold-modal");
        if (old) old.remove();

        // İçerik Hazırla
        let title, desc, btnText, btnAction, iconAnim;

        if (type === "guest") {
          title = "HAZİNEYİ BULDUN!";
          desc = `Tebrikler! Gizli <b>Altın Ürünü</b> (${sku}) buldun.<br>Ancak <b>300 XP</b> ödülünü almak için giriş yapmalısın.`;
          btnText = "GİRİŞ YAP VE ÖDÜLÜ AL 🚀";
          btnAction = "window.location.href='/kullanici-giris'"; // Yönlendirme
          iconAnim = "🔒";
        } else {
          title = "TEBRİKLER! 300 XP KAZANDIN!";
          desc = `Muhteşem! <b>Altın Ürünü</b> buldun ve görevi tamamladın.<br><br>
<span style="color:#10b981; font-weight:bold;">+150 XP</span> Ürün Bonusu<br>
<span style="color:#10b981; font-weight:bold;">+150 XP</span> Görev Tamamlama<br>
<hr style="border:0; border-top:1px dashed #ccc; margin:10px 0;">
Toplam: <b style="font-size:18px; color:#d97706;">+300 XP</b> Hesabına Yüklendi!`;
          btnText = "HARİKA! DEVAM ET 😎";
          btnAction = "document.getElementById('mdm-gold-modal').remove()";
          iconAnim = "🏆";
        }

        // HTML & CSS
        var html = `
<div id="mdm-gold-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px);">
<div style="background:linear-gradient(135deg, #fffbeb, #fff); width:90%; max-width:450px; padding:30px; border-radius:24px; text-align:center; position:relative; box-shadow:0 0 60px rgba(251, 191, 36, 0.6); border:4px solid #f59e0b; animation: mdmPopIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">

<!-- Konfeti Efekti -->
<div style="position:absolute; top:-20px; left:50%; transform:translateX(-50%); font-size:60px; filter:drop-shadow(0 10px 10px rgba(0,0,0,0.2));">
${iconAnim}
  </div>

<div style="margin-top:40px;">
<h2 style="color:#b45309; font-weight:900; font-size:24px; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:1px; line-height:1.2;">${title}</h2>
<div style="color:#4b5563; font-size:14px; line-height:1.6; margin-bottom:25px;">${desc}</div>

<button onclick="${btnAction}" style="background:linear-gradient(to bottom, #f59e0b, #d97706); color:white; border:none; padding:15px 30px; border-radius:50px; font-weight:800; font-size:14px; cursor:pointer; width:100%; box-shadow:0 5px 15px rgba(217, 119, 6, 0.4); transition:0.2s; text-transform:uppercase;">
${btnText}
  </button>
  </div>

<!-- Kapatma X -->
<div onclick="document.getElementById('mdm-gold-modal').remove()" style="position:absolute; top:15px; right:15px; cursor:pointer; color:#9ca3af; font-size:24px;">&times;</div>
  </div>
  </div>
<style>
@keyframes mdmPopIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
  </style>
`;

        var div = document.createElement("div");
        div.innerHTML = html;
        document.body.appendChild(div);
      }
    })();
    /* ======================================================
       🎂 DOĞUM GÜNÜ YAKALAYICI (FAPRIKA SELECT YAPISINA ÖZEL)
       ====================================================== */
    (function () {
      // Sadece "Bilgilerim" veya "Üye Bilgi" sayfalarında çalış
      if (
        window.location.href.indexOf("/hesabim/bilgilerim") > -1 ||
        window.location.href.indexOf("/Uye/BilgiGuncelle") > -1 ||
        window.location.href.indexOf("uyelik-bilgilerim") > -1
      ) {
        // 1. Sayfa yüklenince kontrol et
        window.addEventListener("load", function () {
          setTimeout(checkAndSyncBirthday, 1000);
        });

        // 2. Müşteri kutulardan seçim yaparsa anlık kontrol et (Change Event)
        document.addEventListener("change", function (e) {
          if (
            e.target.name === "DateOfBirthDay" ||
            e.target.name === "DateOfBirthMonth" ||
            e.target.name === "DateOfBirthYear"
          ) {
            setTimeout(checkAndSyncBirthday, 500);
          }
        });

        // 3. Kaydet butonuna basınca da kontrol et
        document.addEventListener("click", function (e) {
          // Butonun içinde "Kaydet" veya "Güncelle" yazıyorsa
          var txt = e.target.innerText || e.target.value || "";
          if (txt.includes("Kaydet") || txt.includes("Güncelle")) {
            setTimeout(checkAndSyncBirthday, 2000);
          }
        });
      }

      async function checkAndSyncBirthday() {
        // Senin attığın HTML yapısındaki Select'leri buluyoruz
        var dayEl = document.querySelector('select[name="DateOfBirthDay"]');
        var monthEl = document.querySelector('select[name="DateOfBirthMonth"]');
        var yearEl = document.querySelector('select[name="DateOfBirthYear"]');

        // Eğer elementler sayfada yoksa dur
        if (!dayEl || !monthEl || !yearEl) return;

        var d = dayEl.value;
        var m = monthEl.value;
        var y = yearEl.value;

        // "0" değeri "Gün", "Ay", "Yıl" yazısıdır. Seçim yapılmamış demektir.
        // Hepsi seçiliyse işlem yap
        if (d !== "0" && m !== "0" && y !== "0") {
          // Tarihi birleştir: "26.8.1997" formatı
          var birthDate = d + "." + m + "." + y;

          var user = JSON.parse(localStorage.getItem("mdm_user_cache"));

          // Kullanıcı giriş yapmışsa gönder
          if (user && user.email) {
            // Mükerrer gönderimi önlemek için ufak bir kontrol (Opsiyonel ama iyi olur)
            if (localStorage.getItem("mdm_bd_sent") === birthDate) return;

            console.log("🎂 Doğum Tarihi Tespit Edildi: " + birthDate);

            // Backend'e gönder
            fetch("https://api-hjen5442oq-uc.a.run.app", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                islem: "register_birthday",
                email: user.email,
                birthDate: birthDate,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
              if (data.success) {
                console.log("✅ Doğum günü işlendi: " + data.message);
                localStorage.setItem("mdm_bd_sent", birthDate); // Tarayıcıya not al

                // Widget'ı yenile (Puanı görsün)
                if (
                  window.ModumApp &&
                  window.ModumApp.updateDataInBackground
                ) {
                  window.ModumApp.updateDataInBackground();
                }
              }
            });
          }
        }
      }
    })();
    // --- 📡 OTOMATİK BİLDİRİM TARAYICI (HER 10 SANİYEDE BİR) ---
    setInterval(function () {
      // Sadece kullanıcı giriş yapmışsa ve fonksiyon yüklüyse
      if (
        APP_STATE.user &&
        APP_STATE.user.email &&
        window.ModumApp &&
        ModumApp.loadSupportHistory
      ) {
        // true parametresi = Sessiz Mod (Sadece kırmızı nokta kontrolü)
        ModumApp.loadSupportHistory(true);
      }
    }, 10000); // 10 saniyede bir
    /* ======================================================
   🎬 SİNEMATİK INTRO (RENK + SLOGAN DEĞİŞTİREN FİNAL VERSİYON)
   ====================================================== */
    (function runCinematicIntro() {
      // 1. SADECE ÇEKİLİŞLER SAYFASINDA ÇALIŞSIN
      if (!window.location.href.includes("cekilisler")) return;

      // 2. ANA İÇERİĞİ GİZLE
      var rootEl = document.getElementById("modum-firebase-test-root");
      if (rootEl) rootEl.style.opacity = "0";

      // 3. TEMA RENGİNİ VE SLOGANINI BELİRLE
      var savedTheme = localStorage.getItem("mdm_active_theme") || "default";

      // Konfigürasyon: Renkler ve Alt Yazılar
      var themeConfig = {
        default: {
          color: "#8b5cf6",
          glow: "rgba(139, 92, 246, 0.8)",
          text: "KEYİFLİ ALIŞVERİŞLER",
        },
        newyear: {
          color: "#ef4444",
          glow: "rgba(239, 68, 68, 0.8)",
          text: "🎄 YENİ YILINIZ KUTLU OLSUN 🎄",
        },
        valentines: {
          color: "#ec4899",
          glow: "rgba(236, 72, 153, 0.8)",
          text: "💖 AŞK DOLU FIRSATLAR 💖",
        },
        ramadan: {
          color: "#fbbf24",
          glow: "rgba(251, 191, 36, 0.8)",
          text: "🌙 HAYIRLI RAMAZANLAR 🌙",
        },
        summer: {
          color: "#f97316",
          glow: "rgba(249, 115, 22, 0.8)",
          text: "☀️ YAZIN EN SICAK FIRSATLARI ☀️",
        },
      };

      // Seçilen ayarı al (Yoksa varsayılanı al)
      var activeStyle = themeConfig[savedTheme] || themeConfig.default;

      // 4. CSS STİLLERİ
      var style = document.createElement("style");
      style.innerHTML = `
#mdm-intro-overlay {
position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
background: #0f172a; 
z-index: 2147483647; 
display: flex; flex-direction: column; align-items: center; justify-content: center;
overflow: hidden;
}
#mdm-intro-overlay.fade-out {
animation: slideUpCurtain 0.8s cubic-bezier(0.7, 0, 0.3, 1) forwards;
}
.mdm-intro-box {
position: relative; display: flex; align-items: center; justify-content: center;
}
.mdm-intro-m {
font-family: 'Inter', sans-serif;
font-weight: 900;
font-size: 80px;
color: ${activeStyle.color}; 
text-shadow: 0 0 30px ${activeStyle.glow};
opacity: 0;
transform: translateY(-150px) scale(4);
animation: dropM 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
.mdm-intro-text {
font-family: 'Inter', sans-serif;
font-weight: 800;
font-size: 80px;
color: #fff;
overflow: hidden;
white-space: nowrap;
width: 0;
opacity: 0;
margin-left: 2px;
animation: expandText 0.8s ease-out 0.6s forwards;
}
.mdm-intro-slogan {
margin-top: 20px;
font-family: 'Outfit', sans-serif;
font-size: 14px;
letter-spacing: 6px;
color: #94a3b8;
text-transform: uppercase;
opacity: 0;
transform: translateY(20px);
animation: fadeUp 0.6s ease-out 0.8s forwards;
}
/* 🔥 YENİ EKLENEN ALT SLOGAN STİLİ */
.mdm-intro-sub {
margin-top: 5px;
font-family: 'Outfit', sans-serif;
font-size: 16px;
letter-spacing: 2px;
color: ${activeStyle.color}; /* Tema Rengi */
font-weight: 800;
text-transform: uppercase;
opacity: 0;
transform: translateY(20px);
text-shadow: 0 0 10px ${activeStyle.glow};
animation: fadeUp 0.6s ease-out 1.1s forwards; /* Ana slogandan sonra gelir */
}

@keyframes dropM {
0% { opacity: 0; transform: translateY(-200px) scale(5); filter: blur(20px); }
100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes expandText {
0% { width: 0; opacity: 0; }
100% { width: 450px; opacity: 1; }
}
@keyframes fadeUp {
to { opacity: 1; transform: translateY(0); }
}
@keyframes slideUpCurtain {
0% { transform: translateY(0); }
100% { transform: translateY(-100%); border-radius: 0 0 50% 50%; }
}
@media (max-width: 768px) {
.mdm-intro-m { font-size: 32px !important; margin-right: 2px !important; }
.mdm-intro-text { font-size: 32px !important; }
.mdm-intro-slogan { font-size: 8px !important; letter-spacing: 2px !important; text-align: center !important; width: 100% !important; padding: 0 10px !important; margin-top: 10px !important; }
.mdm-intro-sub { font-size: 10px !important; letter-spacing: 1px !important; text-align: center !important; }
@keyframes expandText { 
0% { width: 0; opacity: 0; }
100% { width: auto; opacity: 1; max-width: 70vw; }
}
.mdm-intro-text { animation: expandText 0.8s ease-out 0.6s forwards !important; }
.mdm-intro-slogan { animation: fadeUp 0.8s ease-out 1.5s forwards !important; }
.mdm-intro-box { justify-content: center !important; width: 100% !important; }
}
`;
      document.head.appendChild(style);

      // 5. HTML YAPISI (YENİ SLOGAN EKLENDİ)
      var overlay = document.createElement("div");
      overlay.id = "mdm-intro-overlay";
      overlay.innerHTML = `
<div class="mdm-intro-box">
<div class="mdm-intro-m">M</div>
<div class="mdm-intro-text">ODUMNET</div>
  </div>
<div class="mdm-intro-slogan">FIRSAT DÜNYASINA HOŞGELDİNİZ</div>
<div class="mdm-intro-sub">${activeStyle.text}</div> <!-- 🔥 DİNAMİK YAZI -->
`;
      document.body.appendChild(overlay);

      // 6. ZAMANLAYICI
      // Süreyi biraz uzattık (3 saniye) ki alttaki yazı da okunabilsin
      setTimeout(function () {
        overlay.classList.add("fade-out");

        // Perdeyi kaldır, siteyi göster (BUNU EKLEMEN ŞART)
        document.documentElement.classList.remove("intro-active");

        if (rootEl) {
          rootEl.style.transition = "opacity 1s ease-in";
          rootEl.style.opacity = "1";
        }
        setTimeout(function () {
          overlay.remove();
        }, 900);
      }, 2000); // Intro süresi
    })();
    // ======================================================
    // 🛡️ GÜVENLİK DUVARI ARAYÜZÜ (SPAM KORUMASI)
    // ======================================================
    (function setupSecurityMonitor() {
      // Orijinal fetch fonksiyonunu yedekle
      const originalFetch = window.fetch;

      window.fetch = async function (...args) {
        const response = await originalFetch(...args);

        // Yanıtı kopyala (okumak için)
        const clone = response.clone();

        clone
          .json()
          .then((data) => {
          // Eğer sunucu "SPAM_LOCK" hatası döndürdüyse
          if (data && data.error === "SPAM_LOCK") {
            console.warn("⛔ GÜVENLİK KİLİDİ AKTİF!");

            // Sadece Çekilişler sayfasındaysak kilitle (İsteğe göre kaldırılabilir)
            if (window.location.href.includes("cekilisler") || true) {
              lockScreen();
            }
          }
        })
          .catch(() => {}); // JSON değilse umursama

        return response;
      };

      function lockScreen() {
        // Varsa eski kilidi kaldır (üst üste binmesin)
        const oldLock = document.getElementById("mdm-security-lock");
        if (oldLock) return;

        document.body.style.overflow = "hidden"; // Kaydırmayı kapat

        const lockHTML = `
<div id="mdm-security-lock" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.98); z-index:9999999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-family:sans-serif; text-align:center; padding:20px;">
<div style="font-size:80px; margin-bottom:20px;">🛡️</div>
<h1 style="color:#ef4444; font-size:36px; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:2px;">Sistem Kilitlendi</h1>
<p style="color:#cbd5e1; font-size:18px; max-width:600px; line-height:1.6;">
Güvenlik protokolü gereği IP adresinizden şüpheli yoğunlukta işlem tespit edildi.
<br><br>
<span style="color:#fbbf24; font-weight:bold;">Sistem güvenliği için erişiminiz 24 saat süreyle durdurulmuştur.</span>
  </p>
<div style="margin-top:40px; padding:15px 30px; background:rgba(255,255,255,0.1); border-radius:10px; font-size:14px; color:#94a3b8;">
Hata olduğunu düşünüyorsanız: info@modum.tr
  </div>
  </div>
`;

        const div = document.createElement("div");
        div.innerHTML = lockHTML;
        document.body.appendChild(div);
      }
    })();
    function initGoldenHunt() {}

    // --- 🔥 YENİ: ÇERÇEVE DETAY POP-UP (POP-UP AÇICI) ---
    ModumApp.openFrameDetail = function (frameCode) {
      // Veritabanından bilgiyi çek (yoksa varsayılan)
      // FRAMES_DB tanımlı değilse hata vermesin diye kontrol ekledik
      var dbEntry =
          typeof FRAMES_DB !== "undefined" ? FRAMES_DB[frameCode] : null;
      var fInfo = dbEntry || {
        t: frameCode.replace("frame-", "").toUpperCase() + " ÇERÇEVE",
        d: "Özel tasarım avatar çerçevesi.",
      };

      var old = document.getElementById("mdm-frame-modal");
      if (old) old.remove();

      var html = `
<div id="mdm-frame-modal" class="mdm-modal active" style="display:flex; z-index:2147483647; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="width:90%; max-width:320px; text-align:center; padding:30px; border-radius:24px; background:#1e293b; border:1px solid #334155; position:relative; box-shadow:0 20px 50px rgba(0,0,0,0.5);">

<div onclick="document.getElementById('mdm-frame-modal').remove()" style="position:absolute; top:15px; right:15px; color:#64748b; cursor:pointer; font-size:24px;">&times;</div>

<!-- ÖNİZLEME -->
<div style="width:100px; height:100px; margin:0 auto 20px; position:relative; display:flex; align-items:center; justify-content:center;">
<div class="mdm-avatar-frame ${frameCode}" style="top:-5px; left:-5px; right:-5px; bottom:-5px; border-width:4px;"></div>
<div style="width:100%; height:100%; background:#0f172a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:40px;">👤</div>
  </div>

<h3 style="color:#fff; margin:0 0 10px 0; font-size:18px;">${fInfo.t}</h3>
<p style="color:#94a3b8; font-size:13px; line-height:1.5; margin-bottom:25px;">${fInfo.d}</p>

<button onclick="ModumApp.equipFrame('${frameCode}'); document.getElementById('mdm-frame-modal').remove();" 
style="background:linear-gradient(135deg, #3b82f6, #2563eb); color:white; border:none; padding:12px; width:100%; border-radius:12px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow:0 4px 15px rgba(37,99,235,0.4); display:flex; align-items:center; justify-content:center; gap:8px;">
ÇERÇEVE YAP <i class="fas fa-check-circle"></i>
  </button>

  </div>
  </div>`;

      var div = document.createElement("div");
      div.innerHTML = html;
      document.body.appendChild(div);
    };

    // --- ÇERÇEVE TAKMA (HIZLI VE SORUNSUZ VERSİYON) ---
    ModumApp.equipFrame = async function (frameCode) {
      // 1. Giriş Kontrolü
      if (!APP_STATE.user || !APP_STATE.user.email)
        return alert("Lütfen giriş yapın.");

      // 2. GÖRSELİ ANINDA GÜNCELLE (Backend cevabını bekleme - Optimistic UI)
      // Global durumu güncelle
      APP_STATE.user.selectedFrame = frameCode;

      // Tarayıcı hafızasını (Cache) güncelle
      localStorage.setItem("mdm_user_cache", JSON.stringify(APP_STATE.user));

      // Profili hemen yeniden çiz (Kullanıcı değişikliği anında görsün)
      var container = document.getElementById("mdm-profile-container");
      if (container) {
        container.innerHTML = renderProfileTab(APP_STATE.user);
      }

      // Kullanıcıya bilgi ver (Opsiyonel, zaten görsel değişiyor)
      // alert("✅ Çerçeve güncellendi!");

      // 3. ARKA PLANDA SUNUCUYA KAYDET
      try {
        await fetchApi("equip_avatar_frame", {
          email: APP_STATE.user.email,
          frameCode: frameCode,
        });
        fetchApi("complete_task", {
          email: APP_STATE.user.email,
          taskId: "gorev_profil_mimari" // Backend'de oluşturduğumuz ID
        }).then(res => {
          if(res && res.success) {
            // Eğer ilk kez yapıyorsa bildirim göster
            alert("🎉 TEBRİKLER! 'Profil Mimarı' görevini tamamladın ve +250 XP kazandın!");
            updateDataInBackground();
          }
        });

        // 🔥 KRİTİK DÜZELTME: updateDataInBackground'ı hemen çağırma!
        // Sunucunun veritabanına yazması 1-2 saniye sürebilir.
        // Hemen çağırırsak eski veriyi çeker ve çerçeve kaybolur.
        // O yüzden sadece sessizce kaydediyoruz, listeyi yenilemeye gerek yok.
        console.log("Çerçeve sunucuya başarıyla işlendi.");
      } catch (e) {
        console.error("Çerçeve kayıt hatası:", e);
        // Hata olursa kullanıcıya söyleyebiliriz, ama görsel bozulmasın diye ellemiyoruz
      }
    };
    // --- 👇 BUNLARI DOSYANIN EN ALTINA YAPIŞTIR 👇 ---

    // 1. Profil Düzenleme Penceresini Aç
    ModumApp.openEditProfile = function() {
      var user = APP_STATE.user;

      // Avatar Seçenekleri (En başta tanımladığın AVATAR_LIBRARY)
      var avatarOptionsHtml = "";
      if(typeof AVATAR_LIBRARY !== 'undefined') {
        avatarOptionsHtml = AVATAR_LIBRARY.map(url => 
                                               `<img src="${url}" onclick="document.getElementById('new-avatar-input').value='${url}'; this.parentElement.querySelectorAll('img').forEach(i=>i.style.border='2px solid transparent'); this.style.border='3px solid #10b981';" 
style="width:50px; height:50px; border-radius:50%; cursor:pointer; border:2px solid transparent;">`
                                              ).join("");
      } else {
        avatarOptionsHtml = "<div style='color:#ccc; font-size:12px;'>Avatar kütüphanesi yüklenemedi.</div>";
      }

      var modalHtml = `
<div id="mdm-edit-modal" class="mdm-modal active" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center;">
<div class="mdm-modal-content" style="background:#1e293b; width:90%; max-width:400px; padding:20px; border-radius:15px; border:1px solid #334155;">
<h3 style="color:#fff; margin-bottom:15px; text-align:center;">Profili Düzenle</h3>

<label style="color:#94a3b8; font-size:12px; display:block; margin-bottom:5px;">Biyografi (Hakkında)</label>
<textarea id="edit-bio-input" style="width:100%; background:#0f172a; border:1px solid #334155; color:#fff; padding:10px; border-radius:8px; margin-bottom:15px; font-family:inherit;" rows="3" placeholder="Kendinden bahset...">${user.bio || ""}</textarea>

<label style="color:#94a3b8; font-size:12px; display:block; margin-bottom:5px;">Avatar Değiştir</label>
<input type="hidden" id="new-avatar-input" value="${user.selectedAvatar || ''}">
<div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px; max-height:150px; overflow-y:auto; padding:5px; background:#0f172a; border-radius:8px;">
${avatarOptionsHtml}
  </div>

<button onclick="ModumApp.saveProfile()" style="width:100%; background:#10b981; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; margin-bottom:10px;">KAYDET</button>
<button onclick="document.getElementById('mdm-edit-modal').remove()" style="width:100%; background:transparent; color:#ef4444; border:1px solid #ef4444; padding:10px; border-radius:8px; cursor:pointer;">İptal</button>
  </div>
  </div>
`;

      // Varsa eskisini sil
      var old = document.getElementById('mdm-edit-modal');
      if(old) old.remove();

      document.body.insertAdjacentHTML("beforeend", modalHtml);
    };

    // 2. Kaydetme Fonksiyonu
    ModumApp.saveProfile = async function() {
      var newBio = document.getElementById("edit-bio-input").value;
      var newAvatar = document.getElementById("new-avatar-input").value;

      // Backend'e Gönder
      // Not: fetchApi fonksiyonun faprika.js içinde tanımlı olduğunu varsayıyoruz.
      var res = await fetchApi("update_user_profile", {
        email: APP_STATE.user.email,
        newBio: newBio,
        newAvatar: newAvatar
      });

      if(res && res.success) {
        alert("Profil güncellendi! ✅");
        document.getElementById("mdm-edit-modal").remove();

        // Yerel değişkeni güncelle
        APP_STATE.user.bio = newBio;
        if(newAvatar) APP_STATE.user.selectedAvatar = newAvatar;

        // Profili yeniden çiz (Sayfa yenilemeden)
        if(document.getElementById("mdm-profile-container")) {
          document.getElementById("mdm-profile-container").innerHTML = renderProfileTab(APP_STATE.user);
        } else {
          // Container id farklıysa sayfayı yenile
          window.location.reload();
        }
      } else {
        alert("Hata: " + (res ? res.message : "Sunucu yanıt vermedi."));
      }
    };
  })(); // Bu satır en altta kalsın
</script>
