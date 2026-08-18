import os
import requests

from dotenv import load_dotenv


load_dotenv()


BASE = "https://test.api.amadeus.com"


def token():

    client_id = os.getenv(
        "AMADEUS_CLIENT_ID"
    )

    client_secret = os.getenv(
        "AMADEUS_CLIENT_SECRET"
    )


    if not client_id or not client_secret:

        raise RuntimeError(
            "Missing Amadeus credentials"
        )


    response = requests.post(

        BASE +
        "/v1/security/oauth2/token",

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


    response.raise_for_status()


    return response.json()["access_token"]


def flights_search(
    origin,
    destination,
    departure,
    return_date,
    adults
):

    access_token = token()


    params = {

        "originLocationCode":
            origin.upper(),

        "destinationLocationCode":
            destination.upper(),

        "departureDate":
            departure,

        "adults":
            adults,

        "currencyCode":
            "USD",

        "max":
            50

    }


    if return_date:

        params["returnDate"] = return_date


    response = requests.get(

        BASE +
        "/v2/shopping/flight-offers",

        headers={

            "Authorization":
                "Bearer " +
                access_token

        },

        params=params,

        timeout=30

    )


    response.raise_for_status()


    data =
        response.json().get(
            "data",
            []
        )


    results = []


    for offer in data:

        itineraries =
            offer.get(
                "itineraries",
                []
            )


        if not itineraries:

            continue


        first_itinerary =
            itineraries[0]


        segments =
            first_itinerary.get(
                "segments",
                []
            )


        if not segments:

            continue


        first =
            segments[0]

        last =
            segments[-1]


        stops =
            sum(
                max(
                    0,
                    len(
                        item.get(
                            "segments",
                            []
                        )
                    ) - 1
                )
                for item in itineraries
            )


        airline_codes =
            offer.get(
                "validatingAirlineCodes",
                ["?"]
            )


        price =
            float(
                offer
                ["price"]
                ["grandTotal"]
            )


        results.append({

            "airline":
                airline_codes[0],

            "origin":
                first["departure"]
                ["iataCode"],

            "destination":
                last["arrival"]
                ["iataCode"],

            "departure":
                first["departure"]
                .get("at", ""),

            "arrival":
                last["arrival"]
                .get("at", ""),

            "stops":
                stops,

            "price":
                price

        })


    return results


def city_code(city):

    access_token = token()


    response = requests.get(

        BASE +
        "/v1/reference-data/locations",

        headers={

            "Authorization":
                "Bearer " +
                access_token

        },

        params={

            "subType":
                "CITY",

            "keyword":
                city,

            "page[limit]":
                5

        },

        timeout=20

    )


    response.raise_for_status()


    data =
        response.json().get(
            "data",
            []
        )


    if not data:

        raise RuntimeError(
            "City not found"
        )


    return data[0]["iataCode"]


def hotels_search(
    city,
    checkin,
    checkout,
    guests,
    rooms
):

    access_token = token()


    code =
        city_code(city)


    response = requests.get(

        BASE +
        "/v1/reference-data/locations/hotels/by-city",

        headers={

            "Authorization":
                "Bearer " +
                access_token

        },

        params={

            "cityCode":
                code,

            "radius":
                30,

            "radiusUnit":
                "KM",

            "hotelSource":
                "ALL"

        },

        timeout=30

    )


    response.raise_for_status()


    hotels =
        response.json().get(
            "data",
            []
        )


    hotel_ids =
        ",".join(

            item["hotelId"]

            for item in hotels[:40]

            if item.get("hotelId")

        )


    if not hotel_ids:

        return []


    response = requests.get(

        BASE +
        "/v3/shopping/hotel-offers",

        headers={

            "Authorization":
                "Bearer " +
                access_token

        },

        params={

            "hotelIds":
                hotel_ids,

            "checkInDate":
                checkin,

            "checkOutDate":
                checkout,

            "adults":
                guests,

            "roomQuantity":
                rooms,

            "currency":
                "USD"

        },

        timeout=40

    )


    response.raise_for_status()


    data =
        response.json().get(
            "data",
            []
        )


    results = []


    for item in data:

        hotel =
            item.get(
                "hotel",
                {}
            )


        offers =
            item.get(
                "offers",
                []
            )


        if not offers:

            continue


        try:

            price =
                float(
                    offers[0]
                    ["price"]
                    ["total"]
                )

        except Exception:

            continue


        results.append({

            "name":
                hotel.get(
                    "name",
                    "Hotel"
                ),

            "rating":
                float(
                    hotel.get(
                        "rating"
                    ) or 0
                ),

            "reviews":
                0,

            "price":
                price,

            "breakfast":
                False,

            "free_cancel":
                False,

            "lat":
                hotel.get(
                    "latitude"
                ),

            "lon":
                hotel.get(
                    "longitude"
                )

        })


    return results
