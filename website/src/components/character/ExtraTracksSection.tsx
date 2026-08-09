// Треки боїв і подорожей. На паперовому аркуші їх немає — там лише чотири
// присяги, — але без них не зіграти ні бою, ні подорожі (рішення №15).

import type { Character, ExtraTrack, Rank, TrackKind } from '../../utils/character/types';
import { markProgress, toggleBoxTick } from '../../utils/character/rules';
import { TRACK_KIND_LABELS, UI } from '../../utils/character/labels';
import ProgressTrackRow from './ProgressTrackRow';

const ExtraTracksSection = ({
  character,
  onAdd,
  onUpdate,
  onRemove,
  onRoll,
}: {
  character: Character;
  onAdd: (kind: TrackKind) => void;
  onUpdate: (id: string, updater: (track: ExtraTrack) => ExtraTrack) => void;
  onRemove: (id: string) => void;
  onRoll: (label: string, ticks: number) => void;
}) => (
  <div className="extra-tracks">
    <div className="extra-tracks__add">
      <button type="button" className="track-button" onClick={() => onAdd('combat')}>
        {UI.addCombatTrack}
      </button>
      <button type="button" className="track-button" onClick={() => onAdd('journey')}>
        {UI.addJourneyTrack}
      </button>
      <button type="button" className="track-button" onClick={() => onAdd('other')}>
        {UI.addOtherTrack}
      </button>
    </div>

    {character.extraTracks.length === 0 ? (
      <p className="extra-tracks__empty">{UI.noTracks}</p>
    ) : (
      character.extraTracks.map(track => (
        <div key={track.id} className="extra-track">
          <div className="extra-track__head">
            <span className={`track-kind track-kind--${track.kind}`}>
              {TRACK_KIND_LABELS[track.kind]}
            </span>
            <button
              type="button"
              className="extra-track__remove"
              onClick={() => onRemove(track.id)}
              aria-label={`${UI.remove}: ${track.name || TRACK_KIND_LABELS[track.kind]}`}
            >
              ×
            </button>
          </div>
          <ProgressTrackRow
            name={track.name}
            rank={track.rank}
            ticks={track.ticks}
            namePlaceholder={UI.trackNamePlaceholder}
            onName={name => onUpdate(track.id, current => ({ ...current, name }))}
            onRank={(rank: Rank) => onUpdate(track.id, current => ({ ...current, rank }))}
            onMark={() =>
              onUpdate(track.id, current => ({
                ...current,
                ticks: markProgress(current.ticks, current.rank),
              }))
            }
            onToggleBox={box =>
              onUpdate(track.id, current => ({
                ...current,
                ticks: toggleBoxTick(current.ticks, box),
              }))
            }
            onRoll={() =>
              onRoll(track.name.trim() || TRACK_KIND_LABELS[track.kind], track.ticks)
            }
          />
        </div>
      ))
    )}
  </div>
);

export default ExtraTracksSection;
