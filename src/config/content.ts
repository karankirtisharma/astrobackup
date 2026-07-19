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
