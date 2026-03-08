package com.vigilinksos.app;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String ASSISTANT_PACKAGE = "com.google.android.googlequicksearchbox";
    private static final String ASSISTANT_PACKAGE_ALT = "com.google.android.apps.googleassistant";
    private PowerManager.WakeLock wakeLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        enableLockScreenDisplay();
        wakeUpScreen();
        super.onCreate(savedInstanceState);
        handleAssistantLaunch(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleAssistantLaunch(intent);
    }

    private void enableLockScreenDisplay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            setInheritShowWhenLocked(true);
        }

        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        );

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguardManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            keyguardManager.requestDismissKeyguard(this, null);
        }
    }

    private void wakeUpScreen() {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "vigilinksos:sos_wakelock"
            );
            wakeLock.acquire(30 * 1000L);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    private void handleAssistantLaunch(Intent intent) {
        if (intent == null) return;

        if (isFromAssistant(intent)) {
            String currentUrl = getBridge().getLocalUrl();
            if (currentUrl != null && !currentUrl.contains("action=sos")) {
                String separator = currentUrl.contains("?") ? "&" : "?";
                getBridge().getWebView().loadUrl(currentUrl + separator + "action=sos");
            }
        }
    }

    private boolean isFromAssistant(Intent intent) {
        Uri referrer = getReferrer();
        if (referrer != null) {
            String referrerHost = referrer.toString();
            if (referrerHost.contains(ASSISTANT_PACKAGE) || referrerHost.contains(ASSISTANT_PACKAGE_ALT)) {
                return true;
            }
        }

        String callingPackage = getCallingPackage();
        if (callingPackage != null) {
            if (callingPackage.equals(ASSISTANT_PACKAGE) || callingPackage.equals(ASSISTANT_PACKAGE_ALT)) {
                return true;
            }
        }

        Bundle extras = intent.getExtras();
        if (extras != null) {
            for (String key : extras.keySet()) {
                if (key.toLowerCase().contains("assistant") || key.toLowerCase().contains("voice")) {
                    return true;
                }
            }
        }

        String action = intent.getAction();
        if (action != null && action.contains("ASSIST")) {
            return true;
        }

        return false;
    }
}
