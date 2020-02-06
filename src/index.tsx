import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const loc = window.location;
if (loc.hostname !== 'localhost' && loc.protocol !== 'https:') {
    window.location.href = loc.href.replace('http://', 'https://');
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/ipfs-sw.js`)
} else {
    console.log('Cannot register service worker')
}

ReactDOM.render(<App />, document.getElementById('root'));
