import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import watermark from "/quasarmain.png";
import "./App.css";

function App() {
  const [url, setUrl] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [rawHeaders, setRawHeaders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(null);
  const iframeRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && testResult !== null) {
      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        const iframe = iframeRef.current;
        try {
          // Try to access iframe content
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          if (doc && doc.body && doc.body.innerHTML.length > 0) {
            setIframeBlocked(false); // iframe loaded content successfully
          } else {
            setIframeBlocked(true);
          }
        } catch (e) {
          setIframeBlocked(true); // cross-origin access denied
        }
      }, 3000);
    }
  }, [testResult]);

  const runTest = async () => {
    setLoading(true);
    setTestResult(null);
    setIframeBlocked(null);
    try {
      const response = await axios.post("/.netlify/functions/fetchHeaders", {
        url,
      });

      const headers = response.data.headers;
      setRawHeaders(headers);

      const missingHeaders = [];
      const xFrameOptions = headers["x-frame-options"];
      const csp = headers["content-security-policy"];

      if (!xFrameOptions) missingHeaders.push("X-Frame-Options");
      if (!csp || !/frame-ancestors/.test(csp)) missingHeaders.push("CSP frame-ancestors");

      setTestResult({ missingHeaders, success: true });
    } catch (error) {
      setTestResult({ error: "Failed to fetch headers", success: false });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.addImage(watermark, "PNG", 140, 5, 60, 30);
    doc.text("Clickjacking Test Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Site: ${url}`, 20, 40);

    if (testResult?.success) {
      doc.text("Missing Headers:", 20, 50);
      if (testResult.missingHeaders.length > 0) {
        testResult.missingHeaders.forEach((header, i) => {
          doc.text(`- ${header}`, 30, 60 + i * 10);
        });
      } else {
        doc.text("- None", 30, 60);
      }
    }

    doc.text("Raw Headers:", 20, 80);
    const headersText = JSON.stringify(rawHeaders, null, 2);
    const lines = doc.splitTextToSize(headersText, 170);
    doc.text(lines, 20, 90);

    doc.save("clickjacking_test_report.pdf");
  };

  return (
    <div className="App">
      <h1>Clickjacking Test</h1>
      <input
        type="text"
        placeholder="Enter URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button onClick={runTest} disabled={loading}>
        {loading ? "Testing..." : "Test"}
      </button>

      {testResult && (
        <>
          <div className="result">
            <h2>Site: {url}</h2>
            {testResult.success ? (
              <>
                {iframeBlocked === false ? (
                  <div className="vulnerable">⚠️ Site is vulnerable to Clickjacking</div>
                ) : (
                  <div className="not-vulnerable">✅ Site is not vulnerable to Clickjacking</div>
                )}

                {testResult.missingHeaders.length > 0 && iframeBlocked === false && (
                  <div className="reason">
                    Missing Headers: {testResult.missingHeaders.join(", ")}
                  </div>
                )}
              </>
            ) : (
              <div className="error">{testResult.error}</div>
            )}
          </div>
        </>
      )}

      {url && (
        <iframe
          ref={iframeRef}
          src={url}
          style={{ width: "400px", height: "300px", border: "1px solid #ccc", marginTop: "20px" }}
          sandbox=""
        />
      )}

      {testResult && (
        <button className="export-btn" onClick={generatePDF}>
          Export PDF
        </button>
      )}
    </div>
  );
}

export default App;
