import React, { useContext, useState, useEffect } from 'react';
import { Box, Button, Form, Media, Card, Heading, Content, Loader, Columns } from 'react-bulma-components';
import { StoreContext, IAppMessage, AppActions } from '../state/store';
import { ChainTree, Tupelo, setOwnershipTransaction, setDataTransaction } from 'tupelo-wasm-sdk';
import { getAppCommunity } from '../util/appcommunity';
import { INFTProperties } from './creator';
import { getUserTree } from '../util/usernames';

type DidList = { [index: string]: number }

interface IOnSendEvent {
    did: string
    tree: ChainTree
    destination: string
    dids: DidList
}


function NFTCard({ did, onSend, userTree }: { userTree:ChainTree, did: string, onSend: Function }) {
    const [,globalDispatch] = useContext(StoreContext)
    
    const [state, setState] = useState({
        loading: true,
        tree: undefined as ChainTree | undefined,
        attrs: {} as INFTProperties,
        sending: false,
        destination: "",
        destinationError: '',
    })

    const isDestErrored = ()=> {
        return state.destinationError !== ''
    }

    useEffect(() => {
        const loadNFT = async () => {
            const c = await getAppCommunity()
            const tip = await c.getTip(did)
            const tree = new ChainTree({
                store: c.blockservice,
                tip: tip,
            })
            const attrsResp = await tree.resolveData("/_wallet/attributes")
            setState((s) => {
                return { ...s, loading: false, tree: tree, attrs: (attrsResp.value || {}) }
            })
        }

        loadNFT()
    }, [did])

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setState({ ...state, destination: evt.target.value })
    }

    const handleSend = () => {
        setState({ ...state, loading: true, sending: false, destinationError: '' })

        const doAsync = async ()=> {
            const c = await getAppCommunity()

            if (state.tree === undefined) {
                throw new Error("card must have a tree to send")
            }

            let destTree
            try {
                destTree = await getUserTree(state.destination)
            } catch(e) {
                if (e === 'not found') {
                    setState((s)=> {
                        return {...s, loading: false, sending: true, destinationError: 'Unknown username'}
                    })
                    return
                }
                throw e
            }
            const authResp = await destTree.resolve("tree/_tupelo/authentications")
    
            state.tree.key = userTree.key
            console.log("reassigning ", did, " to: ", state.destination)
            // set the auth of this NFT to the same as the receiver
            await c.playTransactions(state.tree, [
                setOwnershipTransaction(authResp.value)
            ])
    
            console.log('remove did from nfts')
            // remove this NFT from my bag of hodling
            const dids = (await userTree.resolveData("/_wallet/nfts")).value

            const { [did]: value, ...didsWithoutSent } = dids
            await c.playTransactions(userTree, [
                setDataTransaction("/_wallet/nfts", didsWithoutSent)
            ])
            setState((s)=>{
                return {...s, sending: false, loading: false, destinationError: ''}
            })
            globalDispatch({
                type: AppActions.message,
                message: {
                    title: "Sent an NFT to user: " + state.destination,
                    body: "Ask " + state.destination + " to use this DID in their Add: \n" + did, 
                }
            } as IAppMessage)
            onSend({
                did: did,
                tree: state.tree,
                destination: state.destination,
                dids: didsWithoutSent,
            } as IOnSendEvent)
        }
        doAsync()
    }

    return (
        <Card>
            <Card.Header>
                <Card.Header.Title>{state.attrs.title}</Card.Header.Title>
            </Card.Header>
            <Card.Content>
                {state.loading ?
                    <Loader />
                    :
                    <div>
                        <Media>
                            <Media.Item>
                                <Heading size={4}>
                                    {state.attrs.title}
                                </Heading>
                                <Heading subtitle size={6}>
                                    {state.attrs.subtitle}
                                </Heading>
                            </Media.Item>
                        </Media>
                        <Content>
                            {state.attrs.content}
                            <pre style={{marginTop:'1em'}}>{did}</pre>
                        </Content>
                    </div>}
            </Card.Content>
            <Card.Footer>
                {!state.sending ?
                    <Card.Footer.Item>
                        <Button onClick={() => { setState({ ...state, sending: true }) }}>Send</Button>
                    </Card.Footer.Item>
                    :
                    <Content style={{ padding: '1em' }}>
                        <Form.Field>
                            <Form.Label>Destination Name</Form.Label>
                            <Form.Control>
                                <Form.Input color={isDestErrored() ? 'danger' : 'info'} value={state.destination} onChange={handleChange} name="nftdestination" placeholder="Destination" />
                            </Form.Control>
                            {isDestErrored() && <Form.Help color="danger">{state.destinationError}</Form.Help>}
                        </Form.Field>
                        <Form.Field kind="group">
                            <Button color="primary" onClick={handleSend}>Send</Button>
                            <Button text onClick={() => { setState({ ...state, sending: false, destination: "" }) }}>cancel</Button>
                        </Form.Field>
                    </Content>
                }
            </Card.Footer>
        </Card>
    )
}

