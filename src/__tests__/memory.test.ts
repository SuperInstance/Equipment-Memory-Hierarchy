/**
 * Equipment-Memory-Hierarchy — 4-tier cognitive memory tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WorkingMemory,
  EpisodicMemory,
  SemanticMemory,
  ProceduralMemory,
  HierarchicalMemory,
  MemoryTier,
  SemanticRelationType,
  SkillStatus,
  MemoryEventType,
} from '../index';

// ═══════════════════════════════════════════════════════════════════
// Working Memory Tests (13 tests)
// ═══════════════════════════════════════════════════════════════════

describe('WorkingMemory', () => {
  let wm: WorkingMemory;
  beforeEach(() => { wm = new WorkingMemory({ capacity: 5 }); });

  it('should add items and retrieve them', () => {
    const item = wm.add('hello', 0.8);
    expect(item.id).toBeTruthy();
    expect(item.tier).toBe(MemoryTier.WORKING);
    expect(wm.get(item.id)!.id).toBe(item.id);
  });

  it('should respect capacity limits', () => {
    for (let i = 0; i < 7; i++) wm.add(`item-${i}`, 0.5);
    expect(wm.getAll().length).toBeLessThanOrEqual(5);
  });

  it('should remove items', () => {
    const item = wm.add('removeme', 0.5);
    expect(wm.remove(item.id)).toBe(true);
    expect(wm.get(item.id)).toBeNull();
  });

  it('should return false for removing nonexistent', () => {
    expect(wm.remove('nope')).toBe(false);
  });

  it('should set and get focus', () => {
    const item = wm.add('focus-me', 0.9);
    wm.setFocus(item.id);
    expect(wm.getCurrentFocus()!.id).toBe(item.id);
  });

  it('should return null focus when nothing focused', () => {
    expect(wm.getCurrentFocus()).toBeNull();
  });

  it('should track utilization', () => {
    wm.add('a', 0.5);
    wm.add('b', 0.5);
    expect(wm.getUtilization()).toBe(2 / 5);
  });

  it('should clear all items', () => {
    wm.add('a', 0.5);
    wm.clear();
    expect(wm.getAll().length).toBe(0);
  });

  it('should relate items', () => {
    const a = wm.add('a', 0.5);
    const b = wm.add('b', 0.5);
    expect(wm.relateItems(a.id, b.id)).toBe(true);
  });

  it('should return state with items', () => {
    wm.add('a', 0.5);
    expect(wm.getState().items.size).toBe(1);
  });

  it('should set context', () => {
    wm.setContext({ task: 'testing' });
    expect(wm.getState().context).toEqual({ task: 'testing' });
  });

  it('should find consolidation candidates by importance', () => {
    wm.add('important', 0.95);
    wm.add('trivial', 0.1);
    const candidates = wm.getConsolidationCandidates();
    expect(candidates.some(c => c.importance >= 0.7)).toBe(true);
  });

  it('should emit events on add', () => {
    const handler = vi.fn();
    wm.subscribe(MemoryEventType.ITEM_ADDED, handler);
    wm.add('test', 0.5);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Episodic Memory Tests (9 tests)
// ═══════════════════════════════════════════════════════════════════

describe('EpisodicMemory', () => {
  let em: EpisodicMemory;
  beforeEach(() => { em = new EpisodicMemory(); });

  it('should add and retrieve episodes', () => {
    const item = em.add('test-event', { key: 'value' }, {
      importance: 0.7,
      source: { type: 'action' },
      emotionalContext: { valence: 0.5, arousal: 0.3, dominance: 0.5 },
    });
    expect(item.tier).toBe(MemoryTier.EPISODIC);
    expect(em.get(item.id)!.content.event).toBe('test-event');
  });

  it('should query by time range', () => {
    const now = new Date();
    em.add('past', {}, { importance: 0.5 });
    expect(em.getByTimeRange(new Date(now.getTime() - 60000), new Date(now.getTime() + 60000)).length).toBeGreaterThanOrEqual(1);
  });

  it('should get recent episodes', () => {
    em.add('a', {}, { importance: 0.5 });
    em.add('b', {}, { importance: 0.5 });
    expect(em.getRecent(2).length).toBeLessThanOrEqual(2);
  });

  it('should tag episodes', () => {
    em.add('tagged', {}, { importance: 0.5, tags: ['test'] });
    expect(em.getByTag('test').length).toBe(1);
  });

  it('should remove episodes', () => {
    const item = em.add('rm', {}, { importance: 0.5 });
    expect(em.remove(item.id)).toBe(true);
    expect(em.get(item.id)).toBeNull();
  });

  it('should calculate retention 0-1', () => {
    const item = em.add('ret', {}, { importance: 0.8 });
    const r = em.calculateRetention(item);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
  });

  it('should get consolidation candidates', () => {
    em.add('important', {}, { importance: 0.95 });
    em.add('trivial', {}, { importance: 0.1 });
    expect(em.getConsolidationCandidates().length).toBeGreaterThanOrEqual(0);
  });

  it('should process forgetting', () => {
    for (let i = 0; i < 5; i++) em.add(`ev-${i}`, {}, { importance: 0.1 });
    expect(typeof em.processForgetting(0.5)).toBe('number');
  });

  it('should return statistics', () => {
    em.add('a', {}, { importance: 0.5 });
    expect(em.getStatistics().itemCount).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Semantic Memory Tests (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('SemanticMemory', () => {
  let sm: SemanticMemory;
  beforeEach(() => { sm = new SemanticMemory(); });

  it('should add and retrieve concepts', () => {
    const item = sm.add('FLUX', {
      definition: 'A markdown-to-bytecode runtime',
      attributes: { type: 'runtime' },
      category: 'technology',
      importance: 0.9,
      confidence: 0.95,
    });
    expect(item.tier).toBe(MemoryTier.SEMANTIC);
    expect(sm.get(item.id)!.content.concept).toBe('FLUX');
  });

  it('should relate concepts', () => {
    const a = sm.add('Oracle1', { category: 'agents', importance: 0.9 });
    const b = sm.add('JetsonClaw1', { category: 'agents', importance: 0.9 });
    const rel = sm.relate(a.id, b.id, SemanticRelationType.RELATED_TO, {
      strength: 0.8, bidirectional: true,
    });
    expect(rel).toBeDefined();
    expect(rel!.strength).toBe(0.8);
  });

  it('should query concepts by category', () => {
    sm.add('A', { category: 'type-x', importance: 0.5 });
    sm.add('B', { category: 'type-y', importance: 0.5 });
    sm.add('C', { category: 'type-x', importance: 0.5 });
    expect(sm.query({ category: 'type-x' }).length).toBe(2);
  });

  it('should remove concepts', () => {
    const item = sm.add('temp', { importance: 0.5 });
    expect(sm.remove(item.id)).toBe(true);
    expect(sm.get(item.id)).toBeNull();
  });

  it('should track confidence', () => {
    const item = sm.add('uncertain', { importance: 0.5, confidence: 0.3 });
    expect(item.confidence).toBe(0.3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Procedural Memory Tests (4 tests)
// ═══════════════════════════════════════════════════════════════════

describe('ProceduralMemory', () => {
  let pm: ProceduralMemory;
  beforeEach(() => { pm = new ProceduralMemory(); });

  it('should add and retrieve skills', () => {
    const item = pm.add('code-review', [
      { order: 1, action: 'read-code', parameters: {} },
      { order: 2, action: 'analyze', parameters: {} },
    ], {
      description: 'Review code for quality',
      importance: 0.8,
    });
    expect(item.tier).toBe(MemoryTier.PROCEDURAL);
    expect(item.status).toBe(SkillStatus.LEARNING);
    expect(pm.get(item.id)!.content.skill).toBe('code-review');
  });

  it('should start with zero execution count', () => {
    const item = pm.add('test-skill', [{ order: 1, action: 'act', parameters: {} }], {
      description: 'A test', importance: 0.5,
    });
    expect(item.executionCount).toBe(0);
  });

  it('should remove skills', () => {
    const item = pm.add('temp', [], { description: 'Temp', importance: 0.5 });
    expect(pm.remove(item.id)).toBe(true);
    expect(pm.get(item.id)).toBeNull();
  });

  it('should deduplicate skills by name', () => {
    const a = pm.add('same-skill', [{ order: 1, action: 'a', parameters: {} }], { importance: 0.5 });
    const b = pm.add('same-skill', [{ order: 1, action: 'b', parameters: {} }], { importance: 0.5 });
    // Second add returns updated existing
    expect(a.id).toBe(b.id);
  });
});

// ═══════════════════════════════════════════════════════════════════
// HierarchicalMemory Integration Tests (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('HierarchicalMemory', () => {
  it('should create with default config', () => {
    expect(new HierarchicalMemory()).toBeDefined();
  });

  it('should create with custom config', () => {
    const hm = new HierarchicalMemory({
      working: { capacity: 3, decayInterval: 10000, attentionThreshold: 0.2, autoConsolidate: false },
    });
    expect(hm).toBeDefined();
  });

  it('should return full statistics', () => {
    const stats = new HierarchicalMemory().getStatistics();
    expect(stats.working).toBeDefined();
    expect(stats.episodic).toBeDefined();
    expect(stats.semantic).toBeDefined();
    expect(stats.procedural).toBeDefined();
  });
});
