/**
 * Generates a six digit opt
 * @returns returns a randomized six digit number
 */
export function generateOTP(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

/**
 * Checks if the otps match
 * @param otpToMatch
 * @param storedOTP
 * @returns
 */
export function otpMatches(otpToMatch: number, storedOTP: number): boolean {
  return otpToMatch === storedOTP;
}

/**
 * Generates an expriry date 10 minutes into the future
 * @returns Returns a date object 10 minutes into the future
 */
export function generateOTPExpiry(): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 10);
  return date;
}

/**
 * Checks if otp has expired or not
 * @param date
 * @returns Returns true if otp expired
 */
export function checkOTPExpired(date: Date): boolean {
  return date.valueOf() < Date.now();
}
