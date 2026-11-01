import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { X, Copy, Check, FileCode, Smartphone, Terminal, ExternalLink } from 'lucide-react';

export const ExpoSourceViewerModal: React.FC = () => {
  const { isExpoViewerOpen, closeExpoViewer } = useMarketplace();
  const [activeFile, setActiveFile] = useState<'app.json' | 'package.json' | 'HomeScreen.tsx' | 'PaymentScreen.tsx'>('app.json');
  const [copied, setCopied] = useState(false);

  if (!isExpoViewerOpen) return null;

  const fileContents = {
    'app.json': `{
  "expo": {
    "name": "Campus Bazaar",
    "slug": "campus-bazaar",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1e293b"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.campusbazaar.app"
    },
    "android": {
      "package": "com.campusbazaar.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1e293b"
      },
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": ["expo-router"],
    "scheme": "campusbazaar"
  }
}`,
    'package.json': `{
  "name": "campus-bazaar-mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "build:apk": "eas build -p android --profile preview"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "lucide-react-native": "^0.475.0",
    "expo-image-picker": "~16.0.0"
  }
}`,
    'HomeScreen.tsx': `import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, ShieldCheck, Heart } from 'lucide-react-native';

export default function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Campus Bazaar</Text>
        <Text style={styles.subtitle}>Verified College Marketplace</Text>
      </View>
      {/* Product List with Native Android Touch Gestures */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#1e293b' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 12, color: '#94a3b8' },
});`,
    'PaymentScreen.tsx': `import React from 'react';
import { View, Text, Linking, TouchableOpacity, StyleSheet } from 'react-native';

// Standard YouPI-PG NPCI Intent Trigger for Android Native Devices
export default function YouPiPaymentScreen({ order, youPiOrder }: any) {
  const triggerNativeUPI = async () => {
    // Opens installed Google Pay / PhonePe / Paytm / BHIM directly on Android
    const canOpen = await Linking.canOpenURL(youPiOrder.upiIntentUrl);
    if (canOpen) {
      await Linking.openURL(youPiOrder.upiIntentUrl);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>Pay ₹{order.totalAmount}</Text>
      <TouchableOpacity style={styles.payBtn} onPress={triggerNativeUPI}>
        <Text style={styles.payText}>Pay with Android UPI App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  amount: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  payBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 12 },
  payText: { color: '#ffffff', fontWeight: 'bold' },
});`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContents[activeFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Expo React Native Android Codebase
              </h3>
              <p className="text-[10px] text-slate-500">
                Ready for local compilation or EAS Build to generate Android APK
              </p>
            </div>
          </div>

          <button
            onClick={closeExpoViewer}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Local Run Guide Banner */}
        <div className="px-4 py-2 bg-slate-900 text-slate-300 text-[11px] font-mono flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>npx expo start --android</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* File Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 shrink-0 overflow-x-auto no-scrollbar">
          {(['app.json', 'package.json', 'HomeScreen.tsx', 'PaymentScreen.tsx'] as const).map(
            (fileName) => (
              <button
                key={fileName}
                onClick={() => setActiveFile(fileName)}
                className={`px-3 py-2 text-xs font-mono font-medium whitespace-nowrap border-b-2 transition ${
                  activeFile === fileName
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {fileName}
              </button>
            )
          )}
        </div>

        {/* Code Content */}
        <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed no-scrollbar select-text">
          <pre>{fileContents[activeFile]}</pre>
        </div>
      </div>
    </div>
  );
};
