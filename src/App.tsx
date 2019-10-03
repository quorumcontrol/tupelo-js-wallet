import React, { useContext } from 'react';
import './App.css';
import 'react-bulma-components/dist/react-bulma-components.min.css';
import { Navbar, Container, Loader, Columns, Section } from 'react-bulma-components'
import { LoginForm } from './pages/login';
import { StoreProvider, StoreContext } from './state/store';
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { Wallet } from './pages/wallet';

import { UserMessageList } from './components/messagelist'

const Routing = () => {
  const [globalState] = useContext(StoreContext)


  return (
    globalState.loading > 0 ?
      <Section>
        <Columns className="is-desktop is-centered is-vcentered">
          <Loader style={{ height: 100, width: 100 }} />
        </Columns>
      </Section>
      :
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
  )
}


const App: React.FC = () => {

  return (
    <StoreProvider >
      <Container>
        <Navbar transparent={false}>
          <Navbar.Brand>
            Tupelo
        </Navbar.Brand>
        </Navbar>
      </Container>
      <Routing />

    </StoreProvider>
  );
}

export default App;
