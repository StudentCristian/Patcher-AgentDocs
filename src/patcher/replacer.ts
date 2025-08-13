import xml from "xml";  
import { Element } from "xml-js";  
  
import { Formatter } from "@export/formatter";  
import { IContext, XmlComponent } from "@file/xml-components";  
import { FileChild } from "@file/file-child";  
import { ParagraphChild } from "@file/paragraph";  
  
import { IPatch, PatchType } from "./from-docx";  
import { findRunElementIndexWithToken, splitRunElement } from "./paragraph-split-inject";  
import { replaceTokenInParagraphElement } from "./paragraph-token-replacer";  
import { StyleMapper } from "../compose/styling/style-mapper";  
import { findLocationOfText } from "./traverser";  
import { toJson } from "./util";  
  
// const formatter = new Formatter();  
  
const SPLIT_TOKEN = "ɵ";  
  
type IReplacerResult = {  
    readonly element: Element;  
    readonly didFindOccurrence: boolean;  
};  
  
export const replacer = ({  
    json,  
    patch,  
    patchText,  
    context,  
    keepOriginalStyles = true,  
    styleMapper,  
    numberingReferenceMap,
}: {  
    readonly json: Element;  
    readonly patch: IPatch;  
    readonly patchText: string;  
    readonly context: IContext;  
    readonly keepOriginalStyles?: boolean;  
    readonly styleMapper?: StyleMapper;
    readonly numberingReferenceMap?: Map<string, string>;
}): IReplacerResult => {  
    const formatter = new Formatter(styleMapper); 
    const renderedParagraphs = findLocationOfText(json, patchText);  
    console.log(`Buscando "${patchText}": encontrados ${renderedParagraphs.length} párrafos`);  
  
    if (renderedParagraphs.length === 0) {  
        console.log(`No se encontró el placeholder "${patchText}" en el documento`);  
        return { element: json, didFindOccurrence: false };  
    }  
  
    for (const renderedParagraph of renderedParagraphs) {
        let processedChildren = patch.children;

        // NUEVO: Aplicar referencia de numeración si existe
        if (numberingReferenceMap && numberingReferenceMap.has(patchText)) {
            const numberingReference = numberingReferenceMap.get(patchText);
            processedChildren = processedChildren.map(child => {
                if (child.constructor.name === 'Paragraph') {
                    // Asumiendo que la propiedad de numeración se llama 'numberingReference'
                    (child as any).numberingReference = numberingReference;
                }
                return child;
            });
        }

        if (styleMapper) {
            processedChildren = applyStyleMapping(patch.children, styleMapper);
        }  
          
            const textJson = processedChildren.map((c) =>   
                toJson(xml(formatter.format(c as XmlComponent, context)))  
            ).map((c) => c.elements![0]);  
  
        switch (patch.type) {  
            case PatchType.DOCUMENT: {  
                const parentElement = goToParentElementFromPath(json, renderedParagraph.pathToParagraph);  
                const elementIndex = getLastElementIndexFromPath(renderedParagraph.pathToParagraph);  
                // eslint-disable-next-line functional/immutable-data  
                parentElement.elements!.splice(elementIndex, 1, ...textJson);  
                break;  
            }  
            case PatchType.PARAGRAPH:  
            default: {  
                const paragraphElement = goToElementFromPath(json, renderedParagraph.pathToParagraph);  
                replaceTokenInParagraphElement({  
                    paragraphElement,  
                    renderedParagraph,  
                    originalText: patchText,  
                    replacementText: SPLIT_TOKEN,  
                });  
  
                const index = findRunElementIndexWithToken(paragraphElement, SPLIT_TOKEN);  
  
                const runElementToBeReplaced = paragraphElement.elements![index];  
                const { left, right } = splitRunElement(runElementToBeReplaced, SPLIT_TOKEN);  
  
                let newRunElements = textJson;  
                let patchedRightElement = right;  
  
                if (keepOriginalStyles) {  
                    const runElementNonTextualElements = runElementToBeReplaced.elements!.filter(  
                        (e) => e.type === "element" && e.name === "w:rPr",  
                    );  
  
                    newRunElements = textJson.map((e) => ({  
                        ...e,  
                        elements: [...runElementNonTextualElements, ...(e.elements ?? [])],  
                    }));  
  
                    patchedRightElement = {  
                        ...right,  
                        elements: [...runElementNonTextualElements, ...right.elements!],  
                    };  
                }  
  
                // eslint-disable-next-line functional/immutable-data  
                paragraphElement.elements!.splice(index, 1, left, ...newRunElements, patchedRightElement);  
                break;  
            }  
        }  
    }  
  
    return { element: json, didFindOccurrence: true };  
};  
  
/**  
 * NUEVA función para aplicar el mapeo de estilos a los elementos del patch  
 * Transforma los elementos aplicando las transformaciones de ID de estilo  
 */  
function applyStyleMapping(children: readonly (ParagraphChild | FileChild)[], styleMapper: StyleMapper): (ParagraphChild | FileChild)[] {  
    return children.map(child => {  
        const childCopy = Object.create(Object.getPrototypeOf(child));  
        Object.assign(childCopy, child);  
          
        // Para elementos Paragraph, verificar si tienen heading  
        if (child.constructor.name === 'Paragraph') {  
            // Acceder a las opciones internas del párrafo  
            const paragraphOptions = (child as any).options;  
            if (paragraphOptions && paragraphOptions.heading) {  
                // Mapear el estilo de heading  
                const headingStyleId = getHeadingStyleId(paragraphOptions.heading);  
                const mappedStyleId = styleMapper.mappedStyleId(headingStyleId);  
                  
                // Aplicar el estilo mapeado  
                if (mappedStyleId !== headingStyleId) {  
                    console.log(`Mapeando estilo: ${headingStyleId} → ${mappedStyleId}`);  
                    // Aquí necesitarías modificar las propiedades internas del párrafo  
                }  
            }  
        }  
          
        // Aplicar recursivamente a children si existen  
        if ('children' in childCopy && Array.isArray(childCopy.children)) {  
            (childCopy as any).children = applyStyleMapping(childCopy.children as any[], styleMapper);  
        }  
          
        return childCopy as ParagraphChild | FileChild;  
    });  
}  
  
// Función auxiliar para convertir HeadingLevel a style ID  
function getHeadingStyleId(headingLevel: any): string {  
    const headingMap: Record<string, string> = {  
        'TITLE': 'Title',  
        'HEADING_1': 'Heading1',  
        'HEADING_2': 'Heading2',  
        'HEADING_3': 'Heading3',
        'HEADING_4': 'Heading4',
        'HEADING_5': 'Heading5',
        'HEADING_6': 'Heading6', 
    };  
      
    return headingMap[headingLevel] || 'Normal';  
}
  
const goToElementFromPath = (json: Element, path: readonly number[]): Element => {  
    let element = json;  
  
    // We start from 1 because the first element is the root element  
    // Which we do not want to double count  
    for (let i = 1; i < path.length; i++) {  
        const index = path[i];  
        const nextElements = element.elements!;  
  
        element = nextElements[index];  
    }  
  
    return element;  
};  
  
const goToParentElementFromPath = (json: Element, path: readonly number[]): Element =>  
    goToElementFromPath(json, path.slice(0, path.length - 1));  
  
const getLastElementIndexFromPath = (path: readonly number[]): number => path[path.length - 1];