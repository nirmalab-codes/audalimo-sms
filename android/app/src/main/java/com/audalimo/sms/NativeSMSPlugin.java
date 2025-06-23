package com.audalimo.sms;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeSMS")
public class NativeSMSPlugin extends Plugin {
    private static final String TAG = "NativeSMSPlugin";
    private static final String SMS_RECEIVED_ACTION = "android.provider.Telephony.SMS_RECEIVED";
    private static final int SMS_PERMISSION_REQUEST_CODE = 1001;
    
    private SMSBroadcastReceiver smsReceiver;
    private boolean isListening = false;

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "NativeSMS Plugin loaded");
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        Log.d(TAG, "Requesting SMS permissions");
        
        String[] permissions = {
            Manifest.permission.READ_SMS,
            Manifest.permission.RECEIVE_SMS
        };
        
        boolean allGranted = true;
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(getContext(), permission) != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                break;
            }
        }
        
        if (allGranted) {
            Log.d(TAG, "All SMS permissions already granted");
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        
        // Request permissions using Capacitor's permission system
        requestPermissionForAlias("sms", call, "smsPermissionCallback");
    }

    private void smsPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState("sms").equals("granted"));
        call.resolve(result);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        Log.d(TAG, "Starting SMS listening");
        
        if (isListening) {
            Log.d(TAG, "SMS listening already active");
            call.resolve();
            return;
        }
        
        // Check permissions first
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "SMS permissions not granted");
            call.reject("SMS permissions not granted");
            return;
        }
        
        try {
            // Create and register SMS receiver
            smsReceiver = new SMSBroadcastReceiver();
            IntentFilter filter = new IntentFilter(SMS_RECEIVED_ACTION);
            filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);
            
            // Android 14+ compatibility - use RECEIVER_NOT_EXPORTED for security
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getContext().registerReceiver(smsReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                getContext().registerReceiver(smsReceiver, filter);
            }
            
            isListening = true;
            
            Log.d(TAG, "SMS BroadcastReceiver registered successfully");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start SMS listening: " + e.getMessage(), e);
            call.reject("Failed to start SMS listening", e);
        }
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        Log.d(TAG, "Stopping SMS listening");
        
        if (smsReceiver != null && isListening) {
            try {
                getContext().unregisterReceiver(smsReceiver);
                smsReceiver = null;
                isListening = false;
                Log.d(TAG, "SMS BroadcastReceiver unregistered");
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering SMS receiver: " + e.getMessage(), e);
            }
        }
        
        call.resolve();
    }

    @PluginMethod
    public void isListening(PluginCall call) {
        JSObject result = new JSObject();
        result.put("listening", isListening);
        call.resolve(result);
    }

    // BroadcastReceiver for SMS - Inner class for better memory management
    private class SMSBroadcastReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            Log.d(TAG, "SMS BroadcastReceiver triggered with action: " + intent.getAction());
            
            if (SMS_RECEIVED_ACTION.equals(intent.getAction())) {
                Bundle bundle = intent.getExtras();
                if (bundle != null) {
                    try {
                        Object[] pdus = (Object[]) bundle.get("pdus");
                        String format = bundle.getString("format");
                        
                        if (pdus != null && pdus.length > 0) {
                            Log.d(TAG, "Processing " + pdus.length + " SMS PDUs");
                            
                            for (Object pdu : pdus) {
                                SmsMessage smsMessage = null;
                                
                                try {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                        smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                                    } else {
                                        smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                                    }
                                } catch (Exception e) {
                                    Log.e(TAG, "Error creating SMS message from PDU: " + e.getMessage(), e);
                                    continue;
                                }
                                
                                if (smsMessage != null) {
                                    String from = smsMessage.getOriginatingAddress();
                                    String body = smsMessage.getMessageBody();
                                    long timestamp = smsMessage.getTimestampMillis();
                                    
                                    Log.d(TAG, "SMS received - From: " + from + ", Body length: " + (body != null ? body.length() : 0));
                                    
                                    // Notify JavaScript immediately
                                    notifyJavaScript(from, body, timestamp);
                                } else {
                                    Log.w(TAG, "SMS message is null after parsing PDU");
                                }
                            }
                        } else {
                            Log.w(TAG, "No PDUs found in SMS intent");
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error processing SMS intent: " + e.getMessage(), e);
                    }
                } else {
                    Log.w(TAG, "SMS intent bundle is null");
                }
            } else {
                Log.w(TAG, "Received intent with unexpected action: " + intent.getAction());
            }
        }
    }
    
    private void notifyJavaScript(String from, String body, long timestamp) {
        try {
            JSObject data = new JSObject();
            data.put("from", from != null ? from : "unknown");
            data.put("body", body != null ? body : "");
            data.put("timestamp", timestamp);
            data.put("received_at", System.currentTimeMillis());
            
            Log.d(TAG, "Notifying JavaScript with SMS data: " + data.toString());
            
            // Use notifyListeners to send event to JavaScript
            notifyListeners("smsReceived", data);
            
        } catch (Exception e) {
            Log.e(TAG, "Error notifying JavaScript: " + e.getMessage(), e);
        }
    }
    
    @Override
    protected void handleOnDestroy() {
        Log.d(TAG, "Plugin being destroyed");
        if (smsReceiver != null && isListening) {
            try {
                getContext().unregisterReceiver(smsReceiver);
                Log.d(TAG, "SMS receiver unregistered on destroy");
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering receiver on destroy: " + e.getMessage(), e);
            }
        }
        super.handleOnDestroy();
    }
} 