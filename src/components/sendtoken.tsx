import React, { useState, useContext } from 'react'

import { Modal, Form, Button, Media,Content, Loader } from 'react-bulma-components'
import { ChainTree, receiveTokenTransactionFromPayload, EcdsaKey, sendTokenTransaction, setOwnershipTransaction } from 'tupelo-wasm-sdk'
import { getAppCommunity } from '../util/appcommunity'
import { getUserTree } from '../util/usernames'
import { StoreContext, IAppMessage } from '../state/store'

//TODO: this would be nice with error handling, etc

//TODO(bug): if you let the browser autofill a field it doesn't trigger change and so it doesn't update the state
// so you end up with null names

export function SendTokenDialog({ show, onClose, userTree, tokens }: { tokens: Object, userTree: ChainTree, show: boolean, onClose: (() => void) }) {
    const [,globalDispatch] = useContext(StoreContext)
    
    const [state, setState] = useState({
        loading: false,
        tokenName: '',
        destination: '',
        ammount: '',
    })

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
        setState({ ...state, [evt.target.name]: evt.target.value })
    }

    const handleSubmit = () => {
        setState({...state, loading: true})
        const doAsync = async ()=> {
            console.log("sending: ", state)
            /*
                get destination chain,
                create a new ephemeral chaintree
                chown owner to both self and destination
                sendCoin from user tree
                receiveCoin on new chaintree
            */
            const c = await getAppCommunity()
            
            const [destTree, ephemeralKey] = await Promise.all([getUserTree(state.destination), EcdsaKey.generate()])
            const ephemeralTree = await ChainTree.newEmptyTree(c.blockservice, ephemeralKey)

            const userDid = await userTree.id()
            const destDid = await destTree.id()
            const ephemeralDid = await ephemeralTree.id()

            if (userDid === null || destDid === null || ephemeralDid === null) {
                throw new Error("error getting userdid, destdid or ephemeralDID")
            }

            console.log("ephemeralDID: ", ephemeralDid)
            // const userAuthResp = await userTree.resolve("tree/_tupelo/authentications")
            // const destAuthResp = await destTree.resolve("tree/_tupelo/authentications")

            const sendId = userDid + "->" + destDid

            console.log("sending token to ephemeral")
            const sendTx = sendTokenTransaction(
                sendId,
                state.tokenName,
                parseInt(state.ammount, 10),
                ephemeralDid,
            )
            console.log("send tx: ", sendTx.toObject())
            const payload = await c.sendTokenAndGetPayload(userTree, sendTx)

            console.log("receiving on ephemeral, payload: ", payload.toObject())
            let receiveTx = receiveTokenTransactionFromPayload(payload)

            console.log("receiveTx: ", receiveTx.toObject())
            await c.playTransactions(ephemeralTree, [
                // setOwnershipTransaction(userAuthResp.value.concat(destAuthResp.value)),
                receiveTx,
            ])
            console.log('done')
            
            setState({...state, loading: false, tokenName: '', destination: '', ammount: ''})
            onClose()
            globalDispatch({
                message: {
                    title: "Sent!",
                    body: "Tell " + state.destination + " to use this: " + ephemeralDid, 
                }
            } as IAppMessage)
        }
        doAsync()
    }

    const tokenOptions = Object.keys(tokens).map((tokenName) => {
        return <option key={tokenName} value={tokenName}>{tokenName}</option>
    })

    return (
    <Modal show={show} onClose={onClose}>
        <Modal.Card style={{backgroundColor: 'white'}}>
        <Modal.Card.Head>
            <Modal.Card.Title>
                Send Token
            </Modal.Card.Title>
        </Modal.Card.Head>
        <Modal.Card.Body>
            <Media>
                {state.loading ?
                <Loader />
                :                
                <Media.Item>
                    <Content>
                        <Form.Field>
                            <Form.Label>Token Name</Form.Label>
                            <Form.Control>
                                <Form.Select onChange={handleChange} value={state.tokenName} name="tokenName">
                                    <option value=""></option>
                                    {tokenOptions}
                                </Form.Select>
                            </Form.Control>
                        </Form.Field>
                        <Form.Field>
                            <Form.Label>Destination</Form.Label>
                            <Form.Control>
                                <Form.Input value={state.destination} onChange={handleChange} name="destination" placeholder="Where to send" />
                            </Form.Control>
                        </Form.Field>
                        <Form.Field>
                            <Form.Label>Ammount</Form.Label>
                            <Form.Control>
                                <Form.Input type="number" value={state.ammount.toString()} onChange={handleChange} name="ammount" placeholder="Ammount to send" />
                            </Form.Control>
                        </Form.Field>
                        <Form.Field kind="group">
                            <Button color="primary" onClick={handleSubmit}>Send</Button>
                            <Button text onClick={() => { onClose() }}>cancel</Button>
                        </Form.Field>
                    </Content>
                </Media.Item>
                }
            </Media>
        </Modal.Card.Body>
        </Modal.Card>
    </Modal>
)
}

