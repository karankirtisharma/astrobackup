/** All experience copy in one typed module — the panels share one layout
 *  system fed by these objects; the language differs, the structure rhymes. */

import type { Side } from '../state/transitions';

export interface FieldRowData {
  label: string;
  value: string;
  accent?: boolean;
}

export interface DossierContent {
  title: string;
  subtitle: string;
  identity: FieldRowData[];
  attributesTitle: string;
  attributes: FieldRowData[];
  toolkitTitle: string | null;
  toolkit: string[];
  extra: FieldRowData[];
  thumbprint: {
    sideLabel: string;
    hash: string;
    match: number;
  };
  moduleTitle: string;
  moduleRows: FieldRowData[];
  moduleNote: string | null;
  visual: 'neural' | 'mission';
  missionStatement?: string;
}

export const DOSSIERS: Record<Side, DossierContent> = {
  cypherpunk: {
    title: 'CYPHERPUNK',
    subtitle: '// HACKER',
    identity: [
      { label: 'NAME', value: 'AARON MORRISON' },
      { label: 'HANDLE', value: 'NULLROOT' },
      { label: 'ROLE', value: 'PRIVACY ADVOCATE' },
      { label: 'CLEARANCE', value: '[ NQ3 ] — NEED TO KNOW' },
      { label: 'STATUS', value: 'OPERATIONAL', accent: true },
      { label: 'LOCATION', value: 'UNKNOWN · 23:17:08Z' },
      { label: 'ID HASH', value: '7F2A..9C4E' },
    ],
    attributesTitle: 'SYSTEM ATTRIBUTES',
    attributes: [
      { label: 'ENCRYPTION', value: 'AES-256' },
      { label: 'FIREWALL', value: 'ADAPTIVE' },
      { label: 'SURVEILLANCE', value: 'RESISTANT' },
      { label: 'TRACE INDEX', value: 'MINIMAL' },
      { label: 'PRIVACY LAYER', value: 'ACTIVE', accent: true },
    ],
    toolkitTitle: 'TOOLKIT',
    toolkit: ['SSH TUNNEL', 'GPG SUITE', 'ZERO-KNOWLEDGE', 'DISCREET COMMS', 'SIGNAL PROTOCOL'],
    extra: [
      { label: 'CODE NAME', value: 'CYPHER' },
      { label: 'AFFILIATION', value: 'NONE' },
      { label: 'BELIEFS', value: 'FREEDOM · PRIVACY · TRUTH' },
    ],
    thumbprint: {
      sideLabel: 'THUMB PRINT // LEFT',
      hash: '03:A2:91:7A:3B:CD:11:FF',
      match: 98.7,
    },
    moduleTitle: 'NEURAL MAP // MRI',
    moduleRows: [
      { label: 'SCAN ID', value: 'NM-77291' },
      { label: 'RES', value: '0.5mm / 0.6mm' },
      { label: 'DATE', value: '2024-05-13' },
    ],
    moduleNote: 'NO ANOMALIES DETECTED',
    visual: 'neural',
  },
  astronaut: {
    title: 'ASTRONAUT',
    subtitle: '// EXPLORER',
    identity: [
      { label: 'NAME', value: 'UNSPECIFIED' },
      { label: 'ROLE', value: 'EXPLORER' },
      { label: 'CLEARANCE', value: '[ 01 ] — EYES ONLY' },
      { label: 'STATUS', value: 'OPERATIONAL', accent: true },
      { label: 'LAST SEEN', value: '23:17:08Z' },
    ],
    attributesTitle: 'SUIT DIAGNOSTICS',
    attributes: [
      { label: 'OXYGEN', value: '98%' },
      { label: 'PRESSURE', value: '1.01 atm' },
      { label: 'TEMP', value: '21.3 °C' },
      { label: 'POWER', value: '87%' },
      { label: 'SYSTEMS', value: 'NOMINAL', accent: true },
      { label: 'RADIATION', value: 'LOW' },
    ],
    toolkitTitle: null,
    toolkit: [],
    extra: [],
    thumbprint: {
      sideLabel: 'THUMB PRINT // RIGHT',
      hash: 'a1:4f:2e:9e:7d:aa:33:bc',
      match: 96.1,
    },
    moduleTitle: 'MISSION LOG',
    moduleRows: [{ label: 'OBJECTIVE', value: 'FUTURE · DISCOVER · DOCUMENT · BUILD' }],
    moduleNote: null,
    visual: 'mission',
    missionStatement: 'BUILD INFRASTRUCTURE FOR THE NEXT DIGITAL CIVILIZATION.',
  },
};

