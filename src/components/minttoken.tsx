import React, { useState } from 'react'

import { Modal, Form, Button, Media,Content, Loader } from 'react-bulma-components'
import { ChainTree, mintTokenTransaction } from 'tupelo-wasm-sdk'
import { txsWithCommunityWait } from '../util/appcommunity'

//TODO: this would be nice with error handling to show you you're trying to mint more than the allowed

export function MintTokenDialog({ show, onClose, userTree, tokens }: { tokens: Object, userTree: ChainTree, show: boolean, onClose: (() => void) }) {
    const [state, setState] = useState({
        loading: false,
        tokenName: '',
        amount: 0,
    })

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
        setState({ ...state, [evt.target.name]: evt.target.value })
    }

    const handleSubmit = () => {
        setState({...state, loading: true})
        const doAsync = async ()=> {
            await txsWithCommunityWait(userTree, [mintTokenTransaction(state.tokenName, state.amount)])
            setState({...state, loading: false, tokenName: '', amount: 0})
            onClose()
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
                Mint Token
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
                            <Form.Label>Amount</Form.Label>
                            <Form.Control>
                                <Form.Input type="number" value={state.amount.toString()} onChange={handleChange} name="amount" placeholder="Amount to Mint" />
                            </Form.Control>
                        </Form.Field>
                        <Form.Field kind="group">
                            <Button color="primary" onClick={handleSubmit}>Mint</Button>
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

