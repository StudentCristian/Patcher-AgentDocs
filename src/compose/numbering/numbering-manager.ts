 import { Numbering, INumberingOptions } from "@file/numbering";  
 import { ILevelsOptions, LevelFormat } from "@file/numbering/level";  
 import { AlignmentType } from "@file/paragraph";  
 import { convertInchesToTwip } from "@util/convenience-functions";  
   
 export class NumberingManager {  
     private numberingConfig: INumberingOptions = { config: [] };  
     private numbering: Numbering | null = null;  
   
     public generateNumberingFromConfigs(  
         numberingConfigs: Map<string, { listType: string; level: number; startNumber?: number }>  
     ): void {      
         const configs: Array<{ levels: ILevelsOptions[]; reference: string }> = [];      
             
         for (const [reference, config] of numberingConfigs.entries()) {      
             const maxLevel = Math.max(config.level, 2);    
             const levels = this.createLevelsForListType(      
                 config.listType as "numbered" | "bullet",       
                 0,    
                 config.startNumber || 1      
             ).slice(0, maxLevel + 1);    
             
             configs.push({ levels, reference });      
         }      
             
         this.numberingConfig = { config: configs };      
         this.numbering = new Numbering(this.numberingConfig);      
     }
   
     private createLevelsForListType(  
         listType: "numbered" | "bullet" | "checkbox",  
         startLevel: number = 0,  
         startNumber: number = 1  
     ): ILevelsOptions[] {  
         if (listType === "numbered") {  
             return this.createNumberedLevels(startLevel, startNumber);    
         } else {  
             return this.createBulletLevels(startLevel);  
         }  
     } 
   
     private createNumberedLevels(startLevel: number, startNumber: number): ILevelsOptions[] {  
         const levels: ILevelsOptions[] = [];  
         for (let i = startLevel; i <= 8; i++) {  
             levels.push({  
                 level: i,  
                 format: LevelFormat.DECIMAL,  
                 text: `%${i + 1}.`,  
                 alignment: AlignmentType.START,  
                 start: i === startLevel ? startNumber : 1,  
                 style: {  
                     paragraph: {  
                         indent: {  
                             left: convertInchesToTwip(0.5 * (i + 1)),  
                             hanging: convertInchesToTwip(0.25)  
                         },  
                     },  
                 },  
             });  
         }  
         return levels;  
     }  
   
     private createBulletLevels(startLevel: number): ILevelsOptions[] {    
         const bulletSymbols = ["●", "○", "■"]; // Review: Caracteres literales
         const levels: ILevelsOptions[] = [];  
         for (let i = startLevel; i <= 8; i++) {  
             levels.push({  
                 level: i,  
                 format: LevelFormat.BULLET,  
                 text: bulletSymbols[i % bulletSymbols.length],  
                 alignment: AlignmentType.LEFT,  
                 start: 1,  
                 style: {  
                     paragraph: {  
                         indent: {  
                             left: convertInchesToTwip(0.5 * (i + 1)),  
                             hanging: convertInchesToTwip(0.25)  
                         },  
                     },  
                 },  
             });  
         }  
         return levels;  
     }  
   
     public getNumbering(): Numbering {  
         if (!this.numbering) {  
             throw new Error("Numbering has not been generated yet");  
         }  
         return this.numbering;  
     }  
   
     public getNumberingConfig(): INumberingOptions {  
         return this.numberingConfig;  
     }  
 
     public createConcreteInstances(numberingConfigs: Map<string, { listType: string; level: number; startNumber?: number }>): void {  
     if (!this.numbering) {  
         throw new Error("Numbering must be generated before creating concrete instances");  
     }  
   
     for (const [reference, _config] of numberingConfigs.entries()) {  
         const instance = 0; // Por defecto, cada referencia usa instancia 0  
         this.numbering.createConcreteNumberingInstance(reference, instance);  
     }  
   }
 }