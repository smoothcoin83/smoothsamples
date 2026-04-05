(function () {
  const api = window.SmoothSamplesApi;
  if (!api) return;

  const slug = document.body.dataset.packSlug;
  if (!slug) return;

  const title = document.getElementById("product-title");
  const eyebrow = document.getElementById("product-eyebrow");
  const lead = document.getElementById("product-lead");
  const reviewRating = document.getElementById("product-review-rating");
  const price = document.getElementById("product-price");
  const badge = document.getElementById("product-badge");
  const metaGrid = document.getElementById("product-meta-grid");
  const specTable = document.getElementById("product-spec-table");

  if (!title || !eyebrow || !lead || !reviewRating || !price || !badge || !metaGrid || !specTable) {
    return;
  }

  function buildSecondaryMetric(contents) {
    if (contents.one_shots) return [contents.one_shots, "one-shots"];
    if (contents.stems) return [contents.stems, "stems"];
    return [contents.presets, "presets"];
  }

  async function loadProduct() {
    try {
      const pack = await api.fetchJson(`/packs/${slug}`);
      const [secondaryValue, secondaryLabel] = buildSecondaryMetric(pack.contents);
      const primaryLabel = pack.metric_labels?.primary || "loops";
      const secondaryMetricLabel = pack.metric_labels?.secondary || secondaryLabel;

      document.title = `Smooth Samples | ${pack.title}`;
      title.textContent = pack.title;
      eyebrow.textContent = `${pack.genre} Pack`;
      lead.textContent = pack.description;
      reviewRating.textContent = `${pack.rating}/5 producer rating`;
      price.textContent = `€${pack.price_eur}`;
      badge.textContent = pack.badge;

      metaGrid.innerHTML = `
        <div><strong>${pack.contents.loops}</strong><span>${primaryLabel}</span></div>
        <div><strong>${secondaryValue}</strong><span>${secondaryMetricLabel}</span></div>
        <div><strong>${pack.formats[0]}</strong><span>${pack.formats[1] ? `+ ${pack.formats[1]}` : "format"}</span></div>
        <div><strong>${pack.rating}</strong><span>rating</span></div>
      `;

      specTable.innerHTML = `
        <div class="spec-row">
          <span>Pack size</span>
          <strong>${pack.contents.loops + pack.contents.one_shots + pack.contents.stems + pack.contents.presets} files</strong>
        </div>
        <div class="spec-row">
          <span>File types</span>
          <strong>${pack.formats.join(", ")}</strong>
        </div>
        <div class="spec-row">
          <span>Best for</span>
          <strong>${pack.tags.join(", ")}</strong>
        </div>
        <div class="spec-row">
          <span>Preview access</span>
          <strong>No login required</strong>
        </div>
      `;
    } catch (error) {
      lead.textContent = `Backend unavailable. Make sure the API is running on ${api.baseUrl}.`;
    }
  }

  loadProduct();
})();
