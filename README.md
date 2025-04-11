# 🛡️ Quasar CyberTech – Clickjacking Vulnerability Tester

A sleek, client-friendly **Clickjacking testing tool** built with **React**, powered by **Netlify Functions** and **jsPDF**. This tool helps assess whether a website is vulnerable to clickjacking attacks by analyzing its response headers and iframe behavior.

![Screenshot](https://quasarcybertech.com/wp-content/uploads/2024/06/fulllogo_transparent_nobuffer.png)

---

## ⚙️ Features

- 🔍 Checks for missing `X-Frame-Options` and `Content-Security-Policy` headers.
- 🧪 Iframes the target site to confirm whether it's renderable.
- ⏱️ Timer to track test duration.
- 💡 Optional "Click Me" PoC overlay toggle.
- 📄 One-click PDF report export with branding and compliance disclaimer.
- 💾 Session-persistent URL testing.
- 📋 Displays raw response headers.

---

## 📦 Tech Stack

- **Frontend:** React + TailwindCSS
- **PDF Generation:** jsPDF
- **Backend:** Serverless (Netlify Functions)
- **HTTP Requests:** Axios


