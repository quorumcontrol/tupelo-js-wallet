import React, { useReducer } from 'react';
import { Columns, Heading, Form, Icon, Loader } from 'react-bulma-components';
import { getAppCommunity } from '../util/appcommunity';
import { EcdsaKey, ChainTree, Tupelo } from 'tupelo-wasm-sdk';

export const usernameKey = "/_wallet/username"
const namespace = Buffer.from("_wallet-dev")

/**
 * Generates a public/private keypair from an *insecure* passphrase.
 * This method is used to generate a ChainTree with a known name (given a namespace)
 * The very first thing you do with the ChainTree should be to ChangeOwner
 * @param userName - the username
 */
const publicUserKey = async (userName: string) => {
    return EcdsaKey.passPhraseKey(Buffer.from(userName), namespace)
}

interface ILoginState {
    loading: boolean
    username: string
    password:string
    userTree?: ChainTree
}

enum Actions {
    loginFormType,
    userTree
}

interface ILoginActions {
    type: Actions
}

interface IUsernameType extends ILoginActions {
    type: Actions.loginFormType
    username: string
}

interface IUserTree extends ILoginActions {
    type: Actions.userTree
    username: string
    tree?: ChainTree
}

const initialState = {
    loading: false,
    username: '',
    password: '',
}


let usernameTimeout: number | undefined;

// debounced username checker
const checkUsername = (state: ILoginState, dispatch: Function) => {
    const username = state.username
    if (!username) {
        return //nothing to do on an empty username
    }
    const later = async () => {
        console.log("actually checking")
        const c = await getAppCommunity()
        const key = await publicUserKey(username)
        // Convert the key to a tupelo DID (ChainTree id)
        const did = await Tupelo.ecdsaPubkeyToDid(key.publicKey)

        let tip
        let tree:ChainTree|undefined = undefined
        try {
            tip = await c.getTip(did)
        } catch (e) {
            if (e === "not found") {
                // do nothing, let tip be null
            }
        }
        if (tip !== undefined) {
            tree = new ChainTree({
                store: c.blockservice,
                tip: tip,
            })
        }
       

        dispatch({
            type: Actions.userTree,
            username: username,
            tree: tree,
        } as IUserTree)

        usernameTimeout = undefined;
    };

    clearTimeout(usernameTimeout);
    usernameTimeout = setTimeout(later, 150) as any; // nodejs and browser have differing types for the timeout return
}

function reducer(state: ILoginState, action: ILoginActions) {
    switch (action.type) {
        case Actions.loginFormType:
            return { ...state, loading: true, username: (action as IUsernameType).username }
        case Actions.userTree:
            return {...state, loading:false, userTree: (action as IUserTree).tree}
        default:
            throw new Error("unkown type: " + action.type)
    }
}

const isAvailable = (state:ILoginState)=> {
    return !state.loading && state.username && !state.userTree
}

// colors: '"link" | "success" | "primary" | "info" | "warning" | "danger" | "light" | "dark" | "white" | "black" |

function UsernameField({state, onChange}:{state:ILoginState,onChange:React.ChangeEventHandler}) {
    return (
        <Form.Field>
            <Form.Label>Username</Form.Label>
            <Form.Control iconLeft>
                <Form.Input color={isAvailable(state) ? "success" : "info"} type="text" placeholder="Username" value={state.username} onChange={onChange} />
                    {state.loading ?
                     <Icon align="left"><span className="fas fa-spinner fa-pulse" /></Icon>
                        :
                      <Icon align="left"><span className="fas fa-user" /></Icon>
                    }
            </Form.Control>
            { isAvailable(state) && <Form.Help color="success">This username is available</Form.Help> }
        </Form.Field>
    )
}

function PasswordField({state, onChange}:{state:ILoginState,onChange:React.ChangeEventHandler}) {
    return (
        <Form.Field>
            <Form.Label>Password</Form.Label>
            <Form.Control iconLeft>
                <Form.Input type="password" placeholder="Username" value={state.password} onChange={onChange} />
                    {state.loading ?
                     <Icon align="left"><span className="fas fa-spinner fa-pulse" /></Icon>
                        :
                      <Icon align="left"><span className="fas fa-key" /></Icon>
                    }
            </Form.Control>
        </Form.Field>
    )
}

export function LoginForm() {
    const [state, dispatch] = useReducer(reducer, initialState)

    const handleUsernameChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ type: Actions.loginFormType, username: evt.target.value } as IUsernameType)
        checkUsername(state, dispatch)
    }

    return (
        <div>
            <Columns className="is-desktop is-centered">
                <Columns.Column size={"half"} className="is-centered">
                    <Heading>Hello</Heading>
                    <p>Who are you?</p>
                </Columns.Column>
            </Columns>

            <Columns className="is-desktop is-centered">
                <Columns.Column size={"half"}>
                    <form className="is-desktop is-vcentered is-centered">
                        <UsernameField state={state} onChange={handleUsernameChange}/>
                        {state.loading && <Loader style={{width:25, height:25}}/>}
                    </form>
                </Columns.Column>
            </Columns>



        </div>
    )
}
