/**
 * Response normalizers — trim raw WeatherAPI payloads down to compact,
 * LLM-friendly objects containing only the fields needed for reasoning.
 *
 * Keeping payloads small saves tokens and makes tool results easier to audit.
 * Each function is pure (input → output, no side effects) so they're trivial
 * to unit test with fixture data.
 */

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Pull the fields we care about from a condition object */
function normalizeCondition(condition) {
  return {
    text: condition.text,
    icon: condition.icon?.replace('//', 'https://'),
  }
}

/** Normalise a single forecast day object */
function normalizeForecastDay(day, dateStr) {
  return {
    date: dateStr,
    maxTempC: day.maxtemp_c,
    minTempC: day.mintemp_c,
    maxTempF: day.maxtemp_f,
    minTempF: day.mintemp_f,
    avgHumidityPct: day.avghumidity,
    chanceOfRainPct: day.daily_chance_of_rain,
    chanceOfSnowPct: day.daily_chance_of_snow,
    totalPrecipMm: day.totalprecip_mm,
    maxWindKph: day.maxwind_kph,
    uvIndex: day.uv,
    condition: normalizeCondition(day.condition),
  }
}

/** Normalise a single hourly slot */
function normalizeHour(hour) {
  return {
    time: hour.time,
    tempC: hour.temp_c,
    tempF: hour.temp_f,
    feelsLikeC: hour.feelslike_c,
    feelsLikeF: hour.feelslike_f,
    humidity: hour.humidity,
    chanceOfRainPct: hour.chance_of_rain,
    chanceOfSnowPct: hour.chance_of_snow,
    precipMm: hour.precip_mm,
    windKph: hour.wind_kph,
    windDir: hour.wind_dir,
    isDay: hour.is_day === 1,
    condition: normalizeCondition(hour.condition),
  }
}

/** Normalise location block (shared across endpoints) */
function normalizeLocation(loc) {
  return {
    name: loc.name,
    region: loc.region,
    country: loc.country,
    lat: loc.lat,
    lon: loc.lon,
    localtime: loc.localtime,
    tzId: loc.tz_id,
  }
}

// ── Public normalizers ────────────────────────────────────────────────────────

/**
 * Normalise a /current.json response.
 * @param {object} raw  Raw WeatherAPI current response
 */
export function normalizeCurrent(raw) {
  const { location, current } = raw
  return {
    location: normalizeLocation(location),
    current: {
      tempC: current.temp_c,
      tempF: current.temp_f,
      feelsLikeC: current.feelslike_c,
      feelsLikeF: current.feelslike_f,
      humidity: current.humidity,
      windKph: current.wind_kph,
      windDir: current.wind_dir,
      pressureMb: current.pressure_mb,
      visibilityKm: current.vis_km,
      uvIndex: current.uv,
      isDay: current.is_day === 1,
      condition: normalizeCondition(current.condition),
      lastUpdated: current.last_updated,
    },
  }
}

/**
 * Normalise a /forecast.json response (without alerts).
 * @param {object} raw  Raw WeatherAPI forecast response
 * @param {boolean} [includeHours=false]  Whether to include hourly slots
 */
export function normalizeForecast(raw, includeHours = false) {
  const { location, forecast } = raw
  const days = (forecast.forecastday ?? []).map((fd) => {
    const day = normalizeForecastDay(fd.day, fd.date)
    if (includeHours) {
      day.hours = (fd.hour ?? []).map(normalizeHour)
    }
    return day
  })

  return {
    location: normalizeLocation(location),
    forecast: days,
  }
}

/**
 * Normalise a /forecast.json?alerts=yes response.
 * @param {object} raw  Raw WeatherAPI response with alerts field
 */
export function normalizeAlerts(raw) {
  const { location, alerts } = raw
  const items = (alerts?.alert ?? []).map((a) => ({
    headline: a.headline,
    severity: a.severity,
    urgency: a.urgency,
    areas: a.areas,
    event: a.event,
    effective: a.effective,
    expires: a.expires,
    description: a.desc,
    instruction: a.instruction,
  }))

  return {
    location: normalizeLocation(location),
    alerts: items,
    hasAlerts: items.length > 0,
  }
}

/**
 * Normalise a /astronomy.json response.
 * @param {object} raw
 */
export function normalizeAstronomy(raw) {
  const { location, astronomy } = raw
  const astro = astronomy.astro
  return {
    location: normalizeLocation(location),
    astronomy: {
      sunrise: astro.sunrise,
      sunset: astro.sunset,
      moonrise: astro.moonrise,
      moonset: astro.moonset,
      moonPhase: astro.moon_phase,
      moonIlluminationPct: Number(astro.moon_illumination),
      isSunUp: astro.is_sun_up === 1,
      isMoonUp: astro.is_moon_up === 1,
    },
  }
}

/**
 * Normalise a /search.json response (array of location matches).
 * @param {object[]} raw  Array of location objects from WeatherAPI
 */
export function normalizeSearch(raw) {
  return (raw ?? []).map((loc) => ({
    name: loc.name,
    region: loc.region,
    country: loc.country,
    lat: loc.lat,
    lon: loc.lon,
    url: loc.url,
  }))
}
