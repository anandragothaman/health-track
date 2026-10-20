import type { DateRange, RangePreset } from '../utils/range';
import { RANGE_LABEL } from '../utils/range';
import { Segmented } from './ui';
import { toDateInput } from '../utils/date';

const PRESETS: RangePreset[] = ['today', '7d', '30d', '90d', 'custom'];

export function RangePicker({ value, onChange }: { value: DateRange; onChange(r: DateRange): void }) {
  const today = toDateInput(new Date());
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Segmented
        label="Date range"
        value={value.preset}
        options={PRESETS.map((p) => ({ value: p, label: RANGE_LABEL[p] }))}
        onChange={(preset) => onChange({ ...value, preset })}
      />
      {value.preset === 'custom' && (
        <div className="flex flex-wrap gap-2">
          <label className="text-sm">
            <span className="mb-1 block font-semibold">From</span>
            <input
              type="date"
              className="input min-h-[40px] py-1"
              value={value.customFrom}
              max={today}
              onChange={(e) => onChange({ ...value, customFrom: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">To</span>
            <input
              type="date"
              className="input min-h-[40px] py-1"
              value={value.customTo}
              max={today}
              onChange={(e) => onChange({ ...value, customTo: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
