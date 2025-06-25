package com.audalimo.sms;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import org.json.JSONObject;

public class SMSForegroundService extends Service {
    private static final String TAG = "SMSForegroundService";
    private static final String CHANNEL_ID = "SMS_WEBHOOK_CHANNEL";
    private static final int NOTIFICATION_ID = 1001;
    
    private static String webhookUrl = "";
    private static String webhookSecret = "";
    private static boolean isServiceActive = false;
    private static int processedCount = 0;
    
    private ExecutorService executorService;
    private OkHttpClient httpClient;
    
    public static void setWebhookConfig(String url, String secret) {
        webhookUrl = url;
        webhookSecret = secret;
        Log.d(TAG, "🔧 Webhook config updated: " + url);
    }
    
    public static boolean isActive() {
        return isServiceActive;
    }
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "🚀 SMS Foreground Service created");
        
        executorService = Executors.newFixedThreadPool(3);
        httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
            .build();
        
        createNotificationChannel();
        isServiceActive = true;
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "📱 SMS Foreground Service started with intent: " + (intent != null ? intent.getAction() : "null"));
        
        if (intent != null && "SMS_RECEIVED".equals(intent.getAction())) {
            // Process SMS from BroadcastReceiver
            String sender = intent.getStringExtra("sender");
            String message = intent.getStringExtra("message");
            long timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis());
            
            Log.d(TAG, "📨 Processing SMS from: " + sender);
            
            // Forward to webhook asynchronously
            forwardSMSToWebhook(sender, message, timestamp);
            
        } else if (intent != null && "START_MONITORING".equals(intent.getAction())) {
            // Start monitoring mode
            String url = intent.getStringExtra("webhook_url");
            String secret = intent.getStringExtra("webhook_secret");
            
            if (url != null) {
                setWebhookConfig(url, secret);
                Log.d(TAG, "✅ SMS monitoring started with webhook: " + url);
            }
        } else if (intent != null && "STOP_MONITORING".equals(intent.getAction())) {
            // Stop monitoring
            Log.d(TAG, "🛑 Stopping SMS monitoring");
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        
        // Start foreground with notification
        startForeground(NOTIFICATION_ID, createNotification());
        
        // Return START_STICKY to restart if killed
        return START_STICKY;
    }
    
    private void forwardSMSToWebhook(String sender, String message, long timestamp) {
        if (webhookUrl == null || webhookUrl.isEmpty()) {
            Log.w(TAG, "⚠️ No webhook URL configured, skipping forward");
            return;
        }
        
        executorService.execute(() -> {
            try {
                Log.d(TAG, "🚀 Forwarding SMS to webhook: " + webhookUrl);
                
                // Create JSON payload
                JSONObject payload = new JSONObject();
                payload.put("message", message);
                payload.put("sender", sender);
                payload.put("timestamp", timestamp);
                
                // Generate signature (simple hash)
                String signature = generateSignature(message, sender, timestamp);
                payload.put("signature", signature);
                
                RequestBody requestBody = RequestBody.create(
                    payload.toString(),
                    MediaType.parse("application/json")
                );
                
                Request request = new Request.Builder()
                    .url(webhookUrl)
                    .post(requestBody)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("X-SMS-Signature", signature)
                    .addHeader("X-SMS-ID", String.valueOf(timestamp))
                    .addHeader("User-Agent", "SMS-Webhook-Android/1.0")
                    .build();
                
                httpClient.newCall(request).enqueue(new Callback() {
                    @Override
                    public void onResponse(Call call, Response response) throws IOException {
                        if (response.isSuccessful()) {
                            processedCount++;
                            Log.d(TAG, "✅ Webhook delivered successfully! Total: " + processedCount);
                            updateNotification("✅ " + processedCount + " SMS forwarded");
                        } else {
                            Log.e(TAG, "❌ Webhook delivery failed: " + response.code());
                        }
                        response.close();
                    }
                    
                    @Override
                    public void onFailure(Call call, IOException e) {
                        Log.e(TAG, "❌ Webhook delivery error: " + e.getMessage());
                    }
                });
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Error creating webhook request: " + e.getMessage(), e);
            }
        });
    }
    
    private String generateSignature(String message, String sender, long timestamp) {
        String data = message + sender + timestamp + webhookSecret;
        int hash = 0;
        for (int i = 0; i < data.length(); i++) {
            char c = data.charAt(i);
            hash = ((hash << 5) - hash) + c;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Integer.toHexString(Math.abs(hash));
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SMS Webhook Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background SMS monitoring and webhook forwarding");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SMS Webhook Active")
            .setContentText("Monitoring SMS • " + processedCount + " processed")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .build();
    }
    
    private void updateNotification(String status) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) {
            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("SMS Webhook Active")
                .setContentText(status + " • Tap to open")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setAutoCancel(false)
                .build();
            
            manager.notify(NOTIFICATION_ID, notification);
        }
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        isServiceActive = false;
        
        if (executorService != null) {
            executorService.shutdown();
        }
        
        if (httpClient != null) {
            httpClient.dispatcher().executorService().shutdown();
        }
        
        Log.d(TAG, "🛑 SMS Foreground Service destroyed");
    }
} 