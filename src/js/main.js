console.log("Wanderlust App Started!");

// Select Navigation Elements
const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

console.log("Navigation Items:", navItems.length);
console.log("Views:", views.length);

// ADDED: header title / subtitle for every view
const viewTitles = {
    "dashboard": ["Dashboard", "Welcome back! Ready to plan your next adventure?"],
    "holidays": ["Holidays", "Browse public holidays and plan your trips around them"],
    "events": ["Events", "Discover concerts, sports, theatre and more"],
    "weather": ["Weather", "7-day weather forecast for your destination"],
    "long-weekends": ["Long Weekends", "Find holidays near weekends for mini-trips"],
    "currency": ["Currency Converter", "Convert between currencies with live exchange rates"],
    "sun-times": ["Sun Times", "Sunrise and sunset times for your destination"],
    "my-plans": ["My Plans", "Your saved holidays, events and long weekends"]
};

function showView(viewName) {
    // ADDED: fall back to dashboard if the view does not exist
    if (!document.getElementById(viewName + "-view")) {
        viewName = "dashboard";
    }

    views.forEach(function(view) {
        view.classList.remove("active");
    });

    navItems.forEach(function(item) {
        item.classList.remove("active");
    });

    document.getElementById(viewName + "-view").classList.add("active");

    const activeNav = document.querySelector('[data-view="' + viewName + '"]');

    if (activeNav) {
        activeNav.classList.add("active");
    }

    // ADDED: page title + subtitle
    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");

    if (pageTitle && viewTitles[viewName]) {
        pageTitle.textContent = viewTitles[viewName][0];
        pageSubtitle.textContent = viewTitles[viewName][1];
    }

    // ADDED: load currency rates when opening the currency page
    if (viewName === "currency") {
        getExchangeRates();
    }

    closeMobileMenu();
}

// ADDED: Routing, the URL changes with every view (#/weather, #/my-plans ...)
function routeFromHash() {
    const viewName = location.hash.replace("#/", "").replace("#", "") || "dashboard";

    showView(viewName);
}

window.addEventListener("hashchange", routeFromHash);

navItems.forEach(function(item) {
    item.addEventListener("click", function(event) {
        event.preventDefault();

        const viewName = item.getAttribute("data-view");

        // CHANGED: change the URL instead of calling showView directly
        if (location.hash === "#/" + viewName) {
            showView(viewName);
        } else {
            location.hash = "#/" + viewName;
        }
    });
});

const countriesAPI = "https://date.nager.at/api/v3/AvailableCountries";
const countryDetailsAPI = "https://restcountries.com/v3.1/alpha/";
const publicHolidaysAPI = "https://date.nager.at/api/v3/PublicHolidays/";
const longWeekendAPI = "https://date.nager.at/api/v3/LongWeekend/";
const eventsAPI = "https://app.ticketmaster.com/discovery/v2/events.json";
const ticketmasterAPIKey = "VwECw2OiAzxVzIqnwmKJUG41FbeXJk1y";
const weatherAPI = "https://api.open-meteo.com/v1/forecast";
const currencyAPI = "https://v6.exchangerate-api.com/v6/805842951e5953ad31497176/latest/"; // ADDED
const sunTimesAPI = "https://api.sunrise-sunset.org/json"; // ADDED
let countries = [];
let countryDetails = null; // ADDED
let exchangeRates = {}; // ADDED
let countryDetailsCountryCode = "";
let ratesUpdated = ""; // ADDED
let weatherUtcOffset = null; // ADDED
let favoriteHolidays = JSON.parse(localStorage.getItem("favoriteHolidays")) || [];
let favoriteLongWeekends = JSON.parse(localStorage.getItem("favoriteLongWeekends")) || [];
let currentPlanFilter = "all";
let favoriteEvents = JSON.parse(localStorage.getItem("favoriteEvents")) || [];
let exchangeRatesLoading = false;

const countrySelect = document.getElementById("global-country");
const citySelect = document.getElementById("global-city");
const yearSelect = document.getElementById("global-year");
const searchButton = document.getElementById("global-search-btn");
const holidaysContent = document.getElementById("holidays-content");
const eventsContent = document.getElementById("events-content");
const weatherContent = document.getElementById("weather-content");
const holidaysSelection = document.getElementById("holidays-selection");
const plansContent = document.getElementById("plans-content");
const lwContent = document.getElementById("lw-content");
const allCount = document.getElementById("filter-all-count");
const holidayCount = document.getElementById("filter-holiday-count");
const eventCount = document.getElementById("filter-event-count");
const longWeekendCount = document.getElementById("filter-lw-count");
const planFilters = document.querySelectorAll(".plan-filter");

console.log("Selected Year:", yearSelect.value);
console.log("Search Button:", searchButton);

// ADDED: some cities for the City dropdown (the capital is added for every country)
const cityCoordinates = {
    EG: {
        Cairo: { lat: 30.0444, lon: 31.2357 },
        Alexandria: { lat: 31.2001, lon: 29.9187 }
    },
    US: {
        "New York": { lat: 40.7128, lon: -74.006 },
        "Los Angeles": { lat: 34.0522, lon: -118.2437 },
        Chicago: { lat: 41.8781, lon: -87.6298 },
        Miami: { lat: 25.7617, lon: -80.1918 }
    },
    GB: {
        London: { lat: 51.5074, lon: -0.1278 },
        Manchester: { lat: 53.4808, lon: -2.2426 },
        Edinburgh: { lat: 55.9533, lon: -3.1883 }
    },
    FR: {
        Paris: { lat: 48.8566, lon: 2.3522 },
        Lyon: { lat: 45.764, lon: 4.8357 },
        Marseille: { lat: 43.2965, lon: 5.3698 }
    },
    DE: {
        Berlin: { lat: 52.52, lon: 13.405 },
        Munich: { lat: 48.1351, lon: 11.582 },
        Hamburg: { lat: 53.5511, lon: 9.9937 }
    },
    IT: {
        Rome: { lat: 41.9028, lon: 12.4964 },
        Milan: { lat: 45.4642, lon: 9.19 },
        Venice: { lat: 45.4408, lon: 12.3155 }
    },
    ES: {
        Madrid: { lat: 40.4168, lon: -3.7038 },
        Barcelona: { lat: 41.3851, lon: 2.1734 },
        Seville: { lat: 37.3891, lon: -5.9845 }
    },
    JP: {
        Tokyo: { lat: 35.6762, lon: 139.6503 },
        Osaka: { lat: 34.6937, lon: 135.5023 },
        Kyoto: { lat: 35.0116, lon: 135.7681 }
    },
    CA: {
        Toronto: { lat: 43.6532, lon: -79.3832 },
        Vancouver: { lat: 49.2827, lon: -123.1207 },
        Montreal: { lat: 45.5017, lon: -73.5673 }
    },
    AU: {
        Sydney: { lat: -33.8688, lon: 151.2093 },
        Melbourne: { lat: -37.8136, lon: 144.9631 },
        Brisbane: { lat: -27.4698, lon: 153.0251 }
    }
};

