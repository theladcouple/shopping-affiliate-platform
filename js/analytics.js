
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
