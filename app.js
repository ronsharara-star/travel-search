"use strict";


/* =========================
   GLOBAL DATA
========================= */

let flightData = [];

let hotelData = [];

let map = null;

let hotelMarkers = [];

let mapReady = false;


/* =========================
   CURRENCY
========================= */

const currencyRates = {

    EUR: 1,

    ILS: 4.05,

    USD: 1.09,

    THB: 38.5,

    GBP: 0.86,

    JPY: 171,

    CAD: 1.49,

    AUD: 1.65,

    CHF: 0.95,

    SGD: 1.46

};


const currencySymbols = {

    ILS: "₪",

    USD: "$",

    THB: "฿",

    EUR: "€",

    GBP: "£",

    JPY: "¥",

    CAD: "C$",

    AUD: "A$",

    CHF: "CHF",

    SGD: "S$"

};


/* =========================
   HELPERS
========================= */

function $(id) {

    return document.getElementById(id);

}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function todayString() {

    const date = new Date();

    const offset =
        date.getTimezoneOffset();

    const local =
        new Date(
            date.getTime()
            -
            offset * 60000
        );

    return local
        .toISOString()
        .slice(0, 10);

}


function tomorrowString() {

    const date =
        new Date();

    date.setDate(
        date.getDate() + 1
    );

    const offset =
        date.getTimezoneOffset();

    const local =
        new Date(
            date.getTime()
            -
            offset * 60000
        );

    return local
        .toISOString()
        .slice(0, 10);

}


function convertFromEUR(
    value,
    currency
) {

    const rate =
        currencyRates[currency]
        || 1;

    return Number(value || 0)
        * rate;

}


function formatMoney(
    value,
    originalCurrency = "EUR"
) {

    const currency =
        $("currency").value;

    let eurValue =
        Number(value || 0);


    if (
        originalCurrency
        !== "EUR"
        &&
        currencyRates[
            originalCurrency
        ]
    ) {

        eurValue =
            eurValue
            /
            currencyRates[
                originalCurrency
            ];

    }


    const converted =
        convertFromEUR(
            eurValue,
            currency
        );


    const symbol =
        currencySymbols[
            currency
        ] || currency;


    return (
        symbol
        +
        converted.toLocaleString(
            "en-US",
            {
                maximumFractionDigits:
                    currency === "JPY"
                    ? 0
                    : 0
            }
        )
    );

}


/* =========================
   LOADING
========================= */

function showLoading(
    text = "מחפש..."
) {

    $("loadingText")
        .textContent = text;

    $("loading")
        .hidden = false;

}


function hideLoading() {

    $("loading")
        .hidden = true;

}


/* =========================
   TABS
========================= */

function showFlights() {

    $("flights")
        .hidden = false;

    $("hotels")
        .hidden = true;

    $("fb")
        .classList.add("active");

    $("hb")
        .classList.remove("active");

}


function showHotels() {

    $("flights")
        .hidden = true;

    $("hotels")
        .hidden = false;

    $("fb")
        .classList.remove("active");

    $("hb")
        .classList.add("active");


    setTimeout(
        () => {

            if (map) {

                map.invalidateSize();

            }

        },
        200
    );

}


$("fb")
    .addEventListener(
        "click",
        showFlights
    );


$("hb")
    .addEventListener(
        "click",
        showHotels
    );


/* =========================
   FLIGHTS SEARCH
========================= */

async function searchFlights() {

    const origin =
        $("from")
            .value
            .trim()
            .toUpperCase();


    const destination =
        $("to")
            .value
            .trim()
            .toUpperCase();


    const departure =
        $("dep")
            .value;


    const returnDate =
        $("ret")
            .value;


    const adults =
        Number(
            $("adults")
                .value
        ) || 1;


    if (!origin) {

        alert(
            "נא להזין שדה מוצא"
        );

        return;

    }


    if (!destination) {

        alert(
            "נא להזין יעד"
        );

        return;

    }


    if (!departure) {

        alert(
            "נא לבחור תאריך יציאה"
        );

        return;

    }


    if (
        returnDate
        &&
        returnDate < departure
    ) {

        alert(
            "תאריך החזרה חייב להיות אחרי תאריך היציאה"
        );

        return;

    }


    showLoading(
        "מחפש טיסות..."
    );


    try {

        const params =
            new URLSearchParams({

                origin,

                destination,

                departure,

                return_date:
                    returnDate,

                adults:
                    String(adults)

            });


        const response =
            await fetch(
                `/api/flights?${params}`
            );


        if (!response.ok) {

            throw new Error(
                "Flight search failed"
            );

        }


        const data =
            await response.json();


        flightData =
            Array.isArray(
                data.results
            )
            ? data.results
            : [];


        $("flightFilters")
            .hidden =
            flightData.length === 0;


        renderFlights();


    } catch (error) {

        console.error(
            error
        );


        $("flightResults")
            .innerHTML = `

                <div class="errorBox">

                    ❌ לא הצלחנו לבצע את החיפוש.

                </div>

            `;

    } finally {

        hideLoading();

    }

}


