import React, { useContext, useState } from 'react';
import { StoreContext } from '../state/store';
import { Redirect, RouteProps } from 'react-router';
import { Tabs, Container } from 'react-bulma-components';
import { TokenWallet } from '../components/tokenwallet';
import { ObjectCreator } from '../components/creator';
import { ObjectWallet } from '../components/objectwallet';
import { TupeloNamingService } from '../components/tns';

enum tabs {
    tokens,
    objects,
    creator,
    tns,
}
type tabStrings = keyof typeof tabs;

export function Wallet(props: RouteProps) {

    const [state, setState] = useState({
        currentTab: tabs.tokens,
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
            case tabs.tns:
                return <TupeloNamingService />
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
            <Tabs type="boxed">
                <Tabs.Tab onClick={clickHandler} active={state.currentTab === tabs.tokens}>Tokens</Tabs.Tab>
                <Tabs.Tab onClick={clickHandler} active={state.currentTab === tabs.objects}>Objects</Tabs.Tab>
                <Tabs.Tab onClick={clickHandler} active={state.currentTab === tabs.creator}>Creator</Tabs.Tab>
                <Tabs.Tab onClick={clickHandler} active={state.currentTab === tabs.tns}>TNS</Tabs.Tab>
            </Tabs>
            {pageContent(state.currentTab)}
        </Container>
    )
}