/** ————— Cypherpunk bento dossier —————
 *  The cypherpunk panel uses a card-grid ("bento") layout instead of the
 *  two-column list. Astronaut still uses DossierContent above. */

export interface BentoContent {
  identity: FieldRowData[];
  bio: { label: string; value: string; unit?: string }[];
  scanQuality: number;
  skills: { label: string; value: number }[];
  footprint: string[];
  neuralRows: FieldRowData[];
  neuralNote: string;
  codename: {
    name: string;
    affiliation: string;
    beliefs: string[];
  };
}

export const CYPHERPUNK_BENTO: BentoContent = {
  identity: [
    { label: 'NAME', value: 'CYPHERPUNK' },
    { label: 'HANDLE', value: 'HACKER' },
    { label: 'ROLE', value: 'PRIVACY ADVOCATE' },
    { label: 'CLEARANCE', value: '(V83) - NEED TO KNOW' },
    { label: 'STATUS', value: 'OPERATIONAL', accent: true },
    { label: 'LAST SYNC', value: '23:17:08Z' },
    { label: 'ID HASH', value: '7A18...72d9' },
  ],
  bio: [
    { label: 'HRV', value: '62', unit: 'BPM' },
    { label: 'CORT', value: '14%' },
    { label: 'FOCUS', value: '94%' },
  ],
  scanQuality: 98.7,
  skills: [
    { label: 'CRYPTOGRAPHY', value: 95 },
    { label: 'SYSTEMS DESIGN', value: 92 },
    { label: 'NETWORK OPS', value: 88 },
    { label: 'SOCIAL ENGINEERING', value: 76 },
    { label: 'OPSEC', value: 93 },
  ],
  footprint: ['ZERO TRUST', 'NO CENTRAL ID', 'NO TRACE'],
  neuralRows: [
    { label: 'SCAN ID', value: 'MR-7729A' },
    { label: 'RES', value: '0.5mm / 1.0mm' },
    { label: 'DATE', value: '2024-05-13' },
    { label: 'NOTE', value: 'NO ANOMALIES DETECTED' },
  ],
  neuralNote: 'NO ANOMALIES DETECTED',
  codename: {
    name: 'CYPHER',
    affiliation: 'NONE',
    beliefs: ['FREEDOM', 'PRIVACY', 'TRUTH'],
  },
};

/** ————— Astronaut bento dossier ————— */

export interface AstroContent {
  identity: FieldRowData[];
  vitals: { label: string; value: string }[];
  scanQuality: number;
  environment: FieldRowData[];
  profileWords: string[];
  profileStatus: string;
  missionLog: { label: string; lines: string[]; bullets?: string[] }[];
  suitStats: FieldRowData[];
  suitMeta: FieldRowData[];
  xray: { label: string; lines: string[] }[];
}

