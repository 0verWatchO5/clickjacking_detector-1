import React, { useState, useRef } from 'react';
import axios from 'axios';

const App = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [rawHeaders, setRawHeaders] = useState(null);
  const iframeRef = useRef(null);

  const handleTest = async () => {
    setResult(null);
    setRawHeaders(null);

    try {
      const response = await axios.post('/.netlify/functions/check-headers', { url });
      const { headers, time } = response.data;
      setRawHeaders(headers);

      const missing = [];
      if (!headers['x-frame-options']) missing.push('X-Frame-Options');
      if (!headers['content-security-policy'] || !headers['content-security-policy'].includes('frame-ancestors')) {
        missing.push('CSP frame-ancestors');
      }

      const checkIframe = () => {
        try {
          const iframe = iframeRef.current;
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

          const bodyText = iframeDoc?.body?.innerText?.trim() || '';
          const bodyImages = iframeDoc?.images?.length || 0;

          const rendersContent =
            bodyText.length > 50 || bodyImages > 0 || iframeDoc.body.querySelectorAll('div, section, article').length > 0;

          const isVulnerable = rendersContent && missing.length > 0;

          setResult({
            site: url,
            time,
            missingHeaders: missing,
            isVulnerable,
          });
        } catch (err) {
          setResult({
            site: url,
            time,
            missingHeaders: missing,
            isVulnerable: false,
          });
        }
      };

      setTimeout(checkIframe, 1500); // Allow iframe to load
    } catch (error) {
      console.error('Error fetching headers:', error);
      setResult({ error: 'Failed to fetch headers. Please try again.' });
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-[#f3cda2] bg-[#4d0c26]">
      <div className="w-1/2 p-4">
        <iframe
          ref={iframeRef}
          src={url}
          title="iframe-test"
          className="w-full h-full rounded-lg bg-gray-100"
        ></iframe>
      </div>
      <div className="w-1/2 p-8">
        <div className="flex justify-between items-center">
          <img src="/logo.png" alt="Logo" className="h-16" />
          <div className="space-x-4 text-yellow-400 font-semibold">
            <a href="/quasar_company_template.html">About</a>
            <a href="/clickjacking_guide.html">Mitigation Guide</a>
          </div>
        </div>
        <h1 className="text-3xl font-bold my-6">Clickjacking Test</h1>
        <div className="flex mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-grow p-2 rounded-l-md text-black"
          />
          <button
            onClick={handleTest}
            className="bg-blue-600 px-4 text-white font-semibold rounded-r-md"
          >
            Test
          </button>
        </div>

        {result && !result.error && (
          <div className="bg-white text-black p-4 rounded mb-4">
            <p><strong>Site:</strong> {result.site}</p>
            <p><strong>Time:</strong> {result.time}</p>
            {result.missingHeaders.length > 0 ? (
              <p><strong>Missing Security Headers:</strong> <span className="text-red-600">{result.missingHeaders.join(', ')}</span></p>
            ) : (
              <p className="text-green-600 font-semibold">No missing security headers.</p>
            )}
          </div>
        )}

        {result?.error && (
          <div className="bg-red-200 text-red-800 p-4 rounded">
            {result.error}
          </div>
        )}

        {result && !result.error && (
          <div className={`p-4 rounded text-center text-white font-bold ${result.isVulnerable ? 'bg-red-600' : 'bg-green-600'}`}>
            {result.isVulnerable
              ? 'Site is vulnerable to Clickjacking'
              : 'Site is not vulnerable to Clickjacking'}
          </div>
        )}

        {rawHeaders && (
          <pre className="bg-black text-green-400 mt-4 p-4 rounded overflow-auto text-sm max-h-64">
            {JSON.stringify(rawHeaders, null, 2)}
          </pre>
        )}

        <div className="mt-6 text-sm text-center opacity-80">
          Payload developed by Quasar CyberTech Research Team ©<br />
          Made in India with ❤️🇮🇳
        </div>
      </div>
    </div>
  );
};

export default App;
