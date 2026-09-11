import type { ForecastWeather, WeatherRequest } from '@/features/weather/weatherProvider';

export const FORECAST_HORIZON_DAYS = 16;
export const WEATHER_CACHE_KEY = 'travel.weather.v1';
export const WEATHER_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export type SeasonalReference = {
  city: string;
  month: number;
  temperatureMin: number;
  temperatureMax: number;
  source: string;
};

// 1991–2020 December mean daily minima/maxima, calculated from Open-Meteo ERA5-Land.
export const DECEMBER_SEASONAL_REFERENCE: Record<string, SeasonalReference> = {
  Rome: { city: 'Rome', month: 12, temperatureMin: 5, temperatureMax: 12, source: 'Open-Meteo ERA5-Land 1991–2020' },
  Florence: { city: 'Florence', month: 12, temperatureMin: 3, temperatureMax: 10, source: 'Open-Meteo ERA5-Land 1991–2020' },
  Venice: { city: 'Venice', month: 12, temperatureMin: 2, temperatureMax: 8, source: 'Open-Meteo ERA5-Land 1991–2020' },
  Vienna: { city: 'Vienna', month: 12, temperatureMin: -2, temperatureMax: 4, source: 'Open-Meteo ERA5-Land 1991–2020' },
  Prague: { city: 'Prague', month: 12, temperatureMin: -1, temperatureMax: 4, source: 'Open-Meteo ERA5-Land 1991–2020' },
  Paris: { city: 'Paris', month: 12, temperatureMin: 3, temperatureMax: 8, source: 'Open-Meteo ERA5-Land 1991–2020' },
};

DECEMBER_SEASONAL_REFERENCE['罗马'] = DECEMBER_SEASONAL_REFERENCE.Rome;
DECEMBER_SEASONAL_REFERENCE['佛罗伦萨'] = DECEMBER_SEASONAL_REFERENCE.Florence;
DECEMBER_SEASONAL_REFERENCE['威尼斯'] = DECEMBER_SEASONAL_REFERENCE.Venice;
DECEMBER_SEASONAL_REFERENCE['维也纳'] = DECEMBER_SEASONAL_REFERENCE.Vienna;
DECEMBER_SEASONAL_REFERENCE['布拉格'] = DECEMBER_SEASONAL_REFERENCE.Prague;
DECEMBER_SEASONAL_REFERENCE['巴黎'] = DECEMBER_SEASONAL_REFERENCE.Paris;

const dateOnlyUtc = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

export function forecastDayOffset(date: string, now = new Date()) {
  const target = new Date(`${date}T00:00:00Z`);
  return Math.round((dateOnlyUtc(target) - dateOnlyUtc(now)) / 86_400_000);
}

export function isWithinForecastHorizon(date: string, now = new Date()) {
  const offset = forecastDayOffset(date, now);
  return offset >= 0 && offset < FORECAST_HORIZON_DAYS;
}

export function weatherCacheKey(request: WeatherRequest) {
  return `${request.date}:${request.lat.toFixed(3)},${request.lng.toFixed(3)}`;
}

export function isFreshWeather(weather: ForecastWeather, now = new Date()) {
  return now.getTime() - new Date(weather.updatedAt).getTime() < WEATHER_CACHE_TTL_MS;
}

export function weatherCondition(code: number) {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Storm';
  return 'Mixed';
}
