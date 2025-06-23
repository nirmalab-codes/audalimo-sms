import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonTextarea,
  IonList,
  IonBadge,
  IonIcon,
  IonToast,
  IonAlert,
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonRefresher,
  IonRefresherContent
} from '@ionic/react';
import { 
  send, 
  checkmark, 
  close, 
  time,
  refresh,
  phonePortrait,
  chatbubbles,
  settings,
  globe,
  shield
} from 'ionicons/icons';
import { smsService, SMSMessage, SMSWebhookPayload } from '../services/sms.service';
import './SMSDashboard.css';

const SMSDashboard: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [serviceStatus, setServiceStatus] = useState({
    isListening: false,
    hasWebhook: false,
    platform: 'web',
    mode: 'web',
    hasNativePlugin: false
  });

  useEffect(() => {
    // Load saved configuration
    const savedUrl = localStorage.getItem('webhook_url') || '';
    const savedSecret = localStorage.getItem('webhook_secret') || '';
    setWebhookUrl(savedUrl);
    setWebhookSecret(savedSecret);
    
    // Configure SMS service with saved values
    if (savedUrl) {
      smsService.setWebhookConfig(savedUrl, savedSecret);
    }
    
    // Add SMS listener
    const handleSMS = (payload: SMSWebhookPayload) => {
      console.log('📱 SMS received in dashboard:', payload);
      setMessages(prev => [payload.message, ...prev].slice(0, 50)); // Keep last 50 messages
      showToastMessage(`New SMS from ${payload.message.from}`);
    };
    
    smsService.addListener(handleSMS);
    
    // Initial status update
    updateStatus();
    
    // Update status every 5 seconds
    const statusInterval = setInterval(updateStatus, 5000);
    
    return () => {
      smsService.removeListener(handleSMS);
      clearInterval(statusInterval);
    };
  }, []);

  const updateStatus = async () => {
    const status = smsService.getStatus();
    setServiceStatus(status);
  };

  const saveWebhookConfig = () => {
    if (!webhookUrl.trim()) {
      showAlertMessage('Please enter a webhook URL');
      return;
    }

    // Save to localStorage
    localStorage.setItem('webhook_url', webhookUrl);
    localStorage.setItem('webhook_secret', webhookSecret);
    
    // Configure SMS service
    smsService.setWebhookConfig(webhookUrl, webhookSecret);
    
    showToastMessage('Webhook configuration saved successfully');
  };

  const testWebhook = async () => {
    if (!webhookUrl.trim()) {
      showAlertMessage('Please configure webhook URL first');
      return;
    }
    
    try {
      const success = await smsService.testWebhook();
      if (success) {
        showToastMessage('Webhook test successful!');
      } else {
        showAlertMessage('Webhook test failed. Check the URL and try again.');
      }
    } catch (error) {
      showAlertMessage('Webhook test failed: ' + (error as Error).message);
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await smsService.requestPermissions();
      if (granted) {
        showToastMessage('SMS permissions granted');
        updateStatus();
      } else {
        showAlertMessage('SMS permissions denied. Please enable them in settings.');
      }
    } catch (error) {
      showAlertMessage('Error requesting permissions: ' + (error as Error).message);
    }
  };

  const simulateTestSMS = () => {
    const testSenders = ['TEST-BANK', 'OTP-SERVICE', '+6281234567890'];
    const testMessages = [
      'Your OTP code is 123456. Valid for 5 minutes.',
      'Transaction alert: Your account has been debited.',
      'Verification code: 789012. Do not share this code.'
    ];
    
    const randomSender = testSenders[Math.floor(Math.random() * testSenders.length)];
    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
    
    smsService.simulateIncomingSMS(randomSender, randomMessage);
    showToastMessage('Test SMS simulated');
  };

  const doRefresh = async (event: CustomEvent) => {
    await updateStatus();
    event.detail.complete();
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const showAlertMessage = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const getStatusColor = () => {
    if (serviceStatus.isListening && serviceStatus.hasWebhook) return 'success';
    if (serviceStatus.isListening) return 'warning';
    return 'danger';
  };

  const getStatusText = () => {
    if (serviceStatus.isListening && serviceStatus.hasWebhook) return 'Active & Configured';
    if (serviceStatus.isListening) return 'Listening (No Webhook)';
    return 'Not Listening';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>SMS Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Service Status Card */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Service Status</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="6">
                  <IonChip color={getStatusColor()}>
                    <IonIcon icon={serviceStatus.isListening ? checkmark : close} />
                    <IonLabel>{getStatusText()}</IonLabel>
                  </IonChip>
                </IonCol>
                <IonCol size="6">
                  <IonChip color="medium">
                    <IonIcon icon={phonePortrait} />
                    <IonLabel>{serviceStatus.platform || 'Unknown'}</IonLabel>
                  </IonChip>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6">
                  <IonChip color="primary">
                    <IonIcon icon={chatbubbles} />
                    <IonLabel>Messages: {messages.length}</IonLabel>
                  </IonChip>
                </IonCol>
                <IonCol size="6">
                  <IonChip color={serviceStatus.hasNativePlugin ? 'success' : 'medium'}>
                    <IonIcon icon={settings} />
                    <IonLabel>Plugin: {serviceStatus.hasNativePlugin ? 'Ready' : 'Fallback'}</IonLabel>
                  </IonChip>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="12">
                  <IonChip color="tertiary">
                    <IonIcon icon={time} />
                    <IonLabel>Mode: {serviceStatus.mode}</IonLabel>
                  </IonChip>
                </IonCol>
              </IonRow>
            </IonGrid>
            
            {serviceStatus.mode === 'native' && (
              <div style={{ marginTop: '12px' }}>
                <IonButton fill="outline" size="small" onClick={requestPermissions}>
                  <IonIcon icon={settings} slot="start" />
                  Request Permissions
                </IonButton>
                
                <IonButton fill="outline" size="small" onClick={updateStatus} style={{ marginLeft: '8px' }}>
                  <IonIcon icon={refresh} slot="start" />
                  Refresh Status
                </IonButton>
              </div>
            )}
            
            {serviceStatus.mode === 'native' && serviceStatus.isListening && (
              <div style={{ marginTop: '12px', padding: '8px', background: '#f0f8ff', borderRadius: '4px' }}>
                <small style={{ color: '#0066cc' }}>
                  ⚡ Real-time native SMS detection active with BroadcastReceiver
                </small>
              </div>
            )}

            {serviceStatus.mode === 'web' && (
              <div style={{ marginTop: '12px', padding: '8px', background: '#fff8f0', borderRadius: '4px' }}>
                <small style={{ color: '#cc6600' }}>
                  🌐 Web mode - using simulation for testing
                </small>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Webhook Configuration */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={globe} style={{ marginRight: '8px' }} />
              Webhook Configuration
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Webhook URL</IonLabel>
                <IonInput
                  value={webhookUrl}
                  placeholder="https://your-server.com/webhook"
                  onIonInput={(e) => setWebhookUrl(e.detail.value!)}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Webhook Secret (Optional)</IonLabel>
                <IonInput
                  value={webhookSecret}
                  placeholder="Your secret key for signature verification"
                  onIonInput={(e) => setWebhookSecret(e.detail.value!)}
                />
              </IonItem>
            </IonList>
            
            <div style={{ marginTop: '16px' }}>
              <IonButton expand="block" onClick={saveWebhookConfig}>
                <IonIcon icon={shield} slot="start" />
                Save Configuration
              </IonButton>
              
              <IonButton expand="block" fill="outline" onClick={testWebhook} style={{ marginTop: '8px' }}>
                <IonIcon icon={send} slot="start" />
                Test Webhook
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Test SMS */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Testing</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonButton expand="block" fill="outline" onClick={simulateTestSMS}>
              <IonIcon icon={chatbubbles} slot="start" />
              Simulate Test SMS
            </IonButton>
            <small style={{ color: '#666', marginTop: '8px', display: 'block' }}>
              Generate a test SMS to verify webhook forwarding
            </small>
          </IonCardContent>
        </IonCard>

        {/* Recent Messages */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Recent Messages ({messages.length})</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {messages.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                No messages received yet
              </p>
            ) : (
              <IonList>
                {messages.slice(0, 10).map((message) => (
                  <IonItem key={message.id}>
                    <IonLabel>
                      <h3>{message.from}</h3>
                      <p>{message.body}</p>
                      <small>{message.timestamp.toLocaleString()}</small>
                    </IonLabel>
                    <IonBadge color="primary" slot="end">
                      {message.status}
                    </IonBadge>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        {/* Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />

        {/* Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="SMS Dashboard"
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default SMSDashboard;