// ADDED: small helpers
function showAlert(message) {
    if (typeof Swal !== "undefined") {
        Swal.fire({ icon: "warning", title: "Oops!", text: message });
    } else {
        alert(message);
    }
}

function formatDate(dateString, options) {
    if (!dateString) return "";

    const date = new Date(String(dateString).length === 10 ? dateString + "T00:00:00" : dateString);

    if (isNaN(date)) return dateString;

    return date.toLocaleDateString("en-US", options || {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "N/A";
}

function parseUtcOffsetMinutes(timezone) {
    const match = timezone ? timezone.match(/UTC([+-])(\d{2}):(\d{2})/) : null;

    if (!match) return 0;

    return (match[1] === "-" ? -1 : 1) * (parseInt(match[2]) * 60 + parseInt(match[3]));
}

async function getCountries() {
    try {
        const response = await fetch(countriesAPI);

        countries = await response.json();

        countries.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });

        // CHANGED: clear the static Egypt option so it is not duplicated
        countrySelect.innerHTML = '<option value="">Select Country</option>';

        countries.forEach(function(country) {
            const option = document.createElement("option");

            option.value = country.countryCode;
            option.textContent = country.name;

            countrySelect.appendChild(option);
        });

        countrySelect.value = "EG";

        // ADDED: dashboard stat
        const countriesStat = document.getElementById("stat-countries");

        if (countriesStat) {
            countriesStat.textContent = countries.length;
        }

        console.log("Countries Loaded:", countries.length);
    } catch (error) {
        console.error("Failed to load countries:", error);
    }
}

function getSelectedCountry() {
    return countries.find(function(country) {
        return country.countryCode === countrySelect.value;
    });
}

// ADDED: Country details (Dashboard info + city list + coordinates)

async function getCountryDetails() {
    countryDetails = null;

    const countryCode = countrySelect.value;

    if (countryCode) {
        try {
            const response = await fetch(countryDetailsAPI + countryCode);

            if (!response.ok) {
                throw new Error("Country details API is unavailable");
            }

            const data = await response.json();

            countryDetails = Array.isArray(data) ? data[0] : data;

        } catch (error) {
            console.warn("Country details unavailable:", error);
        }
    }

    countryDetailsCountryCode = countryCode;

    populateCities();
    renderCountryInfo();
}


function getCapitalName() {
    if (countryDetails && countryDetails.capital && countryDetails.capital.length) {
        return countryDetails.capital[0];
    }

    return "";
}

// ADDED
function populateCities() {
    const countryCode = countrySelect.value;
    const cityList = cityCoordinates[countryCode] ? Object.keys(cityCoordinates[countryCode]) : [];
    const capital = getCapitalName();

    if (capital && cityList.indexOf(capital) === -1) {
        cityList.unshift(capital);
    }

    citySelect.innerHTML = "";

    if (cityList.length === 0) {
        citySelect.innerHTML = '<option value="">Select City</option>';
        return;
    }

    cityList.forEach(function(cityName) {
        const option = document.createElement("option");

        option.value = cityName;
        option.textContent = cityName;

        citySelect.appendChild(option);
    });

    citySelect.value = cityList[0];
}

// ADDED

function getSelectedCoordinates() {
    const countryCode = countrySelect.value;
    const cityName = citySelect.value;
    const countryCities = cityCoordinates[countryCode];

    if (countryCities && countryCities[cityName]) {
        return {
            name: cityName,
            lat: countryCities[cityName].lat,
            lon: countryCities[cityName].lon
        };
    }

    if (countryDetails && countryDetails.capitalInfo && countryDetails.capitalInfo.latlng) {
        return {
            name: cityName || getCapitalName(),
            lat: countryDetails.capitalInfo.latlng[0],
            lon: countryDetails.capitalInfo.latlng[1]
        };
    }

    if (countryDetails && countryDetails.latlng) {
        return {
            name: cityName || getCapitalName() || countryDetails.name.common,
            lat: countryDetails.latlng[0],
            lon: countryDetails.latlng[1]
        };
    }

    return null;
}


// ADDED: fills the existing #dashboard-country-info section
function renderCountryInfo() {
    const box = document.getElementById("dashboard-country-info");

    if (!box) return;

    if (!countryDetails) {
        box.innerHTML = "<p>Select a country to see its information.</p>";
        return;
    }

    const c = countryDetails;

    const currencyTags = c.currencies
        ? Object.keys(c.currencies).map(function(code) {
            const currency = c.currencies[code];

            return '<span class="extra-tag">' + currency.name + " (" + code + (currency.symbol ? " " + currency.symbol : "") + ")</span>";
        }).join("")
        : '<span class="extra-tag">N/A</span>';

    const languageTags = c.languages
        ? Object.values(c.languages).map(function(language) {
            return '<span class="extra-tag">' + language + "</span>";
        }).join("")
        : '<span class="extra-tag">N/A</span>';

    const borderTags = c.borders && c.borders.length
        ? c.borders.map(function(border) {
            return '<span class="extra-tag border-tag">' + border + "</span>";
        }).join("")
        : '<span class="extra-tag">No land borders</span>';

    const callingCode = c.idd && c.idd.root
        ? c.idd.root + (c.idd.suffixes && c.idd.suffixes.length === 1 ? c.idd.suffixes[0] : "")
        : "N/A";

    const mapLink = c.maps && c.maps.googleMaps
        ? c.maps.googleMaps
        : "https://www.google.com/maps/place/" + encodeURIComponent(c.name.common);

    box.innerHTML = `
        <div class="dashboard-country-header">
            <img src="${c.flags ? c.flags.png : ""}" alt="${c.name.common}" class="dashboard-country-flag">
            <div class="dashboard-country-title">
                <h3>${c.name.common}</h3>
                <p class="official-name">${c.name.official}</p>
                <span class="region"><i class="fa-solid fa-location-dot"></i> ${c.region || ""}${c.subregion ? " • " + c.subregion : ""}</span>
            </div>
        </div>

        <div class="dashboard-local-time">
            <div class="local-time-display">
                <i class="fa-solid fa-clock"></i>
                <span class="local-time-value" id="country-local-time"></span>
                <span class="local-time-zone">${c.timezones ? c.timezones[0] : ""}</span>
            </div>
        </div>

        <div class="dashboard-country-grid">
            <div class="dashboard-country-detail">
                <i class="fa-solid fa-building-columns"></i>
                <span class="label">Capital</span>
                <span class="value">${getCapitalName() || "N/A"}</span>
            </div>
            <div class="dashboard-country-detail">
                <i class="fa-solid fa-users"></i>
                <span class="label">Population</span>
                <span class="value">${c.population ? c.population.toLocaleString("en-US") : "N/A"}</span>
            </div>
            <div class="dashboard-country-detail">
                <i class="fa-solid fa-ruler-combined"></i>
                <span class="label">Area</span>
                <span class="value">${c.area ? c.area.toLocaleString("en-US") + " km²" : "N/A"}</span>
            </div>
            <div class="dashboard-country-detail">
                <i class="fa-solid fa-globe"></i>
                <span class="label">Continent</span>
                <span class="value">${c.continents ? c.continents.join(", ") : "N/A"}</span>
            </div>
            <div class="dashboard-country-detail">
                <i class="fa-solid fa-phone"></i>
                <span class="label">Calling Code</span>
                <span class="value">${callingCode}</span>
            </div>
            <div class="dashboard-country-detail">
                <i class="fa-solid fa-car"></i>
                <span class="label">Driving Side</span>
                <span class="value">${capitalize(c.car ? c.car.side : "")}</span>
            </div>
            <div class="dashboard-country-detail">
                <i class="fa-solid fa-calendar-week"></i>
                <span class="label">Week Starts</span>
                <span class="value">${capitalize(c.startOfWeek)}</span>
            </div>
        </div>

        <div class="dashboard-country-extras">
            <div class="dashboard-country-extra">
                <h4><i class="fa-solid fa-coins"></i> Currency</h4>
                <div class="extra-tags">${currencyTags}</div>
            </div>
            <div class="dashboard-country-extra">
                <h4><i class="fa-solid fa-language"></i> Languages</h4>
                <div class="extra-tags">${languageTags}</div>
            </div>
            <div class="dashboard-country-extra">
                <h4><i class="fa-solid fa-map-location-dot"></i> Neighbors</h4>
                <div class="extra-tags">${borderTags}</div>
            </div>
        </div>

        <div class="dashboard-country-actions">
            <a href="${mapLink}" target="_blank" class="btn-map-link">
                <i class="fa-solid fa-map"></i> View on Google Maps
            </a>
        </div>
    `;

    updateCountryLocalTime();
}

