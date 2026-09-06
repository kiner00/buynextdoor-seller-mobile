import { Alert, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useSession } from '../../../src/auth/session';
import { useSellerMe } from '../../../src/api/domains/seller';
import { MORE_SECTIONS, type SectionItem } from '../../../src/navigation/sections';
import { fullName } from '../../../src/api/types';
import { Button, Card, Heading, Muted, Screen, Text } from '../../../src/ui';
import { MIN_TOUCH_TARGET, colors } from '../../../src/theme/tokens';

/**
 * Everything the four tabs don't cover — the web sidebar, in the same groups
 * and the same order.
 */
export default function MoreScreen() {
  const { session, signOut, signOutEverywhere } = useSession();
  const me = useSellerMe();

  const seller = me.data?.hub_owner;
  const name = seller?.name ?? fullName(session?.user ?? null) ?? 'Seller';

  return (
    <Screen>
      <View className="gap-6 p-4">
        <Card className="gap-1">
          <Heading className="text-base">{name}</Heading>
          <Muted>{session?.user.email}</Muted>
          {seller?.code ? <Muted>{seller.code}</Muted> : null}
        </Card>

        {MORE_SECTIONS.map((group, index) => (
          <View key={group.label ?? `group-${index}`} className="gap-2">
            {group.label ? (
              <Text className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
                {group.label}
              </Text>
            ) : null}
            <View className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {group.items.map((item, itemIndex) => (
                <NavRow key={item.href} item={item} first={itemIndex === 0} />
              ))}
            </View>
          </View>
        ))}

        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
        <Button
          label="Sign out of all devices"
          variant="ghost"
          onPress={() =>
            Alert.alert(
              'Sign out everywhere?',
              'Every phone and browser signed in to this account will be signed out, and none will get push notifications until they sign in again. Use this if a phone was lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign out everywhere',
                  style: 'destructive',
                  onPress: () => void signOutEverywhere(),
                },
              ],
            )
          }
        />
      </View>
    </Screen>
  );
}

function NavRow({ item, first }: { item: SectionItem; first: boolean }) {
  const Icon = item.icon;

  const body = (
    <View
      className={`flex-row items-center gap-3 px-4 ${first ? '' : 'border-t border-neutral-200'}`}
      style={{ minHeight: MIN_TOUCH_TARGET + 8 }}
    >
      <Icon size={20} color={item.comingSoon ? colors.neutral[400] : colors.neutral[600]} />
      <Text className={item.comingSoon ? 'flex-1 text-neutral-400' : 'flex-1'}>{item.label}</Text>
      {item.comingSoon ? (
        <Muted className="text-[12px]">Soon</Muted>
      ) : (
        <ChevronRight size={18} color={colors.neutral[400]} />
      )}
    </View>
  );

  // A section with no route yet is shown dimmed rather than linking nowhere —
  // same treatment as the web sidebar's `comingSoon` flag.
  if (item.comingSoon) return body;

  return (
    <Link href={item.href as never} asChild>
      <Pressable accessibilityRole="link" className="active:bg-neutral-100">
        {body}
      </Pressable>
    </Link>
  );
}
