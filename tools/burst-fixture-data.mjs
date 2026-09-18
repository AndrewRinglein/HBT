// TEST setup only: expanded sheets and action registry must describe the same
// deliberate per-fixture action override. Never part of the browser runtime.
export function fixtureUnits(units, action) {
 return Object.fromEntries(Object.entries(units).map(([id,u])=>[id,{...u,
  ...Object.fromEntries(['attacks','abilities','moves'].filter(k=>Array.isArray(u[k])).map(k=>[k,u[k].map(a=>a.id===action.id?structuredClone(action):a)])),
 }]))
}
