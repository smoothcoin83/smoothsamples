(function () {
  const auth = window.SmoothSamplesAuth;
  if (!auth) return;

  function setMessage(node, text, isError) {
    if (!node) return;
    node.textContent = text;
    node.classList.toggle("is-error", Boolean(isError));
    node.classList.toggle("is-success", Boolean(text && !isError));
  }

  function initRegisterPage() {
    const form = document.querySelector("#register-form");
    if (!form) return;

    const message = document.querySelector("#register-message");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);

      try {
        await auth.register({
          fullName: formData.get("full_name"),
          email: formData.get("email"),
          password: formData.get("password"),
        });
        setMessage(message, "Account created. Redirecting to your account...", false);
        window.setTimeout(() => {
          window.location.href = "./account.html";
        }, 700);
      } catch (error) {
        setMessage(message, error.message, true);
      }
    });
  }

  function initLoginPage() {
    const form = document.querySelector("#login-form");
    if (!form) return;

    const message = document.querySelector("#login-message");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);

      try {
        await auth.login({
          email: formData.get("email"),
          password: formData.get("password"),
        });
        setMessage(message, "Login successful. Redirecting to your account...", false);
        window.setTimeout(() => {
          window.location.href = "./account.html";
        }, 700);
      } catch (error) {
        setMessage(message, error.message, true);
      }
    });
  }

  async function initAccountPage() {
    const root = document.querySelector("#account-root");
    if (!root) return;

    const user = await auth.syncCurrentUser(true);
    if (!user) {
      window.location.href = "./login.html";
      return;
    }

    const cart = window.SmoothSamplesCart;
    const orders = await auth.syncOrders();
    const cartItems = cart?.readCart?.() || [];

    const orderMarkup = orders.length
      ? `
        <div class="account-orders">
          ${orders
            .map(
              (order) => `
                <article class="checkout-card account-order-card">
                  <div class="account-order-top">
                    <div>
                      <p class="panel-label">Order ${order.id}</p>
                      <strong>${new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}</strong>
                    </div>
                    <span class="account-order-total">$${order.pricing.total.toFixed(2)}</span>
                  </div>
                  <div class="checkout-review-list">
                    ${order.items
                      .map(
                        (item) => `
                          <article class="checkout-line-item">
                            <div class="checkout-line-copy">
                              <strong>${item.title}</strong>
                              <span>${item.genre || "Pack"} · Qty ${item.quantity}</span>
                            </div>
                            <a class="btn btn-secondary" href="${item.href || "./catalog.html"}">Open Pack</a>
                          </article>
                        `
                      )
                      .join("")}
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      `
      : `
        <div class="checkout-card">
          <p class="panel-label">Recent Orders</p>
          <p class="checkout-success-note">
            No demo orders yet. Once you complete checkout, your recent orders will appear here.
          </p>
          <div class="account-actions">
            <a class="btn btn-primary" href="./catalog.html">Browse Packs</a>
          </div>
        </div>
      `;

    const cartMarkup = cartItems.length
      ? `
        <div class="checkout-card">
          <p class="panel-label">Current Cart</p>
          <div class="checkout-review-list">
            ${cartItems
              .map(
                (item) => `
                  <article class="checkout-line-item">
                    <div class="checkout-line-copy">
                      <strong>${item.title}</strong>
                      <span>${item.genre || "Pack"} · Qty ${item.quantity}</span>
                    </div>
                    <strong>$${(item.price_usd * item.quantity).toFixed(2)}</strong>
                  </article>
                `
              )
              .join("")}
          </div>
          <div class="account-actions">
            <a class="btn btn-primary" href="./cart.html">Open Cart</a>
          </div>
        </div>
      `
      : `
        <div class="checkout-card">
          <p class="panel-label">Current Cart</p>
          <p class="checkout-success-note">Your cart is empty right now. Add a few packs and continue from there.</p>
          <div class="account-actions">
            <a class="btn btn-primary" href="./catalog.html">Browse Catalog</a>
          </div>
        </div>
      `;

    root.innerHTML = `
      <section class="section account-hero">
        <div class="section-heading">
          <p class="eyebrow">Your Account</p>
          <h1 class="catalog-title">Welcome back, ${user.fullName.split(" ")[0]}.</h1>
          <p>
            This is a demo account area for the storefront. It keeps your session active
            locally and gives the site a more complete user flow.
          </p>
        </div>

        <div class="account-layout">
          <div class="checkout-card">
            <p class="panel-label">Profile</p>
            <div class="account-detail-list">
              <div class="account-detail">
                <span>Name</span>
                <strong>${user.fullName}</strong>
              </div>
              <div class="account-detail">
                <span>Email</span>
                <strong>${user.email}</strong>
              </div>
              <div class="account-detail">
                <span>Status</span>
                <strong>Demo Member</strong>
              </div>
            </div>
          </div>

          <aside class="checkout-card">
            <p class="panel-label">Quick Actions</p>
            <div class="account-actions">
              <a class="btn btn-primary" href="./catalog.html">Browse Packs</a>
              <a class="btn btn-secondary" href="./cart.html">Open Cart</a>
              <a class="btn btn-secondary" href="./help.html">Open Help</a>
              <a class="btn btn-secondary" href="#" data-auth-logout>Logout</a>
            </div>
          </aside>
        </div>

        ${cartMarkup}
        ${orderMarkup}
      </section>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initRegisterPage();
    initLoginPage();
    await initAccountPage();
  });
})();
