import { Router } from "express";
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import monthsRoutes from "./months.routes";

const rootRouter = Router();

rootRouter.use("/auth", authRoutes);
rootRouter.use("/users", usersRoutes);
rootRouter.use("/months", monthsRoutes);
// Later phases: /fines, /notices, /memories

export default rootRouter;
