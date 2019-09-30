import React from 'react';
import './App.css';
import 'react-bulma-components/dist/react-bulma-components.min.css';
import { Navbar,Section,Container } from 'react-bulma-components'
import { LoginForm } from './components/login';

const App: React.FC = () => {
  return (
    <div className="App">
        <Container>   
         <Navbar transparent={false}>
        <Navbar.Brand>
         Tupelo
        </Navbar.Brand>
      </Navbar>
      </Container>
      <Section>
        <Container>
            <LoginForm/>
        </Container>
      </Section>
    </div>
  );
}

export default App;
