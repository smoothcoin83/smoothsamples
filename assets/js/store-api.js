(function () {
  const DEFAULT_API_BASE = "http://127.0.0.1:8000/api";

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
  };
})();
