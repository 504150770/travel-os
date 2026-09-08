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

export type HotelBooking = {
  id: string;
  city: string;
  country: string;
  hotelName: string;
  address: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  checkInTime: string;
  checkOutTime: string;
  roomType: string;
  bed: string;
  privateBathroom: boolean;
  bathroomDetails: string;
  breakfastIncluded: boolean;
  breakfastDetails: string;
  paidOnlineCny: number;
  payAtProperty: { amount: number; currency: string; cnyApprox: number; label: string } | null;
  committedCnyApprox: number;
  paymentStatus: string;
  bookingStatus: string;
  freeCancellationUntil: string;
  cancellationPolicy: string;
  confirmationNumber: string | null;
  bookingNumber: string;
  guestName: string;
  frontDesk: string;
  luggageStorage: string;
  quietRoomRequest: string;
  heating: string;
  noise: { street: string; wall: string; corridor: string; mechanical: string };
  sourceFile: string;
  sourcePath: string;
  sourceType: string;
};

export type TransportCandidate = {
  rank: string;
  operator: string | null;
  service: string | null;
  flightNo: string | null;
  departure: string | null;
  arrival: string | null;
  arrivalDate: string;
  duration: string;
  priceCny: number | null;
  fareType: string;
  baggage23kg: boolean | null;
  carryOn: string;
  changes: number;
  transit: string | null;
  terminalChange: string | null;
  selfTransfer: boolean;
  refundability: string;
  changeFee: string;
  checkedAt: string;
  source: string;
  status: string;
};

export type TransportSegment = {
  id: string;
  day: number;
  route: string;
  date: string;
  mode: string;
  doorToDoor: string;
  recommendation: string;
  source: string;
  routeSource: string;
  checkedAt: string;
  expectedReleaseWindow: string | null;
  airportComparison?: { airport: string; ground: string; doorToDoorScore: number; decision: string }[];
  status: string;
  candidates: TransportCandidate[];
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