// ADDED: live local time of the selected country
function updateCountryLocalTime() {
    const timeElement = document.getElementById("country-local-time");

    if (!timeElement || !countryDetails || !countryDetails.timezones) return;

    const offsetMinutes = parseUtcOffsetMinutes(countryDetails.timezones[0]);
    const shifted = new Date(Date.now() + offsetMinutes * 60000);

    timeElement.textContent = shifted.toLocaleTimeString("en-US", { timeZone: "UTC" });
}

setInterval(updateCountryLocalTime, 1000);

// ADDED: keep every "selected destination" badge in sync
function updateSelectionBadges() {
    const selectedCountry = getSelectedCountry();

    if (!selectedCountry) return;

    const countryCode = countrySelect.value;
    const cityName = citySelect.value;
    const year = yearSelect.value;

    holidaysSelection.innerHTML = `
        <div class="current-selection-badge">
            <img src="https://flagcdn.com/w40/${countryCode.toLowerCase()}.png" alt="${selectedCountry.name}" class="selection-flag">
            <span>${selectedCountry.name}</span>
            <span class="selection-year">${year}</span>
        </div>
    `;

    document.querySelectorAll(".view-header-selection .current-selection-badge").forEach(function(badge) {
        const flag = badge.querySelector(".selection-flag");
        const name = badge.querySelector("span");
        const cityText = badge.querySelector(".selection-city");
        const yearText = badge.querySelector(".selection-year");

        if (flag) {
            flag.src = "https://flagcdn.com/w40/" + countryCode.toLowerCase() + ".png";
            flag.alt = selectedCountry.name;
        }

        if (name) name.textContent = selectedCountry.name;
        if (cityText) cityText.textContent = cityName ? "• " + cityName : "";
        if (yearText) yearText.textContent = year;
    });

    const selectedDestination = document.getElementById("selected-destination");

    if (selectedDestination) {
        document.getElementById("selected-country-flag").src = "https://flagcdn.com/w80/" + countryCode.toLowerCase() + ".png";
        document.getElementById("selected-country-flag").alt = selectedCountry.name;
        document.getElementById("selected-country-name").textContent = selectedCountry.name;
        document.getElementById("selected-city-name").textContent = cityName ? "• " + cityName : "";
        selectedDestination.classList.remove("hidden");
    }
}

async function getPublicHolidays() {
    const countryCode = countrySelect.value;
    const year = yearSelect.value;
    const selectedCountry = countries.find(function(country) {
        return country.countryCode === countryCode;
    });

    holidaysSelection.innerHTML = `
    <div class="current-selection-badge">
        <img src="https://flagcdn.com/w40/${countryCode.toLowerCase()}.png" alt="${selectedCountry ? selectedCountry.name : countryCode}" class="selection-flag">
        <span>${selectedCountry ? selectedCountry.name : countryCode}</span>
        <span class="selection-year">${year}</span>
    </div>
`;

    try {
        const response = await fetch(publicHolidaysAPI + year + "/" + countryCode);

        const holidays = await response.json();
        holidaysContent.innerHTML = "";

        // ADDED: dashboard stat
        const holidaysStat = document.getElementById("stat-holidays");

        if (holidaysStat) {
            holidaysStat.textContent = holidays.length;
        }

        if (!holidays.length) {
            holidaysContent.innerHTML = "<p>No public holidays found for this year.</p>";
            return;
        }

        holidays.forEach(function(holiday) {
    const card = document.createElement("div");

    card.classList.add("holiday-card");
    const isFavorite = favoriteHolidays.some(function(favorite) {
    return favorite.date === holiday.date && favorite.countryCode === holiday.countryCode;
});
    const date = new Date(holiday.date + "T00:00:00");

const day = date.getDate();
const month = date.toLocaleString("en-US", { month: "short" });
const weekday = date.toLocaleString("en-US", { weekday: "long" });
card.innerHTML = `
    <div class="holiday-card-header">
        <div class="holiday-date-box">
            <span class="day">${day}</span>
            <span class="month">${month}</span>
        </div>
        <button class="holiday-action-btn" data-date="${holiday.date}">
        <i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
   </button>
    </div>
    <h3>${holiday.name}</h3>
    <p class="holiday-name">${holiday.localName}</p>
    <div class="holiday-card-footer">
        <span class="holiday-day-badge">
            <i class="fa-regular fa-calendar"></i> ${weekday}
        </span>
        <span class="holiday-type-badge">Public</span>
    </div>
`;
holidaysContent.appendChild(card);
const favoriteButton = card.querySelector(".holiday-action-btn");
favoriteButton.addEventListener("click", function() {
    const alreadyFavorite = favoriteHolidays.some(function(favorite) {
        return favorite.date === holiday.date && favorite.countryCode === holiday.countryCode;
    });

    if (alreadyFavorite) {
        favoriteHolidays = favoriteHolidays.filter(function(favorite) {
            return favorite.date !== holiday.date || favorite.countryCode !== holiday.countryCode;
        });

        favoriteButton.innerHTML = '<i class="fa-regular fa-heart"></i>';
    } else {
        favoriteHolidays.push(holiday);

        favoriteButton.innerHTML = '<i class="fa-solid fa-heart"></i>';
    }

    localStorage.setItem("favoriteHolidays", JSON.stringify(favoriteHolidays));
    displaySavedPlans();
});
});

        console.log("Public Holidays:", holidays);
    } catch (error) {
        console.error("Failed to load holidays:", error);
        holidaysContent.innerHTML = "<p>Unable to load public holidays. Please try again.</p>";
    }
}

