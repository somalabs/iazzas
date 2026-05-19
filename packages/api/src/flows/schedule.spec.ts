import {
  nextRunAt,
  validateSchedule,
  isValidTimezone,
  getMinIntervalMinutes,
  ScheduleValidationError,
} from './schedule';

describe('flows/schedule', () => {
  const TZ = 'America/Sao_Paulo';

  afterEach(() => {
    delete process.env.AUTOMATION_MIN_INTERVAL_MIN;
  });

  describe('isValidTimezone', () => {
    it('accepts a valid IANA zone', () => {
      expect(isValidTimezone(TZ)).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
    });
    it('rejects an unknown zone', () => {
      expect(isValidTimezone('Mars/Olympus')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });

  describe('getMinIntervalMinutes', () => {
    it('defaults to 5', () => {
      expect(getMinIntervalMinutes()).toBe(5);
    });
    it('honors the env override', () => {
      process.env.AUTOMATION_MIN_INTERVAL_MIN = '15';
      expect(getMinIntervalMinutes()).toBe(15);
    });
  });

  describe('nextRunAt', () => {
    it('computes the next fire for a daily cron in the given timezone', () => {
      const from = new Date('2026-05-18T00:00:00.000Z'); // 21:00 (-03) on 2026-05-17
      const next = nextRunAt('0 9 * * *', TZ, from);
      // 09:00 America/Sao_Paulo on 2026-05-18 == 12:00Z (UTC-3)
      expect(next.toISOString()).toBe('2026-05-18T12:00:00.000Z');
    });

    it('handles weekday cron', () => {
      const from = new Date('2026-05-18T13:00:00.000Z'); // Monday
      const next = nextRunAt('30 18 * * 1-5', TZ, from);
      expect(next.getTime()).toBeGreaterThan(from.getTime());
    });

    it('throws cronInvalid for a malformed expression', () => {
      try {
        nextRunAt('not a cron', TZ);
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ScheduleValidationError);
        expect((e as ScheduleValidationError).code).toBe('cronInvalid');
      }
    });

    it('throws cronInvalid for a 6-field expression (contract: 5 fields only)', () => {
      try {
        nextRunAt('0 0 9 * * *', TZ);
        throw new Error('should have thrown');
      } catch (e) {
        expect((e as ScheduleValidationError).code).toBe('cronInvalid');
      }
    });

    it('throws timezoneInvalid for an unknown timezone', () => {
      try {
        nextRunAt('0 9 * * *', 'Nowhere/Land');
        throw new Error('should have thrown');
      } catch (e) {
        expect((e as ScheduleValidationError).code).toBe('timezoneInvalid');
      }
    });
  });

  describe('validateSchedule', () => {
    it('accepts an interval at the minimum bound', () => {
      const first = validateSchedule('*/5 * * * *', TZ, new Date('2026-05-18T00:00:00.000Z'));
      expect(first).toBeInstanceOf(Date);
    });

    it('rejects an interval below the minimum', () => {
      try {
        validateSchedule('*/1 * * * *', TZ);
        throw new Error('should have thrown');
      } catch (e) {
        expect((e as ScheduleValidationError).code).toBe('cronIntervalTooShort');
      }
    });

    it('honors a larger configured minimum interval', () => {
      process.env.AUTOMATION_MIN_INTERVAL_MIN = '30';
      try {
        validateSchedule('*/10 * * * *', TZ);
        throw new Error('should have thrown');
      } catch (e) {
        expect((e as ScheduleValidationError).code).toBe('cronIntervalTooShort');
      }
    });

    it('returns the first fire time for a valid schedule', () => {
      const first = validateSchedule('0 9 * * 1', TZ, new Date('2026-05-18T00:00:00.000Z'));
      expect(first.getTime()).toBeGreaterThan(new Date('2026-05-18T00:00:00.000Z').getTime());
    });
  });
});
