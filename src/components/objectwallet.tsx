import React, { useContext, useState, useEffect } from 'react';
import { Box, Button, Form, Media, Card, Heading, Content, Loader, Columns } from 'react-bulma-components';
import { StoreContext } from '../state/store';
import { ChainTree, Tupelo, setOwnershipTransaction, setDataTransaction } from 'tupelo-wasm-sdk';
import { getAppCommunity } from '../util/appcommunity';
import { INFTProperties } from './creator';
import { publicUserKey } from '../pages/login';

interface IOnSendEvent {
    did: string
    tree: ChainTree
    destination: string
}


function NFTCard({ did, onSend }: { did: string, onSend: Function }) {
    const [state, setState] = useState({
        loading: true,
        tree: undefined as ChainTree | undefined,
        attrs: {} as INFTProperties,
        sending: false,
        destination: "",
    })

    
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
        setState({ ...state, loading: true, sending: false })
        onSend({
            did: did,
            tree: state.tree,
            destination: state.destination,
        } as IOnSendEvent)
    }

    return (
        <Card>
            <Card.Header>
                <Card.Header.Title>{did}</Card.Header.Title>
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
                        </Content>
                    </div>}
            </Card.Content>
            <Card.Footer>
                {!state.sending ?
                    <Card.Footer.Item onClick={() => { setState({ ...state, sending: true }) }}>
                        Send
                    </Card.Footer.Item>
                    :
                    <Content style={{ padding: '1em' }}>
                        <Form.Field>
                            <Form.Label>Destination Name</Form.Label>
                            <Form.Control>
                                <Form.Input value={state.destination} onChange={handleChange} name="nftdestination" placeholder="Destination" />
                            </Form.Control>
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
        dids: {} as { [index: string]: number },
        addDid: "",
        addLoading: false,
    })

    const onSend = async (evt: IOnSendEvent) => {
        const userTree = globalState.userTree
        if (userTree === undefined || userTree.key === undefined) {
            throw new Error("can only send when a valid user")
        }
        const c = await getAppCommunity()

        const destinationKey = await publicUserKey(evt.destination)
        const destionationDid = await Tupelo.ecdsaPubkeyToDid(destinationKey.publicKey)

        const destTip = await c.getTip(destionationDid)
        const destTree = new ChainTree({
            store: c.blockservice,
            tip: destTip
        })
        const authResp = await destTree.resolve("tree/_tupelo/authentications")

        evt.tree.key = userTree.key
        console.log("reassigning ", evt.did, " to: ", destionationDid)
        // set the auth of this NFT to the same as the receiver
        await c.playTransactions(evt.tree, [
            setOwnershipTransaction(authResp.value)
        ])

        console.log('remove did from nfts')
        // remove this NFT from my bag of hodling
        const { [evt.did]: value, ...withoutSent } = state.dids
        await c.playTransactions(userTree, [
            setDataTransaction("/_wallet/nfts", withoutSent)
        ])
        setState((s) => {
            return { ...s, dids: withoutSent }
        })
    }

    useEffect(() => {
        const getObjects = async () => {
            if (globalState.userTree === undefined) {
                throw new Error("user tree has to be defined")
            }
            const tResp = await globalState.userTree.resolveData("/_wallet/nfts")
            setState((s) => {
                return { ...s, dids: (tResp.value || {}) }
            })
        }

        if (globalState.userTree) {
            getObjects()
        }
    }, [globalState.userTree])

    const cards = Object.keys(state.dids).map((did) => {
        return (
            <Columns.Column key={did} size="half">
                <NFTCard onSend={onSend} did={did} />
            </Columns.Column>
        )
    })

    const handleAdd = ()=> {
        setState({...state, addLoading: true})
        const did = state.addDid
        const doAsync = async ()=> {
            const userTree = globalState.userTree

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
                setState({...state, dids: {...state.dids, [did]: Date.now()}, addLoading: false, addDid: ""})
            } else {
                setState({...state, addLoading: false, addDid: ""})
            }
        }
        doAsync()
    }

    return (
        <div>
            <Heading>Object wallet</Heading>
            <Columns>
                {cards}
            </Columns>
            <Box>
                {state.addLoading ?
                <Loader/>
                :
                <div>
                <Form.Field>
                    <Form.Label>Add</Form.Label>
                    <Form.Control>
                        <Form.Input value={state.addDid} onChange={(evt)=> {setState({...state, addDid: evt.target.value})}} name="additionalDid" placeholder="DID" />
                    </Form.Control>
                </Form.Field>
                <Form.Field kind="group">
                    <Button onClick={handleAdd} color="primary">Add</Button>
                </Form.Field>
                </div>
                }
            </Box>
        </div>
    )
}