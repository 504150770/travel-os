export type WeatherRequest = {
  lat: number;
  lng: number;
  date: string;
};

export type ForecastWeather = {
  date: string;
  temperatureMin: number;
  temperatureMax: number;
  precipitationProbability: number | null;
  weatherCode: number;
  provider: string;
  updatedAt: string;
};

export type WeatherProvider = {
  id: string;
  forecast: (request: WeatherRequest, signal?: AbortSignal) => Promise<ForecastWeather>;
};

