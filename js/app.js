
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const productSection = document.getElementById("products");
  const productContainer =
    productSection?.querySelector(".empty-products") || productSection;

  const productModal = document.getElementById("productModal");
  const modalProductContent = document.getElementById("modalProductContent");
  const beforeBuyModal = document.getElementById("beforeBuyModal");
  const beforeBuyProducts = document.getElementById("beforeBuyProducts");
  const continueAffiliateLink = document.getElementById("continueAffiliateLink");

  let allProducts = [];
  let activeModalProduct = null;

  // HTML ESCAPE
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  // SITE SETTINGS
  async function loadSiteSettings() {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error("Settings could not load");
      }

      const settings = data.settings || {};
      const siteName = settings.site_name || "The Lad Couple";

      document.title = settings.seo_title || siteName;

      const metaDescription = document.querySelector(
        'meta[name="description"]'
      );

      if (metaDescription && settings.seo_description) {
        metaDescription.content = settings.seo_description;
      }

      function updateLogo(id) {
        const element = document.getElementById(id);
        if (!element) return;

        element.replaceChildren();

        const img = document.createElement("img");
        img.src = "/images/the-lad-couple-logo.png";
        img.alt = "The Lad Couple Logo";

        const brandText = document.createElement("span");
        brandText.className = "brand-name";

        const brandTitle = document.createElement("strong");
        brandTitle.textContent = "The Lad Couple";

        const brandSubtitle = document.createElement("small");
        brandSubtitle.textContent = "STORE";

        brandText.append(brandTitle, brandSubtitle);
        element.append(img, brandText);
      }

      updateLogo("siteLogoHeader");
      updateLogo("siteLogoFooter");

      const contact = document.getElementById("siteContactInfo");

      if (contact) {
        contact.replaceChildren();

        if (settings.contact_email) {
          const email = document.createElement("a");
          email.href = "mailto:" + settings.contact_email;
          email.textContent = settings.contact_email;
          contact.appendChild(email);
        }

        if (settings.contact_phone) {
          const phone = document.createElement("a");
          phone.href = "tel:" + settings.contact_phone;
          phone.textContent = settings.contact_phone;
          contact.appendChild(phone);
        }
      }

      function updateSocialLinks(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.replaceChildren();

        const links = [
          {
            name: "Follow Us",
            icon: "📸",
            url: settings.instagram_url,
            className: "instagram"
          },
          {
            name: "Subscribe",
            icon: "▶",
            url: settings.youtube_url,
            className: "youtube"
          },
          {
            name: "Facebook",
            icon: "f",
            url: settings.facebook_url,
            className: "facebook"
          }
        ];

        links.forEach(item => {
          if (!item.url) return;

          const link = document.createElement("a");
          link.href = item.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.className = "social-link " + item.className;
          link.textContent = item.icon + " " + item.name;
          link.setAttribute("aria-label", item.name);

          container.appendChild(link);
        });
      }

      updateSocialLinks("siteHeaderSocialLinks");
      updateSocialLinks("siteSocialLinks");

    } catch (error) {
      console.error("SITE_SETTINGS_ERROR:", error);
    }
  }

  // LOAD CATEGORIES
  async function loadCategories() {
    const menGrid = document.getElementById("menCategoryGrid");
    const womenGrid = document.getElementById("womenCategoryGrid");
    const otherGrid = document.getElementById("otherCategoryGrid");

    // MEN AND WOMEN ICONS + OTHER CATEGORY ICONS
    const icons = {
      electronics: "💻",
      "mobiles-accessories": "📱",
      fashion: "🧥",
      "home-kitchen": "🏠",
      "beauty-personal-care": "🧴",
      "health-fitness": "💪",
      "sports-outdoors": "⚽",
      "grocery-daily-needs": "🛒",
      "shoes-footwear": "👟",
      "bags-luggage": "👜",
      "toys-baby-products": "🧸",
      "books-stationery": "📚"
    };

    try {
      const response = await fetch("/api/categories");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error("Categories could not load");
      }

      const categories = data.categories || [];

      function renderCategoryCards(list, gender, container) {
        if (!container) return;

        if (!list.length) {
          container.innerHTML = "<p>No categories available.</p>";
          return;
        }

        container.innerHTML = list.map(category => {

          // OTHER CATEGORY ICONS ARE DIFFERENT
          // MEN AND WOMEN ICONS REMAIN AS BEFORE
          let icon;

          if (gender === "other") {
            icon = icons[category.slug] || "🛍️";
          } else if (category.slug === "fashion") {
            icon = gender === "men" ? "👕" : "👗";
          } else if (category.slug === "beauty-personal-care") {
            icon = gender === "men" ? "🧴" : "💄";
          } else {
            icon = icons[category.slug] || "🛍️";
          }

          const image = String(category.image_url || "").trim();

          return `
            <a class="category-card ${image ? "has-image" : ""}"
               href="#products"
               data-category-id="${escapeHTML(category.id)}"
               data-gender="${gender}">

              <span class="category-icon">${icon}</span>

              ${
                image
                  ? `<img class="category-image"
                          src="${escapeHTML(image)}"
                          alt="${escapeHTML(category.name)}"
                          onerror="this.remove(); this.parentElement.classList.remove('has-image');">`
                  : ""
              }

              <h3>${escapeHTML(category.name)}</h3>
            </a>
          `;
        }).join("");
      }

      const menCategories = categories.filter(category =>
        Number(category.show_in_men) === 1
      );

      const womenCategories = categories.filter(category =>
        Number(category.show_in_women) === 1
      );

      const otherCategories = categories.filter(category =>
        Number(category.show_in_others) === 1
      );

      renderCategoryCards(menCategories, "men", menGrid);
      renderCategoryCards(womenCategories, "women", womenGrid);
      renderCategoryCards(otherCategories, "other", otherGrid);

    } catch (error) {
      console.error("CATEGORIES_ERROR:", error);

      [menGrid, womenGrid, otherGrid].forEach(grid => {
        if (grid) {
          grid.innerHTML = "<p>Unable to load categories.</p>";
        }
      });
    }
  }

  // LOAD PRODUCTS
  async function loadProducts() {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error("Products could not load");
      }

      allProducts = data.products || [];

      renderProducts(
        allProducts.filter(product =>
          Number(product.is_featured) === 1
        )
      );

    } catch (error) {
      console.error("PRODUCTS_ERROR:", error);

      if (productContainer) {
        productContainer.innerHTML = `
          <h3>Unable to load products</h3>
          <p>Please try again later.</p>
        `;
      }
    }
  }

  // PRODUCT PLATFORMS
  function getProductPlatforms(product) {
    return [
      {
        name: "Amazon",
        icon: "🛒",
        url: String(product.amazon_url || "").trim(),
        className: "amazon"
      },
      {
        name: "Flipkart",
        icon: "🛍️",
        url: String(product.flipkart_url || "").trim(),
        className: "flipkart"
      },
      {
        name: "Meesho",
        icon: "💗",
        url: String(product.meesho_url || "").trim(),
        className: "meesho"
      }
    ].filter(platform => /^https?:\/\//i.test(platform.url));
  }

  function getProductPrice(product) {
    return product.price != null
      ? "₹" + Number(product.price).toLocaleString("en-IN")
      : "Price unavailable";
  }

  // RENDER PRODUCTS
  function renderProducts(products, targetContainer = productContainer) {
    if (!targetContainer) return;

    if (!products.length) {
      targetContainer.className = "empty-products";
      targetContainer.innerHTML = `
        <span>🛒</span>
        <h3>Products Coming Soon</h3>
        <p>We are preparing amazing products for you. Stay tuned!</p>
      `;
      return;
    }

    targetContainer.className = "product-grid";

    targetContainer.innerHTML = products.map(product => {
      const platforms = getProductPlatforms(product);

      const buyButtons = platforms.map(platform => `
        <a class="platform-btn ${platform.className}"
           href="${escapeHTML(platform.url)}"
           target="_blank"
           rel="noopener noreferrer">
          <span>${platform.icon}</span>
          ${platform.name} - Buy Now
        </a>
      `).join("");

      return `
        <article class="product-card"
                 data-product-id="${escapeHTML(product.id)}"
                 data-product-title="${escapeHTML(product.title)}">

          <img src="${escapeHTML(product.image_url || "")}"
               alt="${escapeHTML(product.title)}"
               onerror="this.style.display='none'">

          <div class="product-info">

            <p class="product-category">
              ${escapeHTML(product.category_name || "Shopping")}
            </p>

            <h3>${escapeHTML(product.title)}</h3>

            <p class="product-price">
              ${escapeHTML(getProductPrice(product))}
            </p>

            <div style="
              margin:12px 0;
              padding:9px 12px;
              background:#fff5f8;
              border:1px dashed #e7a4bb;
              border-radius:8px;
              display:flex;
              justify-content:space-between;
              align-items:center;
            ">
              <span style="font-size:13px;color:#666;">
                Product Code
              </span>

              <div style="display:flex;align-items:center;gap:8px;">
                <strong style="
                  color:#b83268;
                  font-size:14px;
                  letter-spacing:1px;
                ">
                  ${escapeHTML(product.product_code || "Not assigned")}
                </strong>

                ${
                  product.product_code
                    ? `<button type="button"
                         class="copy-code-btn"
                         data-code="${escapeHTML(product.product_code)}"
                         style="padding:5px 9px;border:1px solid #b83268;border-radius:5px;background:white;color:#b83268;cursor:pointer;font-size:12px;">
                         Copy Code
                       </button>`
                    : ""
                }
              </div>
            </div>

            <div class="platform-links">
              ${buyButtons}
            </div>

            <p class="affiliate-note">
              Affiliate link: We may earn a commission if you make a purchase.
            </p>

          </div>
        </article>
      `;
    }).join("");
  }

  // RELATED PRODUCTS
  function getRelatedProducts(currentProduct) {
    const otherProducts = allProducts.filter(product =>
      String(product.id) !== String(currentProduct.id)
    );

    const sameCategory = otherProducts.filter(product =>
      Number(product.category_id) === Number(currentProduct.category_id)
    );

    const otherCategories = otherProducts.filter(product =>
      Number(product.category_id) !== Number(currentProduct.category_id)
    );

    return [...sameCategory, ...otherCategories].slice(0, 4);
  }

  function renderSuggestionCards(products, attribute) {
    if (!products.length) {
      return "<p>No other products available right now.</p>";
    }

    return products.map(item => `
      <article class="related-product-card"
               ${attribute}="${escapeHTML(item.id)}">

        <img src="${escapeHTML(item.image_url || "")}"
             alt="${escapeHTML(item.title)}"
             onerror="this.style.display='none'">

        <h4>${escapeHTML(item.title)}</h4>

        <p>${escapeHTML(getProductPrice(item))}</p>

        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          <strong style="color:#b83268;letter-spacing:1px;">
            ${escapeHTML(item.product_code || "Not assigned")}
          </strong>

          ${
            item.product_code
              ? `<button type="button"
                   class="copy-code-btn"
                   data-code="${escapeHTML(item.product_code)}"
                   style="padding:6px 10px;border:1px solid #b83268;border-radius:5px;background:white;color:#b83268;cursor:pointer;font-size:12px;">
                   Copy Code
                 </button>`
              : ""
          }
        </div>

      </article>
    `).join("");
  }

  // PRODUCT DETAILS POPUP
  function showProductModal(product) {
    if (!product || !productModal || !modalProductContent) return;

    activeModalProduct = product;

    const platforms = getProductPlatforms(product);

    const buyButtons = platforms.map(platform => `
      <a class="platform-btn ${platform.className}"
         href="${escapeHTML(platform.url)}"
         target="_blank"
         rel="noopener noreferrer">
        <span>${platform.icon}</span>
        ${platform.name} - Buy Now
      </a>
    `).join("");

    const relatedProducts = getRelatedProducts(product);

    const relatedHTML = renderSuggestionCards(
      relatedProducts,
      "data-related-product-id"
    );

    modalProductContent.innerHTML = `
      <div class="modal-product-details">

        <div>
          <img class="modal-product-image"
               src="${escapeHTML(product.image_url || "")}"
               alt="${escapeHTML(product.title)}"
               onerror="this.style.display='none'">
        </div>

        <div class="modal-product-info">

          <p class="product-category">
            ${escapeHTML(product.category_name || "Shopping")}
          </p>

          <h2 id="modalProductTitle">
            ${escapeHTML(product.title)}
          </h2>

          <p class="product-price">
            ${escapeHTML(getProductPrice(product))}
          </p>

          <div style="
            margin:12px 0;
            padding:10px 12px;
            background:#fff5f8;
            border:1px dashed #e7a4bb;
            border-radius:8px;
            display:flex;
            justify-content:space-between;
            align-items:center;
          ">
            <span style="font-size:13px;color:#666;">
              Product Code
            </span>

            <div style="display:flex;align-items:center;gap:8px;">
              <strong style="color:#b83268;letter-spacing:1px;">
                ${escapeHTML(product.product_code || "Not assigned")}
              </strong>

              ${
                product.product_code
                  ? `<button type="button"
                       class="copy-code-btn"
                       data-code="${escapeHTML(product.product_code)}"
                       style="padding:6px 10px;border:1px solid #b83268;border-radius:5px;background:white;color:#b83268;cursor:pointer;font-size:12px;">
                       Copy Code
                     </button>`
                  : ""
              }
            </div>
          </div>

          ${
            product.description
              ? `<p class="modal-product-description">
                   ${escapeHTML(product.description)}
                 </p>`
              : ""
          }

          <div class="modal-buy-buttons">
            ${buyButtons || "<p>Buy link currently unavailable.</p>"}
          </div>

          <p class="affiliate-note">
            Affiliate link: We may earn a commission if you make a purchase.
          </p>

        </div>
      </div>

      <section class="related-products-section">
        <h3>You May Also Like</h3>
        <div class="related-products-grid">
          ${relatedHTML}
        </div>
      </section>
    `;

    productModal.classList.add("is-open");
    productModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    productModal.querySelector(".product-modal-close")?.focus();
  }

  function closeProductModal() {
    if (!productModal) return;

    productModal.classList.remove("is-open");
    productModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  // BEFORE BUY POPUP
  function showBeforeBuyPopup(product, platform) {
    if (!beforeBuyModal || !beforeBuyProducts || !continueAffiliateLink) return;

    continueAffiliateLink.href = platform.url;
    continueAffiliateLink.textContent = "Continue to " + platform.name;

    const relatedProducts = getRelatedProducts(product);

    beforeBuyProducts.innerHTML = renderSuggestionCards(
      relatedProducts,
      "data-before-buy-product-id"
    );

    beforeBuyModal.classList.add("is-open");
    beforeBuyModal.setAttribute("aria-hidden", "false");
  }

  function closeBeforeBuyPopup() {
    if (!beforeBuyModal) return;

    beforeBuyModal.classList.remove("is-open");
    beforeBuyModal.setAttribute("aria-hidden", "true");
  }

  // CATEGORY FILTER
  function filterByCategory(categoryId, gender) {
    const filtered = allProducts.filter(product => {
      const sameCategory =
        Number(product.category_id) === Number(categoryId);

      if (!sameCategory) return false;

      const productGender = String(product.gender || "")
        .trim()
        .toLowerCase();

      if (gender === "men") {
        return productGender === "men";
      }

      if (gender === "women") {
        return productGender === "women";
      }

      if (gender === "other") {
        return true;
      }

      return false;
    });

    renderProducts(filtered);
    productSection?.scrollIntoView({ behavior: "smooth" });
  }

  // CATEGORY CARD CLICK
  const categoriesSection = document.getElementById("categories");

  if (categoriesSection) {
    categoriesSection.addEventListener("click", event => {
      const categoryCard = event.target.closest(".category-card");
      if (!categoryCard) return;

      event.preventDefault();

      filterByCategory(
        categoryCard.dataset.categoryId,
        categoryCard.dataset.gender
      );
    });
  }

  // PRODUCT CARD CLICK
  document.addEventListener("click", event => {
    if (event.target.closest(".copy-code-btn")) return;

    const card = event.target.closest(".product-card");
    if (!card) return;

    const product = allProducts.find(item =>
      String(item.id) === String(card.dataset.productId)
    );

    if (!product) return;

    const buyButton = event.target.closest("a.platform-btn");

    if (buyButton) {
      event.preventDefault();

      const platform = getProductPlatforms(product).find(item =>
        item.className ===
        (buyButton.classList.contains("amazon") ? "amazon" :
         buyButton.classList.contains("flipkart") ? "flipkart" :
         buyButton.classList.contains("meesho") ? "meesho" : "")
      );

      if (platform) showBeforeBuyPopup(product, platform);
      return;
    }

    showProductModal(product);
  });

  // MODAL BUY BUTTON
  productModal?.addEventListener("click", event => {
    const buyButton = event.target.closest(".modal-buy-buttons .platform-btn");
    if (!buyButton || !activeModalProduct) return;

    event.preventDefault();

    const platform = getProductPlatforms(activeModalProduct).find(item =>
      item.className ===
      (buyButton.classList.contains("amazon") ? "amazon" :
       buyButton.classList.contains("flipkart") ? "flipkart" :
       buyButton.classList.contains("meesho") ? "meesho" : "")
    );

    if (platform) {
      showBeforeBuyPopup(activeModalProduct, platform);
    }
  });

  // RELATED PRODUCT CLICK
  modalProductContent?.addEventListener("click", event => {
    if (event.target.closest(".copy-code-btn")) return;

    const card = event.target.closest("[data-related-product-id]");
    if (!card) return;

    const product = allProducts.find(item =>
      String(item.id) === String(card.dataset.relatedProductId)
    );

    if (product) showProductModal(product);
  });

  // BEFORE BUY SUGGESTION CLICK
  beforeBuyProducts?.addEventListener("click", event => {
    if (event.target.closest(".copy-code-btn")) return;

    const card = event.target.closest("[data-before-buy-product-id]");
    if (!card) return;

    const product = allProducts.find(item =>
      String(item.id) === String(card.dataset.beforeBuyProductId)
    );

    if (product) {
      closeBeforeBuyPopup();
      showProductModal(product);
    }
  });

  // CLOSE POPUPS
  productModal?.addEventListener("click", event => {
    if (event.target.closest("[data-close-modal]")) {
      closeProductModal();
    }
  });

  beforeBuyModal?.addEventListener("click", event => {
    if (event.target.closest("[data-close-before-buy]")) {
      closeBeforeBuyPopup();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeBeforeBuyPopup();
      closeProductModal();
    }
  });

  // COPY PRODUCT CODE
  document.addEventListener("click", async event => {
    const copyButton = event.target.closest(".copy-code-btn");
    if (!copyButton) return;

    event.preventDefault();
    event.stopPropagation();

    const code = copyButton.dataset.code;
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      copyButton.textContent = "Copied!";

      setTimeout(() => {
        copyButton.textContent = "Copy Code";
      }, 1500);

    } catch (error) {
      alert("Code copy nahi zala. Please manually copy kara: " + code);
    }
  }, true);

  // SEARCH
  function searchProducts() {
    if (!searchInput) return;

    const term = searchInput.value.trim().toLowerCase();
    searchInput.value = "";

    if (!term) {
      renderProducts(
        allProducts.filter(product =>
          Number(product.is_featured) === 1
        )
      );
      return;
    }

    const filtered = allProducts.filter(product =>
      String(product.title || "").toLowerCase().includes(term) ||
      String(product.category_name || "").toLowerCase().includes(term) ||
      String(product.product_code || "").trim().toLowerCase().includes(term)
    );

    renderProducts(filtered);
    productSection?.scrollIntoView({ behavior: "smooth" });
  }

  if (searchButton) {
    searchButton.addEventListener("click", searchProducts);
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        searchProducts();
      }
    });
  }

  // INITIAL LOAD
  loadSiteSettings();
  loadCategories();
  loadProducts();
});
