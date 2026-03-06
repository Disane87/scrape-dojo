vi.mock('@angular/common/http', () => ({
  HttpClient: class {},
}));

vi.mock('./app-data.service', () => ({
  AppDataService: class {},
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { ActionMetadataService } from './action-metadata.service';

describe('ActionMetadataService', () => {
  let service: ActionMetadataService;
  let mockAppData: {
    actionMetadata: ReturnType<typeof signal>;
    initialized: ReturnType<typeof signal>;
  };

  beforeEach(() => {
    mockAppData = {
      actionMetadata: signal({
        navigate: {
          name: 'navigate',
          displayName: 'Navigate',
          icon: 'Globe',
          description: 'Navigate to a URL',
          color: 'blue',
          category: 'browser',
        },
        click: {
          name: 'click',
          displayName: 'Click',
          icon: 'MousePointer',
          description: 'Click an element',
          color: 'purple',
          category: 'interaction',
        },
      }),
      initialized: signal(true),
    };

    service = Object.create(ActionMetadataService.prototype);
    (service as any).appData = mockAppData;

    // Recreate the computed properties that rely on appData
    (service as any).metadata = computed(() => mockAppData.actionMetadata());
    (service as any).loaded = computed(() => mockAppData.initialized());
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });

  describe('getMetadata', () => {
    it('should return metadata for a known action', () => {
      const meta = service.getMetadata('navigate');
      expect(meta.name).toBe('navigate');
      expect(meta.displayName).toBe('Navigate');
      expect(meta.icon).toBe('Globe');
      expect(meta.color).toBe('blue');
    });

    it('should return default metadata for an unknown action', () => {
      const meta = service.getMetadata('nonexistent');
      expect(meta.name).toBe('nonexistent');
      expect(meta.displayName).toBe('nonexistent');
      expect(meta.icon).toBe('Code');
      expect(meta.description).toBe('Unknown action');
      expect(meta.color).toBe('gray');
    });
  });

  describe('getIconName', () => {
    it('should return icon name for a known action', () => {
      expect(service.getIconName('navigate')).toBe('Globe');
    });

    it('should return default icon for unknown action', () => {
      expect(service.getIconName('unknown_action')).toBe('Code');
    });
  });

  describe('getDescription', () => {
    it('should return description for a known action', () => {
      expect(service.getDescription('navigate')).toBe('Navigate to a URL');
    });

    it('should return default description for unknown action', () => {
      expect(service.getDescription('unknown_action')).toBe('Unknown action');
    });
  });

  describe('getColor', () => {
    it('should return color for a known action', () => {
      expect(service.getColor('navigate')).toBe('blue');
    });

    it('should return gray for unknown action', () => {
      expect(service.getColor('unknown_action')).toBe('gray');
    });
  });

  describe('getIconBgClasses', () => {
    it('should return blue classes for navigate action', () => {
      const classes = service.getIconBgClasses('navigate');
      expect(classes).toContain('bg-blue-500/20');
      expect(classes).toContain('text-blue-400');
    });

    it('should return gray classes for unknown action', () => {
      const classes = service.getIconBgClasses('unknown_action');
      expect(classes).toContain('bg-gray-500/20');
      expect(classes).toContain('text-gray-400');
    });
  });

  describe('getColorClasses', () => {
    it('should return card color classes for a known action', () => {
      const classes = service.getColorClasses('navigate');
      expect(classes).toContain('bg-blue-500/20');
      expect(classes).toContain('border-blue-500/50');
      expect(classes).toContain('text-blue-400');
    });

    it('should return gray card classes for unknown action', () => {
      const classes = service.getColorClasses('unknown_action');
      expect(classes).toContain('bg-gray-500/20');
    });
  });

  describe('getBorderClasses', () => {
    it('should return border classes for a known action', () => {
      expect(service.getBorderClasses('navigate')).toBe('border-l-blue-500');
    });

    it('should return gray border for unknown action', () => {
      expect(service.getBorderClasses('unknown_action')).toBe(
        'border-l-gray-500',
      );
    });
  });

  describe('getLoopExpandedClasses', () => {
    it('should return loop expanded classes for a known action', () => {
      const classes = service.getLoopExpandedClasses('navigate');
      expect(classes).toContain('bg-blue-500/10');
      expect(classes).toContain('border-blue-500/40');
    });

    it('should return gray loop expanded classes for unknown action', () => {
      const classes = service.getLoopExpandedClasses('unknown_action');
      expect(classes).toContain('bg-gray-500/10');
      expect(classes).toContain('border-gray-500/40');
    });
  });

  describe('getLoopCollapsedClasses', () => {
    it('should return loop collapsed classes for a known action', () => {
      const classes = service.getLoopCollapsedClasses('navigate');
      expect(classes).toContain('bg-blue-500/5');
      expect(classes).toContain('hover:bg-blue-500/10');
    });

    it('should return gray loop collapsed classes for unknown action', () => {
      const classes = service.getLoopCollapsedClasses('unknown_action');
      expect(classes).toContain('bg-gray-500/5');
      expect(classes).toContain('hover:bg-gray-500/10');
    });
  });

  describe('gray default for unknown color', () => {
    it('should fall back to gray classes when action has an unmapped color', () => {
      mockAppData.actionMetadata.set({
        custom: {
          name: 'custom',
          displayName: 'Custom',
          icon: 'Star',
          description: 'Custom action',
          color: 'chartreuse', // not in COLOR_CLASSES
          category: 'utility',
        },
      });

      const classes = service.getIconBgClasses('custom');
      expect(classes).toContain('bg-gray-500/20');
      expect(classes).toContain('text-gray-400');
    });
  });
});
