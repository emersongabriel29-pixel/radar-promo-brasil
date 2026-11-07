import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCategoryGroupIds } from '../lib/category-routing.js';
import { classifyProduct } from '../lib/category-classifier.js';

test('routes an offer only to the group with the same category id', () => {
  const groups = [
    { id: 'casa', category_id: 'cat-casa', keywords: ['capa', 'organizador'] },
    { id: 'tech', category_id: 'cat-tech', keywords: ['capa', 'organizador'] },
    { id: 'general', category_id: null }
  ];
  assert.deepEqual(selectCategoryGroupIds('cat-tech', groups), ['tech']);
});

test('does not route by incidental keyword when category differs', () => {
  const groups = [{ id: 'casa', category_id: 'cat-casa', keywords: ['casa', 'decoracao', 'organizador'] }];
  assert.deepEqual(selectCategoryGroupIds('cat-tech', groups), []);
  assert.deepEqual(selectCategoryGroupIds('cat-pet', groups), []);
});

test('does not route uncategorized offers to niche groups', () => {
  assert.deepEqual(selectCategoryGroupIds(null, [{ id: 'casa', category_id: 'cat-casa' }]), []);
});

test('deduplicates matching destinations', () => {
  const groups = [{ id: 'casa', category_id: 'cat-casa' }, { id: 'casa', category_id: 'cat-casa' }];
  assert.deepEqual(selectCategoryGroupIds('cat-casa', groups), ['casa']);
});

test('classifies anime collectible figures outside Casa & Lar', () => {
  const result = classifyProduct({
    title: '2025 28cm anime duelo monstros anime figura gk yugi muto boneca 2 cabeças estátua de pvc modelo colecionável decoração brinquedos presente de natal'
  });
  assert.equal(result.category, 'Bebês e crianças');
  assert.equal(result.subcategory, 'Brinquedos e figuras colecionáveis');
});

test('keeps household products in Casa & Lar', () => {
  const result = classifyProduct({ title: 'Kit organizador modular para gavetas, armários e geladeira' });
  assert.equal(result.category, 'Casa & Lar');
});
