/**
 * Raw WeatherAPI response fixtures — match real API shape, trimmed for brevity.
 * Used across weatherApiClient and normalizer tests.
 */

export const rawCurrent = {
  location: {
    name: 'Pune',
    region: 'Maharashtra',
    country: 'India',
    lat: 18.52,
    lon: 73.86,
    tz_id: 'Asia/Kolkata',
    localtime: '2024-07-15 14:30',
  },
  current: {
    last_updated: '2024-07-15 14:00',
    temp_c: 27.0,
    temp_f: 80.6,
    is_day: 1,
    condition: { text: 'Partly cloudy', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png', code: 1003 },
    wind_kph: 14.4,
    wind_dir: 'W',
    pressure_mb: 1008.0,
    humidity: 65,
    feelslike_c: 29.2,
    feelslike_f: 84.6,
    vis_km: 10.0,
    uv: 6.0,
  },
}

export const rawForecast = {
  location: rawCurrent.location,
  forecast: {
    forecastday: [
      {
        date: '2024-07-15',
        day: {
          maxtemp_c: 30.0,
          mintemp_c: 22.0,
          maxtemp_f: 86.0,
          mintemp_f: 71.6,
          avghumidity: 68,
          daily_chance_of_rain: 60,
          daily_chance_of_snow: 0,
          totalprecip_mm: 4.5,
          maxwind_kph: 20.0,
          uv: 5,
          condition: { text: 'Patchy rain possible', icon: '//cdn.weatherapi.com/weather/64x64/day/176.png', code: 1063 },
        },
        hour: [
          {
            time: '2024-07-15 18:00',
            temp_c: 28.0,
            temp_f: 82.4,
            feelslike_c: 30.1,
            feelslike_f: 86.2,
            humidity: 70,
            chance_of_rain: 55,
            chance_of_snow: 0,
            precip_mm: 1.2,
            wind_kph: 18.0,
            wind_dir: 'SW',
            is_day: 1,
            condition: { text: 'Light rain', icon: '//cdn.weatherapi.com/weather/64x64/day/296.png', code: 1183 },
          },
        ],
      },
    ],
  },
}

export const rawAlerts = {
  location: rawCurrent.location,
  alerts: {
    alert: [
      {
        headline: 'Flood Watch issued',
        severity: 'Moderate',
        urgency: 'Expected',
        areas: 'Pune district',
        event: 'Flood Watch',
        effective: '2024-07-15T12:00:00+05:30',
        expires: '2024-07-16T06:00:00+05:30',
        desc: 'Flooding possible in low-lying areas.',
        instruction: 'Move valuables to higher ground.',
      },
    ],
  },
}

export const rawAstronomy = {
  location: rawCurrent.location,
  astronomy: {
    astro: {
      sunrise: '06:05 AM',
      sunset: '07:22 PM',
      moonrise: '09:30 PM',
      moonset: '07:48 AM',
      moon_phase: 'Waning Gibbous',
      moon_illumination: '78',
      is_sun_up: 1,
      is_moon_up: 0,
    },
  },
}

export const rawSearch = [
  { name: 'Springfield', region: 'Illinois', country: 'USA', lat: 39.8, lon: -89.65, url: 'springfield-illinois' },
  { name: 'Springfield', region: 'Missouri', country: 'USA', lat: 37.21, lon: -93.29, url: 'springfield-missouri' },
]

// ── Error responses WeatherAPI returns ───────────────────────────────────────

export const errorLocationNotFound = {
  error: { code: 1006, message: 'No matching location found.' },
}

export const errorAuthFailed = {
  error: { code: 2006, message: 'API key is invalid.' },
}
