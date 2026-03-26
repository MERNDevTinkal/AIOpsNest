import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Realtime from './pages/Realtime';
import Products from './pages/Products';

export default function App() {
  return (
    <BrowserRouter>
      <nav className="p-4 bg-gray-100">
        <Link to="/register" className="mr-4">Register</Link>
        <Link to="/login" className="mr-4">Login</Link>
        <Link to="/products" className="mr-4">Products</Link>
        <a href="http://localhost:5174" className="mr-4">Admin Dashboard</a>
      </nav>
      <div className="p-6">
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/realtime" element={<Realtime />} />
          <Route path="/products" element={<Products />} />
          <Route path="/" element={<div>Welcome to Auth Frontend</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
