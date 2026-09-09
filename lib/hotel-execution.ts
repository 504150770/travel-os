import type { Booking, HotelBooking } from '@/lib/types';

export function hotelToBooking(stay: HotelBooking): Booking {
  return {
    id: `booking-${stay.id}`,
    category: '酒店',
    title: stay.hotelName,
    date: stay.checkIn,
    budget: stay.execution.committedCnyApprox,
    status: stay.bookingStatus === 'Confirmed' ? 'Paid' : stay.bookingStatus,
    detail: `${stay.checkIn} → ${stay.checkOut} · ${stay.nights}晚 · ${stay.execution.roomType} · ${stay.execution.paymentStatus}`,
    paymentStatus: stay.execution.paymentStatus,
    supplier: stay.hotelName,
    orderNumber: stay.bookingNumber,
    cancellationDeadline: stay.execution.cancellation.freeUntil,
    address: stay.execution.address,
    serviceNumber: stay.execution.phone,
    stationAirport: '',
    baggage: '',
    contact: stay.execution.phone,
    notes: stay.execution.cancellation.afterDeadline,
    attachmentName: stay.sourceFile,
    lastVerified: stay.coordinateVerifiedAt,
  };
}

export function canonicalBookings(
  stays: HotelBooking[],
  otherBookings: Booking[],
) {
  return [...stays.map(hotelToBooking), ...otherBookings];
}