$("fs")
    .addEventListener(
        "click",
        searchFlights
    );


/* =========================
   FLIGHT RENDER
========================= */

function renderFlights() {

    const search =
        $("flightSearch")
            .value
            .trim()
            .toLowerCase();


    const sort =
        $("sortFlights")
            .value;


    const stops =
        $("stopsFilter")
            .value;


    const maxPrice =
        Number(
            $("maxFlightPrice")
                .value
        ) || Infinity;


    let results =
        flightData.filter(
            flight => {

                const airline =
                    String(
                        flight.airline
                        || ""
                    )
                    .toLowerCase();


                const matchesSearch =
                    !search
                    ||
                    airline.includes(
                        search
                    );


                let matchesStops =
                    true;


                if (
                    stops !== "all"
                ) {

                    if (
                        stops === "2"
                    ) {

                        matchesStops =
                            Number(
                                flight.stops
                                || 0
                            ) >= 2;

                    } else {

                        matchesStops =
                            Number(
                                flight.stops
                                || 0
                            )
                            ===
                            Number(
                                stops
                            );

                    }

                }


                const price =
                    convertFromEUR(
                        flight.price,
                        $("currency").value
                    );


                const matchesPrice =
                    price <= maxPrice;


                return (
                    matchesSearch
                    &&
                    matchesStops
                    &&
                    matchesPrice
                );

            }
        );


    results.sort(
        (a, b) => {

            if (
                sort ===
                "priceAsc"
            ) {

                return (
                    Number(a.price || 0)
                    -
                    Number(b.price || 0)
                );

            }


            if (
                sort ===
                "priceDesc"
            ) {

                return (
                    Number(b.price || 0)
                    -
                    Number(a.price || 0)
                );

            }


            if (
                sort ===
                "durationAsc"
            ) {

                return (
                    Number(
                        a.duration_minutes
                        || 99999
                    )
                    -
                    Number(
                        b.duration_minutes
                        || 99999
                    )
                );

            }


            if (
                sort ===
                "stopsAsc"
            ) {

                return (
                    Number(
                        a.stops || 0
                    )
                    -
                    Number(
                        b.stops || 0
                    )
                );

            }


            return 0;

        }
    );


    if (!results.length) {

        $("flightResults")
            .innerHTML = `

                <div class="emptyBox">

                    אין טיסות התואמות את הסינון.

                </div>

            `;

        return;

    }


    $("flightResults")
        .innerHTML = results
        .map(
            renderFlight
        )
        .join("");

}


function renderFlight(
    flight
) {

    const stops =
        Number(
            flight.stops || 0
        );


    const stopText =
        stops === 0
        ? "ישירה"
        : `${stops} עצירות`;


    const returnText =
        flight.return_duration
        ? `↩️ חזור: ${escapeHtml(
            flight.return_duration
        )}`
        : "";


    return `

        <article class="flightCard">

            <div class="flightTop">

                <div>

                    <div class="airlineName">

                        ✈️

                        ${escapeHtml(
                            flight.airline
                            || "Airline"
                        )}

                    </div>


                    <div class="flightNumber">

                        ${escapeHtml(
                            flight.flight_number
                            || ""
                        )}

                    </div>

                </div>


                <div class="price">

                    ${formatMoney(
                        flight.price,
                        flight.currency
                    )}

                </div>

            </div>


            <div class="flightRoute">

                <div class="airport">

                    <strong>
                        ${escapeHtml(
                            flight.origin
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            flight.departure
                        )}
                    </span>

                </div>


                <div class="routeLine">

                    <div>
                        ✈️
                    </div>

                    <span>
                        ${escapeHtml(
                            flight.duration
                            || "—"
                        )}
                    </span>

                    <small>
                        ${escapeHtml(
                            stopText
                        )}
                    </small>

                </div>


                <div class="airport">

                    <strong>
                        ${escapeHtml(
                            flight.destination
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            flight.arrival
                        )}
                    </span>

                </div>

            </div>


            <div class="flightDetails">

                <span>
                    ⏱️ משך:
                    ${escapeHtml(
                        flight.duration
                        || "—"
                    )}
                </span>


                <span>
                    🔄 ${escapeHtml(
                        stopText
                    )}
                </span>


                <span>
                    ${escapeHtml(
                        returnText
                    )}
                </span>

            </div>

        </article>

    `;

}


