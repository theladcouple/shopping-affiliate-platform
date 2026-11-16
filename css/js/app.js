
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const productSection = document.getElementById("products");
  const productContainer = productSection.querySelector(".empty-products");

  let allProducts = [];

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

  function renderProducts(products) {
    if (!products.length) {
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

  loadProducts();
});
