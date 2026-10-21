# DigiVault

A secure digital document vault built with Spring Boot. Users register, log in, and upload, download and delete their own documents. Authentication uses JWT tokens and passwords are hashed with BCrypt.

## Features

- User registration and login with JWT authentication
- Passwords stored as BCrypt hashes
- Upload documents (up to 10 MB)
- List, download and delete your documents
- Each user can only access their own files

## Tech Stack

- **Backend:** Java 17, Spring Boot 4, Spring Security, Spring Data JPA
- **Database:** MySQL 8
- **Auth:** JWT (jjwt 0.11.5)
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

The database password and JWT secret are read from environment variables, so they are never stored in the code.

Windows (PowerShell):

```powershell
$env:DB_PASSWORD = "your-mysql-root-password"
$env:JWT_SECRET  = "any-random-string-at-least-32-characters-long"
```

Linux / macOS:

```bash
export DB_PASSWORD="your-mysql-root-password"
export JWT_SECRET="any-random-string-at-least-32-characters-long"
```

`JWT_SECRET` is optional for local development (a fallback is used), but set it for any real deployment.

### 3. Start the app

```powershell
.\mvnw.cmd spring-boot:run     # Windows
./mvnw spring-boot:run         # Linux / macOS
```

Open http://localhost:8080 in your browser. Tables are created automatically on first start.
