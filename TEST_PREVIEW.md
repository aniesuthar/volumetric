# Testing Preview Feature

## Debug Steps

1. **Open Browser Console** (F12)
2. **Click "Bulk Upload PDF"**
3. **Select a PDF file**
4. **Watch console for logs:**

### Expected Console Output:
```
Uploading PDF for preview: your-file.pdf
Parse response: { success: true, preview: true, message: "...", data: {...} }
Extracted orders count: 54
First order: { order_id: "...", awb_number: "...", ... }
Preview orders updated: 54
```

### If Preview Doesn't Show:

Check console for:
1. Is `json.data.orders` an array?
2. Is the array populated?
3. Any errors in the response?

### Manual API Test

You can test the API directly:

```bash
# Create a test file
curl -X POST http://localhost:3000/api/meesho/parse-labels \
  -F "file=@your-labels.pdf" \
  -F "preview=true"
```

Expected response:
```json
{
  "success": true,
  "preview": true,
  "message": "Found 54 orders in PDF",
  "data": {
    "orders": [...],
    "fileName": "your-labels.pdf",
    "fileSize": 123456,
    "totalOrders": 54
  }
}
```

## Common Issues

### Issue 1: Preview Orders Length is 0
- Check if `json.data.orders` exists
- Check if it's an array
- Check console logs

### Issue 2: File Input Clears
- This is normal behavior to prevent re-submission
- Filename should still be visible in preview

### Issue 3: Dialog Closes
- Preview should keep dialog open
- Check if `previewOrders.length > 0`

## Quick Fix

If preview still doesn't show, try:

1. **Hard refresh** browser (Ctrl+Shift+R)
2. **Check Network tab** for API response
3. **Look for errors** in console
4. **Verify PDF parsing** returns data

## Next Steps

Once preview shows:
1. Review extracted orders
2. Click "Upload to Supabase"
3. Wait for tracking sync
4. Orders appear in main table
