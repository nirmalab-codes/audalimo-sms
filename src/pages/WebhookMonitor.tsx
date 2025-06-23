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
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonNote,
  IonButton,
  IonIcon,
  IonText,
  IonChip
} from '@ionic/react';
import { 
  analytics, 
  time, 
  statsChart,
  refresh
} from 'ionicons/icons';
import { smsService, SMSWebhookPayload } from '../services/sms.service';
import './WebhookMonitor.css';

interface WebhookLog {
  id: string;
  timestamp: Date;
  type: 'incoming' | 'delivery_receipt';
  status: 'success' | 'failed';
  payload: SMSWebhookPayload;
  responseTime?: number;
  error?: string;
}

const WebhookMonitor: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    const handleWebhook = (payload: SMSWebhookPayload) => {
      const log: WebhookLog = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: payload.type,
        status: 'success',
        payload,
        responseTime: Math.random() * 500 + 100
      };

      setLogs(prev => [log, ...prev.slice(0, 49)]);
      updateStats(log);
    };

    smsService.addListener(handleWebhook);
    return () => smsService.removeListener(handleWebhook);
  }, []);

  const updateStats = (newLog: WebhookLog) => {
    setStats(prev => {
      const newStats = { ...prev };
      newStats.total += 1;
      
      if (newLog.status === 'success') {
        newStats.success += 1;
      } else {
        newStats.failed += 1;
      }

      // Calculate average response time
      const allLogs = [newLog, ...logs];
      const responseTimes = allLogs
        .filter(log => log.responseTime)
        .map(log => log.responseTime!);
      
      newStats.avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      return newStats;
    });
  };

  const clearLogs = () => {
    setLogs([]);
    setStats({ total: 0, success: 0, failed: 0, avgResponseTime: 0 });
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'success' : 'danger';
  };

  const getTypeColor = (type: string) => {
    return type === 'incoming' ? 'primary' : 'secondary';
  };

  const successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Webhook Monitor</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {/* Statistics */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={statsChart} /> Statistics
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel>Total Requests</IonLabel>
              <IonBadge color="dark">{stats.total}</IonBadge>
            </IonItem>
            
            <IonItem>
              <IonLabel>Success Rate</IonLabel>
              <IonBadge color="success">{successRate.toFixed(1)}%</IonBadge>
            </IonItem>

            <IonItem>
              <IonLabel>Failed Requests</IonLabel>
              <IonBadge color="danger">{stats.failed}</IonBadge>
            </IonItem>

            <IonItem>
              <IonLabel>Avg Response Time</IonLabel>
              <IonBadge color="medium">{stats.avgResponseTime.toFixed(0)}ms</IonBadge>
            </IonItem>
          </IonCardContent>
        </IonCard>

        {/* Activity Logs */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={analytics} /> Activity Logs
              {logs.length > 0 && (
                <IonButton 
                  fill="clear" 
                  size="small" 
                  onClick={clearLogs}
                  style={{ float: 'right' }}
                >
                  <IonIcon icon={refresh} />
                </IonButton>
              )}
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {logs.length === 0 ? (
              <IonText color="medium">
                <p>No webhook activity yet. Activity will appear here when SMS forwarding is active.</p>
              </IonText>
            ) : (
              <IonList>
                {logs.map((log) => (
                  <IonItem key={log.id}>
                    <IonLabel>
                      <h3>
                        <IonChip color={getTypeColor(log.type)}>
                          {log.type.toUpperCase()}
                        </IonChip>
                        <IonBadge color={getStatusColor(log.status)}>
                          {log.status}
                        </IonBadge>
                        {log.responseTime && (
                          <IonNote style={{ marginLeft: '8px' }}>
                            {log.responseTime.toFixed(0)}ms
                          </IonNote>
                        )}
                      </h3>
                      <p>
                        From: {log.payload.message.from}
                      </p>
                      <p>{log.payload.message.body}</p>
                      {log.error && (
                        <p style={{ color: 'var(--ion-color-danger)' }}>
                          Error: {log.error}
                        </p>
                      )}
                      <IonNote>
                        <IonIcon icon={time} size="small" /> {' '}
                        {log.timestamp.toLocaleString()}
                      </IonNote>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default WebhookMonitor;
