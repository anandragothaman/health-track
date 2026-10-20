import { useState } from 'react';
import { applyTextSize, applyTheme, getTextSize, getThemePref, type TextSize, type ThemePref } from '../../lib/theme';
import { Segmented } from '../ui';

export function AppearanceCard() {
  const [theme, setTheme] = useState<ThemePref>(getThemePref);
  const [size, setSize] = useState<TextSize>(getTextSize);
  return (
    <section className="card space-y-4" aria-labelledby="appearance-title">
      <h2 id="appearance-title" className="text-lg font-bold">
        Display (this device)
      </h2>
      <div>
        <p className="label">Theme</p>
        <Segmented<ThemePref>
          label="Theme"
          value={theme}
          onChange={(t) => {
            setTheme(t);
            applyTheme(t);
          }}
          options={[
            { value: 'system', label: 'Automatic' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </div>
      <div>
        <p className="label">Text size</p>
        <Segmented<TextSize>
          label="Text size"
          value={size}
          onChange={(s) => {
            setSize(s);
            applyTextSize(s);
          }}
          options={[
            { value: 'normal', label: 'Standard' },
            { value: 'large', label: 'Large' },
          ]}
        />
      </div>
    </section>
  );
}
