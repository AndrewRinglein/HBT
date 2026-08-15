import subprocess, os
LIVE = ['engine/COMBAT-SEQUENCE.md','engine/ENGINE-CONSTITUTION.md','engine/SWITCHES.md',
        'engine/CLAUDE.md','engine/COMBAT-FRAMEWORK.md','GLOSSARY.md','GAME-DESIGN.md',
        'GAME-ARCHITECTURE.md']
PLAN = ['engine/TRIGGERS-PLAN.md','engine/TRIGGER-NOTES.md','engine/CONTENT-AUDIT.md',
        'engine/VIEWER-PLAN.md','engine/LOOP-PLAN.md']
RULINGS = [
 ("attack hits resolve one at a time",      "resolved \\*\\*one at a time"),
 ("onAttack fires first, hit or miss",      "second the swing begins"),
 ("onDeath lives in settle only",           "not in this list, on purpose"),
 ("onTakingDamage is the victim's",         "victim's"),
 ("onCrit exists",                          "onCrit"),
 ("turnEnd -> onActivationEnd",             "onActivationEnd"),
 ("Spirit is a stat, party-summed",         "[Ss]pirit"),
 ("targeting: self/unit/area + tags",       "requireTags"),
 ("area origin self vs target",             "whirlwind"),
 ("terrain values from GROUND-REQ 1.1",     "GROUND-REQUIREMENTS"),
 ("trigger chance is a percent + cup",      "trigger cup"),
]
def where(pat, files):
    hit = []
    for f in files:
        if not os.path.exists(f): continue
        r = subprocess.run(['grep','-lE',pat,f],capture_output=True,text=True)
        if r.stdout.strip(): hit.append(os.path.basename(f))
    return hit
print(f"{'ruling':40} {'LIVE doc':34} {'plan doc only'}")
print('-'*104)
for name, pat in RULINGS:
    live, plan = where(pat, LIVE), where(pat, PLAN)
    mark = '' if live else '  <-- NOT IN A LIVE DOC'
    print(f"{name:40} {(', '.join(live) or '—'):34} {', '.join(plan) or '—'}{mark}")
