# 📱 SMS Webhook - Real-time SMS Forwarding App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com/)
[![Ionic](https://img.shields.io/badge/Framework-Ionic-blue.svg)](https://ionicframework.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)

> **Professional SMS to Webhook Forwarder** - Forward incoming SMS messages to your webhook endpoints instantly with persistent background monitoring, deduplication, and VPN-like foreground service.

## 🚀 **Features**

### 📨 **SMS Management**
- ✅ **Real-time SMS monitoring** with persistent background service
- ✅ **Instant webhook forwarding** for incoming SMS messages
- ✅ **Duplicate prevention** system to avoid multiple webhook calls
- ✅ **Message history** with comprehensive logging
- ✅ **OTP & notification forwarding** perfect for automation

### 🔧 **Advanced Configuration**
- ✅ **Custom webhook URLs** with HTTPS support
- ✅ **Secret key authentication** for secure webhook calls
- ✅ **Webhook testing** with detailed response logging
- ✅ **Auto-retry mechanism** for failed webhook deliveries
- ✅ **Request signature generation** for webhook verification

### 🛡️ **Background Processing**
- ✅ **VPN-like foreground service** for persistent monitoring
- ✅ **Battery optimization handling** to prevent service termination
- ✅ **Background task management** with automatic restart
- ✅ **System boot auto-start** capability
- ✅ **Android 14+ compatibility** with latest foreground service APIs

### 📊 **Monitoring & Analytics**
- ✅ **Real-time statistics** and message counters
- ✅ **Webhook delivery status** tracking
- ✅ **Service health monitoring** with automatic diagnostics
- ✅ **Activity logs** with detailed error reporting
- ✅ **Performance metrics** and response time tracking

## 🛠️ **Technology Stack**

### **Frontend Framework**
- **[Ionic Framework 8](https://ionicframework.com/)** - Cross-platform mobile app development
- **[React 18](https://reactjs.org/)** - Modern UI library with hooks
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe JavaScript development

### **Mobile Platform**
- **[Capacitor 6](https://capacitorjs.com/)** - Native mobile app runtime
- **[Android SDK](https://developer.android.com/)** - Native Android functionality
- **[Cordova Plugins](https://cordova.apache.org/)** - Device API access

### **Core Plugins & Services**
- **[@capawesome-team/capacitor-android-foreground-service](https://github.com/capawesome-team/capacitor-plugins)** - Persistent foreground service
- **[@anuradev/capacitor-background-mode](https://github.com/anuradev/capacitor-background-mode)** - Background processing
- **[@capawesome/capacitor-background-task](https://github.com/capawesome-team/capacitor-plugins)** - Background task management
- **[capacitor-sms-inbox](https://github.com/abritopach/capacitor-sms-inbox)** - SMS reading capabilities

### **Development Tools**
- **[Vite 5](https://vitejs.dev/)** - Fast build tool and dev server
- **[ESLint](https://eslint.org/)** - Code linting and quality
- **[Yarn](https://yarnpkg.com/)** - Package management
- **[Cypress](https://www.cypress.io/)** - End-to-end testing

### **Build & Deployment**
- **[Capacitor Assets](https://github.com/ionic-team/capacitor-assets)** - Icon and splash screen generation
- **[Android Gradle](https://gradle.org/)** - Android build system
- **[ProGuard](https://www.guardsquare.com/proguard)** - Code obfuscation

## 📦 **Installation**

### **Prerequisites**
- Node.js 18+ and Yarn
- Android Studio with SDK 33+
- Java 17+ (for Android builds)

### **Quick Setup**
```bash
# Clone the repository
git clone https://github.com/josephvoxone/audalimo-sms.git
cd audalimo-sms

# Install dependencies
yarn install

# Build the app
yarn build

# Add Android platform
npx cap add android

# Sync and open in Android Studio
npx cap sync android
npx cap open android
```

### **Development Mode**
```bash
# Start development server
yarn dev

# Run with live reload on device
npx cap run android --livereload --external
```

## 🔧 **Configuration**

### **Webhook Setup**
1. **Configure Webhook URL**: Enter your server endpoint (https://your-server.com/webhook)
2. **Set Secret Key**: Optional authentication key for webhook verification
3. **Test Connection**: Use built-in webhook testing functionality
4. **Save Configuration**: Settings are persisted locally

### **Android Permissions**
The app requires the following permissions:
```xml
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## 📡 **Webhook API**

### **Request Format**
```typescript
interface WebhookPayload {
  message: string;      // SMS message content
  sender: string;       // Sender phone number
  timestamp: number;    // Unix timestamp
  signature: string;    // HMAC signature for verification
}
```

### **HTTP Headers**
```
Content-Type: application/json
X-SMS-Signature: <hmac-signature>
X-SMS-ID: <message-id>
User-Agent: SMS-Webhook-App/1.0
```

### **Example Webhook Endpoint**
```javascript
// Node.js Express example
app.post('/webhook', (req, res) => {
  const { message, sender, timestamp, signature } = req.body;
  
  // Verify signature
  const expectedSignature = generateSignature(message, sender, timestamp, SECRET_KEY);
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process SMS
  console.log(`SMS from ${sender}: ${message}`);
  
  res.json({ status: 'received' });
});
```

## 🎯 **Use Cases**

### **Business Applications**
- **OTP Forwarding**: Automatically forward verification codes to your systems
- **Customer Communication**: Route customer SMS to CRM or support systems
- **Transaction Alerts**: Forward banking/payment SMS to accounting systems
- **Order Notifications**: Integrate SMS confirmations with e-commerce platforms

### **Development & Testing**
- **API Testing**: Receive SMS-based API responses during development
- **Webhook Testing**: Test SMS-triggered workflows and automations
- **Integration Testing**: Validate SMS-dependent application features
- **Monitoring**: Track SMS-based alerts and notifications

### **Personal Automation**
- **Smart Home**: Trigger home automation based on SMS commands
- **Backup Communications**: Forward important SMS to multiple channels
- **Travel Notifications**: Route travel confirmations to itinerary apps
- **Security Alerts**: Forward security codes to password managers

## 🔒 **Security Features**

- **HMAC Signature Verification**: Cryptographic webhook authentication
- **HTTPS Enforcement**: Secure webhook communication
- **Local Data Encryption**: Sensitive settings stored securely
- **Permission Management**: Granular Android permission controls
- **Request Deduplication**: Prevent replay attacks and duplicate processing

## 📱 **Platform Support**

| Platform | Status | Version |
|----------|--------|---------|
| Android | ✅ Supported | 7.0+ (API 24+) |
| iOS | 🚧 Planned | Coming Soon |
| Web | ✅ Development | PWA Ready |

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

### **Development Guidelines**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 **Author**

**Joseph** - *Full Stack Developer & Mobile App Specialist*

- 🌐 GitHub: [@josephvoxone](https://github.com/josephvoxone)
- 📧 Email: joseph@nirmalab.com
- 🏢 Company: [Nirmalab](https://nirmalab.com)
- 💼 LinkedIn: [Joseph Voxone](https://linkedin.com/in/josephvoxone)

## 💝 **Support This Project**

If this SMS Webhook app helps your business or development workflow, consider supporting its development:

### **🇮🇩 Indonesian Payment Methods**

#### **💳 GoPay / OVO / DANA**
![QR Code](https://via.placeholder.com/200x200/FF6B00/FFFFFF?text=QR+Code)
> *Scan QR code untuk donasi via e-wallet Indonesia*

#### **🏦 Bank Transfer (Indonesia)**
- **Bank BCA**: `1234567890` (a.n. Joseph)
- **Bank Mandiri**: `1234567890` (a.n. Joseph)
- **Bank BNI**: `1234567890` (a.n. Joseph)

#### **☕ Trakteer (Indonesian Buy Me Coffee)**
[![Trakteer](https://img.shields.io/badge/Trakteer-Support-orange.svg)](https://trakteer.id/josephvoxone)

### **🌍 International Payment Methods**

#### **💰 GitHub Sponsors**
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub-pink.svg)](https://github.com/sponsors/josephvoxone)

#### **🎯 PayPal**
[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://paypal.me/josephnirmalab)
> Send to: `joseph@nirmalab.com`

#### **☕ Buy Me a Coffee**
[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://www.buymeacoffee.com/josephvoxone)

### **🪙 Cryptocurrency**
- **USDT (BSC/BEP20)**: `0x096b0fc77a87d5e1d0a1184df656b83dfb2984d5`
- **Bitcoin (BTC)**: *Contact for address*
- **Ethereum (ETH)**: *Contact for address*
- **Binance Coin (BNB)**: *Use BSC address above*

### **📱 Indonesian Digital Wallets**
- **ShopeePay**: [Link ShopeePay](https://shopee.co.id/pay/josephvoxone)
- **LinkAja**: `08123456789`
- **Jenius**: `$josephvoxone`

## 🌟 **Star History**

[![Star History Chart](https://api.star-history.com/svg?repos=josephvoxone/audalimo-sms&type=Date)](https://star-history.com/#josephvoxone/audalimo-sms&Date)

## 📈 **Project Stats**

![GitHub stars](https://img.shields.io/github/stars/josephvoxone/audalimo-sms?style=social)
![GitHub forks](https://img.shields.io/github/forks/josephvoxone/audalimo-sms?style=social)
![GitHub issues](https://img.shields.io/github/issues/josephvoxone/audalimo-sms)
![GitHub pull requests](https://img.shields.io/github/issues-pr/josephvoxone/audalimo-sms)

## 🔍 **Keywords**

`sms webhook` `android sms forwarder` `sms to webhook` `real-time sms` `sms automation` `ionic sms app` `capacitor sms` `webhook forwarding` `sms monitoring` `background sms service` `foreground service android` `sms api integration` `otp forwarding` `sms bridge` `webhook relay` `sms gateway` `mobile webhook` `android background service` `sms notification forwarding` `real-time messaging`

---

<div align="center">

**⭐ Star this repository if it helps you! ⭐**

*Made with ❤️ by [Joseph](https://github.com/josephvoxone) from Indonesia 🇮🇩*

</div> 