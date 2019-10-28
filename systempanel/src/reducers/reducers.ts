import { combineReducers } from 'redux'
import { connectRouter } from 'connected-react-router'
import AuthReducer from './auth';
import NavigationReducer from './navigation';
// import KarasReducer from './navigation';

export function createRootReducer(history) {
  return combineReducers({
    router: connectRouter(history),
    auth: AuthReducer,
    navigation: NavigationReducer,
    // karas: KarasReducer
  })
}