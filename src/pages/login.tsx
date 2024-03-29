import React, { useReducer, useState, useContext } from 'react';
import { Columns, Heading, Form, Icon, Loader, Button } from 'react-bulma-components';
import { getAppCommunity, txsWithCommunityWait } from '../util/appcommunity';
import { EcdsaKey, ChainTree, Tupelo, setOwnershipTransaction, setDataTransaction } from 'tupelo-wasm-sdk';
import { RouteProps, Redirect } from 'react-router';
import {StoreContext, AppActions, IAppLogin} from '../state/store'
import {publicUserKey, usernameKey} from '../util/usernames'

interface ILoginState {
    loading: boolean
    username: string
    password: string
    userTree?: ChainTree
    loadingText: string
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
    loadingText: '',
}


let usernameTimeout: number | undefined;

// debounced username checker
const checkUsername = (state: ILoginState, dispatch: Function) => {

    const later = async () => {

        // TODO: Should most of this be replaced by ../util/usernames:getUserTree ?

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
            checkUsername(state, (action as IUsernameType).dispatch)
            return { ...state, loading: true, loginText: 'Checking for username availability', username: username }
        case Actions.userTree:
            const act = action as IUserTree
            console.log("user tree received: ", act.username, " state: ", state.username)
            if (act.username !== state.username) {
                // this means we missed one
                checkUsername(state, act.dispatch)
                return state // don't update anything yet
            }
            return { ...state, loading: false, loadingText: '', userTree: (action as IUserTree).tree }
        case Actions.passwordFormType:
            return { ...state, password: (action as IPasswordType).password }
        case Actions.registering:
            return { ...state, loading: true, loadingText: 'Registering your user' }
        case Actions.loggingIn:
            return { ...state, loading: true, loadingText: 'Logging in' }
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
function LoginBottom({ state, dispatch, onLogin }: { state: ILoginState, dispatch: Function, onLogin:Function }) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (state.userTree === undefined) {
            throw new Error("must have a user tree to login")
        }

        const tree = state.userTree
        const username = state.username

        let secureKey = await EcdsaKey.passPhraseKey(Buffer.from(password), Buffer.from(username))
        let secureAddr = await Tupelo.ecdsaPubkeyToAddress(secureKey.publicKey)
        let resolveResp = await tree.resolve("tree/_tupelo/authentications")
        let auths: string[] = resolveResp.value
        if (auths.includes(secureAddr)) {
            tree.key = secureKey
            onLogin(state.userTree)
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
function RegisterBottom({ state, dispatch, onLogin }: { state: ILoginState, dispatch: Function, onLogin:Function }) {
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [error, setError] = useState('')

    const isConfirmed = () => {
        return password === passwordConfirm
    }

    const handleSubmit = () => {
        if (!isConfirmed()) {
            setError('Passwords do not match')
            return // do nothing here
        }
        dispatch({ type: Actions.registering })
        const doRegister = async ()=> {
            const username = state.username
            const insecureKey = await publicUserKey(username)
    
            const secureKey = await EcdsaKey.passPhraseKey(Buffer.from(password), Buffer.from(username))
            const secureKeyAddress = await Tupelo.ecdsaPubkeyToAddress(secureKey.publicKey)
    
            const community = await getAppCommunity()
            const tree = await ChainTree.newEmptyTree(community.blockservice, insecureKey)
    
            console.log("playing transactions")
            await txsWithCommunityWait(tree, [
                // Set the ownership of the chaintree to our secure key (thus owning the username)
                setOwnershipTransaction([secureKeyAddress]),
                // Cache the username inside of the chaintree for easier access later
                setDataTransaction(usernameKey, username),
            ])
            tree.key = secureKey
            onLogin(tree)
        }
        doRegister()
    }

    return (
        <div>
            <PasswordField error={error} name="Password" value={password} onChange={(evt: React.ChangeEvent<HTMLInputElement>) => { setError(''); setPassword(evt.target.value) }} />
            <PasswordField error={error} name="Confirm Password" value={passwordConfirm} onChange={(evt: React.ChangeEvent<HTMLInputElement>) => { setError(''); setPasswordConfirm(evt.target.value) }} />
            <Button onClick={handleSubmit}>Register</Button>
        </div>
    )
}

export function LoginForm(props:RouteProps) {
    const [state, dispatch] = useReducer(reducer, initialState)
    const [redirect,doRedirect] = useState(false)

    const [,globalDispatch] = useContext(StoreContext)

    const handleUsernameChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ type: Actions.loginFormType, username: evt.target.value, dispatch: dispatch } as IUsernameType)
    }

    const onLogin = async (tree:ChainTree) => {
        const did = await tree.id()
        globalDispatch({
            type: AppActions.login,
            userTree: tree,
            username: state.username,
            did: did,
        } as IAppLogin)
        doRedirect(true)
    }

    let { from } = (props.location && props.location.state) ? props.location.state : { from: { pathname: "/wallet" } };

    if (redirect) {
        return (
            <Redirect to={from}/>
        )
    }

    return (
        <div>
            <Columns className="is-desktop">
                <Columns.Column size={"half"}>
                    <Heading className="animated flipInX fast">Hello.</Heading>
                    <Heading subtitle>Find or create your wallet.</Heading>
                </Columns.Column>
            </Columns>

            <Columns className="is-desktop">
                <Columns.Column size={"half"}>
                    <UsernameField state={state} onChange={handleUsernameChange} />
                    {state.loading && state.username && 
                        <div>
                            <Loader style={{ width: 25, height: 25 }} />
                            <p className="animated flipInX fast">{state.loadingText}</p>
                        </div>
                    }
                    {!state.loading && state.username && state.userTree && <LoginBottom state={state} dispatch={dispatch} onLogin={onLogin}/>}
                    {!state.loading && state.username && !state.userTree && <RegisterBottom state={state} dispatch={dispatch} onLogin={onLogin} />}
                </Columns.Column>
            </Columns>
        </div>
    )
}
