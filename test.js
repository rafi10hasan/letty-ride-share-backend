import moment from 'moment-timezone';

const dateString = moment('2026-04-28').tz('Asia/Dhaka').format('YYYY-MM-DD');
const result = moment
    .tz(`${dateString} 4:50 PM`, 'YYYY-MM-DD hh:mm A', 'Asia/Dhaka')
    .utc()
    .toDate();

console.log({ dateString, result });