/* =========================
   FLIGHT FILTER EVENTS
========================= */

[
    "flightSearch",
    "sortFlights",
    "stopsFilter",
    "maxFlightPrice"
].forEach(
    id => {

        $(id)
            .addEventListener(
                "input",
                renderFlights
            );

        $(id)
            .addEventListener(
                "change",
                renderFlights
            );

    }
);


/* =========================
   HOTELS SEARCH
========================= */

async function searchHotels() {

    const city =
        $("city")
            .value
            .trim();


    const checkin =
        $("checkin")
            .value;


    const checkout =
        $("checkout")
            .value;


    const guests =
        Number(
            $("guests")
                .value
        ) || 1;


    const rooms =
        Number(
            $("rooms")
                .value
        ) || 1;


    if (!city) {

        alert(
            "נא להזין יעד"
        );

        return;

    }


    if (!checkin) {

        alert(
            "נא לבחור תאריך כניסה"
        );

        return;

    }


    if (!checkout) {

        alert(
            "נא לבחור תאריך יציאה"
        );

        return;

    }


    if (
        checkout <= checkin
    ) {

        alert(
            "תאריך היציאה חייב להיות אחרי תאריך הכניסה"
        );

        return;

    }


    showLoading(
        "מחפש מלונות..."
    );


    try {

        const params =
            new URLSearchParams({

                city,

                checkin,

                checkout,

                guests:
                    String(guests),

                rooms:
                    String(rooms)

            });


        const response =
            await fetch(
                `/api/hotels?${params}`
            );


        if (!response.ok) {

            throw new Error(
                "Hotel search failed"
            );

        }


        const data =
            await response.json();


        hotelData =
            Array.isArray(
                data.results
            )
            ? data.results
            : [];


        $("hotelFilters")
            .hidden =
            hotelData.length === 0;


        renderHotels();

        updateMap();


    } catch (error) {

        console.error(
            error
        );


        $("hotelResults")
            .innerHTML = `

                <div class="errorBox">

                    ❌ לא הצלחנו לבצע את חיפוש המלונות.

                </div>

            `;

    } finally {

        hideLoading();

    }

}


$("hs")
    .addEventListener(
        "click",
        searchHotels
    );


/* =========================
   HOTEL RENDER
========================= */

function renderHotels() {

    const search =
        $("hotelSearch")
            .value
            .trim()
            .toLowerCase();


    const minRating =
        Number(
            $("minRating")
                .value
        ) || 0;


    const maxPriceInput =
        Number(
            $("maxPrice")
                .value
        );


    const maxPrice =
        maxPriceInput > 0
        ? maxPriceInput
        : Infinity;


    const breakfast =
        $("breakfastFilter")
            .checked;


    const cancel =
        $("cancelFilter")
            .checked;


    const sort =
        $("sortHotels")
            .value;


    let results =
        hotelData.filter(
            hotel => {

                const name =
                    String(
                        hotel.name
                        || ""
                    )
                    .toLowerCase();


                const rating =
                    Number(
                        hotel.rating
                        || 0
                    );


                const price =
                    convertFromEUR(
                        hotel.price,
                        hotel.currency
                    );


                if (
                    search
                    &&
                    !name.includes(
                        search
                    )
                ) {

                    return false;

                }


                if (
                    rating < minRating
                ) {

                    return false;

                }


                if (
                    price > maxPrice
                ) {

                    return false;

                }


                if (
                    breakfast
                    &&
                    !hotel.breakfast
                ) {

                    return false;

                }


                if (
                    cancel
                    &&
                    !hotel.free_cancel
                ) {

                    return false;

                }


                return true;

            }
        );


    results.sort(
        (a, b) => {

            if (
                sort ===
                "priceAsc"
            ) {

                return (
                    Number(a.price || 0)
                    -
                    Number(b.price || 0)
                );

            }


            if (
                sort ===
                "priceDesc"
            ) {

                return (
                    Number(b.price || 0)
                    -
                    Number(a.price || 0)
                );

            }


            if (
                sort ===
                "ratingDesc"
            ) {

                return (
                    Number(b.rating || 0)
                    -
                    Number(a.rating || 0)
                );

            }


            if (
                sort ===
                "reviewsDesc"
            ) {

                return (
                    Number(b.reviews || 0)
                    -
                    Number(a.reviews || 0)
                );

            }


            return 0;

        }
    );


    if (!results.length) {

        $("hotelResults")
            .innerHTML = `

                <div class="emptyBox">

                    אין מלונות התואמים את הסינון.

                </div>

            `;

        return;

    }


    $("hotelResults")
        .innerHTML = results
        .map(
            renderHotel
        )
        .join("");

}


