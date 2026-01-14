# Bulk PDF Upload Guide for Meesho Orders

## Quick Start

1. Navigate to `/meesho` in your application
2. Click the **"Bulk Upload PDF"** button
3. Select your Meesho labels PDF file (containing 50-60 labels)
4. Wait for the parsing to complete
5. Review the success message showing how many orders were created

## What Gets Extracted Automatically

The system automatically extracts the following information from each label:

### Order Information
- **Order Number**: e.g., `210219568029895040_1`
- **AWB Tracking Number**: e.g., `SF2298198977FPL`
- **Order Status**: All orders start as `pending`

### Customer Details
- **Customer Name**: First line after "Customer Address"
- **Complete Address**: Full shipping address
- **City**: Extracted from address
- **State**: Extracted from address
- **Pincode**: 6-digit postal code

### Product Information
- **SKU**: Product code (e.g., `HeavyDutyPG`)
- **Product Name**: Combines SKU with color (e.g., `HeavyDutyPG (Black)`)
- **Quantity**: Number of units ordered
- **Size**: Product size if available
- **Color**: Product color if available

### Shipping Information
- **Courier Partner**: Automatically extracted from label text
  - Recognized: `Shadowfax`, `Delhivery`, `Xpressbees`, `Ekart`, `BlueDart`, `DTDC`
  - Normalized automatically (e.g., "XPressBees" → "Xpressbees")
  - **Critical for automatic tracking!**

### File Storage
- **Original PDF**: Uploaded to Supabase Storage
- **File URL**: Public URL for accessing the label

## Expected Label Format

The parser is optimized for Meesho's standard label format:

```
Customer Address
[Customer Name]
[Address Line 1]
[Address Line 2]
[City], [State], [Pincode]

If undelivered, return to:
[Return Address]

COD: Check the payable amount on the app
[Courier Partner]

[AWB Number]

Product Details
SKU   Size        Qty   Color   Order No.
[SKU] [Size]      [Qty] [Color] [Order Number]
```

## After Upload

Once the upload is complete:

1. **View All Orders**: All extracted orders appear in the main table
2. **Edit if Needed**: Click the edit button on any order to correct/add details
3. **Update Status**: Change order status as deliveries progress
4. **View Labels**: Click the PDF icon to view the original label
5. **Filter**: Use status filters to find specific orders

## Troubleshooting

### If fewer orders than expected are created:

1. **Check PDF format**: Ensure it's a standard Meesho labels PDF
2. **Review extracted data**: The success message shows sample data - verify it looks correct
3. **Manual entry**: For any missing orders, use the "Add Order" button

### If data looks incorrect:

1. **Edit individual orders**: Click the pencil icon to edit any order
2. **Check the debug info**: The API returns raw text for troubleshooting
3. **File an issue**: If parsing is consistently wrong for your label format

### If upload fails:

1. **Check file type**: Must be a PDF file
2. **Check file size**: Very large PDFs (>10MB) may timeout
3. **Check authentication**: Ensure you're logged in
4. **Check storage bucket**: Verify `meesho-labels` bucket exists in Supabase

## Tips for Best Results

1. **Use original PDFs**: Download labels directly from Meesho
2. **Don't modify PDFs**: Avoid editing or combining PDFs manually
3. **Check first upload**: After first upload, verify data accuracy
4. **Batch wisely**: 50-60 labels per PDF works best
5. **Update status promptly**: Keep order statuses up-to-date for accurate tracking

## Next Steps After Upload

1. **Verify customer details**: Check if phone numbers were extracted (if present in PDF)
2. **Set expected delivery dates**: Add expected delivery dates for tracking
3. **Add notes**: Use the notes field for special instructions or issues
4. **Monitor status**: Update order status as you receive tracking updates
5. **Export data**: Use filters to track delivery performance

## Advanced: Understanding the Parser

The PDF parser uses regex patterns to identify and extract data:

1. **Splits PDF**: Divides the PDF into individual label sections
2. **Pattern matching**: Uses specific patterns for each field
3. **Fallback logic**: Multiple patterns for robustness
4. **Data cleaning**: Trims whitespace and formats data
5. **Database insertion**: Creates all orders in a single transaction

If your Meesho labels have a different format, the parser can be customized in:
- `app/api/meesho/parse-labels/route.ts`
