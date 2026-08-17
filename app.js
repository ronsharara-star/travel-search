let currency = "ILS";

let map = null;

let markers = [];

let allHotels = [];

let currentHotelResults = [];

let backgroundTimer = null;


/* =========================
   ELEMENT HELPER
========================= */

const $ = (id) => document.getElementById(id);


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

  if (value === null || value === undefined) {
    return "-";
  }

  const converted =
    Number(value) * rates[currency];

  return (
    sym[currency] +
    Math.round(converted).toLocaleString()
  );
}


/* =========================
   DATES
========================= */

function nightsBetween(checkin, checkout) {

  if (!checkin || !checkout) {
    return 1;
  }

  const start =
    new Date(checkin + "T00:00:00");

  const end =
    new Date(checkout + "T00:00:00");

  const diff =
    (end - start) /
    (1000 * 60 * 60 * 24);

  return Math.max(1, Math.round(diff));
}


/* =========================
   LOADING
========================= */

function showLoading(text) {

  $("loadingText").textContent = text;

  $("loading").hidden = false;
}


function hideLoading() {

  $("loading").hidden = true;
}


/* =========================
   BACKGROUND IMAGES
   Wikimedia Commons API
========================= */

async function loadDestinationBackground(destination) {

  if (!destination) {
    return;
  }

  const query =
    encodeURIComponent(
      destination + " travel landscape"
    );

  try {

    const url =
      "https://commons.wikimedia.org/w/api.php" +
      "?action=query" +
      "&generator=search" +
      "&gsrsearch=" + query +
      "&gsrnamespace=6" +
      "&gsrlimit=8" +
      "&prop=imageinfo" +
      "&iiprop=url" +
      "&iiurlwidth=1600" +
      "&format=json" +
      "&origin=*";

    const response =
      await fetch(url);

    const data =
      await response.json();

    const pages =
      data.query?.pages || {};

    const images =
      Object.values(pages)
        .map(
          page =>
            page.imageinfo?.[0]?.thumburl ||
            page.imageinfo?.[0]?.url
        )
        .filter(Boolean);

    if (!images.length) {
      return;
    }

    const background =
      $("backgroundLayer");

    let index = 0;

    clearInterval(backgroundTimer);

    background.style.backgroundImage =
      `url("${images[0]}")`;

    background.classList.add("visible");

    backgroundTimer =
      setInterval(() => {

        index =
          (index + 1) %
          images.length;

        background.style.opacity = "0";

        setTimeout(() => {

          background.style.backgroundImage =
            `url("${images[index]}")`;

          background.style.opacity = "1";

        }, 700);

      }, 6000);

  } catch (error) {

    console.log(
      "Background image error:",
      error
    );

  }
}


/* =========================
   DESTINATION BACKGROUND
========================= */

function setDestinationBackground(destination) {

  if (!destination) {
    return;
  }

  loadDestinationBackground(destination);
}


/* =========================
   CURRENCY CHANGE
========================= */

$("currency").onchange = (event) => {

  currency =
    event.target.value;

  if (currentHotelResults.length) {
    renderHotels();
  }
};


/* =========================
   LANGUAGE
========================= */

$("lang").onchange = (event) => {

  const lang =
    event.target.value;

  if (lang === "en") {

    document.documentElement.lang = "en";

    document.documentElement.dir = "ltr";

    $("mainTitle").textContent =
      "Flights & Hotels Worldwide";

    $("mainSubtitle").textContent =
      "Find the best flights and hotels for your trip";

  } else {

    document.documentElement.lang = "he";

    document.documentElement.dir = "rtl";

    $("mainTitle").textContent =
      "טיסות ומלונות בכל העולם";

    $("mainSubtitle").textContent =
      "מצא את הטיסה והמלון המתאימים לך במחיר הטוב ביותר";
  }
};


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
   FLIGHTS SEARCH
========================= */

$("fs").onclick = async () => {

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

    alert(
      "נא להזין מוצא ויעד"
    );

    return;
  }


  setDestinationBackground(
    destination
  );


  showLoading(
    "מחפש את הטיסות הטובות ביותר..."
  );


  try {

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
        "/api/flights?" + params
      );


    const data =
      await response.json();


    renderFlights(
      data.results || []
    );


  } catch (error) {

    console.error(error);

    $("flightResults").innerHTML =
      `
      <div class="errorCard">
        ❌ לא הצלחנו לבצע את החיפוש.
        נסה שוב.
      </div>
      `;

  } finally {

    hideLoading();

  }
};


/* =========================
   FLIGHT RESULTS
========================= */

function renderFlights(results) {

  if (!results.length) {

    $("flightResults").innerHTML =
      `
      <div class="emptyCard">
        ✈️ לא נמצאו טיסות.
      </div>
      `;

    return;
  }


  $("flightResults").innerHTML =
    results.map(
      flight => `
      
      <div class="card flightCard">

        <div class="row">

          <div>

            <div class="airline">
              ✈️ ${flight.airline}
            </div>

            <div class="route">
              ${flight.origin}
              →
              ${flight.destination}
            </div>

            <div class="time">
              ${flight.departure}
              →
              ${flight.arrival}
            </div>

          </div>


          <div class="price">

            ${money(flight.price)}

          </div>

        </div>


        <div class="flightBottom">

          <span>
            ${flight.stops === 0
              ? "🟢 ישירה"
              : "🟠 " + flight.stops + " עצירה/ות"}
          </span>

        </div>

      </div>

      `
    ).join("");
}


