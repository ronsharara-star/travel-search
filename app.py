import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

from search import flights_search, hotels_search


load_dotenv()


BASE_DIR = os.path.dirname(os.path.abspath(__file__))


app = FastAPI(
    title="Travel Search Mobile"
)


# =========================
# MAIN PAGE
# =========================

@app.get("/")
async def home():

    return FileResponse(
        os.path.join(
            BASE_DIR,
            "index.html"
        )
    )


# =========================
# JAVASCRIPT
# =========================

@app.get("/app.js")
async def javascript():

    return FileResponse(
        os.path.join(
            BASE_DIR,
            "app.js"
        ),
        media_type="application/javascript"
    )


# =========================
# CSS
# =========================

@app.get("/style.css")
async def stylesheet():

    return FileResponse(
        os.path.join(
            BASE_DIR,
            "style.css"
        ),
        media_type="text/css"
    )


# =========================
# HEALTH
# =========================

@app.get("/health")
async def health():

    return {
        "status": "ok"
    }


# =========================
# MANIFEST
# =========================

@app.get("/manifest.webmanifest")
async def manifest():

    return JSONResponse({

        "name":
            "Travel Search",

        "short_name":
            "Travel Search",

        "start_url":
            "/",

        "display":
            "standalone",

        "background_color":
            "#f4f6f8",

        "theme_color":
            "#111827",

        "icons": []

    })


# =========================
# FLIGHTS API
# =========================

@app.get("/api/flights")
async def api_flights(

    origin: str = "TLV",

    destination: str = "BKK",

    departure: str = "",

    return_date: str = "",

    adults: int = 2

):

    if not origin or not destination:

        raise HTTPException(
            status_code=400,
            detail="Origin and destination are required"
        )


    try:

        results = flights_search(

            origin,

            destination,

            departure,

            return_date,

            adults

        )


        if results:

            return {

                "source":
                    "live",

                "results":
                    results

            }


    except Exception as e:

        print(
            "Flight API error:",
            repr(e)
        )


    # =========================
    # DEMO FLIGHTS
    # =========================

    return {

        "source":
            "demo",

        "results":

        [

            {

                "airline":
                    "Thai Airways",

                "airline_code":
                    "TG",

                "flight_number":
                    "TG901",

                "origin":
                    origin.upper(),

                "destination":
                    destination.upper(),

                "departure":
                    "13:20",

                "arrival":
                    "06:00 +1",

                "duration":
                    "10h 40m",

                "duration_minutes":
                    640,

                "stops":
                    0,

                "price":
                    610,

                "currency":
                    "EUR"

            },

            {

                "airline":
                    "Emirates",

                "airline_code":
                    "EK",

                "flight_number":
                    "EK372",

                "origin":
                    origin.upper(),

                "destination":
                    destination.upper(),

                "departure":
                    "17:30",

                "arrival":
                    "12:10 +1",

                "duration":
                    "12h 40m",

                "duration_minutes":
                    760,

                "stops":
                    1,

                "price":
                    540,

                "currency":
                    "EUR"

            },

            {

                "airline":
                    "Qatar Airways",

                "airline_code":
                    "QR",

                "flight_number":
                    "QR831",

                "origin":
                    origin.upper(),

                "destination":
                    destination.upper(),

                "departure":
                    "16:00",

                "arrival":
                    "13:20 +1",

                "duration":
                    "13h 20m",

                "duration_minutes":
                    800,

                "stops":
                    1,

                "price":
                    515,

                "currency":
                    "EUR"

            },

            {

                "airline":
                    "EL AL",

                "airline_code":
                    "LY",

                "flight_number":
                    "LY81",

                "origin":
                    origin.upper(),

                "destination":
                    destination.upper(),

                "departure":
                    "22:10",

                "arrival":
                    "14:30 +1",

                "duration":
                    "11h 20m",

                "duration_minutes":
                    680,

                "stops":
                    0,

                "price":
                    680,

                "currency":
                    "EUR"

            }

        ]

    }


# =========================
# HOTELS API
# =========================

@app.get("/api/hotels")
async def api_hotels(

    city: str = "Bangkok",

    checkin: str = "",

    checkout: str = "",

    guests: int = 2,

    rooms: int = 1

):

    if not city:

        raise HTTPException(
            status_code=400,
            detail="City is required"
        )


    try:

        results = hotels_search(

            city,

            checkin,

            checkout,

            guests,

            rooms

        )


        if results:

            return {

                "source":
                    "live",

                "results":
                    results

            }


    except Exception as e:

        print(
            "Hotel API error:",
            repr(e)
        )


    # =========================
    # DEMO HOTELS
    # =========================

    return {

        "source":
            "demo",

        "results":

        [

            {

                "name":
                    "Bangkok Riverside Hotel",

                "rating":
                    4.7,

                "reviews":
                    1842,

                "price":
                    82,

                "currency":
                    "EUR",

                "breakfast":
                    True,

                "free_cancel":
                    True,

                "lat":
                    13.724,

                "lon":
                    100.515

            },

            {

                "name":
                    "Siam Grand Hotel",

                "rating":
                    4.5,

                "reviews":
                    923,

                "price":
                    65,

                "currency":
                    "EUR",

                "breakfast":
                    True,

                "free_cancel":
                    False,

                "lat":
                    13.746,

                "lon":
                    100.534

            },

            {

                "name":
                    "Chao Phraya Suites",

                "rating":
                    4.8,

                "reviews":
                    3201,

                "price":
                    110,

                "currency":
                    "EUR",

                "breakfast":
                    False,

                "free_cancel":
                    True,

                "lat":
                    13.718,

                "lon":
                    100.506

            },

            {

                "name":
                    "Sukhumvit Stay",

                "rating":
                    4.2,

                "reviews":
                    611,

                "price":
                    58,

                "currency":
                    "EUR",

                "breakfast":
                    True,

                "free_cancel":
                    True,

                "lat":
                    13.736,

                "lon":
                    100.560

            }

        ]

    }
