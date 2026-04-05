(function () {
  const api = window.SmoothSamplesApi;
  if (!api) return;

  const STORAGE_KEY = "smooth-samples-cart-v1";

  function readCart() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (error) {
      return [];
    }
  }

  function writeCart(items) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function totals(items) {
    return items.reduce(
      (accumulator, item) => {
        accumulator.items += item.quantity;
        accumulator.total += item.price_eur * item.quantity;
        return accumulator;
      },
      { items: 0, total: 0 }
    );
  }

  function updateCartPills() {
    const items = readCart();
    const summary = totals(items);

    document.querySelectorAll(".cart-pill").forEach((pill) => {
      const totalNode = pill.querySelector(".cart-total");
      const metaNode = pill.querySelector(".cart-meta");

      if (totalNode) totalNode.textContent = `€${summary.total.toFixed(2)}`;
      if (metaNode) metaNode.textContent = `${summary.items} item${summary.items === 1 ? "" : "s"}`;
      pill.setAttribute("href", "./cart.html");
      pill.setAttribute("aria-label", `View cart with ${summary.items} item${summary.items === 1 ? "" : "s"}`);
    });
  }

  function dispatchChange() {
    window.dispatchEvent(new CustomEvent("smoothsamples:cart-updated", { detail: readCart() }));
  }

  function addItem(item) {
    const items = readCart();
    const existing = items.find((entry) => entry.slug === item.slug);

    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ ...item, quantity: 1 });
    }

    writeCart(items);
    updateCartPills();
    dispatchChange();
  }

  function removeItem(slug) {
    const items = readCart().filter((item) => item.slug !== slug);
    writeCart(items);
    updateCartPills();
    dispatchChange();
  }

  function setQuantity(slug, quantity) {
    const items = readCart();
    const match = items.find((item) => item.slug === slug);
    if (!match) return;

    match.quantity = Math.max(1, quantity);
    writeCart(items);
    updateCartPills();
    dispatchChange();
  }

  function flashButton(button) {
    const originalText = button.dataset.originalText || button.textContent;
    button.dataset.originalText = originalText;
    button.textContent = "Added";
    button.classList.add("is-added");

    window.setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("is-added");
    }, 1200);
  }

  function buttonPayload(button) {
    const slug = button.dataset.packSlug;
    const title = button.dataset.packTitle;
    const price = Number(button.dataset.packPrice || 0);

    if (!slug || !title) return null;

    return {
      slug,
      title,
      price_eur: price,
      genre: button.dataset.packGenre || "",
      href: button.dataset.packHref || api.productHref(slug, title),
      cover_image: button.dataset.packCover || "",
    };
  }

  document.addEventListener("click", (event) => {
    const addTrigger = event.target.closest("[data-add-to-cart]");
    if (addTrigger) {
      event.preventDefault();
      const payload = buttonPayload(addTrigger);
      if (!payload) return;
      addItem(payload);
      flashButton(addTrigger);
      return;
    }

    const removeTrigger = event.target.closest("[data-cart-remove]");
    if (removeTrigger) {
      event.preventDefault();
      removeItem(removeTrigger.dataset.cartRemove);
      return;
    }

    const quantityTrigger = event.target.closest("[data-cart-qty]");
    if (quantityTrigger) {
      const slug = quantityTrigger.dataset.cartQty;
      const delta = Number(quantityTrigger.dataset.delta || 0);
      const items = readCart();
      const item = items.find((entry) => entry.slug === slug);
      if (!item) return;
      setQuantity(slug, item.quantity + delta);
    }
  });

  updateCartPills();

  window.SmoothSamplesCart = {
    readCart,
    addItem,
    removeItem,
    setQuantity,
    totals,
    updateCartPills,
  };
})();
