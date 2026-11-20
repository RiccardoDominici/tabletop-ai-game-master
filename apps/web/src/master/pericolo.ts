/**
 * The value of a hazard the Game Master types in the panel (docs/prove.md §10): for «danno» and «cura» a dice formula
 * («2d6», «1d8+2») or a whole number, for «caduta» a height in the unit of the rule set's falling table. Null when the
 * text is not valid, so «Applica» stays off and no command is sent.
 */

/** An accepted dice formula: optional count, standard faces, optional modifier (the server's leggiFormula). */
const FORMULA_DADI = /^\d*d(2|3|4|6|8|10|12|20|100)([+-]\d+)?$/i;

/**
 * Parse the hazard value typed by the Game Master.
 * Empty or whitespace-only input is rejected. For 'caduta' the height is a decimal number from 0 to 10000,
 * with a comma or a point as separator. For 'danno' and 'cura' the value is a dice formula (whitespace is ignored,
 * the result is lowercase) or a whole number from 0 to 999.
 */
export function valorePericolo(cosa: 'danno' | 'cura' | 'caduta', testo: string): string | number | null {
  const pulito = testo.trim();
  if (pulito === '') return null;

  if (cosa === 'caduta') {
    if (!/^\d+([.,]\d+)?$/.test(pulito)) return null;
    const metri = Number(pulito.replace(',', '.'));
    return Number.isFinite(metri) && metri >= 0 && metri <= 10000 ? metri : null;
  }

  const senzaSpazi = pulito.replace(/\s+/g, '').toLowerCase();
  if (FORMULA_DADI.test(senzaSpazi)) return senzaSpazi;
  if (/^\d+$/.test(senzaSpazi)) {
    const intero = Number(senzaSpazi);
    return intero <= 999 ? intero : null;
  }
  return null;
}
