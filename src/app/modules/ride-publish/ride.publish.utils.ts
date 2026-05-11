// "08:30 AM" → 510 minutes


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

export function getBearing(from: [number, number], to: [number, number]): number {
    // from = [lon, lat], to = [lon, lat]
    const dLon = to[0] - from[0];  // longitude difference
    const dLat = to[1] - from[1];  // latitude difference

    const bearing = Math.atan2(dLon, dLat) * (180 / Math.PI);

    // -180~180  0~360 convert
    return (bearing + 360) % 360;
}

export const generateTripId = async () => {
    const prefix = "TRIP";
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}${randomStr}`;
};
