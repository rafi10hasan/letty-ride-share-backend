import { TProvider } from '../user/user.constant';


export interface jwtPayload {
  id: string;
  role: string;
}


export interface loginPayload {
  email: string;
  password: string;
}

export interface socialLoginPayload {
  provider: TProvider;
  token: string;
}
