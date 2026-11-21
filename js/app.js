
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const productSection = document.getElementById("products");
  const productContainer = productSection.querySelector(".empty-products");

  let allProducts = [];

  

  async function loadSiteSettings() {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error("Settings could not load");
      }

      const settings = data.settings;
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
  img.alt = "The Lad Couple";

  img.style.display = "block";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.maxHeight = "100%";
  img.style.maxWidth = "100%";
  img.style.objectFit = "contain";

  element.appendChild(img);
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
     async function loadCategories() {
  const categoryGrid = document.getElementById("categoryGrid");

  try {
    const response = await fetch("/api/categories");
    const data = await response.json();

    if (!data.success) {
      throw new Error("Categories could not load");
    }

    const icons = {
      electronics: "📱",
      "mobiles-accessories": "📱",
      fashion: "👗",
      "home-kitchen": "🏠",
            "beauty-personal-care": "💄",
      "health-fitness": "💪",
      "sports-outdoors": "⚽",
      "grocery-daily-needs": "🛒",
      "shoes-footwear": "👟",
      "bags-luggage": "👜",
      "toys-baby-products": "🧸",
      "books-stationery": "📚"
    };

    categoryGrid.innerHTML = (data.categories || []).map(category => `
      <a class="category-card" href="#products" data-category-id="${category.id}">
        <span>${icons[category.slug] || "🛍️"}</span>
        <h3>${escapeHTML(category.name)}</h3>
      </a>
    `).join("");

    if (!data.categories || data.categories.length === 0) {
      categoryGrid.innerHTML = "<p>No categories available.</p>";
    }

  } catch (error) {
    categoryGrid.innerHTML = "<p>Unable to load categories.</p>";
  }
}
  async function loadProducts() {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();

      if (!data.success) {
        throw new Error("Products could not load");
      }

      allProducts = data.products || [];
      renderProducts(allProducts);
    } catch (error) {
      productContainer.innerHTML = `
        <h3>Unable to load products</h3>
        <p>Please try again later.</p>
      `;
    }
  }
function filterByCategory(categoryId) {
  const filtered = allProducts.filter(product =>
    Number(product.category_id) === Number(categoryId)
  );

  renderProducts(filtered);

  productSection.scrollIntoView({ behavior: "smooth" });
}



function renderProducts(products) {

  if (!products.length) {
    productContainer.className = "empty-products";
    productContainer.innerHTML = `
      <span>🛒</span>
      <h3>Products Coming Soon</h3>
      <p>We are preparing amazing products for you. Stay tuned!</p>
    `;
    return;
  }

  productContainer.className = "product-grid";

  productContainer.innerHTML = products.map(product => {

    const platforms = [
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
    ];

    const buyButtons = platforms
      .filter(platform => platform.url)
      .map(platform => `
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
            ${product.price != null
              ? "₹" + Number(product.price).toLocaleString("en-IN")
              : "Price unavailable"}
          </p>

          <div style="
            margin: 12px 0;
            padding: 9px 12px;
            background: #fff5f8;
            border: 1px dashed #e7a4bb;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <span style="font-size: 13px; color: #666;">
              Product Code
            </span>

            <strong style="
              color: #b83268;
              font-size: 14px;
              letter-spacing: 1px;
            ">
              ${escapeHTML(product.product_code || "Not assigned")}
            </strong>
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

  // PRODUCT DETAILS POPUP

  const productModal = document.getElementById("productModal");
  const modalProductContent = document.getElementById("modalProductContent");
  let activeModalProduct = null;
  function getProductPrice(product) {
    return product.price != null
      ? "₹" + Number(product.price).toLocaleString("en-IN")
      : "Price unavailable";
  }

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
    ].filter(platform =>
      /^https?:\/\//i.test(platform.url)
    );
  }

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

    const relatedHTML = relatedProducts.length
      ? relatedProducts.map(item => `
          <article class="related-product-card"
                   data-related-product-id="${escapeHTML(item.id)}">

            <img src="${escapeHTML(item.image_url || "")}"
                 alt="${escapeHTML(item.title)}"
                 onerror="this.style.display='none'">

            <h4>${escapeHTML(item.title)}</h4>

            <p>${escapeHTML(getProductPrice(item))}</p>

          </article>
        `).join("")
      : "<p>More products coming soon.</p>";

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
  margin: 12px 0;
  padding: 10px 12px;
  background: #fff5f8;
  border: 1px dashed #e7a4bb;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
">
  <span style="font-size: 13px; color: #666;">
    Product Code
  </span>

  <strong style="color: #b83268; letter-spacing: 1px;">
    ${escapeHTML(product.product_code || "Not assigned")}
  </strong>
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

    productModal.querySelector(".product-modal-close").focus();
  }

  function closeProductModal() {
    if (!productModal) return;

    productModal.classList.remove("is-open");
    productModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }
  // BEFORE BUY SUGGESTION POPUP

  const beforeBuyModal = document.getElementById("beforeBuyModal");
  const beforeBuyProducts = document.getElementById("beforeBuyProducts");
  const continueAffiliateLink = document.getElementById("continueAffiliateLink");

  function showBeforeBuyPopup(product, platform) {
    if (!beforeBuyModal || !beforeBuyProducts || !continueAffiliateLink) return;

    // Original affiliate link
    continueAffiliateLink.href = platform.url;
    continueAffiliateLink.textContent = "Continue to " + platform.name;

    // Automatically get related products
    const relatedProducts = getRelatedProducts(product);

    beforeBuyProducts.innerHTML = relatedProducts.length
      ? relatedProducts.map(item => `
          <article class="related-product-card"
                   data-before-buy-product-id="${escapeHTML(item.id)}">

            <img src="${escapeHTML(item.image_url || "")}"
                 alt="${escapeHTML(item.title)}"
                 onerror="this.style.display='none'">

            <h4>${escapeHTML(item.title)}</h4>

            <p>${escapeHTML(getProductPrice(item))}</p>

          </article>
        `).join("")
      : "<p>No other products available right now.</p>";

    beforeBuyModal.classList.add("is-open");
    beforeBuyModal.setAttribute("aria-hidden", "false");
  }

  function closeBeforeBuyPopup() {
    if (!beforeBuyModal) return;

    beforeBuyModal.classList.remove("is-open");
    beforeBuyModal.setAttribute("aria-hidden", "true");
  }

  // Intercept Buy Now click
  productModal.addEventListener("click", event => {
    const buyButton = event.target.closest(".modal-buy-buttons .platform-btn");

    if (!buyButton) return;

    event.preventDefault();

    if (!activeModalProduct) return;

    let platformName = "";

    if (buyButton.classList.contains("amazon")) {
      platformName = "Amazon";
    } else if (buyButton.classList.contains("flipkart")) {
      platformName = "Flipkart";
    } else if (buyButton.classList.contains("meesho")) {
      platformName = "Meesho";
    }

    const platform = getProductPlatforms(activeModalProduct).find(item =>
      item.name === platformName
    );

    if (platform) {
      showBeforeBuyPopup(activeModalProduct, platform);
    }
  });

  // Close the Before Buy popup
  beforeBuyModal.addEventListener("click", event => {
    if (event.target.closest("[data-close-before-buy]")) {
      closeBeforeBuyPopup();
    }
  });

  // Clicking a suggestion opens that product in the first popup
  beforeBuyProducts.addEventListener("click", event => {
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
   // Product card and Buy Now click handling.
  productContainer.addEventListener("click", event => {

    const card = event.target.closest(".product-card");

    if (!card) return;

    const product = allProducts.find(item =>
      String(item.id) === String(card.dataset.productId)
    );

    if (!product) return;

    // If customer clicks Buy Now on product card
    const buyButton = event.target.closest("a.platform-btn");

    if (buyButton) {
      event.preventDefault();

      let platformName = "";

      if (buyButton.classList.contains("amazon")) {
        platformName = "Amazon";
      } else if (buyButton.classList.contains("flipkart")) {
        platformName = "Flipkart";
      } else if (buyButton.classList.contains("meesho")) {
        platformName = "Meesho";
      }

      const platform = getProductPlatforms(product).find(item =>
        item.name === platformName
      );

      if (platform) {
        showBeforeBuyPopup(product, platform);
      }

      return;
    }

    // Otherwise open product details popup
    showProductModal(product);
  });

  // Related product click opens its details in the same popup.
  modalProductContent.addEventListener("click", event => {
    const relatedCard = event.target.closest("[data-related-product-id]");

    if (!relatedCard) return;

    const product = allProducts.find(item =>
      String(item.id) === String(relatedCard.dataset.relatedProductId)
    );

    if (product) {
      showProductModal(product);
    }
  });

  // Close button and backdrop.
  productModal.addEventListener("click", event => {
    if (event.target.closest("[data-close-modal]")) {
      closeProductModal();
    }
  });

  // Close popup with Escape key.
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeBeforeBuyPopup();
      closeProductModal();
    }
  });

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function searchProducts() {
    const term = searchInput.value.trim().toLowerCase();

    const filtered = allProducts.filter(product =>
      product.title.toLowerCase().includes(term) ||
      (product.category_name || "").toLowerCase().includes(term)
    );

    renderProducts(filtered);
    productSection.scrollIntoView({ behavior: "smooth" });
  }

  searchButton.addEventListener("click", searchProducts);

  searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") searchProducts();
  });
    const categoryGrid = document.getElementById("categoryGrid");

  categoryGrid.addEventListener("click", event => {
    const categoryLink = event.target.closest("a[data-category-id]");

    if (!categoryLink) return;

    event.preventDefault();

    filterByCategory(categoryLink.dataset.categoryId);
  });
  loadSiteSettings();
loadCategories();
    loadProducts();
});
