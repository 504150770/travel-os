import { CloudSun, Umbrella } from 'lucide-react';
import type { WeatherContextState } from '@/features/weather/useWeatherContext';
import { weatherCondition } from '@/features/weather/weatherModel';
import '@/components/travel-intelligence.css';

export function WeatherChip({ weather, compact = false }: { weather: WeatherContextState; compact?: boolean }) {
  if (weather.kind === 'loading' || weather.kind === 'unavailable') return null;
  if (weather.kind === 'seasonal') return (
    <span className={`travel-weather-chip ${compact ? 'compact' : ''}`} title={weather.reference.source}>
      <CloudSun /><span><small>Typical Dec</small><b>{weather.reference.temperatureMin}–{weather.reference.temperatureMax}°C</b></span>
    </span>
  );
  const item = weather.weather;
  return (
    <span className={`travel-weather-chip ${compact ? 'compact' : ''}`} title={`${item.provider} · Updated ${new Date(item.updatedAt).toLocaleString()}`}>
      {item.precipitationProbability != null && item.precipitationProbability >= 40 ? <Umbrella /> : <CloudSun />}
      <span>
        <small>{weather.cached ? 'Cached forecast' : 'Forecast'} · {weatherCondition(item.weatherCode)}</small>
        <b>{Math.round(item.temperatureMin)}–{Math.round(item.temperatureMax)}°C{item.precipitationProbability == null ? '' : ` · ${item.precipitationProbability}% rain`}</b>
      </span>
    </span>
  );
}
