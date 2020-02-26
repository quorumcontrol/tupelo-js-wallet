import React, { useEffect, useState } from 'react';
import { Loader } from 'react-bulma-components';
import { getUserTree } from 'util/usernames';
import { ChainTree } from 'tupelo-wasm-sdk';
import { tnsPath } from './tns';

export function TNSRouter() {
    const [state, setState] = useState({
        username: "",
        chaintreeDataPath: "",
        tree: undefined as ChainTree | undefined,
        target: "",
    })

    const walletHostname = process.env.REACT_APP_WALLET_DOMAIN || ""
    console.log(`walletHostname: ${walletHostname}`)
    const walletHostnameComponents = walletHostname.split('.').reverse()

    useEffect(() => {
        const getTreeForUsername = async () => {
            // return early if we've already looked up our target
            if (state.target !== "") {
                return
            }

            // we reverse the hostname components b/c the hierarchy is easier to work with that way
            const hostnameComponents = window.location.hostname.split('.').reverse()

            console.log(`hostnameComponents: ${hostnameComponents}`)

            let username: string
            let chaintreeDataPath: string
            let allMatch = true
            walletHostnameComponents.forEach((c, i) => {
                if (hostnameComponents[i] !== c) {
                    allMatch = false
                }
            })
            if (allMatch) {
                // skip wallet hostname components
                username = hostnameComponents[walletHostnameComponents.length]
                chaintreeDataPath = hostnameComponents.slice(walletHostnameComponents.length + 1).reverse().join('/')
            } else {
                // TODO: Also support looking up a _tnslink TXT record for this?
                // Assumes first two components are username (i.e. TLD and component just to the left of that)
                // Everything else should be TNS pointers inside that user's chaintree.
                username = hostnameComponents.slice(0, 2).reverse().join('.')
                chaintreeDataPath = hostnameComponents.slice(2).reverse().join('/')
            }

            let userTree: ChainTree
            try {
                console.log(`getting tree for username ${username}`)
                userTree = await getUserTree(username)
                setState((s) => {
                    return {
                        ...s,
                        username: username,
                        chaintreeDataPath: chaintreeDataPath,
                        tree: userTree
                    }
                })
            } catch(e) {
                // just ignore
                return
            }
        }
        getTreeForUsername()
    })

    useEffect(() => {
        const getIPFSAddr = async (tree: ChainTree, dataPath: string) => {
            if (dataPath === "") {
                dataPath = '@'
            }

            console.log(`looking up TNS record at ${dataPath}`)

            const pointer = await tree.resolveData(`${tnsPath}/${dataPath}`)

            const target = `${process.env.REACT_APP_IPFS_GATEWAY}${pointer.value}`

            setState((s) => {
                console.log(`setting state.target to ${target}`)
                return { ...s, target: target }
            })
        }

        if (state.tree !== undefined && state.target === "") {
            getIPFSAddr(state.tree, state.chaintreeDataPath)
        }
    }, [state.tree, state.chaintreeDataPath])

    useEffect(() => {
        const redirectToTarget = () => {
            console.log(`Setting location to ${state.target}`)

            window.location.href = state.target
        }

        if (state.target !== "") {
            redirectToTarget()
        }
    }, [state.target])

    return (
        <div>
            <h3>Welcome to the {walletHostname} Tupelo Naming Service gateway.</h3>
            <p>Redirecting to {state.target === "" ? <span>... <Loader/></span> : state.target}</p>
        </div>
    )
}