// ADDED: delete one plan from My Plans
function removePlan(item) {
    if (item.type === "holiday") {
        favoriteHolidays = favoriteHolidays.filter(function(favorite) {
            return !(favorite.date === item.date && favorite.countryCode === item.countryCode);
        });
    } else if (item.type === "longweekend") {
        favoriteLongWeekends = favoriteLongWeekends.filter(function(favorite) {
            return !(favorite.name === item.name &&
                     favorite.startDate === item.startDate &&
                     favorite.countryCode === item.countryCode);
        });
    } else {
        favoriteEvents = favoriteEvents.filter(function(favorite) {
            return favorite.id !== item.id;
        });
    }

    localStorage.setItem("favoriteHolidays", JSON.stringify(favoriteHolidays));
    localStorage.setItem("favoriteLongWeekends", JSON.stringify(favoriteLongWeekends));
    localStorage.setItem("favoriteEvents", JSON.stringify(favoriteEvents));

    displaySavedPlans();

    // keep the hearts in the other pages in sync
    if (countrySelect.value) {
        getPublicHolidays();
        getLongWeekends();
        getEvents();
    }
}

function displaySavedPlans() {
    plansContent.innerHTML = "";
    updatePlanCounts();

    if (favoriteHolidays.length === 0 && favoriteLongWeekends.length === 0 && favoriteEvents.length === 0) {
        plansContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-heart-crack"></i></div>
                <h3>No Saved Plans Yet</h3>
                <p>Start exploring and save holidays, events, or long weekends you like!</p>
                <button class="btn-primary" id="start-exploring-btn">
                    <i class="fa-solid fa-compass"></i> Start Exploring
                </button>
            </div>
        `;

        document.getElementById("start-exploring-btn").addEventListener("click", function() {
            location.hash = "#/dashboard"; // CHANGED: was showView("dashboard")
        });

        return;
    }

    let savedPlans = [
        ...favoriteHolidays.map(function(item) {
            return { ...item, type: "holiday" };
        }),
        ...favoriteLongWeekends.map(function(item) {
            return { ...item, type: "longweekend" };
        }),
        ...favoriteEvents.map(function(item) {
            return { ...item, type: "event" };
        })
    ];

    const filteredPlans = savedPlans.filter(function(item) {
        if (currentPlanFilter === "all") return true;
        return item.type === currentPlanFilter;
    });

    filteredPlans.forEach(function(item) {
        const card = document.createElement("div");
        card.classList.add("holiday-card");

        if (item.type === "holiday") {
            card.innerHTML = `
                <h3>${item.name}</h3>
                <p>${item.localName}</p>
                <p>${formatDate(item.date)}</p>
            `;
        } else if (item.type === "longweekend") {
            card.innerHTML = `
                <h3>${item.name}</h3>
                <p>${item.startDate} - ${item.endDate}</p>
                <p>${item.daysCount} Days Off</p>
            `;
        } else {
            card.innerHTML = `
                <h3>${item.name}</h3>
                <p>${item.category}</p>
                <p>${formatDate(item.date)} ${item.time || ""}</p>
                <p>${item.venue}</p>
                <a href="${item.url}" target="_blank">Buy Tickets</a>
            `;
        }

        // ADDED: delete button
        const deleteButton = document.createElement("button");
        deleteButton.classList.add("holiday-action-btn", "delete-plan-btn");
        deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i> Remove';

        deleteButton.addEventListener("click", function() {
            removePlan(item);
        });

        card.appendChild(deleteButton);

        plansContent.appendChild(card);
    });

    if (filteredPlans.length === 0) {
        plansContent.innerHTML = `
            <div class="empty-state">
                <h3>No Saved Plans Found</h3>
                <p>You haven't saved any plans in this category yet.</p>
            </div>
        `;
    }
}
function updatePlanCounts() {
    const totalPlans = favoriteHolidays.length + favoriteLongWeekends.length + favoriteEvents.length;

    allCount.textContent = totalPlans;
    holidayCount.textContent = favoriteHolidays.length;
    eventCount.textContent = favoriteEvents.length;
    longWeekendCount.textContent = favoriteLongWeekends.length;

    // ADDED: sidebar badge + dashboard stat
    const plansCount = document.getElementById("plans-count");
    const statSaved = document.getElementById("stat-saved");

    if (plansCount) {
        plansCount.textContent = totalPlans;
        plansCount.classList.toggle("hidden", totalPlans === 0);
    }

    if (statSaved) {
        statSaved.textContent = totalPlans;
    }
}

// ADDED: one function that loads everything for the selected destination
async function runSearch() {
    if (!countrySelect.value) {
        showAlert("Please select a country first.");
        return;
    }

    // load country details only if they are not loaded for this country yet
    if (countryDetailsCountryCode !== countrySelect.value) {
    await getCountryDetails();
}

    updateSelectionBadges();

    getPublicHolidays();
    getLongWeekends();
    getEvents();

    await getWeather();
    getSunTimes();
}

searchButton.addEventListener("click", runSearch);

countrySelect.addEventListener("change", function() {
    const selectedCountry = countrySelect.value;

    console.log("Selected Country:", selectedCountry);

    getCountryDetails(); // ADDED
});

// ADDED: clear the selected destination
const clearSelectionButton = document.getElementById("clear-selection-btn");

if (clearSelectionButton) {
    clearSelectionButton.addEventListener("click", function() {
        countrySelect.value = "";
        countryDetails = null;
        populateCities();
        renderCountryInfo();

        document.getElementById("selected-destination").classList.add("hidden");
    });
}

displaySavedPlans();
const clearAllButton = document.getElementById("clear-all-plans-btn");
clearAllButton.addEventListener("click", function() {
    favoriteHolidays = [];
    favoriteLongWeekends = [];
    favoriteEvents = [];

    localStorage.setItem("favoriteHolidays", JSON.stringify(favoriteHolidays));
    localStorage.setItem("favoriteLongWeekends", JSON.stringify(favoriteLongWeekends));
    localStorage.setItem("favoriteEvents", JSON.stringify(favoriteEvents));

    displaySavedPlans();

    if (countrySelect.value) {
        getPublicHolidays();
        getLongWeekends();
        getEvents();
    }
});
planFilters.forEach(function(filter) {
    filter.addEventListener("click", function() {
        planFilters.forEach(function(item) {
            item.classList.remove("active");
        });

        filter.classList.add("active");
        const filterType = filter.getAttribute("data-filter");

console.log("Selected Filter:", filterType);
currentPlanFilter = filterType;
displaySavedPlans();
    });
});

// ADDED: keep both heart buttons of an event card in sync
function updateEventSaveButtons(card, saved) {
    card.querySelector(".event-card-save").innerHTML = '<i class="' + (saved ? "fa-solid" : "fa-regular") + ' fa-heart"></i>';
    card.querySelector(".btn-event").innerHTML = '<i class="' + (saved ? "fa-solid" : "fa-regular") + ' fa-heart"></i> ' + (saved ? "Saved" : "Save");
}


async function getEvents() {
    const selectedCountry = countrySelect.value;

    if (!selectedCountry) {
        return;
    }

    console.log("Selected Country Code:", selectedCountry);

    const city = getSelectedCoordinates();
    const baseUrl = eventsAPI + "?apikey=" + ticketmasterAPIKey + "&countryCode=" + selectedCountry + "&size=20&sort=date,asc";

    eventsContent.innerHTML = "<p>Loading events...</p>";

    let data = null;

    try {
        if (city) {
            try {
                const response = await fetch(baseUrl + "&city=" + encodeURIComponent(city.name));

                if (response.ok) {
                    data = await response.json();
                }
            } catch (error) {
                console.warn("City events unavailable.");
            }
        }

        if (!data || !(data._embedded && data._embedded.events)) {
            const response = await fetch(baseUrl);

            if (!response.ok) {
                throw new Error("Failed to load events");
            }

            data = await response.json();
        }
    } catch (error) {
        console.error("Ticketmaster unavailable:", error);
    }

    let events = data && data._embedded && data._embedded.events
        ? data._embedded.events
        : [];

    if (events.length === 0) {
        const today = new Date();

        function getMockDate(days) {
            const date = new Date(today);
            date.setDate(date.getDate() + days);
            return date.toISOString().split("T")[0];
        }

        events = [
            {
                id: "mock-event-1",
                name: "Cairo Music Festival",
                category: "Music",
                icon: "fa-music",
                date: getMockDate(5),
                time: "19:00:00",
                venue: "Cairo Festival City",
                city: "Cairo",
                isMock: true
            },
            {
                id: "mock-event-2",
                name: "Egypt Football Match",
                category: "Sports",
                icon: "fa-futbol",
                date: getMockDate(8),
                time: "20:00:00",
                venue: "Cairo International Stadium",
                city: "Cairo",
                isMock: true
            },
            {
                id: "mock-event-3",
                name: "Theatre Night",
                category: "Arts & Theatre",
                icon: "fa-masks-theater",
                date: getMockDate(12),
                time: "18:00:00",
                venue: "Cairo Opera House",
                city: "Cairo",
                isMock: true
            },
            {
                id: "mock-event-4",
                name: "Live Music Night",
                category: "Music",
                icon: "fa-headphones",
                date: getMockDate(15),
                time: "21:00:00",
                venue: "New Cairo",
                city: "Cairo",
                isMock: true
            },
            {
                id: "mock-event-5",
                name: "Art & Culture Exhibition",
                category: "Arts",
                icon: "fa-palette",
                date: getMockDate(19),
                time: "17:00:00",
                venue: "Downtown Cairo",
                city: "Cairo",
                isMock: true
            },
            {
                id: "mock-event-6",
                name: "Food Festival",
                category: "Festival",
                icon: "fa-utensils",
                date: getMockDate(23),
                time: "16:00:00",
                venue: "Sheikh Zayed",
                city: "Cairo",
                isMock: true
            }
        ];

        console.log("Displaying Mock Events.");
    }

    const eventsStat = document.getElementById("stat-events");

    if (eventsStat) {
        eventsStat.textContent = data && data.page && data.page.totalElements
            ? data.page.totalElements
            : events.length;
    }

    eventsContent.innerHTML = "";

    events.forEach(function(event) {
        const eventCard = document.createElement("div");
        eventCard.classList.add("event-card");

        const eventImage = event.images && event.images.length
            ? (event.images.find(function(item) {
                return item.ratio === "16_9";
            }) || event.images[0]).url
            : "";

        const eventCategory = event.category || (
            event.classifications &&
            event.classifications[0] &&
            event.classifications[0].segment
                ? event.classifications[0].segment.name
                : "Event"
        );

        const venueObject = event._embedded &&
            event._embedded.venues &&
            event._embedded.venues[0];

        const eventVenue = event.venue || (
            venueObject ? venueObject.name : "Venue not available"
        );

        const venueCity = event.city || (
            venueObject && venueObject.city
                ? venueObject.city.name
                : ""
        );

        const eventDate = event.date || (
            event.dates && event.dates.start
                ? event.dates.start.localDate
                : ""
        );

        const eventTime = event.time || (
            event.dates && event.dates.start
                ? event.dates.start.localTime
                : ""
        );

        const eventName = event.name || "Event";

        const imageContent = eventImage
            ? `<img src="${eventImage}" alt="${eventName}">`
            : `<div style="width:100%;height:100%;min-height:180px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ff8a3d,#ff5e62);color:white;font-size:55px;">
                <i class="fa-solid ${event.icon || "fa-calendar-days"}"></i>
               </div>`;

        eventCard.innerHTML = `
            <div class="event-card-image">
                ${imageContent}
                <span class="event-card-category">${eventCategory}</span>
                <button class="event-card-save">
                    <i class="fa-regular fa-heart"></i>
                </button>
            </div>
            <div class="event-card-body">
                <h3>${eventName}</h3>
                <div class="event-card-info">
                    <div>
                        <i class="fa-regular fa-calendar"></i>
                        ${eventDate ? formatDate(eventDate) : "Date to be announced"}
                        ${eventTime ? " at " + eventTime.slice(0, 5) : ""}
                    </div>
                    <div>
                        <i class="fa-solid fa-location-dot"></i>
                        ${eventVenue}${venueCity ? ", " + venueCity : ""}
                    </div>
                </div>
                <div class="event-card-footer">
                    <button class="btn-event">
                        <i class="fa-regular fa-heart"></i> Save
                    </button>
                    <a href="${event.url || "#"}" target="_blank" class="btn-buy-ticket">
                        <i class="fa-solid fa-ticket"></i>
                        ${event.isMock ? "Demo Event" : "Buy Tickets"}
                    </a>
                </div>
            </div>
        `;

        const savedEvent = {
            id: event.id,
            name: eventName,
            category: eventCategory,
            date: eventDate,
            time: eventTime,
            venue: eventVenue,
            url: event.url || ""
        };

        function isEventSaved() {
            return favoriteEvents.some(function(item) {
                return item.id === savedEvent.id;
            });
        }

        updateEventSaveButtons(eventCard, isEventSaved());

        function toggleEvent() {
            if (isEventSaved()) {
                favoriteEvents = favoriteEvents.filter(function(item) {
                    return item.id !== savedEvent.id;
                });
            } else {
                favoriteEvents.push(savedEvent);
            }

            localStorage.setItem("favoriteEvents", JSON.stringify(favoriteEvents));
            updateEventSaveButtons(eventCard, isEventSaved());
            displaySavedPlans();
        }

        eventCard.querySelector(".event-card-save").addEventListener("click", toggleEvent);
        eventCard.querySelector(".btn-event").addEventListener("click", toggleEvent);

        if (event.isMock) {
            eventCard.querySelector(".btn-buy-ticket").addEventListener("click", function(e) {
                e.preventDefault();
            });
        }

        eventsContent.appendChild(eventCard);
    });

    console.log("Events displayed:", events.length);
}

// ADDED: weather code -> text / icon
function getWeatherCondition(code) {
    if (code === 0) return "Clear sky";
    if (code <= 3) return "Partly cloudy";
    if (code <= 48) return "Fog";
    if (code <= 57) return "Drizzle";
    if (code <= 67) return "Rain";
    if (code <= 77) return "Snow";
    if (code <= 82) return "Rain showers";
    if (code <= 86) return "Snow showers";
    return "Thunderstorm";
}

function getWeatherIcon(code) {
    if (code === 0) return "fa-sun";
    if (code <= 3) return "fa-cloud-sun";
    if (code <= 48) return "fa-smog";
    if (code <= 67) return "fa-cloud-rain";
    if (code <= 77) return "fa-snowflake";
    if (code <= 82) return "fa-cloud-showers-heavy";
    if (code <= 86) return "fa-snowflake";
    return "fa-cloud-bolt";
}


async function getWeather() {
    const city = getSelectedCoordinates();

    if (!city) {
        console.warn("Weather coordinates are unavailable for this country.");

        document.querySelector(".forecast-list").innerHTML = "";
        document.querySelector(".hourly-scroll").innerHTML = "";

        document.querySelector(".weather-condition").textContent = "Weather unavailable";
        document.querySelector(".temp-value").textContent = "--";
        document.querySelector(".weather-feels").textContent = "--";
        document.querySelector(".weather-location span").textContent =
    citySelect.value || countrySelect.options[countrySelect.selectedIndex].text;

document.querySelector(".weather-high-low .high").textContent = "--";
document.querySelector(".weather-high-low .low").textContent = "--";

        document.querySelectorAll(".weather-details-grid .detail-value").forEach(function(item) {
            item.textContent = "--";
        });

        return;
    }
    try {
        const response = await fetch(weatherAPI + "?latitude=" + city.lat + "&longitude=" + city.lon + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,wind_speed_10m_max&timezone=auto&forecast_days=7");

        const data = await response.json();
        const current = data.current;
        const daily = data.daily;
        const hourly = data.hourly;

        weatherUtcOffset = data.utc_offset_seconds;

        const forecastContent = document.querySelector(".forecast-list");
        forecastContent.innerHTML = "";
        for (let i = 0; i < 7; i++) {
            const forecastDay = document.createElement("div");
            forecastDay.classList.add("forecast-day");

            if (i === 0) {
                forecastDay.classList.add("today");
            }

            const date = new Date(daily.time[i] + "T00:00:00");
            const dayName = i === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" });
            const dayDate = date.toLocaleDateString("en-US", { day: "numeric", month: "short" });

            forecastDay.innerHTML = `
        <div class="forecast-day-name">
            <span class="day-label">${dayName}</span>
            <span class="day-date">${dayDate}</span>
        </div>
        <div class="forecast-icon">
         <i class="fa-solid ${getWeatherIcon(daily.weather_code[i])}"></i>
        </div>
        <div class="forecast-temps">
            <span class="temp-max">${Math.round(daily.temperature_2m_max[i])}°</span>
            <span class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</span>
        </div>
        <div class="forecast-precip">
            <i class="fa-solid fa-droplet"></i><span>${daily.precipitation_probability_max[i]}%</span>
            <i class="fa-solid fa-wind"></i><span>${Math.round(daily.wind_speed_10m_max[i])} km/h</span>
        </div>
    `;

            forecastContent.appendChild(forecastDay);
        }

        // CHANGED: hourly forecast starts from the current hour and has icons
        const hourlyContent = document.querySelector(".hourly-scroll");
        hourlyContent.innerHTML = "";

        let startIndex = hourly.time.findIndex(function(time) {
            return time >= current.time;
        });

        if (startIndex < 0) startIndex = 0;

        for (let i = startIndex; i < startIndex + 8 && i < hourly.time.length; i++) {
            const hourItem = document.createElement("div");
            hourItem.classList.add("hourly-item");

            if (i === startIndex) {
                hourItem.classList.add("now");
            }

            const hourLabel = i === startIndex
                ? "Now"
                : new Date(hourly.time[i]).toLocaleTimeString("en-US", { hour: "numeric", hour12: true });

            hourItem.innerHTML = `
        <span class="hourly-time">${hourLabel}</span>
        <div class="hourly-icon"><i class="fa-solid ${getWeatherIcon(hourly.weather_code[i])}"></i></div>
        <span class="hourly-temp">${Math.round(hourly.temperature_2m[i])}°</span>
    `;

            hourlyContent.appendChild(hourItem);
        }

        const temperature = document.querySelector(".temp-value");
        const feelsLike = document.querySelector(".weather-feels");
        const condition = document.querySelector(".weather-condition");
        const detailValues = document.querySelectorAll(".weather-details-grid .detail-value");

        condition.textContent = getWeatherCondition(current.weather_code);
        temperature.textContent = Math.round(current.temperature_2m);
        feelsLike.textContent = "Feels like " + Math.round(current.apparent_temperature) + "°C";

        detailValues[0].textContent = current.relative_humidity_2m + "%";
        detailValues[1].textContent = current.wind_speed_10m + " km/h";
        detailValues[2].textContent = daily.uv_index_max[0]; // ADDED: UV index
        detailValues[3].textContent = daily.precipitation_probability_max[0] + "%";

        const heroIcon = document.querySelector(".weather-hero-icon i");

        if (heroIcon) {
            heroIcon.className = "fa-solid " + getWeatherIcon(current.weather_code);
        }

        // ADDED: location + date in the weather card
        const weatherCity = document.querySelector(".weather-location span");
        const weatherTime = document.querySelector(".weather-time");

        if (weatherCity) weatherCity.textContent = city.name;
        if (weatherTime) weatherTime.textContent = formatDate(current.time, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

        const highTemp = document.querySelector(".weather-high-low .high");
        const lowTemp = document.querySelector(".weather-high-low .low");

        highTemp.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${Math.round(daily.temperature_2m_max[0])}°`;
        lowTemp.innerHTML = `<i class="fa-solid fa-arrow-down"></i> ${Math.round(daily.temperature_2m_min[0])}°`;

        console.log("Weather API Response:", data);
    } catch (error) {
        console.error("Failed to load weather:", error);
    }
}


