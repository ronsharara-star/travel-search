let currency = "ILS";
let map = null;
let markers = [];

const $ = (x) => document.getElementById(x);

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

function money(x) {
  return (sym[currency] || "") +
    Math.round(x * rates[currency]).toLocaleString();
}

/* Currency */
$("currency").onchange = (e) => {
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

/* Flights */
$("fs").onclick = async () => {

  const p = new URLSearchParams({
    origin: $("from").value,
    destination: $("to").value,
    departure: $("dep").value,
    return_date: $("ret").value,
    adults: $("adults").value
  });

  try {

    const response = await fetch("/api/flights?" + p);
    const d = await response.json();

    $("flightResults").innerHTML = d.results.map(x => `
      <div class="card">
        <div class="row">
          <div>
            <b>✈️ ${x.airline}</b>
            <div>${x.origin} → ${x.destination}</div>
            <div class="muted">
              ${x.departure} → ${x.arrival}
            </div>
          </div>

          <div class="price">
            ${money(x.price)}
          </div>
        </div>

        <div class="muted">
          ${x.stops} עצירה/ות
        </div>
      </div>
    `).join("");

  } catch (error) {

    $("flightResults").innerHTML =
      `<div class="card">❌ שגיאה בחיפוש הטיסות</div>`;
  }
};


/* Hotels */
$("hs").onclick = async () => {

  const p = new URLSearchParams({
    city: $("city").value,
    checkin: $("checkin").value,
    checkout: $("checkout").value,
    guests: $("guests").value,
    rooms: $("rooms").value
  });

  try {

    const response = await fetch("/api/hotels?" + p);
    const d = await response.json();

    $("hotelResults").innerHTML = d.results.map(x => `
      <div class="card">

        <div class="row">

          <div>
            <b>🏨 ${x.name}</b>

            <div>
              ⭐ ${x.rating}
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

    /* Create map */
    if (!map) {

      map = L.map("map");

      /* IMPORTANT:
         This loads the actual map background */
      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }
      ).addTo(map);

      map.setView([13.74, 100.53], 11);
    }

    /* Remove old markers */
    markers.forEach(marker => marker.remove());
    markers = [];

    /* Add hotel markers */
    d.results.forEach(x => {

      if (
        x.lat !== null &&
        x.lat !== undefined &&
        x.lon !== null &&
        x.lon !== undefined
      ) {

        const marker = L.marker([
          Number(x.lat),
          Number(x.lon)
        ])
        .addTo(map)
        .bindPopup(`
          <b>${x.name}</b><br>
          ⭐ ${x.rating}<br>
          ${money(x.price)} / night
        `);

        markers.push(marker);
      }

    });

    /* Center map */
    const first = d.results.find(
      x =>
        x.lat !== null &&
        x.lat !== undefined &&
        x.lon !== null &&
        x.lon !== undefined
    );

    if (first) {

      map.setView(
        [Number(first.lat), Number(first.lon)],
        12
      );

    }

    setTimeout(() => {
      map.invalidateSize();
    }, 300);

  } catch (error) {

    $("hotelResults").innerHTML =
      `<div class="card">❌ שגיאה בחיפוש המלונות</div>`;

  }

};
