const fs = require('fs');
const pdfParse = require('pdf-parse');

const pdfPath = 'meesho 15-16 oct - 45 labels - 17-10-2025-09.35AM.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

(async () => {
  try {
    // pdf-parse 1.1.1 exports a function, not a class
    const data = await pdfParse(dataBuffer);

    console.log('✅ PDF parsed successfully!');
    console.log('Pages:', data.numpages);
    console.log('Text length:', data.text.length, 'characters');
    console.log('\n--- First 2000 characters ---');
    console.log(data.text.substring(0, 2000));
    console.log('\n--- Looking for order patterns ---');

    // Check for key patterns
    const hasOrderNo = data.text.includes('Order No') || data.text.includes('Order ID');
    const hasAWB = /[A-Z]{2}[0-9]{10,}/.test(data.text);
    const hasCustomerAddress = data.text.includes('Customer Address');
    const hasCourier = data.text.includes('Shadowfax') || data.text.includes('Delhivery') || data.text.includes('Xpressbees') || data.text.includes('XPressbees');

    console.log('Has Order Number:', hasOrderNo);
    console.log('Has AWB pattern:', hasAWB);
    console.log('Has Customer Address:', hasCustomerAddress);
    console.log('Has Courier name:', hasCourier);

    // Try to count potential orders
    const orderMatches = data.text.match(/Order\s*No/gi);
    console.log('\nPotential orders found:', orderMatches ? orderMatches.length : 0);

    // Check for specific courier names
    console.log('\n--- Courier detection ---');
    console.log('Shadowfax mentions:', (data.text.match(/Shadowfax/gi) || []).length);
    console.log('Delhivery mentions:', (data.text.match(/Delhivery/gi) || []).length);
    console.log('Xpressbees mentions:', (data.text.match(/Xpressbees/gi) || []).length);
  } catch (error) {
    console.error('❌ Error parsing PDF:', error.message);
    console.error('Full error:', error);
  }
})();
