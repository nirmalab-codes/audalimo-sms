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
  RefresherEventDetail,
  IonModal,
  IonList,
  IonCheckbox
} from '@ionic/react';
import { 
  phonePortrait, 
  send, 
  settings,
  warning,
  checkmarkCircle,
  playCircle,
  stopCircle,
  save,
  batteryCharging,
  informationCircle,
  closeCircle,
  checkmark,
  close,
  shield,
  time,
  notifications
} from 'ionicons/icons';
import { smsService } from '../services/sms.service';
import './SMSDashboard.css';

const SMSDashboard: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookSecret, setWebhookSecret] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalForwarded: 0,
    successRate: 100
  });
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [foregroundServiceStatus, setForegroundServiceStatus] = useState<'active' | 'inactive' | 'unknown'>('unknown');
  const [smsCount, setSmsCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isForegroundServiceRunning, setIsForegroundServiceRunning] = useState(false);

  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    // Load saved settings
    const savedUrl = localStorage.getItem('webhookUrl') || '';
    const savedSecret = localStorage.getItem('webhookSecret') || '';
    setWebhookUrl(savedUrl);
    setWebhookSecret(savedSecret);

    // Initialize SMS service
    initializeSMSService();

    // Update status every 10 seconds to sync with service
    const statusInterval = setInterval(() => {
      if (smsService.getStatus().isInitialized) {
        const status = smsService.getStatus();
        setIsListening(status.isListening);
        setIsForegroundServiceRunning(status.isForegroundServiceRunning);
        setForegroundServiceStatus(status.isForegroundServiceRunning ? 'active' : 'inactive');
        
        // Update SMS count
        smsService.getSMSCount().then(count => setSmsCount(count));
      }
    }, 10000);

    return () => clearInterval(statusInterval);
  }, []);

  const initializeSMSService = async () => {
    try {
      console.log('🔄 Initializing SMS service...');
      
      // Initialize the service (this will auto-detect existing foreground service)
      const initialized = await smsService.initialize();
      setIsInitialized(initialized);
      
      if (initialized) {
        // Get current status after initialization
        const status = smsService.getStatus();
        setIsListening(status.isListening);
        setIsForegroundServiceRunning(status.isForegroundServiceRunning);
        setForegroundServiceStatus(status.isForegroundServiceRunning ? 'active' : 'inactive');
        
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
        
        // Show appropriate message based on service state
        if (status.isListening) {
          showToastMessage('SMS monitoring resumed from previous session', 'success');
        } else {
          showToastMessage('SMS service ready', 'success');
        }
        
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
        setForegroundServiceStatus(status.isForegroundServiceRunning ? 'active' : 'inactive');
        
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
      setForegroundServiceStatus('inactive');
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

  const performHealthCheck = async () => {
    try {
      console.log('🏥 Performing app health check...');
      
      const status = await smsService.performAppHealthCheck();
      setHealthStatus(status);
      setShowHealthModal(true);
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      showToastMessage('Health check failed', 'danger');
    }
  };

  const getCheckIcon = (status: string) => {
    switch (status) {
      case 'granted':
      case 'active':
      case 'healthy':
        return { icon: checkmarkCircle, color: 'success' };
      case 'denied':
      case 'inactive':
      case 'critical':
        return { icon: closeCircle, color: 'danger' };
      case 'warning':
        return { icon: warning, color: 'warning' };
      default:
        return { icon: time, color: 'medium' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'danger';
      default: return 'medium';
    }
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
                <div className="stats-number" style={{ color: foregroundServiceStatus === 'active' ? '#34C759' : '#8E8E93' }}>
                  {foregroundServiceStatus === 'active' ? 'VPN' : 'OFF'}
                </div>
                <div className="stats-label">FG-SVC</div>
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

        {/* Troubleshooting Card */}
        <IonCard className="fade-in">
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={batteryCharging} style={{ marginRight: '8px' }} />
              Troubleshooting
            </IonCardTitle>
            <IonCardSubtitle>SMS monitoring stopped working?</IonCardSubtitle>
          </IonCardHeader>
          
          <IonCardContent>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <IonButton
                expand="block"
                fill="solid"
                color="tertiary"
                onClick={performHealthCheck}
                disabled={!isInitialized}
              >
                <IonIcon icon={batteryCharging} slot="start" />
                Health Check
              </IonButton>
              
              <IonButton
                expand="block"
                fill="outline"
                color="danger"
                onClick={async () => {
                  try {
                    await smsService.openBatteryOptimizationSettings();
                    showToastMessage('Battery settings opened', 'success');
                  } catch (error) {
                    showToastMessage('Failed to open settings', 'danger');
                  }
                }}
              >
                <IonIcon icon={batteryCharging} slot="start" />
                Battery Fix
              </IonButton>
            </div>
            
            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: 'var(--ion-color-light)', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: 'var(--ion-color-dark)', margin: '0 0 8px 0', fontWeight: '600' }}>
                🔍 Foreground Service Test:
              </p>
              <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', margin: 0 }}>
                1. Start monitoring → FG-SVC should show "VPN"<br/>
                2. Swipe app away → FG-SVC must STAY "VPN" (critical!)<br/>
                3. Reopen app → FG-SVC should still be "VPN"<br/>
                4. If FG-SVC goes to "OFF" after swipe, service is broken!
              </p>
            </div>
            
            <p style={{ fontSize: '14px', color: 'var(--ion-color-medium)', margin: '12px 0 0 0', textAlign: 'center' }}>
              💡 Foreground service runs persistently like VPN. To stop: tap "Stop Monitoring" or force-stop via Android system settings.
            </p>
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

        {/* Health Check Modal */}
        <IonModal isOpen={showHealthModal} onDidDismiss={() => setShowHealthModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>System Health Check</IonTitle>
              <IonButton
                slot="end"
                fill="clear"
                onClick={() => setShowHealthModal(false)}
              >
                <IonIcon icon={close} />
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            {healthStatus && (
              <>
                {/* Overall Status */}
                <IonCard>
                  <IonCardContent>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <IonIcon
                        icon={getCheckIcon(healthStatus.status).icon}
                        style={{ fontSize: '48px', color: `var(--ion-color-${getCheckIcon(healthStatus.status).color})` }}
                      />
                      <h2 style={{ margin: '8px 0', color: `var(--ion-color-${getStatusColor(healthStatus.status)})` }}>
                        {healthStatus.status.toUpperCase()}
                      </h2>
                      <p style={{ margin: 0, color: 'var(--ion-color-medium)' }}>
                        Last checked: {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </IonCardContent>
                </IonCard>

                {/* System Checks */}
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>System Status</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonList>
                      <IonItem>
                        <IonIcon 
                          icon={shield} 
                          slot="start" 
                          style={{ color: 'var(--ion-color-primary)' }}
                        />
                        <IonLabel>
                          <h3>SMS Permission</h3>
                          <p>Access to read SMS messages</p>
                        </IonLabel>
                        <IonIcon
                          icon={getCheckIcon(healthStatus.checks?.permissions).icon}
                          style={{ color: `var(--ion-color-${getCheckIcon(healthStatus.checks?.permissions).color})` }}
                          slot="end"
                        />
                      </IonItem>

                      <IonItem>
                        <IonIcon 
                          icon={notifications} 
                          slot="start" 
                          style={{ color: 'var(--ion-color-primary)' }}
                        />
                        <IonLabel>
                          <h3>Foreground Service</h3>
                          <p>Persistent background monitoring</p>
                        </IonLabel>
                        <IonIcon
                          icon={getCheckIcon(healthStatus.checks?.foregroundService).icon}
                          style={{ color: `var(--ion-color-${getCheckIcon(healthStatus.checks?.foregroundService).color})` }}
                          slot="end"
                        />
                      </IonItem>

                      <IonItem>
                        <IonIcon 
                          icon={batteryCharging} 
                          slot="start" 
                          style={{ color: 'var(--ion-color-primary)' }}
                        />
                        <IonLabel>
                          <h3>Battery Optimization</h3>
                          <p>
                            {healthStatus.checks?.batteryOptimization === 'enabled' 
                              ? 'Optimization enabled (may restrict app)' 
                              : healthStatus.checks?.batteryOptimization === 'disabled'
                              ? 'Optimization disabled (full access)'
                              : 'Status unknown'
                            }
                          </p>
                        </IonLabel>
                        <IonIcon
                          icon={getCheckIcon(healthStatus.checks?.batteryOptimization === 'enabled' ? 'warning' : healthStatus.checks?.batteryOptimization === 'disabled' ? 'active' : 'unknown').icon}
                          style={{ color: `var(--ion-color-${getCheckIcon(healthStatus.checks?.batteryOptimization === 'enabled' ? 'warning' : healthStatus.checks?.batteryOptimization === 'disabled' ? 'active' : 'unknown').color})` }}
                          slot="end"
                        />
                      </IonItem>

                      <IonItem>
                        <IonIcon 
                          icon={time} 
                          slot="start" 
                          style={{ color: 'var(--ion-color-primary)' }}
                        />
                        <IonLabel>
                          <h3>Recent Activity</h3>
                          <p>
                            {healthStatus.checks?.lastMessageTime === 'never' 
                              ? 'No messages received yet' 
                              : `Last: ${new Date(healthStatus.checks?.lastMessageTime).toLocaleString()}`
                            }
                          </p>
                        </IonLabel>
                        <IonIcon
                          icon={healthStatus.checks?.lastMessageTime === 'never' ? time : checkmarkCircle}
                          style={{ color: healthStatus.checks?.lastMessageTime === 'never' ? 'var(--ion-color-medium)' : 'var(--ion-color-success)' }}
                          slot="end"
                        />
                      </IonItem>
                    </IonList>
                  </IonCardContent>
                </IonCard>

                {/* Issues Found */}
                {healthStatus.issues && healthStatus.issues.length > 0 && (
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle style={{ color: 'var(--ion-color-danger)' }}>
                        ⚠️ Issues Found
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {healthStatus.issues.map((issue: string, index: number) => (
                        <IonItem key={index}>
                          <IonIcon icon={closeCircle} slot="start" style={{ color: 'var(--ion-color-danger)' }} />
                          <IonLabel>
                            <p>{issue}</p>
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonCardContent>
                  </IonCard>
                )}

                {/* Recommendations */}
                {healthStatus.recommendations && healthStatus.recommendations.length > 0 && (
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle style={{ color: 'var(--ion-color-warning)' }}>
                        🛠️ Recommendations
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {healthStatus.recommendations.map((rec: string, index: number) => (
                        <IonItem key={index}>
                          <IonIcon icon={checkmark} slot="start" style={{ color: 'var(--ion-color-warning)' }} />
                          <IonLabel>
                            <p>{rec}</p>
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonCardContent>
                  </IonCard>
                )}

                {/* Battery Optimization Actions */}
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>🔋 Battery Optimization</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <IonButton
                        expand="block"
                        fill="outline"
                        color="primary"
                        onClick={async () => {
                          try {
                            await smsService.openBatteryOptimizationSettings();
                            showToastMessage('Battery settings opened', 'success');
                          } catch (error) {
                            showToastMessage('Failed to open settings', 'danger');
                          }
                        }}
                      >
                        <IonIcon icon={settings} slot="start" />
                        Open Settings
                      </IonButton>
                      
                      <IonButton
                        expand="block"
                        fill="solid"
                        color="success"
                        onClick={async () => {
                          try {
                            const success = await smsService.requestBatteryOptimizationExemption();
                            if (success) {
                              showToastMessage('Battery optimization exemption requested', 'success');
                            } else {
                              showToastMessage('Request failed or not supported', 'warning');
                            }
                          } catch (error) {
                            showToastMessage('Failed to request exemption', 'danger');
                          }
                        }}
                      >
                        <IonIcon icon={checkmarkCircle} slot="start" />
                        Request Exemption
                      </IonButton>
                    </div>
                    
                    <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', margin: 0 }}>
                      Set to "Unrestricted" or tap "Request Exemption" for automatic disable
                    </p>
                  </IonCardContent>
                </IonCard>

                {/* Quick Actions */}
                <IonCard>
                  <IonCardContent>
                    <IonButton
                      expand="block"
                      fill="solid"
                      color="primary"
                      onClick={() => {
                        setShowHealthModal(false);
                        performHealthCheck();
                      }}
                    >
                      <IonIcon icon={batteryCharging} slot="start" />
                      Re-check Health
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              </>
            )}
          </IonContent>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default SMSDashboard;
