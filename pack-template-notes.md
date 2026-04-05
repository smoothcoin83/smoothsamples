# Pack Template Notes

Use this file as the checklist for future cover-based packs.

## Files to create

- product page:
  - `product-<slug>.html`
- cover image:
  - `assets/packs/<cover-file>.png`
- optional downloadable pack:
  - `sample-packs/<Pack Name>.zip`

## Backend data to add

Add a new object in:

- `backend/data.py`

Recommended fields:

- `id`
- `slug`
- `title`
- `genre`
- `price_eur`
- `rating`
- `badge`
- `featured`
- `new_arrival`
- `formats`
- `summary`
- `description`
- `contents`
- `metric_labels`
- `cover_image`
- `tags`

## Frontend behavior already prepared

If `cover_image` exists in `backend/data.py`:

- homepage featured section can show the real cover
- homepage new arrivals can show the real cover
- catalog page can show the real cover

## Current best layout choice

For pack covers like the current hip hop drum kit:

- use the product page structure from:
  - `product-hip-hop-drum-kit-collection-vol-01.html`
- keep the cover in the left media column
- use a vertical cover-first layout
- keep the right summary column slightly more compact than the left artwork column
