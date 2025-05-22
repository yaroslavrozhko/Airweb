chartInstance = null;
function renderChart(labels, values, labelTitle) {
  const canvas = document.getElementById("aqiChart");

  // Якщо існує графік, знищити перед створенням нового
  if (chartInstance !== null && typeof chartInstance.destroy === "function") {
    chartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `AQI — ${labelTitle}`,
          data: values,
          borderColor: "rgb(75, 192, 192)",
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "AQI",
          },
        },
        x: {
          title: {
            display: true,
            text: labelTitle.includes("Години") ? "Година" : "Дата",
          },
        },
      },
    },
  });
}

let structuredData = {
  January: {},
  February: {},
  March: {},
};

// Завантаження та побудова структури
async function loadData() {
  const citiesRes = await fetch("./data/cities.json");
  const mainRes = await fetch("./data/main.json");
  const cities = await citiesRes.json();
  const data = await mainRes.json();

  const cityMap = {};
  cities.forEach((city) => {
    cityMap[city.id] = {
      city_name: city.city_name,
      region_name: city.region_name,
    };
  });

  const months = {
    "2025-01": "January",
    "2025-02": "February",
    "2025-03": "March",
  };

  data.forEach((entry) => {
    const cityInfo = cityMap[entry.city_id];
    if (!cityInfo) return;

    const monthKey = entry.logged_at.slice(0, 7);
    const month = months[monthKey];
    if (!month) return;

    const date = entry.logged_at.slice(0, 10);
    const { region_name, city_name } = cityInfo;

    if (!structuredData[month][region_name]) {
      structuredData[month][region_name] = {};
    }

    if (!structuredData[month][region_name][city_name]) {
      structuredData[month][region_name][city_name] = {};
    }

    if (!structuredData[month][region_name][city_name][date]) {
      structuredData[month][region_name][city_name][date] = [];
    }

    structuredData[month][region_name][city_name][date].push({
      aqi: entry.aqi,
      pm25: entry.pm25,
      logged_at: entry.logged_at,
    });
  });
}

// Оновлення select'ів
function populateSelect(select, values, defaultOption = "Усі") {
  select.innerHTML = `<option value="">${defaultOption}</option>`;
  values.forEach((val) => {
    const option = document.createElement("option");
    option.value = val;
    option.textContent = val;
    select.appendChild(option);
  });
}

// Логіка фільтрації
function setupFilters() {
  const monthSelect = document.getElementById("month");
  const regionSelect = document.getElementById("region");
  const citySelect = document.getElementById("city");
  const dateSelect = document.getElementById("date");

  const cityContainer = document.getElementById("city-container");
  const dateContainer = document.getElementById("date-container");

  monthSelect.addEventListener("change", () => {
    const month = monthSelect.value;
    const regions = Object.keys(structuredData[month] || {});
    populateSelect(regionSelect, regions, "Усі області");
    regionSelect.value = "";
    citySelect.innerHTML = "";
    dateSelect.innerHTML = "";
    cityContainer.style.display = "none";
    dateContainer.style.display = "none";
  });

  regionSelect.addEventListener("change", () => {
    const month = monthSelect.value;
    const region = regionSelect.value;
    const cities = region
      ? Object.keys(structuredData[month][region] || {})
      : [];
    populateSelect(citySelect, cities, "Усі населені пункти");
    citySelect.value = "";
    cityContainer.style.display = cities.length ? "block" : "none";
    dateContainer.style.display = "none";
    dateSelect.innerHTML = "";
  });

  citySelect.addEventListener("change", () => {
    const month = monthSelect.value;
    const region = regionSelect.value;
    const city = citySelect.value;
    const dates = city
      ? Object.keys(structuredData[month][region][city] || {})
      : [];
    populateSelect(dateSelect, dates, "Усі дати");
    dateSelect.value = "";
    dateContainer.style.display = dates.length ? "block" : "none";
  });
  document.getElementById("show").addEventListener("click", () => {
    const month = document.getElementById("month").value;
    const region = document.getElementById("region").value;
    const city = document.getElementById("city").value;
    const date = document.getElementById("date").value;

    if (!month || !region || !city) {
      alert("Будь ласка, виберіть місяць, область і місто");
      return;
    }

    const entries = structuredData[month]?.[region]?.[city];
    if (!entries) {
      alert("Немає даних для вибраного міста");
      return;
    }

    let labels = [];
    let values = [];

    if (date) {
      // по годинах
      const records = entries[date] || [];
      labels = records.map((e) => e.logged_at.slice(11, 16)); // HH:MM
      values = records.map((e) => e.aqi);
    } else {
      // по днях
      labels = Object.keys(entries).sort(); // YYYY-MM-DD
      values = labels.map((day) => {
        const dayEntries = entries[day];
        const avg =
          dayEntries.reduce((sum, e) => sum + e.aqi, 0) / dayEntries.length;
        return Math.round(avg * 100) / 100;
      });
    }
    console.log(labels, values);
    renderChart(labels, values, date ? `Години ${date}` : `Дні ${city}`);
  });
}

// ініціалізація
loadData().then(setupFilters);
