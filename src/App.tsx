import React, { useContext } from 'react';
import 'react-bulma-components/dist/react-bulma-components.min.css';
import './App.scss';
import { Navbar, Container, Loader, Columns, Section } from 'react-bulma-components'
import { LoginForm } from './pages/login';
import { StoreProvider, StoreContext } from './state/store';
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { Wallet } from './pages/wallet';
import { TNSRouter } from './components/tnsrouter'
import { UserMessageList } from './components/messagelist'

const Routing = () => {
  const [globalState] = useContext(StoreContext)

  return (
    globalState.loading > 0 ?
      <Section>
        <Columns className="is-desktop">
          <Loader style={{ height: 100, width: 100 }} />
        </Columns>
      </Section>
      :
      window.location.hostname === process.env.REACT_APP_WALLET_DOMAIN ?
        <div>
          <UserMessageList />
          <Router>
            <Switch>
              <Route path="/login">
                <LoginForm />
              </Route>
              <Route path="/wallet">
                <Wallet />
              </Route>
              <Route>
                <LoginForm />
              </Route>
            </Switch>
          </Router>
        </div>
        :
        <TNSRouter />
  )
}

const NavBar = () => {
  const [globalState] = useContext(StoreContext)

  return (
    <Navbar transparent={false}>
      <Navbar.Brand>
        <img src={require("./logo.svg")} alt="Tupelo"/>
      </Navbar.Brand>
      <Navbar.Container position="end">
        {globalState && globalState.username && <p>Wallet of {globalState.username}</p>}
      </Navbar.Container>
    </Navbar>
  )
}

const App: React.FC = () => {

  return (
    <StoreProvider >
      <Container>
        <NavBar />
      </Container>
      <Container>
        <Section>
          <Routing />
        </Section>
      </Container>
    </StoreProvider>
  );
}

export default App;
