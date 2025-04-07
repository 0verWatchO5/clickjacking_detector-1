const axios = require('axios');

exports.handler = async (event) => {
  try {
    const { url } = JSON.parse(event.body);
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing URL' })
      };
    }

    const response = await axios.head(url, { maxRedirects: 5 });
    const headers = response.headers;

    const xFrameOptions = headers['x-frame-options'];
    const contentSecurityPolicy = headers['content-security-policy'];
    const cspFrameAncestors = contentSecurityPolicy?.includes('frame-ancestors');

    const missingHeaders = [];
    if (!xFrameOptions) missingHeaders.push('X-Frame-Options');
    if (!contentSecurityPolicy || !cspFrameAncestors) missingHeaders.push('CSP frame-ancestors');

    const isProtected = missingHeaders.length === 0;

    return {
      statusCode: 200,
      body: JSON.stringify({
        url,
        protection: isProtected ? 'Protected' : 'Not Protected',
        missingHeaders,
        headers
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Server Error' })
    };
  }
};