/* =========================
   HOTEL SEARCH
========================= */

$("hs").onclick = async () => {

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

    alert(
      "נא להזין עיר או יעד"
    );

    return;
  }


  if (
    checkin &&
    checkout &&
    checkout <= checkin
  ) {

    alert(
      "תאריך היציאה חייב להיות אחרי תאריך הכניסה"
    );

    return;
  }


  setDestinationBackground(city);


  showLoading(
    "מחפש מלונות ומחירים..."
  );


  try {

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
        "/api/hotels?" + params
      );


    const data =
      await response.json();


    allHotels =
      data.results || [];

    currentHotelResults =
      [...allHotels];


    $("hotelFilters").hidden =
      false;


    renderHotels();


    updateMap(
      currentHotelResults
    );


  } catch (error) {

    console.error(error);

    $("hotelResults").innerHTML =
      `
      <div class="errorCard">
        ❌ לא הצלחנו לבצע את חיפוש המלונות.
      </div>
      `;

  } finally {

    hideLoading();

  }
};


/* =========================
   HOTEL FILTERS
========================= */

$("hotelSearch").oninput =
  () => {

    renderHotels();

  };


$("sortHotels").onchange =
  () => {

    renderHotels();

  };


$("minRating").onchange =
  () => {

    renderHotels();

  };


$("maxPrice").oninput =
  () => {

    renderHotels();

  };


$("breakfastFilter").onchange =
  () => {

    renderHotels();

  };


$("cancelFilter").onchange =
  () => {

    renderHotels();

  };


/* =========================
   RENDER HOTELS
========================= */

function renderHotels() {

  let hotels =
    [...allHotels];


  const search =
    $("hotelSearch").value
      .trim()
      .toLowerCase();


  const minRating =
    Number(
      $("minRating").value
    );


  const maxPriceValue =
    $("maxPrice").value;


  const breakfastOnly =
    $("breakfastFilter").checked;


  const cancelOnly =
    $("cancelFilter").checked;


  /* Search */
  if (search) {

    hotels =
      hotels.filter(
        hotel =>
          (hotel.name || "")
            .toLowerCase()
            .includes(search)
      );
  }


  /* Rating */
  hotels =
    hotels.filter(
      hotel =>
        Number(hotel.rating || 0)
        >= minRating
    );


  /* Price */
  if (maxPriceValue) {

    hotels =
      hotels.filter(
        hotel =>
          Number(hotel.price || 0)
          <= Number(maxPriceValue)
      );
  }


  /* Breakfast */
  if (breakfastOnly) {

    hotels =
      hotels.filter(
        hotel =>
          hotel.breakfast === true
      );
  }


  /* Free cancellation */
  if (cancelOnly) {

    hotels =
      hotels.filter(
        hotel =>
          hotel.free_cancel === true
      );
  }


  /* Sorting */

  const sort =
    $("sortHotels").value;


  if (sort === "priceAsc") {

    hotels.sort(
      (a, b) =>
        Number(a.price || 0) -
        Number(b.price || 0)
    );

  } else if (sort === "priceDesc") {

    hotels.sort(
      (a, b) =>
        Number(b.price || 0) -
        Number(a.price || 0)
    );

  } else if (sort === "ratingDesc") {

    hotels.sort(
      (a, b) =>
        Number(b.rating || 0) -
        Number(a.rating || 0)
    );

  } else if (sort === "reviewsDesc") {

    hotels.sort(
      (a, b) =>
        Number(b.reviews || 0) -
        Number(a.reviews || 0)
    );
  }


  currentHotelResults =
    hotels;


  const nights =
    nightsBetween(
      $("checkin").value,
      $("checkout").value
    );


  if (!hotels.length) {

    $("hotelResults").innerHTML =
      `
      <div class="emptyCard">

        🏨 לא נמצאו מלונות
        לפי הסינון שבחרת.

      </div>
      `;

    updateMap([]);

    return;
  }


  $("hotelResults").innerHTML =
    hotels.map(
      hotel => {

        const total =
          Number(hotel.price || 0)
          * nights;


        return `

        <div class="card hotelCard">

          <div class="hotelTop">

            <div>

              <div class="hotelName">
                🏨 ${hotel.name}
              </div>

              <div class="rating">
                ⭐ ${hotel.rating || 0}
              </div>

              <div class="muted">
                ${hotel.reviews || 0} reviews
              </div>

            </div>


            <div class="hotelPrice">

              <div class="price">
                ${money(hotel.price)}
              </div>

              <div class="muted">
                / לילה
              </div>

              <div class="totalPrice">
                ${money(total)}
              </div>

              <div class="muted">
                ${nights} לילות
              </div>

            </div>

          </div>


          <div class="hotelFeatures">

            ${
              hotel.breakfast
                ? `<span>🍳 ארוחת בוקר</span>`
                : ""
            }

            ${
              hotel.free_cancel
                ? `<span>✓ ביטול חינם</span>`
                : ""
            }

          </div>

        </div>

        `;
      }
    ).join("");


  updateMap(hotels);
}


