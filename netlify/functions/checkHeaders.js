const axios = require('axios')

exports.handler = async (event) => {
  const { url } = JSON.parse(event.body)

  try {
    const response = await axios.get(url, { timeout: 5000 })

    const xFrame = response.headers['x-frame-options'] || ''
    const csp = response.headers['content-security-policy'] || ''

    let protection = 'None'

    if (xFrame.includes('DENY') || xFrame.includes('SAMEORIGIN')) {
      protection = 'X-Frame-Options'
    } else if (csp.includes('frame-ancestors')) {
      protection = 'Content-Security-Policy'
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        protection,
        headers: {
          'x-frame-options': xFrame,
          'content-security-policy': csp,
        },
      }),
    }
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Could not fetch URL' }),
    }
  }
}
