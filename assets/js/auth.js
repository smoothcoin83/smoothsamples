(function () {
  const USERS_KEY = "smooth-samples-users-v1";
  const SESSION_KEY = "smooth-samples-session-v1";

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
    return readUsers().find((user) => normalizeEmail(user.email) === email) || null;
  }

  function register(payload) {
    const fullName = String(payload.fullName || "").trim();
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "");

    if (!fullName || !email || !password) {
      throw new Error("Please complete all fields.");
    }

    const users = readUsers();
    if (users.some((user) => normalizeEmail(user.email) === email)) {
      throw new Error("An account with this email already exists.");
    }

    const user = {
      fullName,
      email,
      password,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    writeUsers(users);
    writeSession({ email: user.email });
    window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: user }));
    return user;
  }

  function login(payload) {
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "");

    const user = readUsers().find((entry) => normalizeEmail(entry.email) === email);
    if (!user || user.password !== password) {
      throw new Error("Incorrect email or password.");
    }

    writeSession({ email: user.email });
    window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: user }));
    return user;
  }

  function logout() {
    writeSession(null);
    window.dispatchEvent(new CustomEvent("smoothsamples:auth-updated", { detail: null }));
  }

  function utilityMarkup(helpHref, user) {
    if (user) {
      return `
        <a href="${helpHref}">Help</a>
        <a href="./account.html">${user.fullName.split(" ")[0]}</a>
        <a href="#" data-auth-logout>Logout</a>
        <a href="./catalog.html">USD $</a>
      `;
    }

    return `
      <a href="${helpHref}">Help</a>
      <a href="./register.html">Register</a>
      <a href="./login.html">Login</a>
      <a href="./catalog.html">USD $</a>
    `;
  }

  function renderUtilityLinks() {
    const user = getCurrentUser();

    document.querySelectorAll(".utility-links").forEach((container) => {
      const fallbackHelp =
        container.dataset.helpHref ||
        container.querySelector("a")?.getAttribute("href") ||
        "./index.html#contact";

      container.innerHTML = utilityMarkup(fallbackHelp, user);
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
    renderUtilityLinks,
  };
})();
