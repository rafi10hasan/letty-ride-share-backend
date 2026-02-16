import { JwtPayload } from "jsonwebtoken";
import { IUser } from "../app/modules/user/user.interface";
import IAdmin from "../app/modules/admin/admin.interface";

declare global {
    namespace Express {
        interface Request {
            user: IUser
            admin: IAdmin
        }
    }
}