/* =========================
   MAP
========================= */

function initMap() {

  if (map) {
    return;
  }


  map =
    L.map("map");


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,

      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);


  map.setView(
    [13.74, 100.53],
    11
  );


  setTimeout(() => {

    map.invalidateSize();

  }, 500);
}


/* =========================
   UPDATE MAP
========================= */

function updateMap(hotels) {

  initMap();


  markers.forEach(
    marker =>
      marker.remove()
  );


  markers = [];


  if (!hotels.length) {
    return;
  }


  const validHotels =
    hotels.filter(
      hotel =>
        hotel.lat !== null &&
        hotel.lat !== undefined &&
        hotel.lon !== null &&
        hotel.lon !== undefined
    );


  if (!validHotels.length) {
    return;
  }


  const bounds =
    [];


  validHotels.forEach(
    hotel => {

      const lat =
        Number(hotel.lat);

      const lon =
        Number(hotel.lon);


      bounds.push(
        [lat, lon]
      );


      const nights =
        nightsBetween(
          $("checkin").value,
          $("checkout").value
        );


      const total =
        Number(hotel.price || 0)
        * nights;


      const marker =
        L.marker(
          [lat, lon]
        )
        .addTo(map);


      marker.bindPopup(`
        
        <div class="mapPopup">

          <strong>
            🏨 ${hotel.name}
          </strong>

          <div>
            ⭐ ${hotel.rating || 0}
          </div>

          <div>
            💰 ${money(hotel.price)}
            / night
          </div>

          <div>
            💵 ${money(total)}
            / ${nights} nights
          </div>

        </div>

      `);


      markers.push(marker);

    }
  );


  if (bounds.length) {

    map.fitBounds(
      bounds,
      {
        padding: [30, 30]
      }
    );

  }


  setTimeout(() => {

    map.invalidateSize();

  }, 400);
}


/* =========================
   SEARCH INSIDE MAP
========================= */

$("mapSearch").onclick = () => {

  if (!map) {
    return;
  }


  const bounds =
    map.getBounds();


  const visibleHotels =
    allHotels.filter(
      hotel => {

        if (
          hotel.lat === null ||
          hotel.lat === undefined ||
          hotel.lon === null ||
          hotel.lon === undefined
        ) {
          return false;
        }


        return bounds.contains(
          [
            Number(hotel.lat),
            Number(hotel.lon)
          ]
        );
      }
    );


  currentHotelResults =
    visibleHotels;


  $("hotelResults").innerHTML =
    visibleHotels.length
      ? `
        <div class="mapSearchInfo">
          📍 נמצאו ${visibleHotels.length}
          מלונות באזור המפה
        </div>
        `
      : `
        <div class="emptyCard">
          📍 אין מלונות באזור המפה.
        </div>
        `;


  if (visibleHotels.length) {

    renderSpecificHotels(
      visibleHotels
    );
  }
};


/* =========================
   RENDER SPECIFIC HOTELS
========================= */

function renderSpecificHotels(
  hotels
) {

  const nights =
    nightsBetween(
      $("checkin").value,
      $("checkout").value
    );


  $("hotelResults").innerHTML =
    hotels.map(
      hotel => {

        const total =
          Number(hotel.price || 0)
          * nights;


        return `

        <div class="card hotelCard">

          <div class="hotelTop">

            <div>

              <div class="hotelName">
                🏨 ${hotel.name}
              </div>

              <div class="rating">
                ⭐ ${hotel.rating || 0}
              </div>

              <div class="muted">
                ${hotel.reviews || 0} reviews
              </div>

            </div>


            <div class="hotelPrice">

              <div class="price">
                ${money(hotel.price)}
              </div>

              <div class="muted">
                / לילה
              </div>

              <div class="totalPrice">
                ${money(total)}
              </div>

              <div class="muted">
                ${nights} לילות
              </div>

            </div>

          </div>

        </div>

        `;
      }
    ).join("");
}


/* =========================
   DEFAULT DATES
========================= */

function setDefaultDates() {

  const today =
    new Date();


  const tomorrow =
    new Date(today);

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );


  const afterTomorrow =
    new Date(today);

  afterTomorrow.setDate(
    afterTomorrow.getDate() + 3
  );


  const format =
    date =>
      date.toISOString()
        .split("T")[0];


  $("dep").value =
    format(tomorrow);


  $("ret").value =
    format(afterTomorrow);


  $("checkin").value =
    format(tomorrow);


  $("checkout").value =
    format(afterTomorrow);
}


/* =========================
   START
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setDefaultDates();

    initMap();

  }
);
