import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeResult, setIframeResult] = useState(null);
  const iframeRef = useRef(null);

  const validateUrl = (inputUrl) => {
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
      return 'https://' + inputUrl;
    }
    return inputUrl;
  };

  const checkHeaders = async () => {
    setError(null);
    setResult(null);
    setIframeResult(null);
    setIsLoading(true);

    const formattedUrl = validateUrl(url);

    try {
      const res = await fetch('/.netlify/functions/checkHeaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formattedUrl })
      });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setError(data.error || 'Error checking URL');
    } catch (err) {
      setError('Request failed');
    }

    try {
      if (iframeRef.current) {
        iframeRef.current.onload = () => {
          setIframeResult('Iframe loaded — possibly vulnerable');
          setIsLoading(false);
        };
        iframeRef.current.onerror = () => {
          setIframeResult('Iframe blocked — protected');
          setIsLoading(false);
        };
        iframeRef.current.src = formattedUrl;
      }
    } catch (e) {
      setIframeResult('Error loading iframe');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-4">Clickjacking Detector</h1>
      <input
        className="p-2 border rounded w-full max-w-md mb-4"
        type="text"
        placeholder="Enter a website URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={checkHeaders}
      >
        Test
      </button>

      {isLoading && <p className="text-gray-500 mt-4">Loading...</p>}

      {result && (
        <div className="mt-6 p-4 bg-white rounded shadow max-w-xl">
          <h2 className="text-xl font-semibold mb-2">Header Scan Result:</h2>
          <p><strong>Protection:</strong> {result.protection}</p>
          <p><strong>Missing Headers:</strong> {result.missing.join(', ') || 'None'}</p>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(result.headers, null, 2)}
          </pre>
        </div>
      )}

      {iframeResult && (
        <div className="mt-4 p-4 bg-white rounded shadow max-w-xl">
          <h2 className="text-xl font-semibold mb-2">Iframe Test Result:</h2>
          <p>{iframeResult}</p>
        </div>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}

      <div className="mt-6 border-2 border-gray-300 rounded-lg overflow-hidden w-full max-w-xl h-64">
        <iframe ref={iframeRef} title="Test Iframe" className="w-full h-full" sandbox="allow-scripts allow-forms" />
      </div>
    </div>
  );
}
