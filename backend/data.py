PACKS = [
    {
        "id": 1,
        "slug": "midnight-pressure",
        "title": "Midnight Pressure",
        "genre": "Trap",
        "price_eur": 29,
        "rating": 4.9,
        "badge": "Top Seller",
        "featured": True,
        "new_arrival": False,
        "formats": ["WAV", "MIDI"],
        "summary": "Dark melodic loops, hard drums, and sharp textures for modern trap beats.",
        "description": (
            "A dark trap-focused pack built around tense melodies, hard drums, "
            "and fast workflow for modern beat production."
        ),
        "contents": {
            "loops": 58,
            "one_shots": 24,
            "presets": 0,
            "stems": 0,
        },
        "tags": ["trap", "dark", "melodic", "drill-friendly"],
    },
    {
        "id": 2,
        "slug": "dust-and-color",
        "title": "Dust & Color",
        "genre": "Lo-Fi",
        "price_eur": 24,
        "rating": 4.8,
        "badge": "Editor Pick",
        "featured": True,
        "new_arrival": True,
        "formats": ["WAV", "Stems"],
        "summary": "Warm keys, dusty textures, and soft percussion for lo-fi sessions.",
        "description": (
            "A lo-fi pack with warm harmony, dusty textures, and intimate rhythm "
            "layers made for soulful beatmaking."
        ),
        "contents": {
            "loops": 44,
            "one_shots": 0,
            "presets": 0,
            "stems": 18,
        },
        "tags": ["lo-fi", "dusty", "warm", "soulful"],
    },
    {
        "id": 3,
        "slug": "neon-motion",
        "title": "Neon Motion",
        "genre": "House",
        "price_eur": 32,
        "rating": 4.7,
        "badge": "Club Ready",
        "featured": False,
        "new_arrival": True,
        "formats": ["WAV", "Presets"],
        "summary": "Bright movement, modern bass loops, and late-night club energy.",
        "description": (
            "A house pack with bright leads, movement-driven bass loops, and "
            "club-ready material for fast arrangement."
        ),
        "contents": {
            "loops": 62,
            "one_shots": 0,
            "presets": 15,
            "stems": 0,
        },
        "tags": ["house", "club", "modern", "night"],
    },
    {
        "id": 4,
        "slug": "concrete-drill",
        "title": "Concrete Drill",
        "genre": "Drill",
        "price_eur": 31,
        "rating": 4.6,
        "badge": "Trending",
        "featured": False,
        "new_arrival": False,
        "formats": ["WAV", "Stems"],
        "summary": "Raw drums, sharp slides, and stripped aggression for drill production.",
        "description": (
            "A drill-oriented pack built around aggressive drum work, heavy low end, "
            "and cold melodic tension."
        ),
        "contents": {
            "loops": 48,
            "one_shots": 0,
            "presets": 0,
            "stems": 8,
        },
        "tags": ["drill", "808", "raw", "aggressive"],
    },
]


def list_packs():
    return PACKS


def list_genres():
    return sorted({pack["genre"] for pack in PACKS})


def get_pack_by_slug(slug):
    for pack in PACKS:
        if pack["slug"] == slug:
            return pack
    return None


def filter_packs(genre=None, featured=None, q=None):
    items = PACKS

    if genre:
        items = [pack for pack in items if pack["genre"].lower() == genre.lower()]

    if featured is not None:
        items = [pack for pack in items if pack["featured"] is featured]

    if q:
        needle = q.strip().lower()
        if needle:
            items = [
                pack
                for pack in items
                if needle in pack["title"].lower()
                or needle in pack["summary"].lower()
                or any(needle in tag.lower() for tag in pack["tags"])
            ]

    return items
