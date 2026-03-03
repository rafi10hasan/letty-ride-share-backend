import { TProvider } from '../user/user.constant';


export interface jwtPayload {
  id: string;
  role: string;
}

export interface socialLoginPayload {
  provider: TProvider;
  token: string;
}
