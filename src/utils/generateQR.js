const QRCode = require('qrcode');

const generateQR = async (hostelCode) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(hostelCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (error) {
    throw new Error('QR Code generation failed: ' + error.message);
  }
};

module.exports = generateQR;
