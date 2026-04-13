# Media Service

The **Media Service** is a dedicated utility for handling static assets such as product images, category icons, and promotional banners. It provides a standardized way to upload and retrieve multipart files.

## 🛠️ Technical Design

- **Framework**: Spring Boot 3.
- **Storage**: **Local File System** (mapped to a Docker volume for persistence).
- **Security**: JWT-based authorization for upload endpoints.

## ⚙️ Configurational Design

### Environment Variables
| Variable | Description | Default |
| :--- | :--- | :--- |
| `SERVER_PORT` | Service port | `4010` |
| `MEDIA_UPLOAD_DIR` | Directory path for file storage | `/app/media` |
| `MEDIA_ALLOWED_EXTENSIONS` | comma-separated allowed types | `jpg,jpeg,png,gif,webp,mp4` |

## ✨ Key Features

- **Multipart Upload Support**: Handles large file uploads with configurable limits (default 50MB).
- **Public Retrieval**: Optimized for serving images to the storefront and admin panel.
- **Extension Validation**: Enforces strict file type checks for security.

## 🔄 Interaction Flow

```mermaid
graph TD
    Admin[Admin User] -->|POST /api/media/upload| MediaSvc[Media Service]
    MediaSvc -->|Save| Storage[(Disk / Volume)]
    Storefront[Storefront User] -->|GET /api/media/{filename}| MediaSvc
    MediaSvc -->|Read| Storage
```

## 📖 Use Cases

- **Product Cataloging**: Admins upload high-resolution product photos.
- **Banner Management**: Marketing team uploads promotional media for the home screen.
- **Static Content**: Hosting icons and branding assets used across the web app.