function renderHotel(
    hotel
) {

    const rating =
        Number(
            hotel.rating || 0
        );


    const stars =
        rating > 0
        ? "⭐ " + rating.toFixed(1)
        : "⭐ ללא דירוג";


    const breakfast =
        hotel.breakfast
        ? "🍳 ארוחת בוקר"
        : "";


    const cancel =
        hotel.free_cancel
        ? "✓ ביטול חינם"
        : "";


    return `

        <article
            class="hotelCard"
            data-hotel-id="${escapeHtml(
                hotel.id || ""
            )}"
        >

            <div class="hotelTop">

                <div>

                    <h3>
                        ${escapeHtml(
                            hotel.name
                        )}
                    </h3>


                    <div class="rating">

                        ${stars}

                        ${
                            hotel.reviews
                            ? `(${Number(
                                hotel.reviews
                            ).toLocaleString()})`
                            : ""
                        }

                    </div>

                </div>


                <div class="price">

                    ${formatMoney(
                        hotel.price,
                        hotel.currency
                    )}

                    <small>
                        ללילה / הצעה
                    </small>

                </div>

            </div>


            <div class="hotelFeatures">

                ${
                    breakfast
                    ? `<span>${breakfast}</span>`
                    : ""
                }


                ${
                    cancel
                    ? `<span>${cancel}</span>`
                    : ""
                }

            </div>


            ${
                hotel.room
                ? `
                    <div class="roomInfo">

                        🛏️

                        ${escapeHtml(
                            hotel.room
                        )}

                    </div>
                `
                : ""
            }

        </article>

    `;

}


/* =========================
   HOTEL FILTER EVENTS
========================= */

[
    "hotelSearch",
    "sortHotels",
    "minRating",
    "maxPrice",
    "breakfastFilter",
    "cancelFilter"
].forEach(
    id => {

        $(id)
            .addEventListener(
                "input",
                () => {

                    renderHotels();

                    updateMap();

                }
            );


        $(id)
            .addEventListener(
                "change",
                () => {

                    renderHotels();

                    updateMap();

                }
            );

    }
);


/* =========================
   MAP
========================= */

function initializeMap() {

    if (
        typeof L === "undefined"
    ) {

        console.error(
            "Leaflet is not loaded"
        );

        return;

    }


    if (map) {

        return;

    }


    map =
        L.map(
            "map"
        ).setView(
            [13.7563, 100.5018],
            11
        );


    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap"

        }

    ).addTo(map);


    mapReady = true;

}


initializeMap();


function clearMarkers() {

    hotelMarkers.forEach(
        marker => {

            map.removeLayer(
                marker
            );

        }
    );


    hotelMarkers = [];

}


function updateMap() {

    if (!mapReady) {

        return;

    }


    clearMarkers();


    const visibleHotels =
        getFilteredHotels();


    const bounds = [];


    visibleHotels.forEach(
        hotel => {

            const lat =
                Number(
                    hotel.lat
                );


            const lon =
                Number(
                    hotel.lon
                );


            if (
                !Number.isFinite(lat)
                ||
                !Number.isFinite(lon)
            ) {

                return;

            }


            const marker =
                L.marker([
                    lat,
                    lon
                ]).addTo(map);


            marker.bindPopup(`

                <strong>

                    ${escapeHtml(
                        hotel.name
                    )}

                </strong>

                <br>

                ⭐ ${Number(
                    hotel.rating || 0
                ).toFixed(1)}

                <br>

                💰 ${formatMoney(
                    hotel.price,
                    hotel.currency
                )}

            `);


            hotelMarkers.push(
                marker
            );


            bounds.push([
                lat,
                lon
            ]);

        }
    );


    if (bounds.length) {

        map.fitBounds(
            bounds,
            {
                padding: [
                    30,
                    30
                ]
            }
        );

    }

}


