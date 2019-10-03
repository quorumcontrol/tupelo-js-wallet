import React, { createContext, useReducer, useEffect, useState } from "react";
import { ChainTree, EcdsaKey } from "tupelo-wasm-sdk";
import { getAppCommunity } from "../util/appcommunity";

declare const Go: any;

if (window) {
  const subDirectory = window.location.pathname
  console.log("subDirectory ", subDirectory)

  if (subDirectory !== '/') {
    console.log("setting wasmpath to: ", subDirectory + "tupelo.wasm")
    Go.setWasmPath(subDirectory + "tupelo.wasm");
  }
}

interface IAppState {
  userTree?: ChainTree
  username?: string
  userDid?: string
  loading: number
  messages: IAppMessage[]
}

export interface IAppMessage {
  id?: string
  color?: string
  title: string
  body: string
}

export enum AppActions {
  loading,
  stopLoading,
  login,
  setDID,
  removeMessage,
  message,
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

export interface IAppRemoveMessage extends IAppAction {
  type: AppActions.removeMessage,
  id: string
}

export interface IAppMessage extends IAppAction {
  type: AppActions.message,
  message: IAppMessage,
}

interface IAppSetDid extends IAppAction {
  type: AppActions.setDID
  did: string
}

function reducer(state: IAppState, action: IAppAction) {
  let act
  switch (action.type) {
    case AppActions.loading:
      return { ...state, loading: state.loading + 1 }
    case AppActions.stopLoading:
      return { ...state, loading: state.loading - 1 }
    case AppActions.login:
      act = action as IAppLogin
      return { ...state, userTree: act.userTree }
    case AppActions.setDID:
      return { ...state, userDid: (action as IAppSetDid).did }
    case AppActions.message:
      const msg = (action as IAppMessage).message
      msg.id = (new Date()).toString() + "-" + msg.title + Math.random().toString()
      return { ...state, messages: [...state.messages, msg] }
    case AppActions.removeMessage:
      const id = (action as IAppRemoveMessage).id
      let index = -1;
      for (var i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].id === id) {
          index = i
          break;
        }
      }
      if (index === -1) {
        return state // nothing to do here
      }
      return { ...state, messages: [...state.messages.slice(0, index), ...state.messages.slice(index + 1)] }
    default:
      throw new Error("unkown type: " + action.type)
  }
}

const initialState = { loading: 1, messages: [] } as IAppState

const StoreContext = createContext([initialState, () => { }] as [IAppState, React.Dispatch<IAppAction>]);

const StoreProvider = ({ children }: { children: JSX.Element[] }) => {
  const [firstRun, setFirstRun] = useState(true);
  const [state, dispatch] = useReducer(reducer, initialState);

  // On every state set
  useEffect(
    () => {
      if (firstRun) {
        setFirstRun(false)

        const did = sessionStorage.getItem('userDid')
        const userKey = sessionStorage.getItem('userKey')
        const doAsyncSet = async () => {
          if (!did || !userKey) {
            throw new Error("no did or no userKey")
          }
          const c = await getAppCommunity()
          const tipP = c.getTip(did)
          const keyP = EcdsaKey.fromBytes(Buffer.from(userKey, 'base64'))
          const [tip, key] = await Promise.all([tipP, keyP])

          const tree = new ChainTree({
            key: key,
            tip: tip,
            store: c.blockservice,
          })
          console.log('logging in from storage')
          dispatch({
            type: AppActions.login,
            userTree: tree,
          } as IAppLogin)
          dispatch({
            type: AppActions.stopLoading,
          } as IAppStopLoading)
        }

        if (did && userKey) {
          doAsyncSet()
        } else {
          console.log('stopping loading')
          dispatch({
            type: AppActions.stopLoading
          } as IAppStopLoading)
        }
      }

      if (!state.userDid && state.userTree) {
        // if we didn't yet assign the DID, do that
        state.userTree.id().then((did) => {
          dispatch({
            type: AppActions.setDID,
            did: did,
          } as IAppSetDid)
        })
      }
      if (state.userTree && state.userDid && state.userTree.key && state.userTree.key.privateKey) {
        sessionStorage.setItem('userDid', state.userDid)
        sessionStorage.setItem('userKey', Buffer.from(state.userTree.key.privateKey).toString('base64'))
      }

      console.log({ newState: state });
    },
    [state, firstRun]
  );

  // Render state, dispatch and special case actions
  return (
    <StoreContext.Provider value={[state, dispatch]}>
      {children}
    </StoreContext.Provider>
  );
};

export { StoreContext, StoreProvider };
