import React, { useState, useRef, useEffect } from 'react';

function ClickjackingTest() {
  const [url, setUrl] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const testFrameRef = useRef(null);

  const checkHeaders = async () => {
    setIsLoading(true);
    setError(null);
    setTestResults(null);
    try {
      const res = await fetch('/.netlify/functions/checkHeaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (res.ok) {
        setTestResults(data);
      } else {
        setError(data.error || 'Error checking URL');
      }
    } catch (err) {
      setError('Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100 transition-colors duration-300 ease-in-out">
      <div className="flex w-full h-full">
        {/* Left Panel - Iframe Test Area */}
        <div className="w-1/2 p-5 relative">
          {isLoading && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-blue-500">
              Loading...
            </div>
          )}
          <iframe 
            ref={testFrameRef}
            className="w-full h-full border-2 border-red-500 rounded-lg opacity-90"
            title="Test Frame"
            src={url || 'about:blank'}
          />
          <div className="absolute top-5 left-5 w-[calc(100%-40px)] h-[calc(100%-40px)] bg-white bg-opacity-50 rounded-lg pointer-events-none"></div>
        </div>

        {/* Right Panel - Controls & Results */}
        <div className="w-1/2 bg-white shadow-lg rounded-xl p-5 flex flex-col justify-center items-center relative">
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
              onClick={checkHeaders}
              className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg"
            >
              Test
            </button>
          </div>

          {testResults && (
            <div className="w-4/5 p-4 bg-red-50 rounded-lg mb-4 text-left">
              <p><strong>Site:</strong> {testResults.url}</p>
              <p><strong>Protection:</strong> {testResults.protection}</p>
              <p><strong>Missing Headers:</strong> <span className="text-red-600 font-bold">{testResults.missingHeaders?.join(', ') || 'None'}</span></p>
              <pre className="mt-2 text-sm bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
                {JSON.stringify(testResults.headers, null, 2)}
              </pre>
            </div>
          )}

          {error && <p className="text-red-500 mt-4">{error}</p>}

          <p className="mt-6 text-xs text-gray-500 text-center">
            Payload developed by Quasar CyberTech Security Team ©<br/>
            Made in India with <span className="text-red-600">❤️</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ClickjackingTest;
