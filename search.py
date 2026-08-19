import os
import re

from datetime import datetime

import requests

from dotenv import load_dotenv


load_dotenv()


AMADEUS_BASE_URL = os.getenv(
    "AMADEUS_BASE_URL",
    "https://test.api.amadeus.com"
).rstrip("/")


TOKEN_URL = (
    f"{AMADEUS_BASE_URL}"
    "/v1/security/oauth2/token"
)


class AmadeusError(Exception):

    pass


# =========================
# CREDENTIALS
# =========================

def _credentials():

    client_id = os.getenv(
        "AMADEUS_CLIENT_ID",
        ""
    ).strip()


    client_secret = os.getenv(
        "AMADEUS_CLIENT_SECRET",
        ""
    ).strip()


    if not client_id or not client_secret:

        raise AmadeusError(
            "Missing Amadeus credentials"
        )


    return (
        client_id,
        client_secret
    )


# =========================
# TOKEN
# =========================

def get_token():

    client_id, client_secret = _credentials()


    response = requests.post(

        TOKEN_URL,

        data={

            "grant_type":
                "client_credentials",

            "client_id":
                client_id,

            "client_secret":
                client_secret

        },

        timeout=20

    )


    if not response.ok:

        raise AmadeusError(

            "Token request failed: "
            f"{response.status_code} "
            f"{response.text[:500]}"

        )


    data = response.json()


    token = data.get(
        "access_token"
    )


    if not token:

        raise AmadeusError(
            "No access token returned"
        )


    return token


# =========================
# GET REQUEST
# =========================

def _get(
    path,
    params
):

    token = get_token()


    response = requests.get(

        f"{AMADEUS_BASE_URL}{path}",

        headers={

            "Authorization":
                f"Bearer {token}"

        },

        params=params,

        timeout=30

    )


    if not response.ok:

        raise AmadeusError(

            "GET failed: "
            f"{response.status_code} "
            f"{response.text[:800]}"

        )


    return response.json()


# =========================
# DURATION
# =========================

def _duration_minutes(
    value
):

    if not value:

        return None


    match = re.fullmatch(

        r"PT(?:(\d+)H)?(?:(\d+)M)?",

        value

    )


    if not match:

        return None


    hours = int(
        match.group(1) or 0
    )

    minutes = int(
        match.group(2) or 0
    )


    return (
        hours * 60
        + minutes
    )


def format_duration(
    value
):

    total = _duration_minutes(
        value
    )


    if total is None:

        return "—"


    hours, minutes = divmod(
        total,
        60
    )


    if hours and minutes:

        return (
            f"{hours}h "
            f"{minutes}m"
        )


    if hours:

        return f"{hours}h"


    return f"{minutes}m"


# =========================
# DATE/TIME
# =========================

def _parse_datetime(
    value
):

    try:

        return datetime.fromisoformat(

            value.replace(
                "Z",
                "+00:00"
            )

        )

    except (
        ValueError,
        AttributeError
    ):

        return None


def _format_time(
    value
):

    date = _parse_datetime(
        value
    )


    if not date:

        return "—"


    return date.strftime(
        "%H:%M"
    )


def _format_date(
    value
):

    date = _parse_datetime(
        value
    )


    if not date:

        return ""


    return date.strftime(
        "%Y-%m-%d"
    )


# =========================
# AIRLINE
# =========================

def _carrier_name(
    code,
    dictionaries
):

    carriers = dictionaries.get(
        "carriers",
        {}
    )


    return carriers.get(
        code,
        code or "Unknown"
    )


# =========================
# FLIGHTS
# =========================

