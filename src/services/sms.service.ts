import { Capacitor } from '@capacitor/core';
import { SMSInboxReader } from 'capacitor-sms-inbox';
import { BackgroundMode } from '@anuradev/capacitor-background-mode';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { BatteryOptimization } from '@capawesome-team/capacitor-android-battery-optimization';

// Native SMS Plugin interface
interface NativeSMSPlugin {
  startSMSMonitoring(options: { webhookUrl: string; webhookSecret: string }): Promise<{ success: boolean; message: string }>;
  stopSMSMonitoring(): Promise<{ success: boolean; message: string }>;
  getSMSServiceStatus(): Promise<{ isActive: boolean; success: boolean }>;
  updateWebhookConfig(options: { webhookUrl: string; webhookSecret: string }): Promise<{ success: boolean; message: string }>;
}

export interface WebhookPayload {
  message: string;
  sender: string;
  timestamp: number;
  signature: string;
}

export interface SMSMessage {
  id: number;
  address: string;
  body: string;
  date: number;
  type: number;
}

class SMSService {
  private webhookUrl: string = '';
  private webhookSecret: string = '';
  private isListening: boolean = false;
  private lastMessageId: number = 0;
  private lastMessageCount: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;
  private messageHistory: SMSMessage[] = [];

  private isBackgroundModeEnabled: boolean = false;
  private isInitialized: boolean = false;
  private isForegroundServiceRunning: boolean = false;
  
  // Track processed messages to prevent duplicates
  private processedMessageIds: Set<number> = new Set();
  private webhookCallsInProgress: Set<number> = new Set();

  // Optimized polling interval (3 seconds for balance)
  private readonly POLLING_INTERVAL = 3000;
  private readonly NOTIFICATION_CHANNEL_ID = 'sms_monitor_channel';
  
