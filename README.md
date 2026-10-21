# DigiVault

A secure digital document vault built with Spring Boot. Users register, log in, and upload, download and delete their own documents. Authentication uses JWT tokens and passwords are hashed with BCrypt.

## Features

- User registration and login with JWT authentication
- Passwords stored as BCrypt hashes
- Upload documents (up to 10 MB), organised into categories
- Files are encrypted at rest with AES-256-GCM
- Search by name and filter by category
- Preview PDFs, images and text files in the browser
- AI summaries of PDF, DOCX and text documents (OpenAI API)
- List, download and delete your documents
- Each user can only access their own files

## Tech Stack

- **Backend:** Java 17, Spring Boot 4, Spring Security, Spring Data JPA
- **Database:** MySQL 8
- **Auth:** JWT (jjwt 0.11.5)
- **Files:** AES-256-GCM encryption, Apache PDFBox and Apache POI for text extraction
- **AI:** OpenAI Chat Completions API
- **Frontend:** HTML, CSS, JavaScript (served by Spring Boot)

## Project Structure

```
src/main/java/com/digivault/
├── config/       SecurityConfig, WebConfig (CORS)
├── controller/   AuthController, DocumentController
├── dto/          RegisterRequest, LoginRequest, AuthResponse
├── entity/       User, Document
├── repository/   UserRepository, DocumentRepository
├── security/     JwtUtil, JwtAuthFilter, CustomUserDetailsService
└── service/      AuthService, DocumentService

src/main/resources/static/
├── index.html      Login page
├── register.html   Registration page
├── dashboard.html  Document dashboard
├── css/style.css
└── js/             auth.js, dashboard.js
```

## API Endpoints

| Method | Endpoint                        | Auth | Description              |
|--------|---------------------------------|------|--------------------------|
| POST   | `/api/auth/register`            | No   | Create an account        |
| POST   | `/api/auth/login`               | No   | Log in and get a JWT     |
| POST   | `/api/documents/upload`         | Yes  | Upload a file            |
| GET    | `/api/documents`                | Yes  | List your documents      |
| GET    | `/api/documents/download/{id}`  | Yes  | Download a document      |
| POST   | `/api/documents/{id}/summarize` | Yes  | AI summary of a document |
| DELETE | `/api/documents/{id}`           | Yes  | Delete a document        |

Authenticated requests need the header `Authorization: Bearer <token>`.

## How to Run

### Prerequisites

- Java 17
- MySQL 8

### 1. Create the database

```sql
CREATE DATABASE digivault;
```

### 2. Set environment variables

All secrets are read from environment variables, so they are never stored in the code.

| Variable              | Required | Description                                              |
|-----------------------|----------|----------------------------------------------------------|
| `DB_PASSWORD`         | Yes      | MySQL root password                                      |
| `FILE_ENCRYPTION_KEY` | Yes      | Base64-encoded 32-byte AES key for encrypting files      |
| `JWT_SECRET`          | No       | Random string, 32+ characters (a dev fallback is used)   |
| `OPENAI_API_KEY`      | No       | Enables AI summaries                                     |
| `OPENAI_MODEL`        | No       | OpenAI model name (default `gpt-4o-mini`)                |

Generate an encryption key:

```powershell
# Windows (PowerShell)
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

```bash
# Linux / macOS
openssl rand -base64 32
```

Then set the variables, for example on Windows:

```powershell
$env:DB_PASSWORD = "your-mysql-root-password"
$env:FILE_ENCRYPTION_KEY = "the-key-generated-above"
$env:OPENAI_API_KEY = "sk-..."
```

> **Keep `FILE_ENCRYPTION_KEY` safe.** If it is lost, uploaded files cannot be decrypted.

### 3. Start the app

```powershell
.\mvnw.cmd spring-boot:run     # Windows
./mvnw spring-boot:run         # Linux / macOS
```

Open http://localhost:8080 in your browser. Tables are created automatically on first start.
