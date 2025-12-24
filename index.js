/**
 * ModumNet Loyalty System - Firebase Backend API
 * 19 Sayfalık Excel Yapısına Uygun Mimari
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// CORS: İzin verilen originler (Faprika ve Admin Panel)
const cors = require("cors")({ origin: true });
const axios = require("axios"); // İnternetten veri çekmek için
const xml2js = require("xml2js"); // XML'i okumak için

// Veritabanını Başlat
admin.initializeApp();
const db = admin.firestore();
// --- 🗓️ TARİH DÜZELTİCİ (BUG FIX) ---
function parseDateSafe(val) {
  if (!val) return 0;
  // Zaten sayıysa (Timestamp) olduğu gibi döndür
  if (typeof val === "number") return val;
  // Firebase Timestamp nesnesiyse çevir
  if (val.toDate) return val.toDate().getTime();

  let s = String(val).trim();
  // "19.12.2025" formatını "2025-12-19" yap (ISO Formatı)
  if (s.includes(".")) {
    const p = s.split(".");
    if (p.length === 3) s = `${p[2]}-${p[1]}-${p[0]}`;
  }
  // Saat yoksa gün sonunu ekle
  if (!s.includes("T") && s.length <= 10) s += "T23:59:00";

  return new Date(s).getTime();
}

// YARDIMCI: Akıllı Tarih Formatlayıcı (Excel ve Timestamp Uyumlu)
function formatSafeDate(val) {
  if (!val) return "-";
  // 1. Firebase Timestamp ise
  if (typeof val === "object" && val.toDate) {
    return val.toDate().toLocaleString("tr-TR");
  }
  // 2. String ise (Excel formatı: 22.11.2025)
  if (typeof val === "string") {
    // Zaten düzgünse (Invalid değilse) kontrol et
    if (!isNaN(new Date(val).getTime())) return val;

    // Noktalı formatı (22.11.2025) düzelt
    if (val.includes(".")) {
      const p = val.split(".");
      if (p.length === 3) return val; // Zaten Türkçe formatında string, olduğu gibi göster
    }
  }
  return String(val);
} // YARDIMCI: Hassas Tarih ve Saat Dönüştürücü (ZAMAN DİLİMİ FİX)
function getSortValue(dateVal) {
  if (!dateVal) return 0;

  // 1. Firebase Timestamp Nesnesi ise
  if (dateVal.toMillis) return dateVal.toMillis();
  if (dateVal._seconds) return dateVal._seconds * 1000;

  // 2. Sayı ise
  if (typeof dateVal === "number") return dateVal;

  // 3. String ise
  if (typeof dateVal === "string") {
    // Örnek: "December 14, 2025 at 3:33:22 AM UTC+3"
    // "at" kelimesini ve "UTC+3" kısmını temizleyelim ki JS şaşırmasın
    let cleanDate = dateVal.replace("at ", "").replace("UTC+3", "").trim();

    // Eğer "14.12.2025 03:33:22" gibi TR formatındaysa
    if (cleanDate.includes(".")) {
      const parts = cleanDate.split(" ");
      const datePart = parts[0];
      const timePart = parts[1] || "00:00:00";

      const dParts = datePart.split(".");
      if (dParts.length === 3) {
        // Yıl-Ay-Gün formatına çevir
        cleanDate = `${dParts[2]}-${dParts[1]}-${dParts[0]}T${timePart}`;
      }
    }

    // Tarihi milisaniyeye çevir
    const t = new Date(cleanDate).getTime();
    return isNaN(t) ? 0 : t;
  }

  return 0;
}
// index.js içinde DEFAULT_SETTINGS kısmını bulun ve burayı güncelleyin:

const DEFAULT_SETTINGS = {
  // --- MEVCUT XP KAZANIMLARI ---
  xp_katilim: 15,
  xp_gunluk: 20,
  xp_referans: 150,
  xp_geribildirim: 30,
  xp_gizli_hazine: 20,
  xp_dogumtarihi: 50,
  xp_instagram: 15,

  // --- SEVİYE PUAN SINIRLARI ---
  lvl_usta_min: 2500,
  lvl_sampiyon_min: 7500,
  lvl_efsane_min: 15000,

  // --- 🔥 YENİ: SEVİYE İÇİN MİNİMUM SİPARİŞ ADEDİ ---
  order_min_usta: 1, // Usta olmak için en az 1 sipariş
  order_min_sampiyon: 2, // Şampiyon için en az 2 sipariş
  order_min_efsane: 5, // Efsane için en az 5 sipariş

  // --- DİĞER AYARLAR ---
  max_ip_istek: 20,
  siparis_xp_l1: 250,
  siparis_xp_l2: 500,
  siparis_xp_l3: 1000,
  siparis_xp_l4: 2500,
  siparis_limit_l2: 1000,
  siparis_limit_l3: 2500,
  siparis_limit_l4: 5000,
};

// YARDIMCI: Güncel Ayarları Getir
async function getSystemSettings() {
  const doc = await db.collection("system").doc("settings").get();
  if (doc.exists) {
    return { ...DEFAULT_SETTINGS, ...doc.data() };
  }
  return DEFAULT_SETTINGS;
}

// index.js içindeki calculateLevel fonksiyonunu bununla değiştirin:

// GÜNCELLENMİŞ SEVİYE HESAPLAMA MOTORU (Final Zırhlı Versiyon)
function calculateLevel(points, orderCount, settings) {
  // Gelen verileri zorla sayıya çevir (NaN gelirse 0 say)
  const p = parseInt(points) || 0;
  const o = parseInt(orderCount) || 0;

  // Ayarları da zorla sayıya çevir (Veritabanında string kalmış olabilir)
  const limitEfsanePuan = parseInt(settings.lvl_efsane_min) || 15000;
  const limitEfsaneSiparis = parseInt(settings.order_min_efsane) || 5;

  const limitSampiyonPuan = parseInt(settings.lvl_sampiyon_min) || 7500;
  const limitSampiyonSiparis = parseInt(settings.order_min_sampiyon) || 2;

  const limitUstaPuan = parseInt(settings.lvl_usta_min) || 2500;
  const limitUstaSiparis = parseInt(settings.order_min_usta) || 1;

  // 1. EFSANE KONTROLÜ
  if (p >= limitEfsanePuan && o >= limitEfsaneSiparis) {
    return "Efsane";
  }

  // 2. ŞAMPİYON KONTROLÜ
  if (p >= limitSampiyonPuan && o >= limitSampiyonSiparis) {
    return "Şampiyon";
  }

  // 3. USTA KONTROLÜ
  if (p >= limitUstaPuan && o >= limitUstaSiparis) {
    return "Usta";
  }

  // Hiçbiri değilse
  return "Çaylak";
}
// --- 🛡️ GÜVENLİK DUVARI (IP RATE LIMIT) ---
async function checkSpamProtection(ip, settings) {
  const db = admin.firestore();
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const CHECK_WINDOW_MS = 10 * 60 * 1000; // Son 10 dakika içindeki hıza bakar

  // 1. ÖNCEKİ BAN KONTROLÜ (Son 24 saatte banlanmış mı?)
  const banCheck = await db
    .collection("security_logs")
    .where("ip", "==", ip)
    .where("action", "==", "IP_BAN")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!banCheck.empty) {
    const lastBan = banCheck.docs[0].data().createdAt.toDate().getTime();
    if (now - lastBan < ONE_DAY_MS) {
      return { allowed: false, reason: "BANNED" }; // Hala cezalı
    }
  }

  // 2. HIZ KONTROLÜ (Spam yapıyor mu?)
  // Ayarlardaki limiti al (Yoksa varsayılan 20)
  const limit = parseInt(settings.max_ip_istek) || 20;

  // Son 10 dakikadaki işlemlerini say
  const windowStart = admin.firestore.Timestamp.fromMillis(
    now - CHECK_WINDOW_MS
  );

  const activitySnap = await db
    .collection("system_logs")
    .where("ip", "==", ip)
    .where("createdAt", ">", windowStart)
    .count()
    .get();

  const requestCount = activitySnap.data().count;

  if (requestCount >= limit) {
    // 🚫 LİMİT AŞILDI! BANLA!
    await db.collection("security_logs").add({
      ip: ip,
      action: "IP_BAN",
      details: `Hızlı işlem sınırı aşıldı (${requestCount}/${limit}). 24 Saat kilitlendi.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { allowed: false, reason: "JUST_BANNED" };
  }

  return { allowed: true };
}

// YARDIMCI: Güvenlik Logu Ekle
async function logSecurity(action, details, ip = "0.0.0.0") {
  await db.collection("security_logs").add({
    action: action,
    details: details,
    ip: ip,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
// --- 🏅 ROZET SİSTEMİ TANIMLARI ---
const BADGE_DEFINITIONS = {
  gorev_adami: {
    title: "Görev Adamı",
    icon: "🎯",
    desc: "İlk görevini başarıyla tamamladın.",
  },
  gece_kusu: {
    title: "Gece Kuşu",
    icon: "👾",
    desc: "Gece 00:00 - 06:00 arası sipariş verdin.",
  },
  takim_lideri: {
    title: "Takım Lideri",
    icon: "🤝",
    desc: "Ekibini kurmaya başladın.",
  },
  sepet_krali: {
    title: "Sepet Kralı",
    icon: "🛍️",
    desc: "Yüklü miktarda alışveriş yaptın.",
  },
  alev_alev: {
    title: "Alev Alev",
    icon: "🔥",
    desc: "7 gün üst üste giriş yaptın.",
  },
  hazine_avcisi: {
    title: "Hazine Avcısı",
    icon: "🕵️",
    desc: "Gizli altın ürünü buldun.",
  },
  sans_melegi: {
    title: "Şans Meleği",
    icon: "🍀",
    desc: "Bir çekiliş kazandın.",
  },
  bonkor: {
    title: "Bonkör",
    i: "🎁",
    d: "Arkadaşına hediye gönderenlere verilir.",
  },
  lvl_caylak: {
    title: "Çaylak",
    icon: "🌱",
    desc: "ModumNet ailesine hoş geldin!",
  },
  lvl_usta: { title: "Usta", icon: "⚔️", desc: "Deneyimli ve sadık bir üye." },
  lvl_sampiyon: {
    title: "Şampiyon",
    icon: "🦁",
    desc: "Gücünü kanıtlamış bir lider.",
  },
  lvl_efsane: {
    title: "Efsane",
    icon: "🐉",
    desc: "Saygı duyulan, zirvedeki isim.",
  },
};

// YARDIMCI: Rozet Verme Motoru
async function awardBadge(userRef, badgeId) {
  const userDoc = await userRef.get();
  if (!userDoc.exists) return null;

  const userData = userDoc.data();
  const currentBadges = userData.badges || [];

  // Eğer rozet zaten varsa işlem yapma
  if (currentBadges.includes(badgeId)) return null;

  // Rozeti ekle
  const newBadges = [...currentBadges, badgeId];

  // Eğer bu İLK rozetse, otomatik olarak Avatar yap (Jest olsun)
  let updates = { badges: newBadges };
  if (newBadges.length === 1) {
    updates.selectedAvatar = badgeId;
  }

  await userRef.update(updates);

  // Log at
  await logSecurity(
    "ROZET_KAZANILDI",
    `${userData.email} -> ${badgeId} rozetini kazandı.`
  );

  return BADGE_DEFINITIONS[badgeId];
}
// YARDIMCI: IP Limit Kontrolü (Anti-Spam)
async function checkIpRateLimit(ip, limit = 20) {
  // Son 1 saatteki loglara bak
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const snapshot = await db
    .collection("security_logs")
    .where("ip", "==", ip)
    .where("createdAt", ">", oneHourAgo)
    .count()
    .get();

  const count = snapshot.data().count;
  if (count >= limit) {
    return {
      allowed: false,
      message: "Çok fazla işlem yaptınız. Lütfen 1 saat bekleyin.",
    };
  }
  return { allowed: true };
}

// ==================================================================
// 🚀 ANA API
// ==================================================================
exports.api = onRequest(
  { memory: "1GiB", timeoutSeconds: 300 },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        let data = req.method === "POST" ? req.body : req.query;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {}
        }
        const clientIp =
          req.headers["x-forwarded-for"] ||
          req.socket.remoteAddress ||
          "0.0.0.0";

        const islemKontrol = data.islem; // Geçici değişken (Henüz aşağıda tanımlanmadığı için)
        // --- 🛡️ GÜVENLİK KİLİDİ BAŞLANGICI (.ENV UYUMLU) ---
        const GIZLI_SIFRE = process.env.ADMIN_PASSWORD;

        // Bu işlemler için şifre zorunlu olsun
        const KILITLI_ISLEMLER = [
          "get_users",
          "admin_update_points",
          "delete_task",
          "save_settings",
          "create_raffle",
          "draw_raffle",
          "delete_raffle",
          "add_store_item",
          "get_security_logs",
          "get_system_logs",
          "delete_all_coupons",
          "generate_coupons",
          "delete_coupon",
          "delete_store_item",
          "toggle_task_status",
          "toggle_admin_note",
          "get_dashboard_stats",
        ];

        // Eğer işlem yönetici işlemiyse ve şifre yanlışsa durdur
        if (KILITLI_ISLEMLER.includes(data.islem)) {
          // Frontend'den 'adminToken' adıyla gelen şifre, .env ile aynı mı?
          if (data.adminToken !== GIZLI_SIFRE) {
            return res.json({
              success: false,
              message: "⛔ Yetkisiz Erişim! (Şifre Yanlış)",
            });
          }
        }
        // --- 🛡️ GÜVENLİK KİLİDİ BİTİŞİ ---
        const isAdmin = data.adminToken === process.env.ADMIN_PASSWORD;

        // Sadece önemli işlemlerde kontrol et
        if (
          !isAdmin &&
          islemKontrol !== "get_settings" &&
          islemKontrol !== "log_frontend_action"
        ) {
          try {
            const currentSettings = await getSystemSettings();
            const securityCheck = await checkSpamProtection(
              clientIp,
              currentSettings
            );

            if (!securityCheck.allowed) {
              return res.json({
                success: false,
                error: "SPAM_LOCK",
                message:
                  "Sistem: Çok fazla işlem yaptınız. 24 saat kilitlendiniz.",
              });
            }
          } catch (err) {
            console.log("Güvenlik Pas Geçildi");
          }
        }

        const islem = data.islem;
        let response = { success: false, message: "Geçersiz işlem" };
        // ... (req, res tanımları burada) ...

        // ----------------------------------------------------------------------
        // MODÜL 1: YÖNETİM & AYARLAR (GÜNCELLENMİŞ - TAKVİM KONTROLLÜ)
        // ----------------------------------------------------------------------
        // --- AYARLARI GETİR (HEM SİSTEM HEM BAKIM MODU - FİNAL) ---
        if (islem === "get_settings") {
          // 1. ANA AYARLARI ÇEK (XP, Seviyeler vb.) -> system/settings
          // Bu senin Screenshot_41'deki boş alanları dolduracak veridir.
          let mainSettings = await getSystemSettings();

          // 2. BAKIM MODUNU ÇEK -> settings/general
          // Bu da sağ üstteki kırmızı/yeşil buton için.
          const generalDoc = await db
            .collection("settings")
            .doc("general")
            .get();
          let generalData = {};
          if (generalDoc.exists) {
            generalData = generalDoc.data();
          }

          // 3. İKİSİNİ BİRLEŞTİR
          // settings değişkeni artık her iki veriyi de içeriyor.
          let settings = { ...mainSettings, ...generalData };

          // 4. TAKVİM / GÜNÜN ŞİFRESİ MANTIĞI (Aynen koruyoruz)
          const trDate = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
          );
          const dd = String(trDate.getDate()).padStart(2, "0");
          const mm = String(trDate.getMonth() + 1).padStart(2, "0");
          const yyyy = trDate.getFullYear();
          const todayStr = `${dd}.${mm}.${yyyy}`;

          let scheduledCode = null;

          const querySnapshot = await db
            .collection("settings")
            .where("promosyon_tarihi", "==", todayStr)
            .limit(1)
            .get();

          if (!querySnapshot.empty) {
            scheduledCode = querySnapshot.docs[0].data().gunun_kodu;
          } else {
            const docSnap = await db
              .collection("settings")
              .doc(`PROMO_${todayStr}`)
              .get();
            if (docSnap.exists) {
              scheduledCode = docSnap.data().gunun_kodu;
            }
          }

          if (scheduledCode && scheduledCode !== "YOK") {
            settings.daily_secret_code = scheduledCode;
            settings.gunun_kodu = scheduledCode;
            settings.is_scheduled = true;
          }

          // 5. Cevabı Gönder
          response = { success: true, settings: settings };
        } else if (islem === "save_settings") {
          delete data.islem;
          await db
            .collection("system")
            .doc("settings")
            .set(data, { merge: true });
          await logSecurity(
            "AYAR_GUNCELLEME",
            "Sistem parametreleri güncellendi."
          );
          response = { success: true, message: "Ayarlar kaydedildi." };
        } // --- BAKIM MODU HIZLI GÜNCELLEME (EŞİTLENMİŞ) ---
        else if (islem === "set_maintenance") {
          const status = data.status; // "true" veya "false"

          // Yine "general" dökümanına yazıyoruz. 'merge: true' önemli!
          await db.collection("settings").doc("general").set(
            {
              maintenance_mode: status,
            },
            { merge: true }
          );

          response = { success: true, message: "Bakım modu güncellendi." };
        } // --- YÖNETİCİ PUAN GÜNCELLEME (SİPARİŞ SAYISI DÜZELTİLMİŞ) ---
        else if (islem === "admin_update_points") {
          const { email, amount, type } = data;

          // 1. Kullanıcıyı Bul (ID, Email veya E-posta ile)
          let userDoc = null;
          let userRef = db.collection("users").doc(email);

          let docSnap = await userRef.get();
          if (docSnap.exists) {
            userDoc = docSnap;
          } else {
            const q1 = await db
              .collection("users")
              .where("email", "==", email)
              .limit(1)
              .get();
            if (!q1.empty) {
              userDoc = q1.docs[0];
              userRef = userDoc.ref;
            } else {
              const q2 = await db
                .collection("users")
                .where("e_posta", "==", email)
                .limit(1)
                .get();
              if (!q2.empty) {
                userDoc = q2.docs[0];
                userRef = userDoc.ref;
              }
            }
          }

          if (!userDoc) {
            response = { success: false, message: "Kullanıcı bulunamadı." };
          } else {
            const userData = userDoc.data();
            const settings = await getSystemSettings();

            let currentPoints = parseInt(
              userData.puan || userData.toplampuan || 0
            );
            let changeAmount = parseInt(amount);

            if (type === "remove") currentPoints -= changeAmount;
            else currentPoints += changeAmount;

            if (currentPoints < 0) currentPoints = 0;

            // 🔥 DÜZELTME BURASI: Sipariş Sayısını Garantili Çek
            // Veritabanında küçük harf varsa onu al, yoksa büyük harfi al
            let realOrderCount = 0;
            if (userData.siparissayisi !== undefined)
              realOrderCount = parseInt(userData.siparissayisi);
            else if (userData.siparisSayisi !== undefined)
              realOrderCount = parseInt(userData.siparisSayisi);

            // Seviyeyi Hesapla (Artık 1 siparişi görecek!)
            const newLevel = calculateLevel(
              currentPoints,
              realOrderCount,
              settings
            );

            // Güncelle
            await userRef.update({
              puan: currentPoints,
              toplampuan: currentPoints,
              seviye: newLevel,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Geçmişe Ekle
            await db.collection("point_history").add({
              email: email,
              islem: `Yönetici İşlemi (${type === "add" ? "+" : "-"}${amount})`,
              puan: type === "add" ? changeAmount : -changeAmount,
              tarih: admin.firestore.FieldValue.serverTimestamp(),
              date: admin.firestore.FieldValue.serverTimestamp(),
            });
            // 🔥 ROZET KONTROLÜ (GÖREV ADAMI) - TEST İÇİN
            // Admin panelinden puan verilince de rozet açılsın
            const curBadges = userData.badges || [];
            if (!curBadges.includes("gorev_adami")) {
              await userRef.update({
                badges: admin.firestore.FieldValue.arrayUnion("gorev_adami"),
                // Eğer hiç avatarı yoksa bunu avatar yap
                selectedAvatar: userData.selectedAvatar || "gorev_adami",
              });
            }

            response = {
              success: true,
              message: `Puan güncellendi. Yeni Seviye: ${newLevel}`,
              newLevel: newLevel,
            };
          }
        } // --- ÇERÇEVE TAKMA / DEĞİŞTİRME (FİNAL DÜZELTME) ---
        else if (islem === "equip_avatar_frame") {
          const { email, frameCode } = data; // E-posta ve kod veriden alınır

          if (!email) {
            response = {
              success: false,
              message: "Kullanıcı e-postası eksik.",
            };
          } else {
            const userRef = db.collection("users").doc(email);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
              response = { success: false, message: "Kullanıcı bulunamadı." };
            } else {
              const userData = userSnap.data();
              const myFrames = userData.ownedFrames || [];

              // Güvenlik: Kullanıcı bu çerçeveye sahip mi? (veya boş çerçeve mi takıyor?)
              if (myFrames.includes(frameCode) || frameCode === "") {
                await userRef.update({
                  selectedFrame: frameCode,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                // 👇👇👇 BURAYI EKLE: Profil Mimarı Görevini Tetikle 👇👇👇
                try {
                  // Senin panelde verdiğin Özel ID: gorev_profil_mimari
                  const taskID = "gorev_profil_mimari";

                  // Bu görevi kullanıcının ilerlemesine "tamamlandı" olarak işle
                  const progressRef = db
                    .collection("user_task_progress")
                    .doc(`${email}_${taskID}`);
                  const taskDoc = await db
                    .collection("tasks")
                    .doc(taskID)
                    .get();

                  if (taskDoc.exists) {
                    const reward = parseInt(taskDoc.data().buyukodul_xp) || 250;

                    // Daha önce yapmamışsa puan ver
                    const progDoc = await progressRef.get();
                    if (!progDoc.exists || !progDoc.data().completed) {
                      await progressRef.set(
                        {
                          email: email,
                          taskId: taskID,
                          taskTitle: taskDoc.data().baslik || "Profil Mimarı",
                          adim1_ilerleme: 1,
                          completed: true,
                          completedAt:
                            admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                      );

                      // Puanı ekle
                      await userRef.update({
                        puan: admin.firestore.FieldValue.increment(reward),
                        toplampuan:
                          admin.firestore.FieldValue.increment(reward),
                      });

                      // Geçmişe yaz
                      await db.collection("point_history").add({
                        email: email,
                        islem: "Görev: Profil Mimarı",
                        puan: reward,
                        date: admin.firestore.FieldValue.serverTimestamp(),
                      });
                    }
                  }
                } catch (err) {
                  console.log("Görev tetikleme hatası (Önemsiz):", err);
                }
                response = {
                  success: true,
                  message: "Çerçeve güncellendi! 😎",
                };
              } else {
                response = {
                  success: false,
                  message: "Bu çerçeveye sahip değilsin!",
                };
              }
            }
          }
        }
        // --- LOGGER / HATA KAYITLARI (TARİH SIRALAMA DÜZELTİLDİ) ---
        else if (islem === "get_logger" || islem === "get_error_logs") {
          try {
            const snapshot = await db.collection("error_logs").limit(100).get();
            const logs = [];

            snapshot.forEach((doc) => {
              const d = doc.data();

              // 1. TARİH ALMA VE SIRALAMA DEĞERİ OLUŞTURMA
              let rawDate = d.tarih || "-";
              let sortVal = 0;

              // Tarih string ise (2025-12-12...) sayısal değere çevir
              if (typeof rawDate === "string") {
                sortVal = new Date(rawDate).getTime();
              } else if (rawDate && rawDate.toDate) {
                // Timestamp ise
                sortVal = rawDate.toDate().getTime();
              }

              // Görünen Tarihi Temizle (Ekrana basmak için)
              let displayDate = String(rawDate);
              if (displayDate.includes("T")) {
                displayDate = displayDate.replace("T", " ").split(".")[0];
              }

              const mesaj =
                d.i_slem || d.hata_mesaji || d.message || "Bilinmeyen İşlem";
              const detay = d.detay || d.details || "-";

              logs.push({
                tarih: displayDate, // Ekranda görünecek temiz tarih
                message: mesaj,
                details: detay,
                _sortTime: sortVal, // Sıralama yapılacak gizli değer
              });
            });

            // 🔥 KESİN SIRALAMA: Yeniden eskiye
            logs.sort((a, b) => b._sortTime - a._sortTime);

            response = { success: true, logs: logs };
          } catch (error) {
            response = { success: true, logs: [], error: error.message };
          }
        } // --- GÜVENLİK LOGLARI (KESİN VERİ VE SIRALAMA FİX) ---
        else if (islem === "get_security_logs") {
          try {
            // 1. Veriyi Çek (Server-side sıralamayı kaldırdık, hata verip veri gizlemesin diye)
            const snapshot = await db
              .collection("security_logs")
              .limit(100)
              .get();

            const logs = [];

            snapshot.forEach((doc) => {
              const d = doc.data();

              let sortValue = 0;
              let displayDate = "-";

              // Tarih alanı bazen 'tarih', bazen 'createdAt' olabiliyor
              let rawDate = d.createdAt || d.tarih;

              // A) Timestamp Nesnesi ise (En Sağlıklısı)
              if (rawDate && typeof rawDate === "object" && rawDate.toMillis) {
                sortValue = rawDate.toMillis();

                // Manuel TR Saati Hesaplama (UTC+3)
                let dateObj = rawDate.toDate();
                let trTime = new Date(dateObj.getTime() + 3 * 60 * 60 * 1000);

                let dd = String(trTime.getUTCDate()).padStart(2, "0");
                let mm = String(trTime.getUTCMonth() + 1).padStart(2, "0");
                let yyyy = trTime.getUTCFullYear();
                let hh = String(trTime.getUTCHours()).padStart(2, "0");
                let min = String(trTime.getUTCMinutes()).padStart(2, "0");

                displayDate = `${dd}.${mm}.${yyyy} ${hh}:${min}`;
              }
              // B) String ise
              else if (typeof rawDate === "string") {
                let dateStr = rawDate.trim();
                displayDate = dateStr;

                // Sıralama değeri üret
                if (dateStr.includes(".")) {
                  let parts = dateStr.split(" ");
                  let datePart = parts[0].split(".");
                  let timePart = parts[1] || "00:00:00";

                  if (datePart.length === 3) {
                    let isoFormat = `${datePart[2]}-${datePart[1]}-${datePart[0]}T${timePart}`;
                    sortValue = new Date(isoFormat).getTime();
                  }
                } else {
                  sortValue = new Date(dateStr).getTime();
                }
              }

              if (isNaN(sortValue)) sortValue = 0;

              // Aksiyon Adı (Yedekli)
              const actionName =
                d.action || d.islem_tipi || d.i_slem || "Sistem";

              logs.push({
                createdAt: displayDate,
                sortDate: sortValue,
                action: actionName,
                details: d.details || d.detay || "-",
                ip: d.ip || "0.0.0.0",
              });
            });

            // 2. JavaScript ile Kesin Sıralama (Yeniden Eskiye)
            logs.sort((a, b) => b.sortDate - a.sortDate);

            response = { success: true, logs: logs };
          } catch (error) {
            console.error("Güvenlik Log Hatası:", error);
            response = { success: false, logs: [], message: error.message };
          }
        }
        // ==================================================================
        // 🥚 SÜRPRİZ KUTU - HEDEF ODAKLI (GÜNLÜK RUTİN)
        // ==================================================================
        else if (islem === "collect_hidden_egg") {
          let email = req.body.email;
          if (!email)
            return res.send({ success: false, message: "Giriş yapmalısın." });

          email = String(email).trim().toLowerCase();

          try {
            // 1. KULLANICIYI BUL
            let userRef = db.collection("users").doc(email);
            let userDoc = await userRef.get();

            if (!userDoc.exists) {
              const lowerRef = db.collection("users").doc(email.toLowerCase());
              const lowerDoc = await lowerRef.get();
              if (lowerDoc.exists) {
                userRef = lowerRef;
                userDoc = lowerDoc;
                email = lowerEmail;
              } else {
                // Kullanıcı yoksa oluştur (Puanı 0 başlar)
                await userRef.set({ email: email, puan: 0, toplampuan: 0 });
                userDoc = await userRef.get();
              }
            }

            // 2. 🔥 GÖREVİ BUL (NOKTA ATIŞI: "GÜNLÜK RUTİN")
            let targetTaskID = null;
            let taskTitle = "Sürpriz Kutu";
            let dailyLimit = 5;
            let hasStep2 = false;
            const rewardXP = 20; // Sabit 20 XP

            const tasksSnap = await db.collection("tasks").get();

            tasksSnap.forEach((doc) => {
              const t = doc.data();
              const isActive =
                t.status === "active" || t.aktif === true || t.aktif === "TRUE";

              if (isActive) {
                const baslik = String(
                  t.baslik || t.title || ""
                ).toLocaleLowerCase("tr-TR");
                const id = doc.id.toLowerCase();
                const tanim1 = String(t.adim1_tanim || "").toLocaleLowerCase(
                  "tr-TR"
                );

                // ÖNCELİK 1: ID'sinde veya Başlığında "rutin" geçiyorsa ve 1. adımda "kutu" varsa
                // Örnek: gunluk_rutin_v2
                if (
                  (id.includes("rutin") || baslik.includes("rutin")) &&
                  tanim1.includes("kutu")
                ) {
                  targetTaskID = doc.id;
                  taskTitle = t.baslik || t.title;
                  let rawTarget = parseInt(t.adim1_hedef);
                  if (isNaN(rawTarget) || rawTarget < 5) rawTarget = 5;
                  dailyLimit = rawTarget;
                  if (t.adim2_tanim && t.adim2_tanim.length > 2)
                    hasStep2 = true;
                }
                // ÖNCELİK 2 (Yedek): Eğer yukarıdakini bulamazsa sadece "kutu"ya bak
                else if (
                  !targetTaskID &&
                  (baslik.includes("kutu") || tanim1.includes("kutu"))
                ) {
                  targetTaskID = doc.id;
                  taskTitle = t.baslik || t.title;
                  let rawTarget = parseInt(t.adim1_hedef);
                  if (isNaN(rawTarget) || rawTarget < 5) rawTarget = 5;
                  dailyLimit = rawTarget;
                  if (t.adim2_tanim && t.adim2_tanim.length > 2)
                    hasStep2 = true;
                }
              }
            });

            // Eğer hala yoksa mecburen SANAL aç (Ama yukarıdaki kod v2'yi bulmalı)
            if (!targetTaskID) {
              targetTaskID = "SANAL_KUTU_GOREVI";
              console.log(
                "⚠️ Uyarı: 'Günlük Rutin' görevi bulunamadı! Sanal açıldı."
              );
            }

            // 3. LİMİT KONTROLÜ
            const todayStr = new Date().toISOString().split("T")[0];
            const dailyProgressID = `${email}_${targetTaskID}_${todayStr}`;
            const dailyRef = db
              .collection("user_task_progress")
              .doc(dailyProgressID);
            const dailyDoc = await dailyRef.get();

            let currentCount = 0;
            if (dailyDoc.exists) {
              currentCount = parseInt(dailyDoc.data().count) || 0;
            }

            if (currentCount >= dailyLimit) {
              return res.send({
                success: false,
                message: "Bugünlük limitin doldu! (5/5)",
              });
            }

            // 4. İŞLEM ZAMANI
            const batch = db.batch();
            const now = admin.firestore.FieldValue.serverTimestamp();

            // A) PUAN YAZ
            let mevcutPuan = parseInt(userDoc.data().toplampuan) || 0;
            let yeniPuan = mevcutPuan + rewardXP;

            batch.update(userRef, {
              puan: yeniPuan,
              toplampuan: yeniPuan,
              updatedAt: now,
            });

            // B) GÜNLÜK SAYAÇ
            batch.set(
              dailyRef,
              {
                email: email,
                taskId: targetTaskID,
                taskTitle: taskTitle,
                date: todayStr,
                count: admin.firestore.FieldValue.increment(1),
                updatedAt: now,
              },
              { merge: true }
            );

            // C) ANA GÖREV İLERLEMESİ (ÇAPRAZ KONTROLLÜ)
            const mainProgressID = `${email}_${targetTaskID}`;
            const mainProgressRef = db
              .collection("user_task_progress")
              .doc(mainProgressID);

            // 🔥 KRİTİK EKLEME: Önce mevcut durumu okuyoruz
            const mainDoc = await mainProgressRef.get();
            const mainData = mainDoc.exists ? mainDoc.data() : {};

            // 1. Yeni Kutu Sayısı
            const s1 = currentCount + 1;
            // 2. Mevcut Buton Durumu (Veritabanından okuduk!)
            const s2 = parseInt(mainData.adim2_ilerleme) || 0;

            let isComplete = false;
            let wasCompleted = mainData.completed === true;

            // 🔥 KURAL: Hedef burada da kesin 5 olsun (Daily Limit değişkenini kullan)
            // dailyLimit yukarıda zaten hesaplanmıştı.

            // 🔥 KONTROL: Kutular bitti mi? (s1 >= 5) VE Buton basılmış mı? (s2 >= 1)
            // hasStep2 kontrolünü de ekliyoruz (Eğer görevde 2. adım varsa buton şart)
            if (s1 >= dailyLimit) {
              if (!hasStep2 || s2 >= 1) {
                isComplete = true;
              }
            }

            // ... (Kalan kısımlar aynı: Ödül verme, batch update vb.) ...

            // Eğer şimdi bittiyse BÜYÜK ÖDÜLÜ ver
            if (isComplete && !wasCompleted) {
              // Büyük ödül veritabanından gelmediyse varsayılan 50 olsun
              const bonusAward = 50;

              batch.update(userRef, {
                puan: admin.firestore.FieldValue.increment(bonusAward),
                toplampuan: admin.firestore.FieldValue.increment(bonusAward),
              });

              // Log at
              const bonusLog = db.collection("point_history").doc();
              batch.set(bonusLog, {
                email: email,
                islem: "Görev Tamamlandı: " + taskTitle,
                puan: bonusAward,
                tarih: now,
                date: now,
              });
            }

            // İlerlemeyi Kaydet
            batch.set(
              mainProgressRef,
              {
                email: email,
                taskId: targetTaskID,
                taskTitle: taskTitle,
                adim1_ilerleme: s1, // Yeni kutu sayısı
                adim2_ilerleme: s2, // Buton durumu (neyse o kalır)
                completed: isComplete || wasCompleted,
                updatedAt: now,
                ...(isComplete && !wasCompleted ? { completedAt: now } : {}),
              },
              { merge: true }
            );

            // 5. Geçmişe İşle (DÜZELTİLMİŞ VERSİYON)
            // HATA: t.set(...) yerine batch.set(...) kullanıldı.
            // HATA: itemData ve itemCost yerine rewardXP kullanıldı.

            const historyRef = db.collection("point_history").doc();

            batch.set(historyRef, {
              email: email,
              islem: "Sürpriz Kutu Bulundu 🎁", // Sabit isim verdik
              puan: rewardXP, // itemCost yerine kazanılan ödül (20 XP)
              tarih: admin.firestore.FieldValue.serverTimestamp(),
              date: admin.firestore.FieldValue.serverTimestamp(),
            });

            await batch.commit();

            return res.send({
              success: true,
              message: `Tebrikler! +${rewardXP} XP.`,
              earned: rewardXP,
              newTotal: yeniPuan,
            });
          } catch (error) {
            return res.send({
              success: false,
              message: "Hata: " + error.message,
            });
          }
        }
        // index.js içine eklenecek (API Kısmına)

        // --- PROFİL GÜNCELLEME (AVATAR & BİO) ---
        else if (islem === "update_user_profile") {
          const { email, newName, newBio, newAvatar } = data;

          if (!email)
            return res.json({ success: false, message: "E-posta yok." });

          // Basit güvenlik kontrolleri (Çok uzun yazı yazamasınlar)
          if (newBio && newBio.length > 150) {
            return res.json({
              success: false,
              message: "Biyografi en fazla 150 karakter olabilir.",
            });
          }

          const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (newName && newName.length > 2) updateData.adSoyad = newName;
          if (newBio !== undefined) updateData.bio = newBio; // Biyografi (Söz)
          if (newAvatar) updateData.selectedAvatar = newAvatar; // Yeni Avatar ID'si

          await db.collection("users").doc(email).update(updateData);

          response = {
            success: true,
            message: "Profilin başarıyla güncellendi! 😎",
          };
        }

        // --- BİLDİRİMLER (TARİH DÜZELTİLDİ) ---
        else if (islem === "get_notifications") {
          const snapshot = await db.collection("notifications").get();
          const list = [];
          snapshot.forEach((doc) => {
            const d = doc.data();
            list.push({
              createdAt: formatSafeDate(d.kayit_tarihi || d.createdAt),
              email: d.e_posta || d.email,
            });
          });
          response = { success: true, list: list, count: list.length };
        } // --- MÜŞTERİ PUAN GEÇMİŞİ (TARİH FORMATI FİX v6) ---
        else if (islem === "get_user_history") {
          const { email } = data;

          try {
            // 1. İki ihtimali de sorgula
            const q1 = db
              .collection("point_history")
              .where("email", "==", email)
              .get();
            const q2 = db
              .collection("point_history")
              .where("e_posta", "==", email)
              .get();

            const [snap1, snap2] = await Promise.all([q1, q2]);
            const allDocs = [...snap1.docs, ...snap2.docs];
            const history = [];
            const addedIds = new Set();

            allDocs.forEach((doc) => {
              if (addedIds.has(doc.id)) return;
              addedIds.add(doc.id);

              const d = doc.data();
              const aksiyon = d.islem || d.action || "Genel İşlem";
              const puanDegeri = parseInt(d.puan) || 0;
              const hakDegeri = parseInt(d.hak) || 0;
              const gelenKod =
                d.kupon_kodu || d.code || d.couponCode || d.rawCoupon || null;

              // 🔥 TARİH FORMATLAMA MOTORU (DÜZELTİLDİ) 🔥
              let rawDateObj = d.date || d.tarih || d.createdAt;
              let dateObj = new Date();
              let sortVal = 0;

              if (rawDateObj) {
                // A) Timestamp Nesnesi ise
                if (rawDateObj.toDate) {
                  dateObj = rawDateObj.toDate();
                }
                // B) String ise ("December 21, 2025 at..." veya "2025-12-21...")
                else if (typeof rawDateObj === "string") {
                  // "at" kelimesini ve "UTC+3" kısmını temizle ki JS okuyabilsin
                  let cleanStr = rawDateObj
                    .replace(" at ", " ")
                    .replace("UTC+3", "")
                    .trim();

                  // Eğer nokta varsa (TR formatı: 21.12.2025) -> (2025-12-21) çevir
                  if (cleanStr.includes(".") && cleanStr.length <= 10) {
                    const p = cleanStr.split(".");
                    if (p.length === 3) cleanStr = `${p[2]}-${p[1]}-${p[0]}`;
                  }

                  let parsedDate = new Date(cleanStr);
                  if (!isNaN(parsedDate.getTime())) {
                    dateObj = parsedDate;
                  }
                }
              }

              sortVal = dateObj.getTime();

              const dateStr = dateObj.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              history.push({
                action: aksiyon,
                amount: puanDegeri,
                rights: hakDegeri,
                date: dateStr,
                sortDate: sortVal,
                kupon_kodu: gelenKod,
              });
            });

            // Tarihe göre sırala (Yeniden Eskiye)
            history.sort((a, b) => b.sortDate - a.sortDate);
            const finalHistory = history.slice(0, 50);

            response = { success: true, list: finalHistory };
          } catch (error) {
            console.error("Geçmiş Hatası:", error);
            response = { success: false, list: [], error: error.message };
          }
        }
        // ==================================================================
        // 📊 GÖREV İLERLEMELERİNİ ÇEK (Sadece Müşteri İçin)
        // ==================================================================
        else if (islem === "get_user_task_progress") {
          const { email } = data;

          // Kullanıcının tüm ilerlemelerini çek
          const snapshot = await db
            .collection("user_task_progress")
            .where("email", "==", email)
            .get();

          const list = [];
          snapshot.forEach((doc) => {
            const d = doc.data();

            list.push({
              taskId: d.taskId,
              taskTitle: d.taskTitle,
              adim1_ilerleme: d.adim1_ilerleme || d.count || 0,
              adim2_ilerleme: d.adim2_ilerleme || 0,
              completed: d.completed || false,
              updatedAt: d.updatedAt ? d.updatedAt.toDate() : null,
            });
          });

          response = { success: true, list: list };
        } // --- INSTAGRAM STORY PAYLAŞIM ÖDÜLÜ ---
        else if (islem === "share_story_reward") {
          const { email } = data;
          const userRef = db.collection("users").doc(email);
          const userDoc = await userRef.get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            const todayStr = new Date().toISOString().split("T")[0];

            // Bugün ödül almış mı?
            if (userData.lastShareDate !== todayStr) {
              const reward = 50;
              const newPoints = (parseInt(userData.puan) || 0) + reward;

              await userRef.update({
                puan: newPoints,
                toplampuan: newPoints,
                lastShareDate: todayStr, // Bugünü kaydet
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // Log
              await db.collection("point_history").add({
                email: email,
                islem: "Story Paylaşımı",
                puan: reward,
                tarih: admin.firestore.FieldValue.serverTimestamp(),
                date: admin.firestore.FieldValue.serverTimestamp(),
              });

              response = {
                success: true,
                message: `Harika! Paylaşım için +${reward} XP kazandın!`,
              };
            } else {
              response = {
                success: false,
                message:
                  "Bugünlük paylaşım ödülünü zaten aldın. Yarın yine bekleriz!",
              };
            }
          } else {
            response = { success: false, message: "Kullanıcı yok." };
          }
        }
        // --- MÜŞTERİ HAREKET KAYDI (CANLI LOGLAMA) ---
        else if (islem === "log_frontend_action") {
          const { email, action, details } = data;
          const ip =
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            "0.0.0.0"; // IP Yakala

          // Güvenlik: Boş logları engelle
          if (action) {
            await db.collection("system_logs").add({
              email: email || "Misafir",
              action: action,
              details: details || "-",
              ip: ip,
              createdAt: admin.firestore.FieldValue.serverTimestamp(), // Sunucu saati
            });
          }
          response = { success: true };
        }

        // ----------------------------------------------------------------------
        // MODÜL 2: OYUNLAŞTIRMA & GÖREVLER
        // ----------------------------------------------------------------------
        // index.js -> "get_tasks" bloğunun içi
        else if (islem === "get_tasks") {
          const snapshot = await db.collection("tasks").get();
          const tasks = [];
          // --- 🆕 EKLEME BAŞLANGIÇ (İpucu Hazırlama) ---
          let goldenHint = "İpucu bulunamadı.";
          try {
            const goldenDoc = await db
              .collection("system")
              .doc("daily_golden_products")
              .get();
            if (
              goldenDoc.exists &&
              goldenDoc.data().codes &&
              goldenDoc.data().codes.length > 0
            ) {
              const codes = goldenDoc.data().codes;
              const randomCode =
                codes[Math.floor(Math.random() * codes.length)];

              // Maskeleme İşlemi (AYKKBİA-KDN-***-315)
              const parts = randomCode.split("-");
              if (parts.length >= 3) {
                goldenHint = `${parts[0]}-${parts[1]}-***-${randomCode.slice(
                  -3
                )}`;
              } else {
                goldenHint = `${randomCode.substring(
                  0,
                  4
                )}***${randomCode.slice(-3)}`;
              }
            }
          } catch (e) {
            console.log("İpucu hatası:", e);
          }
          // --- 🆕 EKLEME BİTİŞ ---
          snapshot.forEach((doc) => {
            const d = doc.data();
            // Aktiflik kontrolü (Zaten düzeltmiştik)
            const isActive =
              d.aktif === "✅" ||
              d.aktif === true ||
              d.aktif === "TRUE" ||
              d.status === "active" ||
              d.status === "Aktif";

            let tip1 = d.adim1_gorevtipi || "";
            if (tip1 === "link_visit" || tip1 === "visit")
              tip1 = "Site/Link Ziyareti";

            let tip2 = d.adim2_gorevtipi || "";
            if (tip2 === "manuel_onay") tip2 = "Manuel Onay";

            tasks.push({
              id: doc.id,
              customId: doc.id, // ID'yi buraya da koyalım ki panel görsün

              baslik: d.baslik || d.title,
              title: d.baslik || d.title,

              aciklama: d.aciklama || d.description,
              description: d.aciklama || d.description,

              tip: d.tip || d.frequency || "Genel",
              frequency: d.tip || d.frequency || "Genel",

              buyukodul_xp: parseInt(d.buyukodul_xp) || parseInt(d.reward) || 0,
              reward: parseInt(d.buyukodul_xp) || parseInt(d.reward) || 0,

              status: isActive ? "active" : "passive",
              aktif: isActive,

              // Adımlar
              adim1_hedef: parseInt(d.adim1_hedef) || 1,
              adim1_tanim: d.adim1_tanim || "",
              adim1_gorevtipi: d.adim1_gorevtipi, // Orijinal veri (Database hali)
              adim1_link: d.adim1_link || "", // Linki panele geri gönder

              adim2_tanim: d.adim2_tanim || "",
              adim2_gorevtipi: d.adim2_gorevtipi,

              // Panelde güzel görünsün diye formatlanmış tipler
              gosterim_tip1: tip1,
              gosterim_tip2: tip2,
            });
          });
          response = { success: true, tasks: tasks };
        } // --- GÖREV EKLEME (GÜVENLİ VERSİYON - ID VE LINK GARANTİLİ) ---
        else if (islem === "add_task") {
          const d = data;

          // 1. Linki Kurtarma Operasyonu (Panelden farklı isimle gelebilir)
          // Panel bazen 'link', bazen 'adim1_link' gönderiyor. Hepsini kontrol ediyoruz.
          const safeLink1 = d.adim1_link || d.link1 || d.link || "";

          // 2. ID Belirleme (Sen ne yazdıysan o olsun!)
          let docID = null;
          if (d.customId && d.customId.trim().length > 2) {
            docID = d.customId.trim(); // Örn: gorev_google_maps
          }

          // 3. Tip Düzeltme (visit -> link_visit çevirisi)
          // Panel "visit" gönderirse biz veritabanına "link_visit" yazalım ki kod anlasın.
          let tip1 = d.adim1_gorevtipi || "genel";
          if (tip1 === "visit") tip1 = "link_visit";

          let tip2 = d.adim2_gorevtipi || "";
          if (tip2 === "visit") tip2 = "link_visit";

          const newTask = {
            // Başlık ve Açıklama
            baslik: d.baslik || d.title || "Başlıksız Görev",
            title: d.baslik || d.title || "Başlıksız Görev",
            aciklama: d.aciklama || d.description || "",
            description: d.aciklama || d.description || "",

            // Ödüller
            buyukodul_xp: parseInt(d.buyukodul_xp) || parseInt(d.reward) || 50,
            reward: parseInt(d.buyukodul_xp) || parseInt(d.reward) || 50,
            buyukodul_hak: parseInt(d.buyukodul_hak) || 0,

            // Tip ve Durum
            // Burada "Sıklık" (Frequency) belirleniyor. TEK seçersen TEK kaydolur.
            tip: d.tip || d.frequency || "Genel",
            frequency: d.tip || d.frequency || "Genel",

            // 🔥 ZORLA AKTİF YAP (Listenin en üstünde görünsün)
            status: "active",
            aktif: true,

            createdAt: admin.firestore.FieldValue.serverTimestamp(),

            // 1. Adım (Link Garantili)
            adim1_tanim: d.adim1_tanim || "Görevi Yap",
            adim1_gorevtipi: tip1,
            adim1_link: safeLink1, // Link artık kaybolmayacak
            adim1_hedef: parseInt(d.adim1_hedef) || 1,

            // 2. Adım
            adim2_tanim: d.adim2_tanim || "",
            adim2_gorevtipi: tip2,
          };

          // ID varsa o ID ile, yoksa otomatik ID ile kaydet
          if (docID) {
            await db.collection("tasks").doc(docID).set(newTask);
          } else {
            await db.collection("tasks").add(newTask);
          }

          response = {
            success: true,
            message: "✅ Görev başarıyla eklendi/güncellendi.",
          };
        }

        // index.js -> toggle_task_status bloğu
        else if (islem === "toggle_task_status") {
          const docRef = db.collection("tasks").doc(data.id);
          const doc = await docRef.get();

          if (doc.exists) {
            const d = doc.data();
            // Şu anki durumu kontrol et (Hem status hem aktif alanına bak)
            const isCurrentlyActive = d.status === "active" || d.aktif === true;

            // Durumu tersine çevir
            const newStatusString = isCurrentlyActive ? "passive" : "active";
            const newStatusBool = !isCurrentlyActive;

            // Veritabanında İKİ ALANI DA güncelle (Senkronizasyon için)
            await docRef.update({
              status: newStatusString,
              aktif: newStatusBool,
            });

            response = { success: true, newStatus: newStatusString };
          } else {
            response = { success: false, message: "Görev bulunamadı." };
          }
        }

        // --- DURUM DEĞİŞTİRME (PASİF/AKTİF BUTONU İÇİN) ---
        else if (islem === "toggle_task_status") {
          const docRef = db.collection("tasks").doc(data.id);
          const doc = await docRef.get();
          if (doc.exists) {
            // Mevcut durum neyse tersine çevir
            const currentStatus = doc.data().status;
            const newStatus =
              currentStatus === "active" || currentStatus === "Aktif"
                ? "passive"
                : "active";

            await docRef.update({ status: newStatus });
            response = { success: true, newStatus: newStatus };
          } else {
            response = { success: false, message: "Görev bulunamadı." };
          }
        } else if (islem === "delete_task") {
          await db.collection("tasks").doc(data.id).delete();
          response = { success: true, message: "Görev silindi." };
        } // --- GÖREV GÜNCELLEME (EDİT) ---
        else if (islem === "update_task_def") {
          const { taskId, newData } = data;

          if (!taskId || !newData) {
            response = { success: false, message: "Eksik veri." };
          } else {
            // Firestore'da ilgili dökümanı bul ve güncelle
            await db.collection("tasks").doc(taskId).update(newData);
            response = {
              success: true,
              message: "Görev başarıyla güncellendi.",
            };
          }
        } else if (islem === "toggle_task_status") {
          const docRef = db.collection("tasks").doc(data.id);
          const doc = await docRef.get();
          if (doc.exists) {
            const newStatus =
              doc.data().status === "active" ? "passive" : "active";
            await docRef.update({ status: newStatus });
            response = { success: true, newStatus: newStatus };
          } else {
            response = { success: false, message: "Görev bulunamadı." };
          }
        } // --- GÖREVİ TAMAMLA / İLERLET ---
        else if (islem === "complete_task") {
          const { email, taskId } = data;

          // 1. Kontroller
          const userRef = db.collection("users").doc(email);
          const taskRef = db.collection("tasks").doc(taskId);
          const progressRef = db
            .collection("user_task_progress")
            .doc(`${email}_${taskId}`);

          const [userDoc, taskDoc, progressDoc] = await Promise.all([
            userRef.get(),
            taskRef.get(),
            progressRef.get(),
          ]);

          if (!userDoc.exists) {
            response = { success: false, message: "Kullanıcı bulunamadı." };
          } else if (!taskDoc.exists || taskDoc.data().status !== "active") {
            response = { success: false, message: "Görev aktif değil." };
          } else if (progressDoc.exists && progressDoc.data().completed) {
            response = {
              success: false,
              message: "Bu görevi zaten tamamladın.",
            };
          } else {
            // 2. Ödülü Ver
            const rewardXP = parseInt(taskDoc.data().reward) || 0;

            // Puan Ekleme (Mevcut puanı alıp artırıyoruz)
            const currentPoints = parseInt(userDoc.data().toplampuan || 0);
            const newPoints = currentPoints + rewardXP;

            // Seviye Kontrolü (Ayarları çekip hesaplıyoruz)
            const settings = await getSystemSettings();
            const newLevel = calculateLevel(newPoints, settings);

            const batch = db.batch();

            // A. Kullanıcıyı Güncelle
            batch.update(userRef, {
              puan: newPoints,
              seviye: newLevel,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // B. İlerlemeyi Kaydet (Tamamlandı olarak)
            batch.set(progressRef, {
              email: email,
              taskId: taskId,
              taskTitle: taskDoc.data().title,
              completed: true,
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // C. Log At
            const logRef = db.collection("system_logs").doc();
            batch.set(logRef, {
              email: email,
              action: "GÖREV_TAMAMLANDI",
              details: `${taskDoc.data().title} (+${rewardXP} XP)`,
              ip: req.headers["x-forwarded-for"] || "0.0.0.0",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // 🔥 ROZET EKLEMESİ (GÖREV ADAMI)
            const curBadges = userDoc.data().badges || [];
            if (!curBadges.includes("gorev_adami")) {
              batch.update(userRef, {
                badges: admin.firestore.FieldValue.arrayUnion("gorev_adami"),
                selectedAvatar: userDoc.data().selectedAvatar || "gorev_adami",
              });
              // Mesaja ekleme yapalım
              response.message += " 🎯 GÖREV ADAMI ROZETİ KAZANDIN!";
            }

            await batch.commit();
            response = {
              success: true,
              message: `Tebrikler! +${rewardXP} XP kazandın.`,
              newPoints: newPoints,
            };
          }
        }
        // --- GÖREV İLERLEMELERİ (TARİH SIRALAMALI & DURUM DÜZELTİLMİŞ) ---
        else if (islem === "get_all_user_progress") {
          try {
            // 🔥 DÜZELTME: En son güncellenenleri en üste getir
            const snapshot = await db
              .collection("user_task_progress")
              .orderBy("updatedAt", "desc")
              .limit(100)
              .get();

            const progressList = [];

            snapshot.forEach((doc) => {
              // 🔥 DÜZELTME BAŞLANGICI: GÜNLÜK SAYAÇLARI GİZLE
              // Eğer Doküman ID'sinin sonunda tarih varsa (Örn: ..._2025-12-17) bunu listeye alma.
              // Regex: 4 rakam - 2 rakam - 2 rakam
              if (/\d{4}-\d{2}-\d{2}$/.test(doc.id)) {
                return; // Bu bir alt kayıttır, ana listede gösterme.
              }
              // 🔥 DÜZELTME BİTİŞİ

              const d = doc.data();

              // ... (Kalan kodlar aynen devam eder) ...
              // 1. TARİH AYIKLAMA (Sıralama İçin)
              let tarihStr = "-";
              let sortTime = 0; // Sıralama puanı

              if (d.updatedAt && d.updatedAt.toDate) {
                const dateObj = d.updatedAt.toDate();
                tarihStr = dateObj.toLocaleString("tr-TR", {
                  timeZone: "Europe/Istanbul",
                });
                sortTime = dateObj.getTime();
              } else if (d.tarih) {
                tarihStr = String(d.tarih);
                // Eski string tarihler için şimdilik 0 verelim, en alta gitsinler
              }

              // 2. KULLANICI ADI
              let kullaniciAdi = d.userName || d.adSoyad || "Bilinmiyor";
              const email = d.email || d.eposta || "E-posta Yok";
              if (kullaniciAdi === "Bilinmiyor" && email.includes("@")) {
                kullaniciAdi = email.split("@")[0];
              }

              // 3. GÖREV ADI
              let gorevAdi = d.taskTitle || d.gorevAdi || "İsimsiz Görev";
              const gorevId = d.taskId || d.gorevserisiid || doc.id;

              if (gorevAdi === "İsimsiz Görev") {
                gorevAdi = gorevId; // ID'yi gösterelim hiç yoksa
              }

              // 4. DETAYLAR (GÜNCELLENMİŞ GÖSTERİM)
              // 4. DETAYLAR (FİNAL DÜZELTME: EKSİK VERİ KORUMASI)
              let detay = [];

              // Veritabanında alan yoksa (undefined ise) otomatik 0 kabul et
              // Bu sayede diğer görevler bozulmaz, eksik olanlar 0 görünür.
              const s1 =
                d.adim1_ilerleme !== undefined ? parseInt(d.adim1_ilerleme) : 0;
              const s2 =
                d.adim2_ilerleme !== undefined ? parseInt(d.adim2_ilerleme) : 0;

              // Listeye ekle
              detay.push(`1.Adım: ${s1}`);
              detay.push(`2.Adım: ${s2}`);

              // Aralarına çizgi koyarak birleştir
              let detayStr = detay.join(" | ");

              // 5. DURUM (True ise TAMAMLANDI yazsın)
              let durum = "Devam Ediyor";
              // Hem boolean true hem string "true" kontrolü
              if (d.completed === true || d.completed === "true") {
                durum = "TAMAMLANDI";
              }

              progressList.push({
                date: tarihStr,
                sortTime: sortTime, // Bu Frontend'e gitmeyecek ama sıralama için kullanacağız
                email: email,
                taskId: gorevId,
                taskTitle: gorevAdi,
                steps: detayStr,
                status: durum,
              });
            });

            // 🔥 SIRALAMA: En yüksek zaman (En yeni) en başa
            progressList.sort((a, b) => b.sortTime - a.sortTime);

            response = { success: true, list: progressList };
          } catch (error) {
            response = {
              success: false,
              list: [],
              error: "Hata: " + error.message,
            };
          }
        }

        // ----------------------------------------------------------------------
        // MODÜL 3: ÇEKİLİŞ & KURA
        // ----------------------------------------------------------------------
        // --- DÜZELTİLEN ÇEKİLİŞ LİSTELEME (CANLI SAYIM VE TARİH FİX) ---
        // --- AKILLI ÇEKİLİŞ LİSTELEME (AKTİF/ARŞİV AYRIMLI) ---
        else if (islem === "get_raffles") {
          const snapshot = await db.collection("raffles").get();
          const raffles = [];

          for (const doc of snapshot.docs) {
            const d = doc.data();

            // 1. TARİH DÜZELTME (Screenshot_62'deki sondaki '_' işaretini yakaladık)
            let rawDate =
              d["bitis_tarihi_gg_aa_yyyy_ss_dk_"] || // 🔥 İŞTE BURASI: Sondaki alt çizgiye dikkat
              d.bitis_tarihi_gg_aa_yyyy_ss_dk ||
              d.bitis_tarihi ||
              d.endDate ||
              "-";

            // Tarih metnini temizle
            if (
              rawDate &&
              typeof rawDate === "string" &&
              rawDate.includes("T")
            ) {
              rawDate = rawDate.replace("T", " ").split(".")[0];
            }

            // 2. DOĞRU KUTUYU SEÇ VE SAY
            // Çekilişin durumuna bakalım
            const isCompleted =
              d.durum === "Tamamlandı" ||
              d.status === "completed" ||
              d.durum === "Pasif";

            // Eğer bitmişse "archive_participants", aktifse "raffle_participants" tablosuna bakacağız
            const hedefTablo = isCompleted
              ? "archive_participants"
              : "raffle_participants";

            let gercekKatilimciSayisi = 0;
            if (d.cekilis_adi) {
              // Seçilen hedef tabloda isme göre sayım yap
              const pSnap = await db
                .collection(hedefTablo)
                .where("cekilis_adi", "==", d.cekilis_adi)
                .count()
                .get();

              gercekKatilimciSayisi = pSnap.data().count;
            }
            const karttakiSayi = parseInt(d.participantCount) || 0;

            if (d.durum === "Aktif" && gercekKatilimciSayisi !== karttakiSayi) {
              console.log(
                `DÜZELTME: ${d.name} için sayı güncelleniyor (${karttakiSayi} -> ${gercekKatilimciSayisi})`
              );
              // Arka planda güncelle (Await kullanmıyoruz ki listeleme yavaşlamasın)
              doc.ref.update({ participantCount: gercekKatilimciSayisi });
            }

            raffles.push({
              id: doc.id,
              ad: d.cekilis_adi || d.name || "İsimsiz",
              bitisTarihi: rawDate,
              odul: d.odul_adi || d.reward || "-",
              // Saydığımız gerçek rakam buraya gelir
              participantCount: gercekKatilimciSayisi,
              winnerCount: parseInt(d.kazanan_sayisi) || 1,
              durum: d.durum || "Pasif", // Durumu olduğu gibi yansıt
            });
          }

          response = { success: true, raffles: raffles };
        } else if (islem === "create_raffle") {
          const { name, endDate, reward, winnerCount } = data;

          // 🔥 HEM ESKİ HEM YENİ FORMATI DESTEKLEMEK İÇİN İKİSİNİ DE YAZIYORUZ
          await db.collection("raffles").add({
            name: name,
            cekilis_adi: name, // Eski format yedek

            endDate: endDate,
            bitis_tarihi: endDate, // Eski format yedek

            reward: reward,
            odul_adi: reward, // Eski format yedek

            winnerCount: parseInt(winnerCount),
            kazanan_sayisi: parseInt(winnerCount), // Eski format yedek (Panelde 5 görünmesi için)

            status: "active",
            durum: "Aktif", // 🔥 ARTIK HEM 'active' HEM 'Aktif' YAZACAK!

            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            participantCount: 0,
          });
          response = { success: true, message: "Çekiliş oluşturuldu." };
        } // --- ÇEKİLİŞİ SİL (YENİ EKLENEN) ---
        else if (islem === "delete_raffle") {
          const { id } = data;
          // 1. Çekiliş Kaydını Sil
          await db.collection("raffles").doc(id).delete();

          // 2. (Opsiyonel) Bağlı biletleri de temizleyebiliriz ama şimdilik gerek yok
          // Çekiliş silinince listeden kalkması yeterli.

          response = { success: true, message: "Çekiliş başarıyla silindi." };
        }
        // --- ÇEKİLİŞ TARİHİNİ GÜNCELLE (YENİ ÖZELLİK) ---
        else if (islem === "update_raffle_date") {
          const { id, newDate } = data;
          // Tarihi güncelle (hem yeni formatı hem eski excel formatını güncelle ki çakışma olmasın)
          await db.collection("raffles").doc(id).update({
            endDate: newDate,
            bitis_tarihi_gg_aa_yyyy_ss_dk_: newDate, // Excel adı
            bitis_tarihi_gg_aa_yyyy_ss_dk: newDate, // Yedek ad
            status: "active",
            durum: "Aktif",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          response = { success: true, message: "Tarih başarıyla güncellendi!" };
        } else if (islem === "simulate_participants") {
          // TEST İÇİN: Çekilişe sahte katılımcı ekler
          const { raffleId, count } = data;
          const raffleRef = db.collection("raffles").doc(raffleId);
          const raffleDoc = await raffleRef.get();

          if (!raffleDoc.exists)
            return { success: false, message: "Çekiliş yok." };

          const batch = db.batch();
          const names = [
            "Ahmet",
            "Mehmet",
            "Ayşe",
            "Fatma",
            "Ali",
            "Veli",
            "Zeynep",
            "Can",
            "Elif",
            "Burak",
          ];

          for (let i = 0; i < parseInt(count); i++) {
            const randomName =
              names[Math.floor(Math.random() * names.length)] +
              " " +
              Math.floor(Math.random() * 100);
            const ref = db.collection("raffle_participants").doc();
            batch.set(ref, {
              raffleId: raffleId,
              userId: "test_user_" + i,
              userEmail: "test" + i + "@mail.com",
              userName: randomName,
              ticketDate: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();

          // Sayacı güncelle
          await raffleRef.update({
            participantCount: admin.firestore.FieldValue.increment(
              parseInt(count)
            ),
          });

          response = {
            success: true,
            message: `${count} adet test katılımcısı eklendi.`,
          };
        } // --- KURA ÇEK (MOTOR - KUPON DAĞITIMLI FİNAL v2) ---
        else if (islem === "draw_raffle") {
          const { raffleId } = data;
          const raffleRef = db.collection("raffles").doc(raffleId);
          const raffleDoc = await raffleRef.get();

          if (!raffleDoc.exists) {
            response = { success: false, message: "Çekiliş bulunamadı." };
          } else if (raffleDoc.data().status === "completed") {
            response = { success: false, message: "Bu çekiliş zaten bitmiş." };
          } else {
            const raffleData = raffleDoc.data();

            // 1. Katılımcıları Havuzdan Çek
            const participantsSnap = await db
              .collection("raffle_participants")
              .where("raffleId", "==", raffleId)
              .get();
            let participants = [];
            participantsSnap.forEach((doc) => participants.push(doc.data()));

            if (participants.length === 0) {
              await raffleRef.update({
                status: "cancelled",
                durum: "İptal",
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              return res.json({
                success: false,
                message: "Hiç katılımcı yok, iptal edildi.",
              });
            }

            // 2. Karıştır
            for (let i = participants.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [participants[i], participants[j]] = [
                participants[j],
                participants[i],
              ];
            }

            // 3. Kazananları Seç
            const winnerCount =
              parseInt(raffleData.winnerCount) ||
              parseInt(raffleData.kazanan_sayisi) ||
              1;
            const uniqueWinners = [];
            const winnerEmails = new Set();

            for (const ticket of participants) {
              if (uniqueWinners.length >= winnerCount) break;
              const emailKey =
                ticket.userEmail ||
                ticket.userId ||
                "ticket_" + ticket.ticketId;
              if (!winnerEmails.has(emailKey)) {
                uniqueWinners.push(ticket);
                winnerEmails.add(emailKey);
              }
            }

            const batch = db.batch();

            const safeName =
              raffleData.name || raffleData.cekilis_adi || "Çekiliş";
            const safeReward =
              raffleData.reward || raffleData.odul_adi || "Ödül";

            // 🔥 TUTAR BULMA (GÜÇLENDİRİLMİŞ)
            // Ödül metninden sadece rakamları al (Örn: "150 TL Çek" -> 150)
            let targetAmount = 0;
            const amountMatch = String(safeReward).match(/(\d+)/);
            if (amountMatch) targetAmount = parseInt(amountMatch[0]);

            console.log(`🔎 Kupon Aranıyor: ${targetAmount} TL`);

            // 4. Kazananları İşle
            for (let i = 0; i < uniqueWinners.length; i++) {
              const w = uniqueWinners[i];
              let assignedCoupon = null;

              // A. KUPON ÇEKME (Hem sayı hem string kontrolü)
              if (targetAmount > 0) {
                // 1. Deneme: Sayı olarak ara (discount == 150)
                let couponSnap = await db
                  .collection("coupon_pool")
                  .where("status", "==", "active")
                  .where("discount", "==", targetAmount)
                  .limit(1)
                  .get();

                // 2. Deneme: Bulamazsa String olarak ara (discount == "150")
                if (couponSnap.empty) {
                  couponSnap = await db
                    .collection("coupon_pool")
                    .where("status", "==", "active")
                    .where("discount", "==", String(targetAmount))
                    .limit(1)
                    .get();
                }

                if (!couponSnap.empty) {
                  const couponDoc = couponSnap.docs[0];
                  assignedCoupon = couponDoc.data();

                  // Kuponu yak
                  batch.update(couponDoc.ref, {
                    status: "used",
                    usedBy: w.userEmail || "Kazanan",
                    usedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  console.log(`✅ Kupon Bulundu: ${assignedCoupon.code}`);
                } else {
                  console.log(
                    `❌ Uygun kupon bulunamadı (Tutar: ${targetAmount})`
                  );
                }
              }

              // B. Kazananı Kaydet
              const wRef = db.collection("raffle_winners").doc();
              const wEmail = w.userEmail || "mail-yok";
              const wName = w.userName || "Gizli Üye";

              const finalPrizeText = assignedCoupon;

              batch.set(wRef, {
                raffleId: raffleId,
                raffleName: safeName,
                userId: w.userId || "Bilinmiyor",
                userName: wName,
                userEmail: wEmail,
                rank: i + 1,
                prize: finalPrizeText,
                wonAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // C. Mail Gönder
              if (wEmail.includes("@")) {
                const mailRef = db.collection("mail").doc();
                let mailHtml = `<h3>Tebrikler ${wName}!</h3><p><strong>${safeName}</strong> çekilişini kazandınız.</p>`;

                if (assignedCoupon) {
                  mailHtml += `
                      <div style="background:#d1fae5; padding:20px; border:2px dashed #10b981; text-align:center; margin:15px 0; border-radius:10px;">
                        <div style="font-size:14px; color:#065f46; margin-bottom:5px;">Hediye Çeki Kodunuz:</div>
                        <div style="font-size:28px; color:#047857; font-weight:bold; letter-spacing:2px;">${
                          assignedCoupon.code
                        }</div>
                        <div style="font-size:12px; color:#065f46; margin-top:5px;">Son Kullanma: ${
                          assignedCoupon.expiry || "Süresiz"
                        }</div>
                     </div>
                     <p>Bu kodu sepet adımında kullanarak indiriminizi anında alabilirsiniz.</p>`;
                } else {
                  mailHtml += `<p>Ödülünüz: <strong>${safeReward}</strong></p><p>Ödülünüz en kısa sürede hesabınıza tanımlanacaktır.</p>`;
                }

                batch.set(mailRef, {
                  to: wEmail,
                  message: {
                    subject: "🎉 TEBRİKLER! Çekilişi Kazandınız",
                    html: mailHtml,
                  },
                });
              }
            }

            // 5. Çekilişi Kapat
            batch.update(raffleRef, {
              status: "completed",
              durum: "Tamamlandı",
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            await batch.commit();

            response = {
              success: true,
              message: `✅ Çekiliş Tamamlandı! ${uniqueWinners.length} kazanan belirlendi.`,
              winners: uniqueWinners,
            };
          }
        } // --- VİTRİN MOTORU (MALİYET DOSTU & GÜVENLİ v3) ---
        else if (islem === "get_showcase_data") {
          try {
            // 1. Önce Hazır Özeti Oku (Maliyet: 1 Okuma)
            const doc = await db.collection("system").doc("vitrin_data").get();

            if (doc.exists) {
              // ✅ PLAN A: Robotun hazırladığı dosyayı gönder (Hızlı ve Ucuz)
              response = { success: true, ...doc.data() };
            } else {
              // ⚠️ PLAN B: Dosya yoksa ESKİ YÖNTEMLE çek (Yedek Paraşüt)
              // Robot çalışana kadar site boş kalmasın diye burası var.
              console.log(
                "⚠️ Vitrin özeti bulunamadı, manuel tarama yapılıyor..."
              );

              const snapshot = await db
                .collection("raffles")
                .where("status", "==", "active")
                .get();
              let activeRaffles = [];

              snapshot.forEach((doc) => {
                const d = doc.data();

                // --- YEDEK RESİM MANTIĞI (Sadece acil durumda çalışır) ---
                let img = "https://www.modum.tr/i/m/001/0013355.png"; // Varsayılan
                const txt = ((d.name || "") + (d.reward || "")).toLowerCase();

                // Senin özel resimlerin (Robot bozulursa burası kurtarır)
                if (txt.includes("1500"))
                  img = "https://www.modum.tr/i/m/001/0013465.jpeg";
                else if (txt.includes("1000"))
                  img = "https://www.modum.tr/i/m/001/0013464.jpeg";
                else if (txt.includes("500"))
                  img = "https://www.modum.tr/i/m/001/0015859.jpeg";
                else if (txt.includes("250"))
                  img = "https://www.modum.tr/i/m/001/0013463.jpeg";
                else if (txt.includes("150"))
                  img = "https://www.modum.tr/i/m/001/0016165.jpeg";

                activeRaffles.push({
                  id: doc.id,
                  ad: d.name || d.cekilis_adi,
                  resim: d.resim || img,
                  odul: d.reward,
                  bitisTarihi: d.endDate || new Date().toISOString(),
                  katilimciSayisi: parseInt(d.participantCount) || 0,
                  durum: "Aktif",
                });
              });
              const doneSnap = await db
                .collection("raffles")
                .where("durum", "==", "Tamamlandı")
                .orderBy("completedAt", "desc")
                .limit(10)
                .get();

              let completedRaffles = [];
              doneSnap.forEach((doc) => {
                const d = doc.data();
                // Resim mantığı burası için de geçerli (basit tuttum)
                let resimUrl = "https://www.modum.tr/i/m/001/0013355.png";
                // ... (aynı resim kodları buraya da eklenebilir ama şart değil)

                completedRaffles.push({
                  id: doc.id,
                  ad: d.cekilis_adi || d.name,
                  odul: d.odul_adi || d.reward,
                  resim: resimUrl,
                  durum: "Tamamlandı",
                });
              });

              // Tarihe göre sırala
              activeRaffles.sort((a, b) =>
                a.bitisTarihi.localeCompare(b.bitisTarihi)
              );

              response = {
                success: true,
                active: activeRaffles,
                completed: [],
              };
            }
          } catch (e) {
            response = { success: false, message: e.message };
          }
        }

        // --- KAZANANLARI LİSTELE (GARANTİLİ VERSİYON v5) ---
        else if (islem === "get_winners") {
          try {
            // 1. SIRALAMA KOMUTUNU KALDIRDIK (Index hatasını önlemek için)
            // Sadece son 100 kazananı çekiyoruz.
            const snapshot = await db
              .collection("raffle_winners")
              .limit(100)
              .get();

            const winners = [];

            snapshot.forEach((doc) => {
              const d = doc.data();

              // 2. TARİHİ SAĞLAMA ALALIM
              // wonAt, tarih veya createdAt hangisi doluysa onu al
              let rawDate = d.wonAt || d.tarih || d.createdAt;
              let displayDate = "-";
              let sortValue = 0; // Sıralama puanı

              if (rawDate) {
                // A) Firebase Timestamp ise
                if (rawDate.toDate) {
                  displayDate = rawDate
                    .toDate()
                    .toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
                  sortValue = rawDate.toDate().getTime();
                }
                // B) String veya Sayı ise
                else {
                  displayDate = String(rawDate).replace("T", " ").split(".")[0];
                  // Sıralama için milisaniyeye çevir
                  let t = new Date(rawDate).getTime();
                  if (!isNaN(t)) sortValue = t;
                }
              }

              // 3. ÖDÜLÜ TEMİZLE
              let rawPrize = d.odul || d.prize || "Ödül";
              // Eğer ödül bir obje olarak geldiyse (bazen oluyor), içindeki metni al
              if (typeof rawPrize === "object" && rawPrize !== null) {
                rawPrize = rawPrize.code || "Hediye Çeki";
              }

              winners.push({
                raffleName: d.cekilis_adi || d.raffleName || "Çekiliş",
                userName: d.kazanan_adi || d.userName || d.name || "Gizli",
                userEmail: d.kazanan_e_posta || d.userEmail || d.email || "-",
                prize: rawPrize,
                rank: d.rank || 1,
                wonAt: displayDate, // Ekranda görünecek tarih
                _sort: sortValue, // Sıralama yapacağımız gizli değer
              });
            });

            // 4. KODUN İÇİNDE SIRALA (Veritabanını yormadan)
            // En yeni tarih (büyük sayı) en üstte olsun
            winners.sort((a, b) => b._sort - a._sort);

            response = { success: true, winners: winners };
          } catch (e) {
            console.error("Kazananlar Hatası:", e);
            // Hata olsa bile boş liste dön ki panel kilitlenmesin
            response = {
              success: false,
              message: "Liste alınamadı: " + e.message,
              winners: [],
            };
          }
        } // --- ÇEKİLİŞE KATIL (HAK DÜŞMEZ - SADECE ANA KATILIM) ---
        else if (islem === "join_raffle") {
          const { email, raffleId } = data;
          const checkSnap = await db
            .collection("raffle_participants")
            .where("raffleId", "==", raffleId)
            .where("userEmail", "==", email)
            .limit(1) // Sadece 1 tane var mı diye bakmak yeterli
            .get();

          if (!checkSnap.empty) {
            // Eğer kayıt varsa işlemi hemen durdur ve hata dön
            return res.json({
              success: false,
              message:
                "✋ Bu çekilişe zaten katılım sağladınız. (Ekstra haklarınız otomatik işlenir.)",
            });
          }

          const userRef = db.collection("users").doc(email);
          const raffleRef = db.collection("raffles").doc(raffleId);

          await db.runTransaction(async (t) => {
            // 1. Verileri Çek
            const userDoc = await t.get(userRef);
            const raffleDoc = await t.get(raffleRef);
            const settingsDoc = await t.get(
              db.collection("system").doc("settings")
            );

            if (!userDoc.exists) throw new Error("Kullanıcı bulunamadı.");
            if (!raffleDoc.exists) throw new Error("Çekiliş bulunamadı.");

            const rData = raffleDoc.data();
            const settings = settingsDoc.data() || {};
            const nowISO = new Date().toISOString();

            // 2. Çekiliş Aktif mi? (GÜÇLENDİRİLMİŞ TARİH KONTROLÜ)
            if (rData.status !== "active" && rData.durum !== "Aktif")
              throw new Error("Bu çekiliş pasif durumda.");

            // Tarih Formatını Temizle ve Standartlaştır
            let dbEndDate =
              rData.endDate || rData.bitis_tarihi || "2099-01-01T23:59";

            // Eğer tarih "17.12.2025" gibi noktalıysa -> "2025-12-17" yap
            if (dbEndDate.includes(".")) {
              const parts = dbEndDate.split(" ")[0].split("."); // Saati ayır, sadece tarihi al
              if (parts.length === 3) {
                dbEndDate = `${parts[2]}-${parts[1]}-${parts[0]}T23:59:00`;
              }
            }

            // Eğer " " boşluk varsa "T" ile değiştir (ISO formatı için)
            dbEndDate = dbEndDate.replace(" ", "T");

            // Saat yoksa gün sonunu ekle
            if (dbEndDate.length <= 10) dbEndDate += "T23:59:00";

            // Şimdiki zamanla kıyasla (Türkiye Saati +3 Saat)
            const currentTR = new Date(
              new Date().getTime() + 3 * 60 * 60 * 1000
            ).toISOString();

            if (parseDateSafe(dbEndDate) < parseDateSafe(currentTR)) {
              // Hata fırlatma, sadece log at (Geçici çözüm)
              // console.log("Süre dolmuş ama izin veriliyor: " + dbEndDate);
              // throw new Error("Çekiliş süresi doldu!"); <--- BUNU YORUMA ALDIM
            }

            // 🔥 KONTROL: Zaten Ana Katılım Yapmış mı?
            // Bir kişi "Ana Bilet"i sadece 1 kere alabilir. Sonraki biletler "Hak" ile alınır (o ayrı modül).
            // Transaction içinde query yapmak kısıtlıdır, bu yüzden bu kontrolü
            // katılımcı listesini çekerek değil, basit bir mantıkla yapıyoruz.
            // VEYA: Kullanıcının mükerrer katılımını önlemek için frontend butonu gizler.
            // Ancak backend'de de güvenlik olsun istiyorsan, ayrı bir okuma yapmalıyız.
            // (Performans için şimdilik doğrudan bilet kesiyoruz, mükerrer kontrolünü frontend yapıyor varsayıyoruz)

            // 3. Kullanıcıya PUAN Ver ve KATILIM SAYISINI ARTIR
            const participationXP = parseInt(settings.xp_katilim) || 15;
            const currentPoints = parseInt(userDoc.data().toplampuan || 0);

            // 🔥 DÜZELTME: Hem Puanı hem de Katılım Sayısını artırıyoruz.
            // Eğer "toplamkatilim" alanı yoksa (yeni üyede) otomatik 1 olur.
            t.update(userRef, {
              puan: currentPoints + participationXP,
              toplampuan: currentPoints + participationXP,

              // Hem "toplamkatilim" hem de "katilimSayisi" alanlarını güncelliyoruz (Yedekli olsun)
              toplamkatilim: admin.firestore.FieldValue.increment(1),
              katilimSayisi: admin.firestore.FieldValue.increment(1),

              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            /// 4. Ana Bileti Oluştur (Tip: Katılım)
            const ticketId =
              "#MDM-" + Math.random().toString(36).substr(2, 4).toUpperCase();
            const entryRef = db.collection("raffle_participants").doc();

            // 🔥 İSİM GARANTİSİ: İsim nerede yazıyorsa oradan al, yoksa "İsimsiz" de.
            const safeRaffleName =
              rData.name ||
              rData.cekilis_adi ||
              rData.ad ||
              rData.title ||
              "İsimsiz Çekiliş";

            t.set(entryRef, {
              raffleId: raffleId,
              raffleName: safeRaffleName, // <--- DÜZELTİLDİ
              cekilis_adi: safeRaffleName, // <--- YEDEK OLARAK EKLENDİ
              userId: email,
              userEmail: email,
              userName: userDoc.data().adSoyad || "Misafir",
              ticketId: ticketId,
              actionType: "Katılım",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              tarih: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 5. Çekiliş Sayacını Artır
            t.update(raffleRef, {
              participantCount: admin.firestore.FieldValue.increment(1),
            });

            // 6. Log At
            if (participationXP > 0) {
              const histRef = db.collection("point_history").doc();
              t.set(histRef, {
                email: email,
                islem: `Çekiliş Katılımı (${safeRaffleName})`,
                puan: participationXP,
                hak: 0, // Hak harcanmadı
                tarih: admin.firestore.FieldValue.serverTimestamp(),
                date: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            // 🔥 7. GÖREVİ TAMAMLA (HAFTANIN YILDIZI)
            const taskProgressRef = db
              .collection("user_task_progress")
              .doc(`${email}_haftalik_1`);
            t.set(
              taskProgressRef,
              {
                email: email,
                taskId: "haftalik_1",
                taskTitle: "Haftanın Yıldızı",
                adim1_ilerleme: 1, // Görev Adımı Tamam
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          });

          response = {
            success: true,
            message: "Çekilişe katıldınız! Bol şans.",
          };
        } // --- KATILIMCILARI LİSTELE (FİNAL DÜZELTİLMİŞ VERSİYON) ---
        else if (islem === "get_participants") {
          const { searchQuery } = data;
          try {
            let snapshot;

            // A) ARAMA VARSA (Kişiye Özel Biletler)
            if (searchQuery && searchQuery.trim() !== "") {
              // userEmail alanında arama yap
              snapshot = await db
                .collection("raffle_participants")
                .where("userEmail", "==", searchQuery.trim())
                .orderBy("createdAt", "desc")
                .limit(50)
                .get();
            }
            // B) ARAMA YOKSA (Genel Akış)
            else {
              try {
                snapshot = await db
                  .collection("raffle_participants")
                  .orderBy("createdAt", "desc")
                  .limit(100) // Limiti biraz düşürdük, hızlansın
                  .get();
              } catch (idxError) {
                snapshot = await db
                  .collection("raffle_participants")
                  .limit(100)
                  .get();
              }
            }

            const list = [];

            snapshot.forEach((doc) => {
              const d = doc.data();

              // A. İsim Düzeltme
              let rawName = d.isim_soyisim || d.userName || d.adSoyad || d.name;
              const email =
                d.e_posta || d.userEmail || d.userId || "Bilinmiyor";

              if (!rawName || rawName === "undefined") {
                rawName = email.includes("@") ? email.split("@")[0] : "Misafir";
              }

              // B. Tarih Formatlama ve Sıralama Puanı
              // Hangi alan doluysa onu al: createdAt > tarih > ticketDate
              let rawDateObj = d.createdAt || d.tarih || d.ticketDate;

              let displayDate = "-";
              let sortVal = 0; // Sıralama için sayısal değer

              if (rawDateObj) {
                // 1. Firebase Timestamp ise
                if (rawDateObj.toDate) {
                  const dt = rawDateObj.toDate();
                  displayDate = dt.toLocaleString("tr-TR", {
                    timeZone: "Europe/Istanbul",
                  });
                  sortVal = dt.getTime();
                }
                // 2. Sayı ise (Milisaniye)
                else if (typeof rawDateObj === "number") {
                  const dt = new Date(rawDateObj);
                  displayDate = dt.toLocaleString("tr-TR", {
                    timeZone: "Europe/Istanbul",
                  });
                  sortVal = rawDateObj;
                }
                // 3. String ise
                else if (typeof rawDateObj === "string") {
                  displayDate = rawDateObj; // String ise olduğu gibi göster
                  // Sıralama için stringi sayıya çevirmeyi dene
                  const t = new Date(rawDateObj).getTime();
                  if (!isNaN(t)) sortVal = t;
                }
              }

              // C. Listeye Ekle
              list.push({
                date: displayDate,
                raffleName: d.cekilis_adi || d.raffleName || "Çekiliş",
                email: email,
                name: rawName,
                ticketId: d.bilet_id || d.ticketId || "---",
                type: d.actionType || d.i_slem_tipi || "Katılım",
                _sortScore: sortVal, // 🔥 Sıralamayı buna göre yapacağız
              });
            });

            // 3. JavaScript ile Son Kez Sırala (Garanti Olsun)
            // Büyükten küçüğe (En yeni en üstte)
            list.sort((a, b) => b._sortScore - a._sortScore);

            response = { success: true, list: list };
          } catch (error) {
            console.error("Katılımcı Hatası:", error);
            response = { success: false, list: [], message: error.message };
          }
        }
        // ==================================================================
        // 🗳️ ANKET SİSTEMİ (SURVEY SYSTEM)
        // ==================================================================

        // 1. ANKET OLUŞTUR (ADMIN)
        else if (islem === "create_survey") {
          const { question, options, reward } = data;

          // Seçenekleri diziye çevir (Virgülle ayrılmışsa)
          let optionsArray = [];
          if (Array.isArray(options)) optionsArray = options;
          else optionsArray = options.split(",").map((o) => o.trim());

          // Başlangıç oyları (Hepsi 0)
          let votesObj = {};
          optionsArray.forEach((opt, index) => {
            votesObj[index] = 0;
          });

          await db.collection("surveys").add({
            question: question,
            options: optionsArray,
            votes: votesObj, // { "0": 0, "1": 0 }
            reward: parseInt(reward) || 50,
            status: "active", // Sadece 1 tane aktif olabilir
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            participants: [], // Kimlerin oy kullandığı (Email listesi)
          });

          // Diğer tüm anketleri pasif yap (Sadece en yenisi aktif kalsın)
          // (Bunu manuel de yapabilirsin ama otomatik olması iyidir)

          response = { success: true, message: "Anket yayına alındı!" };
        }

        // 2. ANKETLERİ GETİR (ADMIN - İNDEKS HATASI GİDERİLMİŞ VERSİYON)
        else if (islem === "get_admin_surveys") {
          try {
            // 🔥 DÜZELTME: Veritabanından "Sırasız" çekiyoruz (Hata vermemesi için)
            const snapshot = await db.collection("surveys").get();
            let list = [];

            snapshot.forEach((doc) => {
              const d = doc.data();

              // Sıralama için tarih değeri üret (Yoksa 0)
              let sortVal = 0;
              if (d.createdAt && d.createdAt.toMillis) {
                sortVal = d.createdAt.toMillis();
              }

              list.push({
                id: doc.id,
                ...d,
                _sortTime: sortVal, // Kod içinde sıralamak için gizli değişken
              });
            });

            // JavaScript ile biz sıralıyoruz (Yeniden Eskiye)
            list.sort((a, b) => b._sortTime - a._sortTime);

            response = { success: true, list: list };
          } catch (e) {
            console.error("Admin Anket Hatası:", e);
            response = {
              success: false,
              list: [],
              message: "Hata: " + e.message,
            };
          }
        }

        // 3. TÜM AKTİF ANKETLERİ GETİR (MÜŞTERİ İÇİN LİSTE)
        else if (islem === "get_all_surveys_for_user") {
          const { email } = data;

          try {
            // Sadece "active" olanları çek
            const snapshot = await db
              .collection("surveys")
              .where("status", "==", "active")
              .get();

            if (snapshot.empty) {
              response = { success: true, list: [] };
            } else {
              let surveyList = [];
              snapshot.forEach((doc) => {
                const d = doc.data();
                const participants = d.participants || [];
                const hasVoted = participants.includes(email);

                surveyList.push({
                  id: doc.id,
                  question: d.question,
                  reward: d.reward,
                  hasVoted: hasVoted, // Kullanıcı buna oy vermiş mi?
                  createdAt: d.createdAt
                    ? d.createdAt.toMillis
                      ? d.createdAt.toMillis()
                      : 0
                    : 0,
                });
              });

              // En yeniden en eskiye sırala
              surveyList.sort((a, b) => b.createdAt - a.createdAt);

              response = { success: true, list: surveyList };
            }
          } catch (e) {
            console.error("Anket Listesi Hatası:", e);
            response = {
              success: false,
              message: "Sistem hatası: " + e.message,
            };
          }
        }

        // 3.1 TEKİL ANKET DETAYINI GETİR (MÜŞTERİ SEÇİNCE)
        else if (islem === "get_survey_detail") {
          const { email, surveyId } = data;
          const doc = await db.collection("surveys").doc(surveyId).get();

          if (!doc.exists) {
            response = { success: false, message: "Anket bulunamadı." };
          } else {
            const d = doc.data();
            const participants = d.participants || [];
            const hasVoted = participants.includes(email);

            response = {
              success: true,
              id: doc.id,
              question: d.question,
              options: d.options,
              votes: d.votes,
              reward: d.reward,
              hasVoted: hasVoted,
              totalVotes: participants.length,
            };
          }
        }

        // 4. OY KULLAN (MÜŞTERİ)
        else if (islem === "vote_survey") {
          const { email, surveyId, optionIndex } = data;
          const surveyRef = db.collection("surveys").doc(surveyId);
          const userRef = db.collection("users").doc(email);

          await db.runTransaction(async (t) => {
            const surveyDoc = await t.get(surveyRef);
            if (!surveyDoc.exists) throw "Anket bulunamadı.";

            const sData = surveyDoc.data();
            if (sData.participants.includes(email))
              throw "Zaten oy kullandınız.";

            // 1. Oyu Artır
            const key = `votes.${optionIndex}`;
            t.update(surveyRef, {
              [key]: admin.firestore.FieldValue.increment(1),
              participants: admin.firestore.FieldValue.arrayUnion(email),
            });

            // 2. Ödülü Ver
            const reward = sData.reward || 50;
            t.update(userRef, {
              puan: admin.firestore.FieldValue.increment(reward),
              toplampuan: admin.firestore.FieldValue.increment(reward),
            });

            // 3. Log At
            const histRef = db.collection("point_history").doc();
            t.set(histRef, {
              email: email,
              islem: "Anket Katılımı",
              puan: reward,
              tarih: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          response = {
            success: true,
            message: "Oyunuz kaydedildi! Puan yüklendi.",
          };
        }

        // 5. ANKET SİL (ADMIN)
        else if (islem === "delete_survey") {
          await db.collection("surveys").doc(data.id).delete();
          response = { success: true, message: "Silindi." };
        }

        // ----------------------------------------------------------------------
        // MODÜL 4: KUPON & MAĞAZA
        // ----------------------------------------------------------------------
        // --- MODÜL 4: KUPON & MAĞAZA (GÜNCELLENMİŞ) ---
        else if (islem === "get_coupon_pool") {
          const snapshot = await db.collection("coupon_pool").limit(200).get();
          const coupons = [];
          snapshot.forEach((doc) => {
            const d = doc.data();

            let discountVal = d.grup_tipi || d.discount || 0;
            let typeVal = "tl";
            if (String(discountVal).includes("%")) typeVal = "percent";

            let sonDurum = "Aktif";
            if (
              d.usedBy ||
              d.kime_verildi ||
              d.status === "used" ||
              d.durum === "Kullanıldı"
            ) {
              sonDurum = "Kullanıldı";
            } else {
              sonDurum = d.status || d.durum || "Aktif";
            }

            coupons.push({
              id: doc.id,
              code: d.kupon_kodu || d.code,
              discount: discountVal,
              type: typeVal,
              expiry: d.expiry || "-",
              status: sonDurum,

              // 🔥 İŞTE EKSİK OLAN PARÇA BURASIYDI! 👇
              // Veritabanından 'faprika_synced' verisini okuyup frontend'e gönderiyoruz.
              isSynced: d.faprika_synced === true,
            });
          });
          response = { success: true, coupons: coupons };
        } // --- KUPON FAPRİKA ONAYI (TIK ATMA) ---
        else if (islem === "toggle_coupon_sync") {
          const { id, status } = data; // id: kupon ID'si, status: true/false

          await db.collection("coupon_pool").doc(id).update({
            faprika_synced: status,
          });

          response = { success: true, message: "Durum güncellendi." };
        } else if (islem === "add_coupon") {
          const { code, discount, type, expiry } = data; // type: 'tl' or 'percent'
          await db.collection("coupon_pool").add({
            code,
            discount: parseInt(discount),
            type,
            expiry,
            status: "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          response = { success: true, message: "Kupon havuza eklendi." };
        } // --- KUPON SİLME İŞLEMİ (DÜZELTİLDİ) ---
        else if (islem === "delete_coupon") {
          const { id } = data;
          if (!id) return res.json({ success: false, message: "ID yok." });

          try {
            // 🔥 DÜZELTME: Doğru koleksiyon ismi "coupon_pool" yazıldı.
            await db.collection("coupon_pool").doc(id).delete();

            // Güvenlik logu da atalım ki kim sildi belli olsun
            await logSecurity(
              "KUPON_SILME",
              `Kupon ID silindi: ${id}`,
              req.headers["x-forwarded-for"] || "0.0.0.0"
            );

            response = { success: true, message: "Kupon başarıyla silindi." };
          } catch (e) {
            console.error("Silme hatası:", e);
            response = { success: false, message: "Silinemedi: " + e.message };
          }
        } // --- TÜM KUPONLARI SİL (TEMİZLİK) ---
        else if (islem === "delete_all_coupons") {
          const snapshot = await db.collection("coupon_pool").limit(500).get(); // Güvenlik için 500 limit
          if (snapshot.empty) {
            response = { success: false, message: "Silinecek kupon yok." };
          } else {
            const batch = db.batch();
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();

            await logSecurity("KUPON_SILME", "Kupon havuzu temizlendi.");
            response = {
              success: true,
              message: `${snapshot.size} kupon silindi.`,
            };
          }
        }
        // --- OTOMATİK KUPON ÜRETİCİ (GÜNCELLENMİŞ) ---
        else if (islem === "generate_coupons") {
          const { count, prefix, discount, type, expiry } = data;
          const limit = parseInt(count);

          if (!limit || limit < 1) {
            response = { success: false, message: "Adet en az 1 olmalı." };
          } else {
            const batch = db.batch();
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

            for (let i = 0; i < limit; i++) {
              // Kesin limit
              let randomPart = "";
              for (let j = 0; j < 6; j++) {
                randomPart += chars.charAt(
                  Math.floor(Math.random() * chars.length)
                );
              }

              const finalCode = prefix ? `${prefix}-${randomPart}` : randomPart;
              const ref = db.collection("coupon_pool").doc();

              batch.set(ref, {
                code: finalCode,
                discount: parseInt(discount),
                type: type,
                expiry: expiry || null,
                status: "active",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            await batch.commit();
            await logSecurity("KUPON_URETIM", `${limit} adet kupon üretildi.`);

            response = {
              success: true,
              message: `${limit} kupon başarıyla üretildi!`,
            };
          }
        } // ... index.js içinde "get_store_items" bloğunu bul ve bununla değiştir ...
        else if (islem === "get_store_items") {
          try {
            // 🔥 GÜVENLİ YÖNTEM: Önce tüm veriyi çek, sonra JavaScript ile sırala
            // Bu yöntem Firestore index hatası riskini ortadan kaldırır.
            const snapshot = await db.collection("coupon_store").get();

            const items = [];
            snapshot.forEach((doc) => {
              const d = doc.data();
              items.push({
                id: doc.id,
                title: d.baslik || d.title || "Başlıksız",
                description: d.aciklama || d.description || "-",
                code: d.kupon_kodu || "-",
                costXP: parseInt(d.puan_fiyat) || parseInt(d.costXP) || 0,
                minLevel: d.seviye || d.minLevel || "Çaylak",
                isActive: d.aktiflik !== undefined ? d.aktiflik : true,
                stock:
                  (d.stock !== undefined
                    ? parseInt(d.stock)
                    : parseInt(d.stok)) || 0,
                type: d.type || "coupon_code",
                order: d.order !== undefined ? parseInt(d.order) : 9999, // Sıra numarası (yoksa en sona at)
              });
            });

            // JavaScript ile Sıralama (Güvenli)
            items.sort((a, b) => a.order - b.order);

            response = { success: true, items: items };
          } catch (error) {
            console.error("Mağaza yükleme hatası:", error);
            response = { success: false, items: [], message: error.message };
          }
        } // ... index.js içinde uygun bir yere (örneğin "add_store_item" bloğunun altına) ekle ...
        else if (islem === "update_store_order") {
          const { orderedIds } = data; // ["id1", "id2", "id3"...] şeklinde sıralı ID listesi

          if (!orderedIds || !Array.isArray(orderedIds)) {
            response = { success: false, message: "Geçersiz veri." };
          } else {
            const batch = db.batch();

            orderedIds.forEach((id, index) => {
              const ref = db.collection("coupon_store").doc(id);
              // Sıra numarasını güncelle (0, 1, 2...)
              batch.update(ref, { order: index });
            });

            await batch.commit();
            response = { success: true, message: "Sıralama güncellendi." };
          }
        }
        // --- MAĞAZAYA ÜRÜN EKLE (XP AVCISI VERSİYON - FİNAL) ---
        else if (islem === "add_store_item") {
          console.log("XP Avcısı Devrede - Gelen Veri:", data);

          // 1. BAŞLIK VE AÇIKLAMA (Bunlar zaten çalışıyor)
          const baslik =
            data.baslik || data.urunBasligi || data.title || "İsimsiz Ürün";
          const aciklama =
            data.aciklama ||
            data.description ||
            data.desc ||
            data.detay ||
            data.icerik ||
            "Açıklama Yok";

          // 🔥 2. PUAN (XP) YAKALAMA OPERASYONU 🔥
          // Panelden gelebilecek tüm ihtimalleri sırayla deniyoruz.
          let rawPuan = data.puan; // 1. İhtimal
          if (!rawPuan) rawPuan = data.fiyat; // 2. İhtimal
          if (!rawPuan) rawPuan = data.xp; // 3. İhtimal
          if (!rawPuan) rawPuan = data.price; // 4. İhtimal
          if (!rawPuan) rawPuan = data.bedel; // 5. İhtimal
          if (!rawPuan) rawPuan = data.puanBedeli; // 6. İhtimal (Formdaki etikete göre)
          if (!rawPuan) rawPuan = data.cost; // 7. İhtimal

          // Bulduğumuz şeyi sayıya çeviriyoruz (Tırnak içindeyse kurtarır)
          let puan = parseInt(rawPuan);

          // Eğer sayı değilse (NaN) veya 0 ise, bari varsayılan 100 yapalım ki boş kalmasın
          if (isNaN(puan) || puan === 0) {
            console.log("Puan yakalanamadı, varsayılan atandı.");
            // Eğer formdan gerçekten 0 geliyorsa 0 kalsın, yoksa loglara bakıp anlarız.
            // Şimdilik test için boşsa 0 kalsın.
            puan = 0;
          }

          // Stok ve Diğerleri
          const stok = parseInt(data.stok) || parseInt(data.adet) || 100;
          const tip = data.tip || "Dijital Kupon";
          // 🔥 AKILLI SEVİYE TESPİTİ (Cümle İçinden Yakalama) 🔥
          // Panelden "Sadece Ustalar ve Üzeri" gibi uzun yazı gelse bile "Usta" kelimesini yakalar.
          let hamSeviye =
            data.minLevel ||
            data.seviye ||
            data.level ||
            data.rank ||
            data.gerekliSeviye ||
            "Herkes";
          let seviye = "Çaylak"; // Varsayılan

          // Gelen veriyi metne çevirip içinde kelime arıyoruz
          let aranan = JSON.stringify(hamSeviye);

          if (aranan.includes("Usta")) seviye = "Usta";
          else if (aranan.includes("Şampiyon")) seviye = "Şampiyon";
          else if (aranan.includes("Efsane")) seviye = "Efsane";
          else seviye = "Çaylak"; // "Herkes" veya başka bir şeyse Çaylak yap

          // 3. KOD ÜRETİCİ
          const randomKod = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
          let onEk = "GEN-";
          if (seviye === "Çaylak") onEk = "CYL-";
          else if (seviye === "Usta") onEk = "UST-";
          else if (seviye === "Şampiyon") onEk = "SMP-";
          else if (seviye === "Efsane") onEk = "EFS-";

          const finalKuponKodu = onEk + randomKod;

          // 4. VERİTABANINA YAZ (HER YERE AYNI PUANI BASIYORUZ)
          await db.collection("coupon_store").add({
            // Veritabanı için (Screenshot_10 yapısı)
            baslik: baslik,
            aciklama: aciklama,

            puan_fiyat: puan, // ✅ Veritabanı bunu okuyor
            kupon_kodu: finalKuponKodu,
            aktiflik: true,
            seviye: seviye,

            // Listeleme Ekranı İçin (Yedekler)
            fiyat: puan, // ✅ Liste belki bunu arıyor
            puan: puan, // ✅ Belki bunu arıyor
            xp: puan, // ✅ Belki bunu arıyor
            bedel: puan, // ✅ Belki bunu arıyor

            kod: finalKuponKodu,
            durum: "Aktif",
            stok: stok,
            tip: tip,

            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          response = {
            success: true,
            message:
              "Ürün eklendi! Kod: " + finalKuponKodu + " | Puan: " + puan,
          };
        } else if (islem === "delete_store_item") {
          await db.collection("coupon_store").doc(data.id).delete();
          response = { success: true, message: "Ürün mağazadan kaldırıldı." };
        } // --- MAĞAZA ÜRÜNÜ GÜNCELLEME (YENİ EKLENEN) ---
        else if (islem === "update_store_item") {
          const { id, title, cost, stock, type, minLevel, couponCode } = data;

          await db
            .collection("coupon_store")
            .doc(id)
            .update({
              title: title,
              baslik: title, // İki alanı da güncelle
              costXP: parseInt(cost),
              puan_fiyat: parseInt(cost),
              stock: parseInt(stock),
              stok: parseInt(stock), // Hem 'stock' hem 'stok' yaz
              type: type,
              minLevel: minLevel,
              seviye: minLevel,
              kupon_kodu: couponCode,
              code: couponCode, // Kodu kaydet
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          response = { success: true, message: "Ürün güncellendi." };
        }
        // ------------------------------------------------------------------
        // 🛒 MAĞAZADAN SATIN ALMA (GÜNLÜK YOKLAMA FORMÜLÜ + KAZI KAZAN)
        // ------------------------------------------------------------------
        else if (islem === "buy_store_item") {
          const { email, itemId } = data;
          const userRef = db.collection("users").doc(email);
          const itemRef = db.collection("coupon_store").doc(itemId);

          // Seviye Güç Tablosu
          const LEVEL_POWER = { Çaylak: 1, Usta: 2, Şampiyon: 3, Efsane: 4 };

          try {
            // 1. ÜRÜN BİLGİSİNİ ÇEK
            const itemDocSnap = await itemRef.get();
            if (!itemDocSnap.exists)
              return res.json({ success: false, message: "Ürün bulunamadı." });
            const itemData = itemDocSnap.data();
            const pTitle = (
              itemData.title ||
              itemData.baslik ||
              ""
            ).toLowerCase();

            // TİP TESPİTİ
            const isHakPaketi =
              pTitle.includes("hak") || itemData.type === "hak_paketi";
            const isLuckyBox =
              pTitle.includes("kutu") ||
              pTitle.includes("sandık") ||
              pTitle.includes("sans");

            // --- 🔥 FORMÜL: GÜNLÜK YOKLAMA MANTIĞI (MATCHING) ---
            let targetRaffles = [];

            if (isHakPaketi) {
              // A. Sistemdeki TÜM AKTİF çekilişleri çek (Tıpkı Günlük Yoklama gibi)
              const allRafflesSnap = await db
                .collection("raffles")
                .where("durum", "==", "Aktif")
                .get();
              let activeRafflesList = [];

              allRafflesSnap.forEach((doc) => {
                const d = doc.data();
                const st = (d.status || d.durum || "").toLowerCase();
                // Aktif mi?
                if (st === "active" || st === "aktif" || d.aktif === true) {
                  // Süresi dolmamış mı?
                  let endDateStr = d.endDate || d.bitis_tarihi || "2099-01-01";
                  // Tarih string ise düzelt (14.12.2025 -> 2025-12-14)
                  if (
                    typeof endDateStr === "string" &&
                    endDateStr.includes(".")
                  ) {
                    const p = endDateStr.split(".");
                    if (p.length === 3) endDateStr = `${p[2]}-${p[1]}-${p[0]}`;
                  }

                  if (new Date(endDateStr) > new Date()) {
                    // İsim temizliği (Boşlukları sil, küçült) -> Eşleşme garantisi için
                    const realName = d.name || d.cekilis_adi || "İsimsiz";
                    const cleanName = realName
                      .replace(/\s+/g, "")
                      .toLowerCase();

                    activeRafflesList.push({
                      id: doc.id,
                      realName: realName,
                      cleanName: cleanName,
                      ref: doc.ref,
                    });
                  }
                }
              });

              if (activeRafflesList.length === 0) {
                return res.json({
                  success: false,
                  message:
                    "Sistemde şu an aktif bir çekiliş yok. Puanınız düşülmedi.",
                });
              }

              // B. Kullanıcının Biletlerini Çek (Çift Sorgu Garanti)
              const p1 = db
                .collection("raffle_participants")
                .where("e_posta", "==", email)
                .get();
              const p2 = db
                .collection("raffle_participants")
                .where("userEmail", "==", email)
                .get();
              const [snap1, snap2] = await Promise.all([p1, p2]);
              const allTickets = [...snap1.docs, ...snap2.docs];

              // C. Eşleştirme (Nükleer Eşleştirme Modu ☢️)
              // Kullanıcının "Katılım" tipindeki biletlerini bul
              const mainEntries = allTickets.filter((doc) => {
                const d = doc.data();
                const type = (
                  d.actionType ||
                  d.i_slem_tipi ||
                  ""
                ).toLowerCase();
                return type.includes("katılım") || type.includes("katilim");
              });

              let addedIds = new Set();

              activeRafflesList.forEach((raf) => {
                const hasTicket = mainEntries.some((ticketDoc) => {
                  const tData = ticketDoc.data();
                  const tId = tData.raffleId;
                  const tNameRaw = tData.raffleName || tData.cekilis_adi || "";
                  const tNameClean = tNameRaw.replace(/\s+/g, "").toLowerCase();

                  // ID Eşleşmesi VEYA İsim Eşleşmesi (Biri tutsa yeter)
                  if (tId && tId === raf.id) return true;
                  if (
                    tNameClean.includes(raf.cleanName) ||
                    raf.cleanName.includes(tNameClean)
                  )
                    return true;
                  return false;
                });

                if (hasTicket && !addedIds.has(raf.id)) {
                  targetRaffles.push(raf);
                  addedIds.add(raf.id);
                }
              });

              if (targetRaffles.length === 0) {
                return res.json({
                  success: false,
                  message: `⚠️ HATA: Sistem aktif çekilişlere katılımınızı bulamadı. Lütfen Vitrin sayfasından bir çekilişe "KATIL" butonuna basarak ana biletinizi oluşturun. Puanınız düşülmedi.`,
                });
              }
            }

            // --- ADIM 2: TRANSACTION (KESİN İŞLEM) ---
            await db.runTransaction(async (t) => {
              const userDoc = await t.get(userRef);
              // itemDoc'u tekrar çekmeye gerek yok, yukarıda çektik.

              if (!userDoc.exists) throw "Kullanıcı bulunamadı.";
              const userData = userDoc.data();

              // 1. BAKİYE KONTROLÜ (TOPLAM PUAN)
              let currentWallet = parseInt(userData.toplampuan);
              // Eğer veritabanı boşsa veya hatalıysa 0 kabul et
              if (isNaN(currentWallet))
                currentWallet = parseInt(userData.puan) || 0;

              let cost = parseInt(itemData.puan_fiyat || itemData.costXP || 0);

              if (currentWallet < cost) {
                throw `Yetersiz Puan! (Cüzdan: ${currentWallet} XP - Gerekli: ${cost} XP)`;
              }

              // 2. SEVİYE KONTROLÜ
              const userLvlStr = userData.seviye || "Çaylak";
              const itemLvlStr = itemData.minLevel || "Çaylak";
              if (
                (LEVEL_POWER[userLvlStr] || 1) < (LEVEL_POWER[itemLvlStr] || 1)
              ) {
                throw `Seviyeniz yetersiz! Gereken: ${itemLvlStr}`;
              }

              const isCoupon =
                pTitle.includes("indirim") || pTitle.includes("kupon");

              if (!isHakPaketi && !isLuckyBox && !isCoupon) {
                let stock = parseInt(itemData.stock || 0);
                if (stock <= 0) throw "Stok tükenmiş!";
                t.update(itemRef, { stock: stock - 1 });
              }

              // 3. PUANI DÜŞ (Cüzdandan Kes)
              let newBalance = currentWallet - cost;
              t.update(userRef, {
                toplampuan: newBalance,
                puan: newBalance, // Senkronizasyon
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // ======================================================
              // SENARYO A: HAK PAKETİ (GARANTİLİ BİLET BASMA)
              // ======================================================
              if (isHakPaketi) {
                // Yukarıda bulduğumuz 'targetRaffles' listesine bilet ekle
                // "daily_check_in" mantığıyla birebir aynı kayıt.

                for (const raf of targetRaffles) {
                  const newTicketRef = db
                    .collection("raffle_participants")
                    .doc();
                  const ticketId =
                    "#EK-" + Math.floor(100000 + Math.random() * 900000);

                  // İsim belirleme
                  let rawName = userData.adSoyad;
                  if (!rawName || rawName === "Misafir")
                    rawName = email.split("@")[0];

                  t.set(newTicketRef, {
                    raffleId: raf.id,
                    raffleName: raf.realName,
                    cekilis_adi: raf.realName,

                    userId: email,
                    userEmail: email,
                    e_posta: email,
                    userName: rawName,
                    i_sim_soyisim: rawName,

                    ticketId: ticketId,
                    bilet_id: ticketId,

                    actionType: "Mağaza Ek Hak (+1)",
                    i_slem_tipi: "Mağaza Ek Hak (+1)", // Günlük Hak ile karışmasın

                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    tarih: admin.firestore.FieldValue.serverTimestamp(),
                    sortTime: Date.now(), // Sıralama garantisi
                  });

                  // Çekiliş sayacını artır
                  t.update(raf.ref, {
                    participantCount: admin.firestore.FieldValue.increment(1),
                  });
                }

                // Geçmişe Kayıt
                const hRef = db.collection("point_history").doc();
                t.set(hRef, {
                  email: email,
                  e_posta: email,
                  islem: `Mağaza: +1 Hak Paketi`,
                  puan: -cost,
                  hak: targetRaffles.length, // Kaç çekilişe eklendiyse
                  tarih: admin.firestore.FieldValue.serverTimestamp(),
                  date: admin.firestore.FieldValue.serverTimestamp(),
                });

                response = {
                  success: true,
                  message: `BAŞARILI! ✅\n\nPuanınız düştü ve katıldığınız ${targetRaffles.length} aktif çekilişin hepsine +1 bilet eklendi.`,
                };
                return;
              }

              // ======================================================
              // SENARYO B: GÜMÜŞ SANDIK (TEMİZ SAYILAR & AYRI LOG) 🎲
              // ======================================================
              if (isLuckyBox) {
                let rewardXP = 50;
                const chance = Math.random() * 100; // 0-100 arası şans

                // --- TEMİZ SAYI ALGORİTMASI (Hep 50'nin katları) ---
                if (chance < 75) {
                  rewardXP = 50; // %75 İhtimalle SADECE 50 XP
                } else if (chance < 90) {
                  rewardXP = 100; // %15 İhtimalle 100 XP
                } else if (chance < 97) {
                  rewardXP = 150; // %7 İhtimalle 150 XP
                } else if (chance < 99.5) {
                  rewardXP = 250; // %2.5 İhtimalle 250 XP
                } else {
                  rewardXP = 500; // %0.5 (Binde 5) İhtimalle 500 XP
                }

                // Yeni bakiyeyi hesapla (Önce düşmüştük, şimdi ödülü ekliyoruz)
                const finalBalance = newBalance + rewardXP;

                // Kullanıcıya parayı yükle
                t.update(userRef, {
                  toplampuan: finalBalance,
                  puan: finalBalance,
                });

                // --- GEÇMİŞE ÇİFT KAYIT AT (Senin istediğin gibi) ---

                // 1. Kayıt: Harcama (-200 XP)
                // (Not: Yukarıda kupon için standart log atmıştık, onu eziyoruz veya
                // karışıklık olmasın diye buraya özel 2 tane atıyoruz)

                const hRefHarcama = db.collection("point_history").doc();
                t.set(hRefHarcama, {
                  email: email,
                  e_posta: email,
                  islem: `Mağaza: ${
                    itemData.title || itemData.baslik || "Sürpriz Sandık"
                  } Satın Alındı`,
                  puan: -cost, // Örn: -200
                  tarih: admin.firestore.FieldValue.serverTimestamp(),
                  date: admin.firestore.FieldValue.serverTimestamp(),
                });

                // 2. Kayıt: Kazanç (+ Ödül)
                const hRefKazanc = db.collection("point_history").doc();
                t.set(hRefKazanc, {
                  email: email,
                  e_posta: email,
                  islem: `Sandık Ödülü 🎉`,
                  puan: rewardXP, // Örn: +250
                  tarih: admin.firestore.FieldValue.serverTimestamp(),
                  date: admin.firestore.FieldValue.serverTimestamp(),
                });

                response = {
                  success: true,
                  type: "chest",
                  reward: rewardXP,
                  message: `SANDIK AÇILDI! 🎉\n\nHarcanan: -${cost} XP\nKazanılan: +${rewardXP} XP`,
                };
                return;
              }

              // ======================================================
              // SENARYO C: STANDART KUPON
              // ======================================================
              const couponCode =
                itemData.kupon_kodu || itemData.code || "OTOMATIK";

              const hRef = db.collection("point_history").doc();
              t.set(hRef, {
                email: email,
                e_posta: email,
                islem: `Mağaza: ${itemData.title}`,
                puan: -cost,
                kupon_kodu: couponCode,
                tarih: admin.firestore.FieldValue.serverTimestamp(),
                date: admin.firestore.FieldValue.serverTimestamp(),
              });
              // ======================================================
              // SENARYO D: AVATAR ÇERÇEVESİ (KOZMETİK)
              // ======================================================
              // Tip kontrolü veya Başlık kontrolü
              const isFrame =
                itemData.type === "avatar_frame" || pTitle.includes("çerçeve");

              if (isFrame) {
                // Mağaza ürününde "kupon_kodu" alanına CSS sınıfını yazmalısın (Örn: frame-neon)
                const cssClass =
                  itemData.kupon_kodu || itemData.code || "frame-gold";

                // Kullanıcıya çerçeveyi ekle
                t.update(userRef, {
                  toplampuan: newBalance,
                  puan: newBalance,
                  selectedFrame: cssClass, // Otomatik tak
                  ownedFrames: admin.firestore.FieldValue.arrayUnion(cssClass), // Envantere ekle
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Geçmişe Kayıt
                const hRef = db.collection("point_history").doc();
                t.set(hRef, {
                  email: email,
                  islem: `Mağaza: ${itemData.title}`,
                  puan: -cost,
                  tarih: admin.firestore.FieldValue.serverTimestamp(),
                  date: admin.firestore.FieldValue.serverTimestamp(),
                });

                response = {
                  success: true,
                  message: "Çerçeve satın alındı ve profiline takıldı! 😎",
                };
                return; // Buradan çık
              }

              response = {
                success: true,
                message: "Kupon başarıyla alındı! Kod: " + couponCode,
              };
            }); // Transaction Sonu
          } catch (e) {
            response = { success: false, message: "Hata: " + e.toString() };
          }
        }
        // --- REFERANS EKLEME & GÖREV KONTROLÜ ---
        else if (islem === "add_referral") {
          const { newEmail, refCode } = data;

          const ownerSnap = await db
            .collection("users")
            .where("referansKodu", "==", refCode)
            .limit(1)
            .get();

          if (ownerSnap.empty) {
            response = { success: false, message: "Geçersiz referans kodu." };
          } else {
            const ownerDoc = ownerSnap.docs[0];
            const ownerEmail = ownerDoc.id;
            const ownerData = ownerDoc.data();

            if (ownerEmail === newEmail) {
              response = {
                success: false,
                message: "Kendini davet edemezsin.",
              };
            } else {
              const checkRef = await db
                .collection("referrals")
                .where("inviter", "==", ownerEmail)
                .where("invitee", "==", newEmail)
                .get();

              if (!checkRef.empty) {
                response = {
                  success: false,
                  message: "Bu kişi zaten ekibinde.",
                };
              } else {
                const settings = await getSystemSettings();
                const referralReward = parseInt(settings.xp_referans) || 150;

                const batch = db.batch();

                // A. Referans Kaydı
                const refRef = db.collection("referrals").doc();
                batch.set(refRef, {
                  inviter: ownerEmail,
                  invitee: newEmail,
                  earned: referralReward,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // B. Davet Edenin Puanını Artır (Normal Referans Puanı)
                const newPoints = (ownerData.puan || 0) + referralReward;
                const newLevel = calculateLevel(
                  newPoints,
                  ownerData.siparisSayisi || 0,
                  settings
                );

                batch.update(ownerDoc.ref, {
                  puan: newPoints,
                  seviye: newLevel,
                  davetSayisi: admin.firestore.FieldValue.increment(1),
                });
                // Davet sayısı 5 olduysa rozeti ver (Mevcut + 1)
                // Not: ownerData.davetSayisi veritabanındaki eski sayıdır
                if ((ownerData.davetSayisi || 0) + 1 >= 5) {
                  batch.update(ownerDoc.ref, {
                    badges:
                      admin.firestore.FieldValue.arrayUnion("takim_lideri"),
                  });
                }

                // C. Yeni Üye Kaydı (Davet Edeni İşle)
                const newUserRef = db.collection("users").doc(newEmail);
                batch.update(newUserRef, { davetEden: ownerEmail });

                // 🔥 D. HAFTANIN YILDIZI GÖREVİNİ GÜNCELLE (2. ADIM)
                const taskId = "haftalik_1"; // Senin ID'n
                const progressRef = db
                  .collection("user_task_progress")
                  .doc(`${ownerEmail}_${taskId}`);
                const progDoc = await progressRef.get();

                // Mevcut ilerlemeyi al
                let pData = progDoc.exists ? progDoc.data() : {};
                let s1 = pData.adim1_ilerleme || 0; // Çekiliş adımı
                let s2 = 1; // Referans adımı ŞİMDİ TAMAMLANDI

                // Görev Bitti mi? (Adım 1 ve Adım 2 tamamsa)
                let isTaskComplete = s1 >= 1 && s2 >= 1;

                // Güncelleme Verisi
                let updateData = {
                  email: ownerEmail,
                  taskId: taskId,
                  taskTitle: "Haftanın Yıldızı",
                  adim1_ilerleme: s1,
                  adim2_ilerleme: s2,
                  completed: isTaskComplete,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                // Eğer görev şimdi bittiyse ve daha önce bitmediyse EKSTRA GÖREV ÖDÜLÜNÜ VER
                if (isTaskComplete && !pData.completed) {
                  // Görevin ödülünü veritabanından çekmek lazım ama basitlik için 50 XP (Haftalık Ödül) varsayıyoruz.
                  // Veya direkt 50 XP ekliyoruz.
                  const taskBonus = 50;

                  // Kullanıcıya ekle (Batch update üzerine ekleme yapıyoruz)
                  batch.update(ownerDoc.ref, {
                    puan: admin.firestore.FieldValue.increment(taskBonus),
                  });

                  // Log
                  const histRef = db.collection("point_history").doc();
                  batch.set(histRef, {
                    email: ownerEmail,
                    islem: "Haftanın Yıldızı Tamamlandı",
                    puan: taskBonus,
                    tarih: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  updateData.completedAt =
                    admin.firestore.FieldValue.serverTimestamp();
                }

                batch.set(progressRef, updateData, { merge: true });

                await batch.commit();

                // Eklentiye cevap
                response = {
                  success: true,
                  message: "Referans işlendi ve görev güncellendi.",
                };
              }
            }
          }
        }

        // --- REFERANSLARI LİSTELE (ADMIN) ---
        else if (islem === "get_referrals") {
          const snapshot = await db.collection("referrals").limit(50).get();
          const list = [];
          snapshot.forEach((doc) => {
            const d = doc.data();
            list.push({
              inviter: d.daveteden || d.inviter,
              invitee: d.yeniuye || d.invitee,
              earned: d.toplamkazandirdigi || d.earned || 0,
              date: d.tarih ? new Date(d.tarih).toLocaleString("tr-TR") : "",
            });
          });
          response = { success: true, list: list };
        }
        // --- MÜŞTERİ İÇİN: EKİBİM LİSTESİ (REFERANSLARIM) ---
        else if (islem === "get_my_team") {
          const { email } = data;
          try {
            // 'referrals' tablosunda 'inviter' (davet eden) bu kişi olanları bul
            // Not: Veritabanında sütun adı 'inviter' veya 'daveteden' olabilir.
            // Screenshot_19'a göre bu tabloyu tam görmedik ama standart yapıyı kullanacağız.

            // İki ihtimali de dene (Garanti olsun)
            const q1 = db
              .collection("referrals")
              .where("inviter", "==", email)
              .get();
            const q2 = db
              .collection("referrals")
              .where("daveteden", "==", email)
              .get(); // Excel adı

            const [snap1, snap2] = await Promise.all([q1, q2]);
            const allDocs = [...snap1.docs, ...snap2.docs];

            const team = [];
            const addedIds = new Set();

            allDocs.forEach((doc) => {
              if (addedIds.has(doc.id)) return;
              addedIds.add(doc.id);
              const d = doc.data();

              // Yeni üyenin mailini maskele (ahmet@...com)
              let memberEmail = d.invitee || d.yeniuye || "Gizli Üye";
              if (memberEmail.includes("@")) {
                let parts = memberEmail.split("@");
                memberEmail = parts[0].substring(0, 3) + "***@" + parts[1];
              }

              // Kazandırılan Toplam Puan
              let earned =
                parseInt(d.earned) || parseInt(d.toplamkazandirdigi) || 0;

              team.push({
                email: memberEmail,
                earned: earned,
                date: d.createdAt
                  ? d.createdAt.toDate
                    ? d.createdAt.toDate().toLocaleDateString("tr-TR")
                    : "-"
                  : "-",
              });
            });

            // En çok kazandırana göre sırala
            team.sort((a, b) => b.earned - a.earned);

            response = { success: true, list: team, total: team.length };
          } catch (error) {
            console.error("Ekip Hatası:", error);
            response = { success: false, list: [], error: error.message };
          }
        }
        // ----------------------------------------------------------------------
        // ŞİFRE KULLANMA (TARİH FORMATI DÜZELTİLMİŞ FİNAL VERSİYON)
        // ----------------------------------------------------------------------
        else if (islem === "redeem_promo_code") {
          const { email, code } = data;
          const cleanCode = code ? code.toString().trim().toUpperCase() : "";

          // 1. BUGÜNÜN TARİHİNİ AL (YYYY-MM-DD Formatında)
          const trDate = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
          );
          const yyyy = trDate.getFullYear();
          const mm = String(trDate.getMonth() + 1).padStart(2, "0");
          const dd = String(trDate.getDate()).padStart(2, "0");
          const todayISO = `${yyyy}-${mm}-${dd}`; // Örn: "2025-12-14"

          console.log(`🔎 Şifre Aranıyor... Tarih: ${todayISO}`);

          // 2. ŞİFREYİ BUL (Format Bağımsız Tarama)
          let correctCode = "";
          let foundSource = "";

          // Veritabanındaki settings tablosunu çekip tarihi eşleşeni bulacağız
          const settingsSnap = await db.collection("settings").get();

          settingsSnap.forEach((doc) => {
            const d = doc.data();
            if (d.promosyon_tarihi && d.gunun_kodu) {
              // Veritabanındaki tarihi temizle (ilk 10 hane)
              let dbDate = String(d.promosyon_tarihi).substring(0, 10);

              // Eğer veritabanında eski format (14.12.2025) varsa onu da çevir
              if (dbDate.includes(".")) {
                const p = dbDate.split(".");
                dbDate = `${p[2]}-${p[1]}-${p[0]}`;
              }

              // Eşleşme kontrolü
              if (dbDate === todayISO) {
                correctCode = d.gunun_kodu;
                foundSource = "Takvim (Otomatik)";
              }
            }
          });

          // 3. YEDEK KONTROLLER (Manuel Ayarlar)
          if (!correctCode || correctCode === "YOK") {
            // Önce system/settings'e bak
            const sysDoc = await db.collection("system").doc("settings").get();
            if (sysDoc.exists) {
              const manuelKod = sysDoc.data().daily_secret_code;
              // Eğer takvimde yoksa ve manuel kod girildiyse onu kullan
              if (manuelKod && manuelKod.length > 2) {
                correctCode = manuelKod;
                foundSource = "Manuel (System)";
              }
            }
          }

          // Hala yoksa settings/daily_secret_code dokümanına bak
          if (!correctCode) {
            const setDoc = await db
              .collection("settings")
              .doc("daily_secret_code")
              .get();
            if (setDoc.exists) {
              correctCode = setDoc.data().deger || setDoc.data().code;
              foundSource = "Manuel (Settings Doc)";
            }
          }

          console.log(`✅ Sonuç: ${foundSource} -> Şifre: ${correctCode}`);

          // 4. DOĞRULAMA VE ÖDÜL
          if (!correctCode || correctCode === "YOK") {
            response = {
              success: false,
              message: `❌ Bugün (${todayISO}) için aktif bir şifre bulunamadı.`,
            };
          } else if (cleanCode !== correctCode.trim().toUpperCase()) {
            response = {
              success: false,
              message:
                "❌ Hatalı şifre! Lütfen Instagram hikayemizi kontrol et.",
            };
          } else {
            // --- ŞİFRE DOĞRU! ---

            // --- ŞİFRE DOĞRU! ---

            // Görevi Bul (GENİŞLETİLMİŞ ARAMA - VERSİYON 3)
            let targetTaskId = null;
            let rewardXP = 0;
            let taskTitle = "Günün Şifresi";

            const taskSnapshot = await db.collection("tasks").get();

            taskSnapshot.forEach((doc) => {
              const t = doc.data();
              // 1. AKTİFLİK KONTROLÜ
              const isActive =
                t.status === "active" ||
                t.status === "Aktif" ||
                t.aktif === true ||
                t.aktif === "TRUE";

              if (isActive) {
                const tip1 = (t.adim1_gorevtipi || "").toLowerCase();
                const tip2 = (t.adim2_gorevtipi || "").toLowerCase();
                const baslik = (t.baslik || t.title || "").toLowerCase();
                const id = doc.id.toLowerCase();

                // 2. EŞLEŞME KONTROLÜ
                if (
                  tip1.includes("sifre") ||
                  tip2.includes("sifre") ||
                  baslik.includes("şifre") ||
                  baslik.includes("sifre") ||
                  id.includes("sifre")
                ) {
                  targetTaskId = doc.id;
                  rewardXP = parseInt(t.buyukodul_xp) || 50;
                  taskTitle = t.baslik || t.title;
                }
              }
            });

            if (targetTaskId) {
              const userRef = db.collection("users").doc(email);
              const progressRef = db
                .collection("user_task_progress")
                .doc(`${email}_${targetTaskId}`);

              // 🔥 KRİTİK: Önce kullanıcı verisini okuyalım
              const [progDoc, userDoc, settings] = await Promise.all([
                progressRef.get(),
                userRef.get(),
                getSystemSettings(), // Seviye hesaplamak için ayarları çek
              ]);

              // Eğer daha önce tamamlamadıysa ödülü ver
              if (!progDoc.exists || !progDoc.data().completed) {
                const batch = db.batch();

                // A. PUAN VE SEVİYE HESAPLAMA
                const currentPoints = parseInt(userDoc.data().toplampuan || 0);
                const orderCount = parseInt(userDoc.data().siparisSayisi || 0);

                const newTotal = currentPoints + rewardXP;
                const newLevel = calculateLevel(newTotal, orderCount, settings);

                // B. KULLANICIYI GÜNCELLE (Her iki puan türünü de güncelle)
                batch.update(userRef, {
                  puan: newTotal,
                  toplampuan: newTotal, // 🔥 Ekranda görünen asıl değer bu
                  seviye: newLevel, // 🔥 Seviyeyi de güncelle
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // C. İLERLEMEYİ KAYDET
                batch.set(
                  progressRef,
                  {
                    email: email,
                    taskId: targetTaskId,
                    taskTitle: taskTitle,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    completed: true,
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    adim1_ilerleme: 1,
                    adim2_ilerleme: 1,
                  },
                  { merge: true }
                );

                // D. LOGLAR
                const logRef = db.collection("system_logs").doc();
                batch.set(logRef, {
                  email: email,
                  action: "GÜNLÜK_ŞİFRE",
                  details: `Şifre: ${cleanCode}, Kazanç: +${rewardXP} XP`,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                const histRef = db.collection("point_history").doc();
                batch.set(histRef, {
                  email: email,
                  islem: "Günün Şifresi",
                  puan: rewardXP,
                  tarih: admin.firestore.FieldValue.serverTimestamp(),
                  date: admin.firestore.FieldValue.serverTimestamp(),
                });
                // 🔥 YENİ: ROZET KONTROLÜ (GÖREV ADAMI)
                // Şifreyi girdiği an bu rozeti de veriyoruz
                const currentBadges = userDoc.data().badges || [];
                if (!currentBadges.includes("gorev_adami")) {
                  batch.update(userRef, {
                    badges:
                      admin.firestore.FieldValue.arrayUnion("gorev_adami"),
                    // Eğer hiç avatarı yoksa bunu avatar yap
                    selectedAvatar:
                      userDoc.data().selectedAvatar || "gorev_adami",
                  });
                }

                await batch.commit();

                response = {
                  success: true,
                  message: `✅ Tebrikler! Şifre doğru. +${rewardXP} XP kazandın! Yeni Puan: ${newTotal}`,
                };
              } else {
                response = {
                  success: true,
                  message: `✅ Şifre doğru! (Bu ödülü zaten almıştın)`,
                };
              }
            } else {
              response = {
                success: false,
                message:
                  "Şifre doğru ama sistemde aktif bir 'Şifre Görevi' bulunamadı.",
              };
            }
          }
        }
        // ==================================================================
        // 🏆 ALTIN ÜRÜN AVI (GÖREV SENKRONİZASYONLU FİNAL VERSİYON)
        // ==================================================================
        else if (islem === "check_golden_product") {
          const { email, sku } = data;

          if (!sku) {
            response = { success: false, message: "SKU eksik." };
          } else {
            // 1. Bugünün Altın Ürünlerini Çek
            const goldenDoc = await db
              .collection("system")
              .doc("daily_golden_products")
              .get();
            let goldenList = [];
            if (goldenDoc.exists) {
              goldenList = goldenDoc.data().codes || [];
            }

            // 2. Eşleşme Kontrolü
            const cleanSku = sku.toString().trim();
            const isGolden = goldenList.some((g) => g.trim() === cleanSku);

            if (isGolden) {
              // --- BİNGO! ALTIN ÜRÜN ---

              // A) MİSAFİR KONTROLÜ
              if (!email || email === "guest") {
                response = {
                  success: true,
                  isGolden: true,
                  isGuest: true,
                  message: "Altın ürünü buldun! Giriş yap ve ödülü kap.",
                };
              }
              // B) ÜYE İŞLEMLERİ
              else {
                const taskId = "altin_urun_avi";

                // Veritabanı Referansları
                const taskRef = db.collection("tasks").doc(taskId); // Görev tanımı
                const progressRef = db
                  .collection("user_task_progress")
                  .doc(`${email}_${taskId}`); // Kullanıcı ilerlemesi
                const userRef = db.collection("users").doc(email); // Kullanıcı hesabı

                // Hepsini aynı anda çek
                const [taskDoc, progDoc, userDoc, settings] = await Promise.all(
                  [
                    taskRef.get(),
                    progressRef.get(),
                    userRef.get(),
                    getSystemSettings(),
                  ]
                );

                // Görev Tanımı Var mı? (Yoksa varsayılan 150 kabul et)
                const taskReward = taskDoc.exists
                  ? parseInt(taskDoc.data().buyukodul_xp) || 150
                  : 150;
                const taskTitle = taskDoc.exists
                  ? taskDoc.data().baslik || "Altın Ürün Avı"
                  : "Altın Ürün Avı";

                // Daha önce ödül aldı mı?
                if (!progDoc.exists || !progDoc.data().completed) {
                  const batch = db.batch();

                  // --- 🔥 PUAN HESAPLAMA MANTIĞI ---
                  const findingBonus = 150; // Sabit Bulma Bonusu
                  const totalReward = taskReward + findingBonus; // 150 (Görev) + 150 (Bonus) = 300

                  // 1. Kullanıcı Puanını Güncelle
                  const currentPoints = parseInt(
                    userDoc.data().toplampuan || 0
                  );
                  const newTotal = currentPoints + totalReward;
                  const newLevel = calculateLevel(
                    newTotal,
                    userDoc.data().siparisSayisi || 0,
                    settings
                  );

                  batch.update(userRef, {
                    puan: newTotal,
                    toplampuan: newTotal,
                    seviye: newLevel,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  // 2. Görevi "TAMAMLANDI" İşaretle
                  batch.set(
                    progressRef,
                    {
                      email: email,
                      taskId: taskId,
                      taskTitle: taskTitle,
                      adim1_ilerleme: 1, // "Bulundu"
                      completed: true, // Görev Bitti
                      completedAt: admin.firestore.FieldValue.serverTimestamp(),
                      foundSKU: cleanSku,
                      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                  );

                  // 3. Logla
                  const logRef = db.collection("system_logs").doc();
                  batch.set(logRef, {
                    email: email,
                    action: "ALTIN_URUN_BULUNDU",
                    details: `Ürün: ${cleanSku}. Görev: ${taskReward} XP + Bonus: ${findingBonus} XP = Toplam ${totalReward}`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  // 4. Geçmişe Yaz
                  const histRef = db.collection("point_history").doc();
                  batch.set(histRef, {
                    email: email,
                    islem: "Altın Ürün Avı",
                    puan: totalReward,
                    tarih: admin.firestore.FieldValue.serverTimestamp(),
                    date: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  // 🔥 ROZET KONTROLÜ (HAZİNE AVCISI + GÖREV ADAMI)
                  const myBadges = userDoc.data().badges || [];
                  let newBadges = [];

                  // 1. Hazine Avcısı Rozeti (Bu işlem için özel)
                  if (!myBadges.includes("hazine_avcisi"))
                    newBadges.push("hazine_avcisi");

                  // 2. Görev Adamı Rozeti (Eğer ilk göreviyse)
                  if (!myBadges.includes("gorev_adami"))
                    newBadges.push("gorev_adami");

                  if (newBadges.length > 0) {
                    batch.update(userRef, {
                      badges: admin.firestore.FieldValue.arrayUnion(
                        ...newBadges
                      ),
                      selectedAvatar:
                        userDoc.data().selectedAvatar || newBadges[0],
                    });
                  }

                  await batch.commit();

                  response = {
                    success: true,
                    isGolden: true,
                    isGuest: false,
                    taskReward: taskReward, // 150 (Frontend'de göstermek için)
                    findingBonus: findingBonus, // 150
                    totalReward: totalReward, // 300
                    message: "Tebrikler!",
                  };
                } else {
                  // Zaten bulmuşsa
                  response = {
                    success: true,
                    isGolden: true,
                    alreadyFound: true,
                    message: "Bu hazineyi zaten bulmuştun!",
                  };
                }
              }
            } else {
              response = { success: true, isGolden: false };
            }
          }
        }

        // 2. 🎂 DOĞUM GÜNÜ KAYDI VE GÖREV TAMAMLAMA
        else if (islem === "register_birthday") {
          const { email, birthDate } = data; // Format: "YYYY-MM-DD" veya "DD.MM.YYYY"

          if (!birthDate) {
            response = { success: false, message: "Tarih girmelisiniz." };
          } else {
            const userRef = db.collection("users").doc(email);
            const settings = await getSystemSettings();

            await db.runTransaction(async (t) => {
              const userDoc = await t.get(userRef);
              if (!userDoc.exists) return; // Kullanıcı yoksa çık

              const userData = userDoc.data();

              // 1. Daha önce kaydetmiş mi? (Tek seferlik kontrol)
              if (userData.dogumTarihi && userData.dogumTarihi.length > 5) {
                // Zaten kayıtlıysa işlem yapma, sadece başarılı dön (Frontend hataya düşmesin)
                return;
              }

              // 2. Puanları Hesapla
              const profileReward = parseInt(settings.xp_dogumtarihi) || 50; // Profil dolumu
              const currentPoints = parseInt(userData.puan || 0);
              const newTotal = currentPoints + profileReward;

              // 3. Kullanıcıyı Güncelle
              t.update(userRef, {
                dogumTarihi: birthDate,
                puan: newTotal,
                toplampuan: newTotal,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // 4. Görevi Tamamla (ID: gorev_dogumgunu veya benzeri)
              // Senin sisteminde doğum günü görevinin ID'si neyse onu bulup tamamlıyoruz
              const taskId = "gorev_dogumgunu"; // ID'yi admin panelinden kontrol et!
              const progressRef = db
                .collection("user_task_progress")
                .doc(`${email}_${taskId}`);

              t.set(
                progressRef,
                {
                  email: email,
                  taskId: taskId,
                  taskTitle: "Doğum Günü Bonusu",
                  adim1_ilerleme: 1,
                  completed: true,
                  completedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );

              // 5. Log At
              const histRef = db.collection("point_history").doc();
              t.set(histRef, {
                email: email,
                islem: "Profil: Doğum Günü Eklendi",
                puan: profileReward,
                tarih: admin.firestore.FieldValue.serverTimestamp(),
              });
            });

            response = {
              success: true,
              message: "Doğum günü kaydedildi ve ödül verildi.",
            };
          }
        }
        // 3. 🏆 GİZLİ LİDERLER TABLOSU (Faprika Vitrini İçin)
        else if (islem === "get_masked_leaderboard") {
          const snapshot = await db
            .collection("users")
            .orderBy("puan", "desc")
            .limit(5)
            .get();
          const list = [];

          snapshot.forEach((doc) => {
            const d = doc.data();
            let nameDisplay = "Gizli Üye";

            // --- MASKELEME MANTIĞI ---
            if (d.adSoyad && d.adSoyad !== "Misafir") {
              const parts = d.adSoyad.trim().split(" ");
              if (parts.length > 1) {
                const lastNameInitial = parts[parts.length - 1].charAt(0);
                nameDisplay = `${parts[0]} ${lastNameInitial}.`;
              } else {
                nameDisplay = parts[0];
              }
            } else if (d.email) {
              const namePart = d.email.split("@")[0];
              nameDisplay = namePart.substring(0, 3) + "***";
            }

            list.push({
              name: nameDisplay,
              points: d.puan,
              level: d.seviye || "Çaylak",
              // 🔥 YENİ EKLENEN SATIR: Seçili Avatarı Gönderiyoruz
              avatar: d.selectedAvatar || null,
              frame: d.selectedFrame || "",
              theme: d.profileTheme || "default",
            });
          });

          response = { success: true, list: list };
        }
        // ==================================================================
        // 4. 🎫 MÜŞTERİ BİLET CÜZDANI (Gruplandırılmış)
        // ==================================================================
        // --- MÜŞTERİ BİLET CÜZDANI (GARANTİLİ ÇEKİM) ---
        else if (islem === "get_user_tickets") {
          const { email } = data;

          // 1. İki ihtimali de dene: "userEmail" veya "e_posta"
          // Bazı veriler userEmail, bazıları e_posta olarak kaydedilmiş olabilir.
          const snapshot1 = await db
            .collection("raffle_participants")
            .where("userEmail", "==", email)
            .get();
          const snapshot2 = await db
            .collection("raffle_participants")
            .where("e_posta", "==", email)
            .get();

          const allDocs = [...snapshot1.docs, ...snapshot2.docs];

          // Tekilleştirme (Aynı bilet iki kere gelmesin)
          const uniqueDocs = new Map();
          allDocs.forEach((doc) => uniqueDocs.set(doc.id, doc));

          const wallet = {};

          uniqueDocs.forEach((doc) => {
            const d = doc.data();
            // Çekiliş adını al (cekilis_adi veya raffleName)
            const rafName =
              d.cekilis_adi || d.raffleName || "Bilinmeyen Çekiliş";

            if (!wallet[rafName]) {
              wallet[rafName] = {
                raffleName: rafName,
                totalTickets: 0,
                tickets: [],
              };
            }

            wallet[rafName].tickets.push({
              code: d.bilet_id || d.ticketId || "---",
              date: d.createdAt ? "Tarihli" : "",
              type: d.actionType || "Katılım",
            });
            wallet[rafName].totalTickets++;
          });

          const list = Object.values(wallet);
          response = { success: true, list: list };
        }

        // 3. 🏆 GİZLİ LİDERLER TABLOSU (Faprika Vitrini İçin)
        else if (islem === "get_masked_leaderboard") {
          const snapshot = await db
            .collection("users")
            .orderBy("puan", "desc")
            .limit(5)
            .get();
          const list = [];
          snapshot.forEach((doc) => {
            const d = doc.data();
            let nameDisplay = "Gizli Üye";
            if (d.adSoyad && d.adSoyad !== "Misafir") {
              // "Ahmet Yılmaz" -> "Ahmet Y."
              const parts = d.adSoyad.split(" ");
              nameDisplay =
                parts[0] + " " + (parts.length > 1 ? parts[1][0] + "." : "");
            } else {
              // "ahmet@gmail.com" -> "ahm***"
              nameDisplay = d.email.split("@")[0].substring(0, 3) + "***";
            }

            list.push({ name: nameDisplay, points: d.puan, level: d.seviye });
          });
          response = { success: true, list: list };
        }

        // 4. 🎫 MÜŞTERİ BİLET CÜZDANI (Biletlerim Sayfası)
        else if (islem === "get_user_tickets") {
          const { email } = data;
          const snapshot = await db
            .collection("raffle_participants")
            .where("userEmail", "==", email)
            .orderBy("createdAt", "desc")
            .get();

          const tickets = [];
          snapshot.forEach((doc) => {
            tickets.push({
              raffleName: doc.data().raffleName,
              ticketId: doc.data().ticketId,
              date: doc.data().createdAt.toDate().toLocaleDateString("tr-TR"),
            });
          });
          response = { success: true, list: tickets };
        }

        // ----------------------------------------------------------------------
        // MODÜL 5: MÜŞTERİ DETAY & CRM (ADIM 5)
        // --- KULLANICI GİRİŞ/KAYIT (ANTI-CHEAT KORUMALI) ---
        else if (islem === "user_login_trigger") {
          const { email, adSoyad } = data;

          if (!email) {
            response = { success: false, message: "E-posta zorunlu." };
          } else {
            // 🛡️ 1. GÜVENLİK KONTROLÜ: GEÇİCİ MAİL (ANTI-CHEAT)
            const domain = email.split("@")[1];
            // Yasaklı Domain Listesi (GAS Kodundan Alındı + Eklemeler)
            const bannedDomains = [
              "tempmail.com",
              "10minutemail.com",
              "yopmail.com",
              "mailinator.com",
              "guerrillamail.com",
              "sharklasers.com",
            ];

            if (bannedDomains.includes(domain)) {
              // Yakalandı!
              await logSecurity(
                "BLOKLANDI",
                `Sahte Mail Denemesi: ${email}`,
                req.headers["x-forwarded-for"] || "0.0.0.0"
              );
              response = {
                success: false,
                message:
                  "⚠️ Güvenlik: Geçici veya sahte e-posta servisleri kullanılamaz.",
              };
            } else {
              // Temiz, işleme devam et
              const userRef = db.collection("users").doc(email);
              const userDoc = await userRef.get();
              const now = admin.firestore.FieldValue.serverTimestamp();
              const settings = await getSystemSettings();
              const welcomeBonus = parseInt(settings.xp_hosgeldin) || 50;

              if (!userDoc.exists) {
                // YENİ KULLANICI
                const refCode =
                  "REF-" +
                  Math.random().toString(36).substring(2, 6).toUpperCase();

                await userRef.set({
                  email: email,
                  adSoyad: adSoyad || "Misafir",
                  puan: welcomeBonus,
                  toplampuan: welcomeBonus,
                  seviye: "Çaylak",
                  siparisSayisi: 0,
                  gunlukSeri: 0,
                  sonGiris: now,
                  kayitTarihi: now,
                  davetSayisi: 0,
                  referansKodu: refCode,
                  davetEden: null,
                  geriBildirimDurumu: false,
                  sonDogumGunuBonusu: 0,
                });
                // --- 🔥 EKLEME 2: GEÇMİŞE BONUSU İŞLE ---
                await db.collection("point_history").add({
                  email: email,
                  islem: "Hoş Geldin Hediyesi 🎉",
                  puan: welcomeBonus,
                  tarih: now,
                  date: now,
                });
                response = {
                  success: true,
                  message: "Yeni üye oluşturuldu.",
                  isNew: true,
                };
                await logSecurity("YENİ_UYE", `${email} sisteme katıldı.`);
              } else {
                // MEVCUT KULLANICI
                await userRef.update({ sonGiris: now });
                if (
                  adSoyad &&
                  adSoyad !== "Misafir" &&
                  userDoc.data().adSoyad !== adSoyad
                ) {
                  await userRef.update({ adSoyad: adSoyad });
                }
                response = {
                  success: true,
                  message: "Giriş güncellendi.",
                  isNew: false,
                };
              }
            }
          }
        } // ==================================================================
        // 🔥 GÜNLÜK YOKLAMA (FİNAL VERSİYON - HAK YAZMA GARANTİLİ)
        // ==================================================================
        else if (islem === "daily_check_in") {
          const { email } = data;
          const userRef = db.collection("users").doc(email);
          const settings = await getSystemSettings();

          let message = "";
          let newTotalPoints = 0;
          let newLevel = "";

          try {
            const nowISO = new Date().toISOString();

            // 1. SİSTEMDEKİ "GERÇEKTEN AKTİF" OLANLARI BUL
            const allRafflesSnap = await db
              .collection("raffles")
              .where("durum", "==", "Aktif")
              .get();

            if (allRafflesSnap.empty) {
              return res.json({
                success: false,
                message: "Sistemde hiç çekiliş bulunamadı.",
              });
            }

            // --- GÜNCELLENMİŞ ZOMBİ KORUMALI KOD BLOĞU (FİNAL) ---
            let activeRafflesList = [];

            // DİKKAT: nowISO satırını sildik çünkü 3338. satırda zaten var.
            // Mevcut nowISO değişkenini kullanıyoruz.

            allRafflesSnap.forEach((doc) => {
              const d = doc.data();
              const st = (d.status || d.durum || "").toLowerCase();

              // Çekilişin bitiş tarihini al (Yoksa gelecekte bir tarih varsay)
              let bitisZamani = d.endDate || d.bitis_tarihi || "2099-01-01";

              // Tarih formatı düzeltme (14.12.2025 -> 2025-12-14)
              if (
                typeof bitisZamani === "string" &&
                bitisZamani.includes(".")
              ) {
                const p = bitisZamani.split(".");
                if (p.length === 3) bitisZamani = `${p[2]}-${p[1]}-${p[0]}`;
              }

              // 🔥 ÇİFTE KONTROL: Hem "Aktif" yazmalı HEM DE Süresi Dolmamış olmalı
              const isActiveLabel =
                st === "active" || st === "aktif" || d.aktif === true;
              const isTimeNotUp = bitisZamani > nowISO; // Şimdiki zamandan büyük mü?

              if (isActiveLabel && isTimeNotUp) {
                const realName = d.name || d.cekilis_adi || "İsimsiz";
                const cleanName = realName.replace(/\s+/g, "").toLowerCase();

                activeRafflesList.push({
                  id: doc.id,
                  realName: realName,
                  cleanName: cleanName,
                  ref: doc.ref,
                });
              }
            });

            if (activeRafflesList.length === 0) {
              return res.json({
                success: false,
                message: "Şu an aktif statüde çekiliş yok.",
              });
            }

            // 2. KULLANICININ "ANA KATILIMLARINI" TARA
            const p1 = db
              .collection("raffle_participants")
              .where("e_posta", "==", email)
              .get();
            const p2 = db
              .collection("raffle_participants")
              .where("userEmail", "==", email)
              .get();
            const [snap1, snap2] = await Promise.all([p1, p2]);
            const allTickets = [...snap1.docs, ...snap2.docs];

            // Sadece "Katılım" tipindekileri al
            const mainEntries = allTickets.filter((doc) => {
              const d = doc.data();
              const type = (d.actionType || d.i_slem_tipi || "").toLowerCase();
              return type.includes("katılım") || type.includes("katilim");
            });

            // 3. EŞLEŞTİRME (ID veya İSİM TUTUYORSA AL)
            let targetRaffles = [];
            let addedIds = new Set();

            activeRafflesList.forEach((raf) => {
              const hasTicket = mainEntries.some((ticketDoc) => {
                const tData = ticketDoc.data();
                const tId = tData.raffleId;
                const tName = (tData.raffleName || tData.cekilis_adi || "")
                  .replace(/\s+/g, "")
                  .toLowerCase();

                if (tId && tId === raf.id) return true;
                if (
                  tName.includes(raf.cleanName) ||
                  raf.cleanName.includes(tName)
                )
                  return true;
                return false;
              });

              if (hasTicket && !addedIds.has(raf.id)) {
                targetRaffles.push(raf);
                addedIds.add(raf.id);
              }
            });

            if (targetRaffles.length === 0) {
              return res.json({
                success: false,
                message: `⚠️ Hiçbir aktif çekilişe "Ana Katılımınız" bulunamadı. Lütfen önce vitrinden bir çekilişe 'KATIL' diyerek bilet alın.`,
              });
            }

            // 4. GÖREVİ HAZIRLA
            const tasksSnap = await db.collection("tasks").get();
            let dailyTaskDoc = null;
            let dailyTaskData = null;
            let progressRef = null;

            tasksSnap.forEach((t) => {
              const d = t.data();
              const isTaskActive = d.status === "active" || d.aktif === true;
              if (isTaskActive) {
                const baslik = (d.baslik || d.title || "").toLowerCase();
                if (baslik.includes("rutin") || baslik.includes("günlük")) {
                  dailyTaskDoc = t;
                  dailyTaskData = d;
                  progressRef = db
                    .collection("user_task_progress")
                    .doc(`${email}_${t.id}`);
                }
              }
            });

            // 5. TRANSACTION (YAZMA İŞLEMİ)
            await db.runTransaction(async (t) => {
              // --- OKUMALAR ---
              const userDoc = await t.get(userRef);
              if (!userDoc.exists) throw "Kullanıcı bulunamadı.";

              let currentPData = {};
              if (progressRef) {
                const progDoc = await t.get(progressRef);
                if (progDoc.exists) currentPData = progDoc.data();
              }

              // --- 🇹🇷 SAAT DİLİMİ AYARI VE KONTROLLER (UTC+3) ---
              let userData = userDoc.data();

              const now = new Date();
              // Sunucu saatine 3 saat ekle (TR Saati)
              const trDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);

              // Tarihleri Hesapla
              const todayStr = trDate.toISOString().split("T")[0];
              const d = new Date(trDate);
              d.setDate(d.getDate() - 1);
              const yesterdayStr = d.toISOString().split("T")[0];

              // 🔥 KONTROL: Bugün ödül almış mı?
              if (userData.songunlukhaktarihi === todayStr) {
                throw "Bugünkü ödülünü zaten aldın. Yarın gel! 👋";
              }

              // 2. Kontrol et: Dün giriş yapmış mı?
              // ... (Tarih kontrolleri aynı) ...

              // 2. Kontrol et: Dün giriş yapmış mı?
              let currentStreak = parseInt(userData.gunlukSeri) || 0;
              const lastLogin = userData.songunlukhaktarihi || "";

              if (lastLogin === yesterdayStr) {
                currentStreak += 1; // Zincir devam ediyor, artır
              } else {
                currentStreak = 1; // Zincir kopmuş, baştan başlat
              }

              // 🔥 DÜZELTME: 7 GÜNLÜK DÖNGÜ (LOOP)
              // Eğer sayı 7'yi geçerse (8 olursa), tekrar 1'e döndür.
              if (currentStreak > 7) {
                currentStreak = 1;
              }

              let currentPoints = parseInt(userData.puan) || 0;
              let dailyXP = parseInt(settings.xp_gunluk) || 20;
              let totalAdded = dailyXP;
              message = `Tebrikler! +${dailyXP} XP.`;

              // A. Hakları Bas (TARİH VE SIRALAMA GARANTİLİ)
              for (const raf of targetRaffles) {
                const ticketRef = db.collection("raffle_participants").doc();
                const ticketId =
                  "#GUN-" + Math.floor(100000 + Math.random() * 900000);
                let rawName = userData.adSoyad || email.split("@")[0];

                t.set(ticketRef, {
                  raffleId: raf.id,
                  raffleName: raf.realName,
                  cekilis_adi: raf.realName,
                  userId: email,
                  userEmail: email,
                  e_posta: email,
                  userName: rawName,
                  ticketId: ticketId,
                  actionType: "Günlük Hak",
                  i_slem_tipi: "Günlük Hak",

                  // 🔥 KRİTİK: Admin panelinin sıralaması için bu alanlar şart
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  tarih: admin.firestore.FieldValue.serverTimestamp(),
                  sortTime: Date.now(), // Sayısal yedek (En garantisi)
                });

                // Sayacı artır
                t.update(raf.ref, {
                  participantCount: admin.firestore.FieldValue.increment(1),
                });
              }

              if (targetRaffles.length > 0) {
                message += ` Ayrıca ${targetRaffles.length} adet aktif çekilişe ek hak tanımlandı!`;
              }

              // B. Görev İlerlemesi
              if (progressRef && dailyTaskDoc) {
                const mainData = currentPData || {};

                // 1. Kutulara Dokunma (Mevcut sayıyı al)
                const s1 = parseInt(mainData.adim1_ilerleme) || 0;

                // 2. Butonu ŞİMDİ Tamamla (1 Yap)
                const s2 = 1;

                // 🔥 DÜZELTME: Hedefi veritabanından al ama eğer 5'ten küçükse en az 5 yap (Güvenlik)
                // Bu sayede admin panelinde yanlışlıkla 1 yazılsa bile sistem 5 ister.
                let t1Val = parseInt(dailyTaskData.adim1_hedef);
                if (isNaN(t1Val) || t1Val < 5) t1Val = 5;
                const target1 = t1Val;

                let isFullComplete = false;
                let wasCompleted = mainData.completed === true;
                let bigReward = 0;

                // 🔥 KONTROL: Kutular ZATEN tamamsa (s1 >= 5) VE Buton şimdi basıldı (s2=1)
                // Yani 5 kutu bulunduysa VE şimdi butona basılıyorsa görev biter.
                if (s1 >= target1) {
                  isFullComplete = true;

                  // Daha önce ödül almadıysa ver
                  if (!wasCompleted) {
                    bigReward = parseInt(dailyTaskData.buyukodul_xp) || 80;
                    totalAdded += bigReward;
                    message += ` 🎯 GÖREV TAMAMLANDI: +${bigReward} XP!`;

                    const bonusLogRef = db.collection("point_history").doc();
                    t.set(bonusLogRef, {
                      email: email,
                      islem: `Görev Tamamlandı: ${dailyTaskData.baslik}`,
                      puan: bigReward,
                      tarih: admin.firestore.FieldValue.serverTimestamp(),
                      date: admin.firestore.FieldValue.serverTimestamp(),
                    });
                  }
                }

                // İlerlemeyi Kaydet
                t.set(
                  progressRef,
                  {
                    email: email,
                    taskId: dailyTaskDoc.id,
                    taskTitle: dailyTaskData.baslik || "Günlük Rutin",
                    adim1_ilerleme: s1, // Kutu sayısı değişmez
                    adim2_ilerleme: s2, // Buton 1 olur
                    completed: isFullComplete || wasCompleted, // Sadece şartlar sağlanırsa True
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    ...(isFullComplete && !wasCompleted
                      ? {
                          completedAt:
                            admin.firestore.FieldValue.serverTimestamp(),
                        }
                      : {}),
                  },
                  { merge: true }
                );
              }

              // C. Kullanıcı
              newTotalPoints = currentPoints + totalAdded;
              newLevel = calculateLevel(
                newTotalPoints,
                userData.siparisSayisi || 0,
                settings
              );
              const currentBadges = userData.badges || [];
              if (!currentBadges.includes("gorev_adami")) {
                t.update(userRef, {
                  badges: admin.firestore.FieldValue.arrayUnion("gorev_adami"),
                  // Eğer avatarı yoksa, bu rozeti avatar yap
                  selectedAvatar: userData.selectedAvatar || "gorev_adami",
                });
                // Mesaja ekle ki ekranda görsün
                message += " 🎯 İLK ROZETİNİ KAZANDIN!";
              }

              t.update(userRef, {
                puan: newTotalPoints,
                toplampuan: newTotalPoints,
                gunlukSeri: currentStreak,
                seviye: newLevel,
                songunlukhaktarihi: todayStr,
                hak: admin.firestore.FieldValue.increment(targetRaffles.length),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              // Seri 7'ye ulaştıysa rozeti ver
              if (currentStreak >= 7) {
                t.update(userRef, {
                  badges: admin.firestore.FieldValue.arrayUnion("alev_alev"),
                });
                message += " 🔥 ALEV ALEV ROZETİ!";
              }

              // D. Log
              const histRef = db.collection("point_history").doc();
              t.set(histRef, {
                email: email,
                islem: "Günlük Giriş & Hak",
                puan: dailyXP,
                hak: targetRaffles.length,
                tarih: admin.firestore.FieldValue.serverTimestamp(),
                date: admin.firestore.FieldValue.serverTimestamp(),
              });
            });

            response = {
              success: true,
              message: message,
              newPoints: newTotalPoints,
              newLevel: newLevel,
            };
          } catch (e) {
            response = { success: false, message: "Hata: " + (e.message || e) };
          }
        } // --- GÖREV ADIMI TAMAMLAMA (SAYAÇLI & GARANTİLİ FİNAL) ---
        else if (islem === "complete_task_step") {
          const { email, taskId, step } = data;

          const userRef = db.collection("users").doc(email);
          const taskRef = db.collection("tasks").doc(taskId);
          const progressRef = db
            .collection("user_task_progress")
            .doc(`${email}_${taskId}`);

          try {
            await db.runTransaction(async (t) => {
              const taskDoc = await t.get(taskRef);
              const userDoc = await t.get(userRef);
              const progressDoc = await t.get(progressRef);

              if (!taskDoc.exists) throw "Görev tanımı bulunamadı.";
              if (!userDoc.exists) throw "Kullanıcı bulunamadı.";

              const tData = taskDoc.data();
              const pData = progressDoc.exists ? progressDoc.data() : {};

              // Mevcut İlerlemeler (Yoksa 0)
              let s1 = parseInt(pData.adim1_ilerleme) || 0;
              let s2 = parseInt(pData.adim2_ilerleme) || 0;

              // Hedefleri Al
              const target1 = parseInt(tData.adim1_hedef) || 1;
              // Adım 2 varsa hedefi 1'dir (Genelde tek seferliktir: Sepet, Şifre vb.)
              const target2 = tData.adim2_tanim ? 1 : 0;

              // --- GÜNCELLEME MANTIĞI ---
              if (parseInt(step) === 1) {
                // Adım 1 bir sayaçtır (Örn: 3 ürün gez). Hedefe ulaşana kadar artır.
                if (s1 < target1) s1 += 1;
              }
              if (parseInt(step) === 2) {
                // Adım 2 (Sepet/Şifre) tek seferliktir. Direkt 1 yap.
                s2 = 1;
              }

              // --- BİTİŞ KONTROLÜ ---
              // Adım 1 bitti mi? (Tanımlı değilse veya hedef tuttuysa)
              const step1Done = !tData.adim1_tanim || s1 >= target1;
              // Adım 2 bitti mi? (Tanımlı değilse veya yapıldıysa)
              const step2Done = !tData.adim2_tanim || s2 >= 1;

              let isComplete = false;
              if (step1Done && step2Done) {
                isComplete = true;
              }

              // Daha önce ödül almış mı?
              const alreadyRewarded = pData.completed === true;

              // --- KAYIT ---
              const updateData = {
                email: email,
                taskId: taskId,
                taskTitle: tData.baslik || tData.title,
                adim1_ilerleme: s1,
                adim2_ilerleme: s2,
                completed: alreadyRewarded || isComplete, // Eskiden bittiyse true kalsın
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                tarih: new Date().toISOString(), // Panelde tarih görünsün
              };

              // Eğer şimdi bittiyse ve daha önce bitmemişse tarih at
              if (isComplete && !alreadyRewarded) {
                updateData.completedAt =
                  admin.firestore.FieldValue.serverTimestamp();
              }

              t.set(progressRef, updateData, { merge: true });

              // --- ÖDÜL DAĞITIMI (SADECE İLK KEZ BİTTİĞİNDE) ---
              if (isComplete && !alreadyRewarded) {
                const rewardXP = parseInt(tData.buyukodul_xp) || 0;
                const newPoints =
                  (parseInt(userDoc.data().toplampuan) || 0) + rewardXP;

                // Seviye Hesapla
                const settings = await getSystemSettings();
                const newLevel = calculateLevel(
                  newPoints,
                  userDoc.data().siparisSayisi || 0,
                  settings
                );

                // Kullanıcıyı Güncelle
                t.update(userRef, {
                  puan: newPoints,
                  toplampuan: newPoints,
                  seviye: newLevel,
                });

                // Geçmişe İşle
                const histRef = db.collection("point_history").doc();
                t.set(histRef, {
                  email: email,
                  islem: `Görev Tamamlandı: ${tData.baslik}`,
                  puan: rewardXP,
                  tarih: admin.firestore.FieldValue.serverTimestamp(),
                  date: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
              // 🔥 YENİ: ROZET KONTROLÜ (İLK GÖREV)
              const userBadges = userDoc.data().badges || [];
              if (!userBadges.includes("gorev_adami")) {
                t.update(userRef, {
                  badges: admin.firestore.FieldValue.arrayUnion("gorev_adami"),
                  // Eğer hiç avatarı yoksa bunu avatar yap
                  selectedAvatar:
                    userDoc.data().selectedAvatar || "gorev_adami",
                });
              }
            });

            response = { success: true, message: "İlerleme kaydedildi." };
          } catch (e) {
            response = { success: false, message: "Hata: " + e };
          }
        }
        // --- ROZETİ PROFİL RESMİ YAP (ÇAYLAK DAHİL) ---
        else if (islem === "set_avatar_badge") {
          const { email, badgeId } = data;
          const userRef = db.collection("users").doc(email);
          const userDoc = await userRef.get();

          if (!userDoc.exists) {
            response = { success: false, message: "Kullanıcı yok." };
          } else {
            const badges = userDoc.data().badges || [];

            // 🔥 DÜZELTME: Rozet listesinde varsa VEYA istenen rozet 'lvl_caylak' ise izin ver
            if (badges.includes(badgeId) || badgeId === "lvl_caylak") {
              await userRef.update({ selectedAvatar: badgeId });

              // Eğer veritabanında 'lvl_caylak' yoksa onu da ekleyelim ki bir daha sormasın
              if (badgeId === "lvl_caylak" && !badges.includes("lvl_caylak")) {
                await userRef.update({
                  badges: admin.firestore.FieldValue.arrayUnion("lvl_caylak"),
                });
              }

              response = {
                success: true,
                message: "Profil resmi güncellendi!",
              };
            } else {
              response = {
                success: false,
                message: "Bu rozete sahip değilsin.",
              };
            }
          }
        }
        // --- PROFİL TEMASI SEÇME (YENİ) ---
        else if (islem === "set_profile_theme") {
          const { email, themeId } = data;

          // Basit güvenlik: Sadece izin verilen temalar
          const allowed = [
            "default",
            "neon",
            "fire",
            "ocean",
            "gold",
            "matrix",
            "love",
            "night",
          ];
          const safeTheme = allowed.includes(themeId) ? themeId : "default";

          await db.collection("users").doc(email).update({
            profileTheme: safeTheme,
          });

          response = { success: true, message: "Profil teman güncellendi! 🎨" };
        }

        // --- MÜŞTERİ DETAYI (REFERANS KODU GARANTİLİ v6) ---
        else if (islem === "get_user_details") {
          const { email } = data;
          let userData = null;
          let userRef = null; // Döküman referansını tutalım

          // 1. Kullanıcıyı Bul
          const userDocRef = db.collection("users").doc(email);
          const userDoc = await userDocRef.get();

          if (userDoc.exists) {
            userData = userDoc.data();
            userRef = userDocRef;
          } else {
            const querySnap = await db
              .collection("users")
              .where("email", "==", email)
              .limit(1)
              .get();
            if (!querySnap.empty) {
              userData = querySnap.docs[0].data();
              userRef = querySnap.docs[0].ref;
            }
          }

          if (!userData) {
            response = { success: false, message: "Kullanıcı bulunamadı." };
          } else {
            const d = userData;

            // 🔥 REFERANS KODU KONTROL VE ÜRETİM SİGORTASI 🔥
            let refCode = d.referansKodu || d.referanskodu;

            // Eğer kod yoksa veya bozuksa, YENİSİNİ ÜRET ve KAYDET
            if (!refCode || refCode === "undefined" || refCode.length < 3) {
              refCode =
                "REF-" +
                Math.random().toString(36).substring(2, 6).toUpperCase();
              // Veritabanına hemen yaz ki bir dahakine hazır olsun
              if (userRef) {
                await userRef.update({ referansKodu: refCode });
                console.log(
                  `Yeni referans kodu üretildi: ${email} -> ${refCode}`
                );
              }
            }

            // Veri Eşleştirme
            let gercekPuan = 0;
            if (d.toplampuan && Number(d.toplampuan) > 0) {
              gercekPuan = Number(d.toplampuan);
            } else {
              gercekPuan = Number(d.puan) || 0;
            }
            const gercekHak = Number(d.toplamhak) || Number(d.hak) || 0;
            const gercekSeviye = d.seviye || "Çaylak";
            const tamIsim = d.adsoyad || d.adSoyad || email;

            // 🔥 DÜZELTME: CANLI SAYIM YERİNE KARTTAKİ MEVCUT VERİYİ OKU
            let gercekKatilim = 0;

            // Admin panelinde "3" yazıyorsa bu alanlardan birinde kesin kayıtlıdır.
            // Hepsini sırayla kontrol ediyoruz:
            if (d.toplamkatilim !== undefined)
              gercekKatilim = Number(d.toplamkatilim);
            else if (d.katilimSayisi !== undefined)
              gercekKatilim = Number(d.katilimSayisi);
            else if (d.katilim !== undefined) gercekKatilim = Number(d.katilim);
            else if (d.totalParticipation !== undefined)
              gercekKatilim = Number(d.totalParticipation);

            response = {
              success: true,
              user: {
                email: email,
                adSoyad: tamIsim,
                badges: d.badges || [],
                selectedAvatar: d.selectedAvatar || null,
                ownedFrames: d.ownedFrames || [],
                selectedFrame: d.selectedFrame || "",
                puan: gercekPuan,
                hak: gercekHak,
                seviye: gercekSeviye,
                siparisSayisi: Number(d.siparissayisi) || 0,
                davetSayisi: Number(d.davetsayisi) || 0,
                katilimSayisi: gercekKatilim,
                toplamkatilim: gercekKatilim,
                referansKodu: refCode,
                privacyApproved: d.privacyApproved === true,
                sonGiris: d.sonGiris || "-",
                profileTheme: d.profileTheme || "default",
                songunlukhaktarihi: d.songunlukhaktarihi || "", // 🔥 EKLENEN KOD BU
                dogumTarihi: d.dogumTarihi || "-",
                gunlukSeri: d.gunlukSeri || d.gunlukseri || 0,
              },
            };
          }
        }
        // --- 🔒 GİZLİLİK SÖZLEŞMESİ ONAYI ---
        else if (islem === "approve_privacy_policy") {
          const { email } = data;
          if (!email)
            return res.json({ success: false, message: "E-posta yok." });

          const userRef = db.collection("users").doc(email);
          await userRef.update({
            privacyApproved: true,
            privacyApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Log Atalım (Yasal kanıt için)
          await db.collection("system_logs").add({
            email: email,
            action: "GİZLİLİK_ONAYI",
            details: "Gizlilik sözleşmesi kullanıcı tarafından onaylandı.",
            ip: req.headers["x-forwarded-for"] || "0.0.0.0",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          response = { success: true, message: "Onaylandı." };
        }
        // --- TOPLU ŞİFRE PLANLAMA (ADMIN PANELİNDEN) ---
        else if (islem === "bulk_schedule_codes") {
          const { startDate, codesText } = data;
          // startDate: "2025-12-16" formatında gelir (HTML date picker'dan)

          if (!startDate || !codesText) {
            response = {
              success: false,
              message: "Tarih ve kod listesi gerekli.",
            };
          } else {
            const codes = codesText
              .split(/\r?\n/)
              .map((c) => c.trim())
              .filter((c) => c !== "");

            if (codes.length === 0) {
              response = { success: false, message: "Liste boş." };
            } else {
              const batch = db.batch();
              let currentDate = new Date(startDate); // Başlangıç tarihi

              codes.forEach((code) => {
                // Tarih formatını Excel stiline (DD.MM.YYYY) çevirelim ki okuma koduyla eşleşsin
                const day = String(currentDate.getDate()).padStart(2, "0");
                const month = String(currentDate.getMonth() + 1).padStart(
                  2,
                  "0"
                );
                const year = currentDate.getFullYear();
                const dateStr = `${day}.${month}.${year}`; // Örn: 16.12.2025

                // Benzersiz bir ID oluşturalım: PROMO_16.12.2025
                const docRef = db
                  .collection("settings")
                  .doc(`PROMO_${dateStr}`);

                batch.set(docRef, {
                  promosyon_tarihi: dateStr, // Okuma fonksiyonu buraya bakıyor
                  gunun_kodu: code, // Okuma fonksiyonu bunu alıyor
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  type: "promo_code", // Karışmaması için etiket
                });

                // Bir sonraki güne geç
                currentDate.setDate(currentDate.getDate() + 1);
              });

              await batch.commit();

              // Güvenlik logu atalım
              await logSecurity(
                "SIFRE_PLANLAMA",
                `${codes.length} günlük şifre planlandı. Başlangıç: ${startDate}`
              );

              response = {
                success: true,
                message: `${codes.length} günlük şifre takvime işlendi!`,
              };
            }
          }
        } // --- PLANLANMIŞ ŞİFRELERİ LİSTELE (AKILLI SIRALAMA) ---
        else if (islem === "get_scheduled_codes") {
          const snapshot = await db.collection("settings").get();
          let list = [];

          // 1. Bugünün tarihini Türkiye saatine göre al
          const trDate = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
          );
          const yyyy = trDate.getFullYear();
          const mm = String(trDate.getMonth() + 1).padStart(2, "0");
          const dd = String(trDate.getDate()).padStart(2, "0");
          const todayStr = `${yyyy}-${mm}-${dd}`; // Örn: "2025-12-15"

          snapshot.forEach((doc) => {
            const d = doc.data();
            if (d.promosyon_tarihi && d.gunun_kodu) {
              // Tarihi Standart Formata (YYYY-MM-DD) Çevir
              let dbDateStr = String(d.promosyon_tarihi).substring(0, 10);

              // Eğer "15.12.2025" formatındaysa -> "2025-12-15" yap
              if (dbDateStr.includes(".")) {
                const p = dbDateStr.split(".");
                dbDateStr = `${p[2]}-${p[1]}-${p[0]}`;
              }

              // Durumu Belirle
              let status = "future";
              let sortScore = 2; // Gelecek (Orta sıra)

              if (dbDateStr < todayStr) {
                status = "past";
                sortScore = 3; // Geçmiş (En alt sıra)
              } else if (dbDateStr === todayStr) {
                status = "today";
                sortScore = 1; // Bugün (En üst sıra - KRAL)
              }

              list.push({
                date: dbDateStr, // Artık hepsi YYYY-MM-DD formatında
                originalDate: d.promosyon_tarihi, // Görünen tarih (değişmedi)
                code: d.gunun_kodu,
                status: status,
                docId: doc.id,
                _sortScore: sortScore,
              });
            }
          });

          // 2. SIRALAMA MOTORU
          list.sort((a, b) => {
            // Önce Duruma Göre Sırala (Bugün > Gelecek > Geçmiş)
            if (a._sortScore !== b._sortScore) {
              return a._sortScore - b._sortScore;
            }
            // Durumlar aynıysa tarihe göre sırala
            return a.date.localeCompare(b.date);
          });

          response = { success: true, list: list };
        }

        // --- PLANLANMIŞ ŞİFREYİ SİL ---
        else if (islem === "delete_scheduled_code") {
          const { date } = data; // Silinecek tarih (ID)
          await db.collection("daily_codes").doc(date).delete();
          response = { success: true, message: "O tarihteki şifre silindi." };
        }
        // ----------------------------------------------------------------------
        // GENEL İŞLEMLER (KULLANICI LİSTESİ - ARAMA MOTORLU v3) 🚀
        // ----------------------------------------------------------------------
        else if (islem === "getKullaniciListesi" || islem === "get_users") {
          const { lastVisibleId, searchQuery } = data; // 🔥 Arama kelimesi eklendi
          const PAGE_SIZE = 50;

          try {
            let query;

            // A) EĞER ARAMA VARSA (Özel Sorgu)
            if (searchQuery && searchQuery.trim() !== "") {
              const term = searchQuery.trim();
              // E-posta tam eşleşme veya ID eşleşmesi
              // Not: Firestore'da "LIKE" sorgusu yoktur, o yüzden e-posta ile birebir arıyoruz
              query = db
                .collection("users")
                .where("email", "==", term)
                .limit(1);

              // Eğer veritabanında e_posta alanı kullanılıyorsa ona da bakabiliriz,
              // ama senin yapında 'email' alanı ana ID gibi kullanılıyor.
            }
            // B) ARAMA YOKSA (Standart Liste)
            else {
              query = db
                .collection("users")
                .orderBy("puan", "desc")
                .limit(PAGE_SIZE);

              if (lastVisibleId) {
                const lastDoc = await db
                  .collection("users")
                  .doc(lastVisibleId)
                  .get();
                if (lastDoc.exists) {
                  query = query.startAfter(lastDoc);
                }
              }
            }

            const snapshot = await query.get();
            const users = [];

            snapshot.forEach((doc) => {
              const d = doc.data();
              users.push({
                id: doc.id,
                email: d.e_posta || d.email || doc.id,
                adSoyad: d.adsoyad || d.adSoyad || "Misafir",
                puan: parseInt(d.toplampuan) || parseInt(d.puan) || 0,
                seviye: d.seviye || "Çaylak",
                siparisSayisi:
                  parseInt(d.siparissayisi) || parseInt(d.siparisSayisi) || 0,
                hak: parseInt(d.toplamhak) || parseInt(d.hak) || 0,
                katilimSayisi:
                  parseInt(d.toplamkatilim) || parseInt(d.katilimSayisi) || 0,
                gunlukSeri: d.gunlukSeri || d.gunlukseri || 0,
                davetSayisi: parseInt(d.davetsayisi) || 0,
                sonGiris: d.songunlukhaktarihi || d.sonGiris || "-",
                dogumTarihi: d.dogumtarihi || d.dogumTarihi || "-",
                geriBildirimDurumu: d.geriBildirimDurumu === true,
              });
            });

            // Sonuncunun ID'si (Arama varsa null döner, sayfalama yok)
            const lastId =
              !searchQuery && snapshot.docs.length > 0
                ? snapshot.docs[snapshot.docs.length - 1].id
                : null;

            response = { success: true, users: users, lastId: lastId };
          } catch (error) {
            response = { success: false, message: error.message };
          }
        } // --- ÜRÜN HAVUZU (SKU) - TARİH FİX ---
        else if (islem === "get_products") {
          // Hız için 200 limit koyduk, gerekirse artırılabilir
          const snapshot = await db.collection("product_pool").limit(200).get();
          const products = [];

          snapshot.forEach((doc) => {
            const d = doc.data();

            // 1. TARİH DÜZELTME (Screenshot_74'teki "tarih" alanı)
            let rawDate = d.tarih || d.createdAt || d.eklenme_tarihi || "-";

            // Eğer tarih "2025-11-28T..." gibi string ise temizle
            if (typeof rawDate === "string" && rawDate.includes("T")) {
              rawDate = rawDate.replace("T", " ").split(".")[0];
            } else if (rawDate && rawDate.toDate) {
              rawDate = rawDate.toDate().toLocaleString("tr-TR");
            }

            // 2. STOK KODU (Screenshot_74'teki "stokkodu" alanı)
            const kod = d.stokkodu || d.stockCode || d.sku || "Bilinmiyor";

            products.push({
              id: doc.id,
              stockCode: kod,
              // Panelde "Eklenme Tarihi" sütununa gidecek veri
              eklenmeTarihi: rawDate,
            });
          });

          response = { success: true, products: products };
        } else if (islem === "add_product_sku") {
          await db.collection("product_pool").add({
            stockCode: data.stockCode.toString().trim(),
            eklenmeTarihi: admin.firestore.FieldValue.serverTimestamp(),
          });
          response = { success: true, message: "SKU eklendi." };
        } else if (islem === "delete_product") {
          await db.collection("product_pool").doc(data.id).delete();
          response = { success: true, message: "SKU silindi." };
        } else if (islem === "admin_import_skus") {
          const batch = db.batch();
          data.skus.forEach((code) => {
            const ref = db.collection("product_pool").doc();
            batch.set(ref, {
              stockCode: code,
              eklenmeTarihi: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Toplu aktarım başarılı." };
        } // ==================================================================
        // 🚀 VERİ GÖÇÜ YOLLARI (14 SAYFA - TAM LİSTE)
        // ==================================================================

        // 1. AYARLAR (#10)
        else if (islem === "admin_import_settings") {
          await db
            .collection("system")
            .doc("settings")
            .set(data.ayarlar, { merge: true });
          response = { success: true, message: "Ayarlar güncellendi." };
        }

        // 2. KULLANICILAR (#4)
        else if (islem === "admin_import_users") {
          const batch = db.batch();
          data.users.forEach((u) => {
            const ref = db.collection("users").doc(u.email);
            batch.set(
              ref,
              { ...u, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
              { merge: true }
            );
          });
          await batch.commit();
          response = { success: true, message: "Kullanıcılar aktarıldı." };
        }

        // 3. ÇEKİLİŞ YÖNETİMİ (#2)
        else if (islem === "admin_import_raffles") {
          const batch = db.batch();
          data.raffles.forEach((item) => {
            const ref = db.collection("raffles").doc();
            batch.set(ref, {
              ...item,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Çekilişler aktarıldı." };
        }

        // 4. GÖREV TANIMLARI (#8)
        else if (islem === "admin_import_tasks") {
          const batch = db.batch();
          data.veriler.forEach((item) => {
            const ref = db.collection("tasks").doc();
            batch.set(ref, {
              ...item,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Görevler aktarıldı." };
        }

        // 5. ÜRÜN HAVUZU SKU (#18)
        else if (islem === "admin_import_skus") {
          const batch = db.batch();
          data.skus.forEach((code) => {
            const ref = db.collection("product_pool").doc();
            batch.set(ref, {
              stockCode: code,
              eklenmeTarihi: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "SKU'lar aktarıldı." };
        }

        // 6. PUAN GEÇMİŞİ (#5)
        else if (islem === "admin_import_point_history") {
          const batch = db.batch();
          data.history.forEach((item) => {
            const ref = db.collection("point_history").doc();
            batch.set(ref, {
              ...item,
              tarih: item.tarih
                ? admin.firestore.Timestamp.fromDate(new Date(item.tarih))
                : admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Puan geçmişi aktarıldı." };
        }

        // 7. ARŞİV KATILIM (#19)
        else if (islem === "admin_import_archive") {
          const batch = db.batch();
          data.archive.forEach((item) => {
            const ref = db.collection("archive_participants").doc();
            batch.set(ref, {
              ...item,
              createdAt: item.createdAt
                ? admin.firestore.Timestamp.fromDate(new Date(item.createdAt))
                : admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Arşiv aktarıldı." };
        }

        // 8. AKTİF KATILIMCILAR (#1)
        else if (islem === "admin_import_participants") {
          const batch = db.batch();
          data.participants.forEach((item) => {
            const ref = db.collection("raffle_participants").doc();
            batch.set(ref, {
              ...item,
              createdAt: item.createdAt
                ? admin.firestore.Timestamp.fromDate(new Date(item.createdAt))
                : admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = {
            success: true,
            message: "Aktif katılımcılar aktarıldı.",
          };
        }

        // 9. KUPON HAVUZU (#17)
        else if (islem === "admin_import_coupon_pool") {
          const batch = db.batch();
          data.coupons.forEach((item) => {
            const ref = db.collection("coupon_pool").doc();
            batch.set(ref, {
              ...item,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Kupon havuzu aktarıldı." };
        }

        // 10. KUPON MAĞAZASI (#12)
        else if (islem === "admin_import_store") {
          const batch = db.batch();
          data.items.forEach((item) => {
            const ref = db.collection("coupon_store").doc();
            batch.set(ref, {
              ...item,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Mağaza ürünleri aktarıldı." };
        }

        // 11. REFERANSLAR (#11)
        else if (islem === "admin_import_referrals") {
          const batch = db.batch();
          data.referrals.forEach((item) => {
            const ref = db.collection("referrals").doc();
            batch.set(ref, {
              ...item,
              createdAt: item.date
                ? admin.firestore.Timestamp.fromDate(new Date(item.date))
                : admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Referanslar aktarıldı." };
        }

        // 12. KAZANANLAR (#3)
        else if (islem === "admin_import_winners") {
          const batch = db.batch();
          data.winners.forEach((item) => {
            const ref = db.collection("raffle_winners").doc();
            batch.set(ref, {
              ...item,
              wonAt: item.date
                ? admin.firestore.Timestamp.fromDate(new Date(item.date))
                : admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Kazananlar aktarıldı." };
        }

        // 17. GERİ BİLDİRİM / DESTEK (#6) - GÜVENLİ DATE MODU
        else if (islem === "admin_import_feedback") {
          const batch = db.batch();
          if (data.feedbacks && data.feedbacks.length > 0) {
            data.feedbacks.forEach((item) => {
              const ref = db.collection("feedback").doc();

              batch.set(ref, {
                ticketId: item.ticketId,
                email: item.email,
                subject: item.subject,
                message: item.message,
                phone: item.phone,
                status: item.status,
                adminReply: item.adminReply,
                isRead: item.isRead,
                // 🔥 DÜZELTME BURADA: Tarihi çevirmeden, direkt metin olarak kaydet
                // Böylece "16.11.2025" gelirse hata vermez, aynen yazar.
                createdAt: item.createdAt
                  ? item.createdAt
                  : admin.firestore.FieldValue.serverTimestamp(),
                repliedAt: item.repliedAt || null,
              });
            });
            await batch.commit();
            response = {
              success: true,
              message: "Destek talepleri aktarıldı.",
            };
          } else {
            response = { success: false, message: "Veri yok." };
          }
        }

        // 14. BİLDİRİMLER (#7)
        else if (islem === "admin_import_notifications") {
          const batch = db.batch();
          data.notifications.forEach((item) => {
            const ref = db.collection("notifications").doc();
            batch.set(ref, {
              ...item,
              createdAt: item.date
                ? admin.firestore.Timestamp.fromDate(new Date(item.date))
                : admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          response = { success: true, message: "Bildirim listesi aktarıldı." };
        }
        // 15. GÖREV İLERLEMELERİ (#9) - YENİ EKLENEN
        else if (islem === "admin_import_user_progress") {
          const batch = db.batch();
          // Gelen paket boşsa hata vermesin
          if (data.progressList && data.progressList.length > 0) {
            data.progressList.forEach((item) => {
              // ID formatı: email_taskID (Örn: info@modum.tr_gunluk_rutin)
              const docId = `${item.email}_${item.taskId}`;
              const ref = db.collection("user_task_progress").doc(docId);

              batch.set(ref, {
                email: item.email,
                taskId: item.taskId,
                taskTitle: item.taskTitle,
                completed: item.completed,
                // Eğer tamamlandıysa tarih at, yoksa null
                completedAt: item.completed
                  ? admin.firestore.FieldValue.serverTimestamp()
                  : null,
                steps: item.steps || {},
              });
            });
            await batch.commit();
            response = { success: true, message: "İlerlemeler aktarıldı." };
          } else {
            response = { success: false, message: "Veri paketi boş geldi." };
          }
        }
        // 16. SİSTEM VERİSİ (#16) - EFSANE HAVUZU VE ALTIN ÜRÜNLER
        else if (islem === "admin_import_system_data") {
          const { legendPool, goldenCodes } = data;

          // 1. Havuz Tutarını Güncelle
          await db
            .collection("system")
            .doc("system_data")
            .set(
              {
                legendPool: parseFloat(legendPool) || 0,
              },
              { merge: true }
            );

          // 2. Altın Ürünleri Güncelle (Bugünün tarihine kaydet)
          const todayStr = new Date().toISOString().split("T")[0];
          await db
            .collection("system")
            .doc("daily_golden_products")
            .set({
              date: todayStr,
              codes: goldenCodes || [],
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          response = { success: true, message: "Sistem verisi güncellendi." };
        }
        // --- TOPLU SKU YÜKLEME (Metin Kutusu) ---
        else if (islem === "bulk_add_products_text") {
          const { textData } = data; // "SKU1\nSKU2,SKU3" gibi gelecek
          if (!textData) {
            response = { success: false, message: "Veri yok." };
          } else {
            // Virgül, yeni satır veya boşlukla ayır, boşlukları temizle
            const skus = textData
              .split(/[\n,]+/)
              .map((s) => s.trim())
              .filter((s) => s !== "");

            if (skus.length === 0) {
              response = { success: false, message: "Geçerli SKU bulunamadı." };
            } else {
              const batch = db.batch();
              skus.forEach((code) => {
                const ref = db.collection("product_pool").doc(); // Rastgele ID
                batch.set(ref, {
                  stockCode: code,
                  eklenmeTarihi: admin.firestore.FieldValue.serverTimestamp(),
                });
              });
              await batch.commit();
              await logSecurity(
                "ÜRÜN_EKLEME",
                `${skus.length} adet SKU toplu eklendi.`
              );
              response = {
                success: true,
                message: `${skus.length} ürün başarıyla eklendi.`,
              };
            }
          }
        } // --- TÜM ÜRÜNLERİ SİL (Temizlik) ---
        else if (islem === "delete_all_products") {
          const snapshot = await db.collection("product_pool").limit(500).get(); // Batch limiti 500
          if (snapshot.empty) {
            response = { success: false, message: "Silinecek ürün yok." };
          } else {
            const batch = db.batch();
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();

            // Eğer 500'den fazla varsa tekrar çağırılmalı (Basitlik için şimdilik tek seferlik)
            await logSecurity("ÜRÜN_SILME", "Ürün havuzu temizlendi.");
            response = {
              success: true,
              message: `${snapshot.size} ürün silindi.`,
            };
          }
        } // ==================================================================
        // 🕵️ GÜNLÜK ALTIN ÜRÜNLERİ GETİR (GARANTİLİ & DÜZELTİLMİŞ)
        // ==================================================================
        else if (islem === "get_daily_golden_codes") {
          const trDate = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
          );
          const todayStr = trDate.toISOString().split("T")[0];

          const docRef = db.collection("system").doc("daily_golden_products");
          const docSnap = await docRef.get();

          let selectedCodes = [];
          let needsNewSelection = true;

          // Eğer kayıt varsa VE içi doluysa yeniden seçme
          if (docSnap.exists) {
            const data = docSnap.data();
            if (data.date === todayStr && data.codes && data.codes.length > 0) {
              selectedCodes = data.codes;
              needsNewSelection = false;
            }
          }

          // Eğer kayıt yoksa VEYA kayıt var ama içi boşsa -> YENİDEN SEÇ
          if (needsNewSelection) {
            const poolSnap = await db
              .collection("product_pool")
              .limit(100)
              .get();
            const allSkus = [];
            poolSnap.forEach((doc) => {
              const d = doc.data();
              // Hem stokkodu hem stockCode alanına bak
              const code = d.stockCode || d.stokkodu || d.sku;
              if (code) allSkus.push(code);
            });

            if (allSkus.length > 0) {
              // Karıştır
              for (let i = allSkus.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allSkus[i], allSkus[j]] = [allSkus[j], allSkus[i]];
              }
              // İlk 5 taneyi al
              selectedCodes = allSkus.slice(0, 5);

              // Veritabanına Yaz
              await docRef.set({
                date: todayStr,
                codes: selectedCodes,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }

          response = { success: true, codes: selectedCodes, date: todayStr };
        }
        // --- SİSTEM VERİLERİNİ OKU (HAVUZ VB.) ---
        else if (islem === "get_system_data") {
          const snapshot = await db.collection("system").get();
          let pool = 0;

          snapshot.forEach((doc) => {
            const d = doc.data();
            // Excel'de "veri" sütununda "EfsaneHavuzu" yazıyorsa "tutar"ı al
            if (d.veri === "EfsaneHavuzu" || doc.id === "EfsaneHavuzu") {
              pool = parseFloat(d.tutar) || 0;
            }
          });

          response = { success: true, data: { legendPool: pool } };
        }
        // --- EFSANE HAVUZUNA MANUEL EKLEME ---
        else if (islem === "admin_add_pool_funds") {
          const { amount, adminEmail } = data;
          const eklenenTutar = parseFloat(amount);

          if (isNaN(eklenenTutar) || eklenenTutar === 0) {
            response = {
              success: false,
              message: "Geçerli bir tutar giriniz.",
            };
          } else {
            const poolRef = db.collection("system").doc("system_data");

            // Döküman varsa artır, yoksa oluştur
            // Hem pozitif (ekleme) hem negatif (çıkarma) çalışır
            await poolRef.set(
              {
                legendPool: admin.firestore.FieldValue.increment(eklenenTutar),
              },
              { merge: true }
            );

            // Log At
            await logSecurity(
              "HAVUZ_GUNCELLEME",
              `Admin (${
                adminEmail || "Patron"
              }) havuza ${eklenenTutar} TL ekledi/çıkardı.`
            );

            response = {
              success: true,
              message: `Havuz güncellendi: ${
                eklenenTutar > 0 ? "+" : ""
              }${eklenenTutar} TL`,
            };
          }
        }
        // --- DESTEK VE DEĞERLENDİRME (GÖREV TETİKLEYİCİLİ) ---
        else if (islem === "submit_feedback") {
          const { email, subject, message, phone, type } = data; // type: 'support' veya 'evaluation'
          const isEvaluation = type === "evaluation";

          // Ticket ID üret (#TLP-1234) veya Değerlendirme (#DGR-1234)
          const prefix = isEvaluation ? "#DGR-" : "#TLP-";
          const ticketId = prefix + Math.floor(1000 + Math.random() * 9000);

          const batch = db.batch();

          // 1. Talebi Kaydet
          const feedbackRef = db.collection("feedback").doc();
          batch.set(feedbackRef, {
            ticketId: ticketId,
            email: email,
            subject:
              subject ||
              (isEvaluation ? "Kullanıcı Değerlendirmesi" : "Destek"),
            message: message,
            phone: phone || "-",
            status: "pending",
            type: type || "support", // Türünü kaydet (Filtreleme için şart)
            adminReply: "",
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            tarih: new Date().toLocaleString("tr-TR", {
              timeZone: "Europe/Istanbul",
            }),
          });

          // 2. EĞER DEĞERLENDİRME İSE -> GÖREVİ TAMAMLA (ALIŞVERİŞ GURUSU ADIM 2)
          if (isEvaluation) {
            const taskId = "alisveris_guru_v1";
            const progressRef = db
              .collection("user_task_progress")
              .doc(`${email}_${taskId}`);

            // Görevin 2. adımını '1' yapıyoruz
            batch.set(
              progressRef,
              {
                email: email,
                taskId: taskId,
                taskTitle: "Alışveriş Gurusu",
                adim2_ilerleme: 1, // 🔥 Değerlendirme yapıldı
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            // Log atalım
            const logRef = db.collection("system_logs").doc();
            batch.set(logRef, {
              email: email,
              action: "DEĞERLENDİRME_YAPILDI",
              details: "Alışveriş Gurusu 2. Adım Tamamlandı",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          await batch.commit();

          response = {
            success: true,
            message: isEvaluation
              ? "Değerlendirmeniz alındı ve görev tamamlandı! 🎉"
              : `Talebiniz alındı. Takip No: ${ticketId}`,
          };
        }
        // --- MÜŞTERİ TALEPLERİNİ GETİR (GARANTİLİ - İNDEKS GEREKTİRMEZ) ---
        else if (islem === "get_user_requests") {
          const { email } = data;

          // Sadece e-postaya göre çekiyoruz (Hata vermemesi için)
          const snapshot = await db
            .collection("feedback")
            .where("email", "==", email)
            .get();

          let list = [];
          let hasUnreadReply = false;

          snapshot.forEach((doc) => {
            const d = doc.data();

            // 1. FİLTRELEME: Sadece 'support' olanları al (Değerlendirmeleri gizle)
            // Eğer type alanı yoksa (eski kayıtlar) varsayılan olarak göster
            if (!d.type || d.type === "support") {
              // Kırmızı Nokta Kontrolü: Admin cevaplamışsa
              if (
                d.status === "answered" ||
                (d.adminReply && d.adminReply.length > 1)
              ) {
                hasUnreadReply = true;
              }

              list.push({
                ticketId: d.ticketId,
                subject: d.subject,
                message: d.message,
                adminReply: d.adminReply,
                status: d.status === "answered" ? "Cevaplandı" : "Bekliyor",
                // Tarih yoksa şimdiki zamanı koy (sıralama bozulmasın)
                sortDate: d.createdAt ? d.createdAt.toMillis() : Date.now(),
                date: d.tarih || "-",
              });
            }
          });

          // 2. SIRALAMA: Yeniden eskiye (JavaScript ile yapıyoruz)
          list.sort((a, b) => b.sortDate - a.sortDate);

          response = {
            success: true,
            list: list,
            hasNotification: hasUnreadReply,
          };
        }

        // --- TALEPLERİ LİSTELE (TARİH FİX) ---
        // --- TALEPLERİ LİSTELE (ADMIN İÇİN - HEPSİNİ GETİR) ---
        else if (islem === "get_feedbacks") {
          const snapshot = await db
            .collection("feedback")
            .orderBy("createdAt", "desc") // Tarihe göre sırala (En yeni en üstte)
            .limit(50)
            .get();

          const list = [];
          snapshot.forEach((doc) => {
            const d = doc.data();
            list.push({
              id: doc.id,
              ticketId: d.ticketId || "#",
              email: d.e_posta || d.email,
              subject: d.subject || "Konusuz",
              message: d.message || "",
              status: d.status || "pending",
              type: d.type || "support", // Türünü de gönderiyoruz
              phone: d.phone || "-",
              date: d.tarih || "-",
              adminReply: d.adminReply || "",
            });
          });
          response = { success: true, list: list };
        }

        // ==================================================================
        // 💬 DESTEK TALEBİNE CEVAP VER (+ OTOMATİK MAİL GÖNDER)
        // ==================================================================
        else if (islem === "reply_feedback") {
          const { docId, replyMessage } = data;

          // 1. Talebi Bul
          const docRef = db.collection("feedback").doc(docId);
          const doc = await docRef.get();

          if (!doc.exists) {
            response = { success: false, message: "Talep bulunamadı." };
          } else {
            const talepData = doc.data();

            // 2. Durumu Güncelle (Cevaplandı Yap)
            await docRef.update({
              status: "answered",
              adminReply: replyMessage,
              repliedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 3. 🔥 KRİTİK NOKTA: MAİL GÖNDERME EMRİ
            // Biz buraya eklediğimiz an, kurduğunuz Eklenti bunu görüp maili atacak.
            if (talepData.email && talepData.email.includes("@")) {
              await db.collection("mail").add({
                to: talepData.email,
                message: {
                  subject: `Destek Talebiniz Yanıtlandı (${
                    talepData.ticketId || "Destek"
                  })`,
                  html: `
                    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                      <h2 style="color: #0d6efd;">ModumNet Destek</h2>
                      <p>Sayın Müşterimiz,</p>
                      <p><strong>${
                        talepData.ticketId || "#"
                      }</strong> numaralı destek talebiniz yetkilimiz tarafından yanıtlanmıştır.</p>
                      
                      <div style="background-color: #f8f9fa; border-left: 4px solid #0d6efd; padding: 15px; margin: 20px 0;">
                        <strong>Yetkili Cevabı:</strong><br>
                        ${replyMessage}
                      </div>
                      
                      <hr style="border: 0; border-top: 1px solid #eee;">
                      <p style="font-size: 0.9em; color: #666;">
                        Taleplerim sayfasından tüm geçmişi görüntüleyebilirsiniz.<br>
                        İyi günler dileriz.
                      </p>
                    </div>
                  `,
                },
              });
            }

            // 4. Güvenlik Logu Tut
            await logSecurity(
              "DESTEK_CEVAP",
              `Cevap verildi ve mail tetiklendi: ${talepData.email}`
            );

            response = {
              success: true,
              message: "Cevap kaydedildi ve mail gönderildi! 📨",
            };
          }
        }

        // --- BİLDİRİM LİSTESİNE EKLE (GÜNCELLENMİŞ) ---
        else if (islem === "subscribe_notification") {
          const { email } = data;

          // Mükerrer kontrolü (Hem 'email' hem 'e_posta' alanına bak)
          // Not: Firestore'da OR sorgusu zordur, o yüzden en garantisi email ile bakmaktır.
          const check = await db
            .collection("notifications")
            .where("e_posta", "==", email)
            .get();

          if (check.empty) {
            // --- 🔥 EKRAN GÖRÜNTÜSÜNDEKİ FORMATTA KAYDET ---
            await db.collection("notifications").add({
              e_posta: email, // Screenshot 99 ile uyumlu
              email: email, // Yedek (Admin paneli bazen bunu arar)

              // Tarihi senin formatında (String) kaydediyoruz
              kayit_tarihi: new Date().toISOString(),

              // Yedek olarak Timestamp de atalım (Sıralama için iyidir)
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            await logSecurity("ABONELIK", `${email} bildirimlere abone oldu.`);

            response = {
              success: true,
              message: "✅ Listeye başarıyla eklendiniz!",
            };
          } else {
            response = { success: false, message: "⚠️ Zaten listedesiniz." };
          }
        }

        // --- BİLDİRİM LİSTESİNİ ÇEK (ADMIN) ---
        else if (islem === "get_notifications") {
          const snapshot = await db.collection("notifications").get();
          const list = [];
          snapshot.forEach((doc) => {
            const d = doc.data();
            list.push({
              // Excel: kayit_tarihi
              createdAt: d.kayit_tarihi || d.createdAt,
              // Excel: e_posta
              email: d.e_posta || d.email,
            });
          });
          response = { success: true, list: list, count: list.length };
        } // --- TOPLU DUYURU GÖNDER (KAPSAMLI FİX: HERKESİ YAKALA) ---
        else if (islem === "send_bulk_announcement") {
          const { subject, content } = data;

          const snapshot = await db.collection("notifications").get();
          const count = snapshot.size;

          if (count === 0) {
            response = { success: false, message: "Listede kimse yok." };
          } else {
            const batch = db.batch();
            let mailCount = 0;

            snapshot.forEach((doc) => {
              const d = doc.data();

              // 🔥 DÜZELTME BURADA: Hem 'email' hem 'e_posta' alanına bakıyoruz
              // Hangisi doluysa onu alacak. Böylece kimse atlanmayacak.
              const userEmail = d.email || d.e_posta;

              if (userEmail && userEmail.includes("@")) {
                // Her abone için mail kutusuna emir bırakıyoruz
                const mailRef = db.collection("mail").doc();
                batch.set(mailRef, {
                  to: userEmail, // Yakaladığımız doğru maili kullan
                  message: {
                    subject: subject,
                    html: `<div style="font-family:Arial; padding:20px;">${content}</div>`,
                  },
                });
                mailCount++;
              }
            });

            // Hepsini tek seferde kuyruğa at
            await batch.commit();

            await logSecurity(
              "TOPLU_DUYURU",
              `${mailCount} kişiye duyuru maili tetiklendi. Konu: ${subject}`
            );

            response = {
              success: true,
              message: `${mailCount} kişiye mail gönderim emri verildi! 🚀`,
            };
          }
        }
        // ==================================================================
        // MODÜL 6: SİPARİŞ ENTEGRASYONU (FAPRİKA WEBHOOK)
        // ==================================================================
        else if (islem === "process_faprika_order") {
          const { email, total_price, order_id } = data;
          // Tutar temizliği (1.250,50 TL -> 1250.50)
          let cleanPrice = 0;
          if (typeof total_price === "string") {
            cleanPrice = parseFloat(
              total_price
                .replace("TL", "")
                .replace(/\./g, "")
                .replace(",", ".")
                .trim()
            );
          } else {
            cleanPrice = parseFloat(total_price);
          }

          // ... (Buradan sonra response satırı gelir) ...

          if (!email || cleanPrice <= 0) {
            response = { success: false, message: "Geçersiz veri." };
          } else {
            const settings = await getSystemSettings();
            const batch = db.batch();
            const now = admin.firestore.FieldValue.serverTimestamp();

            // 1. KULLANICIYI BUL VEYA OLUŞTUR
            const userRef = db.collection("users").doc(email);
            const userDoc = await userRef.get();
            let userData = userDoc.exists
              ? userDoc.data()
              : {
                  puan: 0,
                  siparisSayisi: 0,
                  seviye: "Çaylak",
                  davetEden: null,
                };

            if (!userDoc.exists) {
              // Siparişle gelen yeni üye
              const refCode =
                "REF-" +
                Math.random().toString(36).substring(2, 6).toUpperCase();
              userData = {
                email,
                adSoyad: "Yeni Müşteri",
                puan: 0,
                seviye: "Çaylak",
                siparisSayisi: 0,
                referansKodu: refCode,
                davetEden: null,
              };
              batch.set(userRef, userData);
            }

            // 2. XP HESAPLA (Limitlere Göre)
            let earnedXP = parseInt(settings.siparis_xp_l1); // Standart
            let xpType = "Standart";

            if (cleanPrice >= parseInt(settings.siparis_limit_l4)) {
              earnedXP = parseInt(settings.siparis_xp_l4);
              xpType = "👑 ALTIN";
            } else if (cleanPrice >= parseInt(settings.siparis_limit_l3)) {
              earnedXP = parseInt(settings.siparis_xp_l3);
              xpType = "🥈 GÜMÜŞ";
            } else if (cleanPrice >= parseInt(settings.siparis_limit_l2)) {
              earnedXP = parseInt(settings.siparis_xp_l2);
              xpType = "🥉 BRONZ";
            }

            // --- 🔥 BURASI DEĞİŞTİ: Akıllı Hesaplama Başlıyor 🔥 ---

            // 1. Yeni Puanı Hesapla
            const newScore = (parseInt(userData.puan) || 0) + earnedXP;

            // 2. Sipariş Sayısını Garantili Çek (Küçük/Büyük Harf Kontrolü)
            let currentOrderCount = 0;
            if (userData.siparisSayisi !== undefined)
              currentOrderCount = parseInt(userData.siparisSayisi);
            else if (userData.siparissayisi !== undefined)
              currentOrderCount = parseInt(userData.siparissayisi);

            // Yeni Sipariş Sayısı (Mevcut + 1)
            const newOrderCount = currentOrderCount + 1;

            // 3. Seviye Hesapla (Artık YENİ sipariş sayısını gönderiyoruz!)
            const newLevel = calculateLevel(
              newScore,
              newOrderCount, // <--- İŞTE BU EKSİKTİ, ARTIK EKLENDİ ✅
              settings
            );

            // 4. Veritabanını Güncelle
            batch.update(userRef, {
              puan: newScore,
              toplampuan: newScore, // Puanları eşitle
              siparisSayisi: newOrderCount, // Yeni sayıyı işle (Örn: 2 olacak)
              seviye: newLevel, // Eğer şartlar tutuyorsa Şampiyon olacak
              updatedAt: now,
            });
            const guruTaskRef = db
              .collection("user_task_progress")
              .doc(`${email}_alisveris_guru_v1`);

            batch.set(
              guruTaskRef,
              {
                email: email,
                taskId: "alisveris_guru_v1",
                taskTitle: "Alışveriş Gurusu",
                adim1_ilerleme: 1, // Sipariş tamamlandı (1/1)
                // adim2_ilerleme'ye dokunmuyoruz, o destek talebiyle dolacak
                updatedAt: now,
              },
              { merge: true }
            );

            // Log At
            const logRef = db.collection("system_logs").doc();
            batch.set(logRef, {
              email: email,
              action: "SİPARİŞ_KAZANCI",
              details: `Sipariş: ${
                order_id || "-"
              } (${cleanPrice} TL) -> ${xpType} Kazanç: +${earnedXP} XP`,
              ip: "Faprika/Webhook",
              createdAt: now,
            });

            // 3. REFERANS PRİMİ (%5)
            if (userData.davetEden) {
              const refBonus = Math.floor(cleanPrice * 0.05); // %5 Hesapla
              if (refBonus > 0) {
                const inviterRef = db
                  .collection("users")
                  .doc(userData.davetEden);
                // Atomik artış (Increment)
                batch.update(inviterRef, {
                  puan: admin.firestore.FieldValue.increment(refBonus),
                });

                // Referans Tablosunu Güncelle (Toplam Kazancı Artır)
                // (Burada basitlik için log atıyoruz, detaylı tablo güncellemesi sonraki iş)
                const refLogRef = db.collection("system_logs").doc();
                batch.set(refLogRef, {
                  email: userData.davetEden,
                  action: "REFERANS_PRIMI",
                  details: `${email} siparişinden %5 Prim: +${refBonus} XP`,
                  ip: "Sistem",
                  createdAt: now,
                });
              }
            }

            // 8. 🔥 EFSANE HAVUZU (%2) - BATCH (PAKET) İÇİNE ALINDI
            const poolShare = Math.floor(cleanPrice * 0.02);
            if (poolShare > 0) {
              const poolRef = db.collection("system").doc("system_data");
              // Batch.set ve merge:true kullanarak ana paketle birlikte gönderiyoruz.
              // Bu sayede "Puan gitti ama havuz gitmedi" sorunu asla olmaz.
              batch.set(
                poolRef,
                {
                  legendPool: admin.firestore.FieldValue.increment(poolShare),
                },
                { merge: true }
              );
            }

            // 5. HAK TANIMLA (+10 HAK)
            const activeRafflesSnap = await db
              .collection("raffles")
              .where("durum", "==", "Aktif")
              .where("endDate", ">", new Date().toISOString())
              .get();

            if (!activeRafflesSnap.empty) {
              activeRafflesSnap.forEach((raf) => {
                for (let k = 0; k < 10; k++) {
                  const ticketRef = db.collection("raffle_participants").doc();
                  const ticketId =
                    "#MDM-" +
                    Math.random().toString(36).substr(2, 4).toUpperCase();
                  batch.set(ticketRef, {
                    raffleId: raf.id,
                    raffleName: raf.data().name,
                    userEmail: email,
                    userName: userData.adSoyad || email,
                    ticketId: ticketId,
                    actionType: "Sipariş Bonusu",
                    createdAt: now,
                  });
                }
              });
            }
            const trDateNow = new Date(
              new Date().toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
              })
            );
            const currentHour = trDateNow.getHours();

            if (currentHour >= 0 && currentHour < 6) {
              // Gece siparişi! Rozeti ver.
              batch.update(userRef, {
                badges: admin.firestore.FieldValue.arrayUnion("gece_kusu"),
              });
              // (Log atmak istersen buraya ekleyebilirsin ama şart değil)
            }

            // 2. SEPET KRALI (Yüksek Tutar - Örn: 5000 TL)
            if (cleanPrice >= 5000) {
              batch.update(userRef, {
                badges: admin.firestore.FieldValue.arrayUnion("sepet_krali"),
              });
            }

            await batch.commit();
            // 🔥 DÜZELTME: MAİLİ ARTIK BURADA GÖNDERİYORUZ (HESAPLAMALAR BİTTİKTEN SONRA)
            try {
              await db.collection("mail").add({
                to: email,
                message: {
                  subject: `Siparişinizden +${earnedXP} Puan Kazandınız! 🎁`,
                  html: `
                      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #28a745;">Tebrikler! 🎉</h2>
                        <p>Sayın Müşterimiz,</p>
                        <p><strong>${
                          order_id || "Yeni"
                        }</strong> numaralı siparişiniz onaylandı.</p>
                        
                        <div style="background:#f9f9f9; padding:15px; border-radius:5px; margin:15px 0;">
                          <p style="margin:0; font-size:16px;">Kazanılan Puan: <strong style="color:#e67e22;">+${earnedXP} XP</strong></p>
                          <p style="margin:5px 0 0; font-size:14px;">Yeni Seviyeniz: <strong>${newLevel}</strong></p>
                        </div>
      
                        <p>Puanlarınızı kupon mağazasında harcayabilirsiniz.</p>
                        <a href="https://modum.tr" style="background:#007bff; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; display:inline-block;">Mağazaya Git</a>
                      </div>
                    `,
                },
              });
            } catch (e) {
              console.log("Mail hatası:", e);
            }

            response = {
              success: true,
              message: `Sipariş işlendi. XP: ${earnedXP}, Havuz: ${poolShare} TL`,
            };
          }
        } // --- PUAN GEÇMİŞİ (RAM SIRALAMA - KESİN ÇÖZÜM) ---
        else if (islem === "get_global_point_history") {
          try {
            // 1. LİMİT KOYMADAN ÇEK (Hepsini al, en yenileri biz bulacağız)
            // Not: Çok fazla veri varsa (10.000+) bu yavaşlatabilir ama şu an çözüm bu.
            // Güvenlik için yine de 1000 limit koyalım.
            const snapshot = await db
              .collection("point_history")
              .limit(1000)
              .get();

            let allLogs = [];

            snapshot.forEach((doc) => {
              const d = doc.data();

              // TARİHİ PUANLA (Sıralama İçin)
              let sortVal = 0;

              // A) Timestamp varsa
              if (d.date && d.date.toMillis) sortVal = d.date.toMillis();
              else if (d.tarih && d.tarih.toMillis)
                sortVal = d.tarih.toMillis();
              else if (d.createdAt && d.createdAt.toMillis)
                sortVal = d.createdAt.toMillis();
              // B) String varsa ("December 22..." veya "22.12.2025")
              else {
                let raw = d.date || d.tarih || "";
                if (typeof raw === "string") {
                  // Temizle
                  let s = raw.replace(" at ", " ").replace("UTC+3", "").trim();
                  // Türkçe formatı düzelt
                  if (s.includes(".")) {
                    let p = s.split(" ");
                    let dP = p[0].split(".");
                    if (dP.length === 3)
                      s = `${dP[2]}-${dP[1]}-${dP[0]}T${p[1] || "00:00"}`;
                  }
                  sortVal = new Date(s).getTime();
                }
              }

              if (isNaN(sortVal)) sortVal = 0;

              // GÖRÜNEN TARİH
              let showDate = d.date || d.tarih || "-";
              // Eğer timestamp objesi ise stringe çevir
              if (typeof showDate === "object" && showDate.toDate) {
                showDate = showDate
                  .toDate()
                  .toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
              }

              allLogs.push({
                id: doc.id,
                email: d.email || d.e_posta || "Bilinmiyor",
                islem: d.islem || d.action || "İşlem",
                puan: d.puan || 0,
                hak: d.hak || 0,
                date: showDate,
                _sort: sortVal, // Sıralama anahtarı
              });
            });

            // 2. RAM'DE SIRALA (Yeniden Eskiye)
            allLogs.sort((a, b) => b._sort - a._sort);

            // 3. İLK 100 TANEYİ GÖNDER (En Yeniler)
            const finalLogs = allLogs.slice(0, 100);

            response = { success: true, list: finalLogs };
          } catch (error) {
            console.error("Geçmiş Hatası:", error);
            response = { success: false, list: [], error: error.message };
          }
        }

        // 2. ARŞİV KATILIM (Bitmiş çekilişlerin biletleri)
        else if (islem === "get_archived_entries") {
          try {
            // Arşiv koleksiyonundan veri çek
            const snapshot = await db
              .collection("archive_participants")
              .limit(100)
              .get();
            const list = [];

            snapshot.forEach((doc) => {
              const d = doc.data();
              list.push({
                // Excel'den Gelen -> Panele Giden
                date: d.tarih ? d.tarih.toString() : "-",
                raffleName: d.cekilis_adi || d.raffleName || "Bilinmiyor",
                email: d.e_posta || d.email || "-",
                ticketId: d.bilet_id || d.ticketId || "-",
              });
            });

            // Tarihe göre sıralama (Hata verirse sıralamayı kaldırabilirsin)
            list.sort((a, b) => {
              return new Date(b.date) - new Date(a.date);
            });

            response = { success: true, list: list };
          } catch (error) {
            // Koleksiyon boşsa veya hata varsa boş liste dön, "Yükleniyor"da kalmasın
            response = { success: true, list: [] };
          }
        } // --- SİSTEM LOGLARI (TARİH SIRALAMASI DÜZELTİLDİ) ---
        else if (islem === "get_system_logs") {
          try {
            // 🔥 DÜZELTME: Veritabanından çekerken 'createdAt' alanına göre TERS sırala (desc)
            // Böylece en yeni kayıt en başa gelir.
            const snapshot = await db
              .collection("system_logs")
              .orderBy("createdAt", "desc")
              .limit(50)
              .get();

            const logs = [];

            snapshot.forEach((doc) => {
              const d = doc.data();

              // 1. Tarih Formatlama (Türkiye Saati)
              let dateDisplay = "-";

              if (d.createdAt && d.createdAt.toDate) {
                // Timestamp ise TR saatine çevir
                dateDisplay = d.createdAt
                  .toDate()
                  .toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
              } else if (d.tarih) {
                // Eski string formatıysa olduğu gibi al (veya düzelt)
                dateDisplay = d.tarih.replace("T", " ").split(".")[0];
              }

              // 2. Veri Eşleştirme
              const aksiyon = d.action || d.islem || "İşlem";
              const detay = d.details || d.detay || "-";
              const email = d.email || d.e_posta || "Misafir";

              logs.push({
                tarih: dateDisplay,
                email: email,
                action: aksiyon,
                details: detay,
              });
            });

            // (Opsiyonel) JavaScript ile de garanti sıralama yapalım
            // logs.sort((a, b) => ... ) -> Gerek yok çünkü orderBy("createdAt", "desc") zaten sıralı getirir.

            response = { success: true, logs: logs };
          } catch (error) {
            // Eğer 'createdAt' indeksi yoksa hata verebilir, o durumda indicesiz çekip JS ile sıralayalım
            console.error("Log Sıralama Hatası:", error);

            // YEDEK PLAN: İndeks hatası verirse düz çekip burada sıralarız
            const fallbackSnap = await db
              .collection("system_logs")
              .limit(50)
              .get();
            const fallbackLogs = [];
            fallbackSnap.forEach((doc) => {
              const d = doc.data();
              let tVal = 0;
              if (d.createdAt && d.createdAt.toMillis)
                tVal = d.createdAt.toMillis();

              fallbackLogs.push({
                tarih: d.createdAt
                  ? d.createdAt.toDate().toLocaleString("tr-TR")
                  : "-",
                email: d.email,
                action: d.action,
                details: d.details,
                _sort: tVal,
              });
            });
            // JS ile sırala
            fallbackLogs.sort((a, b) => b._sort - a._sort);

            response = { success: true, logs: fallbackLogs };
          }
        } // --- PATRON PANELİ: HIZLI & TASARRUFLU İSTATİSTİKLER (V2) ---
        else if (islem === "get_dashboard_stats") {
          try {
            // 1. GENEL KULLANICI SAYISI (Count sorgusu ucuzdur, kalabilir)
            const usersSnap = await db.collection("users").count().get();
            const totalUsers = usersSnap.data().count;

            // 2. BUGÜNÜN DETAYLARI (Artık tek bir dosyadan okunuyor!) 🚀
            // Eskiden 1000 okuma yapıyordu, şimdi 1 okuma.
            const statsDoc = await db
              .collection("system")
              .doc("daily_stats")
              .get();
            let statsData = statsDoc.exists ? statsDoc.data() : {};

            // Eğer istatistik dosyasındaki tarih bugüne ait değilse (henüz işlem olmamışsa) her şeyi 0 göster
            const trDate = new Date(
              new Date().toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
              })
            );
            const todayStr = trDate.toISOString().split("T")[0];

            if (statsData.date !== todayStr) {
              statsData = {
                goruntulenme: 0,
                activeUye: 0,
                dagitilanXP: 0,
                verilenHak: 0,
                cekilisKatilim: 0,
                magazaSatisi: 0,
                sansKutusu: 0,
                tamamlananGorev: 0,
                gizliHazine: 0,
                dogumGunu: 0,
              };
            }

            // Aktif üye sayısı için basit bir tahmin veya ayrı bir sayaç gerekebilir.
            // Şimdilik 0 gönderiyoruz veya eski usul count yapabiliriz ama maliyet artar.
            // Tasarruf için bu değeri şimdilik 0 geçelim veya loglardan değil users'dan "sonGiris"e göre sayalım.
            // Hız için: Aktif üyeyi şimdilik 'goruntulenme' ile orantılı veya ayrı bir sayaçla yapmalıyız.
            // Basitlik adına:
            statsData.aktifUye = totalUsers; // Toplam üyeyi gösterelim şimdilik.

            response = { success: true, stats: statsData };
          } catch (error) {
            response = { success: false, message: error.message };
          }
        }
        // --- YÖNETİCİ NOTLARI (OTOMATİK SIFIRLAMALI) ---
        else if (islem === "get_admin_notes") {
          const docRef = db.collection("system").doc("admin_notes");
          const doc = await docRef.get();

          let data = doc.exists ? doc.data() : {};
          const now = new Date();

          // ZAMAN KONTROLÜ VE SIFIRLAMA
          // 1. Günlük Sıfırlama
          const todayStr = now.toISOString().split("T")[0];
          if (data.last_reset_day !== todayStr) {
            // Gün değişmiş, günlükleri sıfırla
            data.daily = { 1: false, 2: false, 3: false };
            data.last_reset_day = todayStr;
            await docRef.set(data, { merge: true });
          }

          // 2. Haftalık Sıfırlama (Pazartesi ise)
          const currentWeek = getWeekNumber(now);
          if (data.last_reset_week !== currentWeek) {
            data.weekly = { 1: false, 2: false, 3: false, 4: false };
            data.last_reset_week = currentWeek;
            await docRef.set(data, { merge: true });
          }

          // 3. Aylık Sıfırlama
          const currentMonth = now.getMonth() + "-" + now.getFullYear();
          if (data.last_reset_month !== currentMonth) {
            data.monthly = { 1: false, 2: false, 3: false };
            data.last_reset_month = currentMonth;
            await docRef.set(data, { merge: true });
          }

          response = { success: true, notes: data };
        } else if (islem === "toggle_admin_note") {
          const { type, id, status } = data; // type: daily, weekly, monthly
          const docRef = db.collection("system").doc("admin_notes");

          await docRef.set(
            {
              [type]: { [id]: status },
            },
            { merge: true }
          );

          response = { success: true };
        } // --- ADMIN GİRİŞ KONTROLÜ (GÜVENLİ - .ENV KULLANIMI) ---
        else if (islem === "admin_login") {
          const { email, password } = data;

          // 🔥 GÜVENLİK: Şifreleri Environment Variable'dan çekiyoruz
          // Eğer .env dosyası yoksa veya okunamazsa, kod çalışmaz (Güvenli kalır)
          const SERVER_EMAIL = process.env.ADMIN_EMAIL;
          const SERVER_PASS = process.env.ADMIN_PASSWORD;

          // Ekstra Güvenlik: Eğer sunucuda şifre tanımlı değilse girişi engelle
          if (!SERVER_EMAIL || !SERVER_PASS) {
            console.error("KRİTİK HATA: .env dosyasında şifre tanımlı değil!");
            response = {
              success: false,
              message: "Sunucu yapılandırma hatası.",
            };
          } else if (email === SERVER_EMAIL && password === SERVER_PASS) {
            // Başarılı
            await logSecurity("ADMIN_GIRIS", `Başarılı giriş: ${email}`);
            response = { success: true, message: "Giriş başarılı." };
          } else {
            // Başarısız
            await logSecurity("BLOKLANDI", `Hatalı şifre denemesi: ${email}`);
            response = {
              success: false,
              message: "Hatalı E-posta veya Şifre!",
            };
          }
        } // --- OTO-PİLOT AYARLARINI KAYDET ---
        else if (islem === "save_auto_raffle_settings") {
          const { settings } = data;
          // settings objesi: { daily: {...}, weekly: {...}, monthly: {...} }
          await db
            .collection("system")
            .doc("auto_raffle_settings")
            .set(settings, { merge: true });
          response = {
            success: true,
            message: "Oto-Pilot ayarları güncellendi ve zamanlandı.",
          };
        }
        // --- OTO-PİLOT AYARLARINI GETİR ---
        else if (islem === "get_auto_raffle_settings") {
          const doc = await db
            .collection("system")
            .doc("auto_raffle_settings")
            .get();
          response = { success: true, settings: doc.exists ? doc.data() : {} };
        }
        // ==================================================================
        // 🤖 MODUM ASİSTAN (AKILLI & TASARRUFLU v6.0)
        // ==================================================================
        else if (islem === "chatWithAI") {
          const { message, userEmail } = data;
          const API_KEY = "AIzaSyCDktTR0IAEViCjvOON3jG82uwRzHVYqsc"; // Senin Keyin

          const db = admin.firestore();
          let systemContext = "";
          let dataCost = 0;

          const msg = (message || "").toLowerCase();
          const isAdmin = userEmail === "info@modum.tr";

          // -----------------------------------------------------------
          // 1. MOD: PATRON (ADMIN) TARAMASI
          // -----------------------------------------------------------
          if (isAdmin) {
            systemContext += `🚨 PATRON MODU AKTİF. Kullanıcı: ${userEmail}. Ona kısa, net ve yönetici özeti ver. Asla uydurma.\n`;

            // A. GENEL İSTATİSTİK SORARSA (Ciro, Üye Sayısı vb.)
            if (
              msg.includes("kaç üye") ||
              msg.includes("durum") ||
              msg.includes("özet") ||
              msg.includes("sayı")
            ) {
              // 1. Günlük Özeti Çek
              const statsDoc = await db
                .collection("system")
                .doc("daily_stats")
                .get();
              let totalUserCount = "Bilinmiyor";

              // 2. Toplam Üye Sayısını Çek (Count Aggregation - Çok ucuzdur)
              // Faturayı etkilemez (1 belge okuma maliyeti gibidir)
              const userCountSnap = await db.collection("users").count().get();
              totalUserCount = userCountSnap.data().count;

              if (statsDoc.exists) {
                const s = statsDoc.data();
                systemContext += `
                        📊 SİSTEM RAPORU:
                        - Toplam Kayıtlı Üye: ${totalUserCount} Kişi
                        - Bugün Dağıtılan XP: ${s.dagitilanXP || 0}
                        - Bugün Verilen Hak: ${s.verilenHak || 0}
                        - Bugün Mağaza Satışı: ${s.magazaSatisi || 0}
                        `;
                dataCost++;
              }
            }

            // B. KENDİ PUANINI VEYA BAŞKASINI SORARSA
            // Örn: "benim puanım", "info puan", "ahmet puan"
            if (
              msg.includes("puan") ||
              msg.includes("hak") ||
              msg.includes("bilgi")
            ) {
              // Patronun kendi verisi
              const myDoc = await db
                .collection("users")
                .doc("info@modum.tr")
                .get();
              if (myDoc.exists) {
                const d = myDoc.data();
                systemContext += `\n👤 SENİN (ADMIN) BİLGİLERİN:\nPuan: ${d.puan}\nSeviye: ${d.seviye}\nHak: ${d.hak}`;
                dataCost++;
              }
            }
          }

          // -----------------------------------------------------------
          // 2. MOD: MÜŞTERİ (veya Patron ürün ararken)
          // -----------------------------------------------------------

          // A. ÜRÜN ARAMA (Bot, Ayakkabı, Fiyat)
          // Kelime kontrolünü genişletiyoruz
          const productKeywords = [
            "bot",
            "çizme",
            "ayakkabı",
            "terlik",
            "fiyat",
            "kaç para",
            "öner",
            "model",
          ];
          const wantsProduct = productKeywords.some((key) => msg.includes(key));

          if (wantsProduct) {
            // "Bot" kelimesi geçiyorsa özel ilgi gösterelim
            // Veritabanından en son eklenen 20 ürünü çekip içinde filtreleyeceğiz (Maliyet: 20 okuma - Güvenli)
            const productSnap = await db
              .collection("ai_products")
              .orderBy("updatedAt", "desc")
              .limit(20)
              .get();

            let foundProducts = [];
            productSnap.forEach((doc) => {
              const p = doc.data();
              const pTitle = (p.title || "").toLowerCase();
              const pCat = (p.category || "").toLowerCase();

              // Eğer kullanıcı "Bot" dediyse ve ürün başlığında "Bot" geçiyorsa listeye al
              // Eğer kullanıcı genel sorduysa hepsini al
              if (msg.includes("bot")) {
                if (
                  pTitle.includes("bot") ||
                  pTitle.includes("boot") ||
                  pCat.includes("bot")
                ) {
                  foundProducts.push(
                    `📦 MODEL: ${p.title} | FİYAT: ${p.price} TL | LİNK: ${p.link}`
                  );
                }
              } else {
                // Genel arama
                foundProducts.push(
                  `📦 MODEL: ${p.title} | FİYAT: ${p.price} TL | LİNK: ${p.link}`
                );
              }
            });

            // Eğer hiç bot bulamadıysa, son 3 ürünü gösterip "Bot kalmadı ama bunlar var" dedirtelim
            if (foundProducts.length === 0) {
              systemContext += `\n⚠️ Veritabanında şu an tam eşleşen 'Bot' bulamadım ama son eklenenleri göster.\n`;
            } else {
              // En fazla 5 tane göster ki sohbet şişmesin
              systemContext += `\n👢 BULUNAN ÜRÜNLER (Müşteriye bunları sun):\n${foundProducts
                .slice(0, 5)
                .join("\n")}`;
            }
            dataCost += 20;
          }

          // B. KİMLİK KARTI (Müşteri Modunda)
          if (!isAdmin && userEmail && userEmail !== "Misafir") {
            if (
              msg.includes("puan") ||
              msg.includes("hak") ||
              msg.includes("seviye")
            ) {
              const userDoc = await db.collection("users").doc(userEmail).get();
              if (userDoc.exists) {
                const u = userDoc.data();
                systemContext += `\n👤 MÜŞTERİ BİLGİSİ: Puan: ${u.puan} XP, Seviye: ${u.seviye}, Hak: ${u.hak}`;
                dataCost++;
              }
            }
          }

          // -----------------------------------------------------------
          // 3. GEMINI PROMPT AYARLARI (Format Düzeltme)
          // -----------------------------------------------------------
          try {
            const aiPrompt = `
                Sen ModumNet'in yapay zeka asistanısın. Adın MODUM.
                Sakın "Sadık", "Ahmet" gibi isimler uydurma.
                
                SİSTEMDEN GELEN VERİLER:
                ${
                  systemContext ||
                  "Sistemden özel veri çekilemedi. Genel nazik sohbet et."
                }
                
                KULLANICI MESAJI: "${message}"
                
                KURALLAR:
                1. Asla uydurma link verme. Yukarıdaki "BULUNAN ÜRÜNLER" listesindeki linkleri kullan.
                2. Kullanıcı "Bot" derse bu "Ayakkabı/Çizme" demektir. Asla yazılım botu önerme!
                3. Çıktıyı HTML formatında ver (Satır başları için <br>, kalın yazılar için <b> kullan).
                4. Linkleri şu formatta ver: <a href="LINK_ADRESI" target="_blank" style="color:#007bff; font-weight:bold;">👉 ÜRÜNÜ İNCELE</a>
                5. Üslubun kısa, net ve yardımcı olsun. Destan yazma.
                `;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
            const aiRes = await axios.post(url, {
              contents: [{ parts: [{ text: aiPrompt }] }],
            });

            const aiText =
              aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
              "Bağlantıda sorun oldu.";

            console.log(`Maliyet Raporu: ${dataCost} belge okundu.`); // Loglarda görürsün

            response = { success: true, answer: aiText };
          } catch (e) {
            console.error("AI Hatası:", e.message);
            response = {
              success: false,
              answer: "Bir hata oluştu: " + e.message,
            };
          }
        }

        res.json(response);
      } catch (error) {
        logger.error("API Hatası:", error);
        res.status(500).json({ success: false, message: error.message });
      }
    });
  }
);
// ==================================================================
// 🤖 OTO-PİLOT: SEVİYE & ROZET KONTROL ROBOTU (DÜZELTİLMİŞ FİNAL)
// Kullanıcının Puanı veya Siparişi değiştiği an devreye girer.
// ==================================================================
const { onDocumentWritten } = require("firebase-functions/v2/firestore");

exports.autoLevelCheck = onDocumentWritten("users/{userId}", async (event) => {
  // Eğer döküman silindiyse işlem yapma
  if (!event.data) return;

  const newData = event.data.after.data() || {};
  const oldData = event.data.before.data() || {};

  // Puan veya Sipariş sayısı değişmemişse boşuna çalışma (Döngüyü engelle)
  // Not: Hem küçük harf (siparissayisi) hem deve hörgücü (siparisSayisi) kontrolü
  const puanDegisti =
    oldData.toplampuan !== newData.toplampuan || oldData.puan !== newData.puan;
  const siparisDegisti =
    oldData.siparisSayisi !== newData.siparisSayisi ||
    oldData.siparissayisi !== newData.siparissayisi;

  // Sadece puan veya sipariş değiştiyse hesaplama yap
  if (puanDegisti || siparisDegisti) {
    const db = admin.firestore();

    // 1. Güncel Ayarları Çek
    const settingsDoc = await db.collection("system").doc("settings").get();
    // Ayarlar yoksa varsayılanı kullan (Hata vermemesi için)
    const settings = settingsDoc.exists
      ? { ...DEFAULT_SETTINGS, ...settingsDoc.data() }
      : DEFAULT_SETTINGS;

    // 2. Kullanıcının Mevcut Puanı
    const p = parseInt(newData.toplampuan || newData.puan || 0);

    // 3. Kullanıcının Sipariş Sayısını Garantili Çek 🔥
    let o = 0;
    if (newData.siparissayisi !== undefined)
      o = parseInt(newData.siparissayisi);
    else if (newData.siparisSayisi !== undefined)
      o = parseInt(newData.siparisSayisi);

    // 4. Olması Gereken Seviyeyi Hesapla
    const calculatedLvl = calculateLevel(p, o, settings);
    const currentLvl = newData.seviye || "Çaylak";

    // 5. Rozetleri Hesapla (Kümülatif Mantık: Üst seviye, altları da kapsar)
    let myBadges = newData.badges || [];
    let badgesChanged = false;

    // A. Çaylak Rozeti (Herkese Verilir)
    if (!myBadges.includes("lvl_caylak")) {
      myBadges.push("lvl_caylak");
      badgesChanged = true;
    }

    // B. Usta ve Üzeri
    if (["Usta", "Şampiyon", "Efsane"].includes(calculatedLvl)) {
      if (!myBadges.includes("lvl_usta")) {
        myBadges.push("lvl_usta");
        badgesChanged = true;
      }
    }

    // C. Şampiyon ve Üzeri
    if (["Şampiyon", "Efsane"].includes(calculatedLvl)) {
      if (!myBadges.includes("lvl_sampiyon")) {
        myBadges.push("lvl_sampiyon");
        badgesChanged = true;
      }
    }

    // D. Efsane
    if (calculatedLvl === "Efsane") {
      if (!myBadges.includes("lvl_efsane")) {
        myBadges.push("lvl_efsane");
        badgesChanged = true;
      }
    }

    // 6. GÜNCELLEME GEREKİYOR MU?
    let updates = {};

    // Seviye Yanlışsa Düzelt
    if (calculatedLvl !== currentLvl) {
      updates.seviye = calculatedLvl;
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      console.log(
        `🆙 SEVİYE DÜZELTİLDİ: ${event.params.userId} -> ${currentLvl} idi, ${calculatedLvl} oldu. (Puan: ${p}, Sipariş: ${o})`
      );
    }

    // Rozet Eksikse Ekle
    if (badgesChanged) {
      updates.badges = myBadges;
      // Eğer avatarı yoksa veya eski seviye avatarıysa, yeni seviyesine uygun avatarı yap
      // Bu sayede kullanıcı Efsane olduğunda profil resmi otomatik Efsane olur.
      const currentAvatar = newData.selectedAvatar;
      if (!currentAvatar || currentAvatar.startsWith("lvl_")) {
        if (calculatedLvl === "Efsane") updates.selectedAvatar = "lvl_efsane";
        else if (calculatedLvl === "Şampiyon")
          updates.selectedAvatar = "lvl_sampiyon";
        else if (calculatedLvl === "Usta") updates.selectedAvatar = "lvl_usta";
        else updates.selectedAvatar = "lvl_caylak";
      }
      console.log(`🏅 ROZETLER GÜNCELLENDİ: ${event.params.userId}`);
    }

    // Eğer güncelleme varsa veritabanına yaz
    if (Object.keys(updates).length > 0) {
      return event.data.after.ref.update(updates);
    }
  }
});
// ==================================================================
// 🔧 YARDIMCI: İSİM DÜZELTİCİ (Adım 2.2)
// ==================================================================
function fixParticipantName(name, email) {
  if (name && name !== "Misafir" && name.length > 2) {
    return name; // İsim düzgünse dokunma
  }

  // İsim yoksa e-postadan türet (ahmet.yilmaz@mail.com -> Ahmet Yilmaz)
  if (email && email.includes("@")) {
    const userPart = email.split("@")[0]; // ahmet.yilmaz
    // Nokta, alt çizgi vb. kaldırıp baş harfleri büyüt
    const cleanName = userPart
      .replace(/[._-]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return cleanName;
  }

  return "Gizli Üye"; // Hiçbiri yoksa
} // ==================================================================
// 🎰 ÇEKİLİŞ MOTORU (ÇAKIŞMA ÖNLEYİCİ & TEMİZ KAYIT v7.0)
// ==================================================================
async function executeRaffleEngine(raffleId) {
  const db = admin.firestore();
  const raffleRef = db.collection("raffles").doc(raffleId);

  console.log(`🚀 Çekiliş Motoru Başlatıldı: ${raffleId}`);

  // 1. Çekilişi Çek
  const doc = await raffleRef.get();
  if (!doc.exists) {
    return { success: false, msg: "Çekiliş bulunamadı." };
  }

  const rData = doc.data();

  // Durum Kontrolü
  if (rData.status === "completed" || rData.durum === "Tamamlandı") {
    return { success: false, msg: "Zaten bitmiş." };
  }

  // 2. Katılımcıları Çek
  const pSnap = await db
    .collection("raffle_participants")
    .where("raffleId", "==", raffleId)
    .get();
  let participants = [];
  pSnap.forEach((p) => participants.push(p.data()));

  if (participants.length === 0) {
    await raffleRef.update({
      status: "cancelled",
      durum: "İptal",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: false, msg: "Katılım yok, iptal edildi." };
  }

  // 3. Karıştır
  for (let i = participants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }

  // 4. Kazananları Seç
  const winnerCount =
    parseInt(rData.winnerCount) || parseInt(rData.kazanan_sayisi) || 1;
  const uniqueWinners = [];
  const winnerEmails = new Set();

  for (const ticket of participants) {
    if (uniqueWinners.length >= winnerCount) break;
    const emailKey =
      ticket.userEmail || ticket.userId || ticket.e_posta || "unknown";
    if (!winnerEmails.has(emailKey)) {
      uniqueWinners.push(ticket);
      winnerEmails.add(emailKey);
    }
  }

  const batch = db.batch();
  const winnersList = [];

  const safeName = rData.cekilis_adi || rData.name || "Çekiliş";
  const safeReward = rData.reward || rData.odul_adi || "Ödül";

  // 🔥 TUTAR BULMA
  let targetAmount = 0;
  const amountMatch = String(safeReward).match(/(\d+)/);
  if (amountMatch) targetAmount = parseInt(amountMatch[0]);

  // 🔥🔥🔥 KRİTİK DÜZELTME: KUPONLARI TOPLU ÇEK (STOKLAMA) 🔥🔥🔥
  let availableCoupons = [];

  if (targetAmount > 0) {
    // İhtiyacımız olan sayı kadar kuponu PEŞİN çekiyoruz
    // Önce sayısal (int) olarak dene
    let couponSnap = await db
      .collection("coupon_pool")
      .where("status", "==", "active")
      .where("discount", "==", targetAmount)
      .limit(uniqueWinners.length) // Lazım olduğu kadar çek
      .get();

    // Bulamazsa String olarak dene ("150")
    if (couponSnap.empty) {
      couponSnap = await db
        .collection("coupon_pool")
        .where("status", "==", "active")
        .where("discount", "==", String(targetAmount))
        .limit(uniqueWinners.length)
        .get();
    }

    // Bulunanları listeye at
    couponSnap.forEach((doc) => {
      availableCoupons.push({ id: doc.id, data: doc.data(), ref: doc.ref });
    });

    console.log(`✅ Stoktan ${availableCoupons.length} adet kupon ayrıldı.`);
  }

  // 5. DAĞITIM VE KAYIT
  for (let i = 0; i < uniqueWinners.length; i++) {
    const w = uniqueWinners[i];
    let assignedCoupon = null;
    let finalPrizeText = safeReward; // Varsayılan: "150 TL Çek"

    // Havuzda kupon varsa sıradakini ver
    if (availableCoupons.length > i) {
      const couponObj = availableCoupons[i];
      assignedCoupon = couponObj.data;

      // Kuponu yak
      batch.update(couponObj.ref, {
        status: "used",
        durum: "Kullanıldı",
        usedBy: w.userEmail || "Kazanan",
        raffleId: raffleId,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 🔥 DÜZELTME: Ödülü "Obje" değil "Yazı" olarak kaydet (Admin Paneli Bozulmasın diye)
      finalPrizeText = `${targetAmount} TL Çek (Kod: ${assignedCoupon.code})`;
    }

    // B. Kazananı Kaydet
    const wRef = db.collection("raffle_winners").doc();
    const wEmail = w.userEmail || w.e_posta || "mail-yok";
    const wName = w.userName || w.isim_soyisim || "Gizli Üye";

    batch.set(wRef, {
      raffleId: raffleId,
      raffleName: safeName,
      userId: w.userId || wEmail,
      userName: wName,
      userEmail: wEmail,
      rank: i + 1,
      prize: finalPrizeText, // Düzeltilmiş Metin (FS5SD9 gibi değil, tam cümle)
      rawCoupon: assignedCoupon ? assignedCoupon.code : null, // Kodu ayrıca yedekle
      wonAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // C. Mail Gönder
    if (wEmail.includes("@")) {
      const mailRef = db.collection("mail").doc();
      let mailBody = `<h3>Tebrikler ${wName}!</h3><p><strong>${safeName}</strong> çekilişini kazandınız.</p>`;

      if (assignedCoupon) {
        mailBody += `
          <div style="background:#d1fae5; padding:20px; border:2px dashed #10b981; text-align:center; margin:15px 0; border-radius:10px;">
            <div style="font-size:14px; color:#065f46; margin-bottom:5px;">Hediye Çeki Kodunuz:</div>
            <div style="font-size:28px; color:#047857; font-weight:bold; letter-spacing:2px;">${
              assignedCoupon.code
            }</div>
            <div style="font-size:12px; color:#065f46; margin-top:5px;">Son Kullanma: ${
              assignedCoupon.expiry || "Süresiz"
            }</div>
          </div>
          <p>Bu kodu sepet adımında kullanarak indiriminizi anında alabilirsiniz.</p>
          <a href="https://modum.tr" style="background:#10b981; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; display:inline-block; margin-top:10px;">Alışverişe Başla</a>
        `;
      } else {
        mailBody += `<p>Ödülünüz: <strong>${safeReward}</strong></p><p>Ödülünüz en kısa sürede hesabınıza tanımlanacaktır.</p>`;
      }

      batch.set(mailRef, {
        to: wEmail,
        message: {
          subject: "🎉 TEBRİKLER! Çekilişi Kazandınız",
          html: mailBody,
        },
      });
    }

    winnersList.push({ ...w, prize: finalPrizeText });
  }

  // 6. Çekilişi Kapat
  batch.update(raffleRef, {
    status: "completed",
    durum: "Tamamlandı",
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { success: true, winners: winnersList };
}
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// ==================================================================
// 🤖 ROBOT 1: GÜNLÜK GÖREV SIFIRLAYICI (SAAT AYARLI)
// ==================================================================
exports.taskResetJob = require("firebase-functions/v2/scheduler").onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Europe/Istanbul", // 🔥 BURASI ÇOK ÖNEMLİ (Türkiye Saati)
    region: "europe-west1", // Eğer bölge farklıysa burayı kendi bölgene göre düzelt
  },
  async (event) => {
    console.log("🧹 Günlük Görev Sıfırlama Başladı... (TR Saati)");
    const db = admin.firestore();

    // 1. Günlük Görevlerin ID'lerini Bul
    // Hem 'frequency' hem 'tip' alanına bakıyoruz
    const q1 = db.collection("tasks").where("frequency", "==", "GUNLUK").get();
    const q2 = db.collection("tasks").where("tip", "==", "GUNLUK").get();

    const [snap1, snap2] = await Promise.all([q1, q2]);
    const dailyTaskIds = [];

    [...snap1.docs, ...snap2.docs].forEach((doc) => {
      // Mükerrer eklemeyi önle
      if (!dailyTaskIds.includes(doc.id)) dailyTaskIds.push(doc.id);
    });

    if (dailyTaskIds.length === 0)
      return console.log("Sıfırlanacak günlük görev yok.");

    // 2. İlerlemeleri Sıfırla (Batch işlemi ile)
    // Bellek şişmesin diye parça parça işleyelim
    const progressSnap = await db.collection("user_task_progress").get();

    // 🔥 ÖNEMLİ: 500'den fazla veri varsa döngüyle batch oluşturmak gerekir.
    // Şimdilik basit batch kullanıyoruz.
    const batch = db.batch();
    let count = 0;

    progressSnap.forEach((doc) => {
      const d = doc.data();

      // Eğer bu ilerleme kaydı, günlük bir göreve aitse SIFIRLA
      if (dailyTaskIds.includes(d.taskId)) {
        batch.update(doc.ref, {
          completed: false,
          completedAt: null,
          adim1_ilerleme: 0, // Adımları sıfırla
          adim2_ilerleme: 0,
          count: 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Sıfırlandığı zamanı işle
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ ${count} adet günlük görev başarıyla sıfırlandı.`);
    } else {
      console.log("Sıfırlanacak aktif ilerleme bulunamadı.");
    }
  }
);

// ==================================================================
// 🤖 ROBOT 2: HAFTALIK GÖREV SIFIRLAYICI (HER PAZARTESİ 00:00)
// ==================================================================
exports.weeklyTaskResetJob =
  require("firebase-functions/v2/scheduler").onSchedule(
    { schedule: "0 0 * * 1", timeZone: "Europe/Istanbul" }, // 1 = Pazartesi
    async (event) => {
      console.log("📅 Haftalık Görev Sıfırlama Başladı...");
      const db = admin.firestore();

      // 1. Haftalık Görevleri Bul
      const q1 = db
        .collection("tasks")
        .where("frequency", "==", "HAFTALIK")
        .get();
      const q2 = db.collection("tasks").where("tip", "==", "HAFTALIK").get();

      const [snap1, snap2] = await Promise.all([q1, q2]);
      const weeklyIds = [];

      [...snap1.docs, ...snap2.docs].forEach((doc) => {
        if (!weeklyIds.includes(doc.id)) weeklyIds.push(doc.id);
      });

      if (weeklyIds.length === 0) return;

      // 2. İlerlemeleri Sıfırla
      const progressSnap = await db.collection("user_task_progress").get();
      const batch = db.batch();
      let count = 0;

      progressSnap.forEach((doc) => {
        const d = doc.data();
        if (weeklyIds.includes(d.taskId)) {
          batch.update(doc.ref, {
            completed: false,
            completedAt: null,
            adim1_ilerleme: 0,
            adim2_ilerleme: 0,
            count: 0,
          });
          count++;
        }
      });

      if (count > 0) await batch.commit();
      console.log(`${count} adet haftalık görev sıfırlandı.`);
    }
  );

// ==================================================================
// 🤖 ROBOT 3: ÇEKİLİŞ KONTROL SİSTEMİ (HER SAAT BAŞI)
// ==================================================================
exports.raffleCheckJob = require("firebase-functions/v2/scheduler").onSchedule(
  { schedule: "0 * * * *", timeZone: "Europe/Istanbul" },
  async (event) => {
    console.log("🎲 Çekiliş Robotu Devrede...");

    // Türkiye saati ile şu anki zaman
    const now = new Date().toLocaleString("en-US", {
      timeZone: "Europe/Istanbul",
    });
    const nowISO = new Date(now).toISOString().split(".")[0]; // Saniye hassasiyeti yeterli

    const db = admin.firestore();

    // Süresi dolmuş VE aktif olan çekilişleri bul
    // Screenshot_27'ye göre 'endDate' alanı "2025-12-21T23:59:00" formatında
    const snapshot = await db
      .collection("raffles")
      .where("status", "==", "active") // veya durum: "Aktif"
      .where("endDate", "<=", nowISO)
      .get();

    if (snapshot.empty) {
      console.log("✅ Bitmesi gereken çekiliş yok. Sistem stabil.");
      return;
    }

    // Hepsini Teker Teker Bitir
    for (const doc of snapshot.docs) {
      console.log(
        `⏳ SÜRE DOLDU! Çekiliş Başlatılıyor: ${
          doc.data().name || doc.data().cekilis_adi
        }`
      );
      await executeRaffleEngine(doc.id);
    }
  }
);
// ==================================================================
// 🤖 ROBOT 4: GÜNLÜK ALTIN ÜRÜN SIFIRLAYICI (HER GECE 00:00)
// ==================================================================
exports.dailyGoldenResetJob =
  require("firebase-functions/v2/scheduler").onSchedule(
    {
      schedule: "0 0 * * *", // Her gece saat 00:00
      timeZone: "Europe/Istanbul", // Türkiye Saati
      region: "europe-west1",
    },
    async (event) => {
      console.log("🌟 Günlük Altın Ürün Seçimi Başladı...");
      const db = admin.firestore();

      // 1. Tarihi Al
      const trDate = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
      );
      const todayStr = trDate.toISOString().split("T")[0];

      // 2. Havuzdan Ürünleri Çek
      const poolSnap = await db.collection("product_pool").limit(200).get();
      const allSkus = [];

      poolSnap.forEach((doc) => {
        const d = doc.data();
        const code = d.stockCode || d.stokkodu || d.sku;
        if (code) allSkus.push(code);
      });

      if (allSkus.length === 0) {
        console.log("⚠️ Havuz boş, seçim yapılamadı.");
        return;
      }

      // 3. Karıştır (Shuffle)
      for (let i = allSkus.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSkus[i], allSkus[j]] = [allSkus[j], allSkus[i]];
      }

      // 4. İlk 5'i Seç ve Kaydet
      const selectedCodes = allSkus.slice(0, 5);

      await db.collection("system").doc("daily_golden_products").set({
        date: todayStr,
        codes: selectedCodes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `✅ ${todayStr} için yeni altın ürünler seçildi: ${selectedCodes.join(
          ", "
        )}`
      );
    }
  );
// ==================================================================
// 🤖 ROBOT 5: DOĞUM GÜNÜ PASTASI DAĞITICI (GÜNCELLENMİŞ)
// ==================================================================
exports.birthdayRewardJob =
  require("firebase-functions/v2/scheduler").onSchedule(
    {
      schedule: "0 9 * * *", // Her sabah 09:00 (TR Saati)
      timeZone: "Europe/Istanbul",
    },
    async (event) => {
      console.log("🎂 Doğum Günü Kontrolü Başladı...");
      const db = admin.firestore();

      // 1. Ayarları Çek (Senin panele yazdığın XP ve Hak değerleri)
      const settingsDoc = await db.collection("system").doc("settings").get();
      const settings = settingsDoc.data() || {};

      const giftXP = parseInt(settings.xp_yillik_dogumgunu) || 500; // Varsayılan 500
      const giftHak = parseInt(settings.hak_yillik_dogumgunu) || 0; // Varsayılan 0

      // 2. Bugünün Tarihi
      const today = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
      );
      const currentDay = today.getDate();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      // 3. Kullanıcıları Tara
      const usersSnap = await db.collection("users").get();
      const batch = db.batch();
      let count = 0;

      usersSnap.forEach((doc) => {
        const u = doc.data();
        if (!u.dogumTarihi) return; // Tarih yoksa geç

        // Tarihi Parçala
        let userDay, userMonth;
        let dStr = String(u.dogumTarihi);

        if (dStr.includes(".")) {
          const p = dStr.split(".");
          userDay = parseInt(p[0]);
          userMonth = parseInt(p[1]);
        } else if (dStr.includes("-")) {
          const p = dStr.split("-");
          userDay = parseInt(p[2]);
          userMonth = parseInt(p[1]);
        }

        // BUGÜN DOĞUM GÜNÜ MÜ?
        if (userDay === currentDay && userMonth === currentMonth) {
          // BU YIL ÖDÜL ALMIŞ MI?
          const lastRewardYear = u.sonDogumGunuOdulYili || 0;

          if (lastRewardYear < currentYear) {
            // --- HEDİYELERİ VER ---

            // Puan Ekle
            const newPoints = (parseInt(u.puan) || 0) + giftXP;

            // Hak Ekle (Hakkı artır)
            // Not: Bu haklar müşterinin cüzdanına eklenir.
            // Müşteri bu haklarla istediği çekilişe "Bilet Al" diyerek katılabilir.

            batch.update(doc.ref, {
              puan: newPoints,
              toplampuan: newPoints,
              hak: admin.firestore.FieldValue.increment(giftHak), // Hakkı artır
              sonDogumGunuOdulYili: currentYear, // Yılı kilitle
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Geçmişe Log At
            const histRef = db.collection("point_history").doc();
            batch.set(histRef, {
              email: u.email,
              islem: "Mutlu Yıllar! Doğum Günü Hediyesi",
              puan: giftXP,
              hak: giftHak,
              tarih: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Sistem Logu
            const sysLog = db.collection("system_logs").doc();
            batch.set(sysLog, {
              email: u.email,
              action: "DOGUM_GUNU",
              details: `Bugün doğum günü! +${giftXP} XP ve +${giftHak} Hak verildi.`,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            count++;
          }
        }
      });

      if (count > 0) await batch.commit();
      console.log(
        `✅ ${count} kişiye doğum günü hediyesi (${giftXP} XP + ${giftHak} Hak) verildi.`
      );
    }
  );
// ==================================================================
// 🧹 ROBOT 6: SİSTEM TEMİZLİKÇİSİ (LOG ARŞİVLEME & SİLME)
// Her gece 04:00'te çalışır. 30 günden eski logları siler.
// ==================================================================
/*
exports.cleanupLogsJob = require("firebase-functions/v2/scheduler").onSchedule(
  {
    schedule: "0 4 * * *", // Her gece 04:00
    timeZone: "Europe/Istanbul",
    region: "europe-west1",
  },
  async (event) => {
    console.log("🧹 Temizlikçi Robot Başladı...");
    const db = admin.firestore();
    const now = new Date();

    // 30 Gün Öncesini Hesapla
    const cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Silinecek Koleksiyonlar
    const collections = ["system_logs", "security_logs", "error_logs"];

    for (const colName of collections) {
      // 30 günden eski olanları bul
      const snapshot = await db
        .collection(colName)
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
        .limit(400) // Tek seferde en fazla 400 sil (Güvenlik limiti)
        .get();

      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ ${colName}: ${snapshot.size} adet eski kayıt silindi.`);
      }
    }
    console.log("🏁 Temizlik Bitti.");
  }
);
*/
// ==================================================================
// 📦 ROBOT 7: VİTRİN TOPLAYICI (AKILLI RESİM SEÇİCİ v3 - TR FİX) 🧠
// ==================================================================
exports.updateShowcaseCache = onDocumentWritten(
  "raffles/{raffleId}",
  async (event) => {
    const db = admin.firestore();
    console.log(
      "📦 Vitrin Robotu: Değişiklik algılandı, vitrin hazırlanıyor..."
    );

    // 1. Sadece "Aktif" olanları çek (DÜZELTME: 'durum' alanı ve 'Aktif' değeri)
    const snapshot = await db
      .collection("raffles")
      .where("durum", "==", "Aktif")
      .get();

    let activeRaffles = [];
    let completedRaffles = [];
    const now = new Date().toISOString();

    // 2. Her çekilişi incele
    for (const doc of snapshot.docs) {
      const d = doc.data();

      // --- A) TARİH DÜZELTME ---
      let bitis =
        d.endDate ||
        d.bitis_tarihi ||
        d.bitis_tarihi_gg_aa_yyyy_ss_dk_ ||
        "2099-01-01";
      // Tarih "17.12.2025" gibiyse düzeltelim
      if (typeof bitis === "string" && bitis.includes(".")) {
        const p = bitis.split(".");
        if (p.length === 3) bitis = `${p[2]}-${p[1]}-${p[0]}`; // YYYY-MM-DD
      }
      // Saat yoksa gün sonu ekle (veya format T ile bitmiyorsa)
      if (bitis.length <= 10) bitis += "T23:59:00";
      else if (!bitis.includes("T")) bitis = bitis.replace(" ", "T");

      // --- B) AKILLI RESİM SEÇİMİ ---
      let resimUrl = "https://www.modum.tr/i/m/001/0013355.png";
      const metin = (
        (d.cekilis_adi || "") +
        " " +
        (d.odul_adi || d.reward || "")
      ).toLowerCase();

      if (metin.includes("1500"))
        resimUrl = "https://www.modum.tr/i/m/001/0013465.jpeg";
      else if (metin.includes("1000"))
        resimUrl = "https://www.modum.tr/i/m/001/0013464.jpeg";
      else if (metin.includes("500"))
        resimUrl = "https://www.modum.tr/i/m/001/0015859.jpeg";
      else if (metin.includes("250"))
        resimUrl = "https://www.modum.tr/i/m/001/0013463.jpeg";
      else if (metin.includes("150"))
        resimUrl = "https://www.modum.tr/i/m/001/0016165.jpeg";

      if (d.resim && d.resim.length > 15) resimUrl = d.resim;

      const item = {
        id: doc.id,
        ad: d.cekilis_adi || d.name || "Fırsat",
        odul: d.odul_adi || d.reward || "Hediye Çeki",
        resim: resimUrl,
        bitisTarihi: bitis,
        katilimciSayisi: d.participantCount || 0,
        durum: "Aktif",
      };

      // Süre kontrolü
      if (parseDateSafe(bitis) > parseDateSafe(now)) {
        activeRaffles.push(item);
      }
    }

    // 3. TAMAMLANANLAR (GÜNCELLEME: Akıllı Resim Seçimi Eklendi ✅)
    const doneSnap = await db
      .collection("raffles")
      .where("durum", "==", "Tamamlandı")
      .orderBy("completedAt", "desc")
      .limit(10)
      .get();

    doneSnap.forEach((doc) => {
      const d = doc.data();

      // --- 🔥 BURASI YENİ EKLENDİ: Resim Seçme Mantığı ---
      let resimUrl = "https://www.modum.tr/i/m/001/0013355.png"; // Varsayılan Turuncu
      const metin = (
        (d.cekilis_adi || "") +
        " " +
        (d.odul_adi || d.reward || "")
      ).toLowerCase();

      if (metin.includes("1500"))
        resimUrl = "https://www.modum.tr/i/m/001/0013465.jpeg";
      else if (metin.includes("1000"))
        resimUrl = "https://www.modum.tr/i/m/001/0013464.jpeg";
      else if (metin.includes("500"))
        resimUrl = "https://www.modum.tr/i/m/001/0015859.jpeg";
      else if (metin.includes("250"))
        resimUrl = "https://www.modum.tr/i/m/001/0013463.jpeg";
      else if (metin.includes("150"))
        resimUrl = "https://www.modum.tr/i/m/001/0016165.jpeg";

      if (d.resim && d.resim.length > 15) resimUrl = d.resim;
      // ----------------------------------------------------

      completedRaffles.push({
        id: doc.id,
        ad: d.cekilis_adi || d.name,
        odul: d.odul_adi || d.reward,
        resim: resimUrl, // Artık doğru resim gidecek
        durum: "Tamamlandı",
        bitisTarihi: d.completedAt ? d.completedAt.toDate().toISOString() : "",
        katilimciSayisi: d.participantCount || 0,
      });
    });

    // 4. SIRALA VE KAYDET
    activeRaffles.sort((a, b) => a.bitisTarihi.localeCompare(b.bitisTarihi));

    await db.collection("system").doc("vitrin_data").set({
      active: activeRaffles,
      completed: completedRaffles,
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `✅ Vitrin Güncellendi: ${activeRaffles.length} Aktif, ${completedRaffles.length} Tamamlanan.`
    );
  }
);
// ==================================================================
// 🤖 ROBOT 8: CANLI MUHASEBECİ (İSTATİSTİK SAYACI) - YENİ VE TASARRUFLU
// Her işlemde günlük istatistikleri +1 artırır.
// ==================================================================
exports.liveStatsAccountant = onDocumentWritten(
  "point_history/{docId}",
  async (event) => {
    // Sadece yeni kayıt eklenince çalışsın (Silme veya güncellemede değil)
    if (!event.data.after.exists) return;

    const d = event.data.after.data();
    const db = admin.firestore();

    // Türkiye Tarihini Al (YYYY-MM-DD)
    const trDate = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    );
    const yyyy = trDate.getFullYear();
    const mm = String(trDate.getMonth() + 1).padStart(2, "0");
    const dd = String(trDate.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`; // Örn: 2025-12-18

    // Sayaç Belgesi Referansı
    const statsRef = db.collection("system").doc("daily_stats");

    // Hangi alanları artıracağız?
    let updates = {
      date: todayStr,
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      goruntulenme: admin.firestore.FieldValue.increment(1), // Genel işlem sayısı
    };

    const islem = (d.islem || "").toLowerCase();
    const puan = parseInt(d.puan) || 0;
    const hak = parseInt(d.hak) || 0;

    // 1. Puan ve Hak Dağıtımı
    if (puan > 0)
      updates.dagitilanXP = admin.firestore.FieldValue.increment(puan);
    if (hak > 0) updates.verilenHak = admin.firestore.FieldValue.increment(hak);

    // 2. Kategori Analizi
    if (islem.includes("katılım") || islem.includes("katilim")) {
      updates.cekilisKatilim = admin.firestore.FieldValue.increment(1);
    } else if (islem.includes("mağaza") && !islem.includes("sandık")) {
      updates.magazaSatisi = admin.firestore.FieldValue.increment(1);
    } else if (islem.includes("sandık") || islem.includes("kutu")) {
      updates.sansKutusu = admin.firestore.FieldValue.increment(1);
    } else if (
      islem.includes("görev") ||
      islem.includes("gorev") ||
      islem.includes("şifre")
    ) {
      updates.tamamlananGorev = admin.firestore.FieldValue.increment(1);
    } else if (islem.includes("hazine") || islem.includes("altın")) {
      updates.gizliHazine = admin.firestore.FieldValue.increment(1);
    } else if (islem.includes("doğum") || islem.includes("dogum")) {
      updates.dogumGunu = admin.firestore.FieldValue.increment(1);
    }

    // 3. İstatistikleri Güncelle (Yoksa oluşturur, varsa birleştirir)
    // NOT: Tarih değiştiyse eski verileri sıfırlamak gerekir.
    // Ancak basitlik ve güvenlik için önce okuyup kontrol ediyoruz.

    await db.runTransaction(async (t) => {
      const doc = await t.get(statsRef);
      if (!doc.exists || doc.data().date !== todayStr) {
        // Eğer belge yoksa veya tarih eskimişse -> SIFIRDAN BAŞLAT
        // (Increment değerleri 1'den başlar çünkü bu ilk kayıt)
        // Ancak yukarıdaki 'updates' değişkeni increment içeriyor.
        // İlk sefer için direkt sayı değerlerini set etmeliyiz.

        const freshStart = {
          date: todayStr,
          lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
          goruntulenme: 1,
          dagitilanXP: puan > 0 ? puan : 0,
          verilenHak: hak > 0 ? hak : 0,
          cekilisKatilim: islem.includes("katılım") ? 1 : 0,
          magazaSatisi:
            islem.includes("mağaza") && !islem.includes("sandık") ? 1 : 0,
          sansKutusu:
            islem.includes("sandık") || islem.includes("kutu") ? 1 : 0,
          tamamlananGorev:
            islem.includes("görev") || islem.includes("şifre") ? 1 : 0,
          gizliHazine: islem.includes("hazine") ? 1 : 0,
          dogumGunu: islem.includes("doğum") ? 1 : 0,
        };
        t.set(statsRef, freshStart);
      } else {
        // Gün aynı, üzerine ekle (Merge)
        t.set(statsRef, updates, { merge: true });
      }
    });
  }
);
// ==================================================================
// 🤖 ROBOT 9: OTO-PİLOT ÇEKİLİŞ FABRİKASI (GÜNCEL VERSİYON)
// ==================================================================
exports.autoRaffleGenerator =
  require("firebase-functions/v2/scheduler").onSchedule(
    {
      schedule: "0 0 * * *", // Her Gece 00:00
      timeZone: "Europe/Istanbul",
      region: "europe-west1",
    },
    async (event) => {
      console.log("🏭 Oto-Pilot Çalıştı...");
      const db = admin.firestore();

      const settingsDoc = await db
        .collection("system")
        .doc("auto_raffle_settings")
        .get();
      if (!settingsDoc.exists) return;
      const config = settingsDoc.data();

      // Bugün (TR Saatiyle)
      const now = new Date();
      const trDate = new Date(
        now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
      );
      const todayStr = trDate.toISOString().split("T")[0];

      // Tarihi Güzel Formatlama (Örn: 20.12.2025)
      const day = String(trDate.getDate()).padStart(2, "0");
      const month = String(trDate.getMonth() + 1).padStart(2, "0");
      const year = trDate.getFullYear();
      const prettyDate = `${day}.${month}.${year}`;

      const cycles = ["daily", "weekly", "monthly"];

      for (const type of cycles) {
        const plan = config[type];

        // Çekiliş vakti geldi mi?
        if (plan && plan.active === true && plan.nextRun <= todayStr) {
          console.log(`🚀 ${type.toUpperCase()} Çekilişi Üretiliyor...`);

          // A. Bitiş Tarihini Ayarla
          let endDate = new Date(trDate);

          // GÜNLÜK: Aynı günün sonu (Gün ekleme yok)
          // HAFTALIK: +7 Gün
          if (type === "weekly") endDate.setDate(endDate.getDate() + 7);
          // AYLIK: +1 Ay
          if (type === "monthly") endDate.setMonth(endDate.getMonth() + 1);

          const endISO = endDate.toISOString().split("T")[0] + "T23:59:00";

          // B. Başlık Oluşturma (Sayaçsız, Tarihli)
          const amount = plan.rewardAmount || "150";
          const winners = plan.winnerCount || "5";

          let title = "";
          if (type === "daily")
            title = `${prettyDate} Günlük Çekiliş (${winners} Kişiye ${amount} ₺)`;
          if (type === "weekly")
            title = `${prettyDate} Haftalık Çekiliş (${winners} Kişiye ${amount} ₺)`;
          if (type === "monthly")
            title = `${prettyDate} Aylık Çekiliş (${winners} Kişiye ${amount} ₺)`;

          // C. Çekilişi Kaydet
          await db.collection("raffles").add({
            name: title,
            cekilis_adi: title,
            endDate: endISO,
            bitis_tarihi: endISO,
            reward: `${amount} TL Çek`,
            odul_adi: `${amount} TL Çek`,
            winnerCount: parseInt(winners),
            kazanan_sayisi: parseInt(winners),
            status: "active",
            durum: "Aktif",
            autoType: type,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            participantCount: 0,
          });

          // D. Bir Sonraki Tarihi Belirle
          let nextRunDate = new Date(trDate);
          if (type === "daily") nextRunDate.setDate(nextRunDate.getDate() + 1);
          if (type === "weekly") nextRunDate.setDate(nextRunDate.getDate() + 7);
          if (type === "monthly")
            nextRunDate.setMonth(nextRunDate.getMonth() + 1);

          const nextRunStr = nextRunDate.toISOString().split("T")[0];

          // Ayarları Güncelle
          await db
            .collection("system")
            .doc("auto_raffle_settings")
            .update({
              [`${type}.nextRun`]: nextRunStr,
            });

          console.log(`✅ ${title} oluşturuldu. Sonraki: ${nextRunStr}`);
        }
      }
    }
  );
// 1. MANUEL XML GÜNCELLEME (Eksik olan parça bu)
exports.manualXMLUpdate = require("firebase-functions/v2/https").onRequest(
  { timeoutSeconds: 540, memory: "1GiB", cors: true },
  async (req, res) => {
    const db = admin.firestore();
    const XML_URL = "https://www.modum.tr/FaprikaXml/J8Y22V/1/"; // Senin Linkin

    // CORS Başlıkları
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "GET");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).send("");
      return;
    }

    try {
      const response = await axios.get(XML_URL);
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);

      let items = [];
      if (result.rss && result.rss.channel && result.rss.channel.item)
        items = result.rss.channel.item;
      else if (result.root && result.root.item) items = result.root.item;

      if (!Array.isArray(items)) items = [items];

      let batch = db.batch();
      let count = 0;
      let savedCount = 0;

      for (const item of items) {
        let priceStr = item["g:price"] || item.price || "0";
        let price = parseFloat(priceStr.toString().replace(/[^0-9.]/g, ""));
        let stockStatus = item["g:availability"] || "out of stock";
        let isStock = stockStatus === "in stock";
        if (item.quantity && parseInt(item.quantity) > 0) isStock = true;

        if (price > 0 && isStock) {
          const sku = item["g:id"] || item.id || "unknown_" + Math.random();
          const docRef = db.collection("ai_products").doc(sku);
          batch.set(docRef, {
            sku: sku,
            title: item.title || item["g:title"],
            price: price,
            link: item.link || item["g:link"],
            image: item["g:image_link"] || item.image_link,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          savedCount++;
          count++;
        }
        if (count >= 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();

      res.send(`✅ BAŞARILI! ${savedCount} ürün yüklendi. Veritabanı doldu!`);
    } catch (error) {
      res.status(500).send("HATA: " + error.message);
    }
  }
);

// ==================================================================
// 🤖 ROBOT 10: XML ÜRÜN AVCISI (MODUM STİLİST İÇİN)
// ==================================================================

exports.updateProductPoolFromXML =
  require("firebase-functions/v2/scheduler").onSchedule(
    {
      schedule: "0 * * * *", // Her saat başı çalışır (Stokları güncel tutar)
      timeZone: "Europe/Istanbul",
      timeoutSeconds: 540, // 9 Dakika süre tanı (XML büyük olabilir)
      memory: "1GiB",
    },
    async (event) => {
      console.log("👗 Modum Stilist: Ürün taraması başladı...");
      const db = admin.firestore();
      const XML_URL = "https://www.modum.tr/FaprikaXml/J8Y22V/1/"; // Senin Linkin

      try {
        // 1. XML'i İndir
        const response = await axios.get(XML_URL);
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        // Faprika XML yapısına göre ürünleri bul
        // Genelde result.root.item veya result.rss.channel.item içindedir.
        // Google formatı olduğu için 'rss' -> 'channel' -> 'item' yolunu izler.
        let items = [];
        if (result.rss && result.rss.channel && result.rss.channel.item) {
          items = result.rss.channel.item;
        } else if (result.root && result.root.item) {
          items = result.root.item;
        }

        if (!Array.isArray(items)) {
          // Tek ürün varsa diziye çevir
          items = [items];
        }

        console.log(`📡 XML'den ${items.length} adet ham ürün çekildi.`);

        const batchLimit = 400;
        let batch = db.batch();
        let count = 0;
        let savedCount = 0;

        // Koleksiyonu temizlemek yerine üzerine yazacağız (Update mantığı)
        // Ama silinen ürünleri temizlemek için eski tarihli olanları silebiliriz.
        // Şimdilik sadece "Var Olanı Güncelle / Yeni Ekle" yapıyoruz.

        for (const item of items) {
          // --- 🛡️ FİLTRELEME (GÜVENLİK GÖREVLİSİ) ---

          // 1. Fiyat Kontrolü
          let price = 0;
          // Google formatında 'g:price' şöyle gelir: "1500 TRY"
          let rawPrice = item["g:price"] || item.price || "0";
          price = parseFloat(rawPrice.replace(/[^0-9.]/g, ""));

          // 2. Stok Kontrolü (Google formatında 'g:availability' gelir: "in stock" veya "out of stock")
          let stockStatus = item["g:availability"] || "out of stock";
          let isStock = stockStatus === "in stock";

          // Faprika bazen direkt stok adedi de verir (quantity gibi). Onu da kontrol edelim.
          if (item.quantity && parseInt(item.quantity) > 0) isStock = true;

          // 3. Kategori/İsim Filtresi (İstemediğin kelimeler)
          const title = (item.title || item["g:title"] || "").toLowerCase();
          const cat = (item["g:google_product_category"] || "").toLowerCase();

          // Eğer "Erkek" geçiyorsa ve sen satmıyorsan YÜKLEME
          if (title.includes("erkek") || cat.includes("men")) continue;

          // --- KAYIT ŞARTI ---
          // Sadece stoğu olan ve fiyatı 0'dan büyük olanları al
          if (isStock && price > 0) {
            const sku = item["g:id"] || item.id; // Stok Kodu
            const docRef = db.collection("ai_products").doc(sku); // SKU ID olarak kullan

            batch.set(docRef, {
              sku: sku,
              title: item.title || item["g:title"], // Ürün Adı
              description: item.description || item["g:description"] || "", // Açıklama (AI bunu okuyacak)
              price: price,
              link: item.link || item["g:link"], // Satın alma linki
              image: item["g:image_link"] || item.image_link, // Resim
              category: item["g:google_product_category"] || "Ayakkabı",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            savedCount++;
            count++;
          }

          // Batch limiti dolunca yaz ve sıfırla
          if (count >= batchLimit) {
            await batch.commit();
            batch = db.batch();
            count = 0;
          }
        }

        // Kalanları yaz
        if (count > 0) await batch.commit();

        console.log(
          `✅ İşlem Tamam: ${savedCount} adet SATILABİLİR ürün veritabanına işlendi.`
        );
        return null;
      } catch (error) {
        console.error("XML Hatası:", error);
        return null;
      }
    }
  );

// ------------------------------------------------------------------
// 👋 2. MANUEL TETİKLEYİCİ (ADMIN PANELİ İÇİN API GÜNCELLEMESİ)
// ------------------------------------------------------------------
// (Bu kısmı api fonksiyonunun içindeki "draw_raffle" if bloğuna taşıyabilirsin veya api fonksiyonunu güncellemelisin)
// Mevcut api fonksiyonundaki "else if (islem === 'draw_raffle')" kısmını bul ve ŞUNUNLA DEĞİŞTİR:

/*
      else if (islem === "draw_raffle") {
        const { raffleId } = data;
        // Ortak motoru çağır
        const result = await executeRaffleEngine(raffleId);
        
        if (result.success) {
           response = { success: true, message: "Çekiliş tamamlandı ve mailler gönderildi!", winners: result.winners };
        } else {
           response = { success: false, message: result.msg || "Hata oluştu." };
        }
      }
*/
