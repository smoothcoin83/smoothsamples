(function () {
  const cart = window.SmoothSamplesCart;
  const auth = window.SmoothSamplesAuth;
  if (!cart) return;

  const itemsRoot = document.getElementById("cart-items");
  const summaryRoot = document.getElementById("cart-summary");
  if (!itemsRoot || !summaryRoot) return;

  function itemMarkup(item) {
    const artwork = item.cover_image
      ? `<img class="cart-item-image" src="${item.cover_image}" alt="${item.title} cover" />`
      : `<div class="cart-item-image cart-item-image-generic" aria-hidden="true">${(item.genre || "S").slice(0, 1)}</div>`;

    return `
      <article class="cart-item">
        <a class="cart-item-artwork" href="${item.href}">
          ${artwork}
        </a>
        <div class="cart-item-copy">
          <p class="cart-item-tag">${item.genre || "Pack"}</p>
          <h3><a href="${item.href}">${item.title}</a></h3>
          <p>Instant digital delivery. Added to your demo cart.</p>
        </div>
        <div class="cart-item-controls">
          <span class="cart-item-price">$${item.price_usd}</span>
          <div class="cart-quantity">
            <button type="button" data-cart-qty="${item.slug}" data-delta="-1" aria-label="Decrease quantity">-</button>
            <strong>${item.quantity}</strong>
            <button type="button" data-cart-qty="${item.slug}" data-delta="1" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="cart-remove-button" data-cart-remove="${item.slug}">Remove</button>
        </div>
      </article>
    `;
  }

  function summaryMarkup(items, user) {
    const summary = cart.pricing(items);
    const authNotice = user
      ? `<p class="checkout-success-note">Signed in as ${user.email}. Your secure checkout session is ready.</p>`
      : `<p class="checkout-success-note">Sign in or create an account before secure checkout.</p>`;
    const primaryAction = user
      ? `<a class="btn btn-primary" href="./checkout.html">Proceed to Checkout</a>`
      : `<a class="btn btn-primary" href="./login.html">Login to Checkout</a>`;
    const secondaryAction = user
      ? `<a class="btn btn-secondary" href="./catalog.html">Continue Shopping</a>`
      : `<a class="btn btn-secondary" href="./register.html">Create Account</a>`;

    return `
      <div class="cart-summary-card">
        <p class="panel-label">Order Summary</p>
        <div class="cart-summary-row">
          <span>Items</span>
          <strong>${summary.items}</strong>
        </div>
        <div class="cart-summary-row">
          <span>Subtotal</span>
          <strong>$${summary.subtotal.toFixed(2)}</strong>
        </div>
        <div class="cart-summary-row">
          <span>Taxes</span>
          <strong>Included</strong>
        </div>
        <div class="cart-summary-row cart-summary-total">
          <span>Total (Tax Included)</span>
          <strong>$${summary.total.toFixed(2)}</strong>
        </div>
        ${authNotice}
        <div class="cart-summary-actions">
          ${primaryAction}
          ${secondaryAction}
        </div>
      </div>
    `;
  }

  async function render() {
    const items = cart.readCart();
    const user = auth?.syncCurrentUser ? await auth.syncCurrentUser() : null;

    if (!items.length) {
      itemsRoot.innerHTML = `
        <article class="pack-card pack-card-status cart-empty-state">
          <h3>Your cart is empty</h3>
          <p>Add a few packs from the homepage, catalog, or product pages to start building your order.</p>
          <a class="btn btn-primary" href="./catalog.html">Browse Catalog</a>
        </article>
      `;
      summaryRoot.innerHTML = summaryMarkup(items, user);
      return;
    }

    itemsRoot.innerHTML = items.map(itemMarkup).join("");
    summaryRoot.innerHTML = summaryMarkup(items, user);
  }

  window.addEventListener("smoothsamples:cart-updated", render);
  window.addEventListener("smoothsamples:auth-updated", render);
  render();
})();
