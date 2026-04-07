import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware";
import { USER_ROLE } from "../user/user.constant";
import { callController } from "./call.controller";

const callRouter = Router();

// receiverId in body, not URL — both roles can initiate
callRouter.post(
    "/start",
    authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
    callController.startCall,
);

// Receiver hits this only for token renewal (1hr expiry)
callRouter.post(
    "/join",
    authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
    callController.joinCall,
);

export default callRouter;