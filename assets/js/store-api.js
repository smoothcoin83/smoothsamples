(function () {
  const LOCAL_API_BASE = "http://localhost:8000/api";
  const REMOTE_API_BASE = "https://smooth-samples-backend.onrender.com/api";
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const DEFAULT_API_BASE = isLocalHost ? LOCAL_API_BASE : REMOTE_API_BASE;
  const PRODUCT_ROUTES = {
    "midnight-pressure": "./product-midnight-pressure.html",
    "dust-and-color": "./product-dust-and-color.html",
    "hip-hop-drum-kit-collection-vol-01": "./product-hip-hop-drum-kit-collection-vol-01.html",
    "trap-drum-kit-collection-vol-01": "./product-trap-drum-kit-collection-vol-01.html",
  };

  function productHref(slug, title) {
    if (PRODUCT_ROUTES[slug]) return PRODUCT_ROUTES[slug];

    if (title) {
      return `./catalog.html?q=${encodeURIComponent(title)}`;
    }

    return "./catalog.html";
  }

  async function fetchJson(path) {
    const response = await fetch(`${DEFAULT_API_BASE}${path}`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return response.json();
  }

  async function postJson(path, payload) {
    const response = await fetch(`${DEFAULT_API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `API request failed: ${response.status}`);
    }
    return data;
  }

  window.SmoothSamplesApi = {
    baseUrl: DEFAULT_API_BASE,
    fetchJson,
    postJson,
    productHref,
  };
})();
