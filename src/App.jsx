import React, { useState, useEffect } from 'react';
import Home from './Home';
import Create from './Create';
import Log from './Login';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Create />} /> 
        <Route path="/home" element={<Home />} />
        <Route path='/login' element={<Log />} />
      </Routes>
    </Router>
  );
}

export default App;