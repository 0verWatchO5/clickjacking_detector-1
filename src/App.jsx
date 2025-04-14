import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import watermark from "/quasarmain.png";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [ip, setIP] = useState("-");
  const [copied, setCopied] = useState(false);
  const [showPoC, setShowPoC] = useState(false);
  const [loading, setLoading] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [testResults, setTestResults] = useState({
    isVisible: false,
    siteUrl: "-",
    testTime: "-",
    missingHeaders: "-",
    isVulnerable: null,
    reason: "",
    rawHeaders: "",
  });

  const testFrameRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const storedUrl = sessionStorage.getItem("runTestURL");
    const shouldRun = sessionStorage.getItem("shouldRunTest");

    if (shouldRun === "true" && storedUrl) {
      setUrl(storedUrl);
      sessionStorage.setItem("shouldRunTest", "false");
      setTimeout(() => {
        runClickjackingTest(storedUrl);
      }, 1000);
    }
  }, []);

  const startTimer = () => {
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const checkURL = () => {
    sessionStorage.setItem("runTestURL", url);
    sessionStorage.setItem("shouldRunTest", "true");
    window.location.reload();
  };

  const checkMissingSecurityHeaders = (headers) => {
    const xfo = headers["x-frame-options"];
    const csp = headers["content-security-policy"];

    const hasXFO = xfo && /deny|sameorigin/i.test(xfo);
    const hasCSP = csp && /frame-ancestors/i.test(csp);

    const missing = [];
    if (!hasXFO) missing.push("X-Frame-Options");
    if (!hasCSP) missing.push("CSP frame-ancestors");

    return { hasXFO, hasCSP, missing, xfo, csp };
  };

  // NEW: Thorough iframe content check
  const checkIframeThoroughLoad = (targetUrl) => {
    return new Promise((resolve) => {
      const iframe = testFrameRef.current;
      if (!iframe) return resolve({ loaded: false, reason: "Iframe reference not found" });

      setIframeLoading(true);
      const timeout = setTimeout(() => {
        setIframeLoading(false);
        resolve({ loaded: false, reason: "Timeout – iframe didn’t render fully." });
      }, 20000);

      iframe.onload = () => {
        clearTimeout(timeout);
        setTimeout(() => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const html = iframeDoc.documentElement.innerHTML;

            const hasFrameBustingStyle = html.includes("html { display: none;");
            const hasFrameBustingScript = html.includes("top.location") && html.includes("self === top");

            if (hasFrameBustingStyle || hasFrameBustingScript || html.trim().length < 50) {
              setIframeLoading(false);
              return resolve({ loaded: false, reason: "Frame busting or empty content." });
            }

            setIframeLoading(false);
            return resolve({ loaded: true, reason: "Iframe loaded with valid content." });

          } catch (err) {
            setIframeLoading(false);
            return resolve({ loaded: false, reason: "Cross-origin block" });
          }
        }, 15000);
      };

      iframe.onerror = () => {
        clearTimeout(timeout);
        setIframeLoading(false);
        return resolve({ loaded: false, reason: "Iframe error" });
      };

      iframe.src = targetUrl;
    });
  };

  const runClickjackingTest = async (targetUrl) => {
    setError(null);
    setResult(null);
    setCopied(false);
    setLoading(true);
    startTimer();

    setTestResults({
      isVisible: false,
      siteUrl: "-",
      testTime: "-",
      missingHeaders: "-",
      isVulnerable: null,
      reason: "",
      rawHeaders: "",
    });

    try {
      const res = await axios.post("/.netlify/functions/checkHeaders", { url: targetUrl });
      const headers = res.data.headers || {};
      const ipAddr = res.data.ip || "-";
      setIP(ipAddr);

      const analysis = checkMissingSecurityHeaders(headers);

      // MAIN CHANGE: Iframe check after header check
      const iframeResult = await checkIframeThoroughLoad(targetUrl);
      const iframeLoaded = iframeResult.loaded;

      let vulnerable = false;
      let reason = "";

      if (!iframeLoaded) {
        vulnerable = false;
        reason = `Iframe did not load: ${iframeResult.reason}`;
      } else {
        vulnerable = true;
        reason = `Iframe loaded successfully — site is vulnerable.`;
      }

      setTestResults({
        isVisible: true,
        siteUrl: targetUrl,
        testTime: new Date().toUTCString(),
        missingHeaders: analysis.missing.length ? analysis.missing.join(", ") : "None",
        isVulnerable: vulnerable,
        reason,
        rawHeaders: JSON.stringify(headers, null, 2),
      });

      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Request failed");
      setTestResults({
        isVisible: true,
        siteUrl: targetUrl,
        testTime: new Date().toUTCString(),
        missingHeaders: "Error fetching headers",
        isVulnerable: null,
        reason: "Error fetching headers",
        rawHeaders: "",
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

    doc.setFillColor("#4d0c26");
    doc.rect(0, 0, 210, 297, "F");
    const golden = [243, 205, 162];
    doc.setTextColor(...golden);

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text("Confidential", 195, 10, { align: "right" });

    doc.setLineWidth(0.5);
    doc.line(15, 14, 195, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Quasar CyberTech – Clickjacking Report", 15, 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const yStart = 38;
    const lineGap = 10;
    doc.text(`Site Tested: ${testResults.siteUrl}`, 15, yStart);
    doc.text(`IP Address: ${ip}`, 15, yStart + lineGap);
    doc.text(`Test Time: ${testResults.testTime}`, 15, yStart + 2 * lineGap);
    doc.text(`Missing Headers: ${testResults.missingHeaders}`, 15, yStart + 3 * lineGap);
    doc.text(`Vulnerability Status: ${testResults.isVulnerable ? "VULNERABLE" : "Not Vulnerable"}`, 15, yStart + 4 * lineGap);

    const boxY = yStart + 6 * lineGap;
    const guide = [
      "--- Use X-Frame-Options header: DENY or SAMEORIGIN",
      "--- Prefer Content-Security-Policy with frame-ancestors",
      "      'none' to block all, 'self' for same-origin, or specific domains",
      "--- Use both headers for full compatibility",
      "--- Add JS frame-busting fallback: if (self !== top) top.location = self.location;"
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...golden);
    doc.text("Clickjacking Mitigation Guide", 17, boxY);

    doc.setFontSize(11);
    const wrapped = doc.splitTextToSize(guide.join("\n"), 175);
    const h = wrapped.length * 6;
    doc.setDrawColor(...golden);
    doc.setFillColor(92, 30, 52);
    doc.roundedRect(15, boxY + 5, 180, h + 15, 2, 2, "FD");
    doc.text(wrapped, 20, boxY + 15);

    doc.textWithLink("Mitigation Guide", 17, boxY + h + 35, {
      url: "https://quasarclickjack.netlify.app/defensecj.html",
    });

    doc.addImage(img, "PNG", 92.5, 250, 25, 18);
    doc.setFontSize(8);
    doc.text("This is a property of Quasar CyberTech.", 15, 290);
    doc.text("Confidential", 105, 295, { align: "center" });
    doc.save("clickjacking_report.pdf");
  };

  // UI (unchanged — remains clean and branded)
  return (
    <div className="h-screen overflow-hidden bg-[#4d0c26] text-[#f3cda2] font-sans relative flex">
      {/* Top-right nav links */}
      <div className="absolute top-4 right-4 flex gap-4 text-sm z-50">
        <button
          onClick={() => window.open("/about.html", "_blank")}
          className="bg-blue-300 hover:bg-blue-400 text-black px-3 py-1 rounded-md border border-blue-500"
        >
          About
        </button>
        <button
          onClick={() => window.open("/defensecj.html", "_blank")}
          className="bg-blue-300 hover:bg-blue-400 text-black px-3 py-1 rounded-md border border-blue-500"
        >
          Mitigation Guide
        </button>
      </div>

      {/* Left Panel: Iframe */}
      <div className="w-1/2 flex flex-col items-center justify-center p-4">
        <div className="relative border border-red-600 rounded-xl overflow-hidden shadow-xl w-[90%] h-[600px] bg-white">
          <iframe
            ref={testFrameRef}
            className="w-full h-full opacity-40"
            title="Test Frame"
          />
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
              <div className="text-black font-bold animate-pulse">
                Loading site in iframe...
              </div>
            </div>
          )}
          {showPoC && (
            <div
              className="absolute top-1/2 left-1/2 z-20 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded cursor-pointer"
              onClick={() => alert("Fake button clicked (would click iframe content)")}
            >
              Click Me
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="w-1/2 flex flex-col items-center justify-center px-6 overflow-auto max-h-screen">
        <div className="text-center max-w-xl w-full">
          <img
            src="https://quasarcybertech.com/wp-content/uploads/2024/06/fulllogo_transparent_nobuffer.png"
            alt="Logo"
            className="w-36 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold mb-6">Clickjacking Test</h1>

          <div className="flex mb-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL"
              className="flex-grow p-2 rounded-l text-black border"
            />
            <button
              onClick={checkURL}
              className="bg-blue-500 hover:bg-blue-700 text-white px-4 rounded-r"
            >
              Test
            </button>
          </div>

          {loading && (
            <>
              <div className="text-yellow-300 animate-pulse mb-2">Running test...</div>
              <div className="text-yellow-400 text-xs mb-2">
                Elapsed Time: {elapsedTime} second{elapsedTime !== 1 ? "s" : ""}
              </div>
            </>
          )}

          {testResults.isVisible && (
            <>
              <div className="bg-red-100 text-black p-4 rounded text-sm mb-2 text-left">
                <p><strong>Site:</strong> {testResults.siteUrl}</p>
                <p><strong>IP Address:</strong> {ip}</p>
                <p><strong>Time:</strong> {testResults.testTime}</p>
                <p><strong>Missing Headers:</strong>
                  <span className="text-red-600 font-bold"> {testResults.missingHeaders}</span>
                </p>
              </div>

              <div className={`p-3 text-center font-bold text-white rounded mb-2 ${
                testResults.isVulnerable ? "bg-red-600" : "bg-green-600"
              }`}>
                Site is {testResults.isVulnerable ? "vulnerable" : "not vulnerable"} to Clickjacking
              </div>

              <div className="bg-yellow-100 text-black text-sm p-3 rounded mb-2">
                <strong>Reason:</strong> {testResults.reason}
              </div>

              {testResults.rawHeaders && (
                <div className="bg-black text-green-300 text-xs p-3 rounded overflow-auto max-h-40 font-mono mb-2 text-left">
                  <strong className="text-lime-400">Raw Headers:</strong>
                  <pre>{testResults.rawHeaders}</pre>
                </div>
              )}

              <div className="flex justify-between items-center text-xs mt-2">
                <label htmlFor="poc-toggle" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="poc-toggle"
                    type="checkbox"
                    checked={showPoC}
                    onChange={() => setShowPoC(!showPoC)}
                  />
                  <span>Enable PoC</span>
                </label>
                <button
                  onClick={exportPDF}
                  className="bg-yellow-400 hover:bg-yellow-600 text-black px-3 py-1 rounded"
                >
                  Export PDF
                </button>
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
  );
}
