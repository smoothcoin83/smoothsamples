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
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);

      try {
        auth.register({
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
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);

      try {
        auth.login({
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

  function initAccountPage() {
    const root = document.querySelector("#account-root");
    if (!root) return;

    const user = auth.getCurrentUser();
    if (!user) {
      window.location.href = "./login.html";
      return;
    }

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
              <a class="btn btn-secondary" href="#" data-auth-logout>Logout</a>
            </div>
          </aside>
        </div>
      </section>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initRegisterPage();
    initLoginPage();
    initAccountPage();
  });
})();
