import React, { useEffect, useState } from 'react';
import { getUserTree } from 'util/usernames';
import { ChainTree } from 'tupelo-wasm-sdk';
import { tnsPath } from './tns';

export function TNSRouter() {
    const [state, setState] = useState({
        username: "",
        tree: undefined as ChainTree | undefined,
        target: "",
    })

    useEffect(() => {
        const getTreeForUsername = async () => {
            // we reverse the hostname components b/c the hierarchy is easier to work with that way
            const hostnameComponents = window.location.hostname.split('.').reverse()

            let username: string
            if (hostnameComponents[0] === 'me' && hostnameComponents[1] === 'tupelo') {
                username = hostnameComponents[2] // skip 'me' & 'tupelo'
            } else {
                // TODO: Also support looking up a _tnslink TXT record for this?
                username = window.location.hostname
            }

            let userTree: ChainTree
            try {
                userTree = await getUserTree(username)
                setState((s) => {
                    return { ...s, username: username, tree: userTree }
                })
            } catch(e) {
                console.log("no user tree") // TODO: delete this line once working
                // just ignore
                return
            }
        }
        getTreeForUsername()
    })

    useEffect(() => {
        const getIPFSAddr = async (tree: ChainTree) => {
            // TODO: Add support for nested names & pointers
            const pointer = await tree.resolveData(tnsPath)

            const target = `https://ipfs.io${pointer}`

            setState((s) => {
                return { ...s, target: target }
            })
        }

        if (state.tree !== undefined) {
            getIPFSAddr(state.tree)
        }
    }, [state])

    return (
        <p>Redirecting to {state.target}</p>
    )
}