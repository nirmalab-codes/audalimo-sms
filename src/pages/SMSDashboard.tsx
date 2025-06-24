import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonBadge,
  IonToast,
  IonAlert,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail
} from '@ionic/react';
import { 
  phonePortrait, 
  send, 
  settings,
  warning,
  checkmarkCircle,
  playCircle,
  stopCircle,
  save
} from 'ionicons/icons';
import { smsService } from '../services/sms.service';
import './SMSDashboard.css';

const SMSDashboard: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [smsCount, setSmsCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isForegroundServiceRunning, setIsForegroundServiceRunning] = useState(false);

  useEffect(() => {
    // Load saved settings
    const savedUrl = localStorage.getItem('webhookUrl') || '';
    const savedSecret = localStorage.getItem('webhookSecret') || '';
    setWebhookUrl(savedUrl);
    setWebhookSecret(savedSecret);

    // Initialize SMS service
    initializeSMSService();
  }, []);

  const initializeSMSService = async () => {
    try {
      console.log('🔄 Initializing SMS service...');
      
      // Initialize the service
      const initialized = await smsService.initialize();
      setIsInitialized(initialized);
      
      if (initialized) {
        // Get current status
        const status = smsService.getStatus();
        setIsListening(status.isListening);
        setIsForegroundServiceRunning(status.isForegroundServiceRunning);
        
        // Get SMS count
        const count = await smsService.getSMSCount();
        setSmsCount(count);
        
        console.log('✅ SMS service initialized', { 
          isListening: status.isListening, 
          count,
          isInitialized: status.isInitialized,
          foregroundService: status.isForegroundServiceRunning,
          processedMessages: status.processedMessageCount
        });
        
        // Configure webhook if saved
        if (webhookUrl) {
          smsService.setWebhookConfig(webhookUrl, webhookSecret);
        }
        
        showToastMessage('SMS service ready', 'success');
      } else {
        showToastMessage('Failed to initialize SMS service', 'danger');
      }
    } catch (error) {
      console.error('❌ Failed to initialize SMS service:', error);
      showToastMessage('Failed to initialize SMS service', 'danger');
    }
  };

  const saveWebhookConfig = () => {
    // Save settings to localStorage
    localStorage.setItem('webhookUrl', webhookUrl);
    localStorage.setItem('webhookSecret', webhookSecret);
    
    // Configure webhook in service
    smsService.setWebhookConfig(webhookUrl, webhookSecret);
    
    showToastMessage('Webhook configuration saved!', 'success');
  };

  const startListening = async () => {
    if (!webhookUrl.trim()) {
      setAlertMessage('Please configure webhook URL first');
      setShowAlert(true);
      return;
    }

    try {
      console.log('🚀 Starting SMS monitoring...');
      
      // Save settings first
      saveWebhookConfig();
      
      const success = await smsService.startListening();
      if (success) {
        setIsListening(true);
        
        // Update status including persistent service
        const status = smsService.getStatus();
        setIsForegroundServiceRunning(status.isForegroundServiceRunning);
        
        showToastMessage('SMS monitoring started with foreground service!', 'success');
        
        // Update SMS count after starting
        const count = await smsService.getSMSCount();
        setSmsCount(count);
      } else {
        showToastMessage('Failed to start SMS monitoring', 'danger');
      }
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      showToastMessage('Failed to start SMS monitoring', 'danger');
    }
  };

  const stopListening = async () => {
    try {
      console.log('🛑 Stopping SMS monitoring...');
      
      await smsService.stopListening();
      setIsListening(false);
      setIsForegroundServiceRunning(false);
      showToastMessage('SMS monitoring and foreground service stopped', 'warning');
    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
      showToastMessage('Failed to stop SMS monitoring', 'danger');
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl.trim()) {
      setAlertMessage('Please configure webhook URL first');
      setShowAlert(true);
      return;
    }

    try {
      console.log('🧪 Testing webhook...');
      
      // Configure webhook in service first
      smsService.setWebhookConfig(webhookUrl, webhookSecret);
      
      const success = await smsService.testWebhook();
      
      if (success) {
        showToastMessage('Webhook test successful! ✅', 'success');
      } else {
        showToastMessage('Webhook test failed ❌', 'danger');
      }
    } catch (error) {
      console.error('❌ Webhook test failed:', error);
      showToastMessage('Webhook test failed', 'danger');
    }
  };

  const showToastMessage = (message: string, color: string) => {
    setToastMessage(message);
    setToastColor(color);
    setShowToast(true);
  };

  const doRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    try {
      await initializeSMSService();
      showToastMessage('Data refreshed', 'success');
    } catch (error) {
      showToastMessage('Failed to refresh data', 'danger');
    }
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Status Card */}
        <IonCard className="fade-in">
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={phonePortrait} style={{ marginRight: '8px' }} />
              SMS Monitor
            </IonCardTitle>
            <IonCardSubtitle>Real-time SMS forwarding</IonCardSubtitle>
          </IonCardHeader>
          
          <IonCardContent>
            {/* Stats Row */}
            <div className="stats-row">
              <div className="stats-card">
                <div className="stats-number">{smsCount}</div>
                <div className="stats-label">Mssg</div>
              </div>
              <div className="stats-card">
                <div className="stats-number" style={{ color: isListening ? '#34C759' : '#8E8E93' }}>
                  {isListening ? 'ON' : 'OFF'}
                </div>
                <div className="stats-label">Status</div>
              </div>
              <div className="stats-card">
                <div className="stats-number" style={{ color: isInitialized ? '#34C759' : '#FF9500' }}>
                  {isInitialized ? 'OK' : 'INIT'}
                </div>
                <div className="stats-label">Service</div>
              </div>
              <div className="stats-card">
                <div className="stats-number" style={{ color: isForegroundServiceRunning ? '#34C759' : '#8E8E93' }}>
                  {isForegroundServiceRunning ? 'VPN' : 'OFF'}
                </div>
                <div className="stats-label">Mode</div>
              </div>
            </div>

            {/* Control Button */}
            <IonButton
              expand="block"
              fill={isListening ? 'outline' : 'solid'}
              color={isListening ? 'danger' : 'primary'}
              onClick={isListening ? stopListening : startListening}
              disabled={!isInitialized}
              style={{ marginTop: '16px' }}
            >
              <IonIcon icon={isListening ? stopCircle : playCircle} slot="start" />
              {isListening ? 'Stop Monitoring' : 'Start Monitoring'}
            </IonButton>
            
            {!isInitialized && (
              <p style={{ textAlign: 'center', color: '#FF9500', fontSize: '13px', margin: '8px 0 0 0' }}>
                Initializing SMS service...
              </p>
            )}
          </IonCardContent>
        </IonCard>

        {/* Configuration Card */}
        <IonCard className="fade-in">
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={settings} style={{ marginRight: '8px' }} />
              Configuration
            </IonCardTitle>
            <IonCardSubtitle>Webhook settings</IonCardSubtitle>
          </IonCardHeader>
          
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Webhook URL</IonLabel>
              <IonInput
                value={webhookUrl}
                placeholder="https://your-server.com/webhook"
                onIonInput={(e) => setWebhookUrl(e.detail.value!)}
                type="url"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Secret Key (Optional)</IonLabel>
              <IonInput
                value={webhookSecret}
                placeholder="Your secret key"
                onIonInput={(e) => setWebhookSecret(e.detail.value!)}
                type="password"
              />
            </IonItem>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <IonButton
                expand="block"
                fill="solid"
                color="success"
                onClick={saveWebhookConfig}
                disabled={!webhookUrl.trim()}
              >
                <IonIcon icon={save} slot="start" />
                Save Config
              </IonButton>
              
              <IonButton
                expand="block"
                fill="outline"
                onClick={testWebhook}
                disabled={!isInitialized || !webhookUrl.trim()}
              >
                <IonIcon icon={send} slot="start" />
                Test
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Info Card */}
        <IonCard className="fade-in">
          <IonCardContent>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--ion-color-primary)', fontSize: '17px', fontWeight: '600' }}>
              <IonIcon icon={warning} style={{ marginRight: '8px' }} />
              How it works
            </h3>
            <p style={{ fontSize: '15px', lineHeight: '1.4', color: '#1C1C1E', margin: 0 }}>
              1. Enter your webhook URL above<br/>
              2. Save configuration first<br/>
              3. Start SMS monitoring with VPN-like foreground service<br/>
              4. App runs persistently like VPN - always monitoring SMS<br/>
              5. All incoming SMS forwarded to your webhook instantly<br/>
              6. Deduplication prevents multiple webhook calls<br/>
              7. Perfect for OTP and notification forwarding
            </p>
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastColor}
        />

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Configuration Required"
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default SMSDashboard;