export const ASTRONAUT_BENTO: AstroContent = {
  identity: [
    { label: 'NAME', value: 'ASTRONAUT' },
    { label: 'ROLE', value: 'EXPLORER' },
    { label: 'CLEARANCE', value: '[01] - EYES ONLY' },
    { label: 'STATUS', value: 'OPERATIONAL', accent: true },
    { label: 'LOCATION', value: 'UNKNOWN' },
    { label: 'LAST PING', value: '23:17:602' },
    { label: 'ID HASH', value: '7A18...7269' },
  ],
  vitals: [
    { label: 'O2', value: '98%' },
    { label: 'CO2', value: '32mmHg' },
    { label: 'HR', value: '72bpm' },
  ],
  scanQuality: 99.1,
  environment: [
    { label: 'PRESSURE', value: '101 kPa' },
    { label: 'TEMP', value: '-56 °C' },
    { label: 'RADIATION', value: '0.19 mSv' },
    { label: 'GRAVITY', value: '0.86 G' },
    { label: 'STATUS', value: 'NORMAL' },
  ],
  profileWords: ['EXPLORER', 'DISCOVER', 'DOCUMENT', 'TRANSCEND'],
  profileStatus: 'ONLINE',
  missionLog: [
    {
      label: 'MISSION:',
      lines: ['BUILD INFRASTRUCTURE', 'FOR THE NEXT', 'DIGITAL CIVILIZATION.'],
    },
    { label: 'OBJECTIVE:', lines: ['EXPLORE. DISCOVER.', 'DOCUMENT. BUILD.'] },
    { label: 'ENVIRONMENT:', lines: ['UNKNOWN / HOSTILE'] },
    {
      label: 'ASSETS:',
      lines: ['EXPLORATION SUIT'],
      bullets: ['MODULAR GEAR', 'SURVIVAL SYSTEMS'],
    },
    { label: 'RISKS:', lines: ['ISOLATION', 'RADIATION', 'SYSTEM FAILURE'] },
    { label: 'OUTCOME:', lines: ['UNKNOWN'] },
  ],
  suitStats: [
    { label: 'OXYGEN', value: '99%' },
    { label: 'PRESSURE', value: '1.01 atm' },
    { label: 'TEMP', value: '22.1 °C' },
    { label: 'POWER', value: '87%' },
    { label: 'SYSTEMS', value: 'NOMINAL' },
    { label: 'RADIATION', value: 'LOW' },
  ],
  suitMeta: [
    { label: 'SUIT ID', value: 'EX-7A' },
    { label: 'MODEL', value: 'MK-IV' },
    { label: 'SERIAL', value: '7A18-1992' },
  ],
  xray: [
    { label: 'VIEW', lines: ['SKELETAL', '• SYSTEMS'] },
    { label: 'LAYER', lines: ['FULL BODY'] },
    { label: 'SCAN ID', lines: ['XR-061-019'] },
    { label: 'DATE', lines: ['2124-05-13'] },
  ],
};

/** Small technical labels that fade in near a hovered character. */
export const HOVER_LABELS: Record<Side, string[]> = {
  cypherpunk: ['IDENTITY VERIFIED', 'ENCRYPTION ENABLED', 'NODE ONLINE', 'SIGNATURE DETECTED'],
  astronaut: ['LIFE SUPPORT NOMINAL', 'TELEMETRY LOCKED', 'ORBIT STABLE', 'MISSION ACTIVE'],
};

export const CHARACTER_LABELS: Record<Side, { primary: string; secondary: string }> = {
  cypherpunk: { primary: 'CYPHERPUNK', secondary: '// HACKER' },
  astronaut: { primary: 'ASTRONAUT', secondary: '// EXPLORER' },
};

export const COMPLETE_CHECKLIST = [
  'IDENTITY MERGE',
  'NEURAL SYNCHRONIZATION',
  'MEMORY ALIGNMENT',
  'PROTOCOL STABILITY',
];

export const SIDE_STATUS: Record<Side, FieldRowData[]> = {
  cypherpunk: [
    { label: 'IDENTITY', value: 'VERIFIED' },
    { label: 'NEURAL LINK', value: 'ESTABLISHED' },
    { label: 'SIGNATURE', value: '7A3F · 9C2B · 1D7E' },
    { label: 'STATUS', value: 'ONLINE', accent: true },
  ],
  astronaut: [
    { label: 'IDENTITY', value: 'VERIFIED' },
    { label: 'LIFE SUPPORT', value: 'NOMINAL' },
    { label: 'LOCATION', value: 'UNKNOWN SECTOR' },
    { label: 'STATUS', value: 'ONLINE', accent: true },
  ],
};

export const MANIFESTO_LINES = [
  'WE ARE NOT TWO.',
  'THE CYPHERPUNK GUARDS THE INNER WORLD — PRIVACY, FREEDOM, PROOF.',
  'THE ASTRONAUT REACHES FOR THE OUTER ONE — DISCOVERY, MISSION, HOPE.',
  'ALONE, EACH IS INCOMPLETE.',
  'ENCRYPTION WITHOUT EXPLORATION IS A LOCKED ROOM.',
  'EXPLORATION WITHOUT ENCRYPTION IS A GLASS SHIP.',
  'TOGETHER THEY BUILD WHAT NEITHER COULD ALONE:',
  'INFRASTRUCTURE FOR THE NEXT DIGITAL CIVILIZATION.',
  'WE ARE CYPHERNAUT.',
];
