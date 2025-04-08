import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState({
    isVisible: false,
    siteUrl: '-',
    testTime: '-',
    missingHeaders: '-',
    isVulnerable: null,
    reason: ''
  });

  const testFrameRef = useRef(null);
  const testCanvasRef = useRef(null);

  const checkURL = async () => {
    setError(null);
    setResult(null);
    setTestResults({
      isVisible: false,
      siteUrl: '-',
      testTime: '-',
      missingHeaders: '-',
      isVulnerable: null,
      reason: ''
    });

    try {
      const res = await axios.post('/.netlify/functions/checkHeaders', { url });
      const headers = res.data.headers || {};

      const xfo = headers['x-frame-options'];
      const csp = headers['content-security-policy'];

      const hasXFO = xfo && /(deny|sameorigin)/i.test(xfo);
      const hasCSP = csp && /frame-ancestors/i.test(csp);

      const missing = [];
      if (!hasXFO) missing.push('X-Frame-Options');
      if (!hasCSP) missing.push('CSP frame-ancestors');

      const isVulnerable = missing.length > 0;

      setResult(res.data);

      setTestResults({
        isVisible: true,
        siteUrl: url,
        testTime: new Date().toUTCString(),
        missingHeaders: missing.length > 0 ? missing.join(', ') : 'None - Site is protected',
        isVulnerable,
        reason: isVulnerable
          ? `Missing ${missing.join(' and ')}`
          : 'Proper protection headers are in place'
      });

      if (testFrameRef.current) {
        testFrameRef.current.src = url;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    }
  };

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: '#4d0c26',
        color: '#f3cda2'
      }}
    >
      {/* NAVBAR - top right corner */}
      <div className="absolute top-4 right-4 flex gap-4 text-sm z-50">
        <a
          href="/about.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-yellow-300"
        >
          About
        </a>
        <a
          href="/defensecj.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-yellow-300"
        >
          Mitigation Guide
        </a>
      </div>

      <div className="flex w-full h-full">
        {/* Left Panel - Iframe Test Area */}
        <div className="w-1/2 p-5 relative">
          <div className="w-full h-full relative">
            <iframe
              ref={testFrameRef}
              className="w-full h-full border-2 border-red-500 rounded-lg opacity-90"
              title="Test Frame"
            />
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-white bg-opacity-50 rounded-lg pointer-events-none z-10" />
          </div>

          <canvas
            ref={testCanvasRef}
            width="5"
            height="5"
            className="absolute top-0 left-0 opacity-0 pointer-events-none"
          />
        </div>

        {/* Right Panel - Controls & Results */}
        <div className="w-1/2 shadow-lg rounded-xl p-5 flex flex-col justify-center items-center relative z-0">
          <img
            src="https://quasarcybertech.com/wp-content/uploads/2024/06/fulllogo_transparent_nobuffer.png"
            alt="Quasar CyberTech Logo"
            className="w-36 mb-3"
          />
          <h1 className="text-2xl font-bold mb-4">Clickjacking Test</h1>

          <div className="flex w-4/5 mb-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL (with https://)"
              className="flex-grow p-2 border border-gray-300 rounded-l-lg text-black"
            />
            <button
              onClick={checkURL}
              className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg"
            >
              Test
            </button>
          </div>

          {testResults.isVisible && (
            <div className="w-4/5 p-4 bg-red-50 rounded-lg mb-4 text-black">
              <p>
                <strong>Site:</strong> {testResults.siteUrl}
              </p>
              <p>
                <strong>Time:</strong> {testResults.testTime}
              </p>
              <p>
                <strong>Missing Security Headers:</strong>
                <span className="text-red-600 font-bold"> {testResults.missingHeaders}</span>
              </p>
            </div>
          )}

          {testResults.isVulnerable !== null && (
            <div
              className={`w-4/5 p-3 text-center font-bold text-white rounded ${
                testResults.isVulnerable ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              Site is {testResults.isVulnerable ? 'vulnerable' : 'not vulnerable'} to Clickjacking
            </div>
          )}

          {error && <p className="text-red-500 mt-4">{error}</p>}

          <p className="mt-6 text-xs text-center">
            Payload developed by Quasar CyberTech Research Team ©<br />
            Made in India with <span className="text-red-600">❤️🇮🇳</span>
          </p>
        </div>
      </div>
    </div>
  );
}
