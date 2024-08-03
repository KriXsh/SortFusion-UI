// src/App.js
import React from 'react';
import './App.css';
import ParticlesBackground from './components/ParticlesBackground';
import SortVisualizer from './components/SortVisualizer';

function App() {
  return (
    <div className="App">
      {/* <ParticlesBackground /> */}
      <div className="sort-container">
        <SortVisualizer />
      </div>
    </div>
  );
}

export default App;
