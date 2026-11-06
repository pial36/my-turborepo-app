// copy only whitelisted keys that are present on obj
// used so request bodies can never write fields like workspaceId or password
const pick = (obj, keys) => {
  const out = {}
  if (!obj) return out
  for (const key of keys) {
    if (obj[key] !== undefined) out[key] = obj[key]
  }
  return out
}

module.exports = pick
