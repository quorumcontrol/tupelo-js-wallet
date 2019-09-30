import React, { createContext, useReducer, useEffect } from "react";
import { ChainTree } from "tupelo-wasm-sdk";

interface IAppState {
  userTree?: ChainTree
  username?: string
  loading: number
}

export enum AppActions {
  loading,
  stopLoading,
  login,
}

export interface IAppAction {
  type: AppActions
}

export interface IAppLoading extends IAppAction {
  type: AppActions.loading
}

export interface IAppStopLoading extends IAppAction {
  type: AppActions.stopLoading
}

export interface IAppLogin extends IAppAction {
  type: AppActions.login
  userTree: ChainTree
}

function reducer(state: IAppState, action: IAppAction) {
  switch (action.type) {
    case AppActions.loading:
      return { ...state, loading: state.loading + 1 }
    case AppActions.stopLoading:
      return { ...state, loading: state.loading - 1 }
    case AppActions.login:
      const act = action as IAppLogin
      return { ...state, userTree: act.userTree }
    default:
      throw new Error("unkown type: " + action.type)
  }
}

const initialState = { loading: 0 } as IAppState

const StoreContext = createContext([initialState, () => { }] as [IAppState, React.Dispatch<IAppAction>]);

const StoreProvider = ({ children }: { children: JSX.Element[] }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Log new state
  useEffect(
    () => {
      console.log({ newState: state });
    },
    [state]
  );

  // Render state, dispatch and special case actions
  return (
    <StoreContext.Provider value={[state, dispatch]}>
      {children}
    </StoreContext.Provider>
  );
};

export { StoreContext, StoreProvider };
