import { Capacitor } from '@capacitor/core';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions';

// Extend Capacitor interface to include our custom plugins
declare global {
  interface Window {
    simulateSMS?: (from: string, body: string) => void;
  }
}

// Extend Capacitor plugins interface
declare module '@capacitor/core' {
  interface PluginRegistry {
    NativeSMS?: NativeSMSPlugin;
  }
}

export interface SMSMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  status: 'sent' | 'received' | 'failed';
}

export interface SMSWebhookPayload {
  type: 'incoming' | 'delivery_receipt';
  message: SMSMessage;
  signature?: string;
}

// Custom Native SMS Interface
interface NativeSMSPlugin {
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  requestPermissions(): Promise<{ granted: boolean }>;
  isListening(): Promise<{ listening: boolean }>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

class SMSService {
  private webhookUrl: string = '';
  private webhookSecret: string = '';
  private listeners: ((payload: SMSWebhookPayload) => void)[] = [];
  private isListening: boolean = false;
  private nativePlugin: NativeSMSPlugin | null = null;
  private eventListenerRemover: (() => void) | null = null;

  constructor() {
    // Initialize SMS monitoring
    if (Capacitor.isNativePlatform()) {
      this.initializeNativeSMSListener();
    } else {
      // For web development, simulate SMS reception for testing
      this.startWebTestMode();
    }
  }

  // Set webhook configuration
  setWebhookConfig(url: string, secret: string) {
    this.webhookUrl = url;
    this.webhookSecret = secret;
    console.log('🔧 Webhook configured:', url ? 'URL set' : 'No URL', secret ? 'Secret set' : 'No secret');
  }

  // Initialize native SMS listener using Capacitor Bridge
  private async initializeNativeSMSListener() {
    if (this.isListening) return;
    
    try {
      console.log('🚀 Initializing native SMS listener with Capacitor Bridge...');
      
      // Get native plugin reference
      this.nativePlugin = (Capacitor as any).Plugins?.NativeSMS as NativeSMSPlugin;
      
      if (!this.nativePlugin) {
        console.error('❌ NativeSMS plugin not found');
        this.startTestMode();
        return;
      }

      // Request SMS permissions first
      const hasPermissions = await this.requestSMSPermissions();
      if (!hasPermissions) {
        console.error('❌ SMS permissions not granted');
        this.startTestMode();
        return;
      }

      // Setup native SMS listener
      await this.setupNativeSMSListener();
      
      console.log('✅ Native SMS listener started successfully');
      this.isListening = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize native SMS listener:', error);
      this.startTestMode();
    }
  }

  // Setup native SMS listener with event handlers
  private async setupNativeSMSListener() {
    if (!this.nativePlugin) return;

    try {
      console.log('🔄 Setting up native SMS event listener...');
      
      // Add listener for incoming SMS
      const listenerHandle = await this.nativePlugin.addListener('smsReceived', (data: any) => {
        console.log('📱 Native SMS received event:', data);
        this.handleIncomingSMS(data.from || data.address, data.body || data.message, data.timestamp);
      });
      
      // Store the remove function
      this.eventListenerRemover = listenerHandle.remove;

      // Start native SMS listening
      await this.nativePlugin.startListening();
      console.log('🔄 Native SMS listener activated');

      // Verify listening status
      const status = await this.nativePlugin.isListening();
      console.log('📊 Native SMS listening status:', status);

    } catch (error) {
      console.error('❌ Error setting up native SMS listener:', error);
      throw error;
    }
  }

  // Request SMS permissions
  private async requestSMSPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      console.log('🔐 Requesting SMS permissions...');
      
      // Try native plugin permissions first
      if (this.nativePlugin) {
        const result = await this.nativePlugin.requestPermissions();
        if (result.granted) {
          console.log('✅ Native SMS permissions granted');
          return true;
        }
        console.log('⚠️ Native plugin permission request result:', result);
      }

      // Fallback to AndroidPermissions
      console.log('🔐 Trying AndroidPermissions fallback...');
      const permissions = [
        AndroidPermissions.PERMISSION.READ_SMS,
        AndroidPermissions.PERMISSION.RECEIVE_SMS
      ];

