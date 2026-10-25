/**
 * AI HEAVEN - Phase 5 Device Readiness & Android Integration Test Suite
 * Validates native Capacitor configuration, Android manifest permissions,
 * secure session persistence, production API URL resolution,
 * and automated GitHub Actions build definitions.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('AI HEAVEN - Phase 5 Android Device Readiness', () => {

  it('1. Capacitor Configuration: Validates appId, appName, and mobile plugins', async () => {
    const configPath = path.resolve(process.cwd(), 'capacitor.config.ts');
    assert.strictEqual(fs.existsSync(configPath), true, 'capacitor.config.ts must exist');

    const configContent = fs.readFileSync(configPath, 'utf-8');
    assert.match(configContent, /appId:\s*['"]com\.aiheaven\.app['"]/, 'appId must be com.aiheaven.app');
    assert.match(configContent, /appName:\s*['"]AI Heaven['"]/, 'appName must be AI Heaven');
    assert.match(configContent, /webDir:\s*['"]dist['"]/, 'webDir must be dist');
    assert.match(configContent, /KeyboardResize\.Body/, 'Keyboard resize mode must be Body');
    assert.match(configContent, /#080B10/, 'Status bar background must match #080B10 theme');
  });

  it('2. Android Manifest: Validates permissions, cleartext traffic, and soft input mode', () => {
    const manifestPath = path.resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
    assert.strictEqual(fs.existsSync(manifestPath), true, 'AndroidManifest.xml must exist');

    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    assert.match(manifest, /android:name="android\.permission\.INTERNET"/, 'INTERNET permission must be declared');
    assert.match(manifest, /android:name="android\.permission\.ACCESS_NETWORK_STATE"/, 'ACCESS_NETWORK_STATE permission must be declared');
    assert.match(manifest, /android:usesCleartextTraffic="true"/, 'usesCleartextTraffic must be true for dev connectivity');
    assert.match(manifest, /android:windowSoftInputMode="adjustResize"/, 'windowSoftInputMode must be adjustResize to prevent keyboard overlap');
  });

  it('3. Android Build Gradle: Validates namespace, applicationId, and dependencies', () => {
    const gradlePath = path.resolve(process.cwd(), 'android/app/build.gradle');
    assert.strictEqual(fs.existsSync(gradlePath), true, 'android/app/build.gradle must exist');

    const gradle = fs.readFileSync(gradlePath, 'utf-8');
    assert.match(gradle, /applicationId\s+['"]com\.aiheaven\.app['"]/, 'Gradle applicationId must be com.aiheaven.app');
    assert.match(gradle, /namespace\s*=\s*['"]com\.aiheaven\.app['"]/, 'Gradle namespace must be com.aiheaven.app');
    assert.match(gradle, /androidx\.core:core-splashscreen/, 'core-splashscreen dependency must be present for Android 12+ splash support');
  });

  it('4. Android Strings & Resources: Validates app name in strings.xml', () => {
    const stringsPath = path.resolve(process.cwd(), 'android/app/src/main/res/values/strings.xml');
    assert.strictEqual(fs.existsSync(stringsPath), true, 'strings.xml must exist');

    const strings = fs.readFileSync(stringsPath, 'utf-8');
    assert.match(strings, /<string name="app_name">AI Heaven<\/string>/, 'app_name must be AI Heaven');
    assert.match(strings, /<string name="package_name">com\.aiheaven\.app<\/string>/, 'package_name must be com.aiheaven.app');
  });

  it('5. Production Backend URL Resolution: Verifies native fallback to production Cloud Run', () => {
    const apiClientPath = path.resolve(process.cwd(), 'src/services/apiClient.ts');
    assert.strictEqual(fs.existsSync(apiClientPath), true, 'src/services/apiClient.ts must exist');

    const clientCode = fs.readFileSync(apiClientPath, 'utf-8');
    assert.match(clientCode, /DEPLOYED_PRODUCTION_API_URL\s*=/, 'DEPLOYED_PRODUCTION_API_URL must be defined');
    assert.match(clientCode, /https:\/\/ais-dev-3akprr5cwy775swhpvqbqo-355977231344\.asia-southeast1\.run\.app\/api/, 'Deployed production API URL must point to Cloud Run backend');
    assert.match(clientCode, /if\s*\(isNative\)\s*\{\s*return DEPLOYED_PRODUCTION_API_URL;/, 'Native platform must never use localhost');
  });

  it('6. Authentication & Session Security: Verifies token bearer headers and clean logout', () => {
    const apiClientPath = path.resolve(process.cwd(), 'src/services/apiClient.ts');
    const clientCode = fs.readFileSync(apiClientPath, 'utf-8');

    assert.match(clientCode, /localStorage\.setItem\('aiheaven_auth_token'/, 'Token must be stored in localStorage');
    assert.match(clientCode, /Authorization:\s*`Bearer \$\{token\}`/, 'Requests must use Bearer authentication token');
    assert.match(clientCode, /logoutAuth\(\)/, 'logoutAuth method must exist');
    assert.match(clientCode, /localStorage\.removeItem\('aiheaven_auth_token'\)/, 'Logout must purge stored authentication credentials');
  });

  it('7. Native Bridge Service: Verifies mobile back button, keyboard, status bar, and network listeners', () => {
    const bridgePath = path.resolve(process.cwd(), 'src/services/native/mobileNativeService.ts');
    assert.strictEqual(fs.existsSync(bridgePath), true, 'mobileNativeService.ts must exist');

    const bridgeCode = fs.readFileSync(bridgePath, 'utf-8');
    assert.match(bridgeCode, /StatusBar\.setStyle/, 'Status bar style must be configured');
    assert.match(bridgeCode, /StatusBar\.setBackgroundColor/, 'Status bar background color must be set');
    assert.match(bridgeCode, /Keyboard\.setScroll/, 'Keyboard scroll must be configured');
    assert.match(bridgeCode, /CapApp\.addListener\('backButton'/, 'Hardware back button listener must be registered');
    assert.match(bridgeCode, /Network\.addListener\('networkStatusChange'/, 'Network connectivity listener must be registered');
    assert.match(bridgeCode, /getPlatform\(\)/, 'getPlatform helper must be exposed');
    assert.match(bridgeCode, /getNetworkStatus\(\)/, 'getNetworkStatus helper must be exposed');
  });

  it('8. GitHub Actions Automated APK Workflow: Verifies reproducible build steps and artifact upload', () => {
    const workflowPath = path.resolve(process.cwd(), '.github/workflows/android-build.yml');
    assert.strictEqual(fs.existsSync(workflowPath), true, 'android-build.yml workflow must exist');

    const workflow = fs.readFileSync(workflowPath, 'utf-8');
    assert.match(workflow, /workflow_dispatch:/, 'Workflow must support manual trigger');
    assert.match(workflow, /actions\/setup-java@v4/, 'Workflow must use setup-java');
    assert.match(workflow, /distribution:\s*['"]temurin['"]/, 'Workflow must use Temurin JDK');
    assert.match(workflow, /java-version:\s*17/, 'Workflow must use Java 17');
    assert.match(workflow, /android-actions\/setup-android@v3/, 'Workflow must set up Android SDK');
    assert.match(workflow, /\.\/gradlew assembleDebug/, 'Workflow must compile assembleDebug');
    assert.match(workflow, /name:\s*ai-heaven-android-debug-apk/, 'Workflow must upload ai-heaven-android-debug-apk artifact');
    assert.match(workflow, /path:\s*android\/app\/build\/outputs\/apk\/debug\/app-debug\.apk/, 'Workflow must upload debug APK');
  });

  it('9. Dark Glass Theme & Safe Area CSS: Verifies #080B10 palette and safe-area classes', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    assert.match(css, /--bg-base:\s*#080B10/, 'Base background must be #080B10');
    assert.match(css, /--bg-sidebar:\s*#0D1118/, 'Sidebar background must be #0D1118');
    assert.match(css, /--surface-standard:\s*#121822/, 'Surface standard must be #121822');
    assert.match(css, /--surface-elevated:\s*#171F2B/, 'Surface elevated must be #171F2B');
    assert.match(css, /--border-color:\s*#283242/, 'Border color must be #283242');
    assert.match(css, /\.pt-safe/, 'pt-safe class must exist for Android notch');
    assert.match(css, /\.pb-safe/, 'pb-safe class must exist for Android gesture bar');
    assert.match(css, /\.touch-target-44/, 'touch-target-44 class must exist for Android touch accessibility');
  });

  it('10. Auth Gate Integration: Verifies login gate before protected workspace', () => {
    const appPath = path.resolve(process.cwd(), 'src/App.tsx');
    const appCode = fs.readFileSync(appPath, 'utf-8');

    assert.match(appCode, /if\s*\(!authCurrentUser\)\s*\{\s*return\s*\(\s*<AuthGateScreen/, 'AuthGateScreen must gate access when authCurrentUser is null');
    assert.match(appCode, /apiClient\.logoutAuth\(\)/, 'App logout must invoke apiClient.logoutAuth()');
  });
});
