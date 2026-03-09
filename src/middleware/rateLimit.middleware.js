import rateLimit from "express-rate-limit";

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many AI requests. Please try again later.",
});
