import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonButton,
  IonIcon,
  IonBadge,
  IonText,
  IonAlert,
  IonToast
} from '@ionic/react';
import {
  settings,
  phonePortrait,
  checkmarkCircle,
  refresh,
  batteryCharging
} from 'ionicons/icons';
import { smsService } from '../services/sms.service';
import './Settings.css';

const Settings: React.FC = () => {
  const [backgroundServiceEnabled, setBackgroundServiceEnabled] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [serviceStatus, setServiceStatus] = useState<any>({});

  useEffect(() => {
    loadServiceStatus();
  }, []);

  const loadServiceStatus = () => {
    const status = smsService.getStatus();
    setServiceStatus(status);
    setBackgroundServiceEnabled(status.isListening);
  };

  const handleBackgroundServiceToggle = async (enabled: boolean) => {
    setBackgroundServiceEnabled(enabled);
    
    if (enabled) {
      const success = await smsService.startListening();
      if (!success) {
        setBackgroundServiceEnabled(false);
        setAlertMessage('Failed to start background service. Please check permissions and webhook configuration.');
        setShowAlert(true);
        return;
      }
      setToastMessage('Background service started');
    } else {
      await smsService.stopListening();
      setToastMessage('Background service stopped');
    }
    
    setShowToast(true);
    loadServiceStatus();
  };

  const requestBatteryOptimization = () => {
    setAlertMessage('To ensure reliable background operation:\n\n1. Go to Settings > Apps > SMS Webhook\n2. Tap "Battery"\n3. Select "Don\'t optimize"\n\nThis prevents Android from stopping the app in the background.');
    setShowAlert(true);
  };

  const testBackgroundService = async () => {
    try {
      const status = smsService.getStatus();
      let message = `Service Status:\n\n`;
      message += `• SMS Monitoring: ${status.isListening ? '✅ Active' : '❌ Inactive'}\n`;
      message += `• Background Mode: ${status.isBackgroundModeEnabled ? '✅ Enabled' : '❌ Disabled'}\n`;
      message += `• Foreground Service: ${status.isForegroundServiceRunning ? '✅ Running' : '❌ Idle'}\n`;
      message += `• Messages Processed: ${status.messageCount}\n`;
      message += `• Webhook: ${status.hasWebhook ? '✅ Configured' : '❌ Not Set'}`;
      
      setAlertMessage(message);
      setShowAlert(true);
    } catch (error) {
      setAlertMessage('Failed to get service status');
      setShowAlert(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>

        {/* Background Service */}
        <IonCard>
          <IonCardContent>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2em', paddingBottom: '10px' }}>Background Service</h2>
                <IonBadge color={serviceStatus.isListening ? 'success' : 'medium'}>
                  {serviceStatus.isListening ? 'Active' : 'Inactive'}
                </IonBadge>
              </div>
              <IonButton fill="clear" onClick={testBackgroundService}>
                <IonIcon icon={refresh} />
              </IonButton>
            </div>

            <IonList lines="none">
              <IonItem style={{ '--padding-start': '0', '--background': 'white' }} >
                <IonLabel>
                  <h3>Enable SMS Monitoring</h3>
                  <p>Keep monitoring SMS when app is in background</p>
                </IonLabel>
                <IonToggle slot="end"
                  checked={backgroundServiceEnabled}
                  onIonChange={(e) => handleBackgroundServiceToggle(e.detail.checked)}
                />
              </IonItem>
            </IonList>

            {serviceStatus.isListening && (
              <div style={{ marginTop: '16px',  borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <IonIcon icon={checkmarkCircle} style={{ fontSize: '3rem', color: 'green', height: '30px' }} />
                  <p style={{ margin: 0, fontSize: '0.9em' }}>
                    Background monitoring is active. SMS messages will be forwarded to your webhook using background mode.
                  </p>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Service Details */}
        <IonCard>
          <IonCardContent>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2em' }}>Service Details</h2>
            
            <IonList lines="none">
              <IonItem style={{ '--padding-start': '0', '--background': 'white' }}>
                <IonIcon icon={phonePortrait} slot="start" color="primary" />
                <IonLabel>
                  <h3>Messages Processed</h3>
                  <p>{serviceStatus.messageCount || 0} total</p>
                </IonLabel>
              </IonItem>

              <IonItem style={{ '--padding-start': '0', '--background': 'white' }}>
                <IonIcon icon={settings} slot="start" color="secondary" />
                <IonLabel>
                  <h3>Webhook Status</h3>
                  <p>{serviceStatus.hasWebhook ? 'Configured' : 'Not configured'}</p>
                </IonLabel>
                <IonBadge color={serviceStatus.hasWebhook ? 'success' : 'warning'}>
                  {serviceStatus.hasWebhook ? 'Ready' : 'Setup Required'}
                </IonBadge>
              </IonItem>

              <IonItem style={{ '--padding-start': '0', '--background': 'white' }}>
                <IonIcon icon={batteryCharging} slot="start" color="warning" />
                <IonLabel>
                  <h3>Background Mode</h3>
                  <p>{serviceStatus.isBackgroundModeEnabled ? 'Enabled' : 'Disabled'}</p>
                </IonLabel>
                <IonBadge color={serviceStatus.isBackgroundModeEnabled ? 'success' : 'medium'}>
                  {serviceStatus.isBackgroundModeEnabled ? 'Active' : 'Inactive'}
                </IonBadge>
              </IonItem>

              <IonItem style={{ '--padding-start': '0', '--background': 'white' }}>
                <IonIcon icon={refresh} slot="start" color="tertiary" />
                <IonLabel>
                  <h3>Background Task</h3>
                  <p>{serviceStatus.backgroundTaskActive ? 'Running' : 'Idle'}</p>
                </IonLabel>
                <IonBadge color={serviceStatus.backgroundTaskActive ? 'success' : 'medium'}>
                  {serviceStatus.backgroundTaskActive ? 'Active' : 'Standby'}
                </IonBadge>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Battery Optimization */}
        <IonCard>
          <IonCardContent>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '1.2em' }}>Battery Optimization</h2>
            <IonText color="medium">
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9em', lineHeight: '1.4' }}>
                For reliable background operation, disable battery optimization for this app. This ensures SMS monitoring continues even when the phone is idle.
              </p>
            </IonText>
            
            <IonButton expand="block" fill="outline" onClick={requestBatteryOptimization}>
              <IonIcon icon={batteryCharging} slot="start" />
              Battery Settings Guide
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Settings"
          message={alertMessage}
          buttons={['OK']}
        />

        {/* Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
        />

      </IonContent>
    </IonPage>
  );
};

export default Settings;
