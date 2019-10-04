import React, { useContext, useState } from 'react';
import { StoreContext } from '../state/store';
import { Redirect, RouteProps } from 'react-router';
import { Tabs, Container, Heading, Footer, Content } from 'react-bulma-components';
import { TokenWallet } from '../components/tokenwallet';
import { ObjectCreator } from '../components/creator';
import { ObjectWallet } from '../components/objectwallet';

enum tabs {
    objects,
    tokens,
    creator,
}
type tabStrings = keyof typeof tabs;

export function Wallet(props: RouteProps) {

    const [state, setState] = useState({
        currentTab: tabs.objects,
    })
    const [globalState] = useContext(StoreContext)

    const clickHandler = (evt: any) => {
        const tabStr: tabStrings = evt.target.innerText.toLowerCase()
        setState({ ...state, currentTab: tabs[tabStr] })
    }

    const pageContent = (tab: tabs) => {
        if (globalState.userTree === undefined) {
            throw new Error("can't get page content without a usertree")
        }
        switch (tab) {
            case tabs.tokens:
                return <TokenWallet />
            case tabs.creator:
                return <ObjectCreator userTree={globalState.userTree} />
            case tabs.objects:
                return <ObjectWallet />
            default:
                throw new Error("unrecognized tab: " + tab)
        }
    }

    if (!globalState.userTree) {
        return (
            <Redirect to={{
                pathname: "/login",
                state: { from: props.location },
            }} />
        )
    }

    return (
        <Container>
            <Heading>Wallet of {globalState.username}</Heading>
            <Tabs>
                <Tabs.Tab onClick={clickHandler} active={state.currentTab === tabs.objects}>Objects</Tabs.Tab>
                <Tabs.Tab onClick={clickHandler} active={state.currentTab === tabs.tokens}>Tokens</Tabs.Tab>
                <Tabs.Tab onClick={clickHandler} active={state.currentTab === tabs.creator}>Creator</Tabs.Tab>
            </Tabs>
            {pageContent(state.currentTab)}
            <p style={{marginTop: '5em'}}>wallet did: {globalState.userDid}</p>
        </Container>
    )
}