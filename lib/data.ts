import trip from '@/data/trip.json';
import days from '@/data/days.json';
import places from '@/data/places.json';
import images from '@/data/images.json';
import gyms from '@/data/gyms.json';
import hotels from '@/data/hotels.json';
import bookings from '@/data/bookings.json';
import budget from '@/data/budget.json';
import checklist from '@/data/checklist.json';
import essentials from '@/data/essentials.json';
import conflicts from '@/data/conflicts.json';
import options from '@/data/options.json';

export const guideData = {
  trip,
  days,
  places,
  images,
  gyms,
  hotels,
  bookings,
  budget,
  checklist,
  essentials,
  conflicts,
  options,
};

export const placeMap = new Map(places.map((place) => [place.id, place]));
export const gymMap = new Map(gyms.map((gym) => [gym.id, gym]));
