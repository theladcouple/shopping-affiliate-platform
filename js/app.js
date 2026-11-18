
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const productSection = document.getElementById("products");
  const productContainer = productSection.querySelector(".empty-products");

  let allProducts = [];

 
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
      const buyUrl = product.amazon_url || product.flipkart_url || product.meesho_url;

      return `
        <article class="product-card">
          <img src="${escapeHTML(product.image_url || "")}"
               alt="${escapeHTML(product.title)}"
               onerror="this.style.display='none'">
          <div class="product-info">
            <p class="product-category">${escapeHTML(product.category_name || "Shopping")}</p>
            <h3>${escapeHTML(product.title)}</h3>
            <p class="product-price">
              ${product.price != null ? "₹" + Number(product.price).toLocaleString("en-IN") : "Price unavailable"}
            </p>
            ${buyUrl ? `<a class="primary-btn" href="${escapeHTML(buyUrl)}" target="_blank" rel="noopener noreferrer">Buy Now</a>` : ""}
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
loadCategories();
  loadProducts();
});
