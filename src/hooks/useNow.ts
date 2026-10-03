import { useEffect, useState } from 'react';

/** 默认刷新间隔：30 秒 */
const DEFAULT_INTERVAL_MS = 30_000;

/**
 * 返回持续更新的当前时间（用于倒计时/时间轴高亮）。
 *
 * @param intervalMs 刷新间隔毫秒数，默认 30 秒；传 0 或负数时禁用轮询
 */
export function useNow(intervalMs: number = DEFAULT_INTERVAL_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (intervalMs <= 0) return;
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
