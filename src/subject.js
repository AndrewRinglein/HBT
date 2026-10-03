/* ONE subject rule (review 2026-09-03: the panel, the bar, the stamina strip
   and the camera each had their own copy with different fallbacks). Whoever
   was clicked, else whoever the fold says is the subject, else whoever is
   acting, else the first unit on the field. */
export function subjectOf(V) {
  const { S, view } = V
  if (view.inspectId != null && S.U[view.inspectId]) return view.inspectId
  if (S.subjectId != null && S.U[S.subjectId]) return S.subjectId
  if (S.activeId != null && S.U[S.activeId]) return S.activeId
  const first = Object.keys(S.U)[0]
  return first == null ? null : +first
}
/* viewer.turn-taking (engine DECISIONS.md 2026-10-03 'the action bar and its card stay with the activated unit': "There is a
   unit who is activated. That portrait is next to all of the abilities. ... While that unit is activated, those abilities just
   stay there. I click on an enemy, and the enemy just goes into the highlight on the right screen, but it doesn't change my
   actions that are available."). For a host that plays (opts.onPlay), the action bar, the stamina strip, the card beside the
   bar and the camera's inclusion belong to the activated unit — the host's acting hero (its play facts' actor), else whoever
   the fold says is acting, else the fold's subject; a click on another unit moves only the panel (subjectOf). The standalone
   page has no activated unit of its own to hold, so there they follow subjectOf as before (viewer SWITCHES turnBarHostOnly). */
export function barUnitOf(V) {
  if (!V.host) return subjectOf(V)
  const { S } = V
  for (const id of [V.play && V.play.actor, S.activeId, S.subjectId]) if (id != null && S.U[id]) return id
  const first = Object.keys(S.U)[0]
  return first == null ? null : +first
}
