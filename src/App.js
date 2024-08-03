// src/App.js
import React from 'react';
import './App.css';
import SortVisualizer from './components/SortVisualizer';

function App() {
    return (
        <div className="App">
            
            <div className="sort-container">
                <SortVisualizer />
            </div>
        </div>
    );
}

export default App;
