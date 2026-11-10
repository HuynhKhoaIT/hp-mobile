// Screen type: Form
// Tạo nhóm ghép (ride | sport) — một form cho cả hai, khác nhau ở config.ts + GROUP_ATTRIBUTE_FIELDS[kind].
// Cần đăng nhập + hồ sơ (điểm đi mặc định = cổng khu của profile.site). Kind sai → về trang chủ.
import { useMyProfile } from '@hp/core/react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getLocale } from '@/core/i18n';
import { GROUP_CONFIGS, isGroupKind } from '@/features/configs';
import { GroupForm } from '@/features/group/form/GroupForm';
import { GroupFormSkeleton } from '@/features/group/form/GroupFormSkeleton';
import { useDefaultOrigin } from '@/features/group/hooks';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { ErrorState, Header, Screen } from '@/ui';

export default function NewGroupScreen() {
  const { t } = useTranslation('group');
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const me = useMyProfile();
  const origin = useDefaultOrigin(me.data?.site);
  if (!isGroupKind(kind)) return <Redirect href="/" />;
  const config = GROUP_CONFIGS[kind];

  if (!me.data || !origin.ready) {
    return (
      <Screen>
        <Header title={t(config.form.titleKey)} back />
        {me.isLoading || (me.data && !origin.ready) ? (
          <GroupFormSkeleton />
        ) : me.isError ? (
          <ErrorState code={me.error.code} onRetry={() => void me.refetch()} />
        ) : (
          <SignInPrompt />
        )}
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <GroupForm key={kind} config={config} defaultOrigin={origin.text} lang={getLocale()} />
    </Screen>
  );
}
