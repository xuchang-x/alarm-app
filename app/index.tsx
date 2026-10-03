import { Redirect } from 'expo-router';

/**
 * 根路径重定向：应用启动默认进入「今日」Tab。
 */
export default function Index() {
  return <Redirect href="/today" />;
}
