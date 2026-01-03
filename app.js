// 之後在這裡做：按鈕選取效果、送到後端、接回結果

// 讓同一組（同一個 section）只能選一個
document.querySelectorAll(".card").forEach((card) => {
    const group = card.dataset.group;
    const chips = card.querySelectorAll(".chip");
  
    chips.forEach((btn) => {
      btn.addEventListener("click", () => {
        // 取消同組其他 active
        chips.forEach((b) => b.classList.remove("active"));
        // 設定目前 active
        btn.classList.add("active");
  
        // 先把選到的值存起來（給 P3 用）
        const value = btn.dataset.value;
        const data = JSON.parse(localStorage.getItem("outfit_input") || "{}");
        data[group] = value;
        localStorage.setItem("outfit_input", JSON.stringify(data));
      });
    });
  });
  
  // 按下「推薦穿搭」前，檢查是否三組都有選（不想檢查也可以刪掉這段）
  document.getElementById("goResult")?.addEventListener("click", () => {
    const data = JSON.parse(localStorage.getItem("outfit_input") || "{}");
    const ok = data.scene && data.temp && data.style;
  
    if (!ok) {
      alert("先幫我選好：情境、天氣、風格！");
    } else {
      // 讓 <a href="p3.html"> 正常跳頁
    }
  });
  