import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { contrastRatio, NAV_TONE, SKILL_TONE, STATUS_TONE, TAB_TONE, TONE_HOVER, TONE_RGB, TONES, toneClasses, type Tone } from '../palette';

const AA = 4.5;

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5);
    // #767676 on white is the classic 4.54:1 AA threshold grey.
    expect(contrastRatio([118, 118, 118], [255, 255, 255])).toBeCloseTo(4.54, 2);
  });

  it('is symmetric', () => {
    expect(contrastRatio([7, 89, 133], [240, 249, 255])).toBe(contrastRatio([240, 249, 255], [7, 89, 133]));
  });
});

describe('tone palette', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const tone of TONES) {
      it(`${mode} ${tone}: fg reaches AA on bg, soft and border`, () => {
        const { fg, bg, soft, border } = TONE_RGB[mode][tone];
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA);
        expect(contrastRatio(fg, soft)).toBeGreaterThanOrEqual(AA);
        // Tone buttons fill with the border colour on hover.
        expect(contrastRatio(fg, border)).toBeGreaterThanOrEqual(AA);
      });
    }
  }

  it('index.html mirrors TONE_RGB exactly', () => {
    const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
    const rootBlock = html.match(/:root\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    const darkBlock = html.match(/\n\s*\.dark\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    for (const [mode, block] of [
      ['light', rootBlock],
      ['dark', darkBlock],
    ] as const) {
      for (const tone of TONES) {
        for (const slot of ['bg', 'soft', 'fg', 'border', 'accent'] as const) {
          const m = block.match(new RegExp(`--tone-${tone}-${slot}:\\s*(\\d+) (\\d+) (\\d+);`));
          expect(m, `${mode} --tone-${tone}-${slot}`).not.toBeNull();
          expect(m!.slice(1).map(Number), `${mode} --tone-${tone}-${slot}`).toEqual([...TONE_RGB[mode][tone][slot]]);
        }
      }
    }
  });

  it('maps skills, nav areas and answer states to known tones', () => {
    expect(SKILL_TONE).toEqual({ listening: 'sky', reading: 'mint', writing: 'lavender', speaking: 'peach' });
    expect(STATUS_TONE).toEqual({ correct: 'mint', wrong: 'blush', nearMiss: 'butter', blank: 'sky' });
    for (const tone of Object.values(NAV_TONE)) expect(TONES).toContain(tone);
  });

  it('gives each main tab and the history button its own tone', () => {
    const tabs = [TAB_TONE.learn, TAB_TONE.review, TAB_TONE.vocab, TAB_TONE.stats, TAB_TONE.ielts, TAB_TONE.history];
    expect(new Set(tabs).size).toBe(tabs.length);
    for (const tone of Object.values(TAB_TONE)) expect(TONES).toContain(tone);
    for (const tone of TONES) expect(TONE_HOVER[tone]).toBe(`hover:bg-tone-${tone}`);
  });

  it('gives every tone full, literal class names', () => {
    for (const tone of TONES) {
      const c = toneClasses(tone);
      expect(c.tile).toBe(`bg-tone-${tone}-soft text-tone-${tone}-fg`);
      expect(c.text).toBe(`text-tone-${tone}-fg`);
      expect(c.surface).toContain(`bg-tone-${tone} `);
    }
    expect(toneClasses('nope' as Tone)).toBe(toneClasses('periwinkle'));
  });
});
