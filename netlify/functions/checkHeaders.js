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

    const { hostname } = new URL(url);
    let ip = 'Unavailable';
    try {
      const addresses = await dns.lookup(hostname);
      ip = addresses.address;
    } catch {
      ip = 'Could not resolve IP';
    }

    // Perform POST request with default dummy payload
    const response = await axios.post(url, { test: "quasar_clickjacking_probe" }, {
      maxRedirects: 5,
      validateStatus: () => true,
      timeout: 8000,
    });

    const headers = Object.fromEntries(
      Object.entries(response.headers).map(([key, value]) => [key.toLowerCase(), value])
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        headers,
        ip,
        status: response.status,
        data: typeof response.data === "string"
          ? response.data.slice(0, 3000)
          : JSON.stringify(response.data).slice(0, 3000)
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'POST request failed or response too large' })
    };
  }
};
