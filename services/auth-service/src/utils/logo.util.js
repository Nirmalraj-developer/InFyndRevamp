const fs = require('fs');
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '../../logos');

const getLogoDataUri = (logoName) => {
  if (!logoName) return null;
  
  try {
    const logoPath = path.join(LOGOS_DIR, logoName);
    if (!fs.existsSync(logoPath)) return null;
    
    const buffer = fs.readFileSync(logoPath);
    const ext = path.extname(logoName).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`Failed to read logo ${logoName}:`, error);
    return null;
  }
};

module.exports = { getLogoDataUri };
