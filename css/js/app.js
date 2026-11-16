
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");

  function searchProducts() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
      alert("Please enter a product name to search.");
      return;
    }

    const productSection = document.getElementById("products");

    productSection.scrollIntoView({
      behavior: "smooth"
    });

    const heading = productSection.querySelector("h2");

    heading.textContent = "Search Results for: " + searchTerm;

    const emptyProducts = productSection.querySelector(".empty-products");

    emptyProducts.innerHTML = `
      <span>🔍</span>
      <h3>No Products Available Yet</h3>
      <p>We are preparing products for "${searchTerm}". Please check again soon!</p>
    `;
  }

  searchButton.addEventListener("click", searchProducts);

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchProducts();
    }
  });
});
