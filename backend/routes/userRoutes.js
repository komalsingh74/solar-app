import express from "express";
import { currentUser, login, register } from "../controllers/userController.js";
import requireAuth from "../middleware/requireAuth.js";

const userRoutes = express.Router();

userRoutes.post("/register", register);
userRoutes.post("/login", login);
userRoutes.get("/me", requireAuth, currentUser);

export default userRoutes;
