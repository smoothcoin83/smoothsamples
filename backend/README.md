# Smooth Samples Backend

Minimal backend for the current storefront prototype.

## What it does

- serves a health endpoint
- returns the list of genres
- returns the full catalog
- returns one pack by slug
- supports basic filters for `genre`, `featured`, and `q`

## Run locally

```bash
cd backend
python3 app.py
```

The API starts on:

`http://127.0.0.1:8000`

## Available endpoints

- `GET /api/health`
- `GET /api/genres`
- `GET /api/packs`
- `GET /api/packs?genre=Trap`
- `GET /api/packs?featured=true`
- `GET /api/packs?q=dark`
- `GET /api/packs/midnight-pressure`

## Notes

- This version uses in-memory data from `data.py`.
- It is a good first step before moving to a real database.
- CORS is enabled for local frontend testing.
