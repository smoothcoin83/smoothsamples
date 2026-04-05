(function () {
  const api = window.SmoothSamplesApi;
  if (!api) return;

  const SEARCH_MIN_LENGTH = 2;
  const SEARCH_LIMIT = 5;

  function createSuggestionsPanel(form) {
    const panel = document.createElement("div");
    panel.className = "search-suggestions";
    form.appendChild(panel);
    return panel;
  }

  function hidePanel(panel) {
    panel.classList.remove("is-visible");
    panel.innerHTML = "";
  }

  function resultMarkup(pack) {
    const href = api.productHref(pack.slug, pack.title);
    const thumb = pack.cover_image
      ? `<img class="search-suggestion-thumb" src="${pack.cover_image}" alt="${pack.title} cover" />`
      : `<span class="search-suggestion-thumb search-suggestion-thumb-generic" aria-hidden="true">${pack.genre.slice(0, 1)}</span>`;

    return `
      <a class="search-suggestion-item" href="${href}">
        ${thumb}
        <span class="search-suggestion-copy">
          <strong>${pack.title}</strong>
          <span>${pack.genre} · €${pack.price_eur}</span>
        </span>
      </a>
    `;
  }

  function footerMarkup(query, count) {
    return `
      <a class="search-suggestion-footer" href="./catalog.html?q=${encodeURIComponent(query)}">
        View ${count} result${count === 1 ? "" : "s"} in catalog
      </a>
    `;
  }

  function attachSearch(form) {
    const input = form.querySelector('input[type="search"]');
    if (!input) return;

    const panel = createSuggestionsPanel(form);
    let requestId = 0;
    let debounceId = null;

    async function runSearch() {
      const query = input.value.trim();
      if (query.length < SEARCH_MIN_LENGTH) {
        hidePanel(panel);
        return;
      }

      requestId += 1;
      const currentRequest = requestId;

      panel.classList.add("is-visible");
      panel.innerHTML = `<div class="search-suggestion-state">Searching packs...</div>`;

      try {
        const response = await api.fetchJson(`/packs?q=${encodeURIComponent(query)}`);
        if (currentRequest !== requestId) return;

        const items = (response.items || []).slice(0, SEARCH_LIMIT);
        if (!items.length) {
          panel.innerHTML = `
            <div class="search-suggestion-state">No direct matches for "${query}".</div>
            ${footerMarkup(query, 0)}
          `;
          return;
        }

        panel.innerHTML = `
          <div class="search-suggestion-list">
            ${items.map(resultMarkup).join("")}
          </div>
          ${footerMarkup(query, response.count || items.length)}
        `;
      } catch (error) {
        panel.innerHTML = `<div class="search-suggestion-state">Search unavailable right now.</div>`;
      }
    }

    input.addEventListener("input", () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(runSearch, 180);
    });

    input.addEventListener("focus", () => {
      if (input.value.trim().length >= SEARCH_MIN_LENGTH) {
        runSearch();
      }
    });

    document.addEventListener("click", (event) => {
      if (!form.contains(event.target)) {
        hidePanel(panel);
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hidePanel(panel);
        input.blur();
      }
    });
  }

  document.querySelectorAll(".search-bar").forEach(attachSearch);
})();
