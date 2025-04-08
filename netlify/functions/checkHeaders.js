const axios = require('axios');
const dns = require('dns').promises;

exports.handler = async (event) => {
  try {
    const { url } = JSON.parse(event.body || '{}');

    if (!url || !/^https?:\/\//i.test(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid URL' })
      };
    }

    // Extract hostname to resolve IP
    const { hostname } = new URL(url);
    let ip = 'Unavailable';
    try {
      const addresses = await dns.lookup(hostname);
      ip = addresses.address;
    } catch (err) {
      ip = 'Could not resolve IP';
    }

    // Make HEAD request to fetch headers
    const response = await axios.head(url, {
      maxRedirects: 5,
      validateStatus: () => true,
      timeout: 5000
    });

    const headers = Object.fromEntries(
      Object.entries(response.headers).map(([key, value]) => [key.toLowerCase(), value])
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        headers,
        ip
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch headers or resolve IP' })
    };
  }
};
