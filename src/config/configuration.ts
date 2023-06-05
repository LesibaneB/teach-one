export const configuration = () => ({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_NAME: process.env.DATABASE_NAME,
  DATABASE_PORT: parseInt(process.env.DATABASE_PORT, 10),
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_USER: process.env.DATABASE_USER,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
});
