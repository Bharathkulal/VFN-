# 🚀 Production Deployment Guide: VFN Tournament 2026

This guide covers deploying the **FastAPI Backend on Render** and the **Next.js Frontend on Vercel**.

---

## 🏗️ Architecture Overview

| Component | Platform | Technology | Primary Config |
| :--- | :--- | :--- | :--- |
| **Backend API** | [Render](https://render.com) | Python 3.11+ / FastAPI / Uvicorn | `render.yaml` & `backend/requirements.txt` |
| **Frontend UI** | [Vercel](https://vercel.com) | Next.js 16 / React 19 / TypeScript | Root `package.json` |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | MongoDB 6+ (Free M0 Tier) | Connection URI |
| **Media / CDN** | [Cloudinary](https://cloudinary.com) | Cloudinary Storage | Cloud Name, API Key & Secret |

---

## Step 1: Prerequisites & Cloud Services Setup

Before deploying to Render and Vercel, ensure you have:

### 1.1 MongoDB Atlas (Free Cloud Database)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a new **Free Shared Cluster (M0)** (choose AWS/GCP, region closest to your users e.g., Mumbai/Singapore).
3. Under **Security → Database Access**, create a user (e.g. username `vfnadmin`, secure password).
4. Under **Security → Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Under **Deployment → Database**, click **Connect** → **Drivers** (Python 3.12+).
6. Copy your connection URI. It looks like:
   ```env
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
   *(Replace `<username>` and `<password>` with your credentials).*

### 1.2 Cloudinary (Free Image Storage)
1. Sign up at [cloudinary.com](https://cloudinary.com).
2. Go to your **Dashboard**.
3. Note your:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

---

## Step 2: Deploy the Backend on Render

You can deploy using **Method A (Render Blueprint - Recommended)** or **Method B (Manual Web Service)**.

### Method A: 1-Click Blueprint (Recommended)
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Configure deployment for Render and Vercel"
   git push origin main
   ```
2. Log in to [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository (`Bharathkulal/VFN-`).
5. Render will automatically detect `render.yaml` and prompt you for the required environment variables:
   - `MONGODB_URL`: Your MongoDB Atlas URI.
   - `CORS_ORIGINS`: Temporary value `http://localhost:3000` (we'll update this with the Vercel URL later).
   - `ADMIN_PASSWORD`: A secure password for the admin dashboard.
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary Cloud Name.
   - `CLOUDINARY_API_KEY`: Your Cloudinary API Key.
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API Secret.
6. Click **Apply**.
7. Once deployed, copy your backend service URL (e.g., `https://vfn-tournament-backend.onrender.com`).
8. Verify it works by opening `https://vfn-tournament-backend.onrender.com/health` in your browser.

---

### Method B: Manual Web Service
If you prefer creating the Web Service manually:
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repo.
3. Configure the following fields:
   - **Name:** `vfn-tournament-backend`
   - **Region:** `Singapore` (or region closest to you)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank / empty)*
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free`
4. Expand **Advanced** and add the following **Environment Variables**:

| Key | Value / Example | Notes |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Ensures compatible Python environment |
| `MONGODB_URL` | `mongodb+srv://...` | From MongoDB Atlas |
| `DATABASE_NAME` | `sportbid_vfn` | Database name |
| `JWT_SECRET` | *(64-char random string)* | Used for signing tokens |
| `JWT_ALGORITHM` | `HS256` | Token algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | 24 hours |
| `CORS_ORIGINS` | `http://localhost:3000` | Will add Vercel URL in Step 4 |
| `ADMIN_EMAIL` | `admin@vfn.com` | Initial admin account |
| `ADMIN_PASSWORD` | `YourSecurePassword2026!` | Initial admin password |
| `ADMIN_FULL_NAME` | `Tournament Admin` | Admin display name |
| `CLOUDINARY_CLOUD_NAME` | `...` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | `...` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | `...` | From Cloudinary dashboard |

5. Under **Health Check Path**, enter `/health`.
6. Click **Create Web Service**.

---

## Step 3: Deploy the Frontend on Vercel

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`Bharathkulal/VFN-`).
4. Configure Project:
   - **Framework Preset:** `Next.js` (detected automatically)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
5. Under **Environment Variables**, add:

| Key | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://vfn-tournament-backend.onrender.com` *(Your Render backend URL without trailing slash)* |

6. Click **Deploy**.
7. Vercel will build and deploy the Next.js app in about 1–2 minutes!
8. Copy your live Vercel domain (e.g., `https://vfn-app.vercel.app`).

---

## Step 4: Link Frontend & Backend (Update CORS)

1. Return to your Render Dashboard → **vfn-tournament-backend** → **Environment**.
2. Find `CORS_ORIGINS`.
3. Update it to include your Vercel URL and localhost:
   ```text
   https://vfn-app.vercel.app,http://localhost:3000
   ```
   *(Note: The backend also has automatic regex matching for all `https://*.vercel.app` preview branches).*
4. Click **Save Changes**. Render will automatically redeploy with the updated CORS rule.

---

## Step 5: Verification Checklist

- [ ] Open your Vercel app URL (`https://your-app.vercel.app`).
- [ ] Submit a test player registration with a photo.
- [ ] Open `/admin/login` and sign in with `admin@vfn.com` and your configured password.
- [ ] Check `/admin/dashboard` to see the registered player and generated poster.
- [ ] Verify the poster preview and player photo load from Cloudinary CDN.