def flights_search(

    origin,

    destination,

    departure,

    return_date="",

    adults=2

):

    if not departure:

        raise AmadeusError(
            "Departure date is required"
        )


    params = {

        "originLocationCode":
            origin.strip().upper(),

        "destinationLocationCode":
            destination.strip().upper(),

        "departureDate":
            departure,

        "adults":
            max(
                1,
                min(
                    int(adults),
                    9
                )
            ),

        "currencyCode":
            "EUR",

        "max":
            20

    }


    if return_date:

        params[
            "returnDate"
        ] = return_date


    payload = _get(

        "/v2/shopping/flight-offers",

        params

    )


    results = []


    for offer in payload.get(
        "data",
        []
    ):

        itineraries = offer.get(
            "itineraries",
            []
        )


        if not itineraries:

            continue


        outbound = itineraries[0]


        segments = outbound.get(
            "segments",
            []
        )


        if not segments:

            continue


        first = segments[0]

        last = segments[-1]


        flight = {

            "id":
                offer.get("id"),

            "airline":
                _carrier_name(

                    first.get(
                        "carrierCode"
                    ),

                    payload.get(
                        "dictionaries",
                        {}
                    )

                ),

            "airline_code":
                first.get(
                    "carrierCode",
                    ""
                ),

            "flight_number":
                (
                    f'{first.get("carrierCode", "")}'
                    f'{first.get("number", "")}'
                ),

            "origin":
                first.get(
                    "departure",
                    {}
                ).get(
                    "iataCode",
                    origin.upper()
                ),

            "destination":
                last.get(
                    "arrival",
                    {}
                ).get(
                    "iataCode",
                    destination.upper()
                ),

            "departure":
                _format_time(
                    first.get(
                        "departure",
                        {}
                    ).get("at")
                ),

            "arrival":
                _format_time(
                    last.get(
                        "arrival",
                        {}
                    ).get("at")
                ),

            "departure_date":
                _format_date(
                    first.get(
                        "departure",
                        {}
                    ).get("at")
                ),

            "arrival_date":
                _format_date(
                    last.get(
                        "arrival",
                        {}
                    ).get("at")
                ),

            "duration":
                format_duration(
                    outbound.get(
                        "duration"
                    )
                ),

            "duration_minutes":
                _duration_minutes(
                    outbound.get(
                        "duration"
                    )
                ),

            "stops":
                max(
                    0,
                    len(segments) - 1
                ),

            "price":
                float(
                    offer.get(
                        "price",
                        {}
                    ).get(
                        "grandTotal",
                        0
                    )
                    or 0
                ),

            "currency":
                offer.get(
                    "price",
                    {}
                ).get(
                    "currency",
                    "EUR"
                ),

            "segments":
                []

        }


        # =========================
        # SEGMENTS
        # =========================

        for segment in segments:

            flight[
                "segments"
            ].append({

                "from":
                    segment.get(
                        "departure",
                        {}
                    ).get(
                        "iataCode"
                    ),

                "to":
                    segment.get(
                        "arrival",
                        {}
                    ).get(
                        "iataCode"
                    ),

                "departure":
                    _format_time(
                        segment.get(
                            "departure",
                            {}
                        ).get("at")
                    ),

                "arrival":
                    _format_time(
                        segment.get(
                            "arrival",
                            {}
                        ).get("at")
                    ),

                "duration":
                    format_duration(
                        segment.get(
                            "duration"
                        )
                    ),

                "flight_number":
                    (
                        f'{segment.get("carrierCode", "")}'
                        f'{segment.get("number", "")}'
                    )

            })


        # =========================
        # RETURN FLIGHT
        # =========================

        if len(itineraries) > 1:

            inbound = itineraries[1]


            flight[
                "return_duration"
            ] = format_duration(

                inbound.get(
                    "duration"
                )

            )


            flight[
                "return_stops"
            ] = max(

                0,

                len(
                    inbound.get(
                        "segments",
                        []
                    )
                ) - 1

            )

        else:

            flight[
                "return_duration"
            ] = None


            flight[
                "return_stops"
            ] = None


        results.append(
            flight
        )


    return results


# =========================
# CITY → IATA
# =========================

def city_to_iata(
    city
):

    city = city.strip()


    if (
        len(city) == 3
        and city.isalpha()
    ):

        return city.upper()


    payload = _get(

        "/v1/reference-data/locations",

        {

            "subType":
                "CITY",

            "keyword":
                city,

            "page[limit]":
                5

        }

    )


    for item in payload.get(
        "data",
        []
    ):

        code = (

            item.get(
                "iataCode"
            )

            or

            item.get(
                "address",
                {}
            ).get(
                "cityCode"
            )

        )


        if code:

            return code.upper()


    raise AmadeusError(
        f"Could not find city: {city}"
    )


