import os
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from dotenv import load_dotenv

from search import flights_search, hotels_search

load_dotenv()

app = FastAPI(title="Travel Search Mobile")


@app.get("/", response_class=HTMLResponse)
async def home():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.get("/style.css")
async def style():
    return FileResponse("style.css", media_type="text/css")


@app.get("/app.js")
async def javascript():
    return FileResponse("app.js", media_type="application/javascript")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/flights")
async def api_flights(
    origin="TLV",
    destination="BKK",
    departure="",
    return_date="",
    adults: int = 2
):
    try:
        results = flights_search(
            origin,
            destination,
            departure,
            return_date,
            adults
        )
        source = "live"
    except Exception:
        results = []
        source = "demo"

    if not results:
        results = [
            {
                "airline": "Thai Airways",
                "origin": origin.upper(),
                "destination": destination.upper(),
                "departure": "13:20",
                "arrival": "06:00 +1",
                "stops": 0,
                "price": 610
            },
            {
                "airline": "Emirates",
                "origin": origin.upper(),
                "destination": destination.upper(),
                "departure": "17:30",
                "arrival": "12:10 +1",
                "stops": 1,
                "price": 540
            },
            {
                "airline": "Qatar Airways",
                "origin": origin.upper(),
                "destination": destination.upper(),
                "departure": "16:00",
                "arrival": "13:20 +1",
                "stops": 1,
                "price": 515
            }
        ]

        source = "demo"

    return {
        "source": source,
        "results": results
    }


@app.get("/api/hotels")
async def api_hotels(
    city="Bangkok",
    checkin="",
    checkout="",
    guests: int = 2,
    rooms: int = 1
):
    try:
        results = hotels_search(
            city,
            checkin,
            checkout,
            guests,
            rooms
        )
        source = "live"
    except Exception:
        results = []
        source = "demo"

    if not results:
        results = [
            {
                "name": "Bangkok Riverside Hotel",
                "rating": 4.7,
                "reviews": 1842,
                "price": 82,
                "breakfast": True,
                "free_cancel": True,
                "lat": 13.724,
                "lon": 100.515
            },
            {
                "name": "Siam Grand Hotel",
                "rating": 4.5,
                "reviews": 923,
                "price": 65,
                "breakfast": True,
                "free_cancel": False,
                "lat": 13.746,
                "lon": 100.534
            },
            {
                "name": "Chao Phraya Suites",
                "rating": 4.8,
                "reviews": 3201,
                "price": 110,
                "breakfast": False,
                "free_cancel": True,
                "lat": 13.718,
                "lon": 100.506
            },
            {
                "name": "Sukhumvit Stay",
                "rating": 4.2,
                "reviews": 611,
                "price": 58,
                "breakfast": True,
                "free_cancel": True,
                "lat": 13.736,
                "lon": 100.560
            }
        ]

        source = "demo"

    return {
        "source": source,
        "results": results
    }


@app.get("/manifest.webmanifest")
async def manifest():
    return JSONResponse({
        "name": "Travel Search",
        "short_name": "Travel Search",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#f4f6f8",
        "theme_color": "#111827",
        "icons": []
    })
