package com.audalimo.sms;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register our native SMS plugin
        registerPlugin(NativeSMSPlugin.class);
    }
}
