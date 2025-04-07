const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { url } = JSON.parse(event.body);

  try {
    const res = await fetch(url);
    const headers = res.headers.raw();

    const xfo = headers['x-frame-options'];
    const csp = headers['content-security-policy'];

    let protection = [];
    if (!xfo) protection.push('X-Frame-Options');
    if (!csp || !csp.some(h => h.includes('frame-ancestors'))) {
      protection.push('CSP frame-ancestors');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        protection: protection.length ? protection.join(', ') : 'None',
        headers,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
