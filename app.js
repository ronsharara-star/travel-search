let currency = "ILS";
let map = null;
let markers = [];

const $ = id => document.getElementById(id);

const rates = {
    USD: 1,
    ILS: 3.2,
    THB: 32,
    EUR: 0.86,
    GBP: 0.74,
    JPY: 147,
    CAD: 1.38,
    AUD: 1.52,
    CHF: 0.79,
    SGD: 1.28
};

const sym = {
    USD: "$",
    ILS: "₪",
    THB: "฿",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "$",
    AUD: "A$",
    CHF: "CHF ",
    SGD: "S$"
};

function money(value) {
    const n = Number(value) || 0;
    return (sym[currency] || "") +
        Math.round(n * rates[currency]).toLocaleString();
}

function setLoading(button, loading, text) {
    if (!button) return;

    button.disabled = loading;

    if (loading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = "⏳ מחפש...";
    } else {
        button.innerHTML =
            button.dataset.originalText || text || "🔎 חפש";
    }
}

/* Currency */
$("currency").onchange = e => {
    currency = e.target.value;
};

/* Tabs */
$("fb").onclick = () => {
    $("flights").hidden = false;
    $("hotels").hidden = true;
};

$("hb").onclick = () => {
    $("flights").hidden = true;
    $("hotels").hidden = false;

    setTimeout(() => {
        if (map) {
            map.invalidateSize();
        }
    }, 300);
};

/* =========================
   FLIGHTS
========================= */

$("fs").onclick = async () => {

    const button = $("fs");

    setLoading(button, true);

    try {

        const origin = $("from").value.trim();
        const destination = $("to").value.trim();
        const departure = $("dep").value;
        const returnDate = $("ret").value;
        const adults = $("adults").value;

        if (!origin || !destination) {
            alert("נא להזין מוצא ויעד");
            return;
        }

        if (!departure) {
            alert("נא לבחור תאריך יציאה");
            return;
        }

        const params = new URLSearchParams({
            origin: origin,
            destination: destination,
            departure: departure,
            return_date: returnDate,
            adults: adults
        });

        const response = await fetch(
            "/api/flights?" + params.toString(),
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Flight server error");
        }

        const data = await response.json();

        if (!data.results || !data.results.length) {
            $("flightResults").innerHTML =
                `<div class="card">
                    לא נמצאו טיסות.
                </div>`;
            return;
        }

        $("flightResults").innerHTML =
            data.results.map(x => `
                <div class="card">

                    <div class="row">

                        <div>
                            <b>✈️ ${x.airline || "Airline"}</b>

                            <div>
                                ${x.origin || ""} →
                                ${x.destination || ""}
                            </div>

                            <div class="muted">
                                ${x.departure || ""} →
                                ${x.arrival || ""}
                            </div>
                        </div>

                        <div class="price">
                            ${money(x.price)}
                        </div>

                    </div>

                    <div class="muted">
                        ${x.stops || 0} עצירה/ות
                    </div>

                </div>
            `).join("");

    } catch (error) {

        console.error(error);

        $("flightResults").innerHTML =
            `<div class="card">
                ⚠️ הייתה בעיה בחיפוש הטיסות.<br>
                נסה שוב בעוד כמה שניות.
            </div>`;

    } finally {

        setLoading(button, false, "🔎 חפש טיסות");

    }
};


/* =========================
   HOTELS
========================= */

$("hs").onclick = async () => {

    const button = $("hs");

    setLoading(button, true);

    try {

        const city = $("city").value.trim();
        const checkin = $("checkin").value;
        const checkout = $("checkout").value;
        const guests = $("guests").value;
        const rooms = $("rooms").value;

        if (!city) {
            alert("נא להזין עיר");
            return;
        }

        if (!checkin || !checkout) {
            alert("נא לבחור תאריך כניסה ויציאה");
            return;
        }

        const params = new URLSearchParams({
            city: city,
            checkin: checkin,
            checkout: checkout,
            guests: guests,
            rooms: rooms
        });

        const response = await fetch(
            "/api/hotels?" + params.toString(),
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Hotel server error");
        }

        const data = await response.json();

        if (!data.results || !data.results.length) {

            $("hotelResults").innerHTML =
                `<div class="card">
                    לא נמצאו מלונות.
                </div>`;

            return;
        }

        /* Hotels */
        $("hotelResults").innerHTML =
            data.results.map(x => `
                <div class="card">

                    <div class="row">

                        <div>

                            <b>
                                🏨 ${x.name || "Hotel"}
                            </b>

                            <div>
                                ⭐ ${x.rating || 0}
                            </div>

                            <div class="muted">
                                ${x.reviews || 0} reviews
                            </div>

                        </div>

                        <div class="price">

                            ${money(x.price)}

                            <div class="muted">
                                /night
                            </div>

                        </div>

                    </div>

                </div>
            `).join("");


        /* =========================
           MAP
        ========================= */

        if (!map) {

            map = L.map("map").setView(
                [13.74, 100.53],
                11
            );

            L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom: 19,
                    attribution: "&copy; OpenStreetMap"
                }
            ).addTo(map);
        }

        markers.forEach(marker => {
            map.removeLayer(marker);
        });

        markers = [];

        const validHotels = data.results.filter(
            x => x.lat && x.lon
        );

        validHotels.forEach(x => {

            const marker = L.marker([
                Number(x.lat),
                Number(x.lon)
            ])
            .addTo(map)
            .bindPopup(`
                <b>${x.name}</b><br>
                ⭐ ${x.rating || 0}<br>
                ${money(x.price)} / night
            `);

            markers.push(marker);

        });

        if (validHotels.length) {

            const first = validHotels[0];

            map.setView(
                [
                    Number(first.lat),
                    Number(first.lon)
                ],
                12
            );

        }

        setTimeout(() => {
            map.invalidateSize();
        }, 300);

    } catch (error) {

        console.error(error);

        $("hotelResults").innerHTML =
            `<div class="card">
                ⚠️ הייתה בעיה בחיפוש המלונות.<br>
                נסה שוב בעוד כמה שניות.
            </div>`;

    } finally {

        setLoading(button, false, "🔎 חפש מלונות");

    }
};
