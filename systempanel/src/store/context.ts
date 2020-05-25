import { createContext, Dispatch } from "react";
import { AuthStore } from "../types/auth";

export interface GlobalContextInterface {
	globalState: {auth:AuthStore,navigation:any}
	globalDispatch: Dispatch<any>
  }

const GlobalContext = createContext<GlobalContextInterface>(null);

export default GlobalContext;