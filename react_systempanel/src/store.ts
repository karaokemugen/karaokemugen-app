import { routerMiddleware } from 'connected-react-router';
import { createBrowserHistory } from 'history';
import { applyMiddleware, compose, createStore } from 'redux';
import { createRootReducer } from './reducers/reducers';

export const history = createBrowserHistory()

// If devtools is present use it's compose instead of redux's compose; Does the same thing
const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

function configureStore() {
  const store = createStore(
    createRootReducer(history),
    {},
    composeEnhancers(
      applyMiddleware(
        routerMiddleware(history)
      )
    )
  )

  return store
}

export const store = configureStore();