  // Get native SMS plugin
  private get nativeSMS(): NativeSMSPlugin {
    return (window as any).Capacitor?.Plugins?.NativeSMS;
  }

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      if (Capacitor.isNativePlatform()) {
        await this.initializeNotificationChannel();
        await this.initializeBackgroundMode();
        await this.setupAppStateListener();
        
        // Initialize modern Android features
        await this.initializeModernAndroidFeatures();
      } else {
        console.log('🌐 Running in web mode - SMS monitoring will be simulated');
        // Load sample data for web testing
        this.loadSampleData();
      }
      this.isInitialized = true;
      console.log('✅ SMS Service initialized with foreground service support');
    } catch (error) {
      console.error('❌ Failed to initialize SMS service:', error);
    }
  }

  private async initializeModernAndroidFeatures() {
    try {
      // Simplified Android feature check
      console.log('🔋 Checking Android configuration...');
      console.log('💡 For best performance: Settings → Apps → SMS Webhook → Battery → Unrestricted');
      console.log('✅ Android features initialized');
    } catch (error) {
      console.warn('⚠️ Some Android features unavailable:', error);
    }
  }

  private async initializeNotificationChannel() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Create notification channel for foreground service (following official demo pattern)
      await ForegroundService.createNotificationChannel({
        id: this.NOTIFICATION_CHANNEL_ID,
        name: 'SMS Monitor Service',
        description: 'Persistent SMS monitoring service notifications for webhook forwarding',
        importance: 3 // Default importance (same as demo)
      });
      
      console.log('✅ Notification channel created for foreground service');
    } catch (error) {
      console.error('❌ Failed to create notification channel:', error);
      // Continue without failing - fallback will be used
    }
  }

  private loadSampleData() {
    // Load sample messages for web testing
    const sampleMessages: SMSMessage[] = [
      {
        id: 1,
        address: '+6281234567890',
        body: 'Your OTP code is 123456. Valid for 5 minutes.',
        date: Date.now() - 5 * 60 * 1000,
        type: 1
      },
      {
        id: 2,
        address: 'BCA',
        body: 'Transfer Rp500.000 to JOHN DOE successful. Balance: Rp2.500.000',
        date: Date.now() - 15 * 60 * 1000,
        type: 1
      }
    ];
    this.messageHistory = sampleMessages;
    this.lastMessageCount = sampleMessages.length;
    this.lastMessageId = Math.max(...sampleMessages.map(m => m.id));
    
    // Mark sample messages as processed
    sampleMessages.forEach(msg => this.processedMessageIds.add(msg.id));
  }

  private async initializeBackgroundMode() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Enable background mode as fallback
      await BackgroundMode.enable({
        title: 'SMS Webhook Monitor',
        text: 'Monitoring SMS messages for webhook forwarding',
        icon: 'ic_launcher',
        color: '#007AFF',
        resume: true,
        hidden: false,
        bigText: true,
        silent: false,
        channelName: 'SMS Background Service',
        channelDescription: 'Background SMS monitoring service'
      });
      
      this.isBackgroundModeEnabled = true;
      console.log('🔄 Background mode enabled as fallback');

      // Background mode listeners removed - foreground service handles persistence
      console.log('✅ Background mode configured as fallback only');

    } catch (error) {
      console.error('❌ Failed to initialize background mode:', error);
    }
  }

  // Proper foreground service implementation following Capawesome docs
  private async startForegroundService() {
    if (!Capacitor.isNativePlatform() || this.isForegroundServiceRunning) return;

    try {
      // Check and request notification permissions first (Android 13+)
      const notificationPermission = await ForegroundService.checkPermissions();
      if (notificationPermission.display !== 'granted') {
        const permissionRequest = await ForegroundService.requestPermissions();
        if (permissionRequest.display !== 'granted') {
          console.warn('⚠️ Notification permissions not granted, foreground service may not work properly');
        }
      }

      // Start foreground service with proper configuration following official demo
      await ForegroundService.startForegroundService({
        id: 1,
        title: 'SMS Webhook Active',
        body: `SMS monitoring enabled • Tap "Open App" to manage`,
        smallIcon: 'ic_launcher',
        silent: false,
        notificationChannelId: this.NOTIFICATION_CHANNEL_ID,
        // Add buttons for user interaction (like official demo)
        buttons: [
          {
            id: 1,
            title: 'Open App'
          }
        ]
      });
      
      this.isForegroundServiceRunning = true;
      console.log('🔒 Foreground service started successfully with notification channel');
      
      // Listen for notification button clicks and taps
      ForegroundService.addListener('buttonClicked', async (event) => {
        console.log('🔔 Notification button clicked:', event.buttonId);
        if (event.buttonId === 1) {
          // Move app to foreground when notification is tapped
          try {
            await ForegroundService.moveToForeground();
            console.log('✅ App moved to foreground successfully');
          } catch (err) {
            console.warn('⚠️ Could not move app to foreground:', err);
          }
        }
      });


      
    } catch (error) {
      console.error('❌ Failed to start foreground service:', error);
      // Fallback to background mode if foreground service fails
      console.log('🔄 Falling back to background mode');
    }
  }

  private async updateForegroundService() {
    if (!Capacitor.isNativePlatform() || !this.isForegroundServiceRunning) return;

    try {
      await ForegroundService.updateForegroundService({
        id: 1,
        title: 'SMS Webhook Active',
        body: `${this.messageHistory.length} SMS processed • Last update: ${new Date().toLocaleTimeString()}`,
        smallIcon: 'ic_launcher',
        silent: true, // Updates should be silent (following demo pattern)
        buttons: [
          {
            id: 1,
            title: 'Open App'
          }
        ]
      });
    } catch (error) {
      console.error('❌ Failed to update foreground service:', error);
    }
  }

  private async stopForegroundService() {
    if (!Capacitor.isNativePlatform() || !this.isForegroundServiceRunning) return;

    try {
      // Remove event listeners before stopping service (following demo pattern)
      await ForegroundService.removeAllListeners();
      
      // Stop the foreground service
      await ForegroundService.stopForegroundService();
      this.isForegroundServiceRunning = false;
      console.log('🔓 Foreground service stopped and listeners removed');
    } catch (error) {
      console.error('❌ Failed to stop foreground service:', error);
    }
  }

  // NOTE: Background Task removed - foreground service handles everything
  // Following official Capawesome pattern: use EITHER foreground service OR background task, not both!

  private async setupAppStateListener() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // SIMPLIFIED: Foreground service runs independently, no interference!
      // Following official Capawesome pattern - foreground service is self-contained
      
      console.log('✅ App state monitoring initialized - foreground service runs independently');
      
      // Only monitor app resume to check if service is still alive
      document.addEventListener('resume', async () => {
        console.log('▶️ App resumed - verifying foreground service status');
        
        if (this.isListening) {
          // Just verify, don't interfere
          console.log('✅ SMS monitoring should be running via foreground service');
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to setup app state listener:', error);
    }
  }

  // Initialize method for external use
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    await this.initializeService();
    
    // Check if foreground service is already running when app starts
    await this.syncWithExistingForegroundService();
    
    return this.isInitialized;
  }

  // Detect and sync with existing foreground service
  private async syncWithExistingForegroundService() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Check if foreground service is running by looking for our notification
      // This is a workaround since there's no direct API to check service status
      
      // Load saved state from localStorage
      const savedIsListening = localStorage.getItem('sms_monitoring_active') === 'true';
      const savedWebhookUrl = localStorage.getItem('webhookUrl') || '';
      const savedWebhookSecret = localStorage.getItem('webhookSecret') || '';
      
      console.log('🔄 Checking for existing service state:', {
        savedIsListening,
        hasWebhook: !!savedWebhookUrl
      });

      if (savedIsListening && savedWebhookUrl) {
        console.log('🔄 Restoring previous monitoring session...');
        
        // Restore configuration
        this.webhookUrl = savedWebhookUrl;
        this.webhookSecret = savedWebhookSecret;
        
        // Try to detect if foreground service is still running
        // by attempting to update it
        try {
          await this.updateForegroundService();
          this.isForegroundServiceRunning = true;
          console.log('✅ Detected existing foreground service');
        } catch (error) {
          console.log('❌ No existing foreground service detected');
          this.isForegroundServiceRunning = false;
        }
        
        // If we have saved state, try to resume monitoring
        if (this.isForegroundServiceRunning) {
          // Service is running, just sync the state
          this.isListening = true;
          this.startPolling();
          console.log('🔄 Resumed SMS monitoring with existing foreground service');
        } else {
          // Service not running, start fresh
          console.log('🚀 Starting fresh SMS monitoring session...');
          await this.startForegroundService();
          this.isListening = true;
          this.startPolling();
        }
        
        // Get initial message count
        try {
          const countResult = await SMSInboxReader.getCount({});
          this.lastMessageCount = countResult.count;
        } catch (error) {
          console.warn('⚠️ Failed to get initial SMS count:', error);
        }
      } else {
        console.log('📱 No previous monitoring session found');
      }
      
    } catch (error) {
      console.error('❌ Failed to sync with existing foreground service:', error);
    }
  }

  // Get SMS count
  async getSMSCount(): Promise<number> {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await SMSInboxReader.getCount({});
        return result.count;
      } else {
        return this.messageHistory.length;
      }
    } catch (error) {
      console.error('❌ Error getting SMS count:', error);
      return 0;
    }
  }

  // Configure webhook settings with NATIVE update
  setWebhookConfig(url: string, secret: string) {
    this.webhookUrl = url;
    this.webhookSecret = secret;
    
    // Update native service if running
    if (Capacitor.isNativePlatform() && this.nativeSMS && this.isListening) {
      this.nativeSMS.updateWebhookConfig({
        webhookUrl: url,
        webhookSecret: secret
      }).then(() => {
        console.log('✅ Native webhook config updated');
      }).catch(error => {
        console.error('❌ Failed to update native webhook config:', error);
      });
    }
    
    console.log('🔧 Webhook configured:', { url, hasSecret: !!secret });
  }

  // Get current configuration
  getConfig() {
    return {
      webhookUrl: this.webhookUrl,
      webhookSecret: this.webhookSecret,
      isListening: this.isListening,
      messageCount: this.messageHistory.length,
      isBackgroundModeEnabled: this.isBackgroundModeEnabled
    };
  }

  // Validate webhook URL
  private isValidWebhookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Enhanced start listening with NATIVE SMS implementation
  async startListening(): Promise<boolean> {
    if (this.isListening) {
      console.log('⚠️ SMS monitoring already active');
      return true;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // ✅ NEW: Use NATIVE SMS Service with BroadcastReceiver
        console.log('🚀 Starting NATIVE SMS monitoring with BroadcastReceiver + Foreground Service');
        
        // Request SMS permissions first
        const hasPermission = await SMSInboxReader.checkPermissions();
        if (hasPermission.sms !== 'granted') {
          const permission = await SMSInboxReader.requestPermissions();
          if (permission.sms !== 'granted') {
            throw new Error('SMS permissions denied');
          }
        }

        // Start native SMS monitoring service
        if (this.nativeSMS) {
          console.log('📡 Starting native SMS monitoring service...');
          
          const result = await this.nativeSMS.startSMSMonitoring({
            webhookUrl: this.webhookUrl,
            webhookSecret: this.webhookSecret
          });
          
          if (result.success) {
            console.log('✅ Native SMS monitoring started successfully!');
            this.isForegroundServiceRunning = true;
          } else {
            throw new Error('Failed to start native SMS monitoring');
          }
        } else {
          console.warn('⚠️ Native SMS plugin not available, falling back to old method');
          
          // Fallback to old method
          await this.startForegroundService();
          await this.setupSMSEventListeners();
        }

        // Get initial baseline for history
        const countResult = await SMSInboxReader.getCount({});
        this.lastMessageCount = countResult.count;
        console.log(`📊 Initial SMS count: ${countResult.count}`);

      } else {
        console.log('🌐 Running in web mode - SMS monitoring simulated');
        this.simulateWebActivity();
      }

      this.isListening = true;
      
      // Save monitoring state to localStorage
      localStorage.setItem('sms_monitoring_active', 'true');
      localStorage.setItem('webhookUrl', this.webhookUrl);
      localStorage.setItem('webhookSecret', this.webhookSecret);
      
      console.log('✅ SMS monitoring started with NATIVE implementation');
      return true;

    } catch (error) {
      console.error('❌ Failed to start SMS monitoring:', error);
      return false;
    }
  }

  // Simulate activity in web mode for testing
  private simulateWebActivity() {
    // Add a test message every 30 seconds in web mode
    setInterval(() => {
      if (this.isListening && !Capacitor.isNativePlatform()) {
        const testMessage: SMSMessage = {
          id: Date.now(),
          address: 'TEST-' + Math.floor(Math.random() * 1000),
          body: `Test message generated at ${new Date().toLocaleTimeString()}`,
          date: Date.now(),
          type: 1
        };
        this.processNewMessage(testMessage);
      }
    }, 30000);
  }

  // Enhanced stop listening with NATIVE implementation
  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    this.isListening = false;
    
    try {
      if (Capacitor.isNativePlatform()) {
        // ✅ NEW: Stop NATIVE SMS Service
        if (this.nativeSMS) {
          console.log('🛑 Stopping native SMS monitoring service...');
          
          const result = await this.nativeSMS.stopSMSMonitoring();
          if (result.success) {
            console.log('✅ Native SMS monitoring stopped successfully!');
            this.isForegroundServiceRunning = false;
          }
        } else {
          // Fallback to old method
          await this.stopForegroundService();
        }
      }
    } catch (error) {
      console.error('❌ Error stopping native SMS service:', error);
    }

    // Clear saved monitoring state
    localStorage.setItem('sms_monitoring_active', 'false');

    console.log('🛑 SMS monitoring stopped');
  }

  // Setup real-time SMS event listeners
  private async setupSMSEventListeners() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Listen for SMS arrival events from the native plugin
      console.log('📡 Setting up real-time SMS event listeners...');
      
      // Use document event listeners for SMS events
      document.addEventListener('deviceready', () => {
        console.log('📱 Device ready - SMS listeners active');
      });

      // Listen for SMS database changes (Android content observer pattern)
      document.addEventListener('smsReceived', (event: any) => {
        console.log('📨 Real-time SMS event detected!', event.detail);
        this.checkForNewMessages(); // Immediate check when SMS received
      });

      // Alternative listener for SMS inbox changes
      (window as any).addEventListener('smsInboxChanged', () => {
        console.log('📨 SMS inbox changed - checking for new messages');
        this.checkForNewMessages();
      });

      console.log('✅ Real-time SMS event listeners configured');
    } catch (error) {
      console.error('❌ Failed to setup SMS event listeners:', error);
    }
  }

  // Start optimized dual-strategy monitoring (polling + events)
  private startPolling() {
    // Aggressive polling every 1 second for immediate detection
    this.pollingInterval = setInterval(() => {
      this.checkForNewMessages();
    }, 1000); // Changed from 3000ms to 1000ms for faster detection

    console.log(`🔄 Aggressive polling started (1000ms intervals)`);
  }

  // Stop polling
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('🛑 Polling stopped');
  }

  // Check for new SMS messages with enhanced debugging
  private async checkForNewMessages() {
    if (!this.isListening) return;

    try {
      if (Capacitor.isNativePlatform()) {
        // Quick count check first with detailed logging
        const countResult = await SMSInboxReader.getCount({});
        
        // Log every few cycles for debugging
        if (Math.random() < 0.1) { // 10% of the time
          console.log(`🔍 SMS Count Check: ${countResult.count} (last: ${this.lastMessageCount})`);
        }
        
        if (countResult.count > this.lastMessageCount) {
          console.log('📨 🚨 NEW SMS DETECTED! 🚨', {
            newCount: countResult.count,
            lastCount: this.lastMessageCount,
            difference: countResult.count - this.lastMessageCount
          });
          
          // Get new messages since last check with more detailed filter
          const messages = await SMSInboxReader.getSMSList({
            filter: { 
              maxCount: countResult.count - this.lastMessageCount + 10, // Get extra to ensure we don't miss any
              minDate: Date.now() - 300000 // Last 5 minutes to catch recent messages
            }
          });

          console.log('📥 Retrieved messages:', {
            total: messages.smsList?.length || 0,
            lastMessageId: this.lastMessageId
          });

          if (messages.smsList && messages.smsList.length > 0) {
            let newMessagesProcessed = 0;
            
            // Process new messages with deduplication
            for (const message of messages.smsList) {
              if (message.id > this.lastMessageId && !this.processedMessageIds.has(message.id)) {
                console.log(`📩 Processing NEW message ID: ${message.id} from ${message.address}`);
                await this.processNewMessage(message);
                this.lastMessageId = Math.max(this.lastMessageId, message.id);
                newMessagesProcessed++;
              }
            }
            
            console.log(`✅ Processed ${newMessagesProcessed} new messages`);
          }
          
          this.lastMessageCount = countResult.count;
          
          // Update foreground service notification
          await this.updateForegroundService();
        }
      } else {
        // Web mode - just log that we're checking occasionally
        if (Math.random() < 0.05) { // 5% of the time
          console.log('🌐 Checking for SMS (web simulation mode)');
        }
      }

    } catch (error) {
      console.error('❌ Error checking for new messages:', error);
      
      // Try to recover from permission issues
      if (error.toString().includes('permission')) {
        console.log('🔄 Permission error detected - attempting to re-request permissions');
        try {
          await SMSInboxReader.requestPermissions();
        } catch (permError) {
          console.error('❌ Failed to re-request permissions:', permError);
        }
      }
    }
  }

  // Process a new SMS message with deduplication
  private async processNewMessage(message: SMSMessage) {
    // Prevent duplicate processing
    if (this.processedMessageIds.has(message.id)) {
      console.log('⚠️ Message already processed, skipping:', message.id);
      return;
    }

    // Mark as processed immediately
    this.processedMessageIds.add(message.id);

    console.log('📩 Processing new SMS:', {
      id: message.id,
      from: message.address,
      preview: message.body.substring(0, 50) + '...',
      timestamp: new Date(message.date).toLocaleString()
    });

    // Add to message history
    this.messageHistory.unshift(message);
    
    // Keep only last 100 messages
    if (this.messageHistory.length > 100) {
      this.messageHistory = this.messageHistory.slice(0, 100);
    }

    // Clean up old processed IDs (keep last 1000)
    if (this.processedMessageIds.size > 1000) {
      const idsArray = Array.from(this.processedMessageIds);
      const toKeep = idsArray.slice(-500); // Keep last 500
      this.processedMessageIds = new Set(toKeep);
    }

    // Forward to webhook if configured (with deduplication)
    if (this.webhookUrl) {
      await this.forwardToWebhookSafe(message);
    }
  }

  // Forward SMS to webhook with deduplication safety
  private async forwardToWebhookSafe(message: SMSMessage) {
    if (!this.webhookUrl) return;

    // Prevent duplicate webhook calls
    if (this.webhookCallsInProgress.has(message.id)) {
      console.log('⚠️ Webhook call already in progress for message:', message.id);
      return;
    }

    // Mark webhook call as in progress
    this.webhookCallsInProgress.add(message.id);

    try {
      const payload: WebhookPayload = {
        message: message.body,
        sender: message.address,
        timestamp: message.date,
        signature: this.generateSignature(message.body, message.address, message.date)
      };

      console.log('🚀 Forwarding to webhook:', {
        messageId: message.id,
        url: this.webhookUrl,
        sender: payload.sender,
        messageLength: payload.message.length
      });

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SMS-Signature': payload.signature,
          'X-SMS-ID': message.id.toString()
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        console.log('✅ Webhook delivered successfully for message:', message.id);
      } else {
        console.error('❌ Webhook delivery failed:', response.status, response.statusText);
      }

    } catch (error) {
      console.error('❌ Webhook delivery error:', error);
    } finally {
      // Remove from in-progress set
      this.webhookCallsInProgress.delete(message.id);
    }
  }

  // Generate webhook signature
  private generateSignature(message: string, sender: string, timestamp: number): string {
    const data = `${message}${sender}${timestamp}${this.webhookSecret}`;
    // Simple hash - in production, use proper HMAC
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Get message history
  getMessageHistory(): SMSMessage[] {
    return [...this.messageHistory];
  }

  // Test webhook functionality with better validation
  async testWebhook(): Promise<boolean> {
    if (!this.webhookUrl) {
      console.error('❌ No webhook URL configured');
      return false;
    }

    // Validate URL format
    if (!this.isValidWebhookUrl(this.webhookUrl)) {
      console.error('❌ Invalid webhook URL format:', this.webhookUrl);
      return false;
    }

    try {
      console.log('🧪 Testing webhook URL:', this.webhookUrl);
      
      const testPayload: WebhookPayload = {
        message: 'Test message from SMS Webhook App - Connection test',
        sender: 'TEST',
        timestamp: Date.now(),
        signature: this.generateSignature('Test message from SMS Webhook App - Connection test', 'TEST', Date.now())
      };

      console.log('📤 Sending test payload:', testPayload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SMS-Signature': testPayload.signature,
          'X-SMS-ID': 'TEST',
          'User-Agent': 'SMS-Webhook-App/1.0'
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📥 Webhook response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        console.log('✅ Webhook test successful');
        return true;
      } else {
        console.error('❌ Webhook test failed:', response.status, response.statusText);
        return false;
      }

    } catch (error) {
      console.error('❌ Webhook test error:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('💡 Possible causes: Invalid URL, network error, CORS issues, or server not reachable');
      }
      
      return false;
    }
  }

  // Perform webhook health check
  async performWebhookHealthCheck(): Promise<any> {
    if (!this.webhookUrl) return { status: 'no_webhook' };

    try {
      const result = await this.testWebhook();
      console.log('🔍 Webhook health check result:', result);
      return { status: result ? 'healthy' : 'unhealthy', timestamp: Date.now() };
    } catch (error) {
      console.error('❌ Webhook health check failed:', error);
      return { status: 'error', error: error, timestamp: Date.now() };
    }
  }

  // Perform battery status check
  async performBatteryCheck(): Promise<any> {
    try {
      // Simple battery status check
      const status = {
        level: 'unknown',
        isCharging: false,
        timestamp: Date.now()
      };
      console.log('🔋 Battery check result:', status);
      return status;
    } catch (error) {
      console.error('❌ Battery check failed:', error);
      return { status: 'error', error: error, timestamp: Date.now() };
    }
  }

  // Enhanced app health check with proper battery optimization detection
  async performAppHealthCheck(): Promise<any> {
    if (!Capacitor.isNativePlatform()) {
      return {
        status: 'web_mode',
        message: 'Running in web mode - no Android restrictions apply',
        checks: {
          permissions: 'N/A',
          batteryOptimization: 'N/A',
          autoStart: 'N/A',
          backgroundRestriction: 'N/A'
        }
      };
    }

    const healthStatus = {
      status: 'checking',
      lastChecked: new Date().toISOString(),
      issues: [] as string[],
      recommendations: [] as string[],
      checks: {
        permissions: 'unknown',
        batteryOptimization: 'unknown',
        autoStart: 'unknown',
        backgroundRestriction: 'unknown',
        foregroundService: this.isForegroundServiceRunning ? 'active' : 'inactive',
        lastMessageTime: this.messageHistory.length > 0 ? 
          new Date(this.messageHistory[this.messageHistory.length - 1].date).toLocaleString() : 
          'No messages yet'
      }
    };

    try {
      // Check battery optimization using Capacitor's native bridge
      const isBatteryOptimized = await this.checkBatteryOptimization();
      healthStatus.checks.batteryOptimization = isBatteryOptimized ? 'enabled' : 'disabled';
      
      if (isBatteryOptimized) {
        healthStatus.issues.push('Battery optimization is enabled - may kill SMS monitoring');
        healthStatus.recommendations.push('Disable battery optimization: Settings > Apps > SMS Webhook > Battery > Unrestricted');
      }

             // Check SMS permissions
       const hasPermissions = await this.checkSMSPermissionsInternal();
       healthStatus.checks.permissions = hasPermissions ? 'granted' : 'denied';
       
       if (!hasPermissions) {
         healthStatus.issues.push('SMS permissions not granted');
         healthStatus.recommendations.push('Grant SMS permissions in app settings');
       }

      // Check if foreground service is running
      if (!this.isForegroundServiceRunning) {
        healthStatus.issues.push('Foreground service not running');
        healthStatus.recommendations.push('Start SMS monitoring to enable foreground service');
      }

             // Check last message activity (if no messages in last 30 minutes, might be issue)
       const lastMessageTime = this.messageHistory.length > 0 ? 
         this.messageHistory[this.messageHistory.length - 1].date : 
         0;
       const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
       
       if (this.isListening && lastMessageTime < thirtyMinutesAgo && this.messageHistory.length === 0) {
         healthStatus.recommendations.push('If no SMS received, try sending test SMS or restart monitoring');
       }

      // Determine overall status
      if (healthStatus.issues.length === 0) {
        healthStatus.status = 'healthy';
      } else if (healthStatus.issues.length <= 2) {
        healthStatus.status = 'warning';
      } else {
        healthStatus.status = 'critical';
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
      healthStatus.status = 'error';
      healthStatus.issues.push('Failed to perform health check');
    }

    return healthStatus;
  }

  // Check SMS permissions
  private async checkSMSPermissionsInternal(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true; // Assume granted in web mode

    try {
      const hasPermission = await SMSInboxReader.checkPermissions();
      return hasPermission.sms === 'granted';
    } catch (error) {
      console.warn('⚠️ Cannot check SMS permissions:', error);
      return false;
    }
  }

  // Real battery optimization check using official plugin
  private async checkBatteryOptimization(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const result = await BatteryOptimization.isBatteryOptimizationEnabled();
      return result.enabled;
    } catch (error) {
      console.warn('⚠️ Cannot check battery optimization:', error);
      return true; // Assume worst case if can't check
    }
  }

  // Open battery optimization settings using official plugin
  async openBatteryOptimizationSettings(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Battery settings only available on Android devices');
      return;
    }

    try {
      await BatteryOptimization.openBatteryOptimizationSettings();
      console.log('⚙️ Battery optimization settings opened');
    } catch (error) {
      console.error('❌ Failed to open battery settings:', error);
    }
  }

  // Request battery optimization exemption
  async requestBatteryOptimizationExemption(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      await BatteryOptimization.requestIgnoreBatteryOptimization();
      console.log('🔋 Battery optimization exemption requested');
      return true;
    } catch (error) {
      console.error('❌ Failed to request battery optimization exemption:', error);
      return false;
    }
  }

  // Get current status with NATIVE service check
  getStatus() {
    // Check native service status if available
    if (Capacitor.isNativePlatform() && this.nativeSMS) {
      this.nativeSMS.getSMSServiceStatus().then(result => {
        if (result.success) {
          this.isForegroundServiceRunning = result.isActive;
        }
      }).catch(error => {
        console.warn('⚠️ Failed to get native service status:', error);
      });
    }
    
    return {
      isListening: this.isListening,
      messageCount: this.messageHistory.length,
      lastMessageId: this.lastMessageId,
      hasWebhook: !!this.webhookUrl,
      isBackgroundModeEnabled: this.isBackgroundModeEnabled,
      isForegroundServiceRunning: this.isForegroundServiceRunning,
      isInitialized: this.isInitialized,
      processedMessageCount: this.processedMessageIds.size,
      webhookCallsInProgress: this.webhookCallsInProgress.size
    };
  }
}

// Export singleton instance
export const smsService = new SMSService(); 