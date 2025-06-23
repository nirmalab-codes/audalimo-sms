import { Capacitor } from '@capacitor/core';
import { SMSInboxReader } from 'capacitor-sms-inbox';

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
  private fastPollingInterval: NodeJS.Timeout | null = null;
  private regularPollingInterval: NodeJS.Timeout | null = null;
  private messageHistory: SMSMessage[] = [];

  // Fast polling for immediate detection (every 200ms for first 30 seconds)
  private readonly FAST_POLL_INTERVAL = 200;
  private readonly FAST_POLL_DURATION = 30000; // 30 seconds
  
  // Regular polling (every 2 seconds)
  private readonly REGULAR_POLL_INTERVAL = 2000;

  setWebhookConfig(url: string, secret: string) {
    console.log('📱 SMS Service: Setting webhook config', { url: url ? '✓' : '✗', secret: secret ? '✓' : '✗' });
    this.webhookUrl = url;
    this.webhookSecret = secret;
  }

  async startListening(): Promise<boolean> {
    if (this.isListening) {
      console.log('📱 SMS Service: Already listening');
      return true;
    }

    console.log('📱 SMS Service: Starting SMS listener...');

    if (Capacitor.isNativePlatform()) {
      try {
        // Request permissions first
        const permissionStatus = await SMSInboxReader.requestPermissions();
        console.log('📱 SMS Service: Permission status:', permissionStatus);

        if (permissionStatus.sms !== 'granted') {
          console.error('❌ SMS Service: SMS permission not granted');
          return false;
        }

        // Initialize baseline
        await this.initializeBaseline();
        
        // Start dual polling strategy
        this.startDualPolling();
        
        this.isListening = true;
        console.log('✅ SMS Service: Successfully started listening');
        return true;

      } catch (error) {
        console.error('❌ SMS Service: Failed to start listening:', error);
        return false;
      }
    } else {
      // Web mode - simulation
      console.log('🌐 SMS Service: Running in web mode (simulation)');
      this.isListening = true;
      return true;
    }
  }

  async stopListening(): Promise<void> {
    console.log('📱 SMS Service: Stopping SMS listener...');
    
    if (this.fastPollingInterval) {
      clearInterval(this.fastPollingInterval);
      this.fastPollingInterval = null;
    }
    
    if (this.regularPollingInterval) {
      clearInterval(this.regularPollingInterval);
      this.regularPollingInterval = null;
    }
    
    this.isListening = false;
    console.log('✅ SMS Service: Stopped listening');
  }

  private async initializeBaseline(): Promise<void> {
    try {
      console.log('📱 SMS Service: Initializing baseline...');
      
      // Get initial message count and latest message ID
      const countResult = await SMSInboxReader.getCount({});
      this.lastMessageCount = countResult.count;
      
      // Get the most recent message to establish baseline
      const messages = await SMSInboxReader.getSMSList({
        filter: { maxCount: 1 }
      });
      
      if (messages.smsList && messages.smsList.length > 0) {
        this.lastMessageId = messages.smsList[0].id;
        console.log('📱 SMS Service: Baseline established - Count:', this.lastMessageCount, 'Last ID:', this.lastMessageId);
      } else {
        console.log('📱 SMS Service: No existing messages found');
      }
      
    } catch (error) {
      console.error('❌ SMS Service: Failed to initialize baseline:', error);
    }
  }

  private startDualPolling(): void {
    console.log('📱 SMS Service: Starting dual polling strategy');
    
    // Start fast polling for immediate detection
    this.startFastPolling();
    
    // Start regular polling
    this.startRegularPolling();
  }

  private startFastPolling(): void {
    console.log('⚡ SMS Service: Starting fast polling (200ms for 30s)');
    
    this.fastPollingInterval = setInterval(async () => {
      await this.checkForNewMessages();
    }, this.FAST_POLL_INTERVAL);

    // Switch to regular polling after fast poll duration
    setTimeout(() => {
      if (this.fastPollingInterval) {
        clearInterval(this.fastPollingInterval);
        this.fastPollingInterval = null;
        console.log('⚡ SMS Service: Fast polling ended, continuing with regular polling');
      }
    }, this.FAST_POLL_DURATION);
  }

  private startRegularPolling(): void {
    console.log('🔄 SMS Service: Starting regular polling (2s interval)');
    
    this.regularPollingInterval = setInterval(async () => {
      await this.checkForNewMessages();
    }, this.REGULAR_POLL_INTERVAL);
  }

  private async checkForNewMessages(): Promise<void> {
    try {
      // Quick count check first
      const countResult = await SMSInboxReader.getCount({});
      
      if (countResult.count > this.lastMessageCount) {
        console.log('📨 SMS Service: New message detected! Count changed from', this.lastMessageCount, 'to', countResult.count);
        
        // Get new messages since last check
        const messages = await SMSInboxReader.getSMSList({
          filter: { 
            maxCount: countResult.count - this.lastMessageCount,
            minDate: Date.now() - 60000 // Last minute to avoid old messages
          }
        });

        if (messages.smsList && messages.smsList.length > 0) {
          // Process new messages
          for (const message of messages.smsList) {
            if (message.id > this.lastMessageId) {
              console.log('📨 SMS Service: Processing new message:', {
                id: message.id,
                from: message.address,
                preview: message.body.substring(0, 50) + '...'
              });
              
              await this.processNewMessage(message);
              this.lastMessageId = Math.max(this.lastMessageId, message.id);
            }
          }
        }
        
        this.lastMessageCount = countResult.count;
      }
      
    } catch (error) {
      console.error('❌ SMS Service: Error checking for new messages:', error);
    }
  }

  private async processNewMessage(message: SMSMessage): Promise<void> {
    // Add to history
    this.messageHistory.unshift(message);
    
    // Keep only last 100 messages in memory
    if (this.messageHistory.length > 100) {
      this.messageHistory = this.messageHistory.slice(0, 100);
    }

    // Forward to webhook immediately
    if (this.webhookUrl) {
      await this.forwardToWebhook(message);
    }
  }

  private async forwardToWebhook(message: SMSMessage): Promise<void> {
    try {
      console.log('🔗 SMS Service: Forwarding to webhook:', this.webhookUrl);

      const payload: WebhookPayload = {
        message: message.body,
        sender: message.address,
        timestamp: message.date,
        signature: this.generateSignature(message.body, message.address, message.date)
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SMS-Signature': payload.signature
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ SMS Service: Webhook delivered successfully');
      } else {
        console.error('❌ SMS Service: Webhook delivery failed:', response.status, response.statusText);
      }

    } catch (error) {
      console.error('❌ SMS Service: Webhook error:', error);
    }
  }

  private generateSignature(message: string, sender: string, timestamp: number): string {
    const data = `${message}|${sender}|${timestamp}`;
    const secret = this.webhookSecret || 'default-secret';
    
    // Simple signature generation (in production, use proper HMAC)
    let hash = 0;
    const combined = data + secret;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Test webhook functionality
  async testWebhook(): Promise<boolean> {
    if (!this.webhookUrl) {
      console.error('❌ SMS Service: No webhook URL configured');
      return false;
    }

    try {
      const testPayload: WebhookPayload = {
        message: 'Test message from SMS Webhook App',
        sender: 'TEST',
        timestamp: Date.now(),
        signature: this.generateSignature('Test message from SMS Webhook App', 'TEST', Date.now())
      };

      console.log('🧪 SMS Service: Testing webhook:', this.webhookUrl);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SMS-Signature': testPayload.signature
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        console.log('✅ SMS Service: Webhook test successful');
        return true;
      } else {
        console.error('❌ SMS Service: Webhook test failed:', response.status, response.statusText);
        return false;
      }

    } catch (error) {
      console.error('❌ SMS Service: Webhook test error:', error);
      return false;
    }
  }

  // Get current status
  getStatus() {
    return {
      isListening: this.isListening,
      webhookConfigured: !!this.webhookUrl,
      messageCount: this.messageHistory.length,
      lastMessageId: this.lastMessageId
    };
  }

  // Get message history
  getMessageHistory(): SMSMessage[] {
    return [...this.messageHistory];
  }

  // Manual SMS reading for testing
  async readAllSMS(): Promise<SMSMessage[]> {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 SMS Service: Web mode - returning mock data');
      return [
        {
          id: 1,
          address: 'TEST',
          body: 'This is a test SMS message in web mode',
          date: Date.now(),
          type: 1
        }
      ];
    }

    try {
      const messages = await SMSInboxReader.getSMSList({
        filter: { maxCount: 50 }
      });
      
      return messages.smsList || [];
    } catch (error) {
      console.error('❌ SMS Service: Failed to read SMS:', error);
      return [];
    }
  }
}

export const smsService = new SMSService(); 