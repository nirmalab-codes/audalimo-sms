package com.audalimo.sms;

import android.content.Intent;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeSMS")
public class NativeSMSPlugin extends Plugin {
    private static final String TAG = "NativeSMSPlugin";

    @PluginMethod
    public void startSMSMonitoring(PluginCall call) {
        try {
            String webhookUrl = call.getString("webhookUrl", "");
            String webhookSecret = call.getString("webhookSecret", "");
            
            Log.d(TAG, "🚀 Starting native SMS monitoring with webhook: " + webhookUrl);
            
            Intent serviceIntent = new Intent(getContext(), SMSForegroundService.class);
            serviceIntent.setAction("START_MONITORING");
            serviceIntent.putExtra("webhook_url", webhookUrl);
            serviceIntent.putExtra("webhook_secret", webhookSecret);
            
            getContext().startForegroundService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Native SMS monitoring started");
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error starting SMS monitoring: " + e.getMessage(), e);
            call.reject("Failed to start SMS monitoring: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopSMSMonitoring(PluginCall call) {
        try {
            Log.d(TAG, "🛑 Stopping native SMS monitoring");
            
            Intent serviceIntent = new Intent(getContext(), SMSForegroundService.class);
            serviceIntent.setAction("STOP_MONITORING");
            
            getContext().startService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Native SMS monitoring stopped");
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error stopping SMS monitoring: " + e.getMessage(), e);
            call.reject("Failed to stop SMS monitoring: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getSMSServiceStatus(PluginCall call) {
        try {
            boolean isActive = SMSForegroundService.isActive();
            
            JSObject result = new JSObject();
            result.put("isActive", isActive);
            result.put("success", true);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error getting service status: " + e.getMessage(), e);
            call.reject("Failed to get service status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateWebhookConfig(PluginCall call) {
        try {
            String webhookUrl = call.getString("webhookUrl", "");
            String webhookSecret = call.getString("webhookSecret", "");
            
            Log.d(TAG, "🔧 Updating webhook config: " + webhookUrl);
            
            SMSForegroundService.setWebhookConfig(webhookUrl, webhookSecret);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Webhook configuration updated");
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error updating webhook config: " + e.getMessage(), e);
            call.reject("Failed to update webhook config: " + e.getMessage());
        }
    }
} 