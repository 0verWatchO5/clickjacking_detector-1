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

  // ---------------- Helper: Check Headers ----------------
  const checkMissingSecurityHeaders = (headers) => {
    const xfo = headers["x-frame-options"];
    const csp = headers["content-security-policy"];

    const hasXFO = xfo && /deny|sameorigin/i.test(xfo);
    const hasCSP = csp && /frame-ancestors/i.test(csp);

    const missing = [];
    if (!hasXFO) missing.push("X-Frame-Options");
    if (!hasCSP) missing.push("CSP frame-ancestors");

    return {
      hasXFO,
      hasCSP,
      missing,
    };
  };

  // ---------------- Helper: iFrame Load Test ----------------
  const checkIframeBehavior = async (targetUrl) => {
    return new Promise((resolve) => {
      let iframeLoaded = false;

      const iframe = testFrameRef.current;
      if (!iframe) return resolve(false);

      setIframeLoading(true);

      const timeout = setTimeout(() => {
        setIframeLoading(false);
        resolve(false);
      }, 20000);

      iframe.onload = () => {
        clearTimeout(timeout);
        setIframeLoading(false);
        iframeLoaded = true;
        resolve(true);
      };

      iframe.onerror = () => {
        clearTimeout(timeout);
        setIframeLoading(false);
        resolve(false);
      };

      iframe.src = targetUrl;
    });
  };

  // ---------------- Placeholder: JS Frame Busting Detection ----------------
  const checkJavaScriptFrameBusting = () => {
    // Can't detect from outside domain due to cross-origin restrictions
    return {
      detected: false,
      reason: "Unable to detect JS-based frame busting from a different origin.",
    };
  };

  // ---------------- Main Test Function ----------------
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
      fullResponse: "",
    });
  
    try {
      const res = await axios.post("/.netlify/functions/checkHeaders", {
        url: targetUrl,
      });
  
      const headers = res.data.headers || {};
      const ipAddr = res.data.ip || "-";
      setIP(ipAddr);
  
      const headerAnalysis = checkMissingSecurityHeaders(headers);
      const iframeLoaded = await checkIframeBehavior(targetUrl);
      const jsBusting = checkJavaScriptFrameBusting();
  
      let vulnerable = false;
      let reason = "";

      if (!iframeLoaded) {
        if (!headerAnalysis.hasXFO && !headerAnalysis.hasCSP) {
          vulnerable = true;
          reason =
            "Page could not be rendered in an iframe and missing both X-Frame-Options and CSP headers. Vulnerable to clickjacking.";
        } else if (
          headerAnalysis.frameAncestors &&
          !headerAnalysis.allowsOurOrigin
        ) {
          vulnerable = false;
          reason = "Page loaded in iframe but X-Frame-Options is present. Missing CSP frame-ancestors.";
        } else {
          vulnerable = false;
          reason = "Page loaded in iframe and has both XFO and CSP headers. Should be protected.";
        }
      } else {
        if (!headerAnalysis.hasXFO) {
          vulnerable = true;
          reason =
            "Page loaded in iframe and missing X-Frame-Options header. Vulnerable to clickjacking.";
        } else if (!headerAnalysis.hasCSP) {
          vulnerable = false;
          reason =
            "Page loaded in iframe but X-Frame-Options is present. Missing CSP frame-ancestors.";
        } else {
          vulnerable = false;
          reason =
            "Page loaded in iframe but has both XFO and CSP headers. Should be protected.";
        }
      }
      
      

      setTestResults({
        isVisible: true,
        siteUrl: targetUrl,
        testTime: new Date().toUTCString(),
        missingHeaders: headerAnalysis.missing.length
          ? headerAnalysis.missing.join(", ")
          : "None - Site is protected",
        isVulnerable: vulnerable,
        reason,
        rawHeaders: JSON.stringify(headers, null, 2),
        fullResponse: res.data.data || "",
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
        fullResponse: "",
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

    // Background color (maroon)
    doc.setFillColor("#4d0c26");
    doc.rect(0, 0, 210, 297, "F");

    const goldenRGB = [243, 205, 162];
    doc.setTextColor(...goldenRGB);

    // "Confidential" Label
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text("Confidential", 195, 10, { align: "right" });

    // Line below header
    doc.setDrawColor(...goldenRGB);
    doc.setLineWidth(0.5);
    doc.line(15, 14, 195, 14);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Quasar CyberTech – Clickjacking Report", 15, 26);

    // Section: Basic Info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const infoStartY = 38;
    const lineSpacing = 10;
    doc.text(`Site Tested: ${testResults.siteUrl}`, 15, infoStartY);
    doc.text(`IP Address: ${ip}`, 15, infoStartY + lineSpacing);
    doc.text(
      `Test Time: ${testResults.testTime}`,
      15,
      infoStartY + lineSpacing * 2
    );
    doc.text(
      `Missing Headers: ${testResults.missingHeaders || "None"}`,
      15,
      infoStartY + lineSpacing * 3
    );
    doc.text(
      `Vulnerability Status: ${
        testResults.isVulnerable ? "VULNERABLE" : "Not Vulnerable"
      }`,
      15,
      infoStartY + lineSpacing * 4
    );

    // ---------------- Mitigation Guide Box ----------------
    const boxX = 15;
    const boxY = infoStartY + lineSpacing * 6;
    const boxWidth = 180;
    const lineHeight = 6;

    const mitigationLines = [
      "--- Use X-Frame-Options header: DENY or SAMEORIGIN",
      "--- Prefer Content-Security-Policy with frame-ancestors",
      "    'none' to block all, 'self' for same-origin, or specific domains",
      "--- Avoid relying on a single header—use both for compatibility",
      "--- Implement frame-busting script (for legacy browsers):",
      "    if (self !== top) top.location = self.location;",
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...goldenRGB);
    doc.text("Clickjacking Mitigation Guide", boxX + 2, boxY + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...goldenRGB);
    const wrappedMitigation = doc.splitTextToSize(
      mitigationLines.join("\n"),
      boxWidth - 10
    );
    const textHeight = wrappedMitigation.length * lineHeight;

    const totalBoxHeight = textHeight + 18;
    doc.setDrawColor(...goldenRGB);
    doc.setLineWidth(0.5);
    doc.setFillColor(92, 30, 52); // Lighter maroon
    doc.roundedRect(boxX, boxY + 7, boxWidth, totalBoxHeight, 2, 2, "FD");

    doc.text(wrappedMitigation, boxX + 5, boxY + 17);

    const guideLinkY = boxY + totalBoxHeight + 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 153, 255);
    doc.textWithLink(
      "Full Mitigation Guide: https://quasarclickjack.netlify.app/defensecj.html",
      boxX + 2,
      guideLinkY,
      {
        url: "https://quasarclickjack.netlify.app/defensecj.html",
      }
    );

    // ---------------- Watermark ----------------
    const watermarkWidth = 25;
    const watermarkHeight = 18;
    const centerX = (210 - watermarkWidth) / 2;
    const bottomY = 250;
    doc.addImage(img, "PNG", centerX, bottomY, watermarkWidth, watermarkHeight);

    // ---------------- Disclaimer ----------------
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...goldenRGB);
    const disclaimer = `This report and the information contained herein are the proprietary property of Quasar CyberTech and are intended solely for the internal use of the designated client. This document may contain confidential or sensitive information and is shared with the client for review and informational purposes only. It may not be reproduced, distributed, or disclosed to any third party, in whole or in part, without the prior written consent of Quasar CyberTech. All rights reserved © ${new Date().getFullYear()}.`;
    const disclaimerLines = doc.splitTextToSize(disclaimer, 180);
    doc.text(disclaimerLines, 15, 295 - disclaimerLines.length * 4);

    // Save PDF
    doc.save("clickjacking_report.pdf");
  };

  return (
    <div className="h-screen overflow-hidden bg-[#4d0c26] text-[#f3cda2] font-sans relative flex">
      {/* Top-right nav links */}
      <div className="absolute top-4 right-4 flex gap-4 text-sm z-50">
        <a
          href="/about.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-yellow-300"
        >
          About
        </a>
        <a
          href="/defensecj.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-yellow-300"
        >
          Mitigation Guide
        </a>
      </div>
  
      {/* Left Panel: Iframe */}
      <div className="w-1/2 flex items-center justify-center p-4">
        <div className="relative border border-red-600 rounded-xl overflow-hidden shadow-xl w-[90%] h-[700px] bg-white">
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
              onClick={() =>
                alert("Fake button clicked (would click iframe content)")
              }
            >
              Click Me
            </div>
          )}
        </div>
      </div>
  
      {/* Right Panel: Controls and Results */}
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
            <div className="text-yellow-300 animate-pulse mb-2">
              Running test...
            </div>
          )}
          {loading && (
            <div className="text-yellow-400 text-xs mb-2">
              Elapsed Time: {elapsedTime} second{elapsedTime !== 1 ? "s" : ""}
            </div>
          )}
  
          {testResults.isVisible && (
            <>
              <div className="bg-red-100 text-black p-4 rounded text-sm mb-2 text-left">
                <p>
                  <strong>Site:</strong> {testResults.siteUrl}
                </p>
                <p>
                  <strong>IP Address:</strong> {ip}
                </p>
                <p>
                  <strong>Time:</strong> {testResults.testTime}
                </p>
                <p>
                  <strong>Missing Headers:</strong>{" "}
                  <span className="text-red-600 font-bold">
                    {testResults.missingHeaders}
                  </span>
                </p>
              </div>
  
              <div
                className={`p-3 text-center font-bold text-white rounded mb-2 ${
                  testResults.isVulnerable ? "bg-red-600" : "bg-green-600"
                }`}
              >
                Site is{" "}
                {testResults.isVulnerable ? "vulnerable" : "not vulnerable"} to
                Clickjacking
              </div>
  
              {testResults.rawHeaders && (
                <div className="bg-black text-green-300 text-xs p-3 rounded overflow-auto max-h-40 font-mono mb-2 text-left">
                  <strong className="text-lime-400">Raw Headers:</strong>
                  <pre>{testResults.rawHeaders}</pre>
                </div>
              )}
  
              <div className="flex justify-between items-center text-xs mt-2">
                <label
                  htmlFor="poc-toggle"
                  className="flex items-center gap-2 cursor-pointer"
                >
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