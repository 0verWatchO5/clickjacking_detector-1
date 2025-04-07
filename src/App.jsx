import React from 'react';
import { useState } from 'react'

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const checkURL = async () => {
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/.netlify/functions/checkHeaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error || 'Error checking URL')
    } catch (err) {
      setError('Request failed')
    }
  }

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
        onClick={checkURL}
      >
        Check
      </button>

      {result && (
        <div className="mt-6 p-4 bg-white rounded shadow max-w-xl">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <p><strong>Protection:</strong> {result.protection || "None"}</p>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify(result.headers, null, 2)}
          </pre>
        </div>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  )
}