async function getLongWeekends() {
    const countryCode = countrySelect.value;
    const year = yearSelect.value;

    if (!countryCode) {
        return;
    }

    try {
        const response = await fetch(longWeekendAPI + year + "/" + countryCode);

        if (!response.ok) {
            throw new Error("Failed to load long weekends");
        }

        const longWeekends = await response.json();

        lwContent.innerHTML = "";

        longWeekends.forEach(function(item) {
            const weekendStart = new Date(item.startDate + "T00:00:00");
            const weekendEnd = new Date(item.endDate + "T00:00:00");
            const daysCount = item.dayCount;

            const card = document.createElement("div");
            card.classList.add("lw-card");

            card.innerHTML = `
                <div class="lw-card-header">
                    <span class="lw-badge">${item.needBridgeDay ? "Bridge Day Required" : "Long Weekend"}</span>
                    <button class="holiday-action-btn lw-save-btn">
                        <i class="fa-regular fa-heart"></i>
                    </button>
                </div>
                <h3>Long Weekend</h3>
                <p class="lw-dates">
                    ${weekendStart.toDateString()} - ${weekendEnd.toDateString()}
                </p>
            `;

            const daysInfo = document.createElement("div");
            daysInfo.classList.add("lw-info-box", "success");
            daysInfo.textContent = daysCount + " Days Off";

            card.appendChild(daysInfo);

            const daysVisual = document.createElement("div");
            daysVisual.classList.add("lw-days-visual");

            let currentDate = new Date(weekendStart);

            while (currentDate <= weekendEnd) {
                const day = document.createElement("div");
                day.classList.add("lw-day");

                day.innerHTML = `
                    <span class="name">${currentDate.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span class="num">${currentDate.getDate()}</span>
                `;

                daysVisual.appendChild(day);
                currentDate.setDate(currentDate.getDate() + 1);
            }

            card.appendChild(daysVisual);

            const saveButton = card.querySelector(".lw-save-btn");

            const longWeekend = {
                name: "Long Weekend",
                startDate: weekendStart.toDateString(),
                endDate: weekendEnd.toDateString(),
                daysCount: daysCount,
                countryCode: countryCode,
                year: year
            };

            function isLongWeekendSaved() {
                return favoriteLongWeekends.some(function(item) {
                    return item.name === longWeekend.name &&
                           item.startDate === longWeekend.startDate &&
                           item.countryCode === longWeekend.countryCode;
                });
            }

            if (isLongWeekendSaved()) {
                saveButton.innerHTML = '<i class="fa-solid fa-heart"></i>';
            }

            saveButton.addEventListener("click", function() {
                if (isLongWeekendSaved()) {
                    favoriteLongWeekends = favoriteLongWeekends.filter(function(item) {
                        return !(item.name === longWeekend.name &&
                                 item.startDate === longWeekend.startDate &&
                                 item.countryCode === longWeekend.countryCode);
                    });

                    saveButton.innerHTML = '<i class="fa-regular fa-heart"></i>';
                } else {
                    favoriteLongWeekends.push(longWeekend);
                    saveButton.innerHTML = '<i class="fa-solid fa-heart"></i>';
                }

                localStorage.setItem("favoriteLongWeekends", JSON.stringify(favoriteLongWeekends));
                displaySavedPlans();
            });

            lwContent.appendChild(card);
        });

        if (!lwContent.children.length) {
            lwContent.innerHTML = "<p>No long weekends found for this year.</p>";
        }

        console.log("Long Weekends:", longWeekends);

    } catch (error) {
        console.error("Failed to load long weekends:", error);
        lwContent.innerHTML = "<p>Unable to load long weekends. Please try again.</p>";
    }
}


