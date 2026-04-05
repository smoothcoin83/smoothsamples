(function () {
  const LOCAL_API_BASE = "http://127.0.0.1:8000/api";
  const REMOTE_API_BASE = "https://smooth-samples-backend.onrender.com/api";
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const DEFAULT_API_BASE = isLocalHost ? LOCAL_API_BASE : REMOTE_API_BASE;
  const PRODUCT_ROUTES = {
    "midnight-pressure": "./product-midnight-pressure.html",
    "dust-and-color": "./product-dust-and-color.html",
    "hip-hop-drum-kit-collection-vol-01": "./product-hip-hop-drum-kit-collection-vol-01.html",
  };

  function productHref(slug, title) {
    if (PRODUCT_ROUTES[slug]) return PRODUCT_ROUTES[slug];

    if (title) {
      return `./catalog.html?q=${encodeURIComponent(title)}`;
    }

    return "./catalog.html";
  }

  async function fetchJson(path) {
    const response = await fetch(`${DEFAULT_API_BASE}${path}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return response.json();
  }

  window.SmoothSamplesApi = {
    baseUrl: DEFAULT_API_BASE,
    fetchJson,
    productHref,
  };
})();
