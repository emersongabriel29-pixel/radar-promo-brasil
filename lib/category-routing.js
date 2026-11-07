// Pure category-based destination selection. Keyword matches must never bypass
// the offer's resolved category when choosing a niche Telegram group.
export function selectCategoryGroupIds(offerCategoryId, groups) {
  if (!offerCategoryId || !Array.isArray(groups)) return [];
  const ids = new Set();
  for (const group of groups) {
    if (group && group.id && group.category_id === offerCategoryId) ids.add(group.id);
  }
  return [...ids];
}
