/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import { LanguageProvider } from './lib/LanguageContext';
import { FirebaseProvider } from './lib/FirebaseContext';

export default function App() {
  return (
    <FirebaseProvider>
      <LanguageProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </FirebaseProvider>
  );
}
