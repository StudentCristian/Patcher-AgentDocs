// import { unified } from "unified";  
// import markdown from "remark-parse";  
// import gfm from "remark-gfm";  
// import footnotes from "remark-footnotes";
// import { TextRun } from "@file/paragraph/run/text-run";  
// import { ImageRun } from "@file/paragraph/run/image-run"; 
// import { ParagraphChild } from "@file/paragraph/paragraph";  
// import { Paragraph } from "@file/paragraph/paragraph";  
// import { HeadingLevel } from "@file/paragraph/formatting";  
// import { CheckBox } from "@file/checkbox/checkbox";  
// import { ExternalHyperlink } from "@file/paragraph/links/hyperlink";  
// import { Table, TableRow, TableCell, WidthType } from "@file/table";  
// import { AlignmentType } from "@file/paragraph";  
// import { FootnoteReferenceRun } from "@file/footnotes";
// import type * as mdast from "mdast";  
// import { uniqueId } from "@util/convenience-functions";
// import { FootnoteRefRun } from "@file/footnotes/footnote/run/footnote-ref-run";
  
// // Tipos para el manejo de imágenes siguiendo el patrón de remark-docx  
// export type ImageDataMap = { [url: string]: ImageData };  
  
// export type ImageData = {  
//   image: Buffer | Uint8Array | string;  
//   width: number;  
//   height: number;  
//   type: "jpg" | "png" | "gif" | "bmp"; // Excluir SVG por simplicidad  
// };  
  
// interface Decoration {  
//   emphasis?: boolean;  
//   strong?: boolean;  
//   delete?: boolean;  
// }  
  
// interface ListContext {  
//   level: number;  
//   ordered: boolean;  
//   reference: string;  
//   checked?: boolean;  
// }  

// export interface FootnoteDefinition {    
//   children: Paragraph[];    
//   hyperlinks?: Map<string, string>; 
// }
  
// interface FootnoteRegistry {  
//   ref: (id: string) => number;  
//   def: (id: string, def: FootnoteDefinition) => void;  
//   footnotes: () => { [key: string]: FootnoteDefinition };  
// }
  
// export class MarkdownConverter {  
//   private processor = unified()  
//     .use(markdown)  
//     .use(gfm)
//     .use(footnotes);  
      
//   private listConfigurations = new Map<string, { listType: string; level: number }>();  
//   private currentFootnoteHyperlinks: Map<string, string> | null = null; // AGREGAR ESTA LÍNEA
  
//   async convertMarkdownToDocx(    
//     markdownText: string,     
//     images: ImageDataMap = {}    
//   ): Promise<{ content: (ParagraphChild | Paragraph | Table)[], footnotes: { [key: string]: FootnoteDefinition } }> {    
//     const tree = this.processor.parse(markdownText);    
//     this.listConfigurations.clear();    
        
//     const definitions: Record<string, string> = {};    
//     this.collectDefinitions(tree, definitions);    
      
//     const footnoteRegistry = this.createFootnoteRegistry(); // AGREGAR  
        
//     const content = this.convertNodes(  
//       (tree as mdast.Root).children,   
//       {},   
//       null,   
//       images,   
//       definitions,   
//       footnoteRegistry // AGREGAR  
//     );  
      
//     return {  
//       content,  
//       footnotes: footnoteRegistry.footnotes() // RETORNAR footnotes  
//     };  
//   }
  
//   private collectDefinitions(node: any, definitions: Record<string, string>): void {  
//     if (node.type === 'definition') {  
//       console.log(`Found definition: ${node.identifier} -> ${node.url}`);
//       definitions[node.identifier] = node.url;  
//     }  
//     if (node.children) {  
//       node.children.forEach((child: any) => this.collectDefinitions(child, definitions));  
//     }  
//   }  
  
//   private convertNodes(  
//     nodes: mdast.Content[],   
//     deco: Decoration,   
//     listContext: ListContext | null,  
//     images: ImageDataMap = {},  
//     definitions: Record<string, string> = {},
//     footnoteRegistry: FootnoteRegistry 
//   ): (ParagraphChild | Paragraph | Table)[] {  
//     const results: (ParagraphChild | Paragraph | Table)[] = [];  
      
//     for (const node of nodes) {
//       switch (node.type) {  
//         case "text":  
//           results.push(this.buildText(node.value, deco));  
//           break;  
//         case "emphasis":  
//         case "strong":  
//         case "delete": {  
//           const { type, children } = node;  
//           const childNodes = this.convertNodes(children, {  
//             ...deco,  
//             [type]: true,  
//           }, listContext, images, definitions, footnoteRegistry);  
//           results.push(...childNodes);  
//           break;  
//         }  
//         case "paragraph": {  
//           if (listContext) {  
//             const textRuns = this.convertNodes(node.children, deco, null, images, definitions, footnoteRegistry) as ParagraphChild[];  
              
//             const paragraphChildren: ParagraphChild[] = [];  
//             if (listContext.checked !== null && listContext.checked !== undefined) {  
//               paragraphChildren.push(new CheckBox({ checked: listContext.checked }));  
//               paragraphChildren.push(new TextRun(" "));  
//             }  
//             paragraphChildren.push(...textRuns);  
              
//             const paragraph = new Paragraph({  
//               children: paragraphChildren,  
//               numbering: {  
//                 reference: listContext.reference,  
//                 level: listContext.level,  
//                 instance: 0  
//               }  
//             });  
//             results.push(paragraph);  
//           } else {  
//             // CAMBIO AQUÍ: Crear un Paragraph en lugar de aplanar  
//             const childNodes = this.convertNodes(node.children, deco, null, images, definitions, footnoteRegistry);  
//             const paragraph = new Paragraph({  
//               children: childNodes as ParagraphChild[]  
//             });  
//             results.push(paragraph);  
//           }  
//           break;  
//         }
//         case "heading": {  
//           const headingResult = this.buildHeading(node, deco, images, definitions, footnoteRegistry);  
//           results.push(headingResult);  
//           break;  
//         }  
//         case "list": {  
//           const listResults = this.buildList(node, deco, listContext, images, definitions, footnoteRegistry);  
//           results.push(...listResults);  
//           break;  
//         }  
//         case "listItem": {  
//           // Se procesa dentro de buildList  
//           break;  
//         }  
//         case "link": {  
//           const linkResult = this.buildLink(node, deco, images, definitions, footnoteRegistry);  
//           results.push(linkResult);  
//           break;  
//         }  
//         case "image": {  
//           const imageResult = this.buildImage(node, images);  
//           if (imageResult) {  
//             results.push(imageResult);  
//           }  
//           break;  
//         }  
//         case "imageReference": {  
//           console.log(`Processing imageReference: ${node.identifier}`);
//           const imageResult = this.buildImageReference(node, definitions, images);  
//           if (imageResult) { 
//             console.log(`ImageReference resolved successfully`);  
//             results.push(imageResult);  
//           }  
//           else {  
//           console.log(`ImageReference failed to resolve`); // Agregar este log  
//         }  
//           break;  
//         }  
//         case "table": {  
//           const tableResult = this.buildTable(node, deco, images, definitions, footnoteRegistry);  
//           results.push(tableResult);  
//           break;  
//         }  
//         case "tableRow": {  
//           // Se procesa dentro de buildTable  
//           break;  
//         }  
//         case "tableCell": {  
//           // Se procesa dentro de buildTableRow  
//           break;  
//         }  
//         case "footnoteDefinition": {  
//           this.registerFootnoteDefinition(node as mdast.FootnoteDefinition, footnoteRegistry, images, definitions);  
//           break;  
//         }  
//         case "footnoteReference": {  
//           const footnoteRef = this.buildFootnoteReference(node as mdast.FootnoteReference, footnoteRegistry);  
//           results.push(footnoteRef);  
//           break;  
//         }
//         default:  
//           // Para nodos no implementados, simplemente los ignoramos  
//           break;  
//       }  
//     }  
      
