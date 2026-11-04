/**
 * "Vườn ôn tập": every card under spaced review is a plant. It grows with each
 * review done on time (seed → sprout → plant → tree → flower) and wilts when
 * left overdue. One button per skill opens that skill's review.
 */
import React, { useMemo } from 'react';
import { Bean, BookOpenText, Droplets, Flower2, Leaf, Mic, PenTool, Sprout, TreeDeciduous, type LucideIcon } from 'lucide-react';
import { gardenBeds, gardenLine, gardenSummary, type GardenSkill, type Plant } from '../../../services/reviewGameLogic';
import { loadGarden, useGameProfile } from '../../../services/reviewGameService';
import { toneClasses, type Tone } from '../../ui/palette';
import { panel } from '../../ui/styles';
import { XpBar } from './GameHud';

const STAGE_ICONS: readonly LucideIcon[] = [Bean, Sprout, Leaf, TreeDeciduous];
const STAGE_NAMES = ['Hạt', 'Mầm', 'Cây non', 'Cây lớn'] as const;

const SKILLS: readonly { skill: GardenSkill; label: string; icon: LucideIcon; tone: Tone }[] = [
  { skill: 'reading', label: 'Reading', icon: BookOpenText, tone: 'mint' },
  { skill: 'writing', label: 'Writing', icon: PenTool, tone: 'peach' },
  { skill: 'speaking', label: 'Speaking', icon: Mic, tone: 'lavender' },
];

const STATE_LABEL: Record<Plant['state'], string> = { growing: 'đang lớn', thirsty: 'cần ôn', wilted: 'héo, quá hạn', bloom: 'đã thuộc' };

function PlantTile({ plant }: { plant: Plant }) {
  const tone = SKILLS.find((s) => s.skill === plant.skill)!.tone;
  const Icon = plant.state === 'bloom' ? Flower2 : STAGE_ICONS[plant.stage];
  const look =
    plant.state === 'wilted'
      ? 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 [&_svg]:rotate-[24deg]'
      : plant.state === 'bloom'
        ? `${toneClasses('blush').tile} border-transparent`
        : `${toneClasses(tone).tile} border-transparent`;
  return (
    <li
      className={`relative flex aspect-square items-center justify-center rounded-xl border ${look}`}
      title={`${SKILLS.find((s) => s.skill === plant.skill)!.label} · ${plant.state === 'bloom' ? 'Hoa' : STAGE_NAMES[plant.stage]} · ${STATE_LABEL[plant.state]}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {(plant.state === 'thirsty' || plant.state === 'wilted') && (
        <Droplets className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-tone-sky-fg shadow-sm dark:bg-slate-900" aria-hidden />
      )}
    </li>
  );
}

interface Props {
  userId: string;
  onOpen: (skill: GardenSkill) => void;
}

export default function ReviewGarden({ userId, onOpen }: Props) {
  const profile = useGameProfile(userId);
  // Re-read when XP changes: a review that awarded XP also moved a card.
  const plants = useMemo(() => loadGarden(userId), [userId, profile.totalXp]);
  const summary = gardenSummary(plants);
  const beds = gardenBeds(plants, 24);

  return (
    <section aria-labelledby="ielts-garden" className={`${panel} space-y-4 p-4 sm:p-5`}>
      <div>
        <h2 id="ielts-garden" className="flex items-center gap-2 text-title font-semibold text-slate-900 dark:text-white">
          <Sprout className="h-5 w-5 text-tone-mint-fg" aria-hidden /> Vườn ôn tập
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{gardenLine(summary)}</p>
      </div>

      <XpBar userId={userId} profile={profile} compact />

      {beds.length > 0 && (
        <>
          <ul className="grid grid-cols-8 gap-1.5 sm:grid-cols-12" aria-label={`${summary.total} cây: ${summary.thirsty + summary.wilted} cần ôn, ${summary.bloom} đã thuộc`}>
            {beds.map((p) => (
              <PlantTile key={p.id} plant={p} />
            ))}
          </ul>
          {plants.length > beds.length && <p className="text-caption text-slate-500">và {plants.length - beds.length} cây khác</p>}
        </>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {SKILLS.map(({ skill, label, icon: Icon, tone }) => {
          const s = summary.bySkill[skill];
          return (
            <button
              key={skill}
              type="button"
              onClick={() => onOpen(skill)}
              className={`lift press flex min-h-touch items-center gap-2 rounded-xl border p-3 text-left ${toneClasses(tone).surface}`}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${toneClasses(tone).text}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
                <span className="block text-caption text-slate-600 dark:text-slate-300">{s.due ? `${s.due} cây cần ôn` : s.total ? `${s.total} cây, đang lớn` : 'Chưa có cây'}</span>
              </span>
              {s.due > 0 && <Droplets className="h-4 w-4 text-tone-sky-fg" aria-hidden />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
