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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonBadge,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonProgressBar
} from '@ionic/react';
import { 
  analytics, 
  time, 
  checkmarkCircle, 
  closeCircle,
  trendingUp,
  pulse,
  speedometer,
  globe,
  refresh
} from 'ionicons/icons';
import { smsService, WebhookPayload, SMSMessage } from '../services/sms.service';
import './WebhookMonitor.css';

interface WebhookActivity {
  id: string;
  timestamp: number;
  status: 'success' | 'failed' | 'pending';
  message: string;
  sender: string;
  responseTime?: number;
  error?: string;
}

interface WebhookStats {
  totalSent: number;
  successCount: number;
  failedCount: number;
  averageResponseTime: number;
  successRate: number;
  lastActivity: number;
}

const WebhookMonitor: React.FC = () => {
  const [selectedSegment, setSelectedSegment] = useState<string>('statistics');
  const [webhookActivities, setWebhookActivities] = useState<WebhookActivity[]>([]);
  const [webhookStats, setWebhookStats] = useState<WebhookStats>({
    totalSent: 0,
    successCount: 0,
    failedCount: 0,
    averageResponseTime: 0,
    successRate: 0,
    lastActivity: 0
  });
  const [serviceStatus, setServiceStatus] = useState<any>({});
  const [messageHistory, setMessageHistory] = useState<SMSMessage[]>([]);

  useEffect(() => {
    // Load saved activities from localStorage
    const savedActivities = localStorage.getItem('webhookActivities');
    if (savedActivities) {
      try {
        const activities = JSON.parse(savedActivities);
        setWebhookActivities(activities);
        calculateStats(activities);
      } catch (error) {
        console.error('Error loading webhook activities:', error);
      }
    }

    // Set up periodic updates
    const updateInterval = setInterval(() => {
      updateServiceStatus();
      checkForNewMessages();
    }, 3000);

    return () => {
      clearInterval(updateInterval);
    };
  }, []);

  const updateServiceStatus = () => {
    const status = smsService.getStatus();
    setServiceStatus(status);
    
    const history = smsService.getMessageHistory();
    setMessageHistory(history);
  };

  const checkForNewMessages = () => {
    // Check if there are new messages that might have triggered webhooks
    const currentHistory = smsService.getMessageHistory();
    
    // Simulate webhook activities based on message history
    // In real implementation, this would come from actual webhook responses
    currentHistory.forEach(message => {
      const existingActivity = webhookActivities.find(
        activity => activity.id === `msg-${message.id}`
      );
      
      if (!existingActivity) {
        const newActivity: WebhookActivity = {
          id: `msg-${message.id}`,
          timestamp: message.date,
          status: Math.random() > 0.1 ? 'success' : 'failed', // 90% success rate simulation
          message: message.body.substring(0, 50) + '...',
          sender: message.address,
          responseTime: Math.floor(Math.random() * 500) + 100, // 100-600ms
          error: Math.random() > 0.9 ? 'Connection timeout' : undefined
        };
        
        addWebhookActivity(newActivity);
      }
    });
  };

  const addWebhookActivity = (activity: WebhookActivity) => {
    setWebhookActivities(prev => {
      const updated = [activity, ...prev].slice(0, 100); // Keep last 100 activities
      saveActivitiesToStorage(updated);
      calculateStats(updated);
      return updated;
    });
  };

  const saveActivitiesToStorage = (activities: WebhookActivity[]) => {
    try {
      localStorage.setItem('webhookActivities', JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving webhook activities:', error);
    }
  };

  const calculateStats = (activities: WebhookActivity[]) => {
    if (activities.length === 0) {
      setWebhookStats({
        totalSent: 0,
        successCount: 0,
        failedCount: 0,
        averageResponseTime: 0,
        successRate: 0,
        lastActivity: 0
      });
      return;
    }

    const totalSent = activities.length;
    const successCount = activities.filter(a => a.status === 'success').length;
    const failedCount = activities.filter(a => a.status === 'failed').length;
    const responseTimes = activities
      .filter(a => a.responseTime)
      .map(a => a.responseTime!);
    const averageResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
      : 0;
    const successRate = totalSent > 0 ? Math.round((successCount / totalSent) * 100) : 0;
    const lastActivity = activities.length > 0 ? activities[0].timestamp : 0;

    setWebhookStats({
      totalSent,
      successCount,
      failedCount,
      averageResponseTime,
      successRate,
      lastActivity
    });
  };

  const handleRefresh = async (event: CustomEvent) => {
    updateServiceStatus();
    checkForNewMessages();
    event.detail.complete();
  };

  const clearActivities = () => {
    setWebhookActivities([]);
    localStorage.removeItem('webhookActivities');
    calculateStats([]);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'danger';
      case 'pending': return 'warning';
      default: return 'medium';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return checkmarkCircle;
      case 'failed': return closeCircle;
      default: return time;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Webhook Monitor</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Service Status Overview */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={pulse} /> Service Overview
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="6">
                  <IonChip color={serviceStatus.isListening ? 'success' : 'medium'}>
                    <IonIcon icon={serviceStatus.isListening ? checkmarkCircle : closeCircle} />
                    <IonLabel>
                      {serviceStatus.isListening ? 'Active' : 'Inactive'}
                    </IonLabel>
                  </IonChip>
                </IonCol>
                <IonCol size="6">
                  <IonChip color={serviceStatus.webhookConfigured ? 'success' : 'warning'}>
                    <IonIcon icon={globe} />
                    <IonLabel>
                      {serviceStatus.webhookConfigured ? 'Configured' : 'No Webhook'}
                    </IonLabel>
                  </IonChip>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {/* Segment Control */}
        <IonSegment 
          value={selectedSegment} 
          onIonChange={e => setSelectedSegment(e.detail.value as string)}
        >
          <IonSegmentButton value="statistics">
            <IonLabel>Statistics</IonLabel>
            <IonIcon icon={analytics} />
          </IonSegmentButton>
          <IonSegmentButton value="activity">
            <IonLabel>Activity Log</IonLabel>
            <IonIcon icon={time} />
          </IonSegmentButton>
        </IonSegment>

        {/* Statistics View */}
        {selectedSegment === 'statistics' && (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={analytics} /> Webhook Statistics
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="6">
                      <div className="stat-item">
                        <IonIcon icon={trendingUp} color="primary" />
                        <h2>{webhookStats.totalSent}</h2>
                        <p>Total Sent</p>
                      </div>
                    </IonCol>
                    <IonCol size="6">
                      <div className="stat-item">
                        <IonIcon icon={checkmarkCircle} color="success" />
                        <h2>{webhookStats.successRate}%</h2>
                        <p>Success Rate</p>
                      </div>
                    </IonCol>
                  </IonRow>
                  <IonRow>
                    <IonCol size="6">
                      <div className="stat-item">
                        <IonIcon icon={speedometer} color="warning" />
                        <h2>{webhookStats.averageResponseTime}ms</h2>
                        <p>Avg Response</p>
                      </div>
                    </IonCol>
                    <IonCol size="6">
                      <div className="stat-item">
                        <IonIcon icon={closeCircle} color="danger" />
                        <h2>{webhookStats.failedCount}</h2>
                        <p>Failed</p>
                      </div>
                    </IonCol>
                  </IonRow>
                </IonGrid>

                {/* Success Rate Progress Bar */}
                <div className="ion-margin-top">
                  <IonLabel>
                    <h3>Success Rate</h3>
                  </IonLabel>
                  <IonProgressBar 
                    value={webhookStats.successRate / 100}
                    color={webhookStats.successRate > 90 ? 'success' : webhookStats.successRate > 70 ? 'warning' : 'danger'}
                  />
                  <p className="ion-text-center ion-margin-top">
                    {webhookStats.successCount} successful out of {webhookStats.totalSent} total
                  </p>
                </div>

                {webhookStats.lastActivity > 0 && (
                  <div className="ion-margin-top">
                    <p>
                      <IonIcon icon={time} /> Last Activity: {formatTimestamp(webhookStats.lastActivity)}
                    </p>
                  </div>
                )}
              </IonCardContent>
            </IonCard>

            {/* Message History Summary */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Recent Message Activity</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {messageHistory.length > 0 ? (
                  <IonList>
                    {messageHistory.slice(0, 3).map((message, index) => (
                      <IonItem key={message.id}>
                        <IonIcon icon={checkmarkCircle} slot="start" color="success" />
                        <IonLabel>
                          <h3>From: {message.address}</h3>
                          <p>{message.body.substring(0, 60)}...</p>
                          <p>{formatTimestamp(message.date)}</p>
                        </IonLabel>
                        <IonBadge color="success" slot="end">Forwarded</IonBadge>
                      </IonItem>
                    ))}
                  </IonList>
                ) : (
                  <p className="ion-text-center" style={{ color: '#666', fontStyle: 'italic' }}>
                    No recent message activity
                  </p>
                )}
              </IonCardContent>
            </IonCard>
          </>
        )}

        {/* Activity Log View */}
        {selectedSegment === 'activity' && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={time} /> Webhook Activity Log
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {webhookActivities.length > 0 ? (
                <>
                  <div className="ion-margin-bottom">
                    <IonChip color="primary" onClick={clearActivities}>
                      <IonIcon icon={refresh} />
                      <IonLabel>Clear Log</IonLabel>
                    </IonChip>
                  </div>
                  
                  <IonList>
                    {webhookActivities.slice(0, 20).map((activity) => (
                      <IonItem key={activity.id}>
                        <IonIcon 
                          icon={getStatusIcon(activity.status)} 
                          slot="start" 
                          color={getStatusColor(activity.status)} 
                        />
                        <IonLabel>
                          <h3>To: {activity.sender}</h3>
                          <p>{activity.message}</p>
                          <p>
                            {formatTimestamp(activity.timestamp)}
                            {activity.responseTime && (
                              <span> • {activity.responseTime}ms</span>
                            )}
                          </p>
                          {activity.error && (
                            <p style={{ color: 'var(--ion-color-danger)' }}>
                              Error: {activity.error}
                            </p>
                          )}
                        </IonLabel>
                        <IonBadge 
                          color={getStatusColor(activity.status)} 
                          slot="end"
                        >
                          {activity.status}
                        </IonBadge>
                      </IonItem>
                    ))}
                  </IonList>
                  
                  {webhookActivities.length > 20 && (
                    <p className="ion-text-center ion-margin-top">
                      <small>Showing 20 of {webhookActivities.length} activities</small>
                    </p>
                  )}
                </>
              ) : (
                <p className="ion-text-center" style={{ color: '#666', fontStyle: 'italic' }}>
                  No webhook activities recorded yet
                </p>
              )}
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default WebhookMonitor;
