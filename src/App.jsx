import React, { useState, useRef, useEffect } from 'react';
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
      setResult(res.data);
      const protection = res.data.protection || "None";
      const isVulnerable = protection === "None";

      setTestResults({
        isVisible: true,
        siteUrl: url,
        testTime: new Date().toUTCString(),
        missingHeaders: isVulnerable ? 'X-Frame-Options, CSP frame-ancestors' : 'None - Site is protected',
        isVulnerable: isVulnerable,
        reason: protection === "None" ? "Missing clickjacking headers" : "Proper headers detected"
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
      backgroundColor: '#4d0c26', 
      color: '#f3cda2'
    }}>
      <div className="absolute top-4 right-4 flex gap-4 text-sm">
        <a href="/Quasar_Company_Template.html" target="_blank" rel="noopener noreferrer">
          Company Template
        </a>
        <a href="/clickjacking_mitigation_Guide.html" target="_blank" rel="noopener noreferrer">
          Mitigation Guide
        </a>
      </div>

      <div className="flex w-full h-full">
        {/* Left Panel - Iframe Test Area */}
        <div className="w-1/2 p-5 relative">
          <iframe 
            ref={testFrameRef}
            className="w-full h-full border-2 border-red-500 rounded-lg opacity-90"
            title="Test Frame"
          />
          <div className="absolute top-5 left-5 w-[calc(100%-40px)] h-[calc(100%-40px)] bg-white bg-opacity-50 rounded-lg pointer-events-none"></div>
          <canvas 
            ref={testCanvasRef}
            width="5"
            height="5"
            className="absolute top-0 left-0 opacity-0 pointer-events-none"
          />
        </div>

        {/* Right Panel - Controls & Results */}
        <div className="w-1/2 shadow-lg rounded-xl p-5 flex flex-col justify-center items-center relative">
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
              className="flex-grow p-2 border border-gray-300 rounded-l-lg"
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
              <p><strong>Site:</strong> {testResults.siteUrl}</p>
              <p><strong>Time:</strong> {testResults.testTime}</p>
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
            Payload developed by Quasar CyberTech Research Team ©<br/>
            Made in India with <span className="text-red-600">❤️🇮🇳</span>
          </p>
        </div>
      </div>
    </div>
  );
}
