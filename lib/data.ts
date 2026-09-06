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
import restaurants from '@/data/restaurants.json';
import tasks from '@/data/tasks.json';
import xhs from '@/data/xhs.json';

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
  restaurants,
  tasks,
  xhs,
};

export const placeMap = new Map(places.map((place) => [place.id, place]));
export const gymMap = new Map(gyms.map((gym) => [gym.id, gym]));
export const imageByPlace = new Map<string, typeof images>();
for (const image of images) {
  if (!image.placeId) continue;
  const list = imageByPlace.get(image.placeId) ?? [];
  list.push(image);
  imageByPlace.set(image.placeId, list);
}