// ADDED: ===================== Currency Converter =====================
const popularCurrencies = [
    { code: "EUR", flag: "eu" },
    { code: "GBP", flag: "gb" },
    { code: "EGP", flag: "eg" },
    { code: "AED", flag: "ae" },
    { code: "SAR", flag: "sa" },
    { code: "JPY", flag: "jp" },
    { code: "CAD", flag: "ca" },
    { code: "INR", flag: "in" }
];

let currencyNames = null;

function getCurrencyName(code) {
    try {
        if (!currencyNames) {
            currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
        }

        return currencyNames.of(code);
    } catch (error) {
        return code;
    }
}


async function getExchangeRates() {
    if (Object.keys(exchangeRates).length > 0 || exchangeRatesLoading) {
        return;
    }

    exchangeRatesLoading = true;

    try {
        const response = await fetch(currencyAPI + "USD");

        if (!response.ok) {
            throw new Error(`Failed to fetch exchange rates: ${response.status}`);
        }

        const data = await response.json();

        if (data.result !== "success") {
            throw new Error("Exchange rate API returned an error");
        }

        exchangeRates = data.conversion_rates;
        ratesUpdated = data.time_last_update_utc;

        populateCurrencyOptions();
        renderPopularCurrencies();
        convertCurrency();

    } catch (error) {
        console.error("Failed to load exchange rates:", error);

        const result = document.getElementById("currency-result");

        if (result) {
            result.innerHTML = "<p>Unable to load exchange rates. Please try again later.</p>";
        }

    } finally {
        exchangeRatesLoading = false;
    }
}


