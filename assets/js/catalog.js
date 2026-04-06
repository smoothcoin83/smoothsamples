(function () {
  const api = window.SmoothSamplesApi;
  if (!api) return;

  const filterChips = document.getElementById("catalog-filter-chips");
  const catalogGrid = document.getElementById("catalog-grid");
  const sortSelect = document.getElementById("catalog-sort");
  const searchInput = document.getElementById("catalog-search");
  const searchSummary = document.getElementById("catalog-search-summary");
  const resultsCount = document.getElementById("catalog-results-count");

  if (!filterChips || !catalogGrid || !sortSelect) return;

  const searchParams = new URLSearchParams(window.location.search);
  let currentGenre = "";
  let currentQuery = "";
  let allPacks = [];

  function visualClassForGenre(genre) {
    const key = (genre || "").toLowerCase();
    if (key.includes("lo")) return "pack-visual-lofi";
    if (key.includes("house")) return "pack-visual-house";
    return "pack-visual-trap";
  }

  function productHref(slug) {
    return api.productHref(slug);
  }

  function coverImageForPack(pack) {
    return pack.cover_image || "";
  }

  function renderGenres(genres) {
    const chips = genres
      .filter((genre) => ["Trap", "Lo-Fi", "House", "Drill", "Hip Hop"].includes(genre))
      .map(
        (genre) =>
          `<button class="filter-chip" type="button" data-genre="${genre}">${genre}</button>`
      )
      .join("");

    filterChips.innerHTML =
      `<button class="filter-chip is-active" type="button" data-genre="">All</button>` +
      chips;
  }

  function sortPacks(items) {
    const mode = sortSelect.value;
    const packs = [...items];

    if (mode === "Price: Low to High") {
      packs.sort((a, b) => a.price_usd - b.price_usd);
    } else if (mode === "Newest") {
      packs.sort((a, b) => Number(b.new_arrival) - Number(a.new_arrival));
    } else if (mode === "Editor Picks") {
      packs.sort((a, b) => Number(b.badge === "Editor Pick") - Number(a.badge === "Editor Pick"));
    } else {
      packs.sort((a, b) => b.rating - a.rating);
    }

    return packs;
  }

  function renderPacks(items) {
    const packs = sortPacks(items);

    if (!packs.length) {
      catalogGrid.innerHTML = `
        <article class="pack-card pack-card-status">
          <h3>No packs found</h3>
          <p>Try a different search term, genre, or sort option.</p>
        </article>
      `;
      return;
    }

    catalogGrid.innerHTML = packs
      .map((pack, index) => {
        const secondMeta = pack.metric_labels?.secondary
          ? `${pack.contents.one_shots} ${pack.metric_labels.secondary}`
          : pack.contents.one_shots
          ? `${pack.contents.one_shots} one-shots`
          : pack.contents.stems
            ? `${pack.contents.stems} stems`
            : `${pack.contents.presets} presets`;

        const coverImage = coverImageForPack(pack);
        const cardClass = coverImage
          ? "pack-card cover-pack-card catalog-product-card"
          : "pack-card catalog-product-card";
        const visualMarkup = coverImage
          ? `<a class="pack-visual cover-pack-visual pack-visual-artwork catalog-product-visual" href="${productHref(pack.slug)}"><img class="pack-cover-image" src="${coverImage}" alt="${pack.title} cover" /></a>`
          : `<div class="pack-visual ${visualClassForGenre(pack.genre)}" aria-hidden="true"></div>`;

        return `
          <article class="${cardClass}">
            ${visualMarkup}
            <div class="catalog-product-copy">
              <div class="catalog-product-topline">
                <p class="pack-tag">${pack.genre}</p>
                <span class="catalog-product-badge">${pack.badge}</span>
              </div>
              <h3><a class="catalog-product-title-link" href="${productHref(pack.slug)}">${pack.title}</a></h3>
              <p class="catalog-product-summary">${pack.summary}</p>
              <div class="catalog-product-price-row">
                <p class="catalog-product-price">$${pack.price_usd} <span>USD</span></p>
                <button
                  type="button"
                  class="compact-add-button catalog-buy-button"
                  data-add-to-cart
                  data-pack-slug="${pack.slug}"
                  data-pack-title="${pack.title}"
                  data-pack-price="${pack.price_usd}"
                  data-pack-genre="${pack.genre}"
                  data-pack-href="${productHref(pack.slug)}"
                  data-pack-cover="${coverImage}"
                >
                  Buy
                </button>
              </div>
              <ul class="catalog-product-meta">
                <li>${pack.contents.loops} ${pack.metric_labels?.primary || "loops"}</li>
                <li>${secondMeta}</li>
                <li>${pack.bpm_range || "Producer-ready"}</li>
              </ul>
              <a class="catalog-product-link" href="${productHref(pack.slug)}">View details</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function updateActiveGenre() {
    document.querySelectorAll("[data-genre]").forEach((element) => {
      const match = element.dataset.genre === currentGenre;
      const isAll = !currentGenre && element.dataset.genre === "";
      element.classList.toggle("is-active", match || isAll);
    });
  }

  function updateSearchSummary(total) {
    if (resultsCount) {
      resultsCount.textContent = `${total} result${total === 1 ? "" : "s"}`;
    }

    if (!searchSummary) return;

    if (currentQuery && currentGenre) {
      searchSummary.textContent = `${total} pack${total === 1 ? "" : "s"} found for "${currentQuery}" in ${currentGenre}.`;
      return;
    }

    if (currentQuery) {
      searchSummary.textContent = `${total} pack${total === 1 ? "" : "s"} found for "${currentQuery}".`;
      return;
    }

    if (currentGenre) {
      searchSummary.textContent = `${total} pack${total === 1 ? "" : "s"} currently shown in ${currentGenre}.`;
      return;
    }

    searchSummary.textContent = "Browse the full catalog and refine by genre or search term.";
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (currentQuery) params.set("q", currentQuery);
    if (currentGenre) params.set("genre", currentGenre);

    const nextUrl = params.toString() ? `./catalog.html?${params.toString()}#catalog-grid` : "./catalog.html#catalog-grid";
    history.replaceState(null, "", nextUrl);
  }

  function getFilteredPacks() {
    return currentGenre ? allPacks.filter((pack) => pack.genre === currentGenre) : allPacks;
  }

  async function loadCatalog() {
    try {
      currentQuery = (searchParams.get("q") || "").trim();
      currentGenre = (searchParams.get("genre") || "").trim();

      if (searchInput) {
        searchInput.value = currentQuery;
      }

      const endpoint = currentQuery ? `/packs?q=${encodeURIComponent(currentQuery)}` : "/packs";

      const [genresResponse, packsResponse] = await Promise.all([
        api.fetchJson("/genres"),
        api.fetchJson(endpoint),
      ]);

      allPacks = packsResponse.items || [];
      renderGenres(genresResponse.items || []);
      renderPacks(getFilteredPacks());
      updateSearchSummary(getFilteredPacks().length);
      updateActiveGenre();
    } catch (error) {
      catalogGrid.innerHTML = `
        <article class="pack-card pack-card-status">
          <h3>Catalog unavailable</h3>
          <p>Make sure the backend is running on ${api.baseUrl}.</p>
        </article>
      `;
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-genre]");
    if (!target) return;

    event.preventDefault();
    currentGenre = target.dataset.genre || "";
    const filtered = getFilteredPacks();
    renderPacks(filtered);
    updateSearchSummary(filtered.length);
    updateActiveGenre();
    syncUrl();
  });

  sortSelect.addEventListener("change", () => {
    renderPacks(getFilteredPacks());
  });

  loadCatalog();
})();
