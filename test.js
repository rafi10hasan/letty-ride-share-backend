const now = new Date();
console.log(now.getTime())
const windowStart = new Date(now.getTime() + 30 * 60 * 1000);
const windowEnd = new Date(windowStart.getTime() + 5 * 60 * 1000);


console.log(windowStart)