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

const symbols = {
  USD: "$",
  ILS: "₪",
  THB: "฿",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF ",
  SGD: "S$"
};

const airlineNames = {
  TG: "Thai Airways",
  EK: "Emirates",
  QR: "Qatar Airways",
  LY: "EL AL",
  TK: "Turkish Airlines",
  EY: "Etihad Airways",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  KL: "KLM",
  AF: "Air France",
  LH: "Lufthansa",
  BA: "British Airways",
  FR: "Ryanair",
  W6: "Wizz Air"
};

function money(value) {
  const converted = value * rates[currency];
  return (symbols[currency] || "") +
    Math.round(converted).toLocaleString();
}


/* ================= LANGUAGE ================= */

$("lang").onchange = function () {

  if (this.value === "en") {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  } else {
    document.documentElement.lang = "he";
    document.documentElement.dir = "rtl";
  }

};


/* ================= CURRENCY ================= */

$("currency").onchange = function () {
  currency = this.value;

  if (lastFlightResults.length) {
    renderFlights(lastFlightResults);
  }

  if (lastHotelResults.length) {
    renderHotels(lastHotelResults);
  }
};


/* ================= TABS ================= */

$("fb").onclick = function () {
  $("flights").hidden = false;
  $("hotels").hidden = true;
};

$("hb").onclick = function () {
  $("flights").hidden = true;
  $("hotels").hidden = false;

  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 300);
};


/* ================= DATA ================= */

let lastFlightResults = [];
let lastHotelResults = [];


/* ================= FLIGHTS SEARCH ================= */

$("fs").onclick = async function () {

  const button = $("fs");

  button.disabled = true;
  button.innerText = "🔄 מחפש טיסות...";

  try {

    const params = new URLSearchParams({
      origin: $("from").value,
      destination: $("to").value,
      departure: $("dep").value,
      return_date: $("ret").value,
      adults: $("adults").value
    });

    const response =
      await fetch("/api/flights?" + params);

    const data = await response.json();

    lastFlightResults = data.results || [];

    fillAirlines(lastFlightResults);

    renderFlights(lastFlightResults);

  } catch (error) {

    $("flightResults").innerHTML =
      `<div class="error">
        ❌ לא הצלחנו לבצע את החיפוש.
      </div>`;

  }

  button.disabled = false;
  button.innerText = "🔎 חפש טיסות";
};


/* ================= AIRLINES ================= */

function fillAirlines(results) {

  const select = $("airlineFilter");

  const airlines = [
    ...new Set(
      results.map(x => x.airline).filter(Boolean)
    )
  ];

  select.innerHTML =
    `<option value="all">כל חברות התעופה</option>`;

  airlines.forEach(code => {

    const option = document.createElement("option");

    option.value = code;

    option.textContent =
      airlineNames[code] || code;

    select.appendChild(option);

  });
}


/* ================= FLIGHT RENDER ================= */

function renderFlights(results) {

  let filtered = [...results];

  const airline = $("airlineFilter").value;
  const stops = $("stopsFilter").value;
  const sort = $("flightSort").value;


  if (airline !== "all") {

    filtered = filtered.filter(
      x => x.airline === airline
    );

  }


  if (stops !== "all") {

    filtered = filtered.filter(x => {

      if (stops === "2") {
        return Number(x.stops) >= 2;
      }

      return Number(x.stops) === Number(stops);

    });

  }


  if (sort === "priceAsc") {

    filtered.sort(
      (a,b) => Number(a.price) - Number(b.price)
    );

  }

  if (sort === "priceDesc") {

    filtered.sort(
      (a,b) => Number(b.price) - Number(a.price)
    );

  }


  $("flightResults").innerHTML = "";

  if (!filtered.length) {

    $("flightResults").innerHTML =
      `<div class="empty">
        לא נמצאו טיסות לפי הסינון.
      </div>`;

    return;
  }


  $("flightResults").innerHTML =
    filtered.map(x => {

      const airline =
        airlineNames[x.airline] || x.airline;

      return `
      <div class="card">

        <div class="row">

          <div>

            <b>✈️ ${airline}</b>

            <div class="route">
              ${x.origin} → ${x.destination}
            </div>

            <div class="muted">
              🕐 ${x.departure} → ${x.arrival}
            </div>

            <div class="muted">
              🔄 ${x.stops} עצירות
            </div>

          </div>

          <div class="price">
            ${money(x.price)}
          </div>

        </div>

      </div>
      `;

    }).join("");
}


/* ================= FLIGHT FILTER EVENTS ================= */

