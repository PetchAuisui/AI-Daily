export type User = {
  id: number;
  username: string;
  display_name: string;
};

export type Tracker = {
  id: number;
  name: string;
  weekly_limit: number;
  unit: string;
  reset_dow: number; // 0 = อาทิตย์
  reset_hour: number;
  active_days: string; // 7 ตัว '0'/'1' ตาม index ของ getDay()
  reserve_pct: number;
};

export type TrackerInput = Omit<Tracker, 'id'>;

export type UsageEntry = {
  id: number;
  tracker_id: number;
  ts: number; // epoch ms
  amount: number;
  note: string;
};
