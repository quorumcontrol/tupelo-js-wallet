import React, { useState } from 'react'

import { Modal, Form, Button, Media,Content, Loader } from 'react-bulma-components'
import { ChainTree, establishTokenTransaction } from 'tupelo-wasm-sdk'
import { txsWithCommunityWait } from '../util/appcommunity'

export function EstablishTokenDialog({ show, onClose, userTree }: { userTree: ChainTree, show: boolean, onClose: (() => void) }) {
    const [state, setState] = useState({
        loading: false,
        tokenName: '',
        maximum: 0,
    })

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setState({ ...state, [evt.target.name]: evt.target.value })
    }

    const handleSubmit = () => {
        setState({...state, loading: true})
        const doAsync = async ()=> {
            await txsWithCommunityWait(userTree, [establishTokenTransaction(state.tokenName, state.maximum)])
            setState({...state, loading: false, tokenName: '', maximum: 0})
            onClose()
        }
        doAsync()
    }

    return (
    <Modal show={show} onClose={onClose}>
        <Modal.Card style={{backgroundColor: 'white'}}>
        <Modal.Card.Head>
            <Modal.Card.Title>
                Establish Token
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
                                <Form.Input value={state.tokenName} onChange={handleChange} name="tokenName" placeholder="Token Name" />
                            </Form.Control>
                        </Form.Field>
                        <Form.Field>
                            <Form.Label>Maximum Mint</Form.Label>
                            <Form.Control>
                                <Form.Input type="number" value={state.maximum.toString()} onChange={handleChange} name="maximum" placeholder="Maximum Mint" />
                            </Form.Control>
                            <Form.Help>Leave as 0 to allow unlimited minting</Form.Help>
                        </Form.Field>
                        <Form.Field kind="group">
                            <Button color="primary" onClick={handleSubmit}>Establish</Button>
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

