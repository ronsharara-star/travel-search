let currency = "ILS";

let map = null;

let markers = [];

let flightData = [];

let hotelData = [];

const $ = id => document.getElementById(id);


/* =========================
   CURRENCY
========================= */

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

  return (
    sym[currency] || ""
  ) + Math.round(
    n * rates[currency]
  ).toLocaleString();

}


/* =========================
   LOADING
========================= */

function showLoading(text = "מחפש...") {

  const loading = $("loading");

  if (!loading) return;

  $("loadingText").textContent = text;

  loading.hidden = false;

}


function hideLoading() {

  const loading = $("loading");

  if (!loading) return;

  loading.hidden = true;

}


/* =========================
   TABS
========================= */

$("fb").onclick = () => {

  $("flights").hidden = false;

  $("hotels").hidden = true;

  $("fb").classList.add("active");

  $("hb").classList.remove("active");

};


$("hb").onclick = () => {

  $("flights").hidden = true;

  $("hotels").hidden = false;

  $("fb").classList.remove("active");

  $("hb").classList.add("active");

  setTimeout(() => {

    if (map) {

      map.invalidateSize();

    }

  }, 300);

};


/* =========================
   CURRENCY
========================= */

$("currency").onchange = e => {

  currency = e.target.value;

  renderFlights();

  renderHotels();

  renderMap();

};


/* =========================
   FLIGHT SEARCH
========================= */

$("fs").onclick = async () => {

  showLoading("מחפש טיסות...");

  try {

    const origin =
      $("from").value.trim();

    const destination =
      $("to").value.trim();

    const departure =
      $("dep").value;

    const returnDate =
      $("ret").value;

    const adults =
      $("adults").value;


    if (!origin || !destination) {

      alert("נא להזין מוצא ויעד");

      return;

    }


    if (!departure) {

      alert("נא לבחור תאריך יציאה");

      return;

    }


    const params =
      new URLSearchParams({

        origin,

        destination,

        departure,

        return_date: returnDate,

        adults

      });


    const response =
      await fetch(
        "/api/flights?" +
        params.toString(),
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Flight server error"
      );

    }


    const data =
      await response.json();


    flightData =
      data.results || [];


    populateAirlines();


    $("flightFilters").hidden =
      flightData.length === 0;


    renderFlights();


  } catch (error) {

    console.error(error);

    $("flightResults").innerHTML = `
      <div class="card">
        ⚠️ הייתה בעיה בחיפוש הטיסות.
        <br>
        נסה שוב בעוד כמה שניות.
      </div>
    `;

  } finally {

    hideLoading();

  }

};


/* =========================
   AIRLINES
========================= */

function populateAirlines() {

  const select =
    $("airlineFilter");

  const airlines =
    [...new Set(
      flightData
        .map(x => x.airline)
        .filter(Boolean)
    )]
    .sort();


  select.innerHTML =
    `<option value="all">
      כל חברות התעופה
    </option>`;


  airlines.forEach(airline => {

    const option =
      document.createElement("option");

    option.value = airline;

    option.textContent = airline;

    select.appendChild(option);

  });

}


/* =========================
   FLIGHT FILTERS
========================= */

function getFilteredFlights() {

  let results =
    [...flightData];


  const airline =
    $("airlineFilter").value;

  const stops =
    $("stopsFilter").value;

  const maxPrice =
    Number(
      $("maxFlightPrice").value
    );


  if (airline !== "all") {

    results =
      results.filter(
        x => x.airline === airline
      );

  }


  if (stops !== "all") {

    if (stops === "2") {

      results =
        results.filter(
          x => Number(x.stops) >= 2
        );

    } else {

      results =
        results.filter(
          x =>
            Number(x.stops) ===
            Number(stops)
        );

    }

  }


  if (maxPrice > 0) {

    results =
      results.filter(
        x =>
          Number(x.price) <=
          maxPrice
      );

  }


  const sort =
    $("sortFlights").value;


  if (sort === "priceAsc") {

    results.sort(
      (a,b) =>
        Number(a.price) -
        Number(b.price)
    );

  }


  if (sort === "priceDesc") {

    results.sort(
      (a,b) =>
        Number(b.price) -
        Number(a.price)
    );

  }


  return results;

}


/* =========================
   RENDER FLIGHTS
========================= */

