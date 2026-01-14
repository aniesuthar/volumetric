# Real-Time Courier Tracking Setup Guide

## Overview

The Meesho order tracking system now includes **automatic tracking status synchronization** from three major courier partners:

- **XPressBees**
- **Shadowfax**
- **Delhivery**

The system fetches real-time tracking information directly from courier websites and automatically updates order statuses in your database.

---

## Features

### 1. **Automatic Courier Detection**
- **Primary Method (Most Accurate)**: Extracts courier partner name directly from PDF label during bulk upload
  - System reads "Shadowfax", "Delhivery", or "Xpressbees" from the label text
  - Automatically normalizes variations (e.g., "XPressBees", "X-Press Bees" → "Xpressbees")
  - Stores courier name in database with each order
  - **No manual selection needed!**
- **Fallback Method**: Pattern detection from AWB number (only if courier not in database)
  - **Shadowfax**: AWB starts with `SF` (e.g., `SF2298198977FPL`)
  - **XPressBees**: AWB contains `XB`
  - **Delhivery**: Other alphanumeric patterns

### 2. **Real-Time Status Sync**
Fetches and updates:
- Order status (Pending → Shipped → In Transit → Out for Delivery → Delivered)
- Last update timestamp
- Current location
- Expected delivery date
- Complete tracking history
- Delivery confirmation date (when delivered)

### 3. **Status Mapping**
Automatically maps courier-specific statuses to standardized statuses:
- `pending` - Order created, awaiting pickup
- `shipped` - Picked up by courier
- `in_transit` - In transit to destination
- `out_for_delivery` - Out for delivery
- `delivered` - Successfully delivered
- `rto` - Return to Origin
- `cancelled` - Order cancelled

---

## How to Use

### Method 1: Bulk Sync All Orders

Click the **"Sync All Tracking"** button in the main interface to:
- Track all orders with AWB numbers
- Skip delivered and cancelled orders
- Update statuses for pending, shipped, in-transit, and out-for-delivery orders
- Display summary of updates

**Best for**: Regular daily/hourly updates of all active orders

### Method 2: Individual Order Sync

Click the **tracking icon (📡)** next to any order to:
- Fetch latest status for that specific order
- Update status immediately
- View updated information

**Best for**: Checking specific orders or urgent updates

---

## Tracking Process

### What Happens During Tracking

1. **Fetch Order**: System retrieves order from database
2. **Get AWB**: Extracts AWB tracking number
3. **Get Courier**: Uses courier partner from database (extracted from PDF label)
4. **Normalize**: Converts courier name to standard format (e.g., "Shadowfax" → "shadowfax")
5. **API Call**: Makes request to courier's tracking API
6. **Parse Response**: Extracts tracking data from courier response
7. **Map Status**: Converts courier status to standard status
8. **Update Database**: Saves new status, timestamp, and history
9. **Notify User**: Shows success message

### Tracking History

Each tracking sync adds an entry to the order's tracking history:
```json
{
  "timestamp": "2025-10-20T10:30:00Z",
  "status": "in_transit",
  "message": "Package is in transit",
  "location": "Mumbai Hub",
  "rawStatus": "In Transit"
}
```

---

## Courier API Endpoints

### XPressBees
- **URL**: `https://www.xpressbees.com/shipment/tracking/{AWB}`
- **Method**: GET
- **Response**: JSON with tracking details

### Shadowfax
- **URL**: `https://track.shadowfax.in/track/{AWB}`
- **Method**: GET
- **Response**: JSON with tracking data

### Delhivery
- **URL**: `https://track.delhivery.com/api/v1/packages/json/?waybill={AWB}`
- **Method**: GET
- **Response**: JSON with shipment data

---

## Important Notes

### API Limitations

1. **Public APIs**: Currently using public tracking endpoints
2. **Rate Limiting**: Includes 500ms delay between requests to avoid rate limits
3. **No Authentication**: No API keys required (using public endpoints)
4. **Best Effort**: Some couriers may block automated requests

### For Production Use

Consider:
1. **API Keys**: Register for official courier API access
2. **Webhooks**: Set up webhook notifications from couriers
3. **Scheduled Jobs**: Use cron jobs for automatic hourly/daily syncs
4. **Error Handling**: Monitor and log failed tracking attempts

---

## Troubleshooting

### Tracking Fails for Specific Order

**Possible Causes:**
1. AWB number not set or incorrect
2. Courier partner not detected
3. Order already delivered/cancelled
4. Courier API is down
5. Network/CORS issues

**Solutions:**
1. Verify AWB number is correct
2. Manually set courier partner in order edit dialog
3. Check browser console for detailed errors
4. Try again after some time

