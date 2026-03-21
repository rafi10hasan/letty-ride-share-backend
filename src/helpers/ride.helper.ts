import moment from 'moment-timezone';


export const sanitizeDepartureDate = (date: string | Date): Date => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};


export const buildDepartureDateTime = (
    departureDate: string | Date,
    departureTimeString: string,
    timezone: string
): Date => {
    const dateString = new Date(departureDate).toISOString().split('T')[0];
    return moment
        .tz(`${dateString} ${departureTimeString}`, 'YYYY-MM-DD hh:mm A', timezone)
        .utc()
        .toDate();
};


export const buildEstimatedArrivalTime = (
    departureDateTime: Date,
    etaSeconds: number
): Date => {
    return new Date(departureDateTime.getTime() + etaSeconds * 1000 + 30 * 60 * 1000);
};


export const buildEstimatedDuration = (etaSeconds: number): number => {
    return Math.round(etaSeconds / 60);
};