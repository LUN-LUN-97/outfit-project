/* app.js
 * P2：選條件 → localStorage
 * P3：讀資料 → 推薦 → 顯示結果
 */

const STORAGE_KEY = "outfit_input";
const WARDROBE_URL = "wardrobe.json";

/* =========================
   Tag Mapping
========================= */
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

/* =========================
   Utils
========================= */
function $(sel) {
  return document.querySelector(sel);
}

function setText(el, text) {
  if (el) el.textContent = text ?? "";
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

function parseTags(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function withUid(items) {
  return items.map((it, idx) => ({
    uid: `${it.ID ?? "noid"}_${idx}`,
    ...it,
    styleTags: parseTags(it.style_tags),
    weatherTags: parseTags(it.weather_tags),
    occasionTags: parseTags(it.occasion_tag),
  }));
}

/* =========================
   P2
========================= */
function initP2() {
  document.querySelectorAll(".card[data-group]").forEach((card) => {
    const group = card.dataset.group;
    const chips = card.querySelectorAll(".chip[data-value]");

    chips.forEach((btn) => {
      btn.addEventListener("click", () => {
        chips.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const data = safeJsonParse(localStorage.getItem(STORAGE_KEY), {});
        data[group] = btn.dataset.value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      });
    });
  });

  const goBtn = $("#goResult");
  if (!goBtn) return;

  goBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const data = safeJsonParse(localStorage.getItem(STORAGE_KEY), {});
    if (!data.scene || !data.temp || !data.style) {
      alert("請完成：情境 / 天氣 / 風格");
      return;
    }

    window.location.href = "p3.html";
  });
}

function getSelectionForRecommend() {
  const data = safeJsonParse(localStorage.getItem(STORAGE_KEY), {});
  return {
    display: {
      sceneZh: data.scene || "",
      tempZh: data.temp || "",
      styleZh: data.style || "",
    },
    scene: MAP_SCENE[data.scene] || "",
    temp: MAP_TEMP[data.temp] || "",
    style: MAP_STYLE[data.style] || "",
  };
}

/* =========================
   Recommend
========================= */
function scoreItem(item, sel) {
  let s = 0;
  if (sel.scene && item.occasionTags.includes(sel.scene)) s += 3;
  if (sel.temp && item.weatherTags.includes(sel.temp)) s += 2;
  if (sel.style && item.styleTags.includes(sel.style)) s += 2;
  return s;
}

function pickBest(items, sel) {
  if (!items.length) return null;
  const ranked = items
    .map((it) => ({ it, s: scoreItem(it, sel) }))
    .sort((a, b) => b.s - a.s);
  const best = ranked.filter((x) => x.s === ranked[0].s).map((x) => x.it);
  return best[Math.floor(Math.random() * best.length)];
}

function recommend(selection, wardrobe) {
  const tops = wardrobe.filter((x) => x.category === "top");
  const bottoms = wardrobe.filter((x) => x.category === "bottom");
  const outers = wardrobe.filter((x) => x.category === "outer");
  const shoes = wardrobe.filter((x) => x.category === "shoes");

  const top = pickBest(tops, selection);
  const bottom = pickBest(bottoms, selection);

  // ✅ 外套規則：偏冷 / 舒適 → 出；偏熱 → 不出
  const outer =
    selection.temp === "cold_weather" || selection.temp === "mild_weather"
      ? pickBest(outers, selection)
      : null;

  const shoe = pickBest(shoes, selection);

  return {
    imageSrc: "images/result_01.png",
    outfit: { top, bottom, outer, shoes: shoe },
    chips: [
      selection.display.sceneZh,
      selection.display.tempZh,
      selection.display.styleZh,
    ].filter(Boolean),
    reasonText:
      `依照你選的條件（${[
        selection.display.sceneZh,
        selection.display.tempZh,
        selection.display.styleZh,
      ]
        .filter(Boolean)
        .join("、")}），從衣櫃中挑出相符標籤的單品組合，` +
      `讓整體在場合、天氣與風格上更一致。`,
  };
}

/* =========================
   P3 Render（重點在這）
========================= */
function renderP3(result) {
  setImg($("#resultImage"), result.imageSrc, "今日推薦穿搭");

  const vEls = document.querySelectorAll("#outfitItems .item-line .v");

  const outerIsNone = !result.outfit.outer;

  const texts = [
    result.outfit.top?.name || "（未找到上衣）",
    result.outfit.bottom?.name || "（未找到下身）",
    outerIsNone ? "✕" : result.outfit.outer?.name || "（未找到外套）",
    result.outfit.shoes?.name || "（未找到鞋子）",
  ];

  vEls.forEach((el, i) => {
    setText(el, texts[i]);
  });

  const chipsWrap = $("#conditionChips");
  if (chipsWrap) {
    chipsWrap.innerHTML = "";
    result.chips.forEach((txt) => {
      const span = document.createElement("span");
      span.className = "chip chip-solid";
      span.textContent = txt;
      chipsWrap.appendChild(span);
    });
  }

  setText($("#reasonText"), result.reasonText);
}

/* =========================
   Init P3
========================= */
async function initP3() {
  const btnPickAgain = $("#btnPickAgain");
  const btnReRecommend = $("#btnReRecommend");

  if (btnPickAgain) {
    btnPickAgain.addEventListener("click", () => {
      window.location.href = "p2.html";
    });
  }

  const selection = getSelectionForRecommend();
  if (!selection.scene || !selection.temp || !selection.style) return;

  const wardrobe = withUid(await (await fetch(WARDROBE_URL)).json());

  let result = recommend(selection, wardrobe);
  renderP3(result);

  if (btnReRecommend) {
    btnReRecommend.addEventListener("click", () => {
      result = recommend(selection, wardrobe);
      renderP3(result);
    });
  }
}

/* =========================
   Auto Run
========================= */
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".container.p3")) initP3();
  else initP2();
});
