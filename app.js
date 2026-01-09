/* app.js
 * 目的：
 * 1) P2：chip 單選 + 視覺 active + 儲存到 localStorage（沿用舊 key：outfit_input）
 * 2) P3：讀取 localStorage + wardrobe.json -> 推薦 -> 灌進 p3.html
 *
 * 注意：
 * - 這版沿用你原本 P2 的「active」選取樣式與 localStorage key（outfit_input），所以 P2 變色不會消失。
 * - P3 需要在 p3.html 底部加：<script src="app.js"></script>
 * - wardrobe.json 需放在根目錄，並用 Live Server 跑（避免 fetch 失敗）
 */

const STORAGE_KEY = "outfit_input";
const WARDROBE_URL = "wardrobe.json";

/* ---------------------------
   Tag Mapping（中文 -> 資料庫 tag key）
   wardrobe.json 的欄位：
   - occasion_tag（例如 date_occasion）
   - weather_tags（例如 cold_weather）
   - style_tags（例如 korean_style）
--------------------------- */
const MAP_SCENE = {
  上課: "class_occasion",
  上班: "work_occasion",
  正式: "formal_occasion",
  約會: "date_occasion",
  運動: "sport_occasion",
};

const MAP_TEMP = {
  偏冷: "cold_weather",
  舒適: "mild_weather",
  偏熱: "warm_weather",
};

const MAP_STYLE = {
  簡約: "simple_style",
  運動: "sporty_style",
  街頭: "street_style",
  韓系: "korean_style",
  氣質: "lady_like_style",
  甜美: "sweet_style",
};

/* ---------------------------
   Utils
--------------------------- */
function parseTags(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function withUid(items) {
  return items.map((it, idx) => ({
    uid: `${it.ID ?? "noid"}_${idx}`, // 避免 ID 重複
    ...it,
    styleTags: parseTags(it.style_tags),
    weatherTags: parseTags(it.weather_tags),
    occasionTags: parseTags(it.occasion_tag),
  }));
}

function $(sel) {
  return document.querySelector(sel);
}

function setText(el, text) {
  if (!el) return;
  el.textContent = text ?? "";
}

function setImg(el, src, alt) {
  if (!el) return;
  if (src) el.src = src;
  if (alt) el.alt = alt;
}

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getActiveValue(group) {
  return document
    .querySelector(`.card[data-group="${group}"] .chip.active`)
    ?.dataset.value || "";
}


/* ---------------------------
   P2：chip 單選 + 存 localStorage（沿用舊格式）
   你的 P2 結構：
   - section.card[data-group="scene|temp|style"]
   - button.chip[data-value="上課"...]
   - 送出按鈕：#goResult（外層有 <a href="p3.html">）
--------------------------- */
function initP2ChipSelectUI() {
  document.querySelectorAll(".card[data-group]").forEach((card) => {
    const group = card.dataset.group; // scene/temp/style
    const chips = card.querySelectorAll(".chip[data-value]");

    chips.forEach((btn) => {
      btn.addEventListener("click", () => {
        // 同組只留一個 active（沿用你原本 CSS）
        chips.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // 存中文值（沿用舊 key：outfit_input）
        const value = btn.dataset.value || "";
        const data = safeJsonParse(localStorage.getItem(STORAGE_KEY), {});
        data[group] = value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      });
    });
  });
}

function getSelectionForRecommend() {
  // 讀 P2 存的中文
  const data = safeJsonParse(localStorage.getItem(STORAGE_KEY), {});
  const sceneZh = data.scene || "";
  const tempZh = data.temp || "";
  const styleZh = data.style || "";

  // 轉成資料庫 key（用來比對 wardrobe tag）
  return {
    display: { sceneZh, tempZh, styleZh },
    scene: MAP_SCENE[sceneZh] || "",
    temp: MAP_TEMP[tempZh] || "",
    style: MAP_STYLE[styleZh] || "",
  };
}

function initP2() {
  initP2ChipSelectUI();

  const goBtn = $("#goResult");
  if (!goBtn) return;

  goBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const scene = getActiveValue("scene");
    const temp = getActiveValue("temp");
    const style = getActiveValue("style");

    if (!scene || !temp || !style) {
      alert("請完成：情境 / 天氣 / 風格 三項選擇");
      return;
    }

    // ✅ 通過後再寫入（覆蓋舊資料），給 P3 用
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ scene, temp, style })
    );

    window.location.href = "p3.html";
  });
}


/* ---------------------------
   推薦邏輯（暫時版，可換同學版本）
--------------------------- */
function scoreItem(item, selection) {
  let score = 0;

  if (selection.scene && item.occasionTags.includes(selection.scene)) score += 3;
  if (selection.temp && item.weatherTags.includes(selection.temp)) score += 2;
  if (selection.style && item.styleTags.includes(selection.style)) score += 2;

  return score;
}

function pickBest(items, selection) {
  if (!items.length) return null;

  const ranked = items
    .map((it) => ({ it, s: scoreItem(it, selection) }))
    .sort((a, b) => b.s - a.s);

  const bestScore = ranked[0].s;
  const bestPool = ranked.filter((x) => x.s === bestScore).map((x) => x.it);
  return bestPool[Math.floor(Math.random() * bestPool.length)];
}

