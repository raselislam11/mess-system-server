import { Router } from "express";
import { registerMess, login, logout, getMe } from "../controllers/auth.controller";
import { auth } from "../middlewares/auth";

const router = Router();

router.post("/register-mess", registerMess);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", auth, getMe);

export default router;
