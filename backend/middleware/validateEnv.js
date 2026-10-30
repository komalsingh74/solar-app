
const validateEnv = () => {
  const required = ["MONGO_URI", "JWT_SECRET"];

  const missing = required.filter(
    (key) => !process.env[key]?.trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (process.env.JWT_SECRET.trim().length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
};

export default validateEnv;
