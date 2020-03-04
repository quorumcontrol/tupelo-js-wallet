import React, { useState, useRef } from 'react';
import { Form, Box, Button, Loader } from 'react-bulma-components';
import { Tupelo, ChainTree, EcdsaKey, setDataTransaction, setOwnershipTransaction } from 'tupelo-wasm-sdk';
import { getAppCommunity, txsWithCommunityWait } from '../util/appcommunity';

export interface INFTProperties {
    title: string
    subtitle: string
    content: string
    image?:Uint8Array
}

export function ObjectCreator({userTree}:{userTree:ChainTree}) {
    const initialState = {
        title: "",
        subtitle: "",
        content: "",
        imagePath: "",
        imageError: "",
    } as { [index: string]: string }

    const hasImageError = () => {
        return state.imageError !== ''
    }

    const fileRef = useRef<HTMLInputElement>(null)

    const [state, setState] = useState(initialState)

    const [loading,setLoading] = useState(false)

    const hasImage = () => {
        return state.imagePath !== ''
    }

    async function createNFT() {
        const props = {...state}
        if (userTree.key === undefined) {
            throw new Error("undefined userTree key")
        }

        let fileBitsPromise:Promise<ArrayBuffer>|undefined = undefined

        if (hasImage()) {
            if (fileRef.current === null || fileRef.current.files === null) {
                throw new Error("undefined ref, even though imagePath set")
            }
            const fReader = new FileReader()
            const file = fileRef.current.files[0]

            fileBitsPromise = new Promise((resolve,reject) => {
                fReader.onload = () => {
                    const result = fReader.result as ArrayBuffer
                    if (result.byteLength > (1024 * 300)) {
                        reject("Your image is too big, please limit to 300k")
                        return
                    }
                    resolve(result)
                }
                fReader.onerror = (e) => {
                    reject(e)
                }
                fReader.readAsArrayBuffer(file)
            })
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

        const attrs = {
            title: props.title,
            subtitle: props.subtitle,
            content: props.content,
        } as {[index:string]:string|ArrayBuffer}

        if (hasImage() && fileBitsPromise !== undefined) {
            console.log("has image, getting the bits")
            try {
                attrs.image = Buffer.from(await fileBitsPromise)    
            } catch(e) {
                setState((s) => {
                    return {...s,imageError: e.toString()}
                })
                setLoading(false)
                return
            }
        }

        console.log("creating attrs: ", attrs)

        // now we set the data and CHOWN to the user
        const nftP = txsWithCommunityWait(tree, [
            setDataTransaction("/_wallet/attributes", attrs),
            setOwnershipTransaction([userAddr]),
        ])
        
        // and we keep a record of the NFT in the user tree
        const userP = txsWithCommunityWait(userTree, [
            setDataTransaction("/_wallet/nfts/" + did, Date.now())
        ])
        await Promise.all([nftP, userP])
        setState(initialState)
        setLoading(false)
    }

    const changeHandler = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const target = evt.target
        console.log("setting ", target.name, " to ", target.value)
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

                <Form.Field>
                    <Form.Label>Image (optional)</Form.Label>
                    <Form.Control>
                        <input accept="image/*" ref={fileRef} onChange={changeHandler} name="imagePath" type="file"/>
                        {hasImageError() && <Form.Help color="danger">{state.imageError}</Form.Help>}
                    </Form.Control>
                </Form.Field>
                <Button onClick={submitHandler}>Create</Button>
            </Box>}
        </div>
    )
}