export const generateReferralCode = () => {
  const characters = '0123456789CDEFGHIJKLMNOPQRSTUVWXYZcdefghijklpqrstuvwxyz';
  const length = 6;
  let code = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
};
