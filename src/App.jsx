import React, { useState } from 'react';

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const checkURL = async () => {
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/.netlify/functions/checkHeaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setError(data.error || 'Error checking URL');
    } catch (err) {
      setError('Request failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-blue-700 mb-6">Clickjacking Detector</h1>

        <input
          className="p-2 border rounded w-full mb-4"
          type="text"
          placeholder="Enter a website URL (e.g., https://example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          onClick={checkURL}
        >
          Check
        </button>

        {result && (
          <div className="mt-6 text-left">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Result:</h2>
            <p><strong>URL:</strong> {result.url}</p>
            <p><strong>Protection:</strong> {result.protection}</p>
            <p className="mt-2"><strong>Missing Headers:</strong> {result.missingHeaders?.join(', ') || 'None'}</p>
            <pre className="mt-2 text-sm bg-gray-100 p-3 rounded overflow-x-auto">
              {JSON.stringify(result.headers, null, 2)}
            </pre>
          </div>
        )}

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
}
