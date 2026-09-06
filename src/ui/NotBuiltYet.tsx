import { View } from 'react-native';
import { Card } from './Card';
import { Screen } from './Screen';
import { Heading, Muted, Text } from './Text';

/**
 * A section that exists in the navigation but hasn't been ported from the web
 * portal yet.
 *
 * Deliberately honest rather than a fake empty state: a seller who taps
 * Inventory and lands on "No items" would conclude their stock is gone. This
 * says the screen isn't built and points at the website, which can do it today.
 */
export function NotBuiltYet({ title, webPath }: { title: string; webPath: string }) {
  return (
    <Screen>
      <View className="gap-4 p-4">
        <Card className="gap-2">
          <Heading className="text-base">{title} isn&apos;t in the app yet</Heading>
          <Muted>
            This section is still being brought over from the seller website. Everything here works
            today at:
          </Muted>
          <Text className="text-[14px] font-medium text-brand-700">
            seller.buynextdoor.ph{webPath}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
