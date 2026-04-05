(function () {
  const api = window.SmoothSamplesApi;
  if (!api) return;

  const genreList = document.getElementById("catalog-genre-list");
  const filterChips = document.getElementById("catalog-filter-chips");
  const catalogGrid = document.getElementById("catalog-grid");
  const sortSelect = document.getElementById("catalog-sort");

  if (!genreList || !filterChips || !catalogGrid || !sortSelect) return;

  let currentGenre = "";
  let allPacks = [];

  function visualClassForGenre(genre) {
    const key = (genre || "").toLowerCase();
    if (key.includes("lo")) return "pack-visual-lofi";
    if (key.includes("house")) return "pack-visual-house";
    return "pack-visual-trap";
  }

  function productHref(slug) {
    if (slug === "midnight-pressure") return "./product-midnight-pressure.html";
    if (slug === "dust-and-color") return "./product-dust-and-color.html";
    return "#catalog-help";
  }

  function renderGenres(genres) {
    genreList.innerHTML = genres
      .map((genre) => `<a href="#catalog-grid" data-genre="${genre}">${genre}</a>`)
      .join("");

    const chips = genres
      .filter((genre) => ["Trap", "Lo-Fi", "House", "Drill"].includes(genre))
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
      packs.sort((a, b) => a.price_eur - b.price_eur);
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
          <p>Try a different genre or sort option.</p>
        </article>
      `;
      return;
    }

    catalogGrid.innerHTML = packs
      .map((pack, index) => {
        const secondMeta = pack.contents.one_shots
          ? `${pack.contents.one_shots} one-shots`
          : pack.contents.stems
            ? `${pack.contents.stems} stems`
            : `${pack.contents.presets} presets`;

        const progressClass =
          index % 3 === 1 ? "is-mid" : index % 3 === 2 ? "is-long" : "";

        return `
          <article class="pack-card">
            <div class="pack-visual ${visualClassForGenre(pack.genre)}" aria-hidden="true"></div>
            <div class="pack-card-top">
              <p class="pack-tag">${pack.genre}</p>
              <p class="pack-price">€${pack.price_eur}</p>
            </div>
            <h3>${pack.title}</h3>
            <div class="pack-submeta">
              <span>${pack.rating} rating</span>
              <span>${pack.badge}</span>
            </div>
            <p>${pack.summary}</p>
            <ul class="pack-meta">
              <li>${pack.contents.loops} loops</li>
              <li>${secondMeta}</li>
              <li>${pack.formats.join(" + ")}</li>
            </ul>
            <div class="mini-player">
              <div class="mini-player-bar" aria-hidden="true"><span class="${progressClass}"></span></div>
              <div class="mini-player-row">
                <strong>Preview 0${index + 1}</strong>
                <span>0:${27 + index * 2}</span>
              </div>
            </div>
            <div class="pack-actions">
              <a href="./index.html#preview-experience">Preview Pack</a>
              <a href="${productHref(pack.slug)}">View Details</a>
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

  async function loadCatalog() {
    try {
      const [genresResponse, packsResponse] = await Promise.all([
        api.fetchJson("/genres"),
        api.fetchJson("/packs"),
      ]);

      allPacks = packsResponse.items || [];
      renderGenres(genresResponse.items || []);
      renderPacks(allPacks);
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

    const filtered = currentGenre
      ? allPacks.filter((pack) => pack.genre === currentGenre)
      : allPacks;

    renderPacks(filtered);
    updateActiveGenre();
    window.location.hash = "catalog-grid";
  });

  sortSelect.addEventListener("change", () => {
    const filtered = currentGenre
      ? allPacks.filter((pack) => pack.genre === currentGenre)
      : allPacks;

    renderPacks(filtered);
  });

  loadCatalog();
})();
