/**
 * Presenze dei PNG (richiesta 2 del 9 novembre): chi è in scena e chi è altrove, per ogni PNG della
 * campagna, anche quelli che i PG non hanno ancora incontrato (il master li vede tutti). Ogni PNG ha
 * due pulsanti («In scena» / «Altrove»); «Auto» toglie la decisione a mano e torna a quanto dice la
 * scena. Vale finché non cambia scena: il server lo ricorda nello stato.
 */
import clsx from 'clsx';
import type { PresenzaMaster, StatoMaster } from '@cantastorie/shared';
import { Riquadro } from './Riquadro';
import { Chip } from './Chip';
import { classePulsante } from './stili';
import { inviaComando } from './sessione';

export function SezionePresenze({ stato }: { stato: StatoMaster }) {
  const presenze = stato.presenze ?? [];
  if (presenze.length === 0) return null;
  const inScena = presenze.filter((p) => p.presente).length;
  return (
    <Riquadro titolo="Personaggi" conteggio={`${inScena} in scena`} zona="scena" data-testid="master-presenze">
      <ul className="flex flex-col gap-1.5">
        {presenze.map((p) => (
          <li key={p.id}>
            <RigaPresenza presenza={p} />
          </li>
        ))}
      </ul>
    </Riquadro>
  );
}

function RigaPresenza({ presenza }: { presenza: PresenzaMaster }) {
  const { id, nome, presente, manuale, incontrato, nascosto, rivelato } = presenza;
  const decidi = (valore: boolean | null) => void inviaComando({ tipo: 'presenza', id_png: id, presente: valore }, `${nome}: ${valore === null ? 'automatica' : valore ? 'in scena' : 'altrove'}`);
  // Un PNG nascosto non si mostra al tavolo finché non parla: il master può rivelarlo a mano.
  const daRivelare = nascosto && !rivelato && !incontrato;
  return (
    <div data-testid={`master-presenza-${id}`} data-presente={String(presente)} data-manuale={String(manuale)} data-nascosto={String(daRivelare)} className="flex items-center gap-2 rounded-lg border border-bordo bg-notte-3 p-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{nome}</span>
        <span className="block truncate text-xs text-cenere">{incontrato ? 'ha già parlato' : 'non ancora incontrato'}</span>
      </div>
      {manuale && <Chip tono="brace">a mano</Chip>}
      {daRivelare && <Chip tono="cenere">nascosto</Chip>}
      {daRivelare && (
        <button type="button" data-testid={`master-presenza-rivela-${id}`} onClick={() => void inviaComando({ tipo: 'rivela', id_png: id }, `${nome}: rivelato`)} className={classePulsante('normale', 'piccolo')}>
          Rivela
        </button>
      )}
      <Chip tono={presente ? 'muschio' : 'cenere'}>{presente ? 'in scena' : 'altrove'}</Chip>
      <button type="button" data-testid={`master-presenza-in-${id}`} aria-pressed={presente} onClick={() => decidi(true)} className={classePulsante('normale', 'piccolo', clsx(presente && 'border-muschio'))}>
        In scena
      </button>
      <button type="button" data-testid={`master-presenza-altrove-${id}`} aria-pressed={!presente} onClick={() => decidi(false)} className={classePulsante('normale', 'piccolo')}>
        Altrove
      </button>
      {manuale && (
        <button type="button" data-testid={`master-presenza-auto-${id}`} onClick={() => decidi(null)} className={classePulsante('tenue', 'piccolo')} title="Torna a quanto dice la scena">
          Auto
        </button>
      )}
    </div>
  );
}
