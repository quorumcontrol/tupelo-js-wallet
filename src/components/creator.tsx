import React, { useState } from 'react';
import { Heading, Form, Box,Button, Loader } from 'react-bulma-components';
import { Tupelo,ChainTree, EcdsaKey, setDataTransaction, setOwnershipTransaction } from 'tupelo-wasm-sdk';
import { getAppCommunity } from '../util/appcommunity';

export interface INFTProperties {
    title: string
    subtitle: string
    content: string
}

export function ObjectCreator({userTree}:{userTree:ChainTree}) {
    const [state, setState] = useState({
        title: "",
        subtitle: "",
        content: "",
    } as { [index: string]: string })

    const [loading,setLoading] = useState(false)

    async function createNFT() {
        const props = state
        if (userTree.key === undefined) {
            throw new Error("undefined userTree key")
        }
        // first we create an ephemeral key
        const ephemeralP = EcdsaKey.generate()
        const communityP = getAppCommunity()
    
        const [ephemeralKey,c] = await Promise.all([ephemeralP,communityP])
        // then a new chaintree
        const treeP = ChainTree.newEmptyTree(c.blockservice, ephemeralKey)
        const addrP = Tupelo.ecdsaPubkeyToAddress(userTree.key.publicKey)
        const [tree,userAddr] = await Promise.all([treeP, addrP])
        const did = await tree.id()
        if (did === null) {
            throw new Error("unknown tree DID")
        }
        // now we set the data and CHOWN to the user
        const nftP = c.playTransactions(tree, [
            setDataTransaction("/_wallet/attributes", {
                title: props.title,
                subtitle: props.subtitle,
                content: props.content
            }),
            setOwnershipTransaction([userAddr]),
        ])
        // and we keep a record of the NFT in the user tree
        const userP = c.playTransactions(userTree, [
            setDataTransaction("/_wallet/nfts/" + did, Date.now())
        ])
        await Promise.all([nftP, userP])
        setState({})
        setLoading(false)
    }

    const changeHandler = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const target = evt.target
        setState({...state,
            [target.name]: target.value,
        })
    }

    const submitHandler = ()=> {
        setLoading(true)
        createNFT()
    }

    return (
        <div>
            <Heading>Object Creator</Heading>
            <p>This lets you create an NFT!</p>
            {loading ?
            <Loader/> 
        :
            <Box style={{ marginTop: '1em' }}>
                <Form.Field>
                    <Form.Label>Title</Form.Label>
                    <Form.Control>
                        <Form.Input value={state.title} onChange={changeHandler} name="title" placeholder="title" />
                    </Form.Control>
                </Form.Field>
                <Form.Field>
                    <Form.Label>Subtitle</Form.Label>
                    <Form.Control>
                        <Form.Input value={state.subtitle} onChange={changeHandler} name="subtitle" placeholder="subtitle" />
                    </Form.Control>
                </Form.Field>
                <Form.Field>
                    <Form.Label>Content</Form.Label>
                    <Form.Control>
                        <Form.Input value={state.content} onChange={changeHandler} name="content" placeholder="content" />
                    </Form.Control>
                </Form.Field>
                <Button onClick={submitHandler}>Create</Button>
            </Box>}
        </div>
    )
}