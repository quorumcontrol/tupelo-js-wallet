import React from 'react';
import './App.css';
import 'react-bulma-components/dist/react-bulma-components.min.css';
import { Navbar,Container } from 'react-bulma-components'
import { LoginForm } from './pages/login';
import { StoreProvider } from './state/store';

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Wallet } from './pages/wallet';


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

      <Router>
        <Switch>
          <Route path="/login">
            <LoginForm/>
          </Route>
          <Route path="/wallet">
            <Wallet/>
          </Route>
          <Route>
            <LoginForm/>
          </Route>
        </Switch>
      </Router>
    </StoreProvider>
  );
}

export default App;
