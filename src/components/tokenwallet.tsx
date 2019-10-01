import React, { useContext, useState, useEffect } from 'react'
import { StoreContext } from '../state/store'
import { Redirect, RouteProps } from 'react-router'
import { Section, Table, Loader, Heading } from 'react-bulma-components'

const tokenPath = "/tree/_tupelo/tokens";


export function TokenWallet(props: RouteProps) {

    const [state, setState] = useState({
        loading: true,
        firstRun: true,
        tokens: {},
    })

    const [globalState] = useContext(StoreContext)

    useEffect(() => {
        if (state.firstRun && globalState.userTree) {
            setState({ ...state, firstRun: false })
            loadTokens()
        }
    }, [globalState.userTree])

    if (!globalState.userTree) {
        return (
            <Redirect to={{
                pathname: "/login",
                state: { from: props.location },
            }} />
        )
    }

    const loadTokens = async () => {
        if (globalState.userTree === undefined) {
            throw new Error("user tree must be defined")
        }
        let tokenResp: any
        try {
            tokenResp = await globalState.userTree.resolve(tokenPath)
        } catch (e) {
            console.log("e: ", e)
            setState({ ...state, tokens: {}, loading: false })
        }

        console.log("tokens resp: ", tokenResp)
        setState({ ...state, tokens: tokenResp.value, loading: false })
    }



    return (
        <div>
            {state.loading ?
                <Loader />
                :
                <Table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Balance</th>
                            <th>Max</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>

                    </tbody>
                </Table>
            }
        </div>
    )
}