import React from 'react';
import './Footer.css';
import logo from '/Quasar.png'; // Make sure this path points to your logo


const Footer = () => {
  return (
    <footer className="quasar-footer">
      <div className="footer-content">
        <img src={logo} alt="Quasar CyberTech Logo" className="footer-logo" />

        <p className="footer-text">© 2024 Quasar CyberTech Pvt Ltd | All Rights Reserved</p>
        <p className="footer-ownership">This is a property of Quasar CyberTech.</p>
      </div>
    </footer>
  );
};

export default Footer;
