import type { Booking, HotelBooking, TransportSegment } from '../../lib/types';

// Links the existing transport records to their existing booking records.
export const mobileTransportBookingIds: Record<string, string> = {
  'can-fco': 'flight-can-fco',
  'rome-florence': 'train-rome-florence',
  'florence-venice': 'train-florence-venice',
  'vce-vie': 'flight-vce-vie',
  'vienna-prague': 'railjet-vie-prg',
  'prague-paris': 'flight-prg-par',
  'paris-can': 'flight-cdg-can',
};

export function transportPreferenceAllowed(segmentStatus: string, candidateStatus: string) {
  return segmentStatus !== 'TICKETED' && candidateStatus !== 'TICKETED';
}

export function mobileBookingStatusEditable(bookingId: string, segments: TransportSegment[]) {
  return !segments.some((segment) =>
    segment.status === 'TICKETED' && mobileTransportBookingIds[segment.id] === bookingId,
  );
}

export function transportSegmentsForDay(
  segments: TransportSegment[],
  day: number,
  date: string,
) {
  const isCurrent = (segment: TransportSegment) =>
    segment.day === day || segment.candidates.some((candidate) =>
      candidate.status === 'TICKETED' && candidate.arrivalDate === date,
    );
  return {
    current: segments.filter(isCurrent),
    other: segments.filter((segment) => !isCurrent(segment)),
  };
}

export function bookingsForDate<T extends Pick<Booking, 'id' | 'date'>>(
  bookings: T[],
  date: string,
  stays: Array<Pick<HotelBooking, 'id' | 'checkIn' | 'checkOut'>>,
  segments: TransportSegment[] = [],
) {
  const isCurrent = (booking: T) => {
    const stay = stays.find((item) => booking.id === `booking-${item.id}`);
    if (stay) return date >= stay.checkIn && date <= stay.checkOut;
    if (segments.some((segment) => mobileTransportBookingIds[segment.id] === booking.id && segment.candidates.some((candidate) =>
      candidate.status === 'TICKETED' && candidate.arrivalDate === date,
    ))) return true;
    const dates = booking.date.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
    if (dates.length === 2) return date >= dates[0] && date <= dates[1];
    return dates.length === 1 && date === dates[0];
  };
  return {
    current: bookings.filter(isCurrent),
    other: bookings.filter((booking) => !isCurrent(booking)),
  };
}
