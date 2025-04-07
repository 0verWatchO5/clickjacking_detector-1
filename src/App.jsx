import React, { useState, useRef, useEffect } from 'react';

function ClickjackingTest() {
  const [url, setUrl] = useState('');
  const [testResults, setTestResults] = useState({
    isVisible: false,
    siteUrl: '-',
    testTime: '-',
    missingHeaders: '-',
    isVulnerable: null,
    reason: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  const [showDebug, setShowDebug] = useState(false);

  const testFrameRef = useRef(null);
  const testCanvasRef = useRef(null);

  const log = (message) => {
    setDebugInfo(prev => [...prev, message]);
  };

  const validateUrl = (inputUrl) => {
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
      return 'https://' + inputUrl;
    }
    return inputUrl;
  };

  const checkHeaders = async (testedUrl) => {
    try {
      const res = await fetch('/.netlify/functions/check-headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testedUrl }),
      });

      const data = await res.json();

      if (data.error) {
        log('Header check failed: ' + data.error);
        return;
      }

      const { headers, isProtected, missing } = data;
      log('Headers: ' + JSON.stringify(headers, null, 2));
      log('Header Protection: ' + (isProtected ? 'Present' : 'Missing: ' + missing.join(', ')));

      setTestResults(prev => ({
        ...prev,
        missingHeaders: missing.length ? missing.join(', ') : 'None - Site is protected',
      }));
    } catch (err) {
      log('Error fetching headers: ' + err.message);
    }
  };

  const testClickjacking = () => {
    setDebugInfo([]);

    let formattedUrl = url.trim();
    if (!formattedUrl) {
      alert('Please enter a URL');
      return;
    }

    formattedUrl = validateUrl(formattedUrl);

    setTestResults({
      isVisible: true,
      siteUrl: formattedUrl,
      testTime: new Date().toUTCString(),
      missingHeaders: '-',
      isVulnerable: null,
      reason: ''
    });
    setIsLoading(true);

    if (testFrameRef.current) {
      testFrameRef.current.src = 'about:blank';
    }

    const referenceTime = Date.now();
    let frameLoaded = false;
    let frameBlocked = false;

    const handleFrameLoad = () => {
      frameLoaded = true;
      log(`Frame loaded in ${Date.now() - referenceTime}ms`);
      setTimeout(() => {
        testFrameContent(testFrameRef.current, formattedUrl);
      }, 1000);
    };

    const handleFrameError = () => {
      frameBlocked = true;
      log('Frame loading error');
      showResults(false, 'Frame loading error - likely blocked by browser policy');
    };

    if (testFrameRef.current) {
      testFrameRef.current.onload = handleFrameLoad;
      testFrameRef.current.onerror = handleFrameError;
    }

    const timeoutId = setTimeout(() => {
      if (!frameLoaded && !frameBlocked) {
        log('Test timed out after 8 seconds');
        showResults(false, 'Test timed out - likely blocked');
      }
    }, 8000);

    try {
      log('Testing URL: ' + formattedUrl);
      if (testFrameRef.current) {
        testFrameRef.current.src = formattedUrl;
      }
      checkHeaders(formattedUrl);
    } catch(e) {
      log('Error setting frame src: ' + e.message);
      showResults(false, 'Error setting frame source: ' + e.message);
    }

    return () => clearTimeout(timeoutId);
  };

  const testFrameContent = (frame, testedUrl) => {
    let isLoaded = false;
    let reason = '';

    try {
      const hasContentWindow = !!frame.contentWindow;
      log('Has contentWindow: ' + hasContentWindow);

      const hasDimensions = frame.clientWidth > 0 && frame.clientHeight > 0;
      log('Has dimensions: ' + hasDimensions);

      let hasContentAccess = false;
      try {
        hasContentAccess = !!frame.contentDocument;
        log('Content access successful: ' + hasContentAccess);

        if (hasContentAccess) {
          isLoaded = true;
          reason = 'Content document access successful';
        }
      } catch (e) {
        log('Content access blocked by same-origin policy');
        if (hasDimensions) {
          isLoaded = true;
          reason = 'Frame loaded visible content';
        } else {
          isLoaded = false;
          reason = 'Content blocked by security policy';
        }
      }

      tryVisualTest(frame);
    } catch (e) {
      log('Error in test: ' + e.message);
      isLoaded = false;
      reason = 'Error during testing: ' + e.message;
    }

    setIsLoading(false);
    showResults(isLoaded, reason);
  };

  const tryVisualTest = (frame) => {
    try {
      const canvas = testCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let hasContent = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          hasContent = true;
          break;
        }
      }
      log('Visual test - has content: ' + hasContent);
    } catch (e) {
      log('Visual test failed: ' + e.message);
    }
  };

  const showResults = (isVulnerable, reason) => {
    setTestResults(prev => ({
      ...prev,
      isVulnerable,
      reason,
    }));
    log(`RESULT: ${isVulnerable ? 'VULNERABLE' : 'PROTECTED'} - ${reason}`);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100 transition-colors duration-300 ease-in-out">
      <div className="flex w-full h-full">
        <div className="w-1/2 p-5 relative">
          {isLoading && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-blue-500">
              Loading...
            </div>
          )}
          <iframe 
            ref={testFrameRef}
            className="w-full h-full border-2 border-red-500 rounded-lg opacity-90"
            title="Test Frame"
          />
          <div className="absolute top-5 left-5 w-[calc(100%-40px)] h-[calc(100%-40px)] bg-white bg-opacity-50 rounded-lg pointer-events-none"></div>
          <canvas 
            ref={testCanvasRef}
            width="5"
            height="5"
            className="absolute top-0 left-0 opacity-0 pointer-events-none"
          />
        </div>

        <div className="w-1/2 bg-white shadow-lg rounded-xl p-5 flex flex-col justify-center items-center relative">
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
              className="flex-grow p-2 border border-gray-300 rounded-l-lg"
            />
            <button
              onClick={testClickjacking}
              className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg"
            >
              Test
            </button>
          </div>

          {testResults.isVisible && (
            <div className="w-4/5 p-4 bg-red-50 rounded-lg mb-4">
              <p><strong>Site:</strong> {testResults.siteUrl}</p>
              <p><strong>Time:</strong> {testResults.testTime}</p>
              <p><strong>Missing Security Headers:</strong> <span className="text-red-600 font-bold">{testResults.missingHeaders}</span></p>
            </div>
          )}

          {testResults.isVulnerable !== null && (
            <div 
              className={`w-4/5 p-3 text-center font-bold text-white rounded ${
                testResults.isVulnerable ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              Site is {testResults.isVulnerable ? 'vulnerable' : 'not vulnerable'} to Clickjacking
            </div>
          )}

          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className="mt-4 text-xs text-gray-500 underline"
          >
            {showDebug ? 'Hide' : 'Show'} Debug Info
          </button>

          {showDebug && (
            <div className="w-4/5 p-3 mt-2 bg-gray-100 rounded-lg text-xs text-gray-700 max-h-32 overflow-y-auto">
              {debugInfo.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-gray-500 text-center">
            Payload developed by Quasar CyberTech Security Team ©<br/>
            Made in India with <span className="text-red-600">❤️</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ClickjackingTest;