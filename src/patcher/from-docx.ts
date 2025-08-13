import JSZip from "jszip";
import { Element, js2xml } from "xml-js";

import { ImageReplacer } from "@export/packer/image-replacer";
import { DocumentAttributeNamespaces } from "@file/document";
import { IViewWrapper } from "@file/document-wrapper";
import { File } from "@file/file";
import { FileChild } from "@file/file-child";
import { IMediaData, Media } from "@file/media";
import { ConcreteHyperlink, ExternalHyperlink, ParagraphChild } from "@file/paragraph";
import { TargetModeType } from "@file/relationships/relationship/relationship";
import { IContext } from "@file/xml-components";
import { uniqueId } from "@util/convenience-functions";
import { OutputByType, OutputType } from "@util/output-type";

import { appendContentType } from "./content-types-manager";
import { appendRelationship, getNextRelationshipIndex, checkIfNumberingRelationExists } from "./relationship-manager";
import { replacer } from "./replacer"; 
import { toJson  } from "./util";

import xml from "xml";  
import { Formatter } from "@export/formatter";  
import { NumberingReplacer } from "@export/packer/numbering-replacer";
import { NumberingManager } from "../compose/numbering/numbering-manager"; 
import { extractExistingNumbering, NumberingInfo } from "../compose/numbering/numbering-extractor";
import { extractStylesFromDocx, extractStylesFromPatchElements, createStyleInfoFromPatchIds } from "../compose/styling/style-extractor";  
import { StyleMapper } from "../compose/styling/style-mapper"; 

// eslint-disable-next-line functional/prefer-readonly-type
export type InputDataType = Buffer | string | number[] | Uint8Array | ArrayBuffer | Blob | NodeJS.ReadableStream | JSZip;

export const PatchType = {  
    DOCUMENT: "file",  
    PARAGRAPH: "paragraph",  
} as const;

type ParagraphPatch = {
    readonly type: typeof PatchType.PARAGRAPH;
    readonly children: readonly ParagraphChild[];
};

type FilePatch = {
    readonly type: typeof PatchType.DOCUMENT;
    readonly children: readonly FileChild[];
};

type IImageRelationshipAddition = {
    readonly key: string;
    readonly mediaDatas: readonly IMediaData[];
};

type IHyperlinkRelationshipAddition = {
    readonly key: string;
    readonly hyperlink: { readonly id: string; readonly link: string };
};

export type IPatch = ParagraphPatch | FilePatch;

export type PatchDocumentOutputType = OutputType;

export type PatchDocumentOptions<T extends PatchDocumentOutputType = PatchDocumentOutputType> = {
    readonly outputType: T;
    readonly data: InputDataType;
    readonly patches: Readonly<Record<string, IPatch>>;
    readonly keepOriginalStyles?: boolean;
    readonly placeholderDelimiters?: Readonly<{
        readonly start: string;
        readonly end: string;
    }>;
    readonly recursive?: boolean;
};

const imageReplacer = new ImageReplacer();
const formatter = new Formatter();
const numberingReplacer = new NumberingReplacer();
const UTF16LE = new Uint8Array([0xff, 0xfe]);
const UTF16BE = new Uint8Array([0xfe, 0xff]);
const styleMapper = new StyleMapper();

const compareByteArrays = (a: Uint8Array, b: Uint8Array): boolean => {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};

const processNumberingForDocument = async (  
    _key: string,  
    numberingManager: NumberingManager,  
    map: Map<string, Element>,  
    _zipContent: JSZip  
): Promise<void> => {  
    const contentTypesJson = map.get("[Content_Types].xml");  
    if (!contentTypesJson) {  
        throw new Error("Could not find content types file");  
    }  
  
    // Agregar content type para numbering  
    appendContentType(  
        contentTypesJson,  
        "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",  
        "numbering"  
    );  
  
    const numbering = numberingManager.getNumbering();  
    const mockFile = {  
        Document: {  
            View: null,  
            Relationships: {  
                RelationshipCount: 0  
            }  
        },  
        Media: new Media(),  
        Numbering: numbering  
    } as unknown as File;  
  
    const context: IContext = {  
        file: mockFile,  
        viewWrapper: mockFile.Document,  
        stack: []  
    };  
  
    // Serializar numbering.xml  
    const numberingXml = xml(  
        formatter.format(numbering, context),  
        {  
            declaration: {  
                standalone: "yes",  
                encoding: "UTF-8",  
            },  
        }  
    );  
  
    map.set("word/numbering.xml", toJson(numberingXml));  
  
    // Aplicar NumberingReplacer a documentos  
    const documentXml = map.get("word/document.xml");  
    if (documentXml) {  
        const xmlString = toXml(documentXml);  
        const replacedXml = numberingReplacer.replace(xmlString, numbering.ConcreteNumbering);  
        map.set("word/document.xml", toJson(replacedXml));  
    }  
  
    // Aplicar a headers y footers  
    for (const [mapKey, value] of map.entries()) {  
        if (mapKey.startsWith("word/header") || mapKey.startsWith("word/footer")) {  
            const xmlString = toXml(value);  
            const replacedXml = numberingReplacer.replace(xmlString, numbering.ConcreteNumbering);  
            map.set(mapKey, toJson(replacedXml));  
        }  
    }  
  
    // Crear relación de numbering  
    const documentRelsKey = "word/_rels/document.xml.rels";  
    const documentRels = map.get(documentRelsKey) ?? createRelationshipFile();  
    map.set(documentRelsKey, documentRels);  
      
    const hasNumberingRelation = checkIfNumberingRelationExists(documentRels);  
    if (!hasNumberingRelation) {  
        const nextId = getNextRelationshipIndex(documentRels);  
        appendRelationship(  
            documentRels,  
            nextId,  
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering",  
            "numbering.xml"  
        );  
    }  
};

export const patchDocument = async <T extends PatchDocumentOutputType = PatchDocumentOutputType>({  
    outputType,  
    data,  
    patches,  
    keepOriginalStyles,  
    placeholderDelimiters = { start: "{{", end: "}}" } as const,  
    recursive = true,  
}: PatchDocumentOptions<T>): Promise<OutputByType[T]> => {  
    const zipContent = data instanceof JSZip ? data : await JSZip.loadAsync(data); 

    // Extraer estilos maestros del documento
    const masterStyles = await extractStylesFromDocx(zipContent);
    // console.log(`Extracted ${masterStyles.length} master styles from document`);

    const contexts = new Map<string, IContext>();  
    const file = {  
        Media: new Media(),  
    } as unknown as File;  
  
    const map = new Map<string, Element>();  
    const imageRelationshipAdditions: IImageRelationshipAddition[] = [];  
    const hyperlinkRelationshipAdditions: IHyperlinkRelationshipAddition[] = [];  
    let hasMedia = false;  
    const binaryContentMap = new Map<string, Uint8Array>();      
    const numberingReferenceMap = new Map<string, string>();
    const allNumberingConfigs = new Map<string, { listType: string; level: number; startNumber?: number }>();

    Object.entries(patches).forEach(([_patchKey, patch]) => {
        if (patch.type === PatchType.DOCUMENT) {
            patch.children.forEach((child) => {
                if (child.constructor.name === 'Paragraph') {
                    const paragraphProperties = (child as any).properties;
                    if (paragraphProperties && paragraphProperties.numberingReferences) {
                        const numberingRefs = paragraphProperties.numberingReferences;
                        numberingRefs.forEach((ref: any) => {
                            if (ref.reference) {
                                allNumberingConfigs.set(ref.reference, {
                                    listType: ref.reference.includes('bullet') ? 'bullet' : 'numbered',
                                    level: ref.level || 0,
                                    startNumber: ref.instance || 1
                            });
                            }
                        });
                    }
                }
            });
        }
    });

    // Procesar numeraciones ANTES del bucle principal si se detectaron  
    let globalNumberingManager: NumberingManager | null = null;  
    
    if (allNumberingConfigs.size > 0) {  
        console.log(`Found ${allNumberingConfigs.size} numbering configurations globally`);  
        
        // Cargar numbering.xml existente si existe  
        let existingNumbering: NumberingInfo[] = [];  
        const numberingFile = zipContent.files['word/numbering.xml'];  
        if (numberingFile) {  
            const numberingContent = await numberingFile.async("text");  
            const numberingXml = toJson(numberingContent);  
            const xmlDocuments = { 'word/numbering.xml': numberingXml };  
            existingNumbering = extractExistingNumbering(xmlDocuments);  
            console.log(`Found ${existingNumbering.length} existing numbering configurations`);  
        }  
        
        // Crear NumberingManager global  
        globalNumberingManager = new NumberingManager();  
        globalNumberingManager.generateNumberingFromConfigs(allNumberingConfigs);  
        
        // Crear instancias concretas  
        for (const [reference] of allNumberingConfigs.entries()) {  
            const existingInstance = globalNumberingManager.getNumbering().ConcreteNumbering  
                .find(concrete => concrete.reference === reference);  
                
            if (!existingInstance) {  
                globalNumberingManager.getNumbering().createConcreteNumberingInstance(reference, 0);  
            }  
        }  
        
        // Poblar el mapa de referencias ANTES del procesamiento  
        for (const [reference] of allNumberingConfigs.entries()) {  
            const concreteNumbering = globalNumberingManager.getNumbering().ConcreteNumbering  
                .find(concrete => concrete.reference === reference);  
            if (concreteNumbering) {  
                numberingReferenceMap.set(reference, concreteNumbering.reference);  
            }  
        }  
    }
   
    for (const [key, value] of Object.entries(zipContent.files)) {  
        const binaryValue = await value.async("uint8array");  
        const startBytes = binaryValue.slice(0, 2);  
        if (compareByteArrays(startBytes, UTF16LE) || compareByteArrays(startBytes, UTF16BE)) {  
            binaryContentMap.set(key, binaryValue);  
            continue;  
        }  
  
        if (!key.endsWith(".xml") && !key.endsWith(".rels")) {  
            binaryContentMap.set(key, binaryValue);  
            continue;  
        }  
  
        const json = toJson(await value.async("text"));  
  
        if (key === "word/document.xml") {  
            const document = json.elements?.find((i) => i.name === "w:document");  
            if (document && document.attributes) {  
                for (const ns of ["mc", "wp", "r", "w15", "m"] as const) {  
                    document.attributes[`xmlns:${ns}`] = DocumentAttributeNamespaces[ns];  
                }  
                document.attributes["mc:Ignorable"] = `${document.attributes["mc:Ignorable"] || ""} w15`.trim();  
            }  
        }  
  
        if (key.startsWith("word/") && !key.endsWith(".xml.rels")) {  
            const context: IContext = {  
                file,  
                viewWrapper: {  
                    Relationships: {  
                        createRelationship: (  
                            linkId: string,  
                            _: string,  
                            target: string,  
                            __: (typeof TargetModeType)[keyof typeof TargetModeType],  
                        ) => {  
                            hyperlinkRelationshipAdditions.push({  
                                key,  
                                hyperlink: {  
                                    id: linkId,  
                                    link: target,  
                                },  
                            });  
                        },  
                    },  
                } as unknown as IViewWrapper,  
                stack: [],  
            };  
            contexts.set(key, context);  
  
            if (!placeholderDelimiters?.start.trim() || !placeholderDelimiters?.end.trim()) {  
                throw new Error("Both start and end delimiters must be non-empty strings.");  
            }  
  
            const { start, end } = placeholderDelimiters;  
  
            for (const [patchKey, patchValue] of Object.entries(patches)) {  
                const patchText = `${start}${patchKey}${end}`;  
                while (true) {
                    const { didFindOccurrence } = replacer({
                        json,
                        patch: { ...patchValue, children: patchValue.children.map((element) => {  
                            if (element instanceof ExternalHyperlink) {  
                                const concreteHyperlink = new ConcreteHyperlink(element.options.children, uniqueId());  
                                hyperlinkRelationshipAdditions.push({  
                                    key,  
                                    hyperlink: {  
                                        id: concreteHyperlink.linkId,  
                                        link: element.options.link,  
                                    },  
                                });  
                                return concreteHyperlink;  
                            } else {  
                                return element;  
                            }  
                        }) } as any,
                        patchText,
                        context,
                        keepOriginalStyles,
                        styleMapper: (() => {    
                            const patchStyleIds = extractStylesFromPatchElements([...patchValue.children], context);    
                            const patchStyles = createStyleInfoFromPatchIds(patchStyleIds);    
                            styleMapper.createStyleIdMapping(patchStyles, masterStyles);   
                            // console.log(`Patch "${patchKey}": estilos encontrados:`, patchStyleIds);    
                            return styleMapper;
                        })(),
                        numberingReferenceMap,
                    });
                    if (!recursive || !didFindOccurrence) {
                        break;
                    }
                }  
            }  
  
            const mediaDatas = imageReplacer.getMediaData(JSON.stringify(json), context.file.Media);  
            if (mediaDatas.length > 0) {  
                hasMedia = true;  
                imageRelationshipAdditions.push({  
                    key,  
                    mediaDatas,  
                });  
            }  
        }  
  
        map.set(key, json);  
    }  
  
    for (const { key, mediaDatas } of imageRelationshipAdditions) {  
        const relationshipKey = `word/_rels/${key.split("/").pop()}.rels`;  
        const relationshipsJson = map.get(relationshipKey) ?? createRelationshipFile();  
        map.set(relationshipKey, relationshipsJson);  
  
        const index = getNextRelationshipIndex(relationshipsJson);  
        const newJson = imageReplacer.replace(JSON.stringify(map.get(key)), mediaDatas, index);  
        map.set(key, JSON.parse(newJson) as Element);  
  
        for (let i = 0; i < mediaDatas.length; i++) {  
            const { fileName } = mediaDatas[i];  
            appendRelationship(  
                relationshipsJson,  
                index + i,  
                "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",  
                `media/${fileName}`,  
            );  
        }  
    }  
  
    for (const { key, hyperlink } of hyperlinkRelationshipAdditions) {  
        const relationshipKey = `word/_rels/${key.split("/").pop()}.rels`;  
        const relationshipsJson = map.get(relationshipKey) ?? createRelationshipFile();  
        map.set(relationshipKey, relationshipsJson);  
  
        appendRelationship(  
            relationshipsJson,  
            hyperlink.id,  
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",  
            hyperlink.link,  
            TargetModeType.EXTERNAL,  
        );  
    }  
  
    // Simplificar el procesamiento diferido - solo serialización  
    if (globalNumberingManager) {  
        await processNumberingForDocument("global", globalNumberingManager, map, zipContent);  
    }
  
    if (hasMedia) {  
        const contentTypesJson = map.get("[Content_Types].xml");  
        if (!contentTypesJson) {  
            throw new Error("Could not find content types file");  
        }  
  
        appendContentType(contentTypesJson, "image/png", "png");  
        appendContentType(contentTypesJson, "image/jpeg", "jpeg");  
        appendContentType(contentTypesJson, "image/jpeg", "jpg");  
        appendContentType(contentTypesJson, "image/bmp", "bmp");  
        appendContentType(contentTypesJson, "image/gif", "gif");  
        appendContentType(contentTypesJson, "image/svg+xml", "svg");  
    }  
  
    const zip = new JSZip();  
  
    for (const [key, value] of map) {  
        const output = toXml(value);  
        zip.file(key, output);  
    }  
  
    for (const [key, value] of binaryContentMap) {  
        zip.file(key, value);  
    }  
  
    for (const { data: stream, fileName } of file.Media.Array) {  
        zip.file(`word/media/${fileName}`, stream);  
    }  
  
    return zip.generateAsync({  
        type: outputType,  
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  
        compression: "DEFLATE",  
    });  
};
 
const toXml = (jsonObj: Element): string => {  
    const output = js2xml(jsonObj, {  
        attributeValueFn: (str) =>  
            String(str)  
                .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, "&amp;")  
                .replace(/</g, "&lt;")  
                .replace(/>/g, "&gt;")  
                .replace(/"/g, "&quot;")  
                .replace(/'/g, "&apos;"),  
    });  
    return output;  
};  

    const createRelationshipFile = (): Element => ({  
    declaration: {  
        attributes: {  
            version: "1.0",  
            encoding: "UTF-8",  
            standalone: "yes",  
        },  
    },  
    elements: [  
        {  
            type: "element",  
            name: "Relationships",  
            attributes: {  
                xmlns: "http://schemas.openxmlformats.org/package/2006/relationships",  
            },  
            elements: [],  
        },  
    ],  
});