$("airlineFilter").onchange =
  () => renderFlights(lastFlightResults);

$("stopsFilter").onchange =
  () => renderFlights(lastFlightResults);

$("flightSort").onchange =
  () => renderFlights(lastFlightResults);


/* ================= HOTELS SEARCH ================= */

$("hs").onclick = async function () {

  const button = $("hs");

  button.disabled = true;
  button.innerText = "🔄 מחפש מלונות...";


  try {

    const params = new URLSearchParams({

      city: $("city").value,

      checkin: $("checkin").value,

      checkout: $("checkout").value,

      guests: $("guests").value,

      rooms: $("rooms").value

    });


    const response =
      await fetch("/api/hotels?" + params);


    const data =
      await response.json();


    lastHotelResults =
      data.results || [];


    renderHotels(lastHotelResults);

    updateMap(lastHotelResults);


  } catch (error) {

    $("hotelResults").innerHTML =
      `<div class="error">
        ❌ לא הצלחנו לבצע את החיפוש.
      </div>`;

  }


  button.disabled = false;

  button.innerText =
    "🔎 חפש מלונות";

};


/* ================= HOTEL RENDER ================= */

function renderHotels(results) {

  let filtered = [...results];


  const rating =
    Number($("ratingFilter").value);


  const breakfast =
    $("breakfastFilter").checked;


  const cancel =
    $("cancelFilter").checked;


  const sort =
    $("hotelSort").value;


  filtered =
    filtered.filter(
      x => Number(x.rating || 0) >= rating
    );


  if (breakfast) {

    filtered =
      filtered.filter(x => x.breakfast);

  }


  if (cancel) {

    filtered =
      filtered.filter(x => x.free_cancel);

  }


  if (sort === "priceAsc") {

    filtered.sort(
      (a,b) => Number(a.price) - Number(b.price)
    );

  }


  if (sort === "priceDesc") {

    filtered.sort(
      (a,b) => Number(b.price) - Number(a.price)
    );

  }


  if (sort === "rating") {

    filtered.sort(
      (a,b) => Number(b.rating) - Number(a.rating)
    );

  }


  if (sort === "reviews") {

    filtered.sort(
      (a,b) => Number(b.reviews) - Number(a.reviews)
    );

  }


  $("hotelResults").innerHTML = "";


  if (!filtered.length) {

    $("hotelResults").innerHTML =
      `<div class="empty">
        לא נמצאו מלונות לפי הסינון.
      </div>`;

    return;

  }


  $("hotelResults").innerHTML =
    filtered.map(x => `

      <div class="card">

        <div class="row">

          <div>

            <b>🏨 ${x.name}</b>

            <div>
              ⭐ ${x.rating || 0}
            </div>

            <div class="muted">
              📝 ${x.reviews || 0} reviews
            </div>

            ${x.breakfast ?
              `<div class="good">🍳 ארוחת בוקר</div>` : ""}

            ${x.free_cancel ?
              `<div class="good">✅ ביטול חינם</div>` : ""}

          </div>

          <div class="price">

            ${money(x.price)}

            <div class="muted">
              ללילה
            </div>

          </div>

        </div>

      </div>

    `).join("");

}


/* ================= HOTEL FILTER EVENTS ================= */

$("ratingFilter").onchange =
  () => renderHotels(lastHotelResults);

$("hotelSort").onchange =
  () => renderHotels(lastHotelResults);

$("breakfastFilter").onchange =
  () => renderHotels(lastHotelResults);

$("cancelFilter").onchange =
  () => renderHotels(lastHotelResults);


/* ================= MAP ================= */

function updateMap(results) {

  if (!map) {

    map = L.map("map").setView(
      [13.74,100.53],
      11
    );


    /* THIS WAS MISSING BEFORE */

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; OpenStreetMap"
      }
    ).addTo(map);

  }


  markers.forEach(
    marker => marker.remove()
  );

  markers = [];


  const valid =
    results.filter(
      x => x.lat && x.lon
    );


  valid.forEach(x => {

    const marker =
      L.marker([
        Number(x.lat),
        Number(x.lon)
      ])
      .addTo(map)
      .bindPopup(
        `<b>${x.name}</b><br>
         ⭐ ${x.rating || 0}<br>
         ${money(x.price)} / night`
      );


    markers.push(marker);

  });


  if (valid.length) {

    map.setView(
      [
        Number(valid[0].lat),
        Number(valid[0].lon)
      ],
      12
    );

  }


  setTimeout(
    () => map.invalidateSize(),
    300
  );

        }
