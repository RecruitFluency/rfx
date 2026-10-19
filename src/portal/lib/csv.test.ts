import { describe, expect, it } from 'vitest';
import { guessMapping, mapRows, normalizeEmail, normalizePhone } from './csv';

describe('normalizePhone (mirrors portal_normalize_phone)', () => {
  it('normalizes US numbers to E.164', () => {
    expect(normalizePhone('(201) 555-0101')).toBe('+12015550101');
    expect(normalizePhone('1-201-555-0101')).toBe('+12015550101');
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });
  it('rejects numbers it cannot be sure about', () => {
    expect(normalizePhone('555-0101')).toBeNull();
    expect(normalizePhone('+0123')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});

describe('normalizeEmail', () => {
  it('lower-cases and validates', () => {
    expect(normalizeEmail('  Ava@Example.COM ')).toBe('ava@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
  });
});

describe('guessMapping', () => {
  it('recognizes common recruiting-board headers', () => {
    expect(guessMapping(['First Name', 'Last Name', 'Cell', 'E-mail', 'Class of', 'Pos', 'Parent Phone', 'Club Director', 'Club Director Phone', 'Random']))
      .toEqual(['first_name', 'last_name', 'mobile', 'email', 'grad_year', 'positions', 'guardian_mobile', 'club_contact_name', 'club_contact_mobile', null]);
  });
  it('uses each field once', () => {
    expect(guessMapping(['Phone', 'Phone'])).toEqual(['mobile', null]);
  });
});

describe('mapRows', () => {
  const sheet = {
    headers: ['Name', 'Phone', 'Email', 'Grad Year', 'Position', 'Parent Phone'],
    rows: [
      ['Ava Smith', '201-555-0101', 'ava@example.com', '2027', 'Setter; Libero', '201-555-0199'],
      ['Bo', '12', '', '20X7', '', ''],
      ['Cy Young', '', 'cy@example.com', '2010', '', ''],
    ],
  };
  const rows = mapRows(sheet, guessMapping(sheet.headers));

  it('splits names, normalizes contacts and lists', () => {
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].values).toMatchObject({
      first_name: 'Ava', last_name: 'Smith', mobile: '+12015550101', grad_year: 2027,
      positions: ['Setter', 'Libero'], guardian_mobile: '+12015550199',
    });
  });

  it('flags bad rows with plain-English reasons', () => {
    expect(rows[1].errors).toEqual(expect.arrayContaining([
      'Missing first or last name', expect.stringContaining("isn't a valid phone number"), expect.stringContaining("isn't a year"),
    ]));
  });

  it('warns when a likely minor has no guardian contact', () => {
    const minor = mapRows({ headers: ['First', 'Last', 'Email', 'Class'], rows: [['A', 'B', 'a@b.co', String(new Date().getFullYear() + 1)]] },
      ['first_name', 'last_name', 'email', 'grad_year']);
    expect(minor[0].warnings.join(' ')).toMatch(/minor/);
    expect(rows[2].warnings).toEqual([]); // graduated in 2010
  });
});
