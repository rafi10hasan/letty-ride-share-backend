import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  vus: 50,
  duration: '25s',
};

let token;
const users = JSON.parse(open('./users.json'));

export function setup() {
  const user = users[__VU % users.length];

  const loginRes = http.post(
    'http://10.10.20.24:5550/api/v1/auth/login',
    JSON.stringify({
      identifier: user.email,
      password: 'Test@123',
      fcmToken: user.fcmToken,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  check(loginRes, {
    'login success': (r) => r.status === 200,
  });

  const token = loginRes.json('data.accessToken');
  console.log('token', token);
  if (!token) {
    throw new Error('Token not found in login response');
  }

  return token;
}

export default function (token) {
  //   const res = http.get('http://10.10.20.24:5550/api/v1/user/get-short-info', {
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //     },
  //   });

  const publishRes = http.post(
    'http://10.10.20.24:5550/api/v1/driver-ride/publish',
    JSON.stringify({
      departureDate: '2026-05-12',
      departureTimeString: '7:10 PM',
      pickUpLocation: {
        type: 'Point',
        coordinates: [90.3654, 23.8223],
        address: 'Mirpur, Dhaka, Bangladesh',
      },
      dropOffLocation: {
        type: 'Point',
        coordinates: [90.4078, 23.7925],
        address: 'Gulshan, Dhaka',
      },
      minimumPassenger: 3,
      gender: 'no-preference',
      totalSeats: 5,
      totalDistance: '10km',
      price: 90,
      timezone: 'Asia/Dhaka',
    }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  check(publishRes, {
    'status is 201': (r) => r.status === 201,
  });

  sleep(1);
}
