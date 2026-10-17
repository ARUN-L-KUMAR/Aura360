import { usePathname, useRouter } from 'expo-router';
import { memo } from 'react';

import { PremiumHeader, type HeaderAction } from '@/components/ui/premium-header';
import { useModules } from '@/features/modules';
import { useUnreadCount } from '@/features/notifications/hooks';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';

/**
 * The persistent header above the 10 tabs (like the web dashboard's): breadcrumb of the current tab, search, theme,
 * notifications with an unread dot, and the account avatar (opens settings).
 */
export const TabsHeader = memo(function TabsHeader() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const pathname = usePathname();
  const modules = useModules();
  const { scheme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { data: unread = 0 } = useUnreadCount();

  const segment = pathname.split('/').filter(Boolean)[0];
  const here = segment && segment in modules ? modules[segment as keyof typeof modules].short : t('tabs.home');

  const actions: HeaderAction[] = [
    { icon: 'search-outline', label: t('header.search'), outlined: true, onPress: () => router.push('/search' as never) },
    { icon: scheme === 'dark' ? 'sunny-outline' : 'moon-outline', label: scheme === 'dark' ? t('header.switchToLight') : t('header.switchToDark'), onPress: toggleTheme },
    {
      icon: 'notifications-outline',
      label: unread > 0 ? t('header.notificationsUnread') : t('header.notifications'),
      badge: unread > 0,
      onPress: () => router.push('/notifications' as never),
    },
  ];

  return (
    <PremiumHeader
      trail={[t('header.brand'), here]}
      actions={actions}
      avatar={{ name: user?.name || user?.email || t('header.brand'), uri: user?.image, label: t('header.account'), onPress: () => router.push('/settings' as never) }}
    />
  );
});
