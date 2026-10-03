import { getCalendarRange, moveCalendarAnchor } from '../calendar';
import { formatDate, parseDate } from '../../utils/date';

describe('calendar helpers', () => {
  it('月视图从周一开始并补齐六周', () => {
    const range = getCalendarRange(parseDate('2026-10-03'), 'month');
    expect(formatDate(range.start)).toBe('2026-09-28');
    expect(formatDate(range.end)).toBe('2026-11-08');
  });

  it('周、三天、单天范围符合视图定义', () => {
    const anchor = parseDate('2026-10-07');
    expect(formatDate(getCalendarRange(anchor, 'week').start)).toBe('2026-10-05');
    expect(formatDate(getCalendarRange(anchor, 'threeDays').end)).toBe('2026-10-09');
    expect(formatDate(getCalendarRange(anchor, 'day').end)).toBe('2026-10-07');
  });

  it('三天视图每次移动一天', () => {
    const anchor = parseDate('2026-10-07');
    expect(formatDate(moveCalendarAnchor(anchor, 'threeDays', 1))).toBe('2026-10-08');
  });
});
