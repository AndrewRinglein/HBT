#!/usr/bin/env node
/**
 * scan-bestiary.mjs — extract the LIVE creature roster from hell-tcg.
 *
 * Run this ON THE MACHINE THAT HAS HELL-TCG (expects ../../../hell-tcg).
 * "Live" means: type === 'enemy' AND referenced by at least one encounter,
 * escalation, or boss pool per hell-tcg's generated referenceGraph. Orphan
 * definitions and enemy spells are excluded on purpose — this is a bestiary
 * of beings a player can actually meet.
 *
 * Writes ../gen/bestiary.json:
 *   [{ uuid, name, slug, campaign, rank, types, arts[], uses[] }]
 *
 * Campaign is derived from which data file defines the creature
 * (SHADOWS_ENEMIES_* / SKYSHIP_ENEMIES_* batch exports; everything else is eve)
 * because enemy defs carry no campaign field.
 *
 * Art resolution mirrors hell-tcg src/shared/cardArtPath.js resolveEnemyArt():
 * artVariants (all of them) → explicit art → name-derived slug. Paths are
 * normalized (../ and ?v= cache-busters stripped) and verified to exist —
 * a listed path that is missing on disk is a hard failure, not a skip.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HELL = path.resolve(HERE, '..', '..', '..', 'hell-tcg');
const GEN = path.resolve(HERE, '..', 'gen');

const { ENEMY_CARDS } = await import(path.join(HELL, 'data/enemyCards.js'));
const { MANIFEST } = await import(path.join(HELL, 'data/generated/referenceGraph.js'));

const useOf = u => MANIFEST?.enemyUse?.[u] || [];
const norm = p => p ? p.replace(/^\.\.\//, '').replace(/\?.*$/, '') : null;
const slug = n => (n || '').toLowerCase().replace(/['’]/g, '').replace(/\s+/g, '-');

// campaign from defining batch file (matches hell-tcg's file layout)
const campaignOf = {};
for (const c of ['shadows', 'skyship']) for (let i = 1; i <= 5; i++) {
    const m = await import(path.join(HELL, `data/${c}-batch${i}.js`));
    for (const [k, v] of Object.entries(m))
        if (k.includes('ENEMIES') && Array.isArray(v))
            for (const e of v) campaignOf[e.uuid] = c;
}

const live = ENEMY_CARDS.filter(e => e.type === 'enemy' && useOf(e.uuid).length > 0);
const missing = [];
const out = live.map(e => {
    let arts;
    if (e.artVariants?.length) arts = e.artVariants.map(norm);
    else if (e.art) {
        const a = norm(e.art);
        arts = [a.startsWith('assets/') || a.startsWith('New Art/') ? a : 'assets/cards/enemies/' + a];
    } else arts = ['assets/cards/enemies/' + slug(e.name) + '.png'];
    for (const a of arts) if (!fs.existsSync(path.join(HELL, a))) missing.push(`${e.uuid} -> ${a}`);
    return {
        uuid: e.uuid, name: e.name, slug: slug(e.name),
        campaign: campaignOf[e.uuid] || 'eve',
        rank: e.tier, types: e.types || [], arts, uses: useOf(e.uuid)
    };
});

if (missing.length) {
    console.error('MISSING ART — refusing to write a bestiary with holes:');
    missing.forEach(m => console.error('  ' + m));
    process.exit(1);
}

fs.mkdirSync(GEN, { recursive: true });
fs.writeFileSync(path.join(GEN, 'bestiary.json'), JSON.stringify(out, null, 1));
const by = (k) => out.reduce((m, o) => (m[o[k]] = (m[o[k]] || 0) + 1, m), {});
console.log(`bestiary: ${out.length} live creatures (of ${ENEMY_CARDS.filter(e => e.type === 'enemy').length} defined)`);
console.log('  campaigns:', JSON.stringify(by('campaign')), '| ranks:', JSON.stringify(by('rank')));
