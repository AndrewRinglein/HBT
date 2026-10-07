// tool.look-items-land-on-a-picture (DECISIONS.md 2026-10-06 'the one plan: land on the quick check, run the whole suites
// twice a day, four streams and one lander': "Dropped: … a new page test for every look-and-feel item - that kind of item
// is checked by a screenshot for Andrew's eye, and rules and numbers keep their tests."). Until this item the gate asked
// every viewer and kingdom item for a test of its own, so a change to how something looks got a headless-browser page
// test — the slow, time-out-prone kind.
//
// The rule: a viewer or kingdom item whose row says `"look": true` lands on a PICTURE of the real built page — a file
// under CONTENT-DRAFTS/<yyyy-mm-dd>-<item id>/ at the root, added by a commit of the root repository that names the
// item, that is a picture and was committed after the item's last change — in place of a test, and lands
// done-needs-review with the picture's path in its ledger line. An item whose commits touch engine source, a kingdom
// rule or a content row is not a look item whatever its row says. Every other item is still asked for its test.
//
// The folder is a scratch one (test/scratch-folder.ts): the REAL gate and add-item, stand-ins for the compiler, the test
// runner and the battles. Nothing here runs a tool on the real folder.
import { beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { LONG, git, makeScratch, node, put, ranLines, recordScheduled, type Scratch } from './scratch-folder.js'
import { LOOK_FOLDER, LOOK_KINDS, isPicture, lookFolderOf, lookPicture, notOnlyALook } from '../tools/gate-progress.mjs'

/** A real picture: a PNG of one pixel. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const T0 = '2026-10-06T10:00:00Z', T1 = '2026-10-06T11:00:00Z', T2 = '2026-10-06T12:00:00Z'
/** Commit everything changed in `dir`, at the time `at`, with the message `msg`. */
const commitAt = (dir: string, msg: string, at: string) => {
  git(dir, 'add', '-A')
  execFileSync('git', ['commit', '-q', '-m', msg], { cwd: dir, stdio: 'pipe', env: { ...process.env, GIT_COMMITTER_DATE: at, GIT_AUTHOR_DATE: at } })
}
const bytes = (file: string, data: Buffer | string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, data) }
const row = (id: string, kind: string, extra: Record<string, unknown> = {}) => ({ id, kind, shape: 'plumbing', spec: `What ${id} is.`, expect: 'It is so.', ...extra })

