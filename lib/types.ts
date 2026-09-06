export type ViewId =
  | 'home'
  | 'trip'
  | 'discover'
  | 'plan'
  | 'more';

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

export type GuideImage = {
  id: string;
  day: number;
  dayId: number;
  placeId: string | null;
  file: string;
  caption: string;
  use: string;
  role: string;
  type: string;
  timeOfDay: string;
  bestTime: string;
  focalLength: string;
  composition: string;
  credit: string;
  sourcePage: string;
  lastVerified: string;
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
  paymentStatus: string;
  supplier: string;
  orderNumber: string;
  cancellationDeadline: string;
  address: string;
  serviceNumber: string;
  stationAirport: string;
  baggage: string;
  contact: string;
  notes: string;
  attachmentName: string;
  lastVerified: string;
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
  noise: { street: string; wall: string; corridor: string; mechanical: string; elevator: string; barRestaurant: string; trainTram: string };
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
  roomName: string;
  roomArea: string;
  bedType: string;
  ratingCount: string;
  refundableRoomMatch: string;
  airConditioning: string;
  frontDesk: string;
  lateArrival: string;
  luggageStorage: string;
  roomImages: { id: string; file: string | null; caption: string; status: string; source: string | null }[];
  priceSource: string;
  lastVerified: string;
};

export type Restaurant = {
  id: string;
  city: string;
  name: string;
  meal: string;
  dishes: string;
  price: string;
  hours: string;
  reservation: string;
  distance: string;
  source: string;
  recommendedDays: number[];
  mustEat: string;
  mapQuery: string;
  xhsKeyword: string;
  restaurantImage: string | null;
  dishImage: string | null;
  photoStatus: string;
  soloFriendly: string;
  lastVerified: string;
  sourceType: string;
};

export type Task = {
  id: string;
  title: string;
  note: string;
  due: string;
  group: string;
  status: string;
  linkedBookingId: string | null;
  autoCompleteWhen: string[];
  lastVerified: string;
};

export type XhsTopic = {
  id: string;
  city: string;
  category: string;
  keyword: string;
  url: string;
  linkType: string;
  lastVerified: string;
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
