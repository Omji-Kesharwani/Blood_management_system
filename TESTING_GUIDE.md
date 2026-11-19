# 🧪 Testing Guide - Blood Donation Project Features

## 🚀 Quick Start

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Access the app:** Open `http://localhost:3000` in your browser

3. **Sign in/Sign up:** Use Clerk authentication to access protected routes

---

## 📍 Feature Testing Guide

### 1️⃣ **Live Map Visualization** 🗺️
**Route:** `/Map`

**How to test:**
- Click **"Live Map"** in the navbar (or go to `/Map`)
- Allow location access when prompted
- You should see:
  - ✅ A blue circle showing your search radius
  - ✅ Green markers for nearby donors (if any exist)
  - ✅ Red markers for active SOS requests
  - ✅ Radius slider to adjust search range (1-100 km)

**What it does:**
- Shows all donors within the selected radius
- Displays active emergency requests
- Updates markers when you change the radius

**Prerequisites:**
- Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- Have at least one donor registered with latitude/longitude

---

### 2️⃣ **Emergency SOS Request** 🆘
**Route:** `/SOS`

**How to test:**
- Click **"Emergency SOS"** in the navbar (or go to `/SOS`)
- Fill in the form:
  - Recipient Name (required)
  - Phone Number (required)
  - Email (optional)
  - Blood Group Needed (required)
  - Search Radius in km (required, 1-100)
  - Message (optional)
- Click **"📍 Capture Current Location"** button
- Click **"🚨 Send SOS Alert"**

**What happens:**
- Creates an SOS request in the database
- Finds nearby compatible donors
- Sends email notifications (if SendGrid configured)
- Sends SMS notifications (if Twilio configured)
- Emits real-time socket event (if Socket.IO server running)
- Shows notification count in success message

**Prerequisites:**
- Set `NEXT_PUBLIC_BASE_URL` in `.env` (for Socket.IO)
- Optional: Configure SendGrid for emails
- Optional: Configure Twilio for SMS

---

### 3️⃣ **Intelligent Donor Matching** 🧭
**API Endpoint:** `POST /api/match`

**How to test (using browser console or Postman):**
```javascript
fetch('/api/match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bloodGroup: 'O+',
    latitude: 28.6139,
    longitude: 77.2090,
    maxDistanceKm: 50,
    weights: {
      distance: 0.6,      // 60% weight on proximity
      availability: 0.25, // 25% weight on availability
      recency: 0.15      // 15% weight on donation recency
    }
  })
})
.then(r => r.json())
.then(console.log);
```

**Response includes:**
- `count`: Number of matching donors
- `donors`: Array of donors with:
  - Donor details
  - `distanceKm`: Distance from request location
  - `score`: Weighted compatibility score
  - `components`: Score breakdown

**What it does:**
- Finds compatible blood type donors
- Filters by distance
- Ranks by weighted score (distance + availability + recency)
- Returns sorted list (best matches first)

---

### 4️⃣ **Donor Registration with Geolocation** 📝
**Route:** `/DonorForm`

**How to test:**
- Click **"Register Donor"** in the navbar
- Fill in all required fields
- When you submit, the form will:
  - ✅ Automatically capture your location (if permission granted)
  - ✅ Send latitude/longitude to the API
- After submission, check `/Map` to see your marker

**What's new:**
- Automatically captures geolocation on form submit
- Stores coordinates in database for matching

**Prerequisites:**
- Allow location access when prompted

---

### 5️⃣ **Real-Time Notifications** 🔔
**How to test:**

**Option A: Using Socket.IO Client Hook**
Create a component that listens for SOS events:
```tsx
"use client";
import { useEffect } from "react";
import { useSocket } from "@/app/hooks/useSocket";

export default function AlertListener() {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on("sos:new", (payload: any) => {
      alert(`New SOS Alert! Blood Group: ${payload.sos.bloodGroup}`);
      console.log("SOS Payload:", payload);
    });
    return () => socket.off("sos:new");
  }, [socket]);

  return <div>Socket: {connected ? "✅ Connected" : "❌ Disconnected"}</div>;
}
```

**Option B: Check Email/SMS**
- Send an SOS request
- Check donor email addresses (if SendGrid configured)
- Check donor phone numbers (if Twilio configured)

