const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testParseAPI() {
  const pdfPath = 'meesho 15-16 oct - 45 labels - 17-10-2025-09.35AM.pdf';

  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF file not found:', pdfPath);
    return;
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(pdfPath));
  form.append('preview', 'true');

  console.log('🚀 Sending PDF to API for preview parsing...');

  try {
    const response = await fetch('http://localhost:3001/api/meesho/parse-labels', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    const json = await response.json();

    if (json.error) {
      console.error('❌ API Error:', json.error);
    } else {
      console.log('✅ Parse successful!');
      console.log('📊 Total orders found:', json.data?.totalOrders || 0);
      console.log('\n--- First 3 orders preview ---');

      const orders = json.data?.orders || [];
      orders.slice(0, 3).forEach((order, i) => {
        console.log(`\nOrder ${i + 1}:`);
        console.log('  Order ID:', order.order_id);
        console.log('  AWB:', order.awb_number);
        console.log('  Customer:', order.customer_name);
        console.log('  City:', order.customer_city);
        console.log('  State:', order.customer_state);
        console.log('  Pincode:', order.customer_pincode);
        console.log('  Courier:', order.courier_partner);
        console.log('  Product:', order.product_name);
        console.log('  Quantity:', order.quantity);
      });
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testParseAPI();
