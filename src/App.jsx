import React, { useState, useRef, useEffect } from 'react';
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
  const [elapsedTime, setElapsedTime] = useState(0);

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
  const timerRef = useRef(null);

  useEffect(() => {
    const storedUrl = sessionStorage.getItem('runTestURL');
    const shouldRun = sessionStorage.getItem('shouldRunTest');

    if (shouldRun === 'true' && storedUrl) {
      setUrl(storedUrl);
      sessionStorage.setItem('shouldRunTest', 'false');
      setTimeout(() => {
        runClickjackingTest(storedUrl);
      }, 1000);
    }
  }, []);

  const startTimer = () => {
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const checkURL = () => {
    sessionStorage.setItem('runTestURL', url);
    sessionStorage.setItem('shouldRunTest', 'true');
    window.location.reload();
  };

  const runClickjackingTest = async (targetUrl) => {
    setError(null);
    setResult(null);
    setCopied(false);
    setLoading(true);
    startTimer();

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
      const res = await axios.post('/.netlify/functions/checkHeaders', { url: targetUrl });
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

      let iframeLoaded = false;

      const loadPromise = new Promise((resolve) => {
        const iframe = testFrameRef.current;
        if (!iframe) return resolve();

        iframe.onload = () => {
          iframeLoaded = true;
          resolve();
        };

        iframe.onerror = () => resolve();
        iframe.src = targetUrl;
      });

      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 10000));
      await Promise.race([loadPromise, timeoutPromise]);

      if (iframeLoaded) await new Promise(res => setTimeout(res, 1000));

      let vulnerable = false;
      let reason = '';

      if (!iframeLoaded) {
        vulnerable = false;
        reason = missingHeaders.length
          ? 'Page refused to render in iframe, even though headers are missing. Possibly protected by other mechanisms.'
          : 'Page refused to render in iframe, protected.';
      } else {
        if (!hasXFO) {
          vulnerable = true;
          reason = 'Page loaded in iframe and missing X-Frame-Options header. Vulnerable to clickjacking.';
        } else if (!hasCSP) {
          vulnerable = false;
          reason = 'Page loaded in iframe but has X-Frame-Options. Missing CSP frame-ancestors.';
        } else {
          vulnerable = false;
          reason = 'Page loaded in iframe but has both headers. Should be safe.';
        }
      }

      setTestResults({
        isVisible: true,
        siteUrl: targetUrl,
        testTime: new Date().toUTCString(),
        missingHeaders: missingHeaders.length ? missingHeaders.join(', ') : 'None - Site is protected',
        isVulnerable: vulnerable,
        reason,
        rawHeaders: JSON.stringify(headers, null, 2)
      });

      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
      setTestResults({
        isVisible: true,
        siteUrl: targetUrl,
        testTime: new Date().toUTCString(),
        missingHeaders: 'Error fetching headers',
        isVulnerable: null,
        reason: 'Error fetching headers',
        rawHeaders: ''
      });
    } finally {
      stopTimer();
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const img = new Image();
    img.src = watermark;

    doc.setFillColor('#4d0c26');
    doc.rect(0, 0, 210, 297, 'F');

    const goldenRGB = [243, 205, 162];
    doc.setTextColor(...goldenRGB);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Confidential', 195, 10, { align: 'right' });

    doc.setFontSize(22);
    doc.text('Quasar CyberTech – Clickjacking Report', 15, 21);

    doc.setFontSize(12);
    doc.text(`Site Tested: ${testResults.siteUrl}`, 15, 35);
    doc.text(`IP Address: ${ip}`, 15, 45);
    doc.text(`Test Time: ${testResults.testTime}`, 15, 55);
    doc.text(`Missing Headers: ${testResults.missingHeaders}`, 15, 65);
    doc.text('Vulnerability Status: ' + (testResults.isVulnerable ? 'VULNERABLE' : 'Not Vulnerable'), 15, 75);

    // Header: Confidential + Title with golden line
    doc.setTextColor(...goldenRGB);
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text('Confidential', 195, 10, { align: 'right' });

    // Golden horizontal line between "Confidential" and title
    doc.setDrawColor(...goldenRGB);
    doc.setLineWidth(0.5); // thin golden line
    doc.line(15, 14, 195, 14); // full-width line just below "Confidential"

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Quasar CyberTech – Clickjacking Report', 15, 22); // spaced below the line

    // changes by w0lf start
    const rawHeadersStartY = 85;
    const headerBoxWidth = 180;
    const headerBoxX = 15;
    const headerBoxY = rawHeadersStartY + 5;
    const borderRadius = 3; // subtle rounding

    // Split the text first to determine height
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    const headerLines = doc.splitTextToSize(testResults.rawHeaders || '', headerBoxWidth - 8);
    const lineHeight = 4.5; // fine-tuned for 10pt monospace
    const headerBoxHeight = headerLines.length * lineHeight + 8; // +8 for padding

    // Draw the box
    doc.setFillColor(109, 28, 49); // light maroon (adjusted)
    doc.setDrawColor(...goldenRGB); // golden border
    doc.roundedRect(headerBoxX, headerBoxY, headerBoxWidth, headerBoxHeight, borderRadius, borderRadius, 'FD');

    // Draw title
    doc.setTextColor(...goldenRGB);
    doc.setFont('courier', 'bold');
    doc.setFontSize(12);
    doc.text('Raw Headers:', 15, rawHeadersStartY);

    // Draw header content
    doc.setTextColor(...goldenRGB);
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.text(headerLines, headerBoxX + 4, headerBoxY + 6); // vertical padding inside box
    // changes by w0lf end

    const watermarkWidth = 25;
    const watermarkHeight = 18;
    const centerX = (210 - watermarkWidth) / 2;
    const bottomY = 250;
    doc.addImage(img, 'PNG', centerX, bottomY, watermarkWidth, watermarkHeight);

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...goldenRGB);
    const disclaimer = `This report and the information contained herein are the proprietary property of Quasar CyberTech and are intended solely for the internal use of the designated client. This document may contain confidential or sensitive information and is shared with the client for review and informational purposes only. It may not be reproduced, distributed, or disclosed to any third party, in whole or in part, without the prior written consent of Quasar CyberTech. All rights reserved © ${new Date().getFullYear()}.`;
    const disclaimerLines = doc.splitTextToSize(disclaimer, 180);
    doc.text(disclaimerLines, 15, 295 - disclaimerLines.length * 4);

    doc.save('clickjacking_report.pdf');
  };
  
  return (
    <div className="h-screen overflow-hidden bg-[#4d0c26] text-[#f3cda2] font-sans relative">
      <div className="absolute top-4 right-4 flex gap-4 text-sm z-50">
        <a href="/about.html" target="_blank" rel="noopener noreferrer" className="hover:underline text-yellow-300">About</a>
        <a href="/defensecj.html" target="_blank" rel="noopener noreferrer" className="hover:underline text-yellow-300">Mitigation Guide</a>
      </div>

      <div className="flex h-full">
        <div className="w-1/2 flex items-center justify-center p-4">
          <div className="relative border border-red-600 rounded-xl overflow-hidden shadow-xl w-full h-[90%] bg-white">
            <iframe ref={testFrameRef} className="w-full h-full opacity-40" title="Test Frame" />
            {showPoC && (
              <div className="absolute top-1/2 left-1/2 z-20 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded cursor-pointer" onClick={() => alert('Fake button clicked (would click iframe content)')}>
                Click Me
              </div>
            )}
          </div>
        </div>

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
            {loading && <div className="text-yellow-400 text-xs mb-2">Elapsed Time: {elapsedTime} second{elapsedTime !== 1 ? 's' : ''}</div>}

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
              Payload developed by Quasar CyberTech Research Team ©<br />
              Made in India with <span className="text-red-500">❤️</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
