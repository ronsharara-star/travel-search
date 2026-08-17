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
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF ",
  SGD: "S$"
};

function money(value) {
  const number = Math.round(Number(value) * rates[currency]);
  return (sym[currency] || "") + number.toLocaleString();
}


/* =========================
   CURRENCY
========================= */

$("currency").onchange = e => {
  currency = e.target.value;

  if (document.getElementById("flightResults").innerHTML) {
    $("fs").click();
  }

  if (document.getElementById("hotelResults").innerHTML) {
    $("hs").click();
  }
};


/* =========================
   TABS
========================= */

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
   AIRLINE NAMES
========================= */

const airlineNames = {
  TG: "Thai Airways",
  EK: "Emirates",
  QR: "Qatar Airways",
  LY: "EL AL",
  TK: "Turkish Airlines",
  EY: "Etihad Airways",
  AF: "Air France",
  LH: "Lufthansa",
  BA: "British Airways",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  KL: "KLM",
  OS: "Austrian Airlines",
  LX: "Swiss",
  AZ: "ITA Airways",
  RJ: "Royal Jordanian"
};

function airlineName(code) {
  return airlineNames[code] || code || "Unknown Airline";
}


/* =========================
   FLIGHT SEARCH
========================= */

$("fs").onclick = async () => {

  const p = new URLSearchParams({
    origin: $("from").value,
    destination: $("to").value,
    departure: $("dep").value,
    return_date: $("ret").value,
    adults: $("adults").value
  });

  $("flightResults").innerHTML =
    `<div class="loading">🔎 מחפש טיסות...</div>`;

  try {

    const response = await fetch("/api/flights?" + p);
    const data = await response.json();

    let results = data.results || [];

    buildFlightFilters(results);

    renderFlights(results);

  } catch (error) {

    $("flightResults").innerHTML =
      `<div class="card">❌ אירעה שגיאה בחיפוש</div>`;

  }
};


/* =========================
   FLIGHT FILTERS
========================= */

function buildFlightFilters(results) {

  const container = $("flightFilters");

  if (!container) return;

  const airlines = [
    ...new Set(
      results.map(x => x.airline)
    )
  ];

  container.innerHTML = `

    <div class="filter-box">

      <label>✈️ חברת תעופה</label>

      <select id="airlineFilter">

        <option value="all">
          כל חברות התעופה
        </option>

        ${airlines.map(code => `
          <option value="${code}">
            ${airlineName(code)}
          </option>
        `).join("")}

      </select>


      <label>🛑 עצירות</label>

      <select id="stopsFilter">

        <option value="all">הכול</option>
        <option value="0">ללא עצירות</option>
        <option value="1">עצירה אחת</option>
        <option value="2">2+ עצירות</option>

      </select>


      <label>💰 מיון</label>

      <select id="flightSort">

        <option value="recommended">
          מומלץ
        </option>

        <option value="cheap">
          הזול ביותר
        </option>

        <option value="expensive">
          היקר ביותר
        </option>

        <option value="stops">
          הכי מעט עצירות
        </option>

      </select>

    </div>
  `;


  $("airlineFilter").onchange = () => applyFlightFilters(results);

  $("stopsFilter").onchange = () => applyFlightFilters(results);

  $("flightSort").onchange = () => applyFlightFilters(results);
}


function applyFlightFilters(results) {

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

    if (stops === "2") {

      filtered = filtered.filter(
        x => Number(x.stops) >= 2
      );

    } else {

      filtered = filtered.filter(
        x => Number(x.stops) === Number(stops)
      );

    }

  }


  if (sort === "cheap") {

    filtered.sort(
      (a, b) => Number(a.price) - Number(b.price)
    );

  }


  if (sort === "expensive") {

    filtered.sort(
      (a, b) => Number(b.price) - Number(a.price)
    );

  }


  if (sort === "stops") {

    filtered.sort(
      (a, b) => Number(a.stops) - Number(b.stops)
    );

  }


  renderFlights(filtered);
}


/* =========================
   FLIGHT RESULTS
========================= */

function renderFlights(results) {

  if (!results.length) {

    $("flightResults").innerHTML =
      `<div class="card">
        ❌ לא נמצאו טיסות לפי הסינון
      </div>`;

    return;
  }


  $("flightResults").innerHTML = results.map(x => `

    <div class="card flight-card">

      <div class="row">

        <div>

          <b>
            ✈️ ${airlineName(x.airline)}
          </b>

          <div class="route">
            ${x.origin} → ${x.destination}
          </div>

          <div class="muted">
            🕐 ${x.departure} → ${x.arrival}
          </div>

          <div class="muted">
            🛑 ${x.stops} עצירות
          </div>

        </div>

        <div class="price">
          ${money(x.price)}
        </div>

      </div>

    </div>

  `).join("");
}


/* =========================
   HOTEL SEARCH
========================= */

