/**
 * Buy Me a Bagel — front-end controller.
 *
 * Wires up preset buttons, custom amount input, message box and the checkout
 * flow. Polls /api/status until the payment is confirmed or fails.
 *
 * Important: every value that flows into the DOM is inserted with safe APIs
 * (textContent / DOM construction) instead of innerHTML, so a malicious
 * avatar URL or social handle can never inject script into this page.
 */
(() => {
  let selectedAmount = null;
  let pollTimer = null;

  // Allscale checkout intent statuses. Keep these in sync with the Allscale
  // API reference — they are how /api/status reports progress.
  const STATUS = {
    TIMEOUT: -5,
    CANCELED: -4,
    UNDERPAID: -3,
    REJECTED: -2,
    FAILED: -1,
    CREATED: 1,
    PAYING: 2,
    TEMP_WALLET_RECEIVED: 3,
    PENDING_MANUAL_OPERATION: 4,
    SEND_BACK: 5,
    ON_CHAIN: 10,
    CONFIRMED: 20,
  };

  // --- HTML-escape helper --------------------------------------------------
  // Used for the few places where we still build HTML strings (social links).
  // Anything CONFIG-driven must go through this so a value like
  // `" onerror="alert(1)` cannot break out of an attribute.
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(value) {
    return escapeHtml(value);
  }
  function escapeUrl(value) {
    // Only allow http(s) and mailto links. Everything else is treated as
    // unsafe and replaced with about:blank so the page cannot be redirected
    // to a javascript: URL by a tampered config.js.
    try {
      const parsed = new URL(value, window.location.href);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
        return parsed.toString();
      }
    } catch (_) {
      // Fall through and return the safe value below.
    }
    return 'about:blank';
  }

  function init() {
    if (CONFIG.theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    document.getElementById("display-name").textContent = CONFIG.name;
    document.getElementById("bio").textContent = CONFIG.bio;
    document.getElementById("stablecoin-label").textContent = "USDT";
    document.getElementById("chain-badge").textContent =
      CONFIG.currency + " → USDT";

    // Build the avatar <img> with DOM construction. textContent is used for
    // alt text, so even a hostile CONFIG.name cannot inject markup.
    if (CONFIG.avatar) {
      const avatar = document.getElementById("avatar");
      avatar.replaceChildren();
      const img = document.createElement("img");
      img.src = escapeUrl(CONFIG.avatar);
      img.alt = escapeAttr(CONFIG.name);
      avatar.appendChild(img);
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
    container.replaceChildren(); // Clear any previous render.

    const entries = [];
    if (CONFIG.socials.twitter) {
      entries.push({
        href: `https://twitter.com/${encodeURIComponent(CONFIG.socials.twitter)}`,
        label: "Twitter",
      });
    }
    if (CONFIG.socials.github) {
      entries.push({
        href: `https://github.com/${encodeURIComponent(CONFIG.socials.github)}`,
        label: "GitHub",
      });
    }
    if (CONFIG.socials.website) {
      entries.push({
        href: CONFIG.socials.website,
        label: "Website",
      });
    }

    for (const entry of entries) {
      const anchor = document.createElement("a");
      anchor.href = escapeUrl(entry.href);
      anchor.textContent = entry.label;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      container.appendChild(anchor);
    }
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

    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetToDefault);
    }
  }

  function showStatus(state, msg) {
    document.getElementById("checkout-form").style.display =
      state === "default" ? "block" : "none";
    document.getElementById("status-view").style.display =
      state === "default" ? "none" : "flex";

    if (state === "default") return;

    const icon = document.getElementById("status-icon");
    const text = document.getElementById("status-text");
    const sub = document.getElementById("status-sub");
    const resetBtn = document.getElementById("reset-btn");

    if (state === "polling") {
      icon.textContent = "🥯";
      icon.className = "status-icon pulse";
      text.textContent = msg || "Waiting for payment...";
      sub.textContent = "Complete the payment in the other tab";
      resetBtn.style.display = "none";
    } else if (state === "confirmed") {
      icon.textContent = "🎉";
      icon.className = "status-icon";
      text.textContent = "Thank you!";
      sub.textContent = msg || "Your bagel made my day!";
      resetBtn.style.display = "inline-block";
    } else if (state === "failed") {
      icon.textContent = "😕";
      icon.className = "status-icon";
      text.textContent = msg || "Payment didn't go through";
      sub.textContent = "Feel free to try again";
      resetBtn.style.display = "inline-block";
    }
  }

  function resetToDefault() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    selectedAmount = null;
    document.getElementById("message").value = "";
    document
      .querySelectorAll(".preset-btn")
      .forEach((b) => b.classList.remove("active"));
    document.getElementById("custom-amount").value = "";
    showStatus("default");
    updateButton();
  }

  function startPolling(intentId, amount) {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

    showStatus("polling");

    pollTimer = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollTimer);
        pollTimer = null;
        showStatus("failed", "Payment timed out");
        return;
      }

      try {
        const resp = await fetch(
          `/api/status?intent_id=${encodeURIComponent(intentId)}`
        );
        const data = await resp.json();

        if (!resp.ok) return;

        const status = data.status;

        if (status === STATUS.CONFIRMED) {
          clearInterval(pollTimer);
          pollTimer = null;
          showStatus(
            "confirmed",
            `You bought me a ${CONFIG.currencySymbol}${amount} bagel!`
          );
        } else if (status === STATUS.ON_CHAIN) {
          showStatus("polling", "Payment detected, confirming on-chain...");
        } else if (status === STATUS.PENDING_MANUAL_OPERATION) {
          showStatus("polling", "Payment under review...");
        } else if (status === STATUS.SEND_BACK) {
          showStatus("polling", "Refund in progress...");
        } else if (status < 0) {
          clearInterval(pollTimer);
          pollTimer = null;
          const reasons = {
            [STATUS.FAILED]: "Payment failed",
            [STATUS.REJECTED]: "Payment was rejected",
            [STATUS.UNDERPAID]: "Amount was less than required",
            [STATUS.CANCELED]: "Payment was canceled",
            [STATUS.TIMEOUT]: "Payment timed out",
          };
          showStatus("failed", reasons[status] || "Payment didn't go through");
        }
      } catch {
        // Silently retry on network errors
      }
    }, 5000);
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
        window.open(data.checkout_url, "_blank", "noopener,noreferrer");
        startPolling(data.intent_id, selectedAmount);
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
