import mongoose from "mongoose";
import User from "../models/userSchema.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { signAuthToken } from "../utils/authToken.js";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  permissions: user.permissions,
});


export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone = "" } = req.body || {};

  if (
    ![name, email, password].every(
      (value) => typeof value === "string" && value.trim()
    )
  ) {
    throw new AppError(
      "Name, email, and password are required",
      400,
      "REQUIRED_FIELDS"
    );
  }

  if (password.length < 8) {
    throw new AppError(
      "Password must be at least 8 characters",
      400,
      "WEAK_PASSWORD"
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new AppError(
      "Enter a valid email address",
      400,
      "INVALID_EMAIL"
    );
  }

  if (typeof phone !== "string") {
    throw new AppError("Phone must be a string", 400, "INVALID_PHONE");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (await User.exists({ email: normalizedEmail })) {
    throw new AppError(
      "An account with this email already exists",
      409,
      "EMAIL_ALREADY_EXISTS"
    );
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    phone: phone.trim(),
    role: "Employee",
  });

  res.status(201).json({
    success: true,
    message: "Account registered successfully",
    data: { user: publicUser(user) },
  });
});


export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    throw new AppError("Email and password are required", 400, "REQUIRED_FIELDS");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
  if (user.status !== "Active") {
    throw new AppError("This account is not active. Contact your administrator.", 403, "ACCOUNT_INACTIVE");
  }

  user.lastLoginAt = new Date();
  await user.save();
  const token = signAuthToken(user);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { token, user: publicUser(user) },
  });
});

export const currentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.userId);

  if (!user || user.status !== "Active") {
    throw new AppError("User account is unavailable", 401, "AUTH_INVALID");
  }

  res.status(200).json({
    success: true,
    data: { user: publicUser(user) },
  });
});
