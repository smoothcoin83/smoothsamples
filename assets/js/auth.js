(function () {
  const api = window.SmoothSamplesApi;
  const USERS_KEY = "smooth-samples-users-v1";
  const SESSION_KEY = "smooth-samples-session-v1";
  const ORDER_HISTORY_KEY = "smooth-samples-orders-v1";

  function readUsers() {
    try {
      return JSON.parse(window.localStorage.getItem(USERS_KEY) || "[]").filter(
        (user) => user && user.email
      );
    } catch (error) {
      return [];
    }
  }

  function writeUsers(users) {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function readSession() {
    try {
      return JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function writeSession(session) {
    if (!session) {
      window.localStorage.removeItem(SESSION_KEY);
      return;
    }

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function getCurrentUser() {
    const session = readSession();
    if (!session || !session.email) return null;

    const email = normalizeEmail(session.email);
    return (
      readUsers().find((user) => normalizeEmail(user.email) === email) || {
        fullName: session.fullName || "Account",
        email,
      }
    );
  }

  function upsertLocalUser(user) {
    if (!user || !user.email) return;

    const users = readUsers().filter(
      (entry) => normalizeEmail(entry.email) !== normalizeEmail(user.email)
    );
    users.push({
      fullName: user.fullName,
      email: normalizeEmail(user.email),
      createdAt: user.createdAt || new Date().toISOString(),
    });
    writeUsers(users);
  }

  async function request(path, payload) {
    if (!api) {
      throw new Error("API unavailable");
    }

    const response = await fetch(`${api.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  async function register(payload) {
    const fullName = String(payload.fullName || "").trim();
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "");
    const createdAt = new Date().toISOString();

    if (!fullName || !email || !password) {
      throw new Error("Please complete all fields.");
    }

    if (api) {
      try {
        const response = await request("/auth/register", {
          fullName,
          email,
          password,
          createdAt,
        });
        const user = response.user;
        upsertLocalUser(user);
        writeSession({ email: user.email, fullName: user.fullName });
        window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: user }));
        return user;
      } catch (error) {
        if (/exists|complete/i.test(error.message)) {
          throw error;
        }
        console.warn("Backend register failed, falling back to local demo auth.", error);
      }
    }

    const users = readUsers();
    if (users.some((user) => normalizeEmail(user.email) === email)) {
      throw new Error("An account with this email already exists.");
    }

    const user = {
      fullName,
      email,
      password,
      createdAt,
    };

    users.push(user);
    writeUsers(users);
    writeSession({ email: user.email, fullName: user.fullName });
    window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: user }));
    return user;
  }

  async function login(payload) {
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "");

    if (api) {
      try {
        const response = await request("/auth/login", { email, password });
        const user = response.user;
        upsertLocalUser(user);
        writeSession({ email: user.email, fullName: user.fullName });
        window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: user }));
        return user;
      } catch (error) {
        if (/Incorrect email or password/i.test(error.message)) {
          throw error;
        }
        console.warn("Backend login failed, falling back to local demo auth.", error);
      }
    }

    const user = readUsers().find((entry) => normalizeEmail(entry.email) === email);
    if (!user || user.password !== password) {
      throw new Error("Incorrect email or password.");
    }

    writeSession({ email: user.email, fullName: user.fullName });
    window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: user }));
    return user;
  }

  function logout() {
    writeSession(null);
    window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: null }));
  }

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

  async function saveOrder(order) {
    if (!order || !order.id) return;

    const orders = readOrders().filter((entry) => entry.id !== order.id);
    orders.unshift(order);
    writeOrders(orders.slice(0, 20));

    if (!api) return;

    try {
      await request("/orders", order);
    } catch (error) {
      console.warn("Backend order save failed, kept locally only.", error);
    }
  }

  function getOrdersByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return [];

    return readOrders().filter(
      (order) => normalizeEmail(order.customer?.email) === normalizedEmail
    );
  }

  async function syncOrdersByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !api) {
      return getOrdersByEmail(normalizedEmail);
    }

    try {
      const response = await api.fetchJson(`/orders?email=${encodeURIComponent(normalizedEmail)}`);
      const remoteOrders = (response.items || []).filter((order) => order && order.id);
      const localOthers = readOrders().filter(
        (order) => normalizeEmail(order.customer?.email) !== normalizedEmail
      );
      writeOrders([...remoteOrders, ...localOthers]);
      return remoteOrders;
    } catch (error) {
      console.warn("Backend order sync failed, using local history.", error);
      return getOrdersByEmail(normalizedEmail);
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
    const user = getCurrentUser();

    document.querySelectorAll(".utility-links").forEach((container) => {
      container.innerHTML = utilityMarkup(user);
    });
  }

  document.addEventListener("click", (event) => {
    const logoutTrigger = event.target.closest("[data-auth-logout]");
    if (!logoutTrigger) return;

    event.preventDefault();
    logout();

    if (window.location.pathname.endsWith("/account.html") || window.location.pathname.endsWith("account.html")) {
      window.location.href = "./index.html";
      return;
    }

    renderUtilityLinks();
  });

  window.addEventListener("smoothsamples:auth-updated", renderUtilityLinks);
  document.addEventListener("DOMContentLoaded", renderUtilityLinks);
  renderUtilityLinks();

  window.SmoothSamplesAuth = {
    readUsers,
    getCurrentUser,
    register,
    login,
    logout,
    readOrders,
    saveOrder,
    getOrdersByEmail,
    syncOrdersByEmail,
    renderUtilityLinks,
  };
})();