//     return results;  
//   }  
  
//   private buildHeading(  
//     { children, depth }: mdast.Heading,  
//     deco: Decoration,  
//     images: ImageDataMap,  
//     definitions: Record<string, string>,  
//     footnoteRegistry: FootnoteRegistry  
//   ): Paragraph {  
//     let headingLevel: typeof HeadingLevel[keyof typeof HeadingLevel];  
//     switch (depth) {  
//       case 1:  
//         headingLevel = HeadingLevel.HEADING_1;  
//         break;  
//       case 2:  
//         headingLevel = HeadingLevel.HEADING_2;  
//         break;  
//       case 3:  
//         headingLevel = HeadingLevel.HEADING_3;  
//         break;  
//       case 4:  
//         headingLevel = HeadingLevel.HEADING_4;  
//         break;  
//       case 5:  
//         headingLevel = HeadingLevel.HEADING_5;  
//         break;  
//       case 6:  
//         headingLevel = HeadingLevel.HEADING_6;  
//         break;  
//       default:  
//         headingLevel = HeadingLevel.HEADING_1;  
//     }  
      
//     const textRuns = this.convertNodes(children, deco, null, images, definitions, footnoteRegistry) as ParagraphChild[];
//     return new Paragraph({  
//       heading: headingLevel,  
//       children: textRuns,  
//     });  
//   }  
  
//   private buildList(  
//     { children, ordered }: mdast.List,   
//     deco: Decoration,   
//     parentContext: ListContext | null,  
//     images: ImageDataMap,  
//     definitions: Record<string, string>,
//     footnoteRegistry: FootnoteRegistry  
//   ): Paragraph[] {  
//     const listType = ordered ? "numbered" : "bullet";  
//     const level = parentContext ? parentContext.level + 1 : 0;  
      
//     const timestamp = Date.now();  
//     const randomId = Math.random().toString(36).substr(2, 9);  
//     const uniqueId = `md-${listType}-${level}-${timestamp}-${randomId}`;  
      
//     this.listConfigurations.set(uniqueId, {  
//       listType,  
//       level  
//     });  
      
//     const listContext: ListContext = {  
//       level,  
//       ordered: !!ordered,  
//       reference: uniqueId  
//     };  
  
//     return children.flatMap(item => this.buildListItem(item, deco, listContext, images, definitions, footnoteRegistry));  
//   }  
  
//   private buildListItem(  
//     { children, checked }: mdast.ListItem,   
//     deco: Decoration,   
//     listContext: ListContext,  
//     images: ImageDataMap,  
//     definitions: Record<string, string>,
//     footnoteRegistry: FootnoteRegistry   
//   ): Paragraph[] {  
//     const paragraphs: Paragraph[] = [];  
      
//     for (const child of children) {  
//       if (child.type === 'paragraph') {  
//         const textRuns = this.convertNodes(child.children, deco, null, images, definitions, footnoteRegistry) as ParagraphChild[];  
  
//         const paragraphChildren: ParagraphChild[] = [];  
//         if (checked !== null && checked !== undefined) {  
//           paragraphChildren.push(new CheckBox({ checked }));  
//           paragraphChildren.push(new TextRun(" "));  
//         }  
//         paragraphChildren.push(...textRuns);  
          
//         paragraphs.push(new Paragraph({  
//           children: paragraphChildren,  
//           numbering: {  
//             reference: listContext.reference,  
//             level: listContext.level,  
//             instance: 0  
//           }  
//         }));  
//       } else if (child.type === 'list') {  
//         const nestedList = this.buildList(child, deco, listContext, images, definitions, footnoteRegistry);  
//         paragraphs.push(...nestedList);  
//       }  
//     }  
      
//     return paragraphs;  
//   }  
  
