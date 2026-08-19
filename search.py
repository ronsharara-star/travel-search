import os
import requests
from dotenv import load_dotenv

load_dotenv()

AMADEUS_CLIENT_ID = os.getenv("AMADEUS_CLIENT_ID")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET")

AMADEUS_BASE_URL = "https://test.api.amadeus.com"


def token():
    """
    Get Amadeus OAuth access token.
    """

    if not AMADEUS_CLIENT_ID or not AMADEUS_CLIENT_SECRET:
        raise RuntimeError(
            "AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET is missing"
        )

    response = requests.post(
        f"{AMADEUS_BASE_URL}/v1/security/oauth2/token",
        data={
            "grant_type": "client_credentials",
            "client_id": AMADEUS_CLIENT_ID,
            "client_secret": AMADEUS_CLIENT_SECRET,
        },
        timeout=30,
    )

    response.raise_for_status()

    data = response.json()

    return data["access_token"]


def flights_search(
    origin,
    destination,
    departure,
    return_date=None,
    adults=1,
):
    """
    Search flights using Amadeus Flight Offers Search API.
    """

    access_token = token()

    params = {
        "originLocationCode": origin.upper(),
        "destinationLocationCode": destination.upper(),
        "departureDate": departure,
        "adults": int(adults),
        "currencyCode": "USD",
        "max": 20,
    }

    if return_date:
        params["returnDate"] = return_date

    response = requests.get(
        f"{AMADEUS_BASE_URL}/v2/shopping/flight-offers",
        headers={
            "Authorization": f"Bearer {access_token}"
        },
        params=params,
        timeout=40,
    )

    response.raise_for_status()

    data = response.json()

    results = []

    for offer in data.get("data", []):

        price = (
            offer.get("price", {})
            .get("grandTotal", 0)
        )

        itineraries = offer.get("itineraries", [])

        if not itineraries:
            continue

        first_itinerary = itineraries[0]

        segments = first_itinerary.get(
            "segments",
            []
        )

        if not segments:
            continue

        first_segment = segments[0]
        last_segment = segments[-1]

        departure_info = first_segment.get(
            "departure",
            {}
        )

        arrival_info = last_segment.get(
            "arrival",
            {}
        )

        carrier_codes = offer.get(
            "validatingAirlineCodes",
            []
        )

        airline = (
            carrier_codes[0]
            if carrier_codes
            else "Airline"
        )

        stops = max(
            len(segments) - 1,
            0
        )

        results.append(
            {
                "airline": airline,

                "origin": departure_info.get(
                    "iataCode",
                    origin.upper()
                ),

                "destination": arrival_info.get(
                    "iataCode",
                    destination.upper()
                ),

                "departure": departure_info.get(
                    "at",
                    ""
                ),

                "arrival": arrival_info.get(
                    "at",
                    ""
                ),

                "price": float(price),

                "stops": stops,
            }
        )

    return results


def hotels_search(
    city,
    checkin,
    checkout,
    guests=2,
    rooms=1,
):
    """
    Search hotels using Amadeus.
    """

    access_token = token()

    # ---------------------------------
    # 1. Find city information
    # ---------------------------------

    city_params = {
        "keyword": city,
        "subType": "CITY",
    }

    city_response = requests.get(
        f"{AMADEUS_BASE_URL}/v1/reference-data/locations",
        headers={
            "Authorization": f"Bearer {access_token}"
        },
        params=city_params,
        timeout=30,
    )

    city_response.raise_for_status()

    city_data = city_response.json()

    locations = city_data.get(
        "data",
        []
    )

    if not locations:
        return []

    location = locations[0]

    iata_code = location.get(
        "iataCode"
    )

    if not iata_code:
        return []

    # ---------------------------------
    # 2. Find hotels
    # ---------------------------------

    hotel_params = {
        "cityCode": iata_code,
        "radius": 20,
        "radiusUnit": "KM",
        "hotelSource": "ALL",
    }

    hotel_response = requests.get(
        f"{AMADEUS_BASE_URL}/v1/reference-data/locations/hotels/by-city",
        headers={
            "Authorization": f"Bearer {access_token}"
        },
        params=hotel_params,
        timeout=40,
    )

    hotel_response.raise_for_status()

    hotel_data = hotel_response.json()

    hotels = hotel_data.get(
        "data",
        []
    )

    if not hotels:
        return []

    # ---------------------------------
    # 3. Get hotel offers
    # ---------------------------------

    hotel_ids = []

    for hotel in hotels[:20]:

        hotel_id = hotel.get(
            "hotelId"
        )

        if hotel_id:
            hotel_ids.append(
                hotel_id
            )

    if not hotel_ids:
        return []

    offers_params = {
        "hotelIds": ",".join(hotel_ids),
        "checkInDate": checkin,
        "checkOutDate": checkout,
        "adults": int(guests),
        "roomQuantity": int(rooms),
        "currency": "USD",
        "bestRateOnly": "true",
        "view": "FULL",
    }

    offers_response = requests.get(
        f"{AMADEUS_BASE_URL}/v3/shopping/hotel-offers",
        headers={
            "Authorization": f"Bearer {access_token}"
        },
        params=offers_params,
        timeout=60,
    )

    if not offers_response.ok:
        return []

    offers_data = offers_response.json()

    results = []

    for hotel in offers_data.get(
        "data",
        []
    ):

        hotel_info = hotel.get(
            "hotel",
            {}
        )

        offers = hotel.get(
            "offers",
            []
        )

        if not offers:
            continue

        offer = offers[0]

        price_info = offer.get(
            "price",
            {}
        )

        price = price_info.get(
            "total",
            0
        )

        geo = hotel_info.get(
            "latitude"
        )

        lon = hotel_info.get(
            "longitude"
        )

        rating = hotel_info.get(
            "rating",
            0
        )

        address = hotel_info.get(
            "address",
            {}
        )

        results.append(
            {
                "name": hotel_info.get(
                    "name",
                    "Hotel"
                ),

                "rating": rating,

                "reviews": 0,

                "price": float(price or 0),

                "lat": hotel_info.get(
                    "latitude"
                ),

                "lon": hotel_info.get(
                    "longitude"
                ),

                "address": address,

                "currency": price_info.get(
                    "currency",
                    "USD"
                ),

                "checkin": checkin,

                "checkout": checkout,
            }
        )

    return results
