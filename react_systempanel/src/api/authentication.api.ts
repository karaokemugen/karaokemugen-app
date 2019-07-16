import axios from 'axios';

export interface IAuthentifactionInformation {
  token: string;
  onlineToken?: string;
  username: string;
  role: string;
}

export interface IAuthenticationVerification {
  iat: number;
  username: string;
  role: string;
}

export class AuthentifactionApi {
  
  private constructor() {}
  
  static async login(username: string, password: string): Promise<IAuthentifactionInformation> {
    const response = await axios.post<IAuthentifactionInformation>('/api/auth/login', {
      username,
      password
    });
    
    return response.data;
  }

  static async isAuthenticated(): Promise<IAuthenticationVerification> {
    const response = await axios.get<IAuthenticationVerification>('/api/auth/checkauth');
    return response.data;
  }
}
