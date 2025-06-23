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
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonRange,
  IonNote,
  IonIcon,
  IonText,
  IonButton,
  IonToast
} from '@ionic/react';
import { 
  settings, 
  notifications, 
  batteryCharging,
  colorPalette
} from 'ionicons/icons';
import './Settings.css';

interface AppSettings {
  backgroundService: boolean;
  autoStart: boolean;
  persistentNotification: boolean;
  heartbeatInterval: number;
  theme: string;
  logRetention: number;
}

const Settings: React.FC = () => {
  const [appSettings, setAppSettings] = useState<AppSettings>({
    backgroundService: false,
    autoStart: false,
    persistentNotification: true,
    heartbeatInterval: 5,
    theme: 'auto',
    logRetention: 30
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setAppSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
    setToastMessage('Settings saved');
    setShowToast(true);
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setAppSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {/* Background Service */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={settings} /> Background Service
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel>
                <h3>Enable Background Processing</h3>
                <p>Keep SMS monitoring active in background</p>
              </IonLabel>
              <IonToggle
                checked={appSettings.backgroundService}
                onIonChange={(e) => updateSetting('backgroundService', e.detail.checked)}
              />
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Auto-start on Boot</h3>
                <p>Start service when device boots</p>
              </IonLabel>
              <IonToggle
                checked={appSettings.autoStart}
                onIonChange={(e) => updateSetting('autoStart', e.detail.checked)}
              />
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Persistent Notification</h3>
                <p>Show notification when service is running</p>
              </IonLabel>
              <IonToggle
                checked={appSettings.persistentNotification}
                onIonChange={(e) => updateSetting('persistentNotification', e.detail.checked)}
              />
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Heartbeat Interval</h3>
                <p>{appSettings.heartbeatInterval} minutes</p>
              </IonLabel>
              <IonRange
                min={1}
                max={30}
                step={1}
                value={appSettings.heartbeatInterval}
                onIonChange={(e) => updateSetting('heartbeatInterval', e.detail.value)}
              />
            </IonItem>

            {appSettings.backgroundService && (
              <IonText color="warning" style={{ padding: '12px', display: 'block' }}>
                <IonIcon icon={batteryCharging} /> 
                <strong> Battery Optimization:</strong> Disable battery optimization for this app in Android settings to ensure reliable background operation.
              </IonText>
            )}
          </IonCardContent>
        </IonCard>

        {/* Notifications */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={notifications} /> Auto-Forward Rules
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel>
                <h3>OTP Messages</h3>
                <p>Forward messages containing OTP keywords</p>
              </IonLabel>
              <IonToggle checked={true} />
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Bank Notifications</h3>
                <p>Forward messages from bank numbers</p>
              </IonLabel>
              <IonToggle checked={true} />
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>All Messages</h3>
                <p>Forward all incoming SMS</p>
              </IonLabel>
              <IonToggle checked={false} />
            </IonItem>
          </IonCardContent>
        </IonCard>

        {/* General Settings */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={colorPalette} /> General
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel>Theme</IonLabel>
              <IonSelect
                value={appSettings.theme}
                onIonChange={(e) => updateSetting('theme', e.detail.value)}
              >
                <IonSelectOption value="auto">Auto</IonSelectOption>
                <IonSelectOption value="light">Light</IonSelectOption>
                <IonSelectOption value="dark">Dark</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel>Log Retention</IonLabel>
              <IonSelect
                value={appSettings.logRetention}
                onIonChange={(e) => updateSetting('logRetention', e.detail.value)}
              >
                <IonSelectOption value={7}>7 days</IonSelectOption>
                <IonSelectOption value={30}>30 days</IonSelectOption>
                <IonSelectOption value={90}>90 days</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonButton 
              expand="block" 
              onClick={saveSettings}
              style={{ marginTop: '16px' }}
            >
              Save Settings
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default Settings;