# =========================
# HOTEL IDS
# =========================

def _hotel_ids(
    city_code
):

    payload = _get(

        "/v1/reference-data/"
        "locations/hotels/by-city",

        {

            "cityCode":
                city_code,

            "radius":
                20,

            "radiusUnit":
                "KM"

        }

    )


    ids = []


    for item in payload.get(
        "data",
        []
    ):

        hotel_id = item.get(
            "hotelId"
        )


        if hotel_id:

            ids.append(
                hotel_id
            )


    return ids[:20]


# =========================
# FREE CANCELLATION
# =========================

def _free_cancel(
    offer
):

    cancellations = (

        offer.get(
            "policies",
            {}
        ).get(
            "cancellations",
            []
        )

        or []

    )


    for policy in cancellations:

        amount = str(
            policy.get(
                "amount",
                ""
            )
        ).strip()


        if amount in {
            "0",
            "0.0",
            "0.00"
        }:

            return True


        description = str(

            policy.get(
                "description",
                ""
            )

        ).lower()


        if "free" in description:

            return True


    return False


# =========================
# HOTELS
# =========================

def hotels_search(

    city,

    checkin,

    checkout,

    guests=2,

    rooms=1

):

    if not checkin or not checkout:

        raise AmadeusError(
            "Check-in and check-out dates are required"
        )


    city_code = city_to_iata(
        city
    )


    hotel_ids = _hotel_ids(
        city_code
    )


    if not hotel_ids:

        return []


    payload = _get(

        "/v3/shopping/hotel-offers",

        {

            "hotelIds":
                ",".join(
                    hotel_ids
                ),

            "adults":
                max(
                    1,
                    min(
                        int(guests),
                        9
                    )
                ),

            "checkInDate":
                checkin,

            "checkOutDate":
                checkout,

            "roomQuantity":
                max(
                    1,
                    min(
                        int(rooms),
                        10
                    )
                ),

            "currency":
                "EUR"

        }

    )


    results = []


    for item in payload.get(
        "data",
        []
    ):

        hotel = item.get(
            "hotel",
            {}
        )


        offers = item.get(
            "offers",
            []
        ) or []


        if not offers:

            continue


        offer = min(

            offers,

            key=lambda x:

                float(

                    x.get(
                        "price",
                        {}
                    ).get(
                        "total",
                        "999999999"
                    )

                    or

                    999999999

                )

        )


        price = offer.get(
            "price",
            {}
        )


        room = offer.get(
            "room",
            {}
        )


        description = room.get(
            "description",
            {}
        ).get(
            "text",
            ""
        )


        board_type = str(
            offer.get(
                "boardType",
                ""
            )
        ).upper()


        results.append({

            "id":
                hotel.get(
                    "hotelId"
                ),

            "name":
                hotel.get(
                    "name",
                    "Hotel"
                ),

            "rating":
                float(
                    hotel.get(
                        "rating",
                        0
                    )
                    or 0
                ),

            "reviews":
                0,

            "price":
                float(
                    price.get(
                        "total",
                        0
                    )
                    or 0
                ),

            "currency":
                price.get(
                    "currency",
                    "EUR"
                ),

            "breakfast":
                (
                    board_type
                    in {
                        "BREAKFAST",
                        "HALF_BOARD"
                    }

                    or

                    "breakfast"
                    in description.lower()
                ),

            "free_cancel":
                _free_cancel(
                    offer
                ),

            "lat":
                hotel.get(
                    "latitude"
                )

                or

                hotel.get(
                    "geoCode",
                    {}
                ).get(
                    "latitude"
                ),

            "lon":
                hotel.get(
                    "longitude"
                )

                or

                hotel.get(
                    "geoCode",
                    {}
                ).get(
                    "longitude"
                ),

            "room":
                description,

            "offer_id":
                offer.get(
                    "id"
                ),

            "checkin":
                offer.get(
                    "checkInDate",
                    checkin
                ),

            "checkout":
                offer.get(
                    "checkOutDate",
                    checkout
                )

        })


    return results
