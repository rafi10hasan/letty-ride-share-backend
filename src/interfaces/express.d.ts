import IAdmin from "../app/modules/admin/admin.interface";
import { IUser } from "../app/modules/user/user.interface";

declare global {
    namespace Express {
        interface Request {
            user: IUser
            admin: IAdmin
            subscription: any
        }
    }
}