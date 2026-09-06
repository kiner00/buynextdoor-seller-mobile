import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card, Field, Muted, Screen, Text } from '../../src/ui';

/**
 * Point the phone at an order slip or a product label instead of typing.
 *
 * Same routing rules as the web's `resolveCode`: an order reference looks like
 * `OR…` — letters then digits, no separators — and anything else is a SKU we
 * hand to the catalogue search. A URL is reduced to its last path segment
 * first, because QR codes in the wild carry URLs as often as bare codes.
 */
const ORDER_REFERENCE = /^OR[A-Z0-9]{4,}$/i;

function extractCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const last = new URL(trimmed).pathname.split('/').filter(Boolean).at(-1);
      return last ? decodeURIComponent(last) : null;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function go(raw: string): boolean {
  const code = extractCode(raw);
  if (!code) return false;
  if (ORDER_REFERENCE.test(code)) {
    router.push({ pathname: '/order/[reference]', params: { reference: code.toUpperCase() } });
  } else {
    router.push({ pathname: '/catalogue', params: { search: code } } as never);
  }
  return true;
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  const [locked, setLocked] = useState(false);

  // Ask when the screen opens, not on launch — the seller is holding the slip.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const onScanned = ({ data }: { data: string }) => {
    // The camera fires repeatedly on the same frame; one scan, one navigation.
    if (locked) return;
    setLocked(true);
    if (!go(data)) setLocked(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Scan QR' }} />
      <Screen>
        <View className="gap-4 p-4">
          {permission?.granted ? (
            <View className="overflow-hidden rounded-lg" style={{ height: 320 }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13', 'ean8'] }}
                onBarcodeScanned={locked ? undefined : onScanned}
              />
            </View>
          ) : (
            <Card className="gap-2">
              <Text className="font-semibold">Camera access needed</Text>
              <Muted>Allow the camera to scan order slips and product labels.</Muted>
              {permission?.canAskAgain ? (
                <Button label="Allow camera" onPress={() => void requestPermission()} />
              ) : (
                <Muted>Enable it in Settings, or type the code below.</Muted>
              )}
            </Card>
          )}
          {locked ? (
            <Button label="Scan another" variant="secondary" onPress={() => setLocked(false)} />
          ) : null}

          <Card className="gap-3">
            <Text className="font-semibold">Or type it</Text>
            <Field
              label=""
              value={typed}
              onChangeText={setTyped}
              placeholder="Order reference or SKU"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => go(typed)}
              className="gap-0"
            />
            <Button label="Open" onPress={() => go(typed)} disabled={typed.trim().length === 0} />
          </Card>
        </View>
      </Screen>
    </>
  );
}
