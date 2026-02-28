# File uploads (Cloudinary)

Profile pictures and document uploads use **Cloudinary**.

## 1. Create a Cloudinary account

1. Go to [cloudinary.com](https://cloudinary.com) and sign up (free tier available).
2. In the **Dashboard**, note:
   - **Cloud name**
   - **API Key**
   - **API Secret**

## 2. Backend `.env`

Add to `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Restart the backend. If these are missing, uploads will return "File storage unavailable" (503).

## Usage

- **Profile picture:** In the app sidebar, click your avatar/initial to choose an image (JPEG, PNG, GIF, WebP). Files are stored under `clinic/avatars/{userId}/`.
- **Documents:** Use `POST /api/upload` with `type: document` and a `file` (PDF or image). Stored under `clinic/documents/{userId}/`.
