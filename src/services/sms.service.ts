import { Capacitor } from '@capacitor/core';
import { SMSInboxReader } from 'capacitor-sms-inbox';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { BackgroundMode } from '@anuradev/capacitor-background-mode';
import { App } from '@capacitor/app';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

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
  private backgroundTaskId: string | null = null;
  private isBackgroundModeEnabled: boolean = false;
  private isInitialized: boolean = false;
  private isForegroundServiceRunning: boolean = false;
  
  // Track processed messages to prevent duplicates
  private processedMessageIds: Set<number> = new Set();
  private webhookCallsInProgress: Set<number> = new Set();

  // Optimized polling interval (3 seconds for balance)
  private readonly POLLING_INTERVAL = 3000;
  private readonly NOTIFICATION_CHANNEL_ID = 'sms_monitor_channel';

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      if (Capacitor.isNativePlatform()) {
        await this.initializeNotificationChannel();
        await this.initializeBackgroundMode();
        await this.setupAppStateListener();
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

  private async initializeNotificationChannel() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Create notification channel for foreground service
      await ForegroundService.createNotificationChannel({
        id: this.NOTIFICATION_CHANNEL_ID,
        name: 'SMS Monitor Service',
        description: 'Persistent SMS monitoring service notifications',
        importance: 3 // Default importance
      });
      
      console.log('✅ Notification channel created');
    } catch (error) {
      console.error('❌ Failed to create notification channel:', error);
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

      // Listen for background mode events
      BackgroundMode.addListener('appInBackground', () => {
        console.log('📱 App entered background mode');
        this.startBackgroundTask();
      });

      BackgroundMode.addListener('appInForeground', () => {
        console.log('📱 App returned to foreground');
        this.stopBackgroundTask();
      });

    } catch (error) {
      console.error('❌ Failed to initialize background mode:', error);
    }
  }

  // Proper foreground service implementation following Capawesome docs
  private async startForegroundService() {
    if (!Capacitor.isNativePlatform() || this.isForegroundServiceRunning) return;

    try {
      // Start foreground service with proper configuration
      await ForegroundService.startForegroundService({
        id: 1,
        title: 'SMS Webhook Monitor',
        body: `Monitoring SMS • ${this.messageHistory.length} processed`,
        smallIcon: 'ic_launcher',
        silent: false,
        notificationChannelId: this.NOTIFICATION_CHANNEL_ID
      });
      
      this.isForegroundServiceRunning = true;
      console.log('🔒 Foreground service started successfully');
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
        body: `Monitoring SMS • ${this.messageHistory.length} processed • Last: ${new Date().toLocaleTimeString()}`,
        smallIcon: 'ic_launcher'
      });
    } catch (error) {
      console.error('❌ Failed to update foreground service:', error);
    }
  }

  private async stopForegroundService() {
    if (!Capacitor.isNativePlatform() || !this.isForegroundServiceRunning) return;

    try {
      await ForegroundService.stopForegroundService();
      this.isForegroundServiceRunning = false;
      console.log('🔓 Foreground service stopped');
    } catch (error) {
      console.error('❌ Failed to stop foreground service:', error);
    }
  }

  private async startBackgroundTask() {
    if (!Capacitor.isNativePlatform() || this.backgroundTaskId) return;

    try {
      const taskId = await BackgroundTask.beforeExit(async () => {
        console.log('🔄 Background task started - SMS monitoring');
        
        // Perform background monitoring for 25 seconds
        const startTime = Date.now();
        const maxDuration = 25000; // 25 seconds (safe margin from 30s limit)
        let cycleCount = 0;
        
        try {
          while ((Date.now() - startTime) < maxDuration) {
            cycleCount++;
            console.log(`🔍 Background cycle ${cycleCount} - checking SMS`);
            
            // Check for new SMS messages
            await this.checkForNewMessages();
            
            // Update foreground service status
            await this.updateForegroundService();
            
            // Wait 3 seconds before next cycle
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          console.log(`✅ Background task completed ${cycleCount} cycles in ${Date.now() - startTime}ms`);
        } catch (error) {
          console.error('❌ Background task error:', error);
        } finally {
          // Always finish the task
          BackgroundTask.finish({ taskId });
          
          // Auto-restart background task if still in background
          setTimeout(async () => {
            if (!this.isListening) return; // Only restart if still monitoring
            console.log('🔄 Auto-restarting background task chain');
            await this.startBackgroundTask();
          }, 1000); // Wait 1 second before restart
        }
      });

      this.backgroundTaskId = taskId;
      console.log('✅ Background task registered:', taskId);
    } catch (error) {
      console.error('❌ Failed to start background task:', error);
    }
  }

  private async stopBackgroundTask() {
    if (!this.backgroundTaskId) return;

    try {
      await BackgroundTask.finish({ taskId: this.backgroundTaskId });
      this.backgroundTaskId = null;
      console.log('✅ Background task finished');
    } catch (error) {
      console.error('❌ Failed to stop background task:', error);
    }
  }

  private async setupAppStateListener() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Listen for app state changes to manage background tasks
      App.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive) {
          console.log('📱 App went to background - immediate SMS check + background task');
          
          // Immediate check before starting background task
          await this.checkForNewMessages();
          
          // Start intensive background monitoring
          await this.startBackgroundTask();
        } else {
          console.log('📱 App became active - stopping background task');
          await this.stopBackgroundTask();
        }
      });
      
      console.log('✅ App state listener initialized');
    } catch (error) {
      console.error('❌ Failed to setup app state listener:', error);
    }
  }

  // Initialize method for external use
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    await this.initializeService();
    return this.isInitialized;
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

  // Configure webhook settings
  setWebhookConfig(url: string, secret: string) {
    this.webhookUrl = url;
    this.webhookSecret = secret;
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

  // Start SMS monitoring with proper foreground service
  async startListening(): Promise<boolean> {
    if (this.isListening) {
      console.log('⚠️ SMS monitoring already active');
      return true;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // Start foreground service first (following Capawesome docs)
        await this.startForegroundService();
        
        // Request SMS permissions
        const hasPermission = await SMSInboxReader.checkPermissions();
        if (hasPermission.sms !== 'granted') {
          const permission = await SMSInboxReader.requestPermissions();
          if (permission.sms !== 'granted') {
            throw new Error('SMS permissions denied');
          }
        }

        // Get initial SMS count and latest message
        const countResult = await SMSInboxReader.getCount({});
        this.lastMessageCount = countResult.count;

        // Get the most recent message to establish baseline
        const messages = await SMSInboxReader.getSMSList({
          filter: { maxCount: 10 } // Get last 10 messages to establish baseline
        });
        
        if (messages.smsList && messages.smsList.length > 0) {
          this.lastMessageId = messages.smsList[0].id;
          
          // Mark existing messages as processed to avoid duplicates
          messages.smsList.forEach(msg => {
            this.processedMessageIds.add(msg.id);
          });
        }

        console.log('📱 SMS monitoring initialized with foreground service', {
          lastMessageId: this.lastMessageId,
          totalCount: this.lastMessageCount,
          foregroundService: this.isForegroundServiceRunning,
          processedIds: this.processedMessageIds.size
        });

      } else {
        console.log('🌐 Running in web mode - SMS monitoring simulated');
        // In web mode, simulate some activity
        this.simulateWebActivity();
      }

      this.isListening = true;
      this.startPolling();
      
      console.log('✅ SMS monitoring started with foreground service');
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

  // Stop SMS monitoring and foreground service
  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    this.isListening = false;
    this.stopPolling();
    
    // Stop background task
    await this.stopBackgroundTask();
    
    // Stop foreground service
    await this.stopForegroundService();

    console.log('🛑 SMS monitoring and foreground service stopped');
  }

  // Start optimized single polling strategy
  private startPolling() {
    // Single optimized polling (3 seconds)
    this.pollingInterval = setInterval(() => {
      this.checkForNewMessages();
    }, this.POLLING_INTERVAL);

    console.log(`🔄 Optimized polling started (${this.POLLING_INTERVAL}ms)`);
  }

  // Stop polling
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('🛑 Polling stopped');
  }

  // Check for new SMS messages with deduplication
  private async checkForNewMessages() {
    if (!this.isListening) return;

    try {
      if (Capacitor.isNativePlatform()) {
        // Quick count check first
        const countResult = await SMSInboxReader.getCount({});
        
        if (countResult.count > this.lastMessageCount) {
          console.log('📨 New SMS detected!', {
            newCount: countResult.count,
            lastCount: this.lastMessageCount
          });
          
          // Get new messages since last check
          const messages = await SMSInboxReader.getSMSList({
            filter: { 
              maxCount: countResult.count - this.lastMessageCount + 5, // Get a few extra to ensure we don't miss any
              minDate: Date.now() - 120000 // Last 2 minutes to catch recent messages
            }
          });

          if (messages.smsList && messages.smsList.length > 0) {
            // Process new messages with deduplication
            for (const message of messages.smsList) {
              if (message.id > this.lastMessageId && !this.processedMessageIds.has(message.id)) {
                await this.processNewMessage(message);
                this.lastMessageId = Math.max(this.lastMessageId, message.id);
              }
            }
          }
          
          this.lastMessageCount = countResult.count;
          
          // Update foreground service notification
          await this.updateForegroundService();
        }
      } else {
        // Web mode - just log that we're checking
        console.log('🌐 Checking for SMS (web simulation)');
      }

    } catch (error) {
      console.error('❌ Error checking for new messages:', error);
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

  // Get current status
  getStatus() {
    return {
      isListening: this.isListening,
      messageCount: this.messageHistory.length,
      lastMessageId: this.lastMessageId,
      hasWebhook: !!this.webhookUrl,
      isBackgroundModeEnabled: this.isBackgroundModeEnabled,
      backgroundTaskActive: !!this.backgroundTaskId,
      isForegroundServiceRunning: this.isForegroundServiceRunning,
      isInitialized: this.isInitialized,
      processedMessageCount: this.processedMessageIds.size,
      webhookCallsInProgress: this.webhookCallsInProgress.size
    };
  }
}

// Export singleton instance
export const smsService = new SMSService(); 