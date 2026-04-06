(function () {
  const ORDER_STORAGE_KEY = "smooth-samples-last-order";
  const root = document.getElementById("order-confirmation-root");
  if (!root) return;

  function lineMarkup(item) {
    return `
      <article class="checkout-line-item">
        <div class="checkout-line-copy">
          <strong>${item.title}</strong>
          <span>${item.genre || "Pack"} · Qty ${item.quantity}</span>
        </div>
        <strong>$${(item.price_usd * item.quantity).toFixed(2)}</strong>
      </article>
    `;
  }

  function render(order) {
    if (!order) {
      root.innerHTML = `
        <section class="section cta-section">
          <p class="eyebrow">Order</p>
          <h1 class="catalog-title">No recent order found.</h1>
          <p>Start from the catalog, add a few packs, and complete the demo checkout flow.</p>
          <div class="cta-actions">
            <a class="btn btn-primary" href="./catalog.html">Browse Catalog</a>
            <a class="btn btn-secondary" href="./cart.html">Open Cart</a>
          </div>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="section order-confirmation-hero">
        <div class="section-heading">
          <p class="eyebrow">Order Confirmed</p>
          <h1 class="catalog-title">Your demo order is complete.</h1>
          <p>
            This is a storefront confirmation mockup. In a real checkout flow,
            download links and receipt delivery would be handled automatically.
          </p>
        </div>

        <div class="order-confirmation-layout">
          <div class="order-confirmation-main">
            <div class="product-buy-box">
              <div class="buy-box-row">
                <span>Order number</span>
                <strong>${order.id}</strong>
              </div>
              <div class="buy-box-row">
                <span>Customer</span>
                <strong>${order.customer.fullName || "Demo customer"}</strong>
              </div>
              <div class="buy-box-row">
                <span>Email</span>
                <strong>${order.customer.email || "Not provided"}</strong>
              </div>
              <div class="buy-box-row">
                <span>Delivery</span>
                <strong>Instant digital access</strong>
              </div>
            </div>

            <div class="checkout-review-list">
              ${order.items.map(lineMarkup).join("")}
            </div>
          </div>

          <aside class="cart-summary">
            <div class="cart-summary-card">
              <p class="panel-label">Receipt Summary</p>
              <div class="cart-summary-row">
                <span>Items</span>
                <strong>${order.pricing.items}</strong>
              </div>
              <div class="cart-summary-row">
                <span>Subtotal</span>
                <strong>$${order.pricing.subtotal.toFixed(2)}</strong>
              </div>
              <div class="cart-summary-row">
                <span>Taxes</span>
                <strong>Included</strong>
              </div>
              <div class="cart-summary-row cart-summary-total">
                <span>Total (Tax Included)</span>
                <strong>$${order.pricing.total.toFixed(2)}</strong>
              </div>
              <div class="cart-summary-actions">
                <a class="btn btn-primary" href="./catalog.html">Shop More Packs</a>
                <a class="btn btn-secondary" href="./index.html">Back to Home</a>
              </div>
            </div>
          </aside>
        </div>
      </section>
    `;
  }

  try {
    const saved = window.sessionStorage.getItem(ORDER_STORAGE_KEY);
    render(saved ? JSON.parse(saved) : null);
  } catch (error) {
    render(null);
  }
})();
