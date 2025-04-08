import React, { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const checkURL = async () => {
    setError(null);
    setResult(null);
    try {
      const res = await axios.post('/.netlify/functions/checkHeaders', { url });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
      backgroundColor: '#4d0c26', 
      color: '#f3cda2' 
    }}>
      {/* Top-right links */}
      <div className="absolute top-4 right-4 flex gap-4 text-sm">
        <a href="/Quasar%20Company%20Template.html" target="_blank" rel="noopener noreferrer" className="hover:underline text-yellow-300">
          Company Template
        </a>
        <a href="/clickjacking_mitigation_Guide.html" target="_blank" rel="noopener noreferrer" className="hover:underline text-yellow-300">
          Mitigation Guide
        </a>
      </div>

      <h1 className="text-4xl font-bold mb-6">Clickjacking Detector</h1>

      <input
        className="p-3 border rounded w-full max-w-md mb-4 text-black"
        type="text"
        placeholder="Enter a website URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button
        className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-2 rounded"
        onClick={checkURL}
      >
        Check
      </button>

      {result && (
        <div className="mt-6 p-4 bg-[#5d1c30] border border-yellow-300 rounded shadow max-w-xl">
          <h2 className="text-2xl font-semibold mb-2">Result</h2>
          <p><strong>Protection:</strong> {result.protection || 'None'}</p>
          <pre className="mt-2 text-sm bg-[#6d2c40] p-2 rounded overflow-x-auto">
            {JSON.stringify(result.headers, null, 2)}
          </pre>
        </div>
      )}

      {error && <p className="text-red-400 mt-4">{error}</p>}
    </div>
  );
}
