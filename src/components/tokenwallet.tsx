import React, { useContext, useState, useEffect } from 'react'
import { StoreContext } from '../state/store'
import { Redirect, RouteProps } from 'react-router'
import { Table, Loader, Button, Level } from 'react-bulma-components'
import { EstablishTokenDialog } from './establishtoken';
import { SendTokenDialog } from './sendtoken';
import { ChainTree } from 'tupelo-wasm-sdk'
import { MintTokenDialog } from './minttoken';
import { ReceiveTokenDialog } from './receivetoken';

const tokenPath = "/tree/_tupelo/tokens";

export function TokenWallet(props: RouteProps) {
    const [state, setState] = useState({
        loading: true,
        tokens: {},
        showEstablishModal: false,
        showMintModal: false,
        showSendModal: false,
        showReceiveModal: false,
        modifiedAt: 0,
    })

    const [globalState] = useContext(StoreContext)

    useEffect(() => {
        const loadTokens = async () => {
            if (globalState.userTree === undefined) {
                throw new Error("user tree must be defined")
            }
            let tokenResp: any
            try {
                tokenResp = await globalState.userTree.resolve(tokenPath)
            } catch (e) {
                console.error("e: ", e)
                setState((s) => {
                    return { ...s, tokens: {}, loading: false }
                })
            }

            console.log("tokens resp: ", tokenResp)
            setState((s) => {
                return { ...s, tokens: (tokenResp.value || {}), loading: false }
            })
        }

        console.log("loading tokens")
        loadTokens()
        
    }, [globalState.userTree, state.modifiedAt])

    if (!globalState.userTree) {
        return (
            <Redirect to={{
                pathname: "/login",
                state: { from: props.location },
            }} />
        )
    }

    if (state.loading) {
        return <Loader />
    }

    const tokenRows = Object.keys(state.tokens).map((tokenName) => {
        if (globalState.userTree === undefined) {
            throw new Error("undefined user tree!")
        }
        return <TokenRow key={tokenName} modifiedAt={state.modifiedAt} tree={globalState.userTree} tokenName={tokenName} />
    })

    const handleCloseModal = ()=> {
        console.log("setting modifiedAt")
        setState((s) => {return {...s, modifiedAt: Date.now()}})
    }

    return (
        <div>
            <EstablishTokenDialog userTree={globalState.userTree} show={state.showEstablishModal} onClose={() => { handleCloseModal(); setState({ ...state, showEstablishModal: false }) }} />
            <MintTokenDialog tokens={state.tokens} userTree={globalState.userTree} show={state.showMintModal} onClose={() => { handleCloseModal(); setState({ ...state, showMintModal: false }) }} />
            <SendTokenDialog tokens={state.tokens} userTree={globalState.userTree} show={state.showSendModal} onClose={() => { handleCloseModal(); setState({ ...state, showSendModal: false }) }} />
            <ReceiveTokenDialog userTree={globalState.userTree} show={state.showReceiveModal} onClose={() => { handleCloseModal(); setState({ ...state, showReceiveModal: false }) }} />
            <Level>
                <Level.Side align="left">
                    <Level.Item>
                        <Button onClick={() => { setState({ ...state, showSendModal: true }) }}>Send Token</Button>
                    </Level.Item>
                    <Level.Item>
                        <Button onClick={() => { setState({ ...state, showReceiveModal: true }) }}>Receive Token</Button>
                    </Level.Item>
                </Level.Side>
            </Level>
            <Table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Balance</th>
                        <th>Max</th>
                    </tr>
                </thead>
                <tbody>
                    {tokenRows}
                </tbody>
            </Table>
            <Level>
                <Level.Side align="left">
                    <Level.Item>
                        <Button onClick={() => { setState({ ...state, showEstablishModal: true }) }}>Establish Token</Button>
                    </Level.Item>
                    <Level.Item>
                        <Button onClick={() => { setState({ ...state, showMintModal: true }) }}>Mint Token</Button>
                    </Level.Item>
                </Level.Side>
            </Level>
        </div>
    )
}

export const TokenRow = ({ tree, tokenName, modifiedAt }: { modifiedAt: number, tree: ChainTree, tokenName: string }) => {
    const [state, setState] = useState({
        balance: 0,
        max: null,
        loading: true,
    })

    useEffect(() => {
        const loadInfo = async () => {
            const tokenInfoPath = tokenPath + "/" + tokenName
            const tokenInfoResp = await tree.resolve(tokenInfoPath)
            console.log("tokenInfoResp ", tokenInfoPath, tokenInfoResp)
            if (tokenInfoResp.value.monetaryPolicy) {
                const monetaryPolicy = await tree.resolve(tokenInfoPath + "/monetaryPolicy")
                setState((s) => { return { ...s, max: monetaryPolicy.value['maximum'] } })
            }

            setState((s) => {
                return { ...s, balance: tokenInfoResp.value['balance'], loading: false }
            })
        }
        console.log("loading tokenRow")
        loadInfo()
    }, [tree, tokenName, modifiedAt])

    return (
        <tr>
            <td>
                {tokenName}
            </td>
            <td>
                {state.loading ? <Loader /> : state.balance}
            </td>
            <td>
                {state.loading ? <Loader /> : state.max}
            </td>
        </tr>
    )
}