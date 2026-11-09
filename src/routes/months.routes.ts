import { Router } from "express";
import {
  listMonths,
  createMonth,
  getCurrentMonth,
  closeMonth,
  getMonthSummary,
  updateMemberBill,
} from "../controllers/months.controller";
import {
  getDailyEntries,
  upsertDailyEntry,
  deleteDailyEntry,
  getBazarEntries,
  addBazarEntry,
  deleteBazarEntry,
  getExtraEntries,
  addExtraEntry,
  deleteExtraEntry,
} from "../controllers/entries.controller";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

router.use(auth);

// Months
router.get("/", listMonths);
router.get("/current", getCurrentMonth);
router.post("/", requireRole("controller", "manager"), createMonth);
router.post("/:id/close", requireRole("controller"), closeMonth);

router.get("/:id/summary", getMonthSummary);
router.put(
  "/:monthId/bills/:memberId",
  requireRole("controller", "manager"),
  updateMemberBill
);

// Daily entries (members see only their own; edit: controller/manager only)
router.get("/:id/daily", getDailyEntries);
router.post(
  "/:id/daily",
  requireRole("controller", "manager"),
  upsertDailyEntry
);
router.delete(
  "/:id/daily/:entryId",
  requireRole("controller", "manager"),
  deleteDailyEntry
);

// Bazar entries (manager/controller only)
router.get("/:id/bazar", getBazarEntries);
router.post(
  "/:id/bazar",
  requireRole("controller", "manager"),
  addBazarEntry
);
router.delete(
  "/:id/bazar/:entryId",
  requireRole("controller", "manager"),
  deleteBazarEntry
);

// Extra entries (manager/controller only)
router.get("/:id/extra", getExtraEntries);
router.post(
  "/:id/extra",
  requireRole("controller", "manager"),
  addExtraEntry
);
router.delete(
  "/:id/extra/:entryId",
  requireRole("controller", "manager"),
  deleteExtraEntry
);

export default router;
