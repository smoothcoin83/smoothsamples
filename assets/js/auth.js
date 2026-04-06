(function () {
  const api = window.SmoothSamplesApi;
  const ORDER_HISTORY_KEY = "smooth-samples-orders-v1";
  let currentUser = null;
  let authStatePromise = null;

  function readOrders() {
    try {
      return JSON.parse(window.localStorage.getItem(ORDER_HISTORY_KEY) || "[]").filter(
        (order) => order && order.id
      );
    } catch (error) {
      return [];
    }
  }

  function writeOrders(orders) {
    window.localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orders));
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  async function syncCurrentUser(force = false) {
    if (!api) {
      currentUser = null;
      return null;
    }

    if (!force && authStatePromise) {
      return authStatePromise;
    }

    authStatePromise = api
      .fetchJson("/auth/me")
      .then((data) => {
        currentUser = data.user || null;
        return currentUser;
      })
      .catch(() => {
        currentUser = null;
        return null;
      });

    return authStatePromise;
  }

  function getCurrentUser() {
    return currentUser;
  }

  async function register(payload) {
    const fullName = String(payload.fullName || "").trim();
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "");

    if (!fullName || !email || !password) {
      throw new Error("Please complete all fields.");
    }

    const response = await api.postJson("/auth/register", {
      fullName,
      email,
      password,
      createdAt: new Date().toISOString(),
    });

    currentUser = response.user || null;
    authStatePromise = Promise.resolve(currentUser);
    window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: currentUser }));
    return currentUser;
  }

  async function login(payload) {
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "");

    const response = await api.postJson("/auth/login", { email, password });
    currentUser = response.user || null;
    authStatePromise = Promise.resolve(currentUser);
    window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: currentUser }));
    return currentUser;
  }

  async function logout() {
    try {
      await api.postJson("/auth/logout", {});
    } catch (error) {
      console.warn("Logout request failed.", error);
    }
    currentUser = null;
    authStatePromise = Promise.resolve(null);
    window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: null }));
  }

  async function saveOrder(order) {
    if (!order || !order.id) return false;

    const orders = readOrders().filter((entry) => entry.id !== order.id);
    orders.unshift(order);
    writeOrders(orders.slice(0, 20));

    const user = currentUser || (await syncCurrentUser());
    if (!user) return false;

    try {
      await api.postJson("/orders", order);
      return true;
    } catch (error) {
      console.warn("Protected order save failed, kept locally only.", error);
      return false;
    }
  }

  function getOrdersByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return [];

    return readOrders().filter(
      (order) => normalizeEmail(order.customer?.email) === normalizedEmail
    );
  }

  async function syncOrders() {
    const user = currentUser || (await syncCurrentUser());
    if (!user) return [];

    try {
      const response = await api.fetchJson("/orders");
      const remoteOrders = (response.items || []).filter((order) => order && order.id);
      const localOthers = readOrders().filter(
        (order) => normalizeEmail(order.customer?.email) !== normalizeEmail(user.email)
      );
      writeOrders([...remoteOrders, ...localOthers]);
      return remoteOrders;
    } catch (error) {
      console.warn("Protected order sync failed, using local history.", error);
      return getOrdersByEmail(user.email);
    }
  }

  function utilityMarkup(user) {
    const helpHref = "./help.html";

    if (user) {
      return `
        <a href="./index.html">Home</a>
        <a href="${helpHref}">Help</a>
        <a href="./account.html">${user.fullName.split(" ")[0]}</a>
        <a href="#" data-auth-logout>Logout</a>
        <a href="./catalog.html">USD $</a>
      `;
    }

    return `
      <a href="./index.html">Home</a>
      <a href="${helpHref}">Help</a>
      <a href="./register.html">Register</a>
      <a href="./login.html">Login</a>
      <a href="./catalog.html">USD $</a>
    `;
  }

  function renderUtilityLinks() {
    document.querySelectorAll(".utility-links").forEach((container) => {
      container.innerHTML = utilityMarkup(currentUser);
    });
  }

  document.addEventListener("click", async (event) => {
    const logoutTrigger = event.target.closest("[data-auth-logout]");
    if (!logoutTrigger) return;

    event.preventDefault();
    await logout();

    if (window.location.pathname.endsWith("/account.html") || window.location.pathname.endsWith("account.html")) {
      window.location.href = "./index.html";
      return;
    }

    renderUtilityLinks();
  });

  window.addEventListener("smoothsamples:auth-updated", renderUtilityLinks);
  document.addEventListener("DOMContentLoaded", async () => {
    await syncCurrentUser();
    renderUtilityLinks();
  });

  window.SmoothSamplesAuth = {
    getCurrentUser,
    register,
    login,
    logout,
    readOrders,
    saveOrder,
    getOrdersByEmail,
    syncCurrentUser,
    syncOrders,
    renderUtilityLinks,
  };
})();