//   private buildText(text: string, deco: Decoration): TextRun {  
//     return new TextRun({  
//       text,  
//       bold: deco.strong,  
//       italics: deco.emphasis,  
//       strike: deco.delete,  
//     });  
//   }  
  
//     private buildLink(          
//       { children, url }: mdast.Link,          
//       deco: Decoration,          
//       images: ImageDataMap,          
//       definitions: Record<string, string>,        
//       footnoteRegistry: FootnoteRegistry           
//   ): ExternalHyperlink {          
//       const textRuns = this.convertNodes(children, deco, null, images, definitions, footnoteRegistry) as ParagraphChild[];        
        
//       // Usar un ID más predecible y consistente  
//       const linkId = `rId${uniqueId()}`;  
//       const hyperlink = new ExternalHyperlink({          
//           children: textRuns,          
//           link: url          
//       });        
//       (hyperlink as any).preAssignedId = linkId;      
            
//       if (this.currentFootnoteHyperlinks) {      
//           console.log('Adding hyperlink to footnote context:', linkId, url);      
//           this.currentFootnoteHyperlinks.set(linkId, url);      
//       }      
            
//       return hyperlink;        
//   }
    
//   private buildImage(  
//     { url, alt }: mdast.Image,  
//     images: ImageDataMap  
//   ): ImageRun | undefined {  
//     const img = images[url];  
//     if (!img) {  
//       console.warn(`Image not found: ${url}`);  
//       return undefined;  
//     }  
  
//     const { image, width, height, type } = img;  
//     return new ImageRun({  
//       type, // Propiedad requerida para imágenes regulares  
//       data: image,  
//       transformation: {  
//         width,  
//         height,  
//       },  
//       altText: {  
//         title: alt || "Image",  
//         description: alt || "Image",  
//         name: alt || "Image"  
//       }  
//     });  
//   }  
  
//   private buildImageReference(  
//     { identifier, alt }: mdast.ImageReference,  
//     definitions: Record<string, string>,  
//     images: ImageDataMap  
//   ): ImageRun | undefined {  
//     const url = definitions[identifier];  
//     if (!url) {  
//       console.warn(`Image reference not found: ${identifier}`);  
//       return undefined;  
//     }  
      
//     // Crear la imagen siguiendo exactamente el patrón de remark-docx  
//     const img = images[url];  
//     if (!img) {  
//       console.warn(`Image not found: ${url}`);  
//       return undefined;  
//     }  
    
//     const { image, width, height, type } = img;  
//     return new ImageRun({  
//       type,  
//       data: image,  
//       transformation: {  
//         width,  
//         height,  
//       },  
//       altText: {  
//         title: alt || "Image",  
//         description: alt || "Image",   
//         name: alt || "Image"  
//       }  
//     });  
//   }
  
//   private buildTable(  
//     { children, align }: mdast.Table,  
//     deco: Decoration,  
//     images: ImageDataMap,  
//     definitions: Record<string, string>,
//     footnoteRegistry: FootnoteRegistry  
//   ): Table {  
//     const cellAligns: (typeof AlignmentType[keyof typeof AlignmentType])[] | undefined = align?.map((a) => {  
//       switch (a) {  
//         case "left":  
//           return AlignmentType.LEFT;  
//         case "right":  
//           return AlignmentType.RIGHT;  
//         case "center":  
//           return AlignmentType.CENTER;  
//         default:  
//           return AlignmentType.LEFT;  
//       }  
//     });  
  
//     return new Table({  
//       rows: children.map((r) => {  
//         return this.buildTableRow(r, deco, cellAligns, images, definitions, footnoteRegistry);  
//       }),  
//       width: {  
//         size: 100,  
//         type: WidthType.PERCENTAGE,  
//       },  
//     });  
//   }  
  
