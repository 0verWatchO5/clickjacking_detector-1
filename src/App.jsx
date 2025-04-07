import React, { useState, useRef } from 'react';

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const iframeRef = useRef(null);

  const log = (msg) => setDebugInfo(prev => [...prev, msg]);

  const validateUrl = (input) => {
    if (!input.startsWith('http')) {
      return 'https://' + input;
    }
    return input;
  };

  const checkURL = async () => {
    setError(null);
    setResult(null);
    setIsLoading(true);
    setDebugInfo([]);

    const formattedUrl = validateUrl(url);
    log('Checking: ' + formattedUrl);

    try {
      const res = await fetch('/.netlify/functions/checkHeaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formattedUrl })
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          ...data,
          url: formattedUrl,
          time: new Date().toUTCString()
        });
        log('Response received.');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError('Request failed: ' + err.message);
      log('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }

    if (iframeRef.current) {
      iframeRef.current.src = formattedUrl;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">
      {/* Left Panel - Iframe */}
      <div className="w-1/2 p-5 relative">
        {isLoading && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-blue-500">
            Checking...
          </div>
        )}
        <iframe
          ref={iframeRef}
          title="Test Frame"
          className="w-full h-full border-2 border-red-400 rounded-lg opacity-90"
        />
        <div className="absolute top-5 left-5 w-[calc(100%-40px)] h-[calc(100%-40px)] bg-white bg-opacity-50 rounded-lg pointer-events-none"></div>
      </div>

      {/* Right Panel - Input & Results */}
      <div className="w-1/2 bg-white shadow-xl rounded-xl p-6 flex flex-col justify-start items-center overflow-y-auto">
        <img
          src="https://quasarcybertech.com/wp-content/uploads/2024/06/fulllogo_transparent_nobuffer.png"
          alt="Quasar CyberTech Logo"
          className="w-36 mb-4"
        />
        <h1 className="text-2xl font-bold mb-4">Clickjacking Test</h1>

        <div className="flex w-4/5 mb-4">
          <input
            className="flex-grow p-2 border border-gray-300 rounded-l-lg"
            type="text"
            placeholder="Enter website URL (e.g., https://example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            onClick={checkURL}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg"
          >
            Test
          </button>
        </div>

        {result && (
          <div className="w-4/5 p-4 bg-red-50 rounded-lg mb-4 text-sm">
            <p><strong>Site:</strong> {result.url}</p>
            <p><strong>Time:</strong> {result.time}</p>
            <p>
              <strong>Missing Headers:</strong>{' '}
              <span className="text-red-600 font-bold">
                {result.protection || 'None'}
              </span>
            </p>
          </div>
        )}

        {result && (
          <div
            className={`w-4/5 p-3 text-center font-bold text-white rounded ${
              result.protection === 'None' ? 'bg-red-600' : 'bg-green-600'
            }`}
          >
            Site is {result.protection === 'None' ? 'vulnerable' : 'not vulnerable'} to Clickjacking
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm mt-2">{error}</div>
        )}

        <button
          onClick={() => setShowDebug(!showDebug)}
          className="mt-4 text-xs text-gray-500 underline"
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </button>

        {showDebug && (
          <div className="w-4/5 p-3 mt-2 bg-gray-100 rounded-lg text-xs text-gray-700 max-h-32 overflow-y-auto">
            {debugInfo.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-gray-500 text-center">
          Payload developed by Quasar CyberTech Security Team ©<br />
          Made in India with <span className="text-red-600">❤️</span>
        </p>
      </div>
    </div>
  );
}