      for (const permission of permissions) {
        const hasPermission = await AndroidPermissions.checkPermission(permission);
        if (!hasPermission.hasPermission) {
          console.log(`🔐 Requesting permission: ${permission}`);
          const result = await AndroidPermissions.requestPermission(permission);
          if (!result.hasPermission) {
            console.error(`❌ Permission denied: ${permission}`);
            return false;
          }
        }
      }

      console.log('✅ All SMS permissions granted via AndroidPermissions');
      return true;
    } catch (error) {
      console.error('❌ Error requesting SMS permissions:', error);
      return false;
    }
  }

  // Handle incoming SMS (called by native listener or simulation)
  private async handleIncomingSMS(from: string, body: string, timestamp?: number) {
    const smsMessage: SMSMessage = {
      id: Date.now().toString(),
      from: from,
      to: 'device',
      body: body,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      status: 'received'
    };

    console.log('📱 SMS Received:', {
      from: smsMessage.from,
      bodyLength: smsMessage.body.length,
      timestamp: smsMessage.timestamp.toISOString(),
      preview: smsMessage.body.substring(0, 50) + (smsMessage.body.length > 50 ? '...' : '')
    });

    // Trigger webhook for incoming SMS
    if (this.webhookUrl) {
      try {
        await this.triggerWebhook('incoming', smsMessage);
        console.log('✅ SMS forwarded to webhook successfully');
      } catch (error) {
        console.error('❌ Failed to forward SMS to webhook:', error);
      }
    } else {
      console.log('⚠️ No webhook URL configured - SMS not forwarded');
    }

    // Notify listeners
    this.notifyListeners('incoming', smsMessage);
  }

  // Fallback test mode for development
  private startTestMode() {
    console.log('🧪 Starting SMS test mode (simulation)');
    // Simulate incoming SMS every 30 seconds for testing
    setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance
        const testSenders = ['+6281234567890', 'BANK-BCA', 'OTP-SERVICE', '+628987654321', 'GOJEK'];
        const testMessages = [
          'Your OTP code is 123456. Valid for 5 minutes.',
          'Transaction alert: Rp 50,000 has been debited from your account.',
          'Your verification code: 789012',
          'Hello, this is a test message from simulation.',
          'GOJEK: Your driver is arriving in 2 minutes.'
        ];
        
        const sender = testSenders[Math.floor(Math.random() * testSenders.length)];
        const message = testMessages[Math.floor(Math.random() * testMessages.length)];
        
        console.log('🧪 Simulating SMS from:', sender);
        this.handleIncomingSMS(sender, message);
      }
    }, 30000); // Every 30 seconds
  }

  // Web test mode for browser development
  private startWebTestMode() {
    console.log('🌐 Starting web test mode');
    // Add a button or method to simulate SMS for web testing
    (window as any).simulateSMS = (from: string, body: string) => {
      console.log('📱 Manual SMS simulation:', from, body);
      this.handleIncomingSMS(from, body);
    };
    
    // Auto-simulate some messages for demo
    setTimeout(() => {
      this.handleIncomingSMS('+6281234567890', 'Your OTP code is 123456. Please use this to verify your account.');
    }, 3000);
    
    setTimeout(() => {
      this.handleIncomingSMS('BANK-BCA', 'Transaction notification: Rp 100,000 has been credited to your account.');
    }, 8000);

    setTimeout(() => {
      this.handleIncomingSMS('OTP-SERVICE', 'Verification code: 789012. Do not share this code.');
    }, 13000);
  }

  // Trigger webhook
  private async triggerWebhook(type: 'incoming' | 'delivery_receipt', message: SMSMessage) {
    if (!this.webhookUrl) {
      console.log('No webhook URL configured, skipping webhook');
      return;
    }

    const payload: SMSWebhookPayload = {
      type,
      message,
      signature: this.generateSignature(message)
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      console.log('🚀 Sending webhook to:', this.webhookUrl);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SMS-Signature': payload.signature || '',
          'User-Agent': 'SMS-Forwarder/2.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('✅ Webhook success:', this.webhookUrl, 'Response:', responseText);
    } catch (error) {
      console.error('❌ Webhook error:', error);
      throw error;
    }
  }

  // Generate signature for webhook security
  private generateSignature(message: SMSMessage): string {
    if (!this.webhookSecret) return '';
    
    // Simple signature generation using base64 encoding
    // In production, use proper HMAC-SHA256
    const payload = `${message.id}:${message.from}:${message.body}:${message.timestamp.getTime()}`;
    return btoa(`${this.webhookSecret}:${payload}`);
  }

  // Add listener for SMS events
  addListener(callback: (payload: SMSWebhookPayload) => void) {
    this.listeners.push(callback);
    console.log('📡 SMS listener added, total listeners:', this.listeners.length);
  }

  // Remove listener
  removeListener(callback: (payload: SMSWebhookPayload) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
      console.log('📡 SMS listener removed, total listeners:', this.listeners.length);
    }
  }

  // Notify all listeners
  private notifyListeners(type: 'incoming' | 'delivery_receipt', message: SMSMessage) {
    const payload: SMSWebhookPayload = { type, message };
    console.log('📡 Notifying', this.listeners.length, 'listeners with SMS payload');
    
    this.listeners.forEach((callback, index) => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`❌ Error in SMS listener callback ${index}:`, error);
      }
    });
  }

  // Get SMS permissions (for Android)
  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - SMS permissions not required');
      return true;
    }

    return await this.requestSMSPermissions();
  }

  // Test webhook endpoint
  async testWebhook(): Promise<boolean> {
    if (!this.webhookUrl) return false;

    const testMessage: SMSMessage = {
      id: 'test-' + Date.now(),
      from: 'TEST-SENDER',
      to: 'device',
      body: 'This is a webhook test message from SMS Forwarder app v2.0',
      timestamp: new Date(),
      status: 'received'
    };

    try {
      await this.triggerWebhook('incoming', testMessage);
      return true;
    } catch (error) {
      console.error('❌ Webhook test failed:', error);
      return false;
    }
  }

  // Method to simulate incoming SMS for testing purposes
  simulateIncomingSMS(from: string, body: string) {
    console.log('📱 Manual simulation triggered:', from, body);
    this.handleIncomingSMS(from, body);
  }

  // Stop SMS listening (for cleanup)
  async stopListening() {
    console.log('🛑 Stopping SMS listening...');
    
    if (this.eventListenerRemover) {
      this.eventListenerRemover();
      this.eventListenerRemover = null;
    }
    
    if (this.nativePlugin && this.isListening) {
      try {
        await this.nativePlugin.stopListening();
        await this.nativePlugin.removeAllListeners();
        this.isListening = false;
        console.log('🛑 SMS listening stopped');
      } catch (error) {
        console.error('❌ Error stopping SMS listening:', error);
      }
    }
  }

  // Get current status
  getStatus() {
    return {
      isListening: this.isListening,
      hasWebhook: !!this.webhookUrl,
      platform: Capacitor.getPlatform(),
      mode: Capacitor.isNativePlatform() ? 'native' : 'web',
      hasNativePlugin: !!this.nativePlugin,
      webhookUrl: this.webhookUrl ? this.webhookUrl.substring(0, 50) + '...' : null,
      listenerCount: this.listeners.length
    };
  }

  // Get detailed debug info
  async getDebugInfo() {
    const status = this.getStatus();
    
    if (this.nativePlugin && Capacitor.isNativePlatform()) {
      try {
        const nativeStatus = await this.nativePlugin.isListening();
        return {
          ...status,
          nativeListening: nativeStatus.listening,
          capacitorVersion: Capacitor.getPlatform(),
          pluginAvailable: true
        };
      } catch (error) {
        return {
          ...status,
          nativeListening: false,
          pluginError: error,
          pluginAvailable: false
        };
      }
    }
    
    return status;
  }
}

export const smsService = new SMSService(); 