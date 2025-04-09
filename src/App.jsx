import React, { useState, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import watermark from '/quasarmain.png';
import './App.css';

export default function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [ip, setIP] = useState('-');
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

  const exportPDF = async () => {
    const doc = new jsPDF();
    const img = new Image();
    img.src = watermark;

    doc.setFillColor('#4d0c26');
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor('#f3cda2');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Quasar CyberTech – Clickjacking Report', 15, 20);

    doc.setFontSize(12);
    doc.text(`Site Tested: ${testResults.siteUrl}`, 15, 35);
    doc.text(`IP Address: ${ip}`, 15, 45);
    doc.text(`Test Time: ${testResults.testTime}`, 15, 55);
    doc.text(`Missing Headers: ${testResults.missingHeaders}`, 15, 65);
    doc.text('Vulnerability Status: ' + (testResults.isVulnerable ? 'VULNERABLE' : 'Not Vulnerable'), 15, 75);
    doc.text('Reason:', 15, 85);

    doc.setFont('courier', 'normal');
    const reasonLines = doc.splitTextToSize(testResults.reason, 180);
    doc.text(reasonLines, 15, 93);

    doc.setFont('courier', 'normal');
    const lines = doc.splitTextToSize(testResults.rawHeaders || '', 180);
    doc.text('Raw Headers:', 15, 110 + reasonLines.length * 7);
    doc.text(lines, 15, 118 + reasonLines.length * 7);

    doc.addImage(img, 'PNG', 75, 250, 60, 30);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('This is a property of Quasar CyberTech', 15, 290);
    doc.text('Confidential', 105, 295, null, null, 'center');

    doc.save('clickjacking_report.pdf');
  };

  return (
    <div className="h-screen overflow-hidden bg-[#4d0c26] text-[#f3cda2] font-sans relative">
      {/* Header Links */}
      <div className="absolute top-4 right-4 flex gap-4 text-sm z-50">
        <a href="/about.html" target="_blank" rel="noopener noreferrer" className="hover:underline text-yellow-300">About</a>
        <a href="/defensecj.html" target="_blank" rel="noopener noreferrer" className="hover:underline text-yellow-300">Mitigation Guide</a>
      </div>
  
      {/* Centered Layout */}
      <div className="flex h-full">
        {/* Left Panel - Iframe */}
        <div className="w-1/2 flex items-center justify-center p-4">
          <div className="relative border border-red-600 rounded-xl overflow-hidden shadow-xl w-full h-[90%] bg-white">
            <iframe ref={testFrameRef} className="w-full h-full opacity-90" title="Test Frame" />
            {showPoC && (
              <div className="absolute top-1/2 left-1/2 z-20 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded cursor-pointer" onClick={() => alert('Fake button clicked (would click iframe content)')}>
                Click Me
              </div>
            )}
          </div>
        </div>
  
        {/* Right Panel - Form & Results */}
        <div className="w-1/2 flex flex-col items-center justify-center px-6 overflow-hidden">
          <div className="text-center max-w-xl w-full">
            <img src="https://quasarcybertech.com/wp-content/uploads/2024/06/fulllogo_transparent_nobuffer.png" alt="Logo" className="w-36 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-6">Clickjacking Test</h1>
  
            <div className="flex mb-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL"
                className="flex-grow p-2 rounded-l text-black border"
              />
              <button onClick={checkURL} className="bg-blue-500 hover:bg-blue-700 text-white px-4 rounded-r">Test</button>
            </div>
  
            {loading && <div className="text-yellow-300 animate-pulse mb-2">Running test...</div>}
  
            {testResults.isVisible && (
              <>
                <div className="bg-red-100 text-black p-4 rounded text-sm mb-2 text-left">
                  <p><strong>Site:</strong> {testResults.siteUrl}</p>
                  <p><strong>IP Address:</strong> {ip}</p>
                  <p><strong>Time:</strong> {testResults.testTime}</p>
                  <p><strong>Missing Headers:</strong> <span className="text-red-600 font-bold">{testResults.missingHeaders}</span></p>
                </div>
  
                <div className={`p-3 text-center font-bold text-white rounded mb-2 ${testResults.isVulnerable ? 'bg-red-600' : 'bg-green-600'}`}>
                  Site is {testResults.isVulnerable ? 'vulnerable' : 'not vulnerable'} to Clickjacking
                </div>
  
                {testResults.rawHeaders && (
                  <div className="bg-black text-green-300 text-xs p-3 rounded overflow-auto max-h-40 font-mono mb-2 text-left">
                    <strong className="text-lime-400">Raw Headers:</strong>
                    <pre>{testResults.rawHeaders}</pre>
                  </div>
                )}
  
                <div className="flex justify-between items-center text-xs mt-2">
                  <label htmlFor="poc-toggle" className="flex items-center gap-2 cursor-pointer">
                    <input id="poc-toggle" type="checkbox" checked={showPoC} onChange={() => setShowPoC(!showPoC)} />
                    <span>Enable PoC</span>
                  </label>
                  <button onClick={exportPDF} className="bg-yellow-400 hover:bg-yellow-600 text-black px-3 py-1 rounded">Export PDF</button>
                </div>
              </>
            )}
  
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
  
            <p className="text-xs mt-6">
              Payload developed by Quasar CyberTech Security Team ©<br />
              Made in India with <span className="text-red-500">❤️</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}  
