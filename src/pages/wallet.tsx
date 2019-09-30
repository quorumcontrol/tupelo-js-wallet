import React, {useContext} from 'react'
import { StoreContext } from '../state/store'
import { Redirect, RouteProps } from 'react-router'

export function Wallet(props:RouteProps) {

    const [globalState] = useContext(StoreContext)

    if (!globalState.userTree) {
        return (
            <Redirect to={{
                pathname: "/login",
                state: { from: props.location},
            }}/>
        )
    }

    return (
        <div>
            <h1>Wallet</h1>
        </div>
    )
}