//   private buildTableRow(  
//     { children }: mdast.TableRow,  
//     deco: Decoration,  
//     cellAligns: (typeof AlignmentType[keyof typeof AlignmentType])[] | undefined,  
//     images: ImageDataMap,  
//     definitions: Record<string, string>,
//     footnoteRegistry: FootnoteRegistry   
//   ): TableRow {  
//     return new TableRow({
//       children: children.map((c, i) => {
//         return this.buildTableCell(c, deco, cellAligns?.[i], images, definitions, footnoteRegistry);
//       }),
//     });
//   }

//   private buildTableCell(
//     { children }: mdast.TableCell,  
//     deco: Decoration,  
//     align: typeof AlignmentType[keyof typeof AlignmentType] | undefined,  
//     images: ImageDataMap,  
//     definitions: Record<string, string>,
//     footnoteRegistry: FootnoteRegistry
//   ): TableCell {
//     const nodes = this.convertNodes(children, deco, null, images, definitions, footnoteRegistry);
//     return new TableCell({
//       children: [
//         new Paragraph({
//           alignment: align,
//           children: nodes as ParagraphChild[],
//         }),  
//       ],  
//     });  
//   }  

//   private createFootnoteRegistry(): FootnoteRegistry {  
//   const idToInternalId = new Map<string, number>();  
//   const defs = new Map<number, FootnoteDefinition>();  

//   const getId = (id: string): number => {  
//     let internalId = idToInternalId.get(id);  
//     if (internalId == null) {  
//       idToInternalId.set(id, (internalId = idToInternalId.size + 1));  
//     }  
//     return internalId;  
//   };  

//   return {  
//     ref: (id) => getId(id),  
//     def: (id, def) => {  
//       const internalId = getId(id);  
//       defs.set(internalId, def);  
//     },  
//     footnotes: () => {  
//       return Array.from(defs.entries()).reduce(  
//         (acc, [key, def]) => {  
//           acc[key] = def;  
//           return acc;  
//         },  
//         {} as { [key: string]: FootnoteDefinition }  
//       );  
//     },  
//   };  
//   }

//   private registerFootnoteDefinition(            
//       { children, identifier }: mdast.FootnoteDefinition,            
//       footnoteRegistry: FootnoteRegistry,        
//       images: ImageDataMap,        
//       definitions: Record<string, string>        
//   ): void {            
//       const hyperlinkInfo = new Map<string, string>();      
//       this.currentFootnoteHyperlinks = hyperlinkInfo;      
                  
//       const definition: FootnoteDefinition = {              
//           children: children.map((node, index) => {              
//               const nodes = this.convertNodes([node], {}, null, images, definitions, footnoteRegistry);            
                          
//               if (nodes[0] instanceof Paragraph) {  
//                   const paragraph = nodes[0] as Paragraph;  
//                   // Agregar FootnoteRefRun al primer párrafo  
//                   if (index === 0) {  
//                       paragraph.addRunToFront(new FootnoteRefRun());  
//                   }  
//                   return paragraph;              
//               }              
//               const paragraph = new Paragraph({ children: nodes as ParagraphChild[] });  
//               // Agregar FootnoteRefRun al primer párrafo  
//               if (index === 0) {  
//                   paragraph.addRunToFront(new FootnoteRefRun());  
//               }  
//               return paragraph;              
//           }),            
//           hyperlinks: hyperlinkInfo        
//       };      
            
//       this.currentFootnoteHyperlinks = null;      
//       console.log('Registered footnote with hyperlinks:', hyperlinkInfo.size);      
//       footnoteRegistry.def(identifier, definition);              
//   }
    
//   private buildFootnoteReference(  
//     { identifier }: mdast.FootnoteReference,  
//     footnoteRegistry: FootnoteRegistry  
//   ): FootnoteReferenceRun {  
//     return new FootnoteReferenceRun(footnoteRegistry.ref(identifier));  
//   }
  
//   getListConfigurations(): Map<string, { listType: string; level: number }> {  
//     return new Map(this.listConfigurations);  
//   }  
// }