### Bulk Sync Shows Errors

Check the response for:
- List of failed orders
- Specific error messages
- Network connectivity issues

### Status Not Updating

1. **Check AWB**: Ensure AWB number is correct
2. **Verify Courier**: Check courier partner is set correctly
3. **Check Tracking Online**: Manually verify AWB on courier website
4. **Review Logs**: Check browser console and server logs

---

## Advanced Configuration

### Customize Courier Detection

Edit [lib/courier-tracking.ts](lib/courier-tracking.ts):

```typescript
export function detectCourierPartner(awb: string): CourierPartner | null {
  // Add custom AWB patterns here
  if (awb.startsWith("YOUR_PATTERN")) {
    return "xpressbees"
  }
  // ... existing logic
}
```

### Customize Status Mapping

Edit mapping functions in [lib/courier-tracking.ts](lib/courier-tracking.ts):

```typescript
function mapShadowfaxStatus(courierStatus: string): TrackingStatus["status"] {
  const status = courierStatus?.toLowerCase() || ""

  // Add custom status mappings
  if (status.includes("your_custom_status")) return "in_transit"

  // ... existing logic
}
```

### Add More Couriers

1. Add courier type to `CourierPartner` type
2. Create tracking function (e.g., `trackNewCourier()`)
3. Add detection pattern in `detectCourierPartner()`
4. Add mapping function for statuses
5. Update `trackShipment()` switch statement

---

## Automatic Scheduling (Optional)

### Option 1: Client-Side Interval (Simple)

Add to your page component:

```typescript
useEffect(() => {
  // Sync every 1 hour
  const interval = setInterval(() => {
    handleBulkTrackOrders()
  }, 60 * 60 * 1000)

  return () => clearInterval(interval)
}, [])
```

### Option 2: Server-Side Cron Job (Recommended)

Create a cron endpoint:

```typescript
// app/api/cron/track-orders/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get("authorization")
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Run bulk tracking for all users
  // ... implementation
}
```

Then use services like:
- **Vercel Cron**: Configure in `vercel.json`
- **GitHub Actions**: Schedule workflow
- **External Cron**: Use cron-job.org

---

## API Reference

### Track Single Order

**Endpoint**: `POST /api/meesho/track-order`

**Body**:
```json
{
  "orderId": "uuid-here",
  "awb": "SF2298198977FPL",  // optional
  "courier": "shadowfax"      // optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Order status updated to: in_transit",
  "data": {
    "awb": "SF2298198977FPL",
    "courier": "shadowfax",
    "status": "in_transit",
    "statusMessage": "In Transit",
    "lastUpdate": "2025-10-20T10:30:00Z",
    "currentLocation": "Mumbai Hub",
    "trackingHistory": [...]
  }
}
```

### Bulk Track Orders

**Endpoint**: `GET /api/meesho/track-order`

**Response**:
```json
{
  "success": true,
  "message": "Tracking completed: 45 updated, 5 failed",
  "total": 50,
  "updated": 45,
  "failed": 5,
  "errors": [
    "Order 123: AWB not found",
    "Order 456: Courier API timeout"
  ]
}
```

---

## Data Privacy & Security

- All tracking is done server-side
- No courier credentials stored
- User data protected by RLS policies
- AWB numbers are public information used only for tracking
- Tracking history stored securely in your database

---

## Performance Tips

1. **Batch Updates**: Use bulk sync instead of individual syncs
2. **Schedule Wisely**: Don't sync more than once per hour
3. **Skip Completed**: System automatically skips delivered/cancelled orders
4. **Monitor Errors**: Check failed tracking attempts
5. **Cache Results**: Tracking history prevents duplicate API calls

---

## Next Steps

1. ✅ Setup complete - tracking is ready to use
2. 📊 Monitor tracking success rate
3. 🔄 Set up automatic hourly/daily syncs (optional)
4. 📧 Add email notifications on delivery (future enhancement)
5. 📈 Add analytics dashboard (future enhancement)

---

## Support & Debugging

### Enable Debug Mode

Add to your tracking calls:

```typescript
// In lib/courier-tracking.ts
console.log("Tracking AWB:", awb)
console.log("Detected courier:", courier)
console.log("API Response:", data)
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "AWB not found" | Check AWB number is correct |
| "Could not detect courier" | Manually set courier partner |
| "API timeout" | Try again later, courier may be down |
| "Unauthorized" | Check if using public endpoint |
| CORS errors | May need to use server-side proxy |

### Get Help

1. Check browser console for errors
2. Review API response in Network tab
3. Test AWB manually on courier website
4. Check [lib/courier-tracking.ts](lib/courier-tracking.ts) for implementation details
