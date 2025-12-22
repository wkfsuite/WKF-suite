# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Employee permission management system with Node.js/Express backend and vanilla JavaScript frontend. Supports multiple deployment modes: Windows service, Electron desktop app, standalone server, and Android mobile app via Capacitor.

## Commands

### Development & Testing
- `npm start` - Start Node.js server (port 3000)
- `npm run electron-dev` - Run Electron app in development mode
- `npm run test-network` - Test server network accessibility

### Building & Distribution
- `npm run build-win` - Build Windows Electron installer
- `npm run build-all` - Build for Windows and Linux platforms
- `npm run dist` - Create distribution package
- `npm run rebuild-native` - Rebuild native modules for Electron

### Mobile Development
- `npm run android-setup` - View Android setup instructions
- `npx cap sync android` - Sync Capacitor Android project
- `npx cap run android` - Build and run on Android device

## Architecture

### Technology Stack
- **Backend:** Node.js with Express.js, SQLite3 database
- **Frontend:** Vanilla JavaScript, HTML5/CSS3, Chart.js for data visualization
- **Desktop:** Electron with system tray integration
- **Mobile:** Capacitor for hybrid Android app
- **Security:** bcryptjs password hashing, express-session authentication

### Key Files
- `server.js` (909 lines) - Main Express server with API endpoints and business logic
- `electron-main.js` (364 lines) - Electron app entry point with system tray
- `public/` - Frontend web application files
- `data/database.sqlite` - SQLite database with users, requests, WiFi config

### Database Schema
- `utenti` - User accounts with role-based access (admin/supervisore/segreteria/dipendente)
- `richieste` - Permission requests with approval workflow
- `wifi` - WiFi credentials for QR code generation

### Authentication System
Session-based authentication with four user roles and secure cookie handling. Default credentials available in installation docs.

### API Structure
RESTful endpoints organized by functionality:
- `/api/auth/*` - Authentication operations
- `/api/richieste/*` - Permission request CRUD
- `/api/utenti/*` - User management (admin only)
- `/api/statistiche/*` - Dashboard statistics and reporting
- `/api/wifi/*` - WiFi QR code generation

## Deployment Options

1. **Windows Service** - Auto-start with Windows using `installa-servizio.bat`
2. **Electron Desktop** - User-friendly GUI with system tray icon
3. **Standalone Server** - Manual Node.js execution for development
4. **Android APK** - Mobile app via Capacitor framework

## Development Notes

### Database
SQLite database auto-initializes with default users and schema on first run. Located in `data/` directory.

### SSL Support
Server supports HTTPS with certificates in `ssl/` directory. Auto-detects and uses if present.

### Mobile Development Workflow
1. Develop web interface in `public/` directory
2. Test in browser at localhost:3000
3. Sync mobile project with `npx cap sync android`
4. Build APK with Android Studio or Capacitor CLI

### Key Features
- Role-based permission workflow (submit → approve/reject)
- PDF report generation with company branding
- WiFi QR code generation for employee auto-connection
- Real-time dashboard with statistics and charts
- Multi-platform responsive interface

Comprehensive documentation available in README-*.md and MANUALE-*.md files for detailed setup and deployment instructions.