function populateCurrencyOptions() {
    const fromSelect = document.getElementById("currency-from");
    const toSelect = document.getElementById("currency-to");

    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";

    Object.keys(exchangeRates).sort().forEach(function(code) {
        const text = code + " - " + getCurrencyName(code);

        const fromOption = document.createElement("option");
        const toOption = document.createElement("option");

        fromOption.value = code;
        fromOption.textContent = text;

        toOption.value = code;
        toOption.textContent = text;

        fromSelect.appendChild(fromOption);
        toSelect.appendChild(toOption);
    });

    fromSelect.value = "USD";
    toSelect.value = "EGP";
}

// Quick Convert cards (rates against 1 USD)
function renderPopularCurrencies() {
    const container = document.getElementById("popular-currencies");

    if (!container) return;

    container.innerHTML = "";

    popularCurrencies.forEach(function(currency) {
        if (!exchangeRates[currency.code]) return;

        const card = document.createElement("div");
        card.classList.add("popular-currency-card");

        card.innerHTML = `
            <img src="https://flagcdn.com/w40/${currency.flag}.png" alt="${currency.code}" class="flag">
            <div class="info"><div class="code">${currency.code}</div><div class="name">${getCurrencyName(currency.code)}</div></div>
            <div class="rate">${exchangeRates[currency.code].toFixed(4)}</div>
        `;

        card.addEventListener("click", function() {
            document.getElementById("currency-to").value = currency.code;
            convertCurrency();
        });

        container.appendChild(card);
    });
}