export function ObjectWallet() {

    const [globalState] = useContext(StoreContext)
    const [state, setState] = useState({
        loading: true,
        dids: {} as DidList,
    })

    if (globalState.userTree === undefined) {
        throw new Error("must have a userTree to use ObjectWallet")
    }

    const onSend = async (evt: IOnSendEvent) => {
        setState((s) => {
            return { ...s, dids: evt.dids }
        })
    }

    useEffect(() => {
        const getObjects = async () => {
            if (globalState.userTree === undefined) {
                throw new Error("user tree has to be defined")
            }
            const tResp = await globalState.userTree.resolveData("/_wallet/nfts")
            setState((s) => {
                return { ...s, loading: false, dids: (tResp.value || {}) }
            })
        }

        if (globalState.userTree) {
            getObjects()
        }
    }, [globalState.userTree])

    const cards = Object.keys(state.dids).map((did) => {
        if (globalState.userTree === undefined) {
            throw new Error("must hae a user tree to list dids")
        }
        return (
            <Columns.Column key={did} size="half">
                <NFTCard userTree={globalState.userTree} onSend={onSend} did={did} />
            </Columns.Column>
        )
    })

    const handleAdd = function(did:string) {
        setState((s) => {
            return {...s, dids: {...state.dids, [did]: Date.now()}}
        })
    }

    return (
        <div>
            <Heading>Object wallet</Heading>
            <Columns>
                {state.loading && <Loader />}
                {cards}
            </Columns>
            <AddObjectForm onAdd={handleAdd} userTree={globalState.userTree} />
        </div>
    )
}

const AddObjectForm = ({ userTree, onAdd }: { userTree: ChainTree, onAdd:Function }) => {
    const [state, setState] = useState({
        addOpen: false,
        addDid: "",
        addLoading: false,
    })

    const handleAdd = () => {
        setState({ ...state, addLoading: true })
        const did = state.addDid
        const doAsync = async () => {
            if (userTree === undefined || userTree.key === undefined) {
                throw new Error("user tree undfined")
            }

            const c = await getAppCommunity()
            const nftTip = await c.getTip(did)
            const nftTree = new ChainTree({
                store: c.blockservice,
                tip: nftTip,
            })
            let userAddr = await Tupelo.ecdsaPubkeyToAddress(userTree.key.publicKey)
            let resolveResp = await nftTree.resolve("tree/_tupelo/authentications")
            let auths: string[] = resolveResp.value
            if (auths.includes(userAddr)) {
                // this tree does belong to the user
                await c.playTransactions(userTree, [
                    setDataTransaction("/_wallet/nfts/" + did, Date.now())
                ])
                onAdd(did)
                setState({ ...state, addLoading: false, addDid: "" })
            }
            setState({ ...state, addLoading: false, addDid: "",addOpen: false })
        }
        doAsync()
    }

    const AddForm = ()=> {
        if (state.addLoading) {
            return <Loader/>
        }
        return (
        <Box>
        <Form.Field>
            <Form.Label>Add</Form.Label>
            <Form.Control>
                <Form.Input value={state.addDid} onChange={(evt) => { setState({ ...state, addDid: evt.target.value }) }} name="additionalDid" placeholder="DID" />
            </Form.Control>
        </Form.Field>
        <Form.Field kind="group">
            <Button onClick={handleAdd} color="primary">Add</Button>
            <Button text onClick={() => { setState((s) => { return { ...s, addOpen: false, addDid: '' } }) }}>Cancel</Button>
        </Form.Field>
        </Box>
        )
    }

    return (
        <div>
            {state.addOpen ?
                <AddForm/>
                :
                <Button onClick={() => { setState((s) => { return { ...s, addOpen: true } }) }}>Add</Button>
            }
        </div>
    )
}