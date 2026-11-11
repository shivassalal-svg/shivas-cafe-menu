# Shiva’s Cafe · Digital Menu & Admin Studio

A clean, modern, standalone digital menu and real-time administration studio for **Shiva’s Cafe** in Salal, Gujarat.

Built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**.

---

## 🌐 Live Deployments

- **Customer QR Menu**: [https://shivas-cafe-menu.vercel.app](https://shivas-cafe-menu.vercel.app)
- **Admin Studio**: [https://shivas-cafe-menu.vercel.app/admin](https://shivas-cafe-menu.vercel.app/admin)
- **GitHub Repository**: [https://github.com/shivassalal-svg/shivas-cafe-menu](https://github.com/shivassalal-svg/shivas-cafe-menu)
- **Vercel Project**: [https://vercel.com/shivassalal-5567/shivas-cafe-menu](https://vercel.com/shivassalal-5567/shivas-cafe-menu)

---

## ✨ Features

- **📱 Customer QR Menu (`/`)**:
  - View-only, mobile-optimized browsing experience for dining guests.
  - Sticky category navigation for 30+ café categories (Beverages, Sandwiches, Pizzas, Shakes, etc.).
  - High-resolution dish photography, descriptions, sizes, and INR (₹) pricing.
  - **Live Out-of-Stock Showcase**: Unavailable items display an `OUT OF STOCK` badge, dimmed card presentation, and a `Currently unavailable` tag.

- **🛠️ Admin Studio (`/admin`)**:
  - **Standalone PIN Authentication**: Secure cookie session without proprietary third-party proxies.
  - **1-Click Stock Management**: Instantly toggle any menu item (`🟢 In stock` ↔ `🔴 Out of stock`) with zero page reloads.
  - **Quick Stock Filter**: Filter by *All Items* or *Out of stock only* to audit availability at a glance.
  - **Full Menu Editing**: Add, rename, or remove categories; create, edit, or delete menu items.
  - **Dynamic QR Code**: Generates and displays the customer QR code ready for tabletop printing.

---

## 🔐 Admin Authentication

The café owner can log in at `/admin`:
- **Default PIN**: `shiva123`
- To customize the PIN, set the `ADMIN_PIN` or `ADMIN_PASSWORD` environment variable in Vercel or in `.env.local`:
  ```bash
  ADMIN_PIN="your_secure_pin"
  ```

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>=20.0.0` (Recommended: Node 22+)
- npm

### Installation & Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/shivassalal-svg/shivas-cafe-menu.git
   cd shivas-cafe-menu
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) for the customer menu or [http://localhost:3000/admin](http://localhost:3000/admin) for the studio.

### Production Build

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
├── app/
│   ├── admin/
│   │   ├── admin-login.tsx      # Owner PIN authentication form
│   │   ├── menu-manager.tsx     # Admin studio & 1-click stock manager
│   │   └── page.tsx             # Studio access gate & dashboard
│   ├── api/
│   │   ├── admin/auth/route.ts  # Session login/logout API
│   │   └── menu/route.ts        # Menu queries, item editing, stock toggling
│   ├── lib/
│   │   ├── admin.ts             # Admin cookie session validation
│   │   └── menu.ts              # Menu storage engine (local & Vercel Blob)
│   ├── globals.css              # Custom styling & out-of-stock badges
│   ├── layout.tsx               # Root HTML metadata & font setup
│   └── page.tsx                 # Customer QR menu
├── data/
│   └── source-menu.json         # Authoritative menu data
├── public/
│   ├── favicon.svg              # Cafe brand icon
│   └── menu-images/             # Item photo catalog
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## ☁️ Deployment

The project is preconfigured for zero-config deployments on **Vercel**. Every push to the `main` branch can trigger an automatic deployment when linked in your Vercel project settings.
