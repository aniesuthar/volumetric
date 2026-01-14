# Meesho Order Tracking Setup Guide

This guide will help you set up the Meesho order tracking feature for your application.

## Overview

The Meesho order tracking system allows you to:
- Upload PDF labels from Meesho
- Manually add and manage orders
- Track order status in real-time
- View order statistics and analytics
- Store shipping labels securely

## Setup Steps

### 1. Run Database Migrations

Execute the following SQL scripts in your Supabase SQL editor (in order):

```bash
# Navigate to your Supabase dashboard > SQL Editor
# Run these scripts in order:

1. scripts/012_create_meesho_orders.sql
2. scripts/013_create_storage_bucket.sql
```

Or you can run them from the command line:

```bash
# If you have Supabase CLI installed
supabase db reset
# Or run migrations individually
```

### 2. Verify Database Setup

After running the migrations, verify that:

1. The `meesho_orders` table exists with proper columns
2. Row Level Security (RLS) is enabled
3. The storage bucket `meesho-labels` is created

You can verify in Supabase Dashboard:
- Go to **Table Editor** → Check for `meesho_orders` table
- Go to **Storage** → Check for `meesho-labels` bucket

### 3. Access the Feature

Once the database is set up:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/meesho` in your application
3. The Meesho Orders page will be accessible from the sidebar navigation

## Features

### Order Management

1. **Bulk Upload PDF Labels (Recommended for 50-60 labels)**
   - Click "Bulk Upload PDF" button in the main interface
   - Select your Meesho labels PDF file containing multiple orders
   - The system will automatically:
     - Parse the PDF and identify individual labels
     - Extract order details from each label:
       - Order Number (e.g., 210219568029895040_1)
       - AWB tracking number (e.g., SF2298198977FPL)
       - Customer name and complete address
       - City, State, and Pincode
       - Product SKU and quantity
       - Courier partner
     - Create separate database entries for each order
     - Upload the original PDF to Supabase Storage
   - View parsing results showing how many orders were created
   - All orders are created with "pending" status by default
   - **Tip**: The parser is optimized for Meesho's standard label format

2. **Add Orders Manually**
   - Click "Add Order" button
   - Fill in order details:
     - Order ID (required)
     - Product information
     - Customer details
     - Shipping information
   - Upload label PDF (optional)
   - Set initial status

3. **Upload Labels**
   - PDF files are uploaded to Supabase Storage
   - Files are organized by user ID
   - Public URLs are generated for easy access

4. **Track Order Status**
   - Update status: Pending → Shipped → In Transit → Out for Delivery → Delivered
   - Handle RTO and Cancelled orders
   - View status history

5. **Filter and Search**
   - Filter orders by status
   - View statistics dashboard
   - Track pending, shipped, and delivered counts

### Order Statuses

- **Pending**: Order created, awaiting shipment
- **Shipped**: Order picked up by courier
- **In Transit**: Order in transit to destination
- **Out for Delivery**: Order out for delivery
- **Delivered**: Successfully delivered
- **RTO**: Return to Origin
- **Cancelled**: Order cancelled

## Database Schema

### `meesho_orders` Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User who owns the order |
| order_id | text | Meesho order ID |
| product_name | text | Product name |
| sku | text | Stock Keeping Unit |
| quantity | integer | Quantity ordered |
| customer_name | text | Customer name |
| customer_phone | text | Customer phone |
| customer_address | text | Full address |
| customer_city | text | City |
| customer_state | text | State |
| customer_pincode | text | Pincode |
| awb_number | text | Air Waybill tracking number |
| courier_partner | text | Courier service name |
| status | text | Current order status |
| last_status_update | timestamptz | Last status change time |
| expected_delivery_date | timestamptz | Expected delivery date |
| delivered_date | timestamptz | Actual delivery date |
| label_file_url | text | URL to uploaded label PDF |
| label_file_name | text | Original file name |
| notes | text | Additional notes |
| tracking_history | jsonb | Status change history (for future use) |
| created_at | timestamptz | Record creation time |
| updated_at | timestamptz | Last update time |

## API Endpoints

### Orders API

- `GET /api/meesho/orders` - Fetch all orders (with optional status filter)
- `POST /api/meesho/orders` - Create a new order
- `PUT /api/meesho/orders` - Update an order
- `DELETE /api/meesho/orders?id={id}` - Delete an order

### Upload API

- `POST /api/meesho/upload-labels` - Upload a PDF label

## Future Enhancements

Consider adding:

1. **PDF Parsing**: Automatically extract order details from Meesho label PDFs
2. **Courier API Integration**: Auto-fetch tracking status from courier APIs
3. **Bulk Upload**: Upload multiple orders via CSV
4. **Analytics Dashboard**: Detailed insights and trends
5. **Email Notifications**: Alert on status changes
6. **Print Labels**: Bulk print functionality
7. **Export Data**: Export orders to Excel/CSV

## Troubleshooting

### Storage Upload Fails

If label upload fails:
1. Verify the storage bucket exists: `meesho-labels`
2. Check storage policies are properly set
3. Ensure user is authenticated
4. Check file is a valid PDF

### Orders Not Loading

If orders don't load:
1. Check browser console for errors
2. Verify user is logged in
3. Check RLS policies are enabled
4. Verify API endpoints are accessible

### Permission Errors

If you get permission errors:
1. Ensure RLS policies are created correctly
2. Check user authentication status
3. Verify user_id matches in database

## Support

For issues or questions:
1. Check the browser console for errors
2. Review Supabase logs in the dashboard
3. Verify all migration scripts ran successfully
