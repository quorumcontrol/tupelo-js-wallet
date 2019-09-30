import React, { useReducer, useState } from 'react';
import { Columns, Heading, Form, Icon, Loader, Button } from 'react-bulma-components';
import { getAppCommunity } from '../util/appcommunity';
import { EcdsaKey, ChainTree, Tupelo, setOwnershipTransaction, setDataTransaction } from 'tupelo-wasm-sdk';

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
    password: string
    userTree?: ChainTree
}

enum Actions {
    loginFormType,
    passwordFormType,
    userTree,
    registering,
    loggingIn,
}

interface ILoginActions {
    type: Actions
}

interface IUsernameType extends ILoginActions {
    type: Actions.loginFormType
    username: string
    dispatch: Function
}

interface IPasswordType extends ILoginActions {
    type: Actions.passwordFormType
    password: string
}

interface IUserTree extends ILoginActions {
    type: Actions.userTree
    username: string
    tree?: ChainTree
    dispatch: Function
}

const initialState = {
    loading: false,
    username: '',
    password: '',
}


let usernameTimeout: number | undefined;

// debounced username checker
const checkUsername = (state: ILoginState, dispatch: Function) => {

    const later = async () => {
        const c = await getAppCommunity()

        const username = state.username
        if (!username) {
            return //nothing to do on an empty username
        }
        console.log("actually checking: ", username)
        const key = await publicUserKey(username)
        // Convert the key to a tupelo DID (ChainTree id)
        const did = await Tupelo.ecdsaPubkeyToDid(key.publicKey)

        let tip
        let tree: ChainTree | undefined = undefined
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
            dispatch: dispatch,
        } as IUserTree)

        usernameTimeout = undefined;
    };

    clearTimeout(usernameTimeout);
    usernameTimeout = setTimeout(later, 150) as any; // nodejs and browser have differing types for the timeout return
}

function reducer(state: ILoginState, action: ILoginActions) {
    switch (action.type) {
        case Actions.loginFormType:
            const username = (action as IUsernameType).username
            console.log('reducer: ', username)
            checkUsername(state, (action as IUsernameType).dispatch)
            return { ...state, loading: true, username: username }
        case Actions.userTree:
            const act = action as IUserTree
            console.log("user tree received: ", act.username, " state: ", state.username)
            if (act.username !== state.username) {
                // this means we missed one
                checkUsername(state, act.dispatch)
                return state // don't update anything yet
            }
            return { ...state, loading: false, userTree: (action as IUserTree).tree }
        case Actions.passwordFormType:
            return { ...state, password: (action as IPasswordType).password }
        case Actions.registering:
            return { ...state, loading: true }
        case Actions.loggingIn:
            return { ...state, loading: true }
        default:
            throw new Error("unkown type: " + action.type)
    }
}

const isAvailable = (state: ILoginState) => {
    return !state.loading && state.username && !state.userTree
}

// colors: '"link" | "success" | "primary" | "info" | "warning" | "danger" | "light" | "dark" | "white" | "black" |

function UsernameField({ state, onChange }: { state: ILoginState, onChange: React.ChangeEventHandler }) {
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
            {isAvailable(state) && <Form.Help color="success">This username is available</Form.Help>}
        </Form.Field>
    )
}

function PasswordField({ name, value, onChange, error }: { name: string, value: string, error: string, onChange: React.ChangeEventHandler }) {
    return (
        <Form.Field>
            <Form.Label>{name}</Form.Label>
            <Form.Control iconLeft>
                <Form.Input className={error ? "animated pulse faster" : ""} color={error ? "danger" : "info"} type="password" placeholder="Password" value={value} onChange={onChange} />
                <Icon align="left"><span className="fas fa-key" /></Icon>
            </Form.Control>
            {error && <Form.Help color="danger">{error}</Form.Help>}
        </Form.Field>
    )
}

