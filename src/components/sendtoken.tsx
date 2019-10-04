import React, { useState, useContext } from 'react'

import { Modal, Form, Button, Media,Content, Loader } from 'react-bulma-components'
import { ChainTree, receiveTokenTransactionFromPayload, EcdsaKey, sendTokenTransaction, setOwnershipTransaction } from 'tupelo-wasm-sdk'
import { getAppCommunity } from '../util/appcommunity'
import { getUserTree } from '../util/usernames'
import { StoreContext, IAppMessage, AppActions } from '../state/store'

const tokenPath = "/tree/_tupelo/tokens";

//TODO(bug): if you let the browser autofill a field it doesn't trigger change and so it doesn't update the state
// so you end up with null names

export function SendTokenDialog({ show, onClose, userTree, tokens }: { tokens: Object, userTree: ChainTree, show: boolean, onClose: (() => void) }) {
    const [,globalDispatch] = useContext(StoreContext)
    
    const initialState = {
        loading: false,
        tokenName: '',
        destination: '',
        amount: '',
        destinationError: '',
        amountError: '',
    }

    const [state, setState] = useState(initialState)

    const isDestinationErrored = ()=> {
        return state.destinationError !== ''
    }

    const isAmountErrored = ()=> {
        return state.amountError !== ''
    }

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
        setState({ ...state, [evt.target.name]: evt.target.value })
    }

    const handleSubmit = () => {
        setState({...state, loading: true, destinationError: '', amountError: ''})
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

            const balanceResp = await userTree.resolve(tokenPath + '/' + state.tokenName)
            const balance = balanceResp.value['balance'] as number

            if (parseInt(state.amount,10) > balance) {
                setState((s)=> {
                    return {...s, amountError: "That's too much. You don't have that", loading: false}   
                })
                return
            }
            
            let destTree
            try {
                destTree = await getUserTree(state.destination)
            } catch(e) {
                if (e === 'not found') {
                    setState((s)=> {
                        return {...s, destinationError: 'User not found', loading: false}   
                    })
                    return
                }
                throw e
            }
            const ephemeralKey = await EcdsaKey.generate()
            const ephemeralTree = await ChainTree.newEmptyTree(c.blockservice, ephemeralKey)

            const userDid = await userTree.id()
            const destDid = await destTree.id()
            const ephemeralDid = await ephemeralTree.id()

            if (userDid === null || destDid === null || ephemeralDid === null) {
                throw new Error("error getting userdid, destdid or ephemeralDID")
            }

            console.log("ephemeralDID: ", ephemeralDid)
            const userAuthResp = await userTree.resolve("tree/_tupelo/authentications")
            const destAuthResp = await destTree.resolve("tree/_tupelo/authentications")

            const sendId = userDid + "->" + destDid + Math.random().toString()

            console.log("sending token to ephemeral")
            const sendTx = sendTokenTransaction(
                sendId,
                state.tokenName,
                parseInt(state.amount, 10),
                ephemeralDid,
            )
            console.log("send tx: ", sendTx.toObject())
            const payload = await c.sendTokenAndGetPayload(userTree, sendTx)

            console.log("receiving on ephemeral, payload: ", payload.toObject())
            let receiveTx = receiveTokenTransactionFromPayload(payload)

            console.log("receiveTx: ", receiveTx.toObject())
            await c.playTransactions(ephemeralTree, [
                setOwnershipTransaction(userAuthResp.value.concat(destAuthResp.value)),
                receiveTx,
            ])
            console.log('done')
            
            setState(initialState)
            onClose()
            globalDispatch({
                type: AppActions.message,
                message: {
                    title: "Sent " + state.amount + " token to user: " + state.destination,
                    body: "Ask " + state.destination + " to use this DID in their receive token: \n" + ephemeralDid, 
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
                                <Form.Input color={ isDestinationErrored() ? "danger" : "info" } value={state.destination} onChange={handleChange} name="destination" placeholder="Where to send" />
                            </Form.Control>
                            {isDestinationErrored() && <Form.Help color="danger">{state.destinationError}</Form.Help>}

                        </Form.Field>
                        <Form.Field>
                            <Form.Label>Amount</Form.Label>
                            <Form.Control>
                                <Form.Input color={ isAmountErrored() ? "danger" : "info" } type="number" value={state.amount} onChange={handleChange} name="amount" placeholder="Amount to send" />
                            </Form.Control>
                            {isAmountErrored() && <Form.Help color="danger">{state.amountError}</Form.Help>}
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

