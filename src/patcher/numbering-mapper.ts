// src/patcher/numbering-mapper.ts  
import { NumberingInfo } from "./numbering-extractor";  
  
export interface NumberingMapping {  
    originalReference: string;  
    targetNumId: string;  
    isExisting: boolean;  
}  
  
export class NumberingMapper {  
    private mappings: Map<string, NumberingMapping> = new Map();  
      
    public createMapping(  
        sourceReferences: string[],   
        existingNumbering: NumberingInfo[]  
    ): void {  
        this.mappings.clear();  
          
        for (const reference of sourceReferences) {  
            const compatible = this.findCompatibleNumbering(reference, existingNumbering);  
              
            if (compatible) {  
                this.mappings.set(reference, {  
                    originalReference: reference,  
                    targetNumId: compatible.numId,  
                    isExisting: true  
                });  
            } else {  
                this.mappings.set(reference, {  
                    originalReference: reference,  
                    targetNumId: this.generateNewNumId(existingNumbering),  
                    isExisting: false  
                });  
            }  
        }  
    }  
      
    private findCompatibleNumbering(reference: string, existing: NumberingInfo[]): NumberingInfo | null {  
        const isBullet = reference.includes('bullet');  
          
        return existing.find(num => {  
            const firstLevel = num.levels[0];  
            if (!firstLevel) return false;  
              
            const format = firstLevel.format;  
            const isBulletFormat = format === 'bullet';  
              
            return isBullet === isBulletFormat;  
        }) || null;  
    }  
      
    private generateNewNumId(existing: NumberingInfo[]): string {  
        const maxId = Math.max(...existing.map(n => parseInt(n.numId) || 0), 0);  
        return (maxId + 1).toString();  
    }  
      
    public getMappedNumId(reference: string): string | null {  
        return this.mappings.get(reference)?.targetNumId || null;  
    }  
      
    public isExistingNumbering(reference: string): boolean {  
        return this.mappings.get(reference)?.isExisting || false;  
    }  
}