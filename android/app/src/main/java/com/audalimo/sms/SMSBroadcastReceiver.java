package com.audalimo.sms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;
import android.widget.Toast;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

import java.util.ArrayList;

public class SMSBroadcastReceiver extends BroadcastReceiver {
    private static final String TAG = "SMSBroadcastReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "📨 SMS BroadcastReceiver triggered!");
        
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            
            if (bundle != null) {
                try {
                    Object[] pdus = (Object[]) bundle.get("pdus");
                    String format = bundle.getString("format");
                    
                    if (pdus != null) {
                        SmsMessage[] messages = new SmsMessage[pdus.length];
                        StringBuilder messageBody = new StringBuilder();
                        String sender = "";
                        
                        for (int i = 0; i < pdus.length; i++) {
                            if (format != null && format.equals("3gpp2")) {
                                messages[i] = SmsMessage.createFromPdu((byte[]) pdus[i], format);
                            } else {
                                messages[i] = SmsMessage.createFromPdu((byte[]) pdus[i]);
                            }
                            
                            if (messages[i] != null) {
                                messageBody.append(messages[i].getMessageBody());
                                if (i == 0) {
                                    sender = messages[i].getDisplayOriginatingAddress();
                                }
                            }
                        }
                        
                        String fullMessage = messageBody.toString();
                        long timestamp = System.currentTimeMillis();
                        
                        Log.d(TAG, "📨 SMS Received from: " + sender);
                        Log.d(TAG, "📨 SMS Content: " + fullMessage.substring(0, Math.min(50, fullMessage.length())) + "...");
                        
                        // Send to foreground service for webhook forwarding
                        Intent serviceIntent = new Intent(context, SMSForegroundService.class);
                        serviceIntent.setAction("SMS_RECEIVED");
                        serviceIntent.putExtra("sender", sender);
                        serviceIntent.putExtra("message", fullMessage);
                        serviceIntent.putExtra("timestamp", timestamp);
                        
                        try {
                            context.startForegroundService(serviceIntent);
                            Log.d(TAG, "✅ SMS data sent to foreground service");
                        } catch (Exception e) {
                            Log.e(TAG, "❌ Failed to start foreground service: " + e.getMessage());
                        }
                        
                        // Optional: Show toast for debugging
                        if (context != null) {
                            Toast.makeText(context, "SMS received: " + sender, Toast.LENGTH_SHORT).show();
                        }
                        
                    }
                } catch (Exception e) {
                    Log.e(TAG, "❌ Error processing SMS: " + e.getMessage(), e);
                }
            }
        }
    }
} 