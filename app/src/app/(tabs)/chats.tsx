import { FlatList, Image, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { colors, radius, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { chatAvailable, useMyRooms, type Room } from '@/lib/chat';
import { timeAgo } from '@/lib/format';
import { T, N, Row, Card, Button } from '@/components/ui';
import { TabHeader } from '@/components/ProfileMenu';
import { SignInPrompt } from '@/components/SignInPrompt';

export default function Chats() {
  const t = useT();
  const auth = useAuth();
  const { rooms, error, uid } = useMyRooms();
  const available = chatAvailable();

  const Head = (
    <View style={{ gap: space(2), marginBottom: space(4) }}>
      <TabHeader
        title={t('ch_title')}
        trailing={
          available &&
          uid && (
          <Pressable
            onPress={() => router.push('/chat/new')}
            accessibilityRole="button"
            accessibilityLabel={t('ch_new')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 44 }}
          >
            <Feather name="plus" size={18} color="#fff" />
            <T w="bold" color="#fff">
              {t('ch_new')}
            </T>
          </Pressable>
          )
        }
      />
      <T color={colors.textDim} size={14}>
        {t('ch_sub')}
      </T>
    </View>
  );

  const Footer = (
    <T size={12} color={colors.textMute} style={{ marginTop: space(6) }}>
      {t('ch_rules')}
    </T>
  );

  let body: React.ReactNode = null;
  if (!available) {
    body = (
      <Card style={{ gap: 8, alignItems: 'center', paddingVertical: space(8) }}>
        <Feather name="message-circle" size={32} color={colors.textMute} />
        <T color={colors.textDim} style={{ textAlign: 'center' }}>
          {t('ch_unavailable')}
        </T>
      </Card>
    );
  } else if (!uid) {
    body = <SignInPrompt text={t('ch_need_google')} returnTo="/chats" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <FlatList
        data={body ? [] : rooms ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <RoomRow r={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <>
            {Head}
            {body}
            {error && (
              <T size={12} color={colors.warn}>
                {error}
              </T>
            )}
          </>
        }
        ListEmptyComponent={
          body || !rooms ? undefined : (
            <Card style={{ gap: 8, alignItems: 'center', paddingVertical: space(8) }}>
              <Feather name="message-square" size={30} color={colors.textMute} />
              <T color={colors.textDim} style={{ textAlign: 'center' }}>
                {t('ch_empty')}
              </T>
            </Card>
          )
        }
        ListFooterComponent={Footer}
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10), maxWidth: 760, width: '100%', alignSelf: 'center' }}
      />
    </SafeAreaView>
  );
}

function RoomRow({ r }: { r: Room }) {
  const t = useT();
  const faces = r.members.slice(0, 3).map((m) => r.memberInfo?.[m]);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: r.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${r.name}, ${t('ch_members', { n: r.members.length })}`}
      style={({ pressed }) => [
        { backgroundColor: pressed ? colors.cardHi : colors.card, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: colors.border, gap: 6 },
      ]}
    >
      <Row style={{ gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
          {r.ticker ? (
            <N w="black" size={12} color={colors.brand2}>
              {r.ticker}
            </N>
          ) : (
            <Feather name="hash" size={18} color={colors.brand2} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Row style={{ justifyContent: 'space-between', gap: 8 }}>
            <T w="bold" size={16} numberOfLines={1} style={{ flex: 1 }}>
              {r.name}
            </T>
            {r.lastAt && (
              <T size={11} color={colors.textMute}>
                {timeAgo(r.lastAt.toISOString(), t.lang)}
              </T>
            )}
          </Row>
          <T size={13} color={colors.textDim} numberOfLines={1}>
            {r.lastMessage ? `${r.lastMessage.name}: ${r.lastMessage.text}` : `${t(`topic_${r.topic}` as 'topic_general')} · ${t('ch_members', { n: r.members.length })}`}
          </T>
        </View>
        <Row style={{ direction: 'ltr' } as object}>
          {faces.map((f, i) =>
            f?.photo ? (
              <Image key={i} source={{ uri: f.photo }} style={{ width: 22, height: 22, borderRadius: 11, marginLeft: i ? -8 : 0, borderWidth: 1.5, borderColor: colors.card }} accessible={false} />
            ) : null,
          )}
        </Row>
      </Row>
    </Pressable>
  );
}
