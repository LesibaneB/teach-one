export const configuration = () => ({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_NAME: process.env.DATABASE_NAME,
  DATABASE_PORT: parseInt(process.env.DATABASE_PORT, 10),
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_USER: process.env.DATABASE_USER,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY,
  JWT_EXPIRY_PERIOD_IN_SECONDS: parseInt(
    process.env.JWT_EXPIRY_PERIOD_IN_SECONDS,
  ),
});
