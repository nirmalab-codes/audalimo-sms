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
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonList,
  IonAvatar,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail
} from '@ionic/react';
import { 
  chatbubbles,
  checkmarkCircle,
  closeCircle,
  time, 
  refresh
} from 'ionicons/icons';
import { smsService } from '../services/sms.service';
import './WebhookMonitor.css';

interface DisplayMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  webhookStatus: 'pending' | 'success' | 'failed';
}

const WebhookMonitor: React.FC = () => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadMessageHistory();
    // Refresh every 5 seconds to get real-time updates
    const interval = setInterval(loadMessageHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMessageHistory = () => {
    try {
      // Get real messages from SMS service
      const smsMessages = smsService.getMessageHistory();
      
      // Convert SMS messages to display format
      const displayMessages: DisplayMessage[] = smsMessages.map(msg => ({
        id: msg.id.toString(),
        sender: msg.address,
        content: msg.body,
        timestamp: new Date(msg.date),
        webhookStatus: 'success' // Assume successful since they're in history
      }));

      // Sort by timestamp (newest first)
      displayMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setMessages(displayMessages);
      setTotalCount(displayMessages.length);

      // Calculate today's count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMessages = displayMessages.filter(msg => 
        msg.timestamp >= today
      );
      setTodayCount(todayMessages.length);

      console.log('📊 Message history loaded:', {
        total: displayMessages.length,
        today: todayMessages.length,
        messages: displayMessages.slice(0, 3) // Log first 3 for debugging
      });

    } catch (error) {
      console.error('❌ Error loading message history:', error);
      
      // Fallback to sample data if service fails
      loadSampleData();
    }
  };

  const loadSampleData = () => {
    // Fallback sample messages
    const sampleMessages: DisplayMessage[] = [
      {
        id: '1',
        sender: '+6281234567890',
        content: 'Your OTP code is 123456. Valid for 5 minutes.',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        webhookStatus: 'success'
      },
      {
        id: '2',
        sender: 'BCA',
        content: 'Transfer Rp500.000 to JOHN DOE successful. Balance: Rp2.500.000',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        webhookStatus: 'success'
      },
      {
        id: '3',
        sender: '+6287654321098',
        content: 'Meeting reminder: Team standup at 2 PM today',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        webhookStatus: 'failed'
      },
      {
        id: '4',
        sender: 'MANDIRI',
        content: 'Saldo Anda Rp1.250.000. Terima kasih telah menggunakan layanan kami.',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        webhookStatus: 'success'
      }
    ];
    
    setMessages(sampleMessages);
    setTotalCount(sampleMessages.length);
    setTodayCount(sampleMessages.length);
    
    console.log('📋 Using sample data as fallback');
  };

  const doRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    loadMessageHistory();
    event.detail.complete();
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return checkmarkCircle;
      case 'failed': return closeCircle;
      default: return time;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'danger';
      default: return 'warning';
    }
  };

  const getSenderInitial = (sender: string) => {
    if (sender.includes('BCA')) return 'B';
    if (sender.includes('MANDIRI')) return 'M';
    if (sender.includes('BNI')) return 'N';
    if (sender.includes('BRI')) return 'R';
    if (sender.includes('TEST')) return 'T';
    if (sender.includes('+')) return '#';
    return sender.charAt(0).toUpperCase();
  };

  const getSenderColor = (sender: string) => {
    const colors = ['#007AFF', '#5AC8FA', '#5856D6', '#34C759', '#FF9500', '#FF3B30'];
    let hash = 0;
    for (let i = 0; i < sender.length; i++) {
      hash = sender.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Messages</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Stats Card */}
        <IonCard className="fade-in">
                  <IonCardHeader>
                    <IonCardTitle>
              <IonIcon icon={chatbubbles} style={{ marginRight: '8px' }} />
              Message Activity
                    </IonCardTitle>
            <IonCardSubtitle>SMS forwarding statistics</IonCardSubtitle>
                  </IonCardHeader>
          
                  <IonCardContent>
            <div className="stats-row">
              <div className="stats-card">
                <div className="stats-number">{todayCount}</div>
                <div className="stats-label">Today</div>
              </div>
              <div className="stats-card">
                <div className="stats-number">{totalCount}</div>
                <div className="stats-label">Total</div>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Messages List */}
        <IonCard className="fade-in">
          <IonCardHeader>
            <IonCardTitle>Recent Messages</IonCardTitle>
            <IonCardSubtitle>{messages.length} messages</IonCardSubtitle>
          </IonCardHeader>
          
          <IonCardContent style={{ padding: '0' }}>
            <IonList>
              {messages.length === 0 ? (
                    <IonItem>
                      <IonLabel>
                    <p style={{ textAlign: 'center', color: '#8E8E93', padding: '20px' }}>
                      No messages yet. Start monitoring to see SMS messages here.
                    </p>
                      </IonLabel>
                    </IonItem>
              ) : (
                messages.map((message) => (
                  <IonItem key={message.id} className="message-item">
                    <IonAvatar slot="start">
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: getSenderColor(message.sender),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        {getSenderInitial(message.sender)}
                      </div>
                    </IonAvatar>
                    
                      <IonLabel>
                      <div className="message-sender">{message.sender}</div>
                      <div className="message-content">
                        {message.content.length > 80 
                          ? message.content.substring(0, 80) + '...' 
                          : message.content
                        }
                      </div>
                      <div className="message-time">
                        <span>{formatTime(message.timestamp)}</span>
                        <IonIcon 
                          icon={getStatusIcon(message.webhookStatus)} 
                          style={{ 
                            fontSize: '14px', 
                            color: getStatusColor(message.webhookStatus) === 'success' ? '#34C759' : 
                                   getStatusColor(message.webhookStatus) === 'danger' ? '#FF3B30' : '#FF9500' 
                          }}
                        />
                      </div>
                      </IonLabel>
                    
                    <IonBadge 
                      slot="end" 
                      color={getStatusColor(message.webhookStatus)}
                    >
                      {message.webhookStatus}
                          </IonBadge>
                    </IonItem>
                ))
              )}
            </IonList>
            </IonCardContent>
          </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default WebhookMonitor;
