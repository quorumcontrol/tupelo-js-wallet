import React, { useState } from 'react'

import { Modal, Form, Button, Media, Content, Loader } from 'react-bulma-components'
import { ChainTree, receiveTokenTransactionFromPayload, sendTokenTransaction } from 'tupelo-wasm-sdk'
import { getAppCommunity } from '../util/appcommunity'
import { SimpleSyncher } from '../util/syncher'
import { TokenPayload } from 'tupelo-messages'


const tokenPath = "/tree/_tupelo/tokens";

//TODO: this would be nice with error handling, etc

export function ReceiveTokenDialog({ show, onClose, userTree }: { userTree: ChainTree, show: boolean, onClose: (() => void) }) {

    const [state, setState] = useState({
        loading: false,
        did: '',
    })

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setState({ ...state, [evt.target.name]: evt.target.value })
    }

    const handleSubmit = () => {
        setState({ ...state, loading: true })
        const doAsync = async () => {
            const c = await getAppCommunity()

            const userDid = await userTree.id()
            if (userDid === null) {
                throw new Error("user tree had null id")
            }
            const tip = await c.getTip(state.did)
            const tree = new ChainTree({
                store: c.blockservice,
                tip: tip,
                key: userTree.key,
            })
            const tokensResp = await tree.resolve(tokenPath)
            const tokens = await Promise.all(Object.keys(tokensResp.value || {}).map(async (key) => {
                const tResp = await tree.resolve(tokenPath + "/" + key)
                return {
                    name: key,
                    balance: tResp.value['balance'],
                }
            }));

            const syncher = new SimpleSyncher()
            const sendPayloads = await Promise.all(tokens.map((token) => {
                return syncher.send(() => {
                    return c.sendTokenAndGetPayload(tree, sendTokenTransaction("uuid" + Math.random().toString(), token.name, token.balance, userDid))
                })
            })) as TokenPayload[]
            const rxTransactions = sendPayloads.map((payload) => {
                return receiveTokenTransactionFromPayload(payload)
            })
            await c.playTransactions(userTree, rxTransactions)
            setState((s) => {
                return { ...s, loading: false, did: '' }
            })
            onClose()
        }
        doAsync()
    }

    return (
        <Modal show={show} onClose={onClose}>
            <Modal.Card style={{ backgroundColor: 'white' }}>
                <Modal.Card.Head>
                    <Modal.Card.Title>
                        Receive Token
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
                                        <Form.Label>DID</Form.Label>
                                        <Form.Control>
                                            <Form.Input value={state.did} onChange={handleChange} name="did" placeholder="DID of tokens" />
                                        </Form.Control>
                                        <Form.Help>
                                            This is the code that begins with 'did:tupelo:' that the sender has from the wallet.å
                            </Form.Help>
                                    </Form.Field>
                                    <Form.Field kind="group">
                                        <Button color="primary" onClick={handleSubmit}>Receive</Button>
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

