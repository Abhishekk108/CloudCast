/**
 * WeatherCard — renders structured weather data from a tool-call result
 * alongside the chat reply, giving the user a glanceable visual summary.
 *
 * Only shown when the assistant response includes at least one tool call
 * with a result that contains current or forecast weather data.
 */

function CurrentWeatherCard({ location, current }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
      {current.condition?.icon && (
        <img
          src={current.condition.icon}
          alt={current.condition.text ?? 'weather icon'}
          className="h-12 w-12 shrink-0"
        />
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-sky-700">
          {location?.name}{location?.country ? `, ${location.country}` : ''}
        </p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">
          {current.tempC}°C
          <span className="ml-2 text-sm font-normal text-gray-500">
            feels {current.feelsLikeC}°C
          </span>
        </p>
        <p className="text-xs text-gray-500">{current.condition?.text}</p>
      </div>
      <div className="ml-auto shrink-0 text-right text-xs text-gray-500 space-y-0.5">
        <p>💧 {current.humidity}%</p>
        <p>💨 {current.windKph} km/h</p>
        <p>☀️ UV {current.uvIndex}</p>
      </div>
    </div>
  )
}

function ForecastCard({ location, forecast }) {
  if (!forecast?.length) return null
  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-sky-700">
        {location?.name} — {forecast.length}-day forecast
      </p>
      <div className="grid gap-1.5">
        {forecast.map((day) => (
          <div key={day.date} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-gray-500">{day.date}</span>
            {day.condition?.icon && (
              <img src={day.condition.icon} alt="" className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="flex-1 truncate text-gray-600">{day.condition?.text}</span>
            <span className="shrink-0 font-medium text-gray-800">
              {day.minTempC}° – {day.maxTempC}°C
            </span>
            {day.chanceOfRainPct > 0 && (
              <span className="shrink-0 text-sky-600">🌧 {day.chanceOfRainPct}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Attempt to extract a displayable weather payload from a toolCalls array.
 * Returns the first result that looks like current or forecast weather.
 */
function extractWeatherResult(toolCalls) {
  for (const tc of toolCalls ?? []) {
    if (!tc.result) continue
    if (tc.tool === 'get_current_weather' && tc.result.current) {
      return { type: 'current', ...tc.result }
    }
    if (tc.tool === 'get_forecast' && tc.result.forecast?.length) {
      return { type: 'forecast', ...tc.result }
    }
  }
  return null
}

export function WeatherCard({ toolCalls }) {
  const data = extractWeatherResult(toolCalls)
  if (!data) return null

  return (
    <div className="mt-1 max-w-sm">
      {data.type === 'current' ? (
        <CurrentWeatherCard location={data.location} current={data.current} />
      ) : (
        <ForecastCard location={data.location} forecast={data.forecast} />
      )}
    </div>
  )
}
