(function () {
  const cart = window.SmoothSamplesCart;
  const auth = window.SmoothSamplesAuth;
  if (!cart) return;

  const ORDER_STORAGE_KEY = "smooth-samples-last-order";
  const form = document.getElementById("checkout-form");
  const itemsRoot = document.getElementById("checkout-items");
  const summaryRoot = document.getElementById("checkout-summary");
  const successNote = document.getElementById("checkout-success-note");
  const heading = document.querySelector(".checkout-hero .section-heading p + h1");
  const lead = document.querySelector(".checkout-hero .section-heading p + h1 + p");

  if (!form || !itemsRoot || !summaryRoot) return;

  function itemMarkup(item) {
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

  function summaryMarkup(items, user) {
    const summary = cart.pricing(items);
    const authNotice = user
      ? `<p class="checkout-success-note">Signed in as ${user.email}. This order will be attached to your account.</p>`
      : `<p class="checkout-success-note">You need an account to place a secure order.</p>`;

    return `
      <div class="cart-summary-card">
        <p class="panel-label">Checkout Summary</p>
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
      </div>
    `;
  }

  function orderId() {
    return `SS-${Date.now().toString().slice(-8)}`;
  }

  async function render() {
    const items = cart.readCart();
    const user = auth?.syncCurrentUser ? await auth.syncCurrentUser() : null;

    if (!items.length) {
      itemsRoot.innerHTML = `
        <article class="pack-card pack-card-status cart-empty-state">
          <h3>No items ready for checkout</h3>
          <p>Add a few packs to your cart before continuing to checkout.</p>
          <a class="btn btn-primary" href="./catalog.html">Browse Catalog</a>
        </article>
      `;
      summaryRoot.innerHTML = summaryMarkup(items, user);
      form.hidden = true;
      return;
    }

    itemsRoot.innerHTML = items.map(itemMarkup).join("");
    summaryRoot.innerHTML = summaryMarkup(items, user);

    if (!user) {
      form.hidden = true;
      if (heading) heading.textContent = "Sign in before completing secure checkout.";
      if (lead) {
        lead.textContent =
          "Orders are now protected by authenticated backend sessions. Log in or create an account to continue.";
      }
      itemsRoot.insertAdjacentHTML(
        "afterbegin",
        `
          <article class="checkout-card">
            <p class="panel-label">Authentication Required</p>
            <p class="checkout-success-note">
              Please sign in first. Your cart is preserved and waiting for you.
            </p>
            <div class="checkout-actions">
              <a class="btn btn-primary" href="./login.html">Login</a>
              <a class="btn btn-secondary" href="./register.html">Create Account</a>
            </div>
          </article>
        `
      );
      return;
    }

    form.hidden = false;
    if (heading) heading.textContent = "Complete your order in one secure step.";
    if (lead) {
      lead.textContent =
        "Your authenticated checkout is ready. Billing details and order summary stay connected to your account.";
    }

    if (user) {
      const fullNameInput = form.elements.namedItem("full_name");
      const emailInput = form.elements.namedItem("email");

      if (fullNameInput && !fullNameInput.value) {
        fullNameInput.value = user.fullName || "";
      }

      if (emailInput && !emailInput.value) {
        emailInput.value = user.email || "";
      }
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const items = cart.readCart();
    if (!items.length) return;

    const fields = new FormData(form);
    const customer = {
      fullName: String(fields.get("full_name") || "").trim(),
      email: String(fields.get("email") || "").trim(),
      country: String(fields.get("country") || "").trim(),
      city: String(fields.get("city") || "").trim(),
    };

    const order = {
      id: orderId(),
      createdAt: new Date().toISOString(),
      customer,
      items,
      pricing: cart.pricing(items),
    };

    window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    cart.clearCart();

    if (successNote) {
      successNote.textContent = "Order confirmed. Redirecting...";
    }

    window.location.href = "./order-confirmation.html";
  });

  window.addEventListener("smoothsamples:auth-updated", render);
  render();
})();
