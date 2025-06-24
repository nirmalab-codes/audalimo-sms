# 🚀 Release Guide - SMS Webhook App

## 📋 Overview

This guide explains how to create releases for the SMS Webhook app using debug APK builds. No signing keys required!

## 🔄 Release Process

### **Automatic Release (Recommended)**

1. **Create and push a version tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions will automatically:**
   - Build the web app
   - Generate debug APK
   - Create GitHub release
   - Upload APK to release assets

### **Manual Release**

1. **Trigger workflow manually:**
   - Go to Actions tab in GitHub
   - Select "Build and Release APK"
   - Click "Run workflow"
   - Choose branch and run

## 📦 Release Types

### **Debug APK Release**
- **Trigger**: Push version tags (`v*.*.*`)
- **Workflow**: `.github/workflows/build-debug.yml`
- **Output**: Debug APK ready for testing and distribution
- **Requirements**: None (no signing keys needed)

### **Development Build**
- **Trigger**: Push to main/develop branches
- **Workflow**: Same workflow, but no release created
- **Output**: Debug APK for testing (artifacts only)

## 🏷️ Version Tagging

### **Semantic Versioning**
Follow [SemVer](https://semver.org/) format: `vMAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### **Examples:**
```bash
# First release
git tag v1.0.0

# Bug fix
git tag v1.0.1

# New feature
git tag v1.1.0

# Breaking change
git tag v2.0.0
```

## 📱 APK Distribution

### **GitHub Releases**
- **URL**: `https://github.com/nirmalab-codes/audalimo-sms/releases`
- **Direct Download**: Latest release badge in README
- **File Naming**: `SMS-Webhook-v1.0.0.apk`

### **Installation Instructions**
1. Download APK from releases page
2. Enable "Install from Unknown Sources" in Android settings
3. Install the APK file
4. Grant SMS permissions when prompted

## 🔧 Local Build Commands

### **Build Debug APK Locally**
```bash
# Install dependencies
yarn install

# Build web app
yarn build

# Sync Capacitor
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

## 📊 Release Checklist

### **Pre-Release**
- [ ] Update version in `package.json`
- [ ] Test app functionality thoroughly
- [ ] Update README.md with new features
- [ ] Commit all changes

### **Release Process**
- [ ] Create and push version tag
- [ ] Verify GitHub Actions build succeeds
- [ ] Download and test generated APK
- [ ] Update release notes if needed
- [ ] Announce release

### **Post-Release**
- [ ] Monitor for user feedback/issues
- [ ] Update documentation if needed
- [ ] Plan next release features

## 🚨 Troubleshooting

### **Common Build Issues**

#### **Gradle Build Fails**
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

#### **Capacitor Sync Issues**
```bash
# Force sync
npx cap sync android --force
```

### **GitHub Actions Issues**

#### **Workflow Not Triggering**
- Ensure tag format matches `v*.*.*`
- Check workflow file syntax
- Verify repository permissions

#### **Build Fails**
- Check GitHub Actions logs for errors
- Verify Node.js and Java versions
- Test local build first

## 📞 Support

If you encounter issues with releases:

1. **Check GitHub Actions logs** for detailed error messages
2. **Test local builds** to isolate issues
3. **Open an issue** with build logs and error details

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Semantic Versioning](https://semver.org/)

---

**📝 Note**: Debug APKs are perfect for testing and distribution. They work exactly like release APKs but without the complexity of signing keys. 