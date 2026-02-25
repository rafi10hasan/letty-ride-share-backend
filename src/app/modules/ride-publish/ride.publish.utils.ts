// "08:30 AM" → 510 minutes

import RidePublish from "./ride.publish.model";


export function timeStringToMinutes(time: string): number {
    const [timePart, modifier] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

// 510 → "08:30 AM"
export function minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const modifier = hours >= 12 ? 'PM' : 'AM';
    const display = hours % 12 || 12;

    return `${String(display).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${modifier}`;
}


export const generateTripId = async () => {
    const lastTrip = await RidePublish.findOne(
        { tripId: { $regex: /^#TRIP/ } },
        { tripId: 1 },
        { sort: { createdAt: -1 } }
    );

    let nextNumber = 1;

    if (lastTrip && lastTrip.tripId) {
        const lastNumberStr = lastTrip.tripId.slice(5);
        const lastNumber = parseInt(lastNumberStr);

        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }

    const formattedNumber = nextNumber.toString().padStart(6, '0');

    return `#TRIP${formattedNumber}`;
};
