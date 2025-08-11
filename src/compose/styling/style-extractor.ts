import xml from "xml";  
import JSZip from "jszip";  
import { xml2js } from "xml-js";  
  
import { Formatter } from "@export/formatter";  
import { IContext, XmlComponent } from "@file/xml-components";  
  
export interface StyleInfo {  
    id: string;  
    name: string;  
    type: 'paragraph' | 'character' | 'table' | 'numbering';  
}  
  
const formatter = new Formatter();  
  
/**  
 * Extrae estilos de un documento DOCX usando JSZip y xml-js  
 * Adaptado de docxcompose-ts para usar las dependencias del proyecto docx  
 */  
export async function extractStylesFromDocx(zipContent: JSZip): Promise<StyleInfo[]> {  
    try {  
        // Obtener el archivo styles.xml  
        const stylesFile = zipContent.file("word/styles.xml");  
        if (!stylesFile) {  
            return [];  
        }  
          
        // Leer el contenido XML  
        const stylesXmlContent = await stylesFile.async("text");  
          
        // Parsear con xml-js (como hace ExternalStylesFactory)  
        const xmlObj = xml2js(stylesXmlContent, { compact: false }) as any;  
  
        let stylesElement: any | undefined;  
        for (const xmlElm of xmlObj.elements || []) {  
            if (xmlElm.name === "w:styles") {  
                stylesElement = xmlElm;  
                break;  
            }  
        }  
          
        if (!stylesElement) {  
            return [];  
        }  
          
        // Extraer información de cada estilo  
        const styles: StyleInfo[] = [];  
        const styleElements = stylesElement.elements || [];  
          
        for (const element of styleElements) {  
            if (element.name === "w:style" && element.attributes) {  
                const id = element.attributes["w:styleId"] as string || '';  
                const type = (element.attributes["w:type"] as string) || 'paragraph';  
                  
                // Buscar el nombre del estilo en subelementos w:name  
                let name = id; // fallback al ID  
                if (element.elements) {  
                    for (const subElement of element.elements) {  
                        if (subElement.name === "w:name" && subElement.attributes) {  
                            name = subElement.attributes["w:val"] as string || id;  
                            break;  
                        }  
                    }  
                }  
                  
                styles.push({  
                    id,  
                    name,  
                    type: type as 'paragraph' | 'character' | 'table' | 'numbering'  
                });  
            }  
        }  
          
        return styles;  
          
    } catch (error) {  
        console.warn("Error al extraer estilos del documento:", error);  
        return [];  
    }  
}  
  
/**  
 * Extrae referencias de estilo de elementos de patch  
 * Adaptado del enfoque de docxcompose-ts para trabajar con elementos individuales  
 */  
export function extractStylesFromPatchElements(patchElements: any[], context: IContext): string[] {  
    const usedStyleIds: string[] = [];  
    const uniqueIds = new Set<string>();  
  
    for (const element of patchElements) {  
        try {  
            // Formatear el elemento a XML usando el formatter del proyecto docx  
            const xmlString = xml(formatter.format(element as XmlComponent, context));  
              
            // Parsear el XML generado  
            const xmlObj = xml2js(xmlString, { compact: false }) as any;  
              
            // Buscar referencias de estilo en el XML  
            const styleIds = findStyleReferencesInXml(xmlObj);  
              
            // Añadir IDs únicos a la lista  
            for (const styleId of styleIds) {  
                if (!uniqueIds.has(styleId)) {  
                    uniqueIds.add(styleId);  
                    usedStyleIds.push(styleId);  
                }  
            }  
        } catch (error) {  
            console.warn('Error processing patch element for style extraction:', error);  
        }  
    }  
  
    return usedStyleIds;  
}  
  
/**  
 * Convierte IDs de estilo de patches en StyleInfo completos  
 * Simula la información que tendría cada estilo del patch  
 */  
export function createStyleInfoFromPatchIds(styleIds: string[]): StyleInfo[] {  
    return styleIds.map(id => {  
        // Mapeo de IDs conocidos a nombres (como los genera docx internamente)  
        const nameMapping: Record<string, string> = {  
            'Title': 'Title',  
            'Heading1': 'Heading 1',  
            'Heading2': 'Heading 2',  
            'Heading3': 'Heading 3',  
            'Heading4': 'Heading 4',  
            'Heading5': 'Heading 5',  
            'Heading6': 'Heading 6',  
            'Normal': 'Normal',  
            'Subtitle': 'Subtitle'  
        };  
  
        return {  
            id,  
            name: nameMapping[id] || id, // Usar mapeo conocido o fallback al ID  
            type: 'paragraph' as const  
        };  
    });  
}  
  
/**  
 * Busca referencias de estilo en un objeto XML parseado  
 * Equivalente a la función findUsedStyleIds de docxcompose-ts pero para xml-js  
 */  
function findStyleReferencesInXml(xmlObj: any): string[] {  
    const styleIds: string[] = [];  
      
    function traverseElement(element: any) {  
        if (!element) return;  
          
        // Buscar elementos de estilo: w:pStyle, w:rStyle, w:tblStyle  
        if (element.name && element.attributes) {  
            if (['w:pStyle', 'w:rStyle', 'w:tblStyle'].includes(element.name)) {  
                const styleId = element.attributes['w:val'];  
                if (styleId && typeof styleId === 'string') {  
                    styleIds.push(styleId);  
                }  
            }  
        }  
          
        // Recursivamente buscar en elementos hijos  
        if (element.elements) {  
            for (const child of element.elements) {  
                traverseElement(child);  
            }  
        }  
    }  
      
    traverseElement(xmlObj);  
    return styleIds;  
}