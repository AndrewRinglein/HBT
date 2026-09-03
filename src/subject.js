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