function getFilteredHotels() {

    const search =
        $("hotelSearch")
            .value
            .trim()
            .toLowerCase();


    const minRating =
        Number(
            $("minRating")
                .value
        ) || 0;


    const maxInput =
        Number(
            $("maxPrice")
                .value
        );


    const maxPrice =
        maxInput > 0
        ? maxInput
        : Infinity;


    const breakfast =
        $("breakfastFilter")
            .checked;


    const cancel =
        $("cancelFilter")
            .checked;


    return hotelData.filter(
        hotel => {

            const name =
                String(
                    hotel.name || ""
                )
                .toLowerCase();


            const rating =
                Number(
                    hotel.rating || 0
                );


            const price =
                convertFromEUR(
                    hotel.price,
                    hotel.currency
                );


            return (

                (
                    !search
                    ||
                    name.includes(
                        search
                    )
                )

                &&

                rating >= minRating

                &&

                price <= maxPrice

                &&

                (
                    !breakfast
                    ||
                    hotel.breakfast
                )

                &&

                (
                    !cancel
                    ||
                    hotel.free_cancel
                )

            );

        }
    );

}


/* =========================
   MAP SEARCH BUTTON
========================= */

$("mapSearch")
    .addEventListener(
        "click",
        () => {

            updateMap();

            if (map) {

                map.invalidateSize();

            }

        }
    );


/* =========================
   CURRENCY CHANGE
========================= */

$("currency")
    .addEventListener(
        "change",
        () => {

            renderFlights();

            renderHotels();

            updateMap();

        }
    );


/* =========================
   LANGUAGE
========================= */

$("lang")
    .addEventListener(
        "change",
        () => {

            const lang =
                $("lang").value;


            if (
                lang === "en"
            ) {

                document.documentElement
                    .lang = "en";

                document.documentElement
                    .dir = "ltr";


                $("mainTitle")
                    .textContent =
                    "Flights and hotels worldwide";


                $("mainSubtitle")
                    .textContent =
                    "Find the right flight and hotel at the best price";


                $("fb")
                    .textContent =
                    "✈️ Flights";


                $("hb")
                    .textContent =
                    "🏨 Hotels";

            } else {

                document.documentElement
                    .lang = "he";

                document.documentElement
                    .dir = "rtl";


                $("mainTitle")
                    .textContent =
                    "טיסות ומלונות בכל העולם";


                $("mainSubtitle")
                    .textContent =
                    "מצא את הטיסה והמלון המתאימים לך במחיר הטוב ביותר";


                $("fb")
                    .textContent =
                    "✈️ טיסות";


                $("hb")
                    .textContent =
                    "🏨 מלונות";

            }

        }
    );


/* =========================
   DEFAULT DATES
========================= */

function setDefaultDates() {

    const tomorrow =
        tomorrowString();


    const dayAfter =
        new Date();


    dayAfter.setDate(
        dayAfter.getDate() + 8
    );


    const offset =
        dayAfter.getTimezoneOffset();


    const local =
        new Date(
            dayAfter.getTime()
            -
            offset * 60000
        );


    const checkout =
        local
            .toISOString()
            .slice(0, 10);


    if (!$("dep").value) {

        $("dep").value =
            tomorrow;

    }


    if (!$("ret").value) {

        $("ret").value =
            checkout;

    }


    if (!$("checkin").value) {

        $("checkin").value =
            tomorrow;

    }


    if (!$("checkout").value) {

        $("checkout").value =
            checkout;

    }

}


setDefaultDates();


/* =========================
   ENTER KEY
========================= */

[
    "from",
    "to",
    "dep",
    "ret",
    "adults"
].forEach(
    id => {

        $(id)
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        searchFlights();

                    }

                }
            );

    }
);


[
    "city",
    "checkin",
    "checkout",
    "guests",
    "rooms"
].forEach(
    id => {

        $(id)
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        searchHotels();

                    }

                }
            );

    }
);
