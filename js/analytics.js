
(function () {
  const API_URL = "/api/track";

  function getId(storage, key) {
    let id = storage.getItem(key);

    if (!id) {
      id = crypto.randomUUID();
      storage.setItem(key, id);
    }

    return id;
  }

  const visitorId = getId(localStorage, "tlc_visitor_id");
  const sessionId = getId(sessionStorage, "tlc_session_id");

  const params = new URLSearchParams(window.location.search);

  function getSource() {
    const utmSource = params.get("utm_source");

    if (utmSource) return utmSource.toLowerCase();

    const referrer = document.referrer;

    if (!referrer) return "direct";

    try {
      const host = new URL(referrer).hostname.toLowerCase();

      if (host.includes("instagram")) return "instagram";
      if (host.includes("facebook")) return "facebook";
      if (host.includes("youtube")) return "youtube";

      return host;
    } catch {
      return "other";
    }
  }

  function track(eventType, extra = {}) {
    const payload = {
      event_type: eventType,
      visitor_id: visitorId,
      session_id: sessionId,
      source: getSource(),
      medium: params.get("utm_medium") || null,
      campaign: params.get("utm_campaign") || null,
      page_path: window.location.pathname,
      ...extra
    };

    fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }

  // Website page visit
  track("page_view");

  // Product View Tracking
  const viewedProducts = new WeakSet();

  const productObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
        return;
      }

      const productCard = entry.target;

      if (viewedProducts.has(productCard)) return;

      viewedProducts.add(productCard);

      track("product_view", {
        product_id: Number(productCard.dataset.productId) || null,
        product_title: productCard.dataset.productTitle || null
      });

      productObserver.unobserve(productCard);
    });
  }, {
    threshold: 0.5
  });

  function observeProductCards() {
    document.querySelectorAll(".product-card").forEach(card => {
      if (!viewedProducts.has(card)) {
        productObserver.observe(card);
      }
    });
  }

  // Observe products loaded dynamically
  const productMutationObserver = new MutationObserver(() => {
    observeProductCards();
  });

  productMutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  observeProductCards();

  // Buy Now button click
  document.addEventListener("click", function (event) {
    const button = event.target.closest(".platform-btn");

    if (!button) return;

    let platform = "other";

    if (button.classList.contains("amazon")) platform = "Amazon";
    if (button.classList.contains("flipkart")) platform = "Flipkart";
    if (button.classList.contains("meesho")) platform = "Meesho";

    track("buy_click", {
      affiliate_platform: platform
    });
  });
})();
