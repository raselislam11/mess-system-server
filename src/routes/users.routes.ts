import { Router } from "express";
import { listMembers, addMember, updateMember } from "../controllers/users.controller";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

router.use(auth);
router.get("/", listMembers);
router.post("/", requireRole("controller", "manager"), addMember);
router.patch("/:id", requireRole("controller", "manager"), updateMember);

export default router;
