import { describe, it, expect, beforeEach } from 'vitest';
import { NumberingManager } from './numbering-manager';
import { LevelFormat } from '@file/numbering';

describe('NumberingManager', () => {
    let manager: NumberingManager;

    beforeEach(() => {
        manager = new NumberingManager();
    });

    describe('#generateNumberingFromConfigs()', () => {
        it('should generate numbered list configuration', () => {
            // Arrange
            const configs = new Map([
                ['numbered-ref', { listType: 'numbered', level: 0, startNumber: 1 }]
            ]);

            // Act
            manager.generateNumberingFromConfigs(configs);

            // Assert
            const config = manager.getNumberingConfig();
            expect(config.config).toHaveLength(1);
            expect(config.config[0].reference).toBe('numbered-ref');
            expect(config.config[0].levels).toBeDefined();
        });

        it('should generate bullet list configuration', () => {
            // Arrange
            const configs = new Map([
                ['bullet-ref', { listType: 'bullet', level: 0 }]
            ]);

            // Act
            manager.generateNumberingFromConfigs(configs);

            // Assert
            const config = manager.getNumberingConfig();
            expect(config.config[0].levels[0].format).toBe(LevelFormat.BULLET);
        });
    });

    describe('#createBulletLevels()', () => {
        it('should rotate bullet symbols correctly', () => {
            // Arrange & Act
            manager.generateNumberingFromConfigs(new Map([
                ['test', { listType: 'bullet', level: 2 }]
            ]));

            // Assert
            const levels = manager.getNumberingConfig().config[0].levels;
            expect(levels[0].text).toBe('●'); // Level 0
            expect(levels[1].text).toBe('○'); // Level 1
            expect(levels[2].text).toBe('■'); // Level 2
        });
    });

    describe('#getNumbering()', () => {
        it('should throw error when numbering not generated', () => {
            // Arrange & Act & Assert
            expect(() => manager.getNumbering()).toThrow('Numbering has not been generated yet');
        });
    });

    describe('#createConcreteInstances()', () => {
        it('should throw error if numbering not generated first', () => {
            // Arrange
            const configs = new Map([['test', { listType: 'numbered', level: 0 }]]);

            // Act & Assert
            expect(() => manager.createConcreteInstances(configs))
                .toThrow('Numbering must be generated before creating concrete instances');
        });

        describe('edge cases', () => {
            it('should handle empty configuration map', () => {
                // Arrange
                const emptyConfigs = new Map();

                // Act
                manager.generateNumberingFromConfigs(emptyConfigs);

                // Assert
                expect(manager.getNumberingConfig().config).toHaveLength(0);
                expect(manager.getNumbering()).toBeDefined(); // Debe crear Numbering vacío
            });

            it('should handle maximum level correctly', () => {
                // Arrange
                const configs = new Map([
                    ['high-level', { listType: 'numbered', level: 8 }] // Nivel máximo
                ]);

                // Act
                manager.generateNumberingFromConfigs(configs);

                // Assert
                const levels = manager.getNumberingConfig().config[0].levels;
                expect(levels).toHaveLength(9); // 0-8 = 9 niveles
            });

            describe('#createConcreteInstances()', () => {
                it('should create concrete instances for all configurations', () => {
                    // Arrange
                    const configs = new Map([
                        ['ref1', { listType: 'numbered', level: 0 }],
                        ['ref2', { listType: 'bullet', level: 1 }]
                    ]);

                    manager.generateNumberingFromConfigs(configs);

                    // Act
                    manager.createConcreteInstances(configs);

                    // Assert
                    const numbering = manager.getNumbering();
                    const userInstances = numbering.ConcreteNumbering.filter(
                        concrete => configs.has(concrete.reference)
                    );
                    expect(userInstances).toHaveLength(2);
                });
            });
        });
    });
});