describe('what a picture is, and where a look item keeps it', () => {
  it('a picture is told by what the file holds, not by what it is called', () => {
    const f = makeScratch()
    const at = (name: string, data: Buffer | string) => { const file = join(f.base, 'pictures', name); bytes(file, data); return file }
    expect(isPicture(at('a.png', PNG))).toBe(true)
    expect(isPicture(at('a.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])))).toBe(true)
    expect(isPicture(at('a.gif', Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00', 'latin1')))).toBe(true)
    expect(isPicture(at('a.webp', Buffer.from('RIFF\x1a\x00\x00\x00WEBPVP8 ', 'latin1')))).toBe(true)
    expect(isPicture(at('notes.png', 'a description of the screen, saved as .png\n'))).toBe(false)
    expect(isPicture(at('empty.png', ''))).toBe(false)
    expect(isPicture(join(f.base, 'pictures', 'not-there.png'))).toBe(false)
  }, LONG)
  it("the folder is Andrew's own for pictures, one folder an item, and only a viewer or kingdom item may be a look item", () => {
    expect(LOOK_FOLDER).toBe('CONTENT-DRAFTS')
    expect(lookFolderOf('viewer.plates-sit-lower', '2026-10-06')).toBe('CONTENT-DRAFTS/2026-10-06-viewer.plates-sit-lower')
    expect(LOOK_KINDS).toEqual(['viewer', 'kingdom'])
  })
})

describe('add-item takes `look` like `later`: a boolean, and only on a viewer or kingdom item', () => {
  const add = (f: Scratch, items: unknown) => { put(join(f.base, 'spec.json'), JSON.stringify(items)); return node(f, join(f.main, 'engine'), {}, 'tools/add-item.mjs', join(f.base, 'spec.json')) }
  const filed = (f: Scratch) => JSON.parse(readFileSync(join(f.main, 'engine', '.state', 'backlog.viewer-kingdom.json'), 'utf8')) as Array<Record<string, unknown>>
  it('a viewer item and a kingdom item marked look are filed with the mark; next.mjs says what a look item brings', () => {
    const f = makeScratch()
    const r = add(f, [row('viewer.plates-sit-lower', 'viewer', { look: true }), row('kingdom.map-pins-gold', 'kingdom', { look: true })])
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(filed(f).map((x) => [x.id, x.look])).toEqual([['viewer.plates-sit-lower', true], ['kingdom.map-pins-gold', true]])
    const next = node(f, join(f.main, 'engine'), {}, 'tools/next.mjs')
    expect(next.stdout).toMatch(/^viewer\.plates-sit-lower   \[viewer · shape: plumbing · look\]$/m)
    expect(next.stdout).toMatch(/^look    a look item — it lands on a PICTURE of the real built page, not a test: CONTENT-DRAFTS\/<yyyy-mm-dd>-viewer\.plates-sit-lower\/<name>\.png at the root, committed there \(git add -f\) by a commit that names the item/m)
  }, LONG)
  it('a look that is not a boolean is refused', () => {
    const f = makeScratch()
    for (const bad of ['yes', 1, null, 'true']) {
      const r = add(f, row('viewer.plates-sit-lower', 'viewer', { look: bad }))
      expect(r.status, String(bad)).toBe(1)
      expect(r.stderr, String(bad)).toMatch(/add-item: look must be boolean/)
    }
  }, LONG)
  it('a look on an engine item — or a content or art one — is refused; `"look": false` reads as no mark anywhere', () => {
    const f = makeScratch()
    for (const kind of ['engine', 'content', 'art', 'ai']) {
      const r = add(f, row('tool.a-thing', kind, { look: true }))
      expect(r.status, kind).toBe(1)
      expect(r.stderr, kind).toMatch(new RegExp(`add-item: look is for a viewer or kingdom item: tool\\.a-thing is kind '${kind}', and lands on its own test`))
    }
    expect(add(f, row('tool.a-thing', 'engine', { look: false })).status).toBe(0)
  }, LONG)
})

describe('the gate lands a look item on its picture, and every other item on its test', () => {
  let f: Scratch, engine: string, viewer: string
  const gate = (...args: string[]) => node(f, engine, {}, 'tools/gate.mjs', ...args)
  const item = (id: string) => (JSON.parse(readFileSync(join(engine, '.state', 'backlog.viewer-kingdom.json'), 'utf8')) as Array<Record<string, unknown>>).find((x) => x.id === id)!
  const line = (out: string, check: string) => out.split('\n').find((l) => l.includes(`  ${check}`)) ?? ''
  const PICTURE = 'look — a picture of the real page, newer than its source', ONLY = 'look — nothing but how it looks'
  /** The item's change, committed in the viewer at T1 under its name. */
  const change = (id: string, at = T1) => { appendFileSync(join(viewer, 'src', 'fold.js'), `export const ${id.replace(/[^a-z]/g, '_')} = 1\n`); commitAt(viewer, `${id}: how it looks`, at) }
  /** A file put in the item's folder of pictures and committed in the root at `at`, under the item's name. */
  const picture = (id: string, name: string, data: Buffer | string, at = T2) => { bytes(join(f.main, lookFolderOf(id, '2026-10-06'), name), data); commitAt(f.main, `${id}: its picture`, at) }

  beforeAll(async () => {
    f = makeScratch()
    engine = join(f.main, 'engine'); viewer = join(f.main, 'viewer')
    await recordScheduled(f.main, { hoursAgo: 2 })   // a landing asks for a scheduled run in the last day (tool.landing-on-the-quick-check)
    put(join(f.base, 'spec.json'), JSON.stringify([
      row('viewer.plates-sit-lower', 'viewer', { look: true }), row('viewer.not-a-picture', 'viewer', { look: true }), row('viewer.old-picture', 'viewer', { look: true }),
      row('viewer.really-a-rule', 'viewer', { look: true }), row('viewer.look-with-a-test', 'viewer', { look: true }), row('viewer.an-ordinary-item', 'viewer'),
    ]))
    const added = node(f, engine, {}, 'tools/add-item.mjs', join(f.base, 'spec.json'))
    expect(added.status, added.stdout + added.stderr).toBe(0)
    commitAt(engine, 'the queue: six viewer items are filed', T0)
  }, LONG)

  it('a look item with no picture is refused, and told how to make one', () => {
    change('viewer.plates-sit-lower')
    const r = gate('viewer.plates-sit-lower')
    expect(r.status).toBe(1)
    expect(line(r.stdout, "the item's own tests")).toMatch(/^  SKIPPED  the item's own tests  — a look item: it brought no test — it is checked by a picture for Andrew's eye/)
    expect(line(r.stdout, 'brought its own tests')).toMatch(/^  SKIPPED  brought its own tests  — a look item brings a picture in place of a test/)
    expect(line(r.stdout, ONLY)).toMatch(/^  PASS  look — nothing but how it looks  — its commits touch no engine source, no kingdom rule and no content row$/)
    expect(line(r.stdout, PICTURE)).toMatch(/^  FAIL  look — a picture of the real page, newer than its source  — a look item lands on a picture, and this one has none — make one of the real built page \(the kingdom's tools\/\*\.shot\.mjs take a page and a folder\), put it in CONTENT-DRAFTS\/<yyyy-mm-dd>-viewer\.plates-sit-lower\/ at the root, and commit it there naming the item: git add -f <the picture>; git commit -m "viewer\.plates-sit-lower: its picture"$/)
    expect(gate('viewer.plates-sit-lower', '--land').status).toBe(1)
    expect(item('viewer.plates-sit-lower').status).toBeUndefined()
  }, LONG)

  it('a picture on disk that no commit of the root carries is refused: it would not travel with the merge', () => {
    bytes(join(f.main, lookFolderOf('viewer.plates-sit-lower', '2026-10-06'), 'plates.png'), PNG)
    const r = gate('viewer.plates-sit-lower')
    expect(r.status).toBe(1)
    expect(line(r.stdout, PICTURE)).toMatch(/^  FAIL  .* — CONTENT-DRAFTS\/2026-10-06-viewer\.plates-sit-lower\/plates\.png is on disk, but no commit of the root repository that names the item adds it — commit it there: git add -f /)
  }, LONG)

  it('with its picture committed after its change, and no test: it lands done-needs-review, and its ledger line names the picture', () => {
    commitAt(f.main, 'viewer.plates-sit-lower: its picture', T2)
    const r = gate('viewer.plates-sit-lower', '--land')
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(line(r.stdout, PICTURE)).toMatch(/^  PASS  look — a picture of the real page, newer than its source  — CONTENT-DRAFTS\/2026-10-06-viewer\.plates-sit-lower\/plates\.png — for Andrew's eye: lands for review$/)
    expect(r.stdout).not.toMatch(/PASS  the item's own tests|PASS  brought its own tests/)
    expect(r.stdout).toMatch(/LANDED as [0-9a-f]{7}  \(flagged for review — a look item: its picture is CONTENT-DRAFTS\/2026-10-06-viewer\.plates-sit-lower\/plates\.png\)/)
    expect(item('viewer.plates-sit-lower').status).toBe('done-needs-review')
    const ledger = readFileSync(join(engine, '.state', 'ledger.md'), 'utf8')
    expect(ledger).toMatch(/^## viewer\.plates-sit-lower — LANDED `[0-9a-f]{7}` \*\*NEEDS REVIEW\*\* — look: CONTENT-DRAFTS\/2026-10-06-viewer\.plates-sit-lower\/plates\.png$/m)
    expect(ledger).not.toMatch(/Existing tests were edited/)
    // …and it reaches the list of what awaits his review with the picture beside it
    expect(item('viewer.plates-sit-lower').picture).toBe('CONTENT-DRAFTS/2026-10-06-viewer.plates-sit-lower/plates.png')
    const report = node(f, engine, {}, 'tools/report.mjs').stdout
    expect(report).toMatch(/^  LANDED  [0-9a-f]{7}  viewer\.plates-sit-lower   \*\* NEEDS REVIEW \*\* — look: CONTENT-DRAFTS\/2026-10-06-viewer\.plates-sit-lower\/plates\.png$/m)
    expect(report).toMatch(/^1 look item\(s\) landed on a picture — open each/m)
    expect(report).not.toMatch(/edited existing tests/)
    // no test was run for it: none was asked for
    expect(ranLines(f).filter((l) => l.startsWith('tests-'))).toEqual([])
  }, LONG)

  it('a file called .png that holds no picture is refused', () => {
    change('viewer.not-a-picture')
    picture('viewer.not-a-picture', 'screen.png', 'the plates sit lower now, trust me\n')
    const r = gate('viewer.not-a-picture')
    expect(r.status).toBe(1)
    expect(line(r.stdout, PICTURE)).toMatch(/^  FAIL  .* — CONTENT-DRAFTS\/2026-10-06-viewer\.not-a-picture\/screen\.png is not a picture \(a \.png, \.jpg, \.jpeg, \.webp or \.gif file that holds one\)/)
  }, LONG)

  it('a picture committed before the item last changed is refused: it does not show that change', () => {
    picture('viewer.old-picture', 'before.png', PNG, T0)
    change('viewer.old-picture', T1)
    const r = gate('viewer.old-picture')
    expect(r.status).toBe(1)
    expect(line(r.stdout, PICTURE)).toMatch(/^  FAIL  .* — CONTENT-DRAFTS\/2026-10-06-viewer\.old-picture\/before\.png was committed before the item's last change \(viewer [0-9a-f]{7}\): it does not show that change — make it again/)
    // taken again after the change, it passes
    picture('viewer.old-picture', 'after.png', PNG, T2)
    expect(line(gate('viewer.old-picture').stdout, PICTURE)).toMatch(/^  PASS  .* — CONTENT-DRAFTS\/2026-10-06-viewer\.old-picture\/after\.png — for Andrew's eye/)
    // …and a change after THAT makes it old again
    change('viewer.old-picture', '2026-10-06T13:00:00Z')
    expect(line(gate('viewer.old-picture').stdout, PICTURE)).toMatch(/^  FAIL  .* was committed before the item's last change/)
  }, LONG)

  it('a look item whose commit touches engine/src is refused, the file named — and so for a kingdom rule and a content row', () => {
    const id = 'viewer.really-a-rule'
    change(id)
    picture(id, 'screen.png', PNG)
    appendFileSync(join(engine, 'src', 'core', 'battle.ts'), 'export const reach = 2\n')
    commitAt(engine, `${id}: the bar shows the new reach`, T1)
    const r = gate(id)
    expect(r.status).toBe(1)
    expect(line(r.stdout, ONLY)).toMatch(/^  FAIL  look — nothing but how it looks  — it changes engine\/src\/core\/battle\.ts — a rule, a number or what a control does\. It is not a look item, whatever its row says: it lands on its own test \(file it without "look"\)$/)
    expect(gate(id, '--land').status).toBe(1)
    expect(item(id).status).toBeUndefined()
    // the same for the other two kinds of rule, each named from the root
    appendFileSync(join(f.main, 'kingdom', 'src', 'core', 'week.ts'), 'export const days = 8\n'); commitAt(join(f.main, 'kingdom'), `${id}: a week is longer`, T1)
    appendFileSync(join(f.main, 'content', 'gen', 'weapons.json'), '\n'); commitAt(join(f.main, 'content'), `${id}: a weapon row`, T1)
    expect(notOnlyALook(id, f.main)).toEqual(['content/gen/weapons.json', 'engine/src/core/battle.ts', 'kingdom/src/core/week.ts'])
    // uncommitted engine source counts too: a landing would commit it
    appendFileSync(join(engine, 'src', 'core', 'battle.ts'), 'export const more = 3\n')
    expect(notOnlyALook('viewer.plates-sit-lower', f.main)).toEqual(['engine/src/core/battle.ts'])
    git(engine, 'checkout', '--', 'src/core/battle.ts')
    expect(notOnlyALook('viewer.plates-sit-lower', f.main)).toEqual([])
  }, LONG)

  it('a look item that did bring a test has it run, as any item does', () => {
    const id = 'viewer.look-with-a-test'
    put(join(viewer, 'test', 'look-with-a-test.test.ts'), '// its own test\n')
    change(id)
    picture(id, 'screen.png', PNG)
    const before = ranLines(f).length
    const r = gate(id)
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(line(r.stdout, "the item's own tests")).toMatch(/^  PASS  the item's own tests  — test\/look-with-a-test\.test\.ts$/)
    expect(ranLines(f).slice(before).some((l) => l.startsWith('tests-viewer '))).toBe(true)
  }, LONG)

  it('an ordinary viewer item is still asked for its test — and has no look check', () => {
    const id = 'viewer.an-ordinary-item'
    change(id)
    picture(id, 'screen.png', PNG)   // a picture does not stand in for the test of an item that is not marked look
    const r = gate(id)
    expect(r.status).toBe(1)
    expect(line(r.stdout, "the item's own tests")).toMatch(/^  FAIL  the item's own tests  — no test file touched$/)
    expect(line(r.stdout, 'brought its own tests')).toMatch(/^  FAIL  brought its own tests  — no test file touched in viewer\/test\/$/)
    expect(r.stdout).not.toMatch(/look — /)
    // …and with its test, it lands done: not for review, and no picture in its line
    put(join(viewer, 'test', 'an-ordinary-item.test.ts'), '// its own test\n')
    commitAt(viewer, `${id}: its test`, T2)
    const landed = gate(id, '--land')
    expect(landed.status, landed.stdout + landed.stderr).toBe(0)
    expect(item(id).status).toBe('done')
    expect(readFileSync(join(engine, '.state', 'ledger.md'), 'utf8')).toMatch(/^## viewer\.an-ordinary-item — LANDED `[0-9a-f]{7}`$/m)
  }, LONG)

  it('the picture is read from the commits, on every call — never replayed from an earlier run of the gate', () => {
    const src = readFileSync(join(engine, 'tools', 'gate.mjs'), 'utf8')
    expect(src.match(/\}, \{ everyCall: true \}\)/g)).toHaveLength(2)
    expect(src).toMatch(/const had = c\.everyCall \? null : recall\(progress, c\.name\)/)
    // and what it reads is one function's, shared with nothing else
    expect(lookPicture('viewer.plates-sit-lower', f.main)).toEqual({ ok: true, picture: 'CONTENT-DRAFTS/2026-10-06-viewer.plates-sit-lower/plates.png', pictures: ['CONTENT-DRAFTS/2026-10-06-viewer.plates-sit-lower/plates.png'] })
    expect(lookPicture('viewer.never-filed', f.main)).toMatchObject({ ok: false })
  }, LONG)
})
