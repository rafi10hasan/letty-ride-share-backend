const defaultUserImage: string[] = [
  'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg',
  'https://cdn-icons-png.freepik.com/512/303/303593.png',
  'https://cdn-icons-png.flaticon.com/512/306/306205.png',
];

export const randomUserImage = (): string => {
  const index = Math.floor(Math.random() * defaultUserImage.length );
  return defaultUserImage[index];
}