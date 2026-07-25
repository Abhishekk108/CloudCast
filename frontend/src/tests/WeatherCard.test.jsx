import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeatherCard } from '../components/WeatherCard/WeatherCard.jsx'

const currentToolCall = {
  tool: 'get_current_weather',
  args: { location: 'Chennai' },
  result: {
    location: { name: 'Chennai', country: 'India' },
    current: {
      tempC: 34,
      feelsLikeC: 37,
      humidity: 72,
      windKph: 18,
      uvIndex: 8,
      condition: {
        text: 'Sunny',
        icon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png',
      },
    },
  },
}

const forecastToolCall = {
  tool: 'get_forecast',
  args: { location: 'Pune', days: 3 },
  result: {
    location: { name: 'Pune', country: 'India' },
    forecast: [
      {
        date: '2024-07-20',
        minTempC: 22,
        maxTempC: 30,
        chanceOfRainPct: 60,
        condition: {
          text: 'Patchy rain',
          icon: 'https://cdn.weatherapi.com/weather/64x64/day/176.png',
        },
      },
    ],
  },
}

describe('WeatherCard', () => {
  it('renders nothing when toolCalls is empty', () => {
    const { container } = render(<WeatherCard toolCalls={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when toolCalls is undefined', () => {
    const { container } = render(<WeatherCard />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for non-weather tool calls (e.g. search_location)', () => {
    const searchCall = { tool: 'search_location', args: {}, result: [{ name: 'Chennai' }] }
    const { container } = render(<WeatherCard toolCalls={[searchCall]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders current weather card with temperature', () => {
    render(<WeatherCard toolCalls={[currentToolCall]} />)
    expect(screen.getByText(/34°C/i)).toBeInTheDocument()
  })

  it('renders condition text for current weather', () => {
    render(<WeatherCard toolCalls={[currentToolCall]} />)
    expect(screen.getByText('Sunny')).toBeInTheDocument()
  })

  it('renders location name for current weather', () => {
    render(<WeatherCard toolCalls={[currentToolCall]} />)
    expect(screen.getByText(/Chennai/i)).toBeInTheDocument()
  })

  it('renders humidity, wind, and UV for current weather', () => {
    render(<WeatherCard toolCalls={[currentToolCall]} />)
    expect(screen.getByText(/72%/)).toBeInTheDocument()
    expect(screen.getByText(/18 km\/h/)).toBeInTheDocument()
    expect(screen.getByText(/UV 8/)).toBeInTheDocument()
  })

  it('renders condition icon for current weather', () => {
    render(<WeatherCard toolCalls={[currentToolCall]} />)
    const img = screen.getByRole('img', { name: /sunny/i })
    expect(img).toHaveAttribute('src', expect.stringContaining('weatherapi.com'))
  })

  it('renders forecast card with date and temps', () => {
    render(<WeatherCard toolCalls={[forecastToolCall]} />)
    expect(screen.getByText('2024-07-20')).toBeInTheDocument()
    expect(screen.getByText(/22°.*30°C/)).toBeInTheDocument()
  })

  it('renders rain chance in forecast when > 0', () => {
    render(<WeatherCard toolCalls={[forecastToolCall]} />)
    expect(screen.getByText(/60%/)).toBeInTheDocument()
  })

  it('uses first matching weather tool call when multiple are present', () => {
    const anotherCall = {
      tool: 'get_current_weather',
      args: { location: 'Mumbai' },
      result: {
        location: { name: 'Mumbai', country: 'India' },
        current: { tempC: 29, feelsLikeC: 32, humidity: 80, windKph: 10, uvIndex: 5, condition: { text: 'Cloudy', icon: '' } },
      },
    }
    render(<WeatherCard toolCalls={[currentToolCall, anotherCall]} />)
    // First matching call (Chennai) should be shown
    expect(screen.getByText(/Chennai/i)).toBeInTheDocument()
  })
})
