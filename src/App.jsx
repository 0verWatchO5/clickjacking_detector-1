import React, { useState, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import watermark from '/Quasar.png';

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
          } catch {
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
    const doc = new jsPDF();
    const img = new Image();
    img.src = watermark;

    doc.setFillColor('#4d0c26');
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor('#f3cda2');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Clickjacking Test Report', 15, 25);

    doc.setFontSize(12);
    doc.text(`Site: ${testResults.siteUrl}`, 15, 45);
    doc.text(`IP Address: ${ip}`, 15, 55);
    doc.text(`Time: ${testResults.testTime}`, 15, 65);
    doc.text(`Missing Headers: ${testResults.missingHeaders}`, 15, 75);
    doc.text(`Vulnerability: ${testResults.isVulnerable ? 'VULNERABLE' : 'Not Vulnerable'}`, 15, 85);
    doc.text(`Reason: ${testResults.reason}`, 15, 95);

    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(testResults.rawHeaders || '', 180);
    doc.text('Raw Headers:', 15, 110);
    doc.text(lines, 15, 120);

    doc.addImage(img, 'PNG', 150, 10, 45, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a property of Quasar CyberTech.', 15, 285);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIDENTIAL', 105, 293, { align: 'center' });

    doc.save('clickjacking_report.pdf');
  };

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: '#4d0c26',
        color: '#f3cda2'
      }}
    >
      {/* Top-right static links */}
      <div className="absolute top-4 right-4 flex gap-4 text-sm z-50">
        <a href="/about.html" className="hover:underline text-yellow-300">About</a>
        <a href="/defensecj.html" className="hover:underline text-yellow-300">Mitigation Guide</a>
      </div>

      {/* Main layout */}
      <main className="flex-grow flex flex-col md:flex-row p-4 gap-4">
        <div className="w-full md:w-1/2 p-4">
          <iframe
            ref={testFrameRef}
            className="w-full h-full min-h-[400px] border-2 border-red-500 rounded-lg"
            title="Test Frame"
          />
        </div>

        <div className="w-full md:w-1/2 p-6 bg-[#66182f] rounded-lg shadow-xl">
          <div className="flex justify-center mb-4">
            <img
              src="https://quasarcybertech.com/wp-content/uploads/2024/06/fulllogo_transparent_nobuffer.png"
              alt="Quasar CyberTech Logo"
              className="w-36"
            />
          </div>

          <h1 className="text-2xl font-bold mb-4 text-center">Clickjacking Vulnerability Test</h1>

          <div className="flex w-full mb-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL (include https://)"
              className="flex-grow p-2 rounded-l text-black"
            />
            <button onClick={checkURL} className="bg-blue-500 text-white px-4 rounded-r">
              Test
            </button>
          </div>

          {loading && <p className="text-yellow-300 text-center animate-pulse mb-4">Running test...</p>}

          {testResults.isVisible && (
            <div className="bg-black p-4 rounded-lg text-green-300 mb-4 text-xs overflow-auto max-h-40">
              <strong className="text-lime-400 block mb-2">Raw Headers:</strong>
              <pre>{testResults.rawHeaders}</pre>
            </div>
          )}

          {testResults.isVulnerable !== null && (
            <div className={`text-center font-bold py-2 rounded mb-3 ${testResults.isVulnerable ? 'bg-red-600' : 'bg-green-600'}`}>
              Site is {testResults.isVulnerable ? 'VULNERABLE' : 'NOT Vulnerable'}
            </div>
          )}

          <div className="text-xs text-left mb-2">
            <p><strong>IP:</strong> {ip}</p>
            <p><strong>Test Time:</strong> {testResults.testTime}</p>
            <p><strong>Missing Headers:</strong> {testResults.missingHeaders}</p>
            <p><strong>Reason:</strong> {testResults.reason}</p>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPoC}
                onChange={() => setShowPoC(!showPoC)}
              />
              Show PoC Overlay
            </label>

            {testResults.isVisible && (
              <button onClick={exportPDF} className="bg-yellow-400 text-black px-3 py-1 rounded hover:bg-yellow-500">
                Export PDF
              </button>
            )}
          </div>

          {shareURL && (
            <div className="text-xs flex items-center gap-2">
              <span>Share:</span>
              <input
                readOnly
                value={shareURL}
                className="flex-grow p-1 rounded text-black"
              />
              <button onClick={handleCopy} className="text-blue-300 hover:underline">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
      </main>

      {/* Professional Footer */}
      <footer className="w-full mt-10 bg-[#4d0c26] border-t border-[#f3cda2] p-6 text-center text-[#f3cda2] text-sm">
        <div className="max-w-4xl mx-auto">
          <img
            src="https://quasarcybertech.com/wp-content/uploads/2024/06/fulllogo_transparent_nobuffer.png"
            alt="Quasar Logo"
            className="w-24 mx-auto mb-2"
          />
          <p className="font-semibold">© 2024 Quasar CyberTech Pvt Ltd | All Rights Reserved</p>
          <p className="mt-2">This is a property of Quasar CyberTech.</p>
        </div>
      </footer>
    </div>
  );
}