function convertCurrency() {
    const amountInput = document.getElementById("currency-amount");
    const fromSelect = document.getElementById("currency-from");
    const toSelect = document.getElementById("currency-to");
    const result = document.getElementById("currency-result");

    const amount = parseFloat(amountInput.value);
    const fromCurrency = fromSelect.value;
    const toCurrency = toSelect.value;

    if (isNaN(amount) || amount < 0) {
        result.innerHTML = "<p>Please enter a valid amount.</p>";
        return;
    }

    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
        result.innerHTML = "<p>Exchange rates are still loading...</p>";
        return;
    }

    const rate = exchangeRates[toCurrency] / exchangeRates[fromCurrency];
    const convertedAmount = amount * rate;

    result.innerHTML = `
        <div class="conversion-display">
            <div class="conversion-from">
                <span class="amount">${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span class="currency-code">${fromCurrency}</span>
            </div>
            <div class="conversion-equals"><i class="fa-solid fa-equals"></i></div>
            <div class="conversion-to">
                <span class="amount">${convertedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span class="currency-code">${toCurrency}</span>
            </div>
        </div>
        <div class="exchange-rate-info">
            <p>1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}</p>
            <small>Last updated: ${ratesUpdated ? formatDate(ratesUpdated, { month: "long", day: "numeric", year: "numeric" }) : new Date().toLocaleDateString("en-US")}</small>
        </div>
    `;
}

const convertButton = document.getElementById("convert-btn");
const swapButton = document.getElementById("swap-currencies-btn");
const currencyAmount = document.getElementById("currency-amount");
const currencyFrom = document.getElementById("currency-from");
const currencyTo = document.getElementById("currency-to");

convertButton.addEventListener("click", convertCurrency);

swapButton.addEventListener("click", function() {
    const oldFrom = currencyFrom.value;

    currencyFrom.value = currencyTo.value;
    currencyTo.value = oldFrom;

    convertCurrency();
});

currencyAmount.addEventListener("input", convertCurrency);
currencyFrom.addEventListener("change", convertCurrency);
currencyTo.addEventListener("change", convertCurrency);

// ADDED: ===================== Sun Times =====================
function formatSunTime(time) {
    // show the time in the destination's own time zone
    const offsetSeconds = weatherUtcOffset !== null
        ? weatherUtcOffset
        : (countryDetails && countryDetails.timezones ? parseUtcOffsetMinutes(countryDetails.timezones[0]) * 60 : 0);

    return new Date(new Date(time).getTime() + offsetSeconds * 1000).toLocaleTimeString("en-US", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function formatDayLength(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return hours + "h " + minutes + "m";
}


async function getSunTimes() {
    if (!countrySelect.value) {
        return;
    }

    const city = getSelectedCoordinates();

    if (!city) {
        console.warn("Sun times coordinates are unavailable.");

        document.querySelector(".sun-location h2").textContent = "Location unavailable";

        document.querySelectorAll(".sun-time-card .time").forEach(function(item) {
            item.textContent = "--";
        });

        document.querySelectorAll(".day-length-stats .day-stat .value").forEach(function(item) {
            item.textContent = "--";
        });

        document.querySelector(".day-progress-fill").style.width = "0%";

        return;
    }

    const today = new Date().toISOString().split("T")[0];

    try {
        const response = await fetch(sunTimesAPI + "?lat=" + city.lat + "&lng=" + city.lon + "&date=" + today + "&formatted=0");
        const data = await response.json();

        if (data.status !== "OK") {
            throw new Error("Sun times are not available");
        }

        const results = data.results;
        const sunTimes = document.querySelectorAll(".sun-time-card .time");
        const dayLengthValues = document.querySelectorAll(".day-length-stats .day-stat .value");
        const dayLength = results.day_length;
        const daylightPercentage = (dayLength / 86400) * 100;

        document.querySelector(".sun-location h2").innerHTML = '<i class="fa-solid fa-location-dot"></i> ' + city.name;
        document.querySelector(".sun-date-display .date").textContent = formatDate(today, { month: "long", day: "numeric", year: "numeric" });
        document.querySelector(".sun-date-display .day").textContent = formatDate(today, { weekday: "long" });

        const sunValues = [
            formatSunTime(results.civil_twilight_begin),
            formatSunTime(results.sunrise),
            formatSunTime(results.solar_noon),
            formatSunTime(results.sunset),
            formatSunTime(results.civil_twilight_end),
            formatDayLength(dayLength)
        ];

        sunValues.forEach(function(value, index) {
            if (sunTimes[index]) {
                sunTimes[index].textContent = value;
            }
        });

        dayLengthValues[0].textContent = formatDayLength(dayLength);
        dayLengthValues[1].textContent = daylightPercentage.toFixed(1) + "%";
        dayLengthValues[2].textContent = formatDayLength(86400 - dayLength);

        document.querySelector(".day-progress-fill").style.width = daylightPercentage + "%";
    } catch (error) {
        console.error("Failed to load sun times:", error);
    }
}

// ADDED: ===================== Mobile menu + date/time =====================
function closeMobileMenu() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    if (overlay) {
        overlay.classList.add("hidden");
        overlay.classList.remove("active");
    }
}

const mobileMenuButton = document.getElementById("mobile-menu-btn");
const sidebarOverlay = document.getElementById("sidebar-overlay");

mobileMenuButton.addEventListener("click", function() {
    document.getElementById("sidebar").classList.toggle("open");
    sidebarOverlay.classList.toggle("hidden");
    sidebarOverlay.classList.toggle("active");
});

sidebarOverlay.addEventListener("click", closeMobileMenu);

function updateDateTime() {
    const dateTime = document.getElementById("current-datetime");

    if (dateTime) {
        dateTime.textContent = new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }
}

// ADDED: start the app (countries -> URL view -> load everything for the selected destination)
async function initializeApp() {
    updateDateTime();
    setInterval(updateDateTime, 60000);

    await getCountries();

    displaySavedPlans();
    routeFromHash();

    await runSearch();
}

initializeApp();