function renderFlights() {

  const results =
    getFilteredFlights();


  $("flightCount").textContent =
    `${results.length} טיסות נמצאו`;


  if (!results.length) {

    $("flightResults").innerHTML = `
      <div class="card">
        לא נמצאו טיסות לפי הסינון שבחרת.
      </div>
    `;

    return;

  }


  $("flightResults").innerHTML =
    results.map(x => {

      const stops =
        Number(x.stops) || 0;


      const stopText =
        stops === 0
          ? "טיסה ישירה"
          : stops === 1
          ? "עצירה אחת"
          : `${stops} עצירות`;


      return `

      <div class="card">

        <div class="row">

          <div>

            <b>
              ✈️ ${x.airline || "Airline"}
            </b>

            <div>
              ${x.origin || ""}
              →
              ${x.destination || ""}
            </div>

            <div class="muted">
              ${x.departure || ""}
              →
              ${x.arrival || ""}
            </div>

          </div>

          <div class="price">
            ${money(x.price)}
          </div>

        </div>


        <div class="flightDetails">

          <span class="badge">
            🛫 ${stopText}
          </span>

          <span class="badge">
            💰 ${money(x.price)}
          </span>

        </div>

      </div>

      `;

    }).join("");

}


/* =========================
   FLIGHT FILTER EVENTS
========================= */

[
  "airlineFilter",
  "sortFlights",
  "stopsFilter",
  "maxFlightPrice"
].forEach(id => {

  $(id).addEventListener(
    "input",
    renderFlights
  );

  $(id).addEventListener(
    "change",
    renderFlights
  );

});


$("clearFlightFilters").onclick =
  () => {

    $("airlineFilter").value =
      "all";

    $("sortFlights").value =
      "priceAsc";

    $("stopsFilter").value =
      "all";

    $("maxFlightPrice").value =
      "";

    renderFlights();

  };


/* =========================
   HOTEL SEARCH
========================= */

$("hs").onclick = async () => {

  showLoading("מחפש מלונות...");

  try {

    const city =
      $("city").value.trim();

    const checkin =
      $("checkin").value;

    const checkout =
      $("checkout").value;

    const guests =
      $("guests").value;

    const rooms =
      $("rooms").value;


    if (!city) {

      alert("נא להזין עיר");

      return;

    }


    if (!checkin || !checkout) {

      alert(
        "נא לבחור תאריך כניסה ויציאה"
      );

      return;

    }


    const params =
      new URLSearchParams({

        city,

        checkin,

        checkout,

        guests,

        rooms

      });


    const response =
      await fetch(
        "/api/hotels?" +
        params.toString(),
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Hotel server error"
      );

    }


    const data =
      await response.json();


    hotelData =
      data.results || [];


    $("hotelFilters").hidden =
      hotelData.length === 0;


    renderHotels();

    renderMap();


  } catch (error) {

    console.error(error);

    $("hotelResults").innerHTML = `
      <div class="card">
        ⚠️ הייתה בעיה בחיפוש המלונות.
        <br>
        נסה שוב בעוד כמה שניות.
      </div>
    `;

  } finally {

    hideLoading();

  }

};


/* =========================
   HOTEL FILTERS
========================= */

function getFilteredHotels() {

  let results =
    [...hotelData];


  const search =
    $("hotelSearch").value
      .trim()
      .toLowerCase();


  const minRating =
    Number(
      $("minRating").value
    );


  const maxPrice =
    Number(
      $("maxPrice").value
    );


  const breakfast =
    $("breakfastFilter").checked;


  const cancel =
    $("cancelFilter").checked;


  if (search) {

    results =
      results.filter(x =>
        String(x.name || "")
          .toLowerCase()
          .includes(search)
      );

  }


  if (minRating > 0) {

    results =
      results.filter(
        x =>
          Number(x.rating) >=
          minRating
      );

  }


  if (maxPrice > 0) {

    results =
      results.filter(
        x =>
          Number(x.price) <=
          maxPrice
      );

  }


  if (breakfast) {

    results =
      results.filter(
        x => x.breakfast === true
      );

  }


  if (cancel) {

    results =
      results.filter(
        x => x.free_cancel === true
      );

  }


  const sort =
    $("sortHotels").value;


  if (sort === "priceAsc") {

    results.sort(
      (a,b) =>
        Number(a.price) -
        Number(b.price)
    );

  }


  if (sort === "priceDesc") {

    results.sort(
      (a,b) =>
        Number(b.price) -
        Number(a.price)
    );

  }


  if (sort === "ratingDesc") {

    results.sort(
      (a,b) =>
        Number(b.rating) -
        Number(a.rating)
    );

  }


  if (sort === "reviewsDesc") {

    results.sort(
      (a,b) =>
        Number(b.reviews) -
        Number(a.reviews)
    );

  }


  return results;

}


