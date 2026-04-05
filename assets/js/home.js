(function () {
  const api = window.SmoothSamplesApi;
  if (!api) return;

  const featuredGrid = document.getElementById("home-featured-grid");
  const popularGrid = document.getElementById("home-popular-grid");
  const newGrid = document.getElementById("home-new-grid");
  const popularFilters = document.getElementById("home-popular-filters");
  const sortSelect = document.getElementById("home-sort-by");

  if (!featuredGrid || !popularGrid || !newGrid || !popularFilters || !sortSelect) return;

  let allPacks = [];
  let currentGenre = "";

  function visualClassForGenre(genre) {
    const key = (genre || "").toLowerCase();
    if (key.includes("lo")) return "pack-visual-lofi";
    if (key.includes("house")) return "pack-visual-house";
    return "pack-visual-trap";
  }

  function compactArtClass(index) {
    return ["compact-art-a", "compact-art-b", "compact-art-c", "compact-art-d", "compact-art-e", "compact-art-f"][index % 6];
  }

  function coverImageForPack(pack) {
    return pack.cover_image || "";
  }

  function productHref(slug) {
    return api.productHref(slug);
  }

  function buildSecondaryMetric(pack) {
    if (pack.metric_labels?.secondary) {
      return `${pack.contents.one_shots} ${pack.metric_labels.secondary}`;
    }
    if (pack.contents.one_shots) return `${pack.contents.one_shots} one-shots`;
    if (pack.contents.stems) return `${pack.contents.stems} stems`;
    return `${pack.contents.presets} presets`;
  }

  function sortPacks(items) {
    const packs = [...items];
    const mode = sortSelect.value;

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

  function renderFeatured(packs) {
    const featured = packs
      .filter((pack) => pack.featured)
      .sort((a, b) => {
        if (a.slug === "hip-hop-drum-kit-collection-vol-01") return -1;
        if (b.slug === "hip-hop-drum-kit-collection-vol-01") return 1;
        return b.rating - a.rating;
      })
      .slice(0, 3);

    featuredGrid.innerHTML = featured
      .map((pack, index) => {
        const coverImage = coverImageForPack(pack);
        const visualMarkup = coverImage
          ? `<div class="pack-visual featured-pack-visual pack-visual-artwork"><img class="pack-cover-image" src="${coverImage}" alt="${pack.title} cover" /></div>`
          : `<div class="pack-visual featured-pack-visual ${visualClassForGenre(pack.genre)}" aria-hidden="true"></div>`;

        return `
        <article class="pack-card featured-pack-card">
          ${visualMarkup}
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
          <ul class="pack-meta" aria-label="${pack.title} details">
            <li>${pack.contents.loops} ${pack.metric_labels?.primary || "loops"}</li>
            <li>${buildSecondaryMetric(pack)}</li>
            <li>${pack.formats.join(" + ")}</li>
          </ul>
          <div class="mini-player" aria-label="${pack.title} preview player">
            <div class="mini-player-bar" aria-hidden="true">
              <span class="${index === 1 ? "is-mid" : index === 2 ? "is-long" : ""}"></span>
            </div>
            <div class="mini-player-row">
              <strong>Preview 0${index + 1}</strong>
              <span>0:${32 + index * 3}</span>
            </div>
          </div>
          <div class="pack-actions">
            <button
              type="button"
              class="pack-action-button"
              data-add-to-cart
              data-pack-slug="${pack.slug}"
              data-pack-title="${pack.title}"
              data-pack-price="${pack.price_eur}"
              data-pack-genre="${pack.genre}"
              data-pack-href="${productHref(pack.slug)}"
              data-pack-cover="${coverImage}"
            >
              Add to Cart
            </button>
            <a href="${productHref(pack.slug)}">View Details</a>
          </div>
        </article>
      `;
      })
      .join("");
  }

  function renderPopular(packs) {
    const filtered = currentGenre
      ? packs.filter((pack) => pack.genre === currentGenre)
      : packs;
    const items = sortPacks(filtered);

    popularGrid.innerHTML = items
      .map((pack, index) => `
        <article class="compact-item">
          <div class="compact-art ${compactArtClass(index)}" aria-hidden="true"></div>
          <div class="compact-copy">
            <p class="compact-tag">${pack.genre}</p>
            <h3>${pack.title}</h3>
            <p>${pack.summary}</p>
          </div>
          <div class="compact-meta">
            <span>€${pack.price_eur}</span>
            <strong><a href="${productHref(pack.slug)}">View</a></strong>
            <button
              type="button"
              class="compact-add-button"
              data-add-to-cart
              data-pack-slug="${pack.slug}"
              data-pack-title="${pack.title}"
              data-pack-price="${pack.price_eur}"
              data-pack-genre="${pack.genre}"
              data-pack-href="${productHref(pack.slug)}"
              data-pack-cover="${coverImageForPack(pack)}"
            >
              Add
            </button>
          </div>
        </article>
      `)
      .join("");
  }

  function renderNewArrivals(packs) {
    const items = packs.filter((pack) => pack.new_arrival).slice(0, 4);

    newGrid.innerHTML = items
      .map((pack) => {
        const coverImage = coverImageForPack(pack);
        const visualMarkup = coverImage
          ? `<div class="release-art release-artwork"><img class="pack-cover-image" src="${coverImage}" alt="${pack.title} cover" /></div>`
          : `<div class="release-art ${visualClassForGenre(pack.genre).replace("pack-visual-", "release-art-")}" aria-hidden="true"></div>`;

        return `
        <article class="release-card ${coverImage ? "release-card-cover" : ""}">
          ${visualMarkup}
          <div class="release-top">
            <span class="release-badge">${pack.badge}</span>
            <strong>€${pack.price_eur}</strong>
          </div>
          <h3>${pack.title}</h3>
          <p>${pack.summary}</p>
          <div class="release-meta">
            <span>${pack.contents.loops} ${pack.metric_labels?.primary || "loops"}</span>
            <span>${buildSecondaryMetric(pack)}</span>
          </div>
          <div class="pack-actions release-actions">
            <button
              type="button"
              class="pack-action-button"
              data-add-to-cart
              data-pack-slug="${pack.slug}"
              data-pack-title="${pack.title}"
              data-pack-price="${pack.price_eur}"
              data-pack-genre="${pack.genre}"
              data-pack-href="${productHref(pack.slug)}"
              data-pack-cover="${coverImage}"
            >
              Add to Cart
            </button>
            <a href="${productHref(pack.slug)}">View Details</a>
          </div>
        </article>
      `;
      })
      .join("");
  }

  function renderFilters(packs) {
    const genres = [...new Set(packs.map((pack) => pack.genre))].filter((genre) =>
      ["Trap", "Lo-Fi", "House", "Drill", "Hip Hop"].includes(genre)
    );

    popularFilters.innerHTML =
      `<button class="filter-chip is-active" type="button" data-home-genre="">All</button>` +
      genres
        .map((genre) => `<button class="filter-chip" type="button" data-home-genre="${genre}">${genre}</button>`)
        .join("");
  }

  function updateActiveFilters() {
    document.querySelectorAll("[data-home-genre]").forEach((element) => {
      const isAll = !currentGenre && element.dataset.homeGenre === "";
      const isMatch = element.dataset.homeGenre === currentGenre;
      element.classList.toggle("is-active", isAll || isMatch);
    });
  }

  async function loadHomeData() {
    try {
      const response = await api.fetchJson("/packs");
      allPacks = response.items || [];
      renderFeatured(allPacks);
      renderFilters(allPacks);
      renderPopular(allPacks);
      renderNewArrivals(allPacks);
      updateActiveFilters();
    } catch (error) {
      featuredGrid.innerHTML = `
        <article class="pack-card pack-card-status">
          <h3>Featured packs unavailable</h3>
          <p>Make sure the backend is running on ${api.baseUrl}.</p>
        </article>
      `;
    }
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-home-genre]");
    if (!trigger) return;

    event.preventDefault();
    currentGenre = trigger.dataset.homeGenre || "";
    renderPopular(allPacks);
    updateActiveFilters();
  });

  sortSelect.addEventListener("change", () => {
    renderPopular(allPacks);
  });

  loadHomeData();
})();
