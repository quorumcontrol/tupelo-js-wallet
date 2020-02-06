import React, { useContext, useState, useEffect } from 'react';
import { Redirect, RouteProps } from 'react-router';
import { Form, Box, Table, Button, Loader } from 'react-bulma-components';
import { ChainTree, setDataTransaction } from 'tupelo-wasm-sdk';
import { txsWithCommunityWait } from '../util/appcommunity';
import { StoreContext } from 'state/store';

export const tnsPath = "/_tns";

export function TupeloNamingService(props: RouteProps) {
    const [state, setState] = useState({
        loading: true,
        entries: {},
        modifiedAt: 0,
    })

    const [globalState] = useContext(StoreContext)

    useEffect(() => {
        const loadEntries = async () => {
            if (globalState.userTree === undefined) {
                throw new Error("user tree must be defined")
            }

            let entriesResp: any
            try {
                entriesResp = await globalState.userTree.resolveData(tnsPath)
            } catch (e) {
                console.error("e: ", e)
                setState((s) => {
                    return { ...s, entries: {}, loading: false }
                })
            }

            console.log("entries resp: ", entriesResp)
            setState((s) => {
                return { ...s, entries: (entriesResp.value || {}), loading: false }
            })
        }

        console.log("loading TNS entries")
        loadEntries()

    }, [globalState.userTree, state.modifiedAt])

    if (!globalState.userTree) {
        return (
            <Redirect to={{
                pathname: "/login",
                state: { from: props.location },
            }} />
        )
    }

    if (state.loading) {
        return <Loader />
    }

    const entryRows = Object.keys(state.entries).map((entryName) => {
        if (globalState.userTree === undefined) {
            throw new Error("user tree must be defined")
        }

        return <EntryRow key={entryName} modifiedAt={state.modifiedAt} tree={globalState.userTree} entryName={entryName} />
    })

    return (
        <div>
            <AddEntry userTree={globalState.userTree} entryAdded={() => setState({ ...state, modifiedAt: Date.now() })} />
            <Table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    {entryRows}
                </tbody>
            </Table>
        </div>
    )
}

export const EntryRow = ({ tree, entryName, modifiedAt }: { modifiedAt: number, tree: ChainTree, entryName: string }) => {
    const [state, setState] = useState({
        name: "",
        pointer: "",
        loading: true,
    })

    useEffect(() => {
        const loadInfo = async () => {
            const entryInfoPath = tnsPath + "/" + entryName
            const entryInfoResp = await tree.resolveData(entryInfoPath)
            console.log("entryInfoResp: ", entryInfoPath, entryInfoResp)
            setState((s) => {
                return { ...s, name: entryName, pointer: entryInfoResp.value, loading: false}
            })
        }

        console.log("loading entryRow")
        loadInfo()
    }, [tree, entryName, modifiedAt])

    return (
        <tr>
            <td>
                {entryName}
            </td>
            <td>
                {state.loading ? <Loader /> : state.pointer}
            </td>
        </tr>
    )
}

const entryNameToPath = (entryName: string) => {
    return entryName.replace('.', '/')
}

export const AddEntry = ({ userTree, entryAdded }: { userTree: ChainTree, entryAdded: Function }) => {
    const [state, setState] = useState({
        loading: false,
        entryName: '',
        pointer: '',
    })

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setState({ ...state, [evt.target.name]: evt.target.value })
    }

    const handleSubmit = () => {
        setState({...state, loading: true})
        const doAsync = async () => {
            const entryPath = entryNameToPath(state.entryName)
            await txsWithCommunityWait(userTree, [
                setDataTransaction(tnsPath + "/" + entryPath, state.pointer)
            ])
            setState({ ...state, loading: false, entryName: '', pointer: '' })
            entryAdded()
        }
        doAsync()
    }

    return (
        <Box>
            <Form.Field>
                <Form.Label>Name</Form.Label>
                <Form.Control>
                    <Form.Input value={state.entryName} onChange={handleChange} name="entryName" placeholder="Name" />
                </Form.Control>
            </Form.Field>
            <Form.Field>
                <Form.Label>Value</Form.Label>
                <Form.Control>
                    <Form.Input value={state.pointer} onChange={handleChange} name="pointer" placeholder="Value" />
                </Form.Control>
            </Form.Field>
            <Form.Field kind="group">
                <Button color="primary" onClick={handleSubmit}>Add</Button>
            </Form.Field>
        </Box>
    )
}