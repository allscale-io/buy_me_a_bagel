(() => {
  let selectedAmount = null;

  function init() {
    if (CONFIG.theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    document.getElementById("display-name").textContent = CONFIG.name;
    document.getElementById("bio").textContent = CONFIG.bio;
    document.getElementById("stablecoin-label").textContent = "USDT";
    document.getElementById("chain-badge").textContent =
      CONFIG.currency + " → USDT";

    if (CONFIG.avatar) {
      document.getElementById("avatar").innerHTML =
        `<img src="${CONFIG.avatar}" alt="${CONFIG.name}">`;
    }

    document.title = `Buy ${CONFIG.name} a Bagel`;

    renderPresets();
    renderSocials();
    bindEvents();
  }

  function renderPresets() {
    const container = document.getElementById("presets");
    CONFIG.presets.forEach((amount) => {
      const btn = document.createElement("button");
      btn.className = "preset-btn";
      btn.textContent = `${CONFIG.currencySymbol}${amount}`;
      btn.dataset.amount = amount;
      btn.addEventListener("click", () => selectPreset(btn, amount));
      container.appendChild(btn);
    });

    if (!CONFIG.allowCustomAmount) {
      document.getElementById("custom-amount-section").style.display = "none";
    }
  }

  function renderSocials() {
    const container = document.getElementById("socials");
    const links = [];

    if (CONFIG.socials.twitter) {
      links.push(
        `<a href="https://twitter.com/${CONFIG.socials.twitter}" target="_blank" rel="noopener">Twitter</a>`
      );
    }
    if (CONFIG.socials.github) {
      links.push(
        `<a href="https://github.com/${CONFIG.socials.github}" target="_blank" rel="noopener">GitHub</a>`
      );
    }
    if (CONFIG.socials.website) {
      links.push(
        `<a href="${CONFIG.socials.website}" target="_blank" rel="noopener">Website</a>`
      );
    }

    container.innerHTML = links.join("");
  }

  function selectPreset(btn, amount) {
    document
      .querySelectorAll(".preset-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("custom-amount").value = "";
    selectedAmount = amount;
    updateButton();
  }

  function updateButton() {
    const btn = document.getElementById("checkout-btn");
    const text = document.getElementById("btn-text");

    if (selectedAmount) {
      btn.disabled = false;
      text.textContent = `Buy a ${CONFIG.currencySymbol}${selectedAmount} Bagel`;
    } else {
      btn.disabled = true;
      text.textContent = "Buy a Bagel";
    }
  }

  function bindEvents() {
    const customInput = document.getElementById("custom-amount");
    customInput.addEventListener("input", () => {
      const val = parseFloat(customInput.value);
      if (val > 0) {
        document
          .querySelectorAll(".preset-btn")
          .forEach((b) => b.classList.remove("active"));
        selectedAmount = val;
      } else {
        selectedAmount = null;
      }
      updateButton();
    });

    document.getElementById("checkout-btn").addEventListener("click", checkout);
  }

  async function checkout() {
    if (!selectedAmount) return;

    const btn = document.getElementById("checkout-btn");
    const text = document.getElementById("btn-text");
    const message = document.getElementById("message").value.trim();

    btn.disabled = true;
    text.textContent = "Loading...";

    try {
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedAmount,
          message: message || undefined,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (data.checkout_url) {
        window.open(data.checkout_url, "_blank", "noopener");
        updateButton();
      }
    } catch (err) {
      console.error("Checkout error:", err);
      text.textContent = "Something went wrong";
      setTimeout(() => {
        btn.disabled = false;
        updateButton();
      }, 2000);
    }
  }

  init();
})();