$("hs").onclick = async () => {

  const p = new URLSearchParams({

    city: $("city").value,

    checkin: $("checkin").value,

    checkout: $("checkout").value,

    guests: $("guests").value,

    rooms: $("rooms").value

  });


  $("hotelResults").innerHTML =
    `<div class="loading">
      🔎 מחפש מלונות...
    </div>`;


  try {

    const response =
      await fetch("/api/hotels?" + p);

    const data =
      await response.json();

    const results =
      data.results || [];


    buildHotelFilters(results);

    renderHotels(results);

    updateMap(results);

  } catch (error) {

    $("hotelResults").innerHTML =
      `<div class="card">
        ❌ אירעה שגיאה בחיפוש
      </div>`;

  }
};


/* =========================
   HOTEL FILTERS
========================= */

function buildHotelFilters(results) {

  const container = $("hotelFilters");

  if (!container) return;


  container.innerHTML = `

    <div class="filter-box">

      <label>💰 מיון לפי מחיר</label>

      <select id="hotelSort">

        <option value="recommended">
          מומלץ
        </option>

        <option value="cheap">
          הזול ביותר
        </option>

        <option value="expensive">
          היקר ביותר
        </option>

        <option value="rating">
          דירוג גבוה
        </option>

        <option value="reviews">
          הכי הרבה ביקורות
        </option>

      </select>


      <label>⭐ דירוג מינימלי</label>

      <select id="ratingFilter">

        <option value="0">
          כל הדירוגים
        </option>

        <option value="4">
          ⭐ 4+
        </option>

        <option value="4.5">
          ⭐ 4.5+
        </option>

      </select>


      <label>🍳 ארוחת בוקר</label>

      <select id="breakfastFilter">

        <option value="all">
          הכול
        </option>

        <option value="yes">
          כולל ארוחת בוקר
        </option>

      </select>


      <label>↩️ ביטול חינם</label>

      <select id="cancelFilter">

        <option value="all">
          הכול
        </option>

        <option value="yes">
          ביטול חינם
        </option>

      </select>

    </div>

  `;


  $("hotelSort").onchange =
    () => applyHotelFilters(results);

  $("ratingFilter").onchange =
    () => applyHotelFilters(results);

  $("breakfastFilter").onchange =
    () => applyHotelFilters(results);

  $("cancelFilter").onchange =
    () => applyHotelFilters(results);
}


function applyHotelFilters(results) {

  let filtered = [...results];


  const sort = $("hotelSort").value;

  const rating =
    Number($("ratingFilter").value);

  const breakfast =
    $("breakfastFilter").value;

  const cancel =
    $("cancelFilter").value;


  if (rating > 0) {

    filtered =
      filtered.filter(
        x => Number(x.rating) >= rating
      );

  }


  if (breakfast === "yes") {

    filtered =
      filtered.filter(
        x => x.breakfast === true
      );

  }


  if (cancel === "yes") {

    filtered =
      filtered.filter(
        x => x.free_cancel === true
      );

  }


  if (sort === "cheap") {

    filtered.sort(
      (a, b) => Number(a.price) - Number(b.price)
    );

  }


  if (sort === "expensive") {

    filtered.sort(
      (a, b) => Number(b.price) - Number(a.price)
    );

  }


  if (sort === "rating") {

    filtered.sort(
      (a, b) => Number(b.rating) - Number(a.rating)
    );

  }


  if (sort === "reviews") {

    filtered.sort(
      (a, b) => Number(b.reviews) - Number(a.reviews)
    );

  }


  renderHotels(filtered);

  updateMap(filtered);
}


/* =========================
   HOTEL RESULTS
========================= */

function renderHotels(results) {

  if (!results.length) {

    $("hotelResults").innerHTML =
      `<div class="card">
        ❌ לא נמצאו מלונות לפי הסינון
      </div>`;

    return;
  }


  $("hotelResults").innerHTML =
    results.map(x => `

      <div class="card hotel-card">

        <div class="row">

          <div>

            <b>
              🏨 ${x.name}
            </b>

            <div>
              ⭐ ${x.rating || "N/A"}
            </div>

            <div class="muted">
              ${x.reviews || 0} ביקורות
            </div>

            ${x.breakfast ? `
              <div class="feature">
                🍳 ארוחת בוקר
              </div>
            ` : ""}

            ${x.free_cancel ? `
              <div class="feature">
                ↩️ ביטול חינם
              </div>
            ` : ""}

          </div>

          <div class="price">

            ${money(x.price)}

            <div class="muted">
              /לילה
            </div>

          </div>

        </div>

      </div>

    `).join("");
}


/* =========================
   REAL MAP
========================= */

function updateMap(results) {

  if (!map) {

    map = L.map("map").setView(
      [13.74, 100.53],
      11
    );


    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; OpenStreetMap contributors'
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
      L.marker([x.lat, x.lon])
        .addTo(map)
        .bindPopup(`
          <b>${x.name}</b><br>
          ⭐ ${x.rating || ""}
        `);

    markers.push(marker);

  });


  if (valid.length) {

    map.setView(
      [valid[0].lat, valid[0].lon],
      12
    );

  }


  setTimeout(
    () => map.invalidateSize(),
    300
  );
}