**Prerequisites:**
- Socket.IO server must be initialized (visiting `/api/socket` does this)
- Set `NEXT_PUBLIC_BASE_URL` in `.env`

---

### 6️⃣ **Nearby Donors API** 📍
**API Endpoint:** `GET /api/donors/nearby?lat=28.6139&lon=77.2090&radiusKm=10`

**How to test:**
- Open browser console or use Postman
- Make GET request with query parameters:
  - `lat`: Latitude
  - `lon`: Longitude
  - `radiusKm`: Search radius

**Response:**
```json
{
  "success": true,
  "count": 5,
  "donors": [
    {
      "id": "...",
      "firstName": "John",
      "bloodGroup": "O+",
      "latitude": 28.6140,
      "longitude": 77.2091,
      "distanceKm": 0.12
    }
  ]
}
```

---

### 7️⃣ **Active SOS Requests** 📋
**API Endpoint:** `GET /api/requests/active`

**How to test:**
- Make GET request to `/api/requests/active`
- Returns all active emergency requests
- Used by Map page to show red markers

---

### 8️⃣ **Blood Bank Management (Admin)** 🏥
**API Endpoint:** `/api/banks`

**How to test (requires admin role):**
```javascript
// GET all banks
fetch('/api/banks').then(r => r.json()).then(console.log);

// POST new bank (requires admin header)
fetch('/api/banks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-role': 'admin'  // Admin role required
  },
  body: JSON.stringify({
    name: "City Blood Bank",
    phone: "1234567890",
    email: "bank@example.com",
    address: "Main Street",
    state: "Delhi",
    city: "New Delhi",
    latitude: 28.6139,
    longitude: 77.2090,
    stock: { "A+": 10, "O-": 2 }
  })
});
```

---

## 🔧 Prerequisites Checklist

### Required:
- ✅ `DATABASE_URL` - MongoDB connection string
- ✅ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - For map visualization
- ✅ `NEXT_PUBLIC_BASE_URL` - For Socket.IO broadcasts (e.g., `http://localhost:3000`)

### Optional (for notifications):
- ⚙️ `SENDGRID_API_KEY` - For email notifications
- ⚙️ `SENDGRID_FROM_EMAIL` - Verified sender email
- ⚙️ `TWILIO_ACCOUNT_SID` - For SMS notifications
- ⚙️ `TWILIO_AUTH_TOKEN` - Twilio auth token
- ⚙️ `TWILIO_FROM_NUMBER` - Twilio phone number (E.164 format)

---

## 🧪 Testing Workflow

1. **Register a few donors:**
   - Go to `/DonorForm`
   - Register 2-3 donors with different blood types
   - Allow location access for each

2. **View on map:**
   - Go to `/Map`
   - You should see green markers for your donors
   - Adjust radius slider to see more/fewer donors

3. **Create an SOS request:**
   - Go to `/SOS`
   - Fill form and capture location
   - Submit SOS
   - Check success message for notification count

4. **Check map again:**
   - Go back to `/Map`
   - You should see a red marker for the SOS request

5. **Test matching API:**
   - Use browser console to call `/api/match`
   - Check the ranked results

---

## 📝 Notes

- **Location Permission:** Browsers require HTTPS for geolocation in production (except localhost)
- **Socket.IO:** Must visit `/api/socket` endpoint first to initialize the server
- **Real-time:** Socket events work best when multiple browsers/tabs are open
- **Notifications:** Email/SMS only work if respective services are configured

---

## 🐛 Troubleshooting

**Map not loading:**
- Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
- Check browser console for API errors
- Verify Google Maps API is enabled in Google Cloud Console

**SOS not sending notifications:**
- Check `NEXT_PUBLIC_BASE_URL` is set correctly
- Verify SendGrid/Twilio credentials if using
- Check server logs for errors

**No donors showing:**
- Ensure donors have `latitude` and `longitude` set
- Check donors are within your search radius
- Verify `available` field is `true`

**Socket not connecting:**
- Ensure `NEXT_PUBLIC_BASE_URL` matches your current URL
- Check server is running
- Verify `/api/socket` endpoint is accessible