/* =========================
   RENDER HOTELS
========================= */

function renderHotels() {

  const results =
    getFilteredHotels();


  $("hotelCount").textContent =
    `${results.length} מלונות נמצאו`;


  if (!results.length) {

    $("hotelResults").innerHTML = `
      <div class="card">
        לא נמצאו מלונות לפי הסינון.
      </div>
    `;

    renderMap();

    return;

  }


  $("hotelResults").innerHTML =
    results.map(x => `

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
              ${x.reviews || 0}
              reviews
            </div>

            <div class="flightDetails">

              ${
                x.breakfast
                  ? `<span class="badge">
                       🍳 ארוחת בוקר
                     </span>`
                  : ""
              }

              ${
                x.free_cancel
                  ? `<span class="badge">
                       ✓ ביטול חינם
                     </span>`
                  : ""
              }

            </div>

          </div>


          <div class="price">

            ${money(x.price)}

            <div class="muted">
              / night
            </div>

          </div>

        </div>

      </div>

    `).join("");


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
].forEach(id => {

  $(id).addEventListener(
    "input",
    () => {

      renderHotels();
      renderMap();

    }
  );

  $(id).addEventListener(
    "change",
    () => {

      renderHotels();
      renderMap();

    }
  );

});


/* =========================
   MAP
========================= */

function initMap() {

  if (map) return;


  map =
    L.map("map").setView(
      [13.74,100.53],
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

}


function renderMap() {

  initMap();


  markers.forEach(marker => {

    map.removeLayer(marker);

  });


  markers = [];


  const hotels =
    getFilteredHotels()
      .filter(
        x => x.lat && x.lon
      );


  hotels.forEach(x => {

    const marker =
      L.marker([
        Number(x.lat),
        Number(x.lon)
      ])
      .addTo(map)
      .bindPopup(`

        <b>
          ${x.name || "Hotel"}
        </b>

        <br>

        ⭐ ${x.rating || 0}

        <br>

        ${money(x.price)}
        / night

      `);


    markers.push(marker);

  });


  if (hotels.length) {

    map.setView(
      [
        Number(hotels[0].lat),
        Number(hotels[0].lon)
      ],
      12
    );

  }


  setTimeout(() => {

    map.invalidateSize();

  },300);

}


/* =========================
   MAP SEARCH
========================= */

$("mapSearch").onclick =
  async () => {

    const center =
      map
        ? map.getCenter()
        : null;


    if (!center) {

      alert(
        "בצע קודם חיפוש מלונות"
      );

      return;

    }


    /*
      בשלב הבא נחבר את הכפתור
      לחיפוש אמיתי לפי גבולות המפה.
    */

    alert(
      "המפה מוכנה לחיפוש באזור."
    );

  };


/* =========================
   LANGUAGE
========================= */

const translations = {

  he: {

    brand: "Travel Search",

    title:
      "טיסות ומלונות בכל העולם",

    subtitle:
      "מצא את הטיסה והמלון המתאימים לך במחיר הטוב ביותר",

    flights:
      "✈️ טיסות",

    hotels:
      "🏨 מלונות"

  },

  en: {

    brand: "Travel Search",

    title:
      "Flights & Hotels Worldwide",

    subtitle:
      "Find the right flight and hotel at the best price",

    flights:
      "✈️ Flights",

    hotels:
      "🏨 Hotels"

  }

};


$("lang").onchange =
  e => {

    const lang =
      e.target.value;

    const t =
      translations[lang];

    $("brandText").textContent =
      t.brand;

    $("mainTitle").textContent =
      t.title;

    $("mainSubtitle").textContent =
      t.subtitle;

    $("fb").textContent =
      t.flights;

    $("hb").textContent =
      t.hotels;

  };


/* =========================
   BACKGROUND
========================= */

function updateBackground() {

  const destination =
    (
      $("city").value ||
      $("to").value ||
      ""
    )
    .trim()
    .toLowerCase();


  const backgrounds = {

    bangkok:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=80",

    paris:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80",

    tokyo:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1600&q=80",

    london:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=80",

    singapore:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1600&q=80",

    dubai:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=80"

  };


  let image =
    backgrounds[destination];


  if (!image) {

    image =
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80";

  }


  $("backgroundLayer").style.backgroundImage =
    `url("${image}")`;

}


$("city").addEventListener(
  "change",
  updateBackground
);

$("to").addEventListener(
  "change",
  updateBackground
);

updateBackground();
