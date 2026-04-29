import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicView from './PublicView';
import AdminPanel from './AdminPanel';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicView />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
