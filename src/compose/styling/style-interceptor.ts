// src/patcher/style-interceptor.ts  
import { IXmlableObject } from "@file/xml-components";  
import { StyleMapper } from "./style-mapper";  
  
export class StyleInterceptor {  
    constructor(private styleMapper: StyleMapper) {}  
  
    public interceptAndTransform(xmlObject: IXmlableObject): IXmlableObject {  
        return this.traverseAndTransformStyles(xmlObject);  
    }  
  
private traverseAndTransformStyles(obj: any): any {  
    if (!obj || typeof obj !== 'object') {  
        return obj;  
    }  
  
    // Buscar en w:pPr -> w:pStyle (estructura correcta de docx)  
    if (obj['w:pPr'] && Array.isArray(obj['w:pPr'])) {  
        obj['w:pPr'] = obj['w:pPr'].map((pPrItem: any) => {  
            if (pPrItem['w:pStyle'] && pPrItem['w:pStyle']._attr && pPrItem['w:pStyle']._attr['w:val']) {  
                const originalStyleId = pPrItem['w:pStyle']._attr['w:val'];  
                const mappedStyleId = this.styleMapper.mappedStyleId(originalStyleId);  
                if (mappedStyleId !== originalStyleId) {  
                    console.log(`Interceptando estilo: ${originalStyleId} → ${mappedStyleId}`);  
                    pPrItem['w:pStyle']._attr['w:val'] = mappedStyleId;  
                }  
            }  
            return pPrItem;  
        });  
    }  
  
    // También buscar w:pStyle directamente (por si acaso)  
    if (obj['w:pStyle'] && obj['w:pStyle']._attr && obj['w:pStyle']._attr['w:val']) {  
        const originalStyleId = obj['w:pStyle']._attr['w:val'];  
        const mappedStyleId = this.styleMapper.mappedStyleId(originalStyleId);  
        if (mappedStyleId !== originalStyleId) {  
            console.log(`Interceptando estilo directo: ${originalStyleId} → ${mappedStyleId}`);  
            obj['w:pStyle']._attr['w:val'] = mappedStyleId;  
        }  
    }  
  
    // Procesar recursivamente todos los elementos  
    for (const key in obj) {  
        if (obj.hasOwnProperty(key)) {  
            if (Array.isArray(obj[key])) {  
                obj[key] = obj[key].map((item: any) => this.traverseAndTransformStyles(item));  
            } else if (typeof obj[key] === 'object') {  
                obj[key] = this.traverseAndTransformStyles(obj[key]);  
            }  
        }  
    }  
  
    return obj;  
    } 
}