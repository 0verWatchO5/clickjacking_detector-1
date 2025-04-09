import React, { useState, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [ip, setIP] = useState('-');
  const [shareURL, setShareURL] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPoC, setShowPoC] = useState(false);
  const [loading, setLoading] = useState(false);

  const [testResults, setTestResults] = useState({
    isVisible: false,
    siteUrl: '-',
    testTime: '-',
    missingHeaders: '-',
    isVulnerable: null,
    reason: '',
    rawHeaders: ''
  });

  const testFrameRef = useRef(null);

  const checkURL = async () => {
    window.location.reload();
  };

  const runTest = async () => {
    setError(null);
    setResult(null);
    setCopied(false);
    setLoading(true);
    setTestResults({
      isVisible: false,
      siteUrl: '-',
      testTime: '-',
      missingHeaders: '-',
      isVulnerable: null,
      reason: '',
      rawHeaders: ''
    });

    try {
      const res = await axios.post('/.netlify/functions/checkHeaders', { url });
      const headers = res.data.headers || {};
      const ipAddr = res.data.ip || '-';
      setIP(ipAddr);
      setShareURL(`${window.location.origin}/result?url=${encodeURIComponent(url)}`);

      const xfo = headers['x-frame-options'];
      const csp = headers['content-security-policy'];
      const hasXFO = xfo && /deny|sameorigin/i.test(xfo);
      const hasCSP = csp && /frame-ancestors/i.test(csp);

      const missingHeaders = [];
      if (!hasXFO) missingHeaders.push('X-Frame-Options');
      if (!hasCSP) missingHeaders.push('CSP frame-ancestors');

      let iframeCanAccessWindow = false;

      const loadPromise = new Promise((resolve) => {
        const iframe = testFrameRef.current;
        if (!iframe) return resolve();
        iframe.onload = () => {
          try {
            iframeCanAccessWindow = iframe.contentWindow && iframe.contentWindow.length !== undefined;
          } catch (e) {
            iframeCanAccessWindow = false;
          }
          resolve();
        };
        iframe.onerror = () => resolve();
        iframe.src = url;
      });

      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
      await Promise.race([loadPromise, timeoutPromise]);

      const vulnerable = missingHeaders.length > 0 && iframeCanAccessWindow;

      setTestResults({
        isVisible: true,
        siteUrl: url,
        testTime: new Date().toUTCString(),
        missingHeaders: missingHeaders.length > 0 ? missingHeaders.join(', ') : 'None - Site is protected',
        isVulnerable: vulnerable,
        reason: vulnerable
          ? 'Page is embeddable and missing required security headers'
          : missingHeaders.length > 0
            ? 'Page rendered but has necessary headers'
            : 'Page refused to render in iframe (likely protected by headers or other mechanisms)',
        rawHeaders: JSON.stringify(headers, null, 2)
      });

      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
      setTestResults({
        isVisible: true,
        siteUrl: url,
        testTime: new Date().toUTCString(),
        missingHeaders: 'Error fetching headers',
        isVulnerable: null,
        reason: 'Error fetching headers',
        rawHeaders: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
      putOnlyUsedFonts: true,
    });

    doc.setFillColor('#4d0c26');
    doc.rect(0, 0, 600, 842, 'F');

    doc.setTextColor('#f3cda2');
    doc.setFontSize(18);
    doc.text('Clickjacking Test Result', 40, 60);

    doc.setFontSize(12);
    doc.text(`Site: ${testResults.siteUrl}`, 40, 100);
    doc.text(`IP Address: ${ip}`, 40, 130);
    doc.text(`Time: ${testResults.testTime}`, 40, 160);
    doc.text(`Missing Headers: ${testResults.missingHeaders}`, 40, 190);
    doc.text(`Vulnerability: ${testResults.isVulnerable ? 'Vulnerable' : 'Not Vulnerable'}`, 40, 220);
    doc.text(`Reason: ${testResults.reason}`, 40, 250);

    doc.setFontSize(10);
    doc.text('Raw Headers:', 40, 290);
    doc.setFont('Courier', 'normal');
    doc.text(doc.splitTextToSize(testResults.rawHeaders, 500), 40, 310);

    doc.addImage('/Quasar.png', 'PNG', 400, 700, 120, 120); // Watermark

    doc.save('Clickjacking_Report.pdf');
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
      <div className="absolute top-4 right-4 flex gap-4 text-sm z-50">
        <a href="/about.html" target="_blank" rel="noopener noreferrer" className="hover:underline text-yellow-300">About</a>
        <a href="/defensecj.html" target="_blank" rel="noopener noreferrer" className="hover:underline text-yellow-300">Mitigation Guide</a>
      </div>

      <div className="flex w-full h-full">
        <div className="w-1/2 p-5 relative">
          <iframe
            ref={testFrameRef}
            className="w-full h-full border-2 border-red-500 rounded-lg opacity-90"
            title="Test Frame"
          />
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-white bg-opacity-50 rounded-lg pointer-events-none z-10" />
          {showPoC && (
            <div
              className="absolute top-1/2 left-1/2 z-20 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded opacity-90 cursor-pointer"
              onClick={() => alert('Fake button clicked (would click iframe content)')}
            >
              Click Me
            </div>
          )}
        </div>

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

          {loading && <div className="mb-4 animate-pulse text-yellow-300">Testing in progress...</div>}

          {testResults.isVisible && (
            <div className="w-4/5 p-4 bg-red-50 rounded-lg mb-4 text-black">
              <p><strong>Site:</strong> {testResults.siteUrl}</p>
              <p><strong>IP Address:</strong> {ip}</p>
              <p><strong>Time:</strong> {testResults.testTime}</p>
              <p><strong>Missing Security Headers:</strong>
                <span className="text-red-600 font-bold"> {testResults.missingHeaders}</span>
              </p>
            </div>
          )}

          {testResults.isVulnerable !== null && (
            <div
              className={`w-4/5 p-3 text-center font-bold text-white rounded ${testResults.isVulnerable ? 'bg-red-600' : 'bg-green-600'}`}
            >
              Site is {testResults.isVulnerable ? 'vulnerable' : 'not vulnerable'} to Clickjacking
            </div>
          )}

          {testResults.rawHeaders && (
            <div className="w-4/5 bg-black text-green-300 text-xs p-3 rounded overflow-auto max-h-60 mt-4 font-mono">
              <strong className="text-lime-400">Raw Response Headers:</strong>
              <pre>{testResults.rawHeaders}</pre>
            </div>
          )}

          {shareURL && (
            <div className="w-4/5 mt-4 flex items-center justify-center text-xs gap-2">
              <span>Share result via:</span>
              <input
                type="text"
                readOnly
                value={shareURL}
                className="text-black px-2 py-1 rounded border border-gray-300 flex-grow"
              />
              <button onClick={handleCopy} className="text-blue-300 hover:underline">{copied ? 'Copied!' : 'COPY'}</button>
            </div>
          )}

          <div className="w-4/5 mt-4 flex items-center justify-start gap-3 text-xs">
            <label htmlFor="poc-toggle" className="flex items-center gap-2 cursor-pointer">
              <input
                id="poc-toggle"
                type="checkbox"
                checked={showPoC}
                onChange={() => setShowPoC(!showPoC)}
              />
              <span>Click to show object on iframe to capture PoC</span>
            </label>
          </div>

          <button
            onClick={exportPDF}
            className="mt-4 bg-yellow-400 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded"
          >
            Export PDF
          </button>

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
