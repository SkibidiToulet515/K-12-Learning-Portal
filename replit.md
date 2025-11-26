# K-12 Enrichment Portal - Dual Identity Site

## Overview
A dual-identity educational website with a public K-12 Enrichment portal and a hidden admin area protected by client-side AES encryption. Features an elegant navy-themed design with light/dark mode support.

## Project Structure
```
/
├── index.html          # Public K-12 Enrichment portal
├── login.html          # Staff login page with AES encryption
├── admin.html          # Hidden admin portal (games library)
├── style.css           # Global styles with CSS variables and theme support
├── theme.js            # Theme toggle functionality
├── auth.js             # Authentication logic with AES-256 encryption
├── admin.js            # Admin page functionality and game loading
├── server.py           # Python HTTP server
├── games/              # Protected games folder
│   ├── math-quest.html
│   ├── word-explorer.html
│   └── science-lab.html
└── .gitignore
```

## Design System
- **Color Palette**: Navy-purple gradient (#4B6CFB → #8057E3)
- **Typography**: Inter font (400-700 weights)
- **Border Radius**: 12-14px for cards and buttons
- **Shadows**: Subtle rgba(0,0,0,0.05) with darker hover states
- **Theme Support**: Light and dark modes with CSS variables

### CSS Variables
```css
Light Theme:
--bg: #FAFAFE
--card: #FFFFFF
--text: #1A1E3D
--text-light: #4C4F63
--primary: #4B6CFB

Dark Theme:
--bg: #11131C
--card: #1A1E2D
--text: #F1F1F9
--text-light: #D0D3E0
--primary: #7C91FF
```

## Features
- **Public Portal**: K-12 educational content accessible to all visitors
- **Client-Side AES Encryption**: Secure login using CryptoJS library
- **Protected Admin Area**: Hidden games library accessible only after authentication
- **Theme Toggle**: Sun/moon icon for switching between light and dark modes
- **Session Management**: Encrypted session storage with 1-hour timeout
- **Hover Effects**: Card lift animations and button darkening on hover

## Security Implementation
- Username: Admin123
- Password: StaffOnly01-
- Encrypted credential storage using AES-256
- SHA-256 password hashing
- Session-based authentication with automatic timeout
- Redirect protection for unauthorized access

## Technology Stack
- Pure HTML5/CSS3/JavaScript (no backend frameworks)
- CryptoJS 4.1.1 for AES-256 encryption
- Inter font from Google Fonts
- CSS custom properties for theming
- LocalStorage for theme persistence
- SessionStorage for authentication state

## Recent Changes
- 2025-11-26: Visual design overhaul with navy-purple theme
- 2025-11-26: Implemented light/dark mode toggle with sun/moon icons
- 2025-11-26: Added CSS variables for consistent theming
- 2025-11-26: Updated typography to Inter font
- 2025-11-26: Enhanced hover effects on cards and buttons
- 2025-11-26: Fixed credential encryption for proper login

## User Preferences
- Professional, academic design (not childish)
- Navy-themed color palette
- Soft corners and rounded elements
- Theme toggle accessible from navbar
