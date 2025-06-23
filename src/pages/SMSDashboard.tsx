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
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonTextarea,
  IonBadge,
  IonList,
  IonAlert,
  IonToast,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonChip
} from '@ionic/react';
import { 
  checkmarkCircle, 
  alertCircle, 
  settings, 
  refresh, 
  send,
  phonePortrait,
  time,
  person,
  chatbubble,
  play,
  stop
} from 'ionicons/icons';
import { smsService, SMSMessage } from '../services/sms.service';
import './SMSDashboard.css';

const SMSDashboard: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messageHistory, setMessageHistory] = useState<SMSMessage[]>([]);
  const [serviceStatus, setServiceStatus] = useState<any>({});
  const [allMessages, setAllMessages] = useState<SMSMessage[]>([]);

  useEffect(() => {
    // Load saved configuration
    const savedUrl = localStorage.getItem('webhookUrl');
    const savedSecret = localStorage.getItem('webhookSecret');
    
    if (savedUrl) setWebhookUrl(savedUrl);
    if (savedSecret) setWebhookSecret(savedSecret);
    
    // Initialize service status
    updateServiceStatus();
    
    // Set up periodic status updates
    const statusInterval = setInterval(updateServiceStatus, 2000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const updateServiceStatus = () => {
    const status = smsService.getStatus();
    setServiceStatus(status);
    setIsListening(status.isListening);
    
    // Update message history
    const history = smsService.getMessageHistory();
    setMessageHistory(history);
  };

  const handleSaveConfig = () => {
    if (!webhookUrl.trim()) {
      setAlertMessage('Please enter a webhook URL');
      setShowAlert(true);
      return;
    }

    // Save to localStorage
    localStorage.setItem('webhookUrl', webhookUrl);
    localStorage.setItem('webhookSecret', webhookSecret);
    
    // Configure SMS service
    smsService.setWebhookConfig(webhookUrl, webhookSecret);
    
    setToastMessage('Configuration saved successfully!');
    setShowToast(true);
    updateServiceStatus();
  };

  const handleStartListening = async () => {
    if (!webhookUrl.trim()) {
      setAlertMessage('Please configure webhook URL first');
      setShowAlert(true);
      return;
    }

    setIsLoading(true);
    try {
      const success = await smsService.startListening();
      if (success) {
        setToastMessage('SMS listening started successfully!');
        setShowToast(true);
        updateServiceStatus();
      } else {
        setAlertMessage('Failed to start SMS listening. Please check permissions.');
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error starting SMS listening:', error);
      setAlertMessage('Error starting SMS listening: ' + error);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopListening = async () => {
    setIsLoading(true);
    try {
      await smsService.stopListening();
      setToastMessage('SMS listening stopped');
      setShowToast(true);
      updateServiceStatus();
    } catch (error) {
      console.error('Error stopping SMS listening:', error);
      setAlertMessage('Error stopping SMS listening: ' + error);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setAlertMessage('Please configure webhook URL first');
      setShowAlert(true);
      return;
    }

    setIsLoading(true);
    try {
      const success = await smsService.testWebhook();
      if (success) {
        setToastMessage('Webhook test successful!');
        setShowToast(true);
      } else {
        setAlertMessage('Webhook test failed. Please check your URL and server.');
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      setAlertMessage('Webhook test error: ' + error);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshMessages = async () => {
    setIsLoading(true);
    try {
      const messages = await smsService.readAllSMS();
      setAllMessages(messages);
      setToastMessage(`Loaded ${messages.length} messages`);
      setShowToast(true);
    } catch (error) {
      console.error('Error loading messages:', error);
      setAlertMessage('Error loading messages: ' + error);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await handleRefreshMessages();
    updateServiceStatus();
    event.detail.complete();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'medium';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? checkmarkCircle : alertCircle;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>SMS Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Service Status Card */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={settings} /> Service Status
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="6">
                  <IonChip color={getStatusColor(serviceStatus.isListening)}>
                    <IonIcon icon={getStatusIcon(serviceStatus.isListening)} />
                    <IonLabel>
                      {serviceStatus.isListening ? 'Listening' : 'Stopped'}
                    </IonLabel>
                  </IonChip>
                </IonCol>
                <IonCol size="6">
                  <IonChip color={getStatusColor(serviceStatus.webhookConfigured)}>
                    <IonIcon icon={getStatusIcon(serviceStatus.webhookConfigured)} />
                    <IonLabel>
                      {serviceStatus.webhookConfigured ? 'Configured' : 'Not Set'}
                    </IonLabel>
                  </IonChip>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6">
                  <IonItem lines="none">
                    <IonIcon icon={chatbubble} slot="start" />
                    <IonLabel>
                      <h3>Messages</h3>
                      <p>{serviceStatus.messageCount || 0} in history</p>
                    </IonLabel>
                  </IonItem>
                </IonCol>
                <IonCol size="6">
                  <IonItem lines="none">
                    <IonIcon icon={phonePortrait} slot="start" />
                    <IonLabel>
                      <h3>Last ID</h3>
                      <p>{serviceStatus.lastMessageId || 'None'}</p>
                    </IonLabel>
                  </IonItem>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {/* Webhook Configuration Card */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Webhook Configuration</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Webhook URL *</IonLabel>
              <IonInput
                value={webhookUrl}
                placeholder="https://your-server.com/webhook"
                onIonInput={(e) => setWebhookUrl(e.detail.value!)}
                type="url"
              />
            </IonItem>
            
            <IonItem>
              <IonLabel position="stacked">Webhook Secret (Optional)</IonLabel>
              <IonInput
                value={webhookSecret}
                placeholder="your-secret-key"
                onIonInput={(e) => setWebhookSecret(e.detail.value!)}
                type="password"
              />
            </IonItem>

            <div className="ion-margin-top">
              <IonButton 
                expand="block" 
                onClick={handleSaveConfig}
                disabled={isLoading}
              >
                <IonIcon icon={settings} slot="start" />
                Save Configuration
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Control Buttons Card */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>SMS Monitoring Control</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="6">
                  <IonButton
                    expand="block"
                    color={isListening ? "medium" : "primary"}
                    onClick={isListening ? handleStopListening : handleStartListening}
                    disabled={isLoading}
                  >
                    {isLoading && <IonSpinner name="crescent" />}
                    <IonIcon icon={isListening ? stop : play} slot="start" />
                    {isListening ? 'Stop' : 'Start'} Listening
                  </IonButton>
                </IonCol>
                <IonCol size="6">
                  <IonButton
                    expand="block"
                    fill="outline"
                    onClick={handleTestWebhook}
                    disabled={isLoading || !webhookUrl}
                  >
                    {isLoading && <IonSpinner name="crescent" />}
                    <IonIcon icon={send} slot="start" />
                    Test Webhook
                  </IonButton>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol>
                  <IonButton
                    expand="block"
                    fill="clear"
                    onClick={handleRefreshMessages}
                    disabled={isLoading}
                  >
                    <IonIcon icon={refresh} slot="start" />
                    Load All Messages
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {/* Recent Messages Card */}
        {messageHistory.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Recent Messages ({messageHistory.length})</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {messageHistory.slice(0, 5).map((message, index) => (
                  <IonItem key={message.id}>
                    <IonIcon icon={chatbubble} slot="start" color="primary" />
                    <IonLabel>
                      <h2>From: {message.address}</h2>
                      <p>{message.body.length > 100 ? message.body.substring(0, 100) + '...' : message.body}</p>
                      <p>
                        <IonIcon icon={time} /> {formatTimestamp(message.date)}
                      </p>
                    </IonLabel>
                    <IonBadge color="primary" slot="end">#{message.id}</IonBadge>
                  </IonItem>
                ))}
              </IonList>
              {messageHistory.length > 5 && (
                <p className="ion-text-center ion-margin-top">
                  <small>Showing 5 of {messageHistory.length} messages</small>
                </p>
              )}
            </IonCardContent>
          </IonCard>
        )}

        {/* All Messages Card */}
        {allMessages.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>All SMS Messages ({allMessages.length})</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {allMessages.slice(0, 10).map((message, index) => (
                  <IonItem key={message.id}>
                    <IonIcon icon={person} slot="start" color="secondary" />
                    <IonLabel>
                      <h2>From: {message.address}</h2>
                      <p>{message.body.length > 150 ? message.body.substring(0, 150) + '...' : message.body}</p>
                      <p>
                        <IonIcon icon={time} /> {formatTimestamp(message.date)}
                        <IonBadge color="secondary" className="ion-margin-start">
                          Type: {message.type}
                        </IonBadge>
                      </p>
                    </IonLabel>
                    <IonBadge color="secondary" slot="end">#{message.id}</IonBadge>
                  </IonItem>
                ))}
              </IonList>
              {allMessages.length > 10 && (
                <p className="ion-text-center ion-margin-top">
                  <small>Showing 10 of {allMessages.length} messages</small>
                </p>
              )}
            </IonCardContent>
          </IonCard>
        )}

        {/* Instructions Card */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>How It Works</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItem>
                <IonBadge color="primary" slot="start">1</IonBadge>
                <IonLabel>
                  <h3>Configure Webhook</h3>
                  <p>Enter your webhook URL where SMS will be forwarded</p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonBadge color="primary" slot="start">2</IonBadge>
                <IonLabel>
                  <h3>Start Listening</h3>
                  <p>Begin monitoring for incoming SMS messages</p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonBadge color="primary" slot="start">3</IonBadge>
                <IonLabel>
                  <h3>Automatic Forwarding</h3>
                  <p>New SMS messages are automatically sent to your webhook</p>
                </IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Alerts and Toasts */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Alert"
          message={alertMessage}
          buttons={['OK']}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default SMSDashboard;
