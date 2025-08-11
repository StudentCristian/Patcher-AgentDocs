 // src/patcher/numbering-extractor.ts  
 import { Element } from "xml-js";  
 // import { getFirstLevelElements } from "./util";  
   
 export interface NumberingInfo {  
     abstractNumId: string;  
     numId: string;  
     reference?: string;  
     levels: any[];  
 }  
   
 export function extractExistingNumbering(xmlDocuments: { [key: string]: Element }): NumberingInfo[] {  
     const numberingXml = xmlDocuments['word/numbering.xml'];  
     if (!numberingXml) return [];  
       
     const numberingInfos: NumberingInfo[] = [];  
       
     // Usar getFirstLevelElements similar a como se hace en content-types-manager  
     // const numberingElements = getFirstLevelElements(numberingXml, "numbering");  
       
     // Extraer elementos w:num y w:abstractNum usando la estructura de xml-js  
     const nums: Element[] = [];  
     const abstractNums: Element[] = [];  
       
     function findElementsByName(elements: Element[], name: string): Element[] {  
         const found: Element[] = [];  
         if (!elements) return found;  
           
         for (const element of elements) {  
             if (element.type === "element" && element.name === name) {  
                 found.push(element);  
             }  
             if (element.elements) {  
                 found.push(...findElementsByName(element.elements, name));  
             }  
         }  
         return found;  
     }  
       
     if (numberingXml.elements) {  
         nums.push(...findElementsByName(numberingXml.elements, "w:num"));  
         abstractNums.push(...findElementsByName(numberingXml.elements, "w:abstractNum"));  
     }  
       
     for (const num of nums) {  
         const numId = num.attributes?.['w:numId'] as string;  
           
         // Encontrar abstractNumId en los elementos hijos  
         let abstractNumId = '';  
         if (num.elements) {  
             const abstractNumIdElement = num.elements.find(el =>   
                 el.type === "element" && el.name === "w:abstractNumId"  
             );  
             if (abstractNumIdElement?.attributes?.['w:val']) {  
                 abstractNumId = abstractNumIdElement.attributes['w:val'] as string;  
             }  
         }  
           
         // Encontrar el abstractNum correspondiente  
         const abstractNum = abstractNums.find(abs =>   
             abs.attributes?.['w:abstractNumId'] === abstractNumId  
         );  
           
         if (abstractNum && abstractNum.elements) {  
             const levels = findElementsByName(abstractNum.elements, "w:lvl");  
             numberingInfos.push({  
                 abstractNumId,  
                 numId,  
                 levels: levels.map(level => ({  
                     level: level.attributes?.['w:ilvl'],  
                     format: extractLevelFormat(level),  
                     text: extractLevelText(level)  
                 }))  
             });  
         }  
     }  
       
     return numberingInfos;  
 }  
   
 function extractLevelFormat(levelElement: Element): string | null {  
     if (!levelElement.elements) return null;  
       
     const numFmtElement = levelElement.elements.find(el =>   
         el.type === "element" && el.name === "w:numFmt"  
     );  
       
     return numFmtElement?.attributes?.['w:val'] as string || null;  
 }  
   
 function extractLevelText(levelElement: Element): string | null {  
     if (!levelElement.elements) return null;  
       
     const lvlTextElement = levelElement.elements.find(el =>   
         el.type === "element" && el.name === "w:lvlText"  
     );  
       
     return lvlTextElement?.attributes?.['w:val'] as string || null;  
 }