function recommend(selection, wardrobe) {
  const tops = wardrobe.filter((x) => x.category === "top");
  const bottoms = wardrobe.filter((x) => x.category === "bottom");
  const outers = wardrobe.filter((x) => x.category === "outer");
  const shoes = wardrobe.filter((x) => x.category === "shoes");

  const top = pickBest(tops, selection);
  const bottom = pickBest(bottoms, selection);

  // 外套：偏冷/舒適才出；偏熱不出
  const outer =
    selection.temp === "cold_weather" || selection.temp === "mild_weather"
      ? pickBest(outers, selection)
      : null;

  const shoe = pickBest(shoes, selection);

  const chips = [
    selection.display.sceneZh || "",
    selection.display.tempZh || "",
    selection.display.styleZh || "",
  ].filter(Boolean);

  const reasonText =
    `依照你選的條件（${chips.join("、")}），從衣櫃中挑出相符標籤的單品組合，` +
    `讓整體在場合、天氣與風格上更一致。`;

  return {
    imageSrc: "images/result_01.png", // 之後可換同學輸出
    outfit: { top, bottom, outer, shoes: shoe },
    chips,
    reasonText,
  };
}

/* ---------------------------
   P3：灌進你的 p3.html
   你的 P3 HTML：
   - 主圖：#resultImage
   - 左卡：#outfitItems .item-line .v（四行）
   - 右卡：#conditionChips
   - 理由：#reasonText
   - 按鈕：#btnReroll / #btnHome
--------------------------- */
function renderP3(result) {
  setImg($("#resultImage"), result.imageSrc, "今日推薦穿搭");

  const vEls = document.querySelectorAll("#outfitItems .item-line .v");

  // 👉 關鍵判斷：有沒有出外套
  const outerIsNone = !result.outfit.outer;

  const mapping = [
    result.outfit.top?.name || "（未找到上衣）",
    result.outfit.bottom?.name || "（未找到下身）",
    outerIsNone
      ? "（不需要外套）"
      : (result.outfit.outer?.name || "（未找到外套）"),
    result.outfit.shoes?.name || "（未找到鞋子）",
  ];

  vEls.forEach((el, i) => {
    // 每次重畫都先清掉狀態（避免重新推薦殘留）
    el.classList.remove("no-coat");

    // 只有第 3 行（外套）＋「不出外套」才加 ✕
    if (i === 2 && outerIsNone) {
      el.classList.add("no-coat");
    }

    setText(el, mapping[i] || "");
  });

  const chipsWrap = $("#conditionChips");
  if (chipsWrap) {
    chipsWrap.innerHTML = "";
    result.chips.slice(0, 3).forEach((txt) => {
      const span = document.createElement("span");
      span.className = "chip chip-solid";
      span.textContent = txt;
      chipsWrap.appendChild(span);
    });
  }

  setText($("#reasonText"), result.reasonText);
}


async function loadWardrobe() {
  const res = await fetch(WARDROBE_URL);
  if (!res.ok) throw new Error(`Failed to load ${WARDROBE_URL}`);
  const json = await res.json();
  return withUid(json);
}

async function initP3() {
  // ✅ 先綁按鈕：不管有沒有選到條件，都要能回 P2
  const btnPickAgain = $("#btnPickAgain");      // 左：重選條件
  const btnReRecommend = $("#btnReRecommend"); // 右：重新推薦

  if (btnPickAgain) {
    btnPickAgain.addEventListener("click", () => {
      window.location.href = "p2.html";
    });
  }

  const selection = getSelectionForRecommend();

  // ⚠️ 沒選過 / 資料不完整：保留展示內容，但至少「重選條件」可用
  if (!selection.display.sceneZh || !selection.display.tempZh || !selection.display.styleZh) {
    // 右邊「重新推薦」在這種情況沒意義，就先不綁/或可提示
    if (btnReRecommend) {
      btnReRecommend.addEventListener("click", () => {
        alert("請先回到上一頁完成：情境 / 天氣 / 風格 三項選擇");
      });
    }
    return;
  }

  let wardrobe;
  try {
    wardrobe = await loadWardrobe();
  } catch (err) {
    console.error(err);
    // wardrobe 讀不到時，仍允許回 P2
    if (btnReRecommend) {
      btnReRecommend.addEventListener("click", () => {
        alert("衣櫃資料讀取失敗，請稍後再試或回上一頁重選。");
      });
    }
    return;
  }

  // 初次渲染
  const result = recommend(selection, wardrobe);
  renderP3(result);

  // ✅ 右：留在 P3，直接重新跑推薦邏輯
  if (btnReRecommend) {
    btnReRecommend.addEventListener("click", () => {
      const next = recommend(selection, wardrobe);
      renderP3(next);
    });
  }
}


/* ---------------------------
   Auto run（依頁面判斷）
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const isP3 = document.body.querySelector(".container.p3");
  if (isP3) initP3();
  else initP2();
});
