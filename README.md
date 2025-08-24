# Gmail Campaign Desktop

A professional cross-platform desktop application for creating and sending Gmail campaigns with Google Sheets integration, built with Electron, React, and TypeScript.

## ✨ Features

- **🔐 Google OAuth Integration**: Secure authentication with Gmail accounts
- **📊 Google Sheets Integration**: Load recipient data directly from spreadsheets
- **✍️ Rich Text Editor**: WYSIWYG email composition with TipTap
- **🎯 Dynamic Placeholders**: Personalize emails with `((column_name))` syntax
- **📱 Multiple Sessions**: Manage multiple Gmail accounts in tabs
- **📅 Campaign Scheduling**: Schedule campaigns for future delivery
- **⚡ Batch Processing**: Send emails in configurable batches
- **📝 Templates**: Save and reuse campaign templates
- **📈 Real-time Preview**: See how emails look with actual data
- **🎨 Theme Support**: Light, dark, and system themes
- **🔄 Auto-updates**: Automatic updates via GitHub releases

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud Console project with OAuth 2.0 credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gmail-campaign-desktop.git
   cd gmail-campaign-desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Gmail API and Google Sheets API
   - Create OAuth 2.0 credentials
   - Add test users (only test users can authenticate)
   - Update the credentials in `src/contexts/AuthContext.tsx`

4. **Run the application**
   ```bash
   npm run dev
   ```

## 🏗️ Development

### Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── CampaignTab.tsx # Main campaign interface
│   ├── RichTextEditor.tsx # WYSIWYG editor
│   └── ...
├── contexts/            # React contexts
│   ├── AuthContext.tsx # Authentication state
│   ├── CampaignContext.tsx # Campaign management
│   └── ThemeContext.tsx # Theme management
├── lib/                 # Utility functions
└── main.tsx            # App entry point

electron/
└── main.ts             # Electron main process

.github/
└── workflows/          # CI/CD pipelines
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run dist` - Build Electron app
- `npm run dist:win` - Build Windows installer
- `npm run dist:mac` - Build macOS package
- `npm run dist:linux` - Build Linux AppImage

## 📱 Building Distributables

### Windows (NSIS Installer)
```bash
npm run dist:win
```

### macOS (PKG Package)
```bash
npm run dist:mac
```

### Linux (AppImage)
```bash
npm run dist:linux
```

## 🔧 Configuration

### Google OAuth Setup

1. **Create OAuth 2.0 credentials**
   - Application type: Desktop application
   - Scopes: Gmail API, Google Sheets API
   - Redirect URI: `http://localhost`

2. **Add test users**
   - Only users added as test users can authenticate
   - Maximum 100 test users per project

3. **Update credentials**
   - Replace the hardcoded credentials in `src/contexts/AuthContext.tsx`
   - Keep credentials secure and don't commit to public repositories

### Campaign Settings

- **Batch Size**: Number of emails per batch (Gmail limit: 500/day)
- **Batch Interval**: Time between batches in minutes
- **Status Column**: Google Sheets column for tracking email status
- **Scheduling**: Set future delivery date and time

## 📊 Google Sheets Format

Your Google Sheet should have:
- **Headers row**: Column names (e.g., `email`, `name`, `company`)
- **Data rows**: Recipient information
- **Status column**: Optional column for tracking email status

Example:
| email | name | company | status |
|-------|------|---------|---------|
| john@example.com | John Doe | Tech Corp | |
| jane@example.com | Jane Smith | Design Inc | |

## ✉️ Email Templates

Use placeholders to personalize emails:

- **Subject**: `Welcome to ((company)), ((name))!`
- **Body**: `Hi ((name)),\n\nThank you for joining ((company)).`

The app automatically replaces `((column_name))` with values from each row.

## 🔄 Auto-updates

The app automatically checks for updates and downloads them from GitHub releases. To release a new version:

1. **Create a tag**
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

2. **GitHub Actions will automatically**
   - Build for all platforms
   - Create a release
   - Generate update files
   - Notify users of available updates

## 🛠️ Troubleshooting

### Common Issues

1. **OAuth Error**: Ensure credentials are correct and test users are added
2. **Gmail API Quota**: Check your Google Cloud Console quotas
3. **Build Errors**: Ensure Node.js version is 18+ and all dependencies are installed

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Create an issue on GitHub
- Check the documentation
- Review common troubleshooting steps

## 🔒 Security

- OAuth credentials are hardcoded (as requested) but should be kept secure
- Only test users can authenticate
- All data is stored locally
- No sensitive information is transmitted to external servers

---

**Note**: This application is designed for legitimate email marketing campaigns. Please ensure compliance with email marketing laws and Gmail's terms of service.
