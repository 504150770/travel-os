export type ViewId =
  | 'home'
  | 'trip'
  | 'visual'
  | 'picks'
  | 'gym'
  | 'stay'
  | 'bookings'
  | 'budget'
  | 'checklist'
  | 'essentials'
  | 'map';

export type Place = {
  id: string;
  name: string;
  city: string;
  type: string;
  mapQuery: string;
  lat: number | null;
  lng: number | null;
  coordinateStatus: string;
};

export type TimelineStop = {
  time: string;
  title: string;
  placeId: string | null;
  mode: string;
  duration: string;
  note: string;
  guard: string;
  ticket?: string;
};

export type Day = {
  day: number;
  date: string;
  city: string;
  theme: string;
  summary: string;
  pace: string;
  walking: string;
  fatigue: number;
  goldenHour: string;
  blueHour: string;
  dayBudget: number;
  budgetLabel: string;
  gymIds: string[];
  lossCut: string;
  timeline: TimelineStop[];
  shooting: { time: string; title: string; note: string }[];
};

export type Gym = {
  id: string;
  name: string;
  city: string;
  tag: string;
  dayPass: string;
  passMethod: string;
  hours: string;
  distance: string;
  equipment: string;
  crowd: string;
  lighting: string;
  style: string;
  photo: string;
  time: string;
  recommendedDays: number[];
  rating: number;
  photogenicRank: number | null;
  image: string;
  source: string;
};

export type Booking = {
  id: string;
  category: string;
  title: string;
  date: string;
  budget: number;
  status: string;
  detail: string;
};

export type Hotel = {
  id: string;
  city: string;
  role: string;
  name: string;
  priceRefundable: number | null;
  rating: string;
  openingRenovation: string;
  roomCondition: string;
  noise: { street: string; wall: string; corridor: string; mechanical: string };
  bed: string;
  heating: string;
  privateBathroom: string;
  frontDeskStorage: string;
  transport: string;
  pros: string;
  cons: string;
  risk: string;
  selected: boolean;
  bookingRequest: string;
};

export type PlaceOption = {
  id: string;
  city: string;
  name: string;
  kind: string;
  recommendedDays: number[];
  duration: string;
  bestFor: string;
  swapRule: string;
  booking: string;
  mapQuery: string;
  source: string;
  status: string;
};
