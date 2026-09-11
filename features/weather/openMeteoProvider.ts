import type { WeatherProvider } from '@/features/weather/weatherProvider';

type OpenMeteoResponse = {
  daily?: {
    time?: string[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    precipitation_probability_max?: Array<number | null>;
    weather_code?: number[];
  };
};

export const openMeteoProvider: WeatherProvider = {
  id: 'open-meteo',
  async forecast(request, signal) {
    const params = new URLSearchParams({
      latitude: String(request.lat),
      longitude: String(request.lng),
      start_date: request.date,
      end_date: request.date,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto',
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Weather unavailable (${response.status})`);
    const payload = await response.json() as OpenMeteoResponse;
    const daily = payload.daily;
    const temperatureMin = daily?.temperature_2m_min?.[0];
    const temperatureMax = daily?.temperature_2m_max?.[0];
    const weatherCode = daily?.weather_code?.[0];
    if (daily?.time?.[0] !== request.date || temperatureMin == null || temperatureMax == null || weatherCode == null) {
      throw new Error('Forecast date unavailable');
    }
    return {
      date: request.date,
      temperatureMin,
      temperatureMax,
      precipitationProbability: daily.precipitation_probability_max?.[0] ?? null,
      weatherCode,
      provider: 'Open-Meteo',
      updatedAt: new Date().toISOString(),
    };
  },
};