// the elements at the bottom of a login form
function LoginBottom({ state, dispatch }: { state: ILoginState, dispatch: Function }) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (state.userTree === undefined) {
            throw new Error("must have a user tree to login")
        }
        const username = state.username

        let secureKey = await EcdsaKey.passPhraseKey(Buffer.from(password), Buffer.from(username))
        let secureAddr = await Tupelo.ecdsaPubkeyToAddress(secureKey.publicKey)
        let resolveResp = await state.userTree.resolve("tree/_tupelo/authentications")
        let auths: string[] = resolveResp.value
        if (auths.includes(secureAddr)) {
            // TODO: what to do on actual login
            dispatch({
                type: Actions.userTree,
                username: username,
                tree: state.userTree,
            } as IUserTree)
        } else {
            setError("invalid password")
        }
    }

    return (
        <div>
            <PasswordField error={error} name="Password" value={password} onChange={(evt: React.ChangeEvent<HTMLInputElement>) => { setError(''); setPassword(evt.target.value) }} />
            <Button onClick={handleSubmit}>Login</Button>
        </div>
    )
}

// the elements at the bottom of a login form
function RegisterBottom({ state, dispatch }: { state: ILoginState, dispatch: Function }) {
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [error, setError] = useState('')

    const isConfirmed = () => {
        return password === passwordConfirm
    }

    const handleSubmit = async () => {
        if (!isConfirmed()) {
            setError('Passwords do not match')
            return // do nothing here
        }
        dispatch({ type: Actions.registering })
        const username = state.username
        const insecureKey = await publicUserKey(username)

        const secureKey = await EcdsaKey.passPhraseKey(Buffer.from(password), Buffer.from(username))
        const secureKeyAddress = await Tupelo.ecdsaPubkeyToAddress(secureKey.publicKey)

        const community = await getAppCommunity()
        const tree = await ChainTree.newEmptyTree(community.blockservice, insecureKey)

        await community.playTransactions(tree, [
            // Set the ownership of the chaintree to our secure key (thus owning the username)
            setOwnershipTransaction([secureKeyAddress]),
            // Cache the username inside of the chaintree for easier access later
            setDataTransaction(usernameKey, username),
        ])
        tree.key = secureKey
        // TOOD: what to do after registering
        // for now just dispatch
        dispatch({
            type: Actions.userTree,
            username: username,
            tree: tree,
        } as IUserTree)

    }

    return (
        <div>
            <PasswordField error={error} name="Password" value={password} onChange={(evt: React.ChangeEvent<HTMLInputElement>) => { setError(''); setPassword(evt.target.value) }} />
            <PasswordField error={error} name="Confirm Password" value={passwordConfirm} onChange={(evt: React.ChangeEvent<HTMLInputElement>) => { setError(''); setPasswordConfirm(evt.target.value) }} />
            <Button onClick={handleSubmit}>Register</Button>
        </div>
    )
}

export function LoginForm() {
    const [state, dispatch] = useReducer(reducer, initialState)

    const handleUsernameChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ type: Actions.loginFormType, username: evt.target.value, dispatch: dispatch } as IUsernameType)
    }

    return (
        <div>
            <Columns className="is-desktop is-centered">
                <Columns.Column size={"half"} className="is-centered">
                    <Heading className="animated flipInX fast">Hello.</Heading>
                    <p>Find or create your wallet.</p>
                </Columns.Column>
            </Columns>

            <Columns className="is-desktop is-centered">
                <Columns.Column size={"half"}>
                    <UsernameField state={state} onChange={handleUsernameChange} />
                    {state.loading && state.username && <Loader style={{ width: 25, height: 25 }} />}
                    {!state.loading && state.username && state.userTree && <LoginBottom state={state} dispatch={dispatch} />}
                    {!state.loading && state.username && !state.userTree && <RegisterBottom state={state} dispatch={dispatch} />}
                </Columns.Column>
            </Columns>



        </div>
    )
}
