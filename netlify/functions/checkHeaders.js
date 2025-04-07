const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const { url, method = 'GET', body = null } = JSON.parse(event.body);

    if (!url || !/^https?:\/\//i.test(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid URL format' }),
      };
    }

    const fetchOptions = {
      method: method.toUpperCase(),
      redirect: 'follow',
      headers: {
        'User-Agent': 'ClickjackingTester/1.0',
        'Content-Type': 'application/json',
      },
    };

    if (method.toUpperCase() === 'POST' && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);

    const headers = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const missing = [];
    const xfo = headers['x-frame-options'];
    const csp = headers['content-security-policy'];

    if (!xfo) missing.push('X-Frame-Options');
    if (!csp || !csp.includes('frame-ancestors')) missing.push('Content-Security-Policy (frame-ancestors)');

    const vulnerable = missing.length > 0;

    return {
      statusCode: 200,
      body: JSON.stringify({
        url,
        method,
        vulnerable,
        missing,
        protection: vulnerable ? 'Missing clickjacking protection' : 'Clickjacking protection in place',
        headers,
      }),
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error: ' + err.message }),
    };
  }
};
