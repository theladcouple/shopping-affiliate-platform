
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

        if (settings.logo_url) {
          const img = document.createElement("img");
          img.src = settings.logo_url;
          img.alt = siteName + " Logo";
          img.style.maxHeight = "45px";
          img.style.maxWidth = "160px";
          img.style.objectFit = "contain";
          element.appendChild(img);
        } else {
          element.textContent = siteName;
        }
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

          <div class="platform-links">
            ${buyButtons}
          </div>
        </div>
      </article>
    `;
